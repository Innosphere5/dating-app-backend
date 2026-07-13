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
  if (!supabaseAdmin) {
    return { success: false, error: 'Profile sync requires SUPABASE_SERVICE_ROLE_KEY to be configured.' };
  }

  const { data: existingProfile, error: fetchError } = await supabaseAdmin
    .from('profiles')
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
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true, created: true };
}
