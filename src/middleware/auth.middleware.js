import { getAuthCookies, setAuthCookies, clearAuthCookies } from '../utils/cookie.js';
import { getUserFromToken, refreshUserSession } from '../services/auth.service.js';
import { ROUTES } from '../utils/constants.js';

export async function requireAuth(req, res, next) {
  const { accessToken, refreshToken } = getAuthCookies(req);

  if (!accessToken && !refreshToken) {
    return res.redirect(ROUTES.LOGIN);
  }

  if (accessToken) {
    const result = await getUserFromToken(accessToken);
    if (result.success) {
      req.user = result.user;
      req.accessToken = accessToken;
      return next();
    }
  }

  if (refreshToken) {
    const refreshResult = await refreshUserSession(refreshToken);
    if (refreshResult.success) {
      setAuthCookies(res, refreshResult.session);
      req.user = refreshResult.user;
      req.accessToken = refreshResult.session.access_token;
      return next();
    }
  }

  clearAuthCookies(res);
  return res.redirect(ROUTES.LOGIN);
}

export async function redirectIfAuthenticated(req, res, next) {
  const { accessToken } = getAuthCookies(req);

  if (!accessToken) {
    return next();
  }

  const result = await getUserFromToken(accessToken);
  if (result.success) {
    return res.redirect(ROUTES.DASHBOARD);
  }

  return next();
}
