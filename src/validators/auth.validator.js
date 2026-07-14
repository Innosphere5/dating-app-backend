const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const PHONE_REGEX = /^\d{10}$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;
}

export function isValidPhone(phone) {
  return typeof phone === 'string' && PHONE_REGEX.test(phone.trim());
}

export function validatePhoneInput(body) {
  const errors = [];
  const phone = body?.phone?.trim();

  if (!phone) {
    errors.push('Phone number is required.');
  } else if (!isValidPhone(phone)) {
    errors.push('Phone number must be exactly 10 digits.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: { phone }
  };
}

export function validateRegisterInput(body) {
  const errors = [];
  const email = body?.email?.trim();
  const password = body?.password;

  if (!email) errors.push('Email is required.');
  else if (!isValidEmail(email)) errors.push('Email format is invalid.');

  if (!password) errors.push('Password is required.');
  else if (!isValidPassword(password)) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: { email, password }
  };
}

export function validateLoginInput(body) {
  const errors = [];
  const email = body?.email?.trim();
  const password = body?.password;

  if (!email) errors.push('Email is required.');
  else if (!isValidEmail(email)) errors.push('Email format is invalid.');

  if (!password) errors.push('Password is required.');

  return {
    isValid: errors.length === 0,
    errors,
    data: { email, password }
  };
}

export function validateEmailInput(body) {
  const errors = [];
  const email = body?.email?.trim();

  if (!email) errors.push('Email is required.');
  else if (!isValidEmail(email)) errors.push('Email format is invalid.');

  return {
    isValid: errors.length === 0,
    errors,
    data: { email }
  };
}

export function validatePasswordResetInput(body) {
  const errors = [];
  const password = body?.password;

  if (!password) errors.push('Password is required.');
  else if (!isValidPassword(password)) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: { password }
  };
}

