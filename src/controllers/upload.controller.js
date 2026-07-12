import { validateImageBatch } from '../validators/upload.validator.js';
import { uploadImageBatch } from '../services/upload.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export async function uploadImages(req, res) {
  try {
    const { isValid, errors } = validateImageBatch(req.files);

    if (!isValid) {
      return errorResponse(res, 400, errors.join(' '));
    }

    // Always upload to the default folder — no user-supplied folder accepted
    const result = await uploadImageBatch(req.files);

    if (!result.success) {
      return errorResponse(res, 502, result.error);
    }

    return successResponse(res, 201, 'Images uploaded successfully.', {
      count: result.images.length,
      images: result.images
    });
  } catch (err) {
    return errorResponse(res, 500, 'An unexpected error occurred while uploading images.');
  }
}
