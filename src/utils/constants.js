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

// Upload-related constants
export const DEFAULT_UPLOAD_FOLDER = 'dating_app/uploads';
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGES = 6;
export const MIN_IMAGES = 3;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Map detected binary types to canonical mime types used in validation
export const DETECTED_TYPE_TO_MIME = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif'
};
