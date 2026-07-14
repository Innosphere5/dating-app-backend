/**
 * Wraps asynchronous middleware or route handlers to forward unhandled errors to Express error handler.
 * 
 * @param {Function} fn Asynchronous handler function
 * @returns {Function} Express middleware wrapper
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
