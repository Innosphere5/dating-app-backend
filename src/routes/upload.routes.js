import express from 'express';
import { uploadImages } from '../controllers/upload.controller.js';
import { uploadImagesMiddleware, handleUploadErrors } from '../middleware/upload.middleware.js';
import { uploadRateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

/**
 * Wraps the multer middleware so that any multer error is forwarded
 * to the Express error-handling chain (4-argument middleware).
 * Without this wrapper, multer errors thrown synchronously inside
 * the middleware never reach a downstream error handler.
 */
function runMulter(req, res, next) {
  uploadImagesMiddleware(req, res, (err) => {
    if (err) return next(err); // forward multer / file-filter errors
    next();
  });
}

// POST /api/uploads
// Order: rate-limiter → multer (wrapped) → controller → error handler
router.post('/uploads', uploadRateLimiter, runMulter, uploadImages);

// Must be registered as a 4-argument middleware AFTER the route so Express
// treats it as an error handler and routes errors from runMulter here.
router.use(handleUploadErrors);

export default router;
