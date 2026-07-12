import { detectImageType } from '../utils/magicBytes.js';
import { MIN_IMAGES, MAX_IMAGES, ALLOWED_MIME_TYPES, DETECTED_TYPE_TO_MIME } from '../utils/constants.js';

function sanitizeFilenameForMessage(name) {
  if (typeof name !== 'string') return 'file';
  // eslint-disable-next-line no-control-regex
  const stripped = name.replace(/[\-\u001F\u007F]/g, '');
  return stripped.slice(0, 80) || 'file';
}

export function validateImageBatch(files) {
  const errors = [];

  if (!Array.isArray(files) || files.length === 0) {
    return { isValid: false, errors: [`Please select between ${MIN_IMAGES} and ${MAX_IMAGES} images.`] };
  }

  if (files.length < MIN_IMAGES || files.length > MAX_IMAGES) {
    errors.push(`Please select between ${MIN_IMAGES} and ${MAX_IMAGES} images. You submitted ${files.length}.`);
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  for (const file of files) {
    const safeName = sanitizeFilenameForMessage(file.originalname);
    const detectedType = detectImageType(file.buffer);

    if (!detectedType) {
      errors.push(`"${safeName}" is not a recognized image format.`);
      continue;
    }

    const canonicalMime = DETECTED_TYPE_TO_MIME[detectedType];

    if (!ALLOWED_MIME_TYPES.includes(canonicalMime)) {
      errors.push(`"${safeName}" has an unsupported image format.`);
      continue;
    }

    if (file.mimetype !== canonicalMime) {
      errors.push(`"${safeName}" content does not match its declared file type.`);
    }
  }

  return { isValid: errors.length === 0, errors };
}
