import { getUserByUid } from '../services/firebaseAuth.service.js';
import { logAuditEvent, AUDIT_EVENTS } from '../services/audit.service.js';

/**
 * Middleware ensuring current authenticated user has verified their email address.
 * Redirects or blocks access if email is not verified.
 */
export async function requireVerified(req, res, next) {
  const sessionUser = req.session?.user || req.user;

  if (!sessionUser) {
    if (req.accepts('html')) {
      return res.redirect('/auth/login');
    }
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  // Check if session user has verified flag
  if (sessionUser.verified || sessionUser.emailVerified) {
    return next();
  }

  // Double check with Firebase Admin SDK
  if (sessionUser.uid || sessionUser.id) {
    try {
      const uid = sessionUser.uid || sessionUser.id;
      const userRecord = await getUserByUid(uid);

      if (userRecord && userRecord.emailVerified) {
        if (req.session?.user) {
          req.session.user.verified = true;
        }
        return next();
      }
    } catch (err) {
      // Fallback to denying access
    }
  }

  logAuditEvent(AUDIT_EVENTS.LOGIN_BLOCKED_UNVERIFIED, {
    uid: sessionUser.uid || sessionUser.id,
    email: sessionUser.email
  });

  if (req.accepts('html')) {
    return res.redirect('/auth/verify-pending');
  }

  return res.status(403).json({
    success: false,
    message: 'Please verify your email before accessing your account.'
  });
}
