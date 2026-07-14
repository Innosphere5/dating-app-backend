/**
 * Standard API success response helper.
 * 
 * @param {object} res Express response object
 * @param {number} statusCode HTTP status code
 * @param {string} message Success message
 * @param {object|null} [data] Payload object to return (optional)
 */
export function successResponse(res, statusCode, message, data = undefined) {
  const response = {
    success: true,
    message
  };

  if (data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
}

/**
 * Standard API error response helper.
 * 
 * @param {object} res Express response object
 * @param {number} statusCode HTTP status code
 * @param {string} message Error message
 * @param {array} [errors] Detailed validation errors (optional)
 */
export function errorResponse(res, statusCode, message, errors = undefined) {
  const response = {
    success: false,
    message
  };

  if (errors !== undefined) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
}
