import { getUserFromToken } from '../services/auth.service.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Middleware to protect API routes requiring JWT authentication.
 * Supports Authorization Bearer token header or cookie authentication.
 */
export async function requireApiAuth(req, res, next) {
  try {
    let accessToken = null;

    // 1. Extract from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7).trim();
    }

    // 2. Extract from cookies if not found in header
    if (!accessToken) {
      accessToken = req.cookies?.fb_access_token || null;
    }

    if (!accessToken) {
      return errorResponse(res, 401, 'Unauthorized. Missing JWT token.');
    }

    // Validate the token with Firebase
    const result = await getUserFromToken(accessToken);
    if (!result.success || !result.user) {
      return errorResponse(res, 401, 'Unauthorized. Invalid or expired JWT token.');
    }

    // Attach user information to request
    req.user = result.user;
    req.accessToken = accessToken;
    next();
  } catch (err) {
    return errorResponse(res, 401, 'Unauthorized. Authentication failed.');
  }
}
