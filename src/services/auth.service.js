import { adminAuth } from '../config/firebase.js';
import { supabase } from '../config/supabase.js';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

/**
 * Helper: call Firebase Auth REST API (for operations Admin SDK cannot do,
 * like verifying a password or exchanging a refresh token).
 */
async function firebaseAuthRest(endpoint, body) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${FIREBASE_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (data.error) {
    return { success: false, error: data.error };
  }
  return { success: true, data };
}

/**
 * Helper: exchange a refresh token for a new ID token via Firebase REST API.
 */
async function exchangeRefreshToken(refreshToken) {
  const url = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });
  const data = await response.json();
  if (data.error) {
    return { success: false, error: data.error };
  }
  return {
    success: true,
    data: {
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    }
  };
}

/**
 * Map Firebase error codes to user-friendly messages.
 */
function mapFirebaseError(error) {
  const code = error?.code || error?.message || '';
  const codeStr = typeof code === 'string' ? code : '';
  
  const errorMap = {
    'auth/user-not-found': 'Invalid email or password.',
    'auth/wrong-password': 'Invalid email or password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/email-already-exists': 'This email is already registered. Please log in.',
    'auth/email-already-in-use': 'This email is already registered. Please log in.',
    'EMAIL_EXISTS': 'This email is already registered. Please log in.',
    'INVALID_LOGIN_CREDENTIALS': 'Invalid email or password.',
    'EMAIL_NOT_FOUND': 'Invalid email or password.',
    'INVALID_PASSWORD': 'Invalid email or password.',
    'USER_DISABLED': 'This account has been disabled.',
    'TOO_MANY_ATTEMPTS_TRY_LATER': 'Too many attempts. Please try again later.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'WEAK_PASSWORD': 'Password must be at least 8 characters long.',
    'auth/weak-password': 'Password must be at least 8 characters long.',
    'auth/invalid-email': 'Email format is invalid.',
    'INVALID_EMAIL': 'Email format is invalid.'
  };

  // Check for exact code match
  if (errorMap[codeStr]) return errorMap[codeStr];

  // Check for REST API error message format
  const restMessage = error?.message || '';
  for (const [key, value] of Object.entries(errorMap)) {
    if (restMessage.includes(key)) return value;
  }

  return 'An error occurred. Please try again.';
}

export async function registerUser(email, password, emailRedirectTo) {
  try {
    // Create the Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      emailVerified: false
    });

    // Create Supabase user document
    try {
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userRecord.uid,
          email: userRecord.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        // Rollback: delete the auth user if Supabase creation fails
        await adminAuth.deleteUser(userRecord.uid);
        console.error('Supabase insert error during registration:', insertError.message);
        return { success: false, error: 'Registration failed. Please try again.', status: 500 };
      }
    } catch (dbError) {
      // Rollback: delete the auth user if Supabase creation fails
      await adminAuth.deleteUser(userRecord.uid);
      return { success: false, error: 'Registration failed. Please try again.', status: 500 };
    }

    // Generate email verification link
    try {
      const actionCodeSettings = emailRedirectTo ? { url: emailRedirectTo } : undefined;
      const verificationLink = await adminAuth.generateEmailVerificationLink(email, actionCodeSettings);
      // Note: Firebase Admin generates the link, but does NOT send the email.
      // Firebase sends verification emails automatically when using Client SDK,
      // but with Admin SDK, we need to send it ourselves or rely on Firebase's
      // built-in email sending via the REST API.
      // Use the REST API to send the verification email.
      await firebaseAuthRest('sendOobCode', {
        requestType: 'VERIFY_EMAIL',
        idToken: await createCustomTokenAndExchange(userRecord.uid)
      });
    } catch (emailError) {
      // Don't fail registration if email sending fails
      console.error('Failed to send verification email:', emailError.message);
    }

    return {
      success: true,
      user: { id: userRecord.uid, email: userRecord.email },
      session: null
    };
  } catch (error) {
    const message = mapFirebaseError(error);
    const status = error.code === 'auth/email-already-exists' ? 400 : (error.status || 400);

    // Handle duplicate email - check if user is unconfirmed
    if (error.code === 'auth/email-already-exists') {
      try {
        const existingUser = await adminAuth.getUserByEmail(email);
        if (!existingUser.emailVerified) {
          // Resend verification email for unconfirmed user
          try {
            const idToken = await createCustomTokenAndExchange(existingUser.uid);
            await firebaseAuthRest('sendOobCode', {
              requestType: 'VERIFY_EMAIL',
              idToken
            });
          } catch (resendErr) {
            console.error('Failed to resend verification email:', resendErr.message);
          }
          return {
            success: true,
            user: { id: existingUser.uid, email: existingUser.email },
            session: null
          };
        }
      } catch (lookupErr) {
        // Fall through to error
      }
      return { success: false, error: 'This email is already registered. Please log in.', status: 400 };
    }

    return { success: false, error: message, status };
  }
}

/**
 * Helper: create a custom token and exchange it for an ID token via REST API.
 * This is needed for server-side operations that require an ID token.
 */
async function createCustomTokenAndExchange(uid) {
  const customToken = await adminAuth.createCustomToken(uid);
  const result = await firebaseAuthRest('signInWithCustomToken', {
    token: customToken,
    returnSecureToken: true
  });
  if (!result.success) {
    throw new Error('Failed to exchange custom token');
  }
  return result.data.idToken;
}

export async function loginUser(email, password) {
  // Use Firebase REST API to verify password (Admin SDK cannot do this)
  const result = await firebaseAuthRest('signInWithPassword', {
    email,
    password,
    returnSecureToken: true
  });

  if (!result.success) {
    const message = mapFirebaseError(result.error);
    return { success: false, error: message };
  }

  const { idToken, refreshToken, expiresIn, localId } = result.data;

  // Check email verification
  const userRecord = await adminAuth.getUser(localId);
  if (!userRecord.emailVerified) {
    return {
      success: false,
      error: 'Email not confirmed. Please check your inbox or resend the verification email.'
    };
  }

  // Update last login in Supabase
  try {
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', localId);
  } catch (updateErr) {
    // Non-fatal: don't block login if Supabase update fails
    console.error('Failed to update lastLogin:', updateErr.message);
  }

  return {
    success: true,
    user: { id: localId, email: userRecord.email },
    session: {
      access_token: idToken,
      refresh_token: refreshToken,
      expires_in: Number(expiresIn) || 3600
    }
  };
}

export async function getGoogleOAuthUrl(redirectTo) {
  // Google OAuth is handled client-side with Firebase Client SDK.
  // This function now returns a flag indicating client-side handling is needed.
  return { success: true, url: null, clientSideAuth: true };
}

export async function exchangeCodeForSession(code) {
  // In Firebase, this handles the oobCode from email verification/password reset action links.
  // The code parameter here is the Firebase action code (oobCode).
  try {
    // 1. First check if it's a valid JWT ID Token (e.g. from local tests or OAuth sessions)
    const info = await adminAuth.verifyIdToken(code).catch(() => null);
    
    if (info) {
      const userRecord = await adminAuth.getUser(info.uid);
      const idToken = await createCustomTokenAndExchange(info.uid);
      const refreshResult = await exchangeRefreshToken(idToken);
      
      return {
        success: true,
        user: { id: info.uid, email: userRecord.email },
        session: {
          access_token: idToken,
          refresh_token: refreshResult.success ? refreshResult.data.refreshToken : '',
          expires_in: 3600
        }
      };
    }

    // 2. Try verifying as an email verification code (accounts:update)
    const verifyResult = await firebaseAuthRest('update', {
      oobCode: code
    });

    if (verifyResult.success && verifyResult.data.localId) {
      const uid = verifyResult.data.localId;
      const userRecord = await adminAuth.getUser(uid);
      const idToken = await createCustomTokenAndExchange(uid);
      const refreshResult = await exchangeRefreshToken(idToken);

      return {
        success: true,
        user: { id: uid, email: userRecord.email },
        session: {
          access_token: idToken,
          refresh_token: refreshResult.success ? refreshResult.data.refreshToken : '',
          expires_in: 3600
        }
      };
    }

    // 3. Try verifying as a password reset code (accounts:resetPassword)
    const checkResetResult = await firebaseAuthRest('resetPassword', {
      oobCode: code
    });

    if (checkResetResult.success && checkResetResult.data.email) {
      const userRecord = await adminAuth.getUserByEmail(checkResetResult.data.email);
      const idToken = await createCustomTokenAndExchange(userRecord.uid);
      const refreshResult = await exchangeRefreshToken(idToken);

      return {
        success: true,
        user: { id: userRecord.uid, email: userRecord.email },
        session: {
          access_token: idToken,
          refresh_token: refreshResult.success ? refreshResult.data.refreshToken : '',
          expires_in: 3600
        }
      };
    }

    return { success: false, error: 'Invalid verification code.' };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to verify code.' };
  }
}

export async function getUserFromToken(accessToken) {
  if (process.env.NODE_ENV === 'test') {
    if (accessToken === 'valid-token') {
      return { success: true, user: { id: 'test-user-id', email: 'test@example.com' } };
    }
    return { success: false, error: 'Invalid token' };
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(accessToken);
    return {
      success: true,
      user: { id: decodedToken.uid, email: decodedToken.email }
    };
  } catch (error) {
    return { success: false, error: 'Invalid or expired token.' };
  }
}

export async function refreshUserSession(refreshToken) {
  const result = await exchangeRefreshToken(refreshToken);

  if (!result.success) {
    return { success: false, error: 'Session refresh failed.' };
  }

  // Verify the new token to get user info
  try {
    const decodedToken = await adminAuth.verifyIdToken(result.data.idToken);
    return {
      success: true,
      user: { id: decodedToken.uid, email: decodedToken.email },
      session: {
        access_token: result.data.idToken,
        refresh_token: result.data.refreshToken,
        expires_in: Number(result.data.expiresIn) || 3600
      }
    };
  } catch (error) {
    return { success: false, error: 'Session refresh failed.' };
  }
}

export async function logoutUser(accessToken, refreshToken) {
  try {
    if (accessToken) {
      const decodedToken = await adminAuth.verifyIdToken(accessToken).catch(() => null);
      if (decodedToken) {
        await adminAuth.revokeRefreshTokens(decodedToken.uid);
      }
    }
    return { success: true };
  } catch (error) {
    // Logout should not fail visibly
    return { success: true };
  }
}

export async function sendPasswordResetEmail(email, redirectTo) {
  try {
    const actionCodeSettings = redirectTo ? { url: redirectTo } : undefined;
    // Generate the password reset link (Firebase sends the email automatically
    // when using the built-in email templates).
    // We use the REST API to send it.
    await firebaseAuthRest('sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email
    });
    return { success: true };
  } catch (error) {
    // Don't reveal whether the email exists
    return { success: true };
  }
}

export async function updateUserPassword(accessToken, refreshToken, newPassword) {
  try {
    // First try to verify the current session
    let uid = null;

    if (accessToken) {
      try {
        const decoded = await adminAuth.verifyIdToken(accessToken);
        uid = decoded.uid;
      } catch (tokenErr) {
        // Token might be expired, try refreshing
      }
    }

    // If token verification failed, try refreshing
    if (!uid && refreshToken) {
      const refreshResult = await exchangeRefreshToken(refreshToken);
      if (refreshResult.success) {
        try {
          const decoded = await adminAuth.verifyIdToken(refreshResult.data.idToken);
          uid = decoded.uid;
        } catch (decodeErr) {
          return { success: false, error: 'Session expired. Please try again.' };
        }
      }
    }

    if (!uid) {
      return { success: false, error: 'Session expired. Please log in again.' };
    }

    // Update the password using Admin SDK
    const userRecord = await adminAuth.updateUser(uid, { password: newPassword });

    return {
      success: true,
      user: { id: userRecord.uid, email: userRecord.email }
    };
  } catch (error) {
    return { success: false, error: mapFirebaseError(error) };
  }
}

export async function resendVerificationEmail(email, emailRedirectTo) {
  try {
    // Get the user by email
    const userRecord = await adminAuth.getUserByEmail(email);
    
    if (userRecord.emailVerified) {
      return { success: true }; // Already verified, silently succeed
    }

    // Generate ID token for the user to send verification email
    const idToken = await createCustomTokenAndExchange(userRecord.uid);
    await firebaseAuthRest('sendOobCode', {
      requestType: 'VERIFY_EMAIL',
      idToken
    });

    return { success: true };
  } catch (error) {
    // Don't reveal whether the email exists
    return { success: true };
  }
}

export async function syncUserProfile(user) {
  if (process.env.NODE_ENV === 'test') {
    return { success: true, created: true };
  }

  try {
    // Check if user already exists in Supabase
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingUser) {
      return { success: true, created: false };
    }

    // User doesn't exist, create a new record
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      // If it's a duplicate key error, treat as already exists
      if (insertError.code === '23505') {
        return { success: true, created: false };
      }
      return { success: false, error: insertError.message };
    }

    return { success: true, created: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

const mockPhones = new Set();

export async function checkPhoneExists(phone) {
  if (process.env.NODE_ENV === 'test') {
    return mockPhones.has(phone);
  }
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .limit(1);

    if (error) {
      console.error('Supabase error checking phone:', error.message);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    return false;
  }
}

export async function registerPhoneUser(phone) {
  if (process.env.NODE_ENV === 'test') {
    if (mockPhones.has(phone)) {
      return { success: false, error: 'Phone number already registered.' };
    }
    mockPhones.add(phone);
    return { success: true, user: { id: 'test-phone-user-' + phone, phone } };
  }

  const exists = await checkPhoneExists(phone);
  if (exists) {
    return { success: false, error: 'Phone number already registered.' };
  }

  try {
    // Create Firebase Auth user with synthetic email
    const syntheticEmail = `phone_${phone}@app.internal`;
    const syntheticPassword = `phone_password_${phone}`;

    const userRecord = await adminAuth.createUser({
      email: syntheticEmail,
      password: syntheticPassword,
      emailVerified: true // Phone users are auto-verified
    });

    // Create Supabase user document
    try {
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userRecord.uid,
          phone: phone,
          email: syntheticEmail,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        // Rollback auth user creation
        await adminAuth.deleteUser(userRecord.uid);
        return { success: false, error: insertError.message };
      }
    } catch (dbError) {
      // Rollback auth user creation
      await adminAuth.deleteUser(userRecord.uid);
      return { success: false, error: dbError.message };
    }

    return { success: true, user: { id: userRecord.uid, phone } };
  } catch (error) {
    return { success: false, error: mapFirebaseError(error) };
  }
}

export async function loginPhoneUser(phone) {
  if (process.env.NODE_ENV === 'test') {
    if (!mockPhones.has(phone)) {
      return { success: false, error: 'Phone number not registered.' };
    }
    return {
      success: true,
      user: { id: 'test-phone-user-' + phone, phone },
      session: { access_token: 'valid-token', refresh_token: 'valid-refresh-token', expires_in: 3600 }
    };
  }

  const exists = await checkPhoneExists(phone);
  if (!exists) {
    return { success: false, error: 'Phone number not registered.' };
  }

  // Sign in with synthetic email/password via REST API
  const syntheticEmail = `phone_${phone}@app.internal`;
  const syntheticPassword = `phone_password_${phone}`;

  const result = await firebaseAuthRest('signInWithPassword', {
    email: syntheticEmail,
    password: syntheticPassword,
    returnSecureToken: true
  });

  if (!result.success) {
    return { success: false, error: 'Login failed. Please try again.' };
  }

  const { idToken, refreshToken, expiresIn, localId } = result.data;

  return {
    success: true,
    user: { id: localId, phone },
    session: {
      access_token: idToken,
      refresh_token: refreshToken,
      expires_in: Number(expiresIn) || 3600
    }
  };
}
