import { generateRandomToken, hashToken } from '../utils/crypto.js';

// In-memory token store with TTL expiration (fallback if Redis is not configured)
const tokenStore = new Map();

/**
 * Store a custom verification token for an email.
 * @param {string} email
 * @param {number} ttlMs Time-to-live in milliseconds (default 24 hours)
 * @returns {{ token: string, hashedToken: string, expiresAt: Date }}
 */
export function createVerificationToken(email, ttlMs = 24 * 60 * 60 * 1000) {
  const token = generateRandomToken(32);
  const hashed = hashToken(token);
  const expiresAt = new Date(Date.now() + ttlMs);

  tokenStore.set(hashed, {
    email,
    expiresAt
  });

  return { token, hashedToken: hashed, expiresAt };
}

/**
 * Verify and consume a custom token.
 * @param {string} rawToken
 * @returns {{ isValid: boolean, email?: string, message?: string }}
 */
export function consumeVerificationToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    return { isValid: false, message: 'Missing token.' };
  }

  const hashed = hashToken(rawToken);
  const entry = tokenStore.get(hashed);

  if (!entry) {
    return { isValid: false, message: 'Invalid or expired verification token.' };
  }

  tokenStore.delete(hashed);

  if (new Date() > entry.expiresAt) {
    return { isValid: false, message: 'Verification token has expired.' };
  }

  return { isValid: true, email: entry.email };
}
