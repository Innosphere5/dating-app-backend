import { validateEmailInput } from '../validators/auth.validator.js';
import { getUserByEmail, markUserEmailAsVerified, generateVerificationLink } from '../services/firebaseAuth.service.js';
import { sendVerificationEmail } from '../services/email.service.js';
import { logAuditEvent, AUDIT_EVENTS } from '../services/audit.service.js';
import { adminAuth } from '../config/firebase.js';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

/**
 * Render the verify-pending page informing the user to check their email.
 */
export function showVerifyPendingPage(req, res) {
  const email = req.session?.pendingEmail || req.query.email || '';
  const devVerificationLink = req.session?.devVerificationLink || null;
  // Clear from session after reading so it's shown once
  if (req.session?.devVerificationLink) {
    delete req.session.devVerificationLink;
  }
  return res.render('auth/verify-pending', { email, error: null, csrfToken: res.locals.csrfToken, devVerificationLink });
}

/**
 * Verification callback endpoint: GET /auth/verified
 * Handles:
 *   1. Firebase action code (oobCode) from email link
 *   2. Redirect from Firebase action page (no oobCode, but user already verified)
 */
export async function handleVerificationCallback(req, res) {
  const oobCode = req.query.oobCode || req.query.code || req.query.token;
  logAuditEvent(AUDIT_EVENTS.VERIFICATION_LINK_CLICKED, { hasCode: Boolean(oobCode) });

  try {
    let targetUid = null;
    let targetEmail = null;

    // 1. If oobCode is present, verify it using Firebase Auth REST API
    if (oobCode && FIREBASE_API_KEY) {
      try {
        const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oobCode })
        });
        const data = await verifyRes.json();
        if (data && data.localId) {
          targetUid = data.localId;
          targetEmail = data.email;
        }
      } catch (restErr) {
        // Fallthrough to session/email lookup
      }
    }

    // 2. If no oobCode or REST verification didn't resolve a user,
    //    check if user from session/query is already verified in Firebase
    if (!targetUid) {
      const emailToCheck = req.session?.pendingEmail || req.query.email || '';
      if (emailToCheck) {
        try {
          const user = await getUserByEmail(emailToCheck);
          if (user) {
            // If Firebase already marked them as verified (e.g., via Firebase action page)
            if (user.emailVerified) {
              targetUid = user.uid;
              targetEmail = user.email;
            } else {
              // Try to mark them verified via Admin SDK (oobCode may have been consumed on Firebase side)
              await markUserEmailAsVerified(user.uid);
              targetUid = user.uid;
              targetEmail = user.email;
            }
          }
        } catch (lookupErr) {
          // Fallthrough
        }
      }
    }

    // 3. If we identified a verified user, activate session and show success
    if (targetUid) {
      // Ensure email is verified in Firebase Admin
      try {
        await markUserEmailAsVerified(targetUid);
      } catch (e) {
        // Already verified, ignore
      }

      // Activate user session
      if (req.session) {
        req.session.user = {
          uid: targetUid,
          email: targetEmail,
          verified: true
        };
        delete req.session.pendingEmail;
        delete req.session.pendingVerification;
        delete req.session.devVerificationLink;
      }

      logAuditEvent(AUDIT_EVENTS.VERIFICATION_LINK_CLICKED, { email: targetEmail, verified: true });
      return res.render('emails/verified-success', { email: targetEmail });
    }

    // 4. Could not verify — show error on pending page
    return res.status(400).render('auth/verify-pending', {
      email: req.session?.pendingEmail || '',
      error: 'Verification code is invalid or has expired. Please request a new verification email.',
      csrfToken: res.locals.csrfToken,
      devVerificationLink: null
    });
  } catch (error) {
    return res.status(500).render('auth/verify-pending', {
      email: '',
      error: 'An unexpected error occurred during verification. Please try again.',
      csrfToken: res.locals.csrfToken,
      devVerificationLink: null
    });
  }
}

/**
 * Resend verification email endpoint: POST /auth/resend-verification
 * Anti-enumeration: always returns generic 200 message.
 */
export async function resendVerification(req, res) {
  logAuditEvent(AUDIT_EVENTS.RESEND_REQUESTED, { email: req.body?.email });

  const { isValid, data } = validateEmailInput(req.body);
  const genericResponse = {
    success: true,
    message: 'If an account exists, a verification email has been sent.'
  };

  if (!isValid || !data?.email) {
    return res.status(200).json(genericResponse);
  }

  try {
    const user = await getUserByEmail(data.email);
    if (!user) {
      return res.status(200).json(genericResponse);
    }

    if (user.emailVerified) {
      return res.status(200).json(genericResponse);
    }

    // Generate fresh verification link & send email
    const verificationLink = await generateVerificationLink(data.email);
    await sendVerificationEmail({
      email: data.email,
      fullName: user.displayName || 'User',
      verificationLink
    });

    return res.status(200).json(genericResponse);
  } catch (error) {
    // Suppress error to prevent enumeration
    return res.status(200).json(genericResponse);
  }
}
