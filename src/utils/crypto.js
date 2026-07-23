import crypto from 'node:crypto';

/**
 * Generate a cryptographically secure random token (hex string).
 * @param {number} bytes Length in bytes (default 32)
 * @returns {string} Hex string token
 */
export function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a string using SHA-256.
 * @param {string} input Plaintext string
 * @returns {string} SHA-256 hex digest
 */
export function hashToken(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Constant-time comparison of two strings to prevent timing attacks.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
