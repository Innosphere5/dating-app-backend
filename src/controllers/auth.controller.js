import {
  validateRegisterInput,
  validateLoginInput,
  validateEmailInput,
  validatePasswordResetInput,
  validatePhoneInput
} from '../validators/auth.validator.js';
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
import { setAuthCookies, clearAuthCookies, getAuthCookies } from '../utils/cookie.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AUTH_ERROR_MESSAGES, ROUTES } from '../utils/constants.js';

function getBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

export function showLoginPage(req, res) {
  res.render('auth/login', { error: null });
}

export function showRegisterPage(req, res) {
  res.render('auth/register', { error: null });
}

export function showForgotPasswordPage(req, res) {
  res.render('auth/forgot-password', { error: null, message: null });
}

export async function showResetPasswordPage(req, res) {
  const code = req.query.code;

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

export async function register(req, res) {
  try {
    const { isValid, errors, data } = validateRegisterInput(req.body);

    if (!isValid) {
      return errorResponse(res, 400, errors.join(' '));
    }

    const emailRedirectTo = `${getBaseUrl(req)}/auth/verify`;
    const result = await registerUser(data.email, data.password, emailRedirectTo);

    if (!result.success) {
      const status = result.status || 400;
      const message = result.error || AUTH_ERROR_MESSAGES.EMAIL_IN_USE;
      return errorResponse(res, status, message);
    }

    return successResponse(res, 201, 'Registration successful. Please check your email to verify your account.', {
      userId: result.user?.id
    });
  } catch {
    return errorResponse(res, 500, AUTH_ERROR_MESSAGES.GENERIC_FAILURE);
  }
}

export async function login(req, res) {
  try {
    const { isValid, errors, data } = validateLoginInput(req.body);

    if (!isValid) {
      return errorResponse(res, 400, errors.join(' '));
    }

    const result = await loginUser(data.email, data.password);

    if (!result.success || !result.session) {
      return errorResponse(res, 401, AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    setAuthCookies(res, result.session);
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
    const { access_token, refresh_token, expires_in } = req.body;

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
