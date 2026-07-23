import {
  validateRegisterInput,
  validateLoginInput,
  validateEmailInput,
  validatePasswordResetInput,
  validatePhoneInput
} from '../validators/auth.validator.js';
import { validateSignupInput } from '../utils/validators.js';
import {
  registerUser,
  loginUser,
  getGoogleOAuthUrl,
  exchangeCodeForSession,
  logoutUser,
  sendPasswordResetEmail,
  updateUserPassword,
  syncUserProfile,
  getUserFromToken,
  registerPhoneUser,
  loginPhoneUser
} from '../services/auth.service.js';
import { createFirebaseUser, generateVerificationLink, getUserByEmail } from '../services/firebaseAuth.service.js';
import { sendVerificationEmail } from '../services/email.service.js';
import { logAuditEvent, AUDIT_EVENTS } from '../services/audit.service.js';
import config from '../config/env.js';
import { setAuthCookies, clearAuthCookies, getAuthCookies } from '../utils/cookie.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AUTH_ERROR_MESSAGES, ROUTES } from '../utils/constants.js';

function getBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

export function showLoginPage(req, res) {
  res.render('auth/login', { error: null, csrfToken: res.locals?.csrfToken });
}

export function showRegisterPage(req, res) {
  res.render('auth/register', { error: null, csrfToken: res.locals?.csrfToken });
}

export function showSignupPage(req, res) {
  res.render('auth/signup', { error: null, csrfToken: res.locals?.csrfToken });
}

export function showForgotPasswordPage(req, res) {
  res.render('auth/forgot-password', { error: null, message: null });
}

export async function showResetPasswordPage(req, res) {
  const code = req.query.code || req.query.oobCode;

  if (code) {
    const result = await exchangeCodeForSession(code);

    if (result.success && result.session) {
      setAuthCookies(res, result.session);
      return res.render('auth/reset-password', { error: null });
    }

    return res.render('auth/reset-password', { error: 'This reset link is invalid or has expired.' });
  }

  return res.render('auth/reset-password', { error: null });
}

function isHtmlRequest(req) {
  const accept = req.headers.accept || '';
  return accept.includes('text/html') && !req.xhr && !req.headers['x-requested-with'];
}

export async function signup(req, res) {
  try {
    const { isValid, errors, data } = validateSignupInput(req.body);

    if (!isValid) {
      if (isHtmlRequest(req)) {
        return res.status(400).render('auth/signup', { error: errors.join(' '), csrfToken: res.locals?.csrfToken });
      }
      return errorResponse(res, 400, errors.join(' '));
    }

    // 1. Check if email already exists
    const existingUser = await getUserByEmail(data.email);
    if (existingUser) {
      const msg = 'This email is already registered. Please log in.';
      if (isHtmlRequest(req)) {
        return res.status(400).render('auth/signup', { error: msg, csrfToken: res.locals?.csrfToken });
      }
      return errorResponse(res, 400, msg);
    }

    // 2. Create Firebase user via Admin SDK
    const userRecord = await createFirebaseUser({
      email: data.email,
      password: data.password,
      fullName: data.fullName
    });

    // 3. Generate verification link and send branded email
    const verificationLink = await generateVerificationLink(data.email);
    const emailResult = await sendVerificationEmail({
      email: data.email,
      fullName: data.fullName,
      verificationLink
    });

    // 4. Store pending verification in session (include link for dev mode)
    if (req.session) {
      req.session.pendingVerification = true;
      req.session.pendingEmail = data.email;
      // Store link in session for dev-mode display when email delivery fails
      if (config.env === 'development' && emailResult.provider === 'log') {
        req.session.devVerificationLink = verificationLink;
      }
    }

    if (isHtmlRequest(req)) {
      return res.redirect(`/auth/verify-pending?email=${encodeURIComponent(data.email)}`);
    }

    return successResponse(res, 201, 'Registration successful. Please check your email to verify your account.', {
      userId: userRecord.uid,
      pendingVerification: true,
      redirectTo: '/auth/verify-pending'
    });
  } catch (error) {
    const msg = error.code === 'auth/email-already-exists' ? 'This email is already registered. Please log in.' : (error.message || AUTH_ERROR_MESSAGES.GENERIC_FAILURE);
    if (isHtmlRequest(req)) {
      return res.status(400).render('auth/signup', { error: msg, csrfToken: res.locals?.csrfToken });
    }
    return errorResponse(res, 400, msg);
  }
}


export async function register(req, res) {
  // Alias register to signup for backward compatibility
  return signup(req, res);
}

export async function login(req, res) {
  try {
    const { isValid, errors, data } = validateLoginInput(req.body);

    if (!isValid) {
      return errorResponse(res, 400, errors.join(' '));
    }

    // Authenticate user via auth service
    const result = await loginUser(data.email, data.password);

    if (!result.success) {
      const isUnverified = result.error && (result.error.toLowerCase().includes('confirm') || result.error.toLowerCase().includes('verify'));
      if (isUnverified) {
        logAuditEvent(AUDIT_EVENTS.LOGIN_BLOCKED_UNVERIFIED, { email: data.email });
        return res.status(403).json({
          success: false,
          message: 'Please verify your email before accessing your account.',
          data: { emailVerified: false, resendUrl: '/auth/resend-verification' }
        });
      }
      return errorResponse(res, 401, AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Verify email status with Admin SDK
    const userRecord = await getUserByEmail(data.email);
    if (userRecord && !userRecord.emailVerified && process.env.NODE_ENV !== 'test') {
      logAuditEvent(AUDIT_EVENTS.LOGIN_BLOCKED_UNVERIFIED, { uid: userRecord.uid, email: data.email });
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before accessing your account.',
        data: { emailVerified: false, resendUrl: '/auth/resend-verification' }
      });
    }

    setAuthCookies(res, result.session);
    if (req.session) {
      req.session.user = {
        uid: result.user.id,
        email: result.user.email,
        verified: true
      };
      delete req.session.pendingVerification;
      delete req.session.pendingEmail;
    }

    await syncUserProfile(result.user);

    return successResponse(res, 200, 'Login successful.', { redirectTo: ROUTES.DASHBOARD });
  } catch {
    return errorResponse(res, 500, AUTH_ERROR_MESSAGES.GENERIC_FAILURE);
  }
}


export async function googleLogin(req, res) {
  try {
    const redirectTo = `${getBaseUrl(req)}/auth/google/callback`;
    const result = await getGoogleOAuthUrl(redirectTo);

    if (!result.success || !result.url) {
      return res.redirect(`${ROUTES.LOGIN}?error=oauth_failed`);
    }

    return res.redirect(result.url);
  } catch {
    return res.redirect(`${ROUTES.LOGIN}?error=oauth_failed`);
  }
}

export async function googleCallback(req, res) {
  try {
    const code = req.query.code;

    if (code) {
      const result = await exchangeCodeForSession(code);

      if (!result.success || !result.session) {
        return res.redirect(`${ROUTES.LOGIN}?error=oauth_failed`);
      }

      setAuthCookies(res, result.session);
      await syncUserProfile(result.user);

      return res.redirect(ROUTES.DASHBOARD);
    }

    return res.render('auth/google-callback');
  } catch {
    return res.redirect(`${ROUTES.LOGIN}?error=oauth_failed`);
  }
}

export async function googleSessionCallback(req, res) {
  try {
    const { access_token, refresh_token, expires_in } = req.body;

    if (!access_token || !refresh_token) {
      return res.status(400).json({ success: false, message: 'OAuth session data is missing.' });
    }

    const userResult = await getUserFromToken(access_token);
    if (!userResult.success || !userResult.user) {
      return res.status(401).json({ success: false, message: 'Unable to validate OAuth user.' });
    }

    setAuthCookies(res, {
      access_token,
      refresh_token,
      expires_in: Number(expires_in) || 3600
    });

    await syncUserProfile(userResult.user);

    return res.status(200).json({ success: true, redirectTo: ROUTES.DASHBOARD });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to complete Google sign in.' });
  }
}

export async function logout(req, res) {
  try {
    const { accessToken, refreshToken } = getAuthCookies(req);
    await logoutUser(accessToken, refreshToken);
    clearAuthCookies(res);
    return res.redirect(ROUTES.LOGIN);
  } catch {
    clearAuthCookies(res);
    return res.redirect(ROUTES.LOGIN);
  }
}

export async function forgotPassword(req, res) {
  try {
    const { isValid, errors, data } = validateEmailInput(req.body);

    if (!isValid) {
      return errorResponse(res, 400, errors.join(' '));
    }

    const redirectTo = `${getBaseUrl(req)}${ROUTES.RESET_PASSWORD}`;
    await sendPasswordResetEmail(data.email, redirectTo);

    return successResponse(res, 200, 'If an account exists for this email, a reset link has been sent.');
  } catch {
    return errorResponse(res, 500, AUTH_ERROR_MESSAGES.GENERIC_FAILURE);
  }
}

export async function resetPassword(req, res) {
  try {
    const { isValid, errors, data } = validatePasswordResetInput(req.body);

    if (!isValid) {
      return errorResponse(res, 400, errors.join(' '));
    }

    const { accessToken, refreshToken } = getAuthCookies(req);

    if (!accessToken || !refreshToken) {
      return errorResponse(res, 401, AUTH_ERROR_MESSAGES.SESSION_EXPIRED);
    }

    const result = await updateUserPassword(accessToken, refreshToken, data.password);

    if (!result.success) {
      return errorResponse(res, 400, AUTH_ERROR_MESSAGES.GENERIC_FAILURE);
    }

    return successResponse(res, 200, 'Password updated successfully.', { redirectTo: ROUTES.LOGIN });
  } catch {
    return errorResponse(res, 500, AUTH_ERROR_MESSAGES.GENERIC_FAILURE);
  }
}

export function dashboard(req, res) {
  res.render('dashboard', { user: req.user });
}

export function showUploadPage(req, res) {
  res.render('upload', { user: req.user });
}

export function showVerifyPage(req, res) {
  res.render('auth/verify');
}

export async function verifySession(req, res) {
  try {
    const { access_token, refresh_token, expires_in, code } = req.body;

    if (code) {
      const result = await exchangeCodeForSession(code);
      if (!result.success || !result.session) {
        return res.status(400).json({ success: false, message: result.error || 'Failed to exchange verification code.' });
      }
      setAuthCookies(res, result.session);
      await syncUserProfile(result.user);
      return res.status(200).json({ success: true, redirectTo: ROUTES.DASHBOARD });
    }

    if (!access_token || !refresh_token) {
      return res.status(400).json({ success: false, message: 'Session data is missing.' });
    }

    const userResult = await getUserFromToken(access_token);
    if (!userResult.success || !userResult.user) {
      return res.status(401).json({ success: false, message: 'Unable to validate user.' });
    }

    setAuthCookies(res, {
      access_token,
      refresh_token,
      expires_in: Number(expires_in) || 3600
    });

    await syncUserProfile(userResult.user);

    return res.status(200).json({ success: true, redirectTo: ROUTES.DASHBOARD });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to complete verification.' });
  }
}

export async function phoneRegister(req, res) {
  try {
    const { isValid, errors, data } = validatePhoneInput(req.body);

    if (!isValid) {
      return errorResponse(res, 400, errors.join(' '));
    }

    const result = await registerPhoneUser(data.phone);

    if (!result.success) {
      return errorResponse(res, 400, result.error || 'Registration failed.');
    }

    return successResponse(res, 201, 'Phone registration successful. You can now log in.');
  } catch {
    return errorResponse(res, 500, AUTH_ERROR_MESSAGES.GENERIC_FAILURE);
  }
}

export async function phoneLogin(req, res) {
  try {
    const { isValid, errors, data } = validatePhoneInput(req.body);

    if (!isValid) {
      return errorResponse(res, 400, errors.join(' '));
    }

    const result = await loginPhoneUser(data.phone);

    if (!result.success || !result.session) {
      return errorResponse(res, 401, result.error || 'Login failed.');
    }

    setAuthCookies(res, result.session);

    return successResponse(res, 200, 'Login successful.', { redirectTo: ROUTES.DASHBOARD });
  } catch {
    return errorResponse(res, 500, AUTH_ERROR_MESSAGES.GENERIC_FAILURE);
  }
}

export async function resendVerification(req, res) {
  try {
    const { isValid, errors, data } = validateEmailInput(req.body);

    if (!isValid) {
      return errorResponse(res, 400, errors.join(' '));
    }

    const emailRedirectTo = `${getBaseUrl(req)}/auth/verify`;
    const result = await resendVerificationEmail(data.email, emailRedirectTo);

    if (!result.success) {
      return errorResponse(res, 400, result.error || 'Failed to resend verification email.');
    }

    return successResponse(res, 200, 'Verification email has been resent successfully.');
  } catch {
    return errorResponse(res, 500, AUTH_ERROR_MESSAGES.GENERIC_FAILURE);
  }
}
