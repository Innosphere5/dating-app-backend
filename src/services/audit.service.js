import logger from '../utils/logger.js';

export const AUDIT_EVENTS = {
  SIGNUP_ATTEMPT: 'signup_attempt',
  SIGNUP_SUCCESS: 'signup_success',
  VERIFICATION_EMAIL_SENT: 'verification_email_sent',
  VERIFICATION_LINK_CLICKED: 'verification_link_clicked',
  EMAIL_VERIFIED: 'email_verified',
  RESEND_REQUESTED: 'resend_requested',
  LOGIN_BLOCKED_UNVERIFIED: 'login_blocked_unverified'
};

/**
 * Log an audit event.
 * @param {string} event Event name from AUDIT_EVENTS
 * @param {object} details Object containing non-sensitive audit details (e.g. email, uid, ip)
 */
export function logAuditEvent(event, details = {}) {
  const safeDetails = { ...details };
  // Ensure no password or token field is present
  delete safeDetails.password;
  delete safeDetails.confirmPassword;
  delete safeDetails.token;
  delete safeDetails.oobCode;

  logger.info(`AUDIT: ${event}`, safeDetails);
}
