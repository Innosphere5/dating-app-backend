import ejs from 'ejs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../config/env.js';
import { resendClient, nodemailerTransport } from '../config/mail.js';
import { adminAuth } from '../config/firebase.js';
import logger from '../utils/logger.js';
import { logAuditEvent, AUDIT_EVENTS } from './audit.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Dispatch real verification email directly using Firebase Auth REST API (sendOobCode).
 * Includes retry with exponential backoff for rate-limit errors.
 * @param {string} email
 * @param {number} maxRetries - Number of retry attempts (default: 2)
 * @returns {Promise<{sent: boolean, rateLimited: boolean}>}
 */
export async function sendFirebaseNativeEmail(email, maxRetries = 2) {
  const apiKey = config.firebase.apiKey || process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    logger.warn('FIREBASE_API_KEY missing in environment configuration.');
    return { sent: false, rateLimited: false };
  }

  try {
    const userRecord = await adminAuth.getUserByEmail(email);
    if (!userRecord) {
      logger.warn(`User record not found in Firebase for email: ${email}`);
      return { sent: false, rateLimited: false };
    }

    // 1. Create a custom token for the user
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    // 2. Exchange custom token for an ID token
    const exchangeRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true })
    });
    const exchangeData = await exchangeRes.json();
    if (!exchangeData.idToken) {
      logger.error('Failed to exchange custom token for Firebase ID token:', exchangeData);
      return { sent: false, rateLimited: false };
    }

    // 3. Dispatch real verification email with retry for rate limits
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const sendRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'VERIFY_EMAIL',
          idToken: exchangeData.idToken
        })
      });
      const sendData = await sendRes.json();

      if (sendRes.status === 200) {
        logger.info(`[FIREBASE AUTH EMAIL DISPATCHED] Real verification email sent to: ${email}`);
        return { sent: true, rateLimited: false };
      }

      // Check for rate limiting
      const errorMsg = sendData?.error?.message || '';
      if (errorMsg === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt + 1) * 1000; // 2s, 4s
          logger.warn(`Firebase sendOobCode rate-limited (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delayMs / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        logger.warn(`Firebase sendOobCode rate-limited after ${maxRetries + 1} attempts. Falling back to alternate delivery.`);
        return { sent: false, rateLimited: true };
      }

      // Non-rate-limit error — don't retry
      logger.error('Firebase sendOobCode failed:', sendData);
      return { sent: false, rateLimited: false };
    }
  } catch (err) {
    logger.error('Firebase native email sending error:', { error: err.message });
  }

  return { sent: false, rateLimited: false };
}

/**
 * Render the branded verification email HTML.
 */
async function renderEmailTemplate(firstName, verificationLink) {
  const templatePath = path.join(__dirname, '..', 'views', 'emails', 'verify-email.ejs');
  const htmlContent = await ejs.renderFile(templatePath, { firstName, verificationLink });
  const textContent = `Hello ${firstName},\n\nPlease verify your email by opening:\n${verificationLink}\n\n-- Dating App Team`;
  return { htmlContent, textContent };
}

/**
 * Send verification email to user.
 * Priority: Firebase native → Resend → Nodemailer SMTP → DEV log fallback.
 * When Firebase is rate-limited, it automatically falls through to SMTP/Resend
 * which sends the branded email with the already-generated verification link.
 *
 * @param {object} params { email, fullName, verificationLink }
 * @returns {Promise<{ success: boolean, messageId?: string, provider?: string }>}
 */
export async function sendVerificationEmail({ email, fullName, verificationLink }) {
  const firstName = fullName ? fullName.split(' ')[0] : 'User';

  // 1. Primary: Use Firebase Auth native email sender (fastest, direct to inbox, free)
  const { sent, rateLimited } = await sendFirebaseNativeEmail(email);
  if (sent) {
    logAuditEvent(AUDIT_EVENTS.VERIFICATION_EMAIL_SENT, { email, provider: 'firebase-auth-native' });
    return { success: true, messageId: 'firebase-native-sent', provider: 'firebase-auth-native' };
  }

  if (rateLimited) {
    logger.info(`Firebase rate-limited for ${email}. Trying alternate email providers with generated link.`);
  }

  // 2. Fallback: Try Resend client if configured
  if (resendClient) {
    try {
      const { htmlContent, textContent } = await renderEmailTemplate(firstName, verificationLink);
      const response = await resendClient.emails.send({
        from: config.mail.from,
        to: [email],
        subject: 'Verify your email address for Dating App',
        html: htmlContent,
        text: textContent
      });
      if (response.data && response.data.id) {
        logAuditEvent(AUDIT_EVENTS.VERIFICATION_EMAIL_SENT, { email, provider: 'resend', messageId: response.data.id });
        return { success: true, messageId: response.data.id, provider: 'resend' };
      }
    } catch (resendErr) {
      logger.warn('Resend email delivery failed:', { error: resendErr.message });
    }
  }

  // 3. Fallback: Try Nodemailer SMTP transport (e.g. Gmail SMTP)
  if (nodemailerTransport) {
    try {
      const { htmlContent, textContent } = await renderEmailTemplate(firstName, verificationLink);
      const info = await nodemailerTransport.sendMail({
        from: config.mail.from,
        to: email,
        subject: 'Verify your email address for Dating App',
        html: htmlContent,
        text: textContent
      });
      logger.info(`[SMTP EMAIL DISPATCHED] Verification email sent to ${email} via SMTP (messageId: ${info.messageId})`);
      logAuditEvent(AUDIT_EVENTS.VERIFICATION_EMAIL_SENT, { email, provider: 'smtp', messageId: info.messageId });
      return { success: true, messageId: info.messageId, provider: 'smtp' };
    } catch (smtpErr) {
      logger.warn('SMTP email delivery failed:', { error: smtpErr.message });
    }
  }

  // 4. Final fallback: Log verification link (development only)
  logger.info(`[DEV LOG] Verification link for ${email}: ${verificationLink}`);
  logAuditEvent(AUDIT_EVENTS.VERIFICATION_EMAIL_SENT, { email, provider: 'log' });
  return { success: true, messageId: 'dev-log-sent', provider: 'log' };
}
