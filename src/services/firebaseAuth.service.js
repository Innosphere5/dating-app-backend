import { adminAuth } from '../config/firebase.js';
import config from '../config/env.js';
import { logAuditEvent, AUDIT_EVENTS } from './audit.service.js';

/**
 * Create a Firebase user via Admin SDK.
 * @param {object} params { email, password, fullName }
 * @returns {Promise<object>} Firebase UserRecord
 */
export async function createFirebaseUser({ email, password, fullName }) {
  logAuditEvent(AUDIT_EVENTS.SIGNUP_ATTEMPT, { email });

  const userRecord = await adminAuth.createUser({
    email,
    password,
    displayName: fullName,
    emailVerified: false,
    disabled: false
  });

  logAuditEvent(AUDIT_EVENTS.SIGNUP_SUCCESS, { uid: userRecord.uid, email });
  return userRecord;
}

/**
 * Generate a secure email verification link using Firebase Admin SDK.
 * @param {string} email
 * @param {string} redirectUrl Optional custom redirect URL
 * @returns {Promise<string>} Verification URL
 */
export async function generateVerificationLink(email, redirectUrl) {
  const url = redirectUrl || `${config.appUrl}/auth/verified`;
  const actionCodeSettings = {
    url,
    handleCodeInApp: false
  };

  const link = await adminAuth.generateEmailVerificationLink(email, actionCodeSettings);
  return link;
}

/**
 * Get user by email from Firebase Admin SDK.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function getUserByEmail(email) {
  try {
    const userRecord = await adminAuth.getUserByEmail(email);
    return userRecord;
  } catch (error) {
    if (error.code === 'auth/user-not-found') return null;
    throw error;
  }
}

/**
 * Get user by UID from Firebase Admin SDK.
 * @param {string} uid
 * @returns {Promise<object|null>}
 */
export async function getUserByUid(uid) {
  try {
    const userRecord = await adminAuth.getUser(uid);
    return userRecord;
  } catch (error) {
    if (error.code === 'auth/user-not-found') return null;
    throw error;
  }
}

/**
 * Mark user's email as verified in Firebase Auth.
 * @param {string} uid
 * @returns {Promise<object>} Updated UserRecord
 */
export async function markUserEmailAsVerified(uid) {
  const userRecord = await adminAuth.updateUser(uid, {
    emailVerified: true
  });
  logAuditEvent(AUDIT_EVENTS.EMAIL_VERIFIED, { uid, email: userRecord.email });
  return userRecord;
}
