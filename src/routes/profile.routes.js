import { Router } from 'express';
import * as profileController from '../controllers/profile.controller.js';
import { requireApiAuth } from '../middlewares/auth.middleware.js';
import { validateCreateProfile, validateUpdateProfile } from '../validators/profile.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Apply requireApiAuth middleware to all profile routes
router.use(requireApiAuth);

router.route('/profile')
  .post(validateCreateProfile, asyncHandler(profileController.createProfile))
  .get(asyncHandler(profileController.getProfile))
  .patch(validateUpdateProfile, asyncHandler(profileController.updateProfile))
  .delete(asyncHandler(profileController.deleteProfile));

export default router;
