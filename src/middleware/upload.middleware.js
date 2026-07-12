import multer from 'multer';
import {
  MAX_FILE_SIZE_BYTES,
  MAX_IMAGES,
  ALLOWED_MIME_TYPES
} from '../utils/constants.js';

// Memory storage: do not write files to disk
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  }
  cb(null, true);
}

export const uploadImagesMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_IMAGES
  },
  fileFilter
}).array('images', MAX_IMAGES);

export function handleUploadErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'One or more images exceed the maximum allowed size of 5MB.',
        data: null
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: `Uploads are limited to ${MAX_IMAGES} images of type JPEG, PNG, WEBP, or GIF.`,
        data: null
      });
    }

    return res.status(400).json({ success: false, message: 'The upload request is invalid.', data: null });
  }

  if (err) {
    return res.status(400).json({ success: false, message: 'The upload request could not be processed.', data: null });
  }

  next();
}
