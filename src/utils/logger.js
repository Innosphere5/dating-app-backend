/**
 * Sanitize object to remove sensitive data like passwords or tokens before logging.
 */
function sanitizeParams(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = { ...obj };
  const sensitiveKeys = ['password', 'confirmPassword', 'token', 'oobCode', 'idToken', 'secret', 'authorization'];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

export const logger = {
  info(message, meta = {}) {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, JSON.stringify(sanitizeParams(meta)));
  },
  warn(message, meta = {}) {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, JSON.stringify(sanitizeParams(meta)));
  },
  error(message, meta = {}) {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, JSON.stringify(sanitizeParams(meta)));
  }
};

export default logger;
