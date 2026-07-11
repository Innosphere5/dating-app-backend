import { COOKIE_NAMES } from './constants.js';

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  };
}

export function setAuthCookies(res, session) {
  const accessTokenMaxAge = session.expires_in
    ? session.expires_in * 1000
    : 60 * 60 * 1000;

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, session.access_token, {
    ...baseCookieOptions(),
    maxAge: accessTokenMaxAge
  });

  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, session.refresh_token, {
    ...baseCookieOptions(),
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

export function clearAuthCookies(res) {
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, baseCookieOptions());
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, baseCookieOptions());
}

export function getAuthCookies(req) {
  return {
    accessToken: req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN] || null,
    refreshToken: req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] || null
  };
}
