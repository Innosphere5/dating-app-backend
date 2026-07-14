import * as profileService from '../services/profile.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Controller to handle profile creation.
 */
export async function createProfile(req, res) {
  const userId = req.user.id;
  const profileData = req.body;

  const result = await profileService.createProfile(userId, profileData);

  if (!result.success && result.conflict) {
    return errorResponse(res, 409, 'Conflict. Profile already exists for this user.');
  }

  return successResponse(res, 201, 'Profile created successfully', {});
}

/**
 * Controller to handle profile retrieval.
 */
export async function getProfile(req, res) {
  const userId = req.user.id;
  const profile = await profileService.getProfileByUserId(userId);

  if (!profile) {
    return errorResponse(res, 404, 'Profile not found.');
  }

  return successResponse(res, 200, 'Profile retrieved successfully', profile);
}

/**
 * Controller to handle profile updates.
 */
export async function updateProfile(req, res) {
  const userId = req.user.id;
  const updateData = req.body;

  const result = await profileService.updateProfile(userId, updateData);

  if (!result.success && result.notFound) {
    return errorResponse(res, 404, 'Profile not found. Create a profile first.');
  }

  return successResponse(res, 200, 'Profile updated successfully', {});
}

/**
 * Controller to handle profile deletion.
 */
export async function deleteProfile(req, res) {
  const userId = req.user.id;

  const result = await profileService.deleteProfile(userId);

  if (!result.success && result.notFound) {
    return errorResponse(res, 404, 'Profile not found.');
  }

  return successResponse(res, 200, 'Profile deleted successfully');
}
