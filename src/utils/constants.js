export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'sb_access_token',
  REFRESH_TOKEN: 'sb_refresh_token'
};

export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_IN_USE: 'Unable to complete registration with the provided details.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  UNAUTHORIZED: 'You must be logged in to access this resource.',
  VALIDATION_FAILED: 'The submitted information is invalid.',
  GENERIC_FAILURE: 'Something went wrong. Please try again.',
  OAUTH_FAILURE: 'Google sign-in failed. Please try again.'
};

export const ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  DASHBOARD: '/dashboard',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password'
};
