// List of common disposable email domains to reject
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'throwawaymail.com',
  'guerrillamail.com',
  'sharklasers.com',
  'dispostable.com',
  'yopmail.com',
  'getnada.com',
  'trashmail.com',
  'fakeinbox.com',
  'maildrop.cc'
]);

/**
 * Standard RFC 5322 compliant email regex pattern.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Normalize an email address (trim & lowercase).
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Validate email format (RFC compliant).
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const normalized = normalizeEmail(email);
  if (normalized.length > 254) return false;
  return EMAIL_REGEX.test(normalized);
}

/**
 * Check if domain is a known disposable email provider.
 * @param {string} email
 * @returns {boolean}
 */
export function isDisposableEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const parts = normalizeEmail(email).split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  return DISPOSABLE_DOMAINS.has(domain);
}

/**
 * Validate password requirements (minimum 8 characters).
 * @param {string} password
 * @returns {{ isValid: boolean, message?: string }}
 */
export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required.' };
  }
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  return { isValid: true };
}

/**
 * Comprehensive signup input validator.
 * @param {object} input
 * @returns {{ isValid: boolean, errors: string[], data: object }}
 */
export function validateSignupInput(input = {}) {
  const errors = [];
  const rawEmail = input.email || '';
  const password = input.password || '';
  const fullName = (typeof input.fullName === 'string' && input.fullName.trim()) 
    || (typeof input.name === 'string' && input.name.trim()) 
    || (rawEmail.includes('@') ? rawEmail.split('@')[0] : 'User');


  if (!rawEmail) {
    errors.push('Email is required.');
  } else if (!isValidEmail(rawEmail)) {
    errors.push('Invalid email format.');
  } else if (isDisposableEmail(rawEmail)) {
    errors.push('Disposable email addresses are not allowed.');
  }

  const passCheck = validatePasswordStrength(password);
  if (!passCheck.isValid) {
    errors.push(passCheck.message);
  }

  if (input.confirmPassword !== undefined && input.confirmPassword !== password) {
    errors.push('Passwords do not match.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      fullName,
      email: normalizeEmail(rawEmail),
      password
    }
  };
}
