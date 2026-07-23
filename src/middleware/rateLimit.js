import rateLimit from 'express-rate-limit';

/**
 * IP rate limiter: max 5 requests per 15 minutes per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.'
  }
});

// In-memory tracking for per-email resend verification rate limiting
const resendTracker = new Map();

/**
 * Per-email rate limiter & cooldown middleware for resend verification endpoint.
 * - Rate limit: max 3 requests per hour per email
 * - Cooldown: 60 seconds between requests
 * - Anti-enumeration: returns generic 200 response if limit exceeded
 */
export function resendRateLimiter(req, res, next) {
  const email = req.body?.email?.trim()?.toLowerCase();
  if (!email) {
    return next();
  }

  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const COOLDOWN = 60 * 1000;

  const record = resendTracker.get(email) || { timestamps: [], lastSent: 0 };

  // Filter timestamps within last hour
  record.timestamps = record.timestamps.filter(ts => now - ts < ONE_HOUR);

  // Check 60-second cooldown
  if (now - record.lastSent < COOLDOWN) {
    return res.status(200).json({
      success: true,
      message: 'If an account exists, a verification email has been sent.'
    });
  }

  // Check 3 requests per hour limit
  if (record.timestamps.length >= 3) {
    return res.status(200).json({
      success: true,
      message: 'If an account exists, a verification email has been sent.'
    });
  }

  // Record new attempt
  record.timestamps.push(now);
  record.lastSent = now;
  resendTracker.set(email, record);

  next();
}
