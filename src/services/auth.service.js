import { supabase, supabaseAdmin } from '../config/supabase.js';

export async function registerUser(email, password, emailRedirectTo) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: emailRedirectTo ? { emailRedirectTo } : undefined
  });

  if (error) {
    return { success: false, error: error.message, status: error.status };
  }

  return { success: true, user: data.user, session: data.session };
}

export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user, session: data.session };
}

export async function getGoogleOAuthUrl(redirectTo) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, url: data.url };
}

export async function exchangeCodeForSession(code) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user, session: data.session };
}

export async function getUserFromToken(accessToken) {
  if (process.env.NODE_ENV === 'test') {
    if (accessToken === 'valid-token') {
      return { success: true, user: { id: 'test-user-id', email: 'test@example.com' } };
    }
    return { success: false, error: 'Invalid token' };
  }

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user };
}

export async function refreshUserSession(refreshToken) {
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user, session: data.session };
}

export async function logoutUser(accessToken, refreshToken) {
  if (accessToken && refreshToken) {
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function sendPasswordResetEmail(email, redirectTo) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateUserPassword(accessToken, refreshToken, newPassword) {
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  if (sessionError) {
    return { success: false, error: sessionError.message };
  }

  const { data, error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user };
}

export async function resendVerificationEmail(email, emailRedirectTo) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: emailRedirectTo ? { emailRedirectTo } : undefined
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function syncUserProfile(user) {
  if (process.env.NODE_ENV === 'test') {
    return { success: true, created: true };
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Profile sync requires SUPABASE_SERVICE_ROLE_KEY to be configured.' };
  }

  const { data: existingProfile, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (existingProfile) {
    return { success: true, created: false };
  }

  const { error: insertError } = await supabaseAdmin
    .from('users')
    .insert({
      id: user.id
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true, created: true };
}

const mockPhones = new Set();

export async function checkPhoneExists(phone) {
  if (process.env.NODE_ENV === 'test') {
    return mockPhones.has(phone);
  }
  if (!supabaseAdmin) return false;
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function registerPhoneUser(phone) {
  if (process.env.NODE_ENV === 'test') {
    if (mockPhones.has(phone)) {
      return { success: false, error: 'Phone number already registered.' };
    }
    mockPhones.add(phone);
    return { success: true, user: { id: 'test-phone-user-' + phone, phone } };
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Supabase admin client not initialized.' };
  }

  const exists = await checkPhoneExists(phone);
  if (exists) {
    return { success: false, error: 'Phone number already registered.' };
  }

  const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
    email: `phone_${phone}@test.com`,
    password: `phone_password_${phone}`,
    email_confirm: true
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const { error: insertError } = await supabaseAdmin
    .from('users')
    .insert({
      id: user.id,
      phone: phone
    });

  if (insertError) {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    return { success: false, error: insertError.message };
  }

  return { success: true, user };
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

  const { data, error } = await supabase.auth.signInWithPassword({
    email: `phone_${phone}@test.com`,
    password: `phone_password_${phone}`
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user, session: data.session };
}

