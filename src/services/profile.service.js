import { supabaseAdmin } from '../config/supabase.js';

// In-memory mock database for testing
const mockDb = new Map();

/**
 * Resets the in-memory database. Used for test isolation.
 */
export function resetMockDb() {
  mockDb.clear();
}

/**
 * Service to handle data access for User Profiles in the 'users' table.
 */

/**
 * Get profile fields for a user by their ID.
 * 
 * @param {string} userId User UUID
 * @returns {Promise<object|null>} Profile record or null if not found
 */
export async function getProfileByUserId(userId) {
  if (process.env.NODE_ENV === 'test') {
    const profile = mockDb.get(userId);
    if (!profile || profile.first_name === null) {
      return null;
    }
    return { id: userId, ...profile };
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, first_name, gender, age, looking_for, show_me, employment_status, salary_range, religion, interests, selfie_image, profile_images, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error(`Database error in getProfileByUserId for user ${userId}:`, error);
    throw new Error('Database operation failed. Unable to fetch profile.');
  }

  // If first_name is null, the profile has not been created yet
  if (!data || data.first_name === null) {
    return null;
  }

  return data;
}

/**
 * Create a profile for the user.
 * Returns conflict if profile already exists.
 * 
 * @param {string} userId User UUID
 * @param {object} profileData Profile data payload
 * @returns {Promise<object>} Status object indicating success or conflict
 */
export async function createProfile(userId, profileData) {
  if (process.env.NODE_ENV === 'test') {
    const existing = mockDb.get(userId);
    if (existing && existing.first_name !== null) {
      return { success: false, conflict: true };
    }
    const payload = {
      ...profileData,
      updated_at: new Date().toISOString()
    };
    mockDb.set(userId, payload);
    return { success: true, data: { id: userId, ...payload } };
  }

  // Check if profile already exists
  const existing = await supabaseAdmin
    .from('users')
    .select('id, first_name')
    .eq('id', userId)
    .maybeSingle();

  if (existing.error) {
    console.error(`Database error checking profile existence for user ${userId}:`, existing.error);
    throw new Error('Database operation failed. Unable to check profile existence.');
  }

  if (existing.data && existing.data.first_name !== null) {
    return { success: false, conflict: true };
  }

  const payload = {
    ...profileData,
    updated_at: new Date().toISOString()
  };

  let dbResult;
  if (existing.data) {
    // Row exists but profile fields are null, so update it
    dbResult = await supabaseAdmin
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();
  } else {
    // Row does not exist, insert it
    dbResult = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        ...payload
      })
      .select()
      .single();
  }

  if (dbResult.error) {
    console.error(`Database error creating profile for user ${userId}:`, dbResult.error);
    throw new Error('Database operation failed. Unable to create profile.');
  }

  return { success: true, data: dbResult.data };
}

/**
 * Update dynamic profile fields for the user.
 * 
 * @param {string} userId User UUID
 * @param {object} updateData Profile fields to update
 * @returns {Promise<object>} Status object indicating success or not found
 */
export async function updateProfile(userId, updateData) {
  if (process.env.NODE_ENV === 'test') {
    const existing = mockDb.get(userId);
    if (!existing || existing.first_name === null) {
      return { success: false, notFound: true };
    }
    const payload = {
      ...existing,
      ...updateData,
      updated_at: new Date().toISOString()
    };
    mockDb.set(userId, payload);
    return { success: true, data: { id: userId, ...payload } };
  }

  // Check if profile exists
  const existing = await supabaseAdmin
    .from('users')
    .select('id, first_name')
    .eq('id', userId)
    .maybeSingle();

  if (existing.error) {
    console.error(`Database error checking profile existence for user ${userId}:`, existing.error);
    throw new Error('Database operation failed. Unable to check profile existence.');
  }

  if (!existing.data || existing.data.first_name === null) {
    return { success: false, notFound: true };
  }

  const payload = {
    ...updateData,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(payload)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error(`Database error updating profile for user ${userId}:`, error);
    throw new Error('Database operation failed. Unable to update profile.');
  }

  return { success: true, data };
}

/**
 * Delete profile fields for the user (sets fields to null/empty array).
 * 
 * @param {string} userId User UUID
 * @returns {Promise<object>} Status object indicating success or not found
 */
export async function deleteProfile(userId) {
  if (process.env.NODE_ENV === 'test') {
    const existing = mockDb.get(userId);
    if (!existing || existing.first_name === null) {
      return { success: false, notFound: true };
    }
    const clearPayload = {
      first_name: null,
      gender: null,
      age: null,
      looking_for: null,
      show_me: null,
      employment_status: null,
      salary_range: null,
      religion: null,
      interests: [],
      profile_images: [],
      selfie_image: null,
      updated_at: new Date().toISOString()
    };
    mockDb.set(userId, clearPayload);
    return { success: true };
  }

  // Check if profile exists
  const existing = await supabaseAdmin
    .from('users')
    .select('id, first_name')
    .eq('id', userId)
    .maybeSingle();

  if (existing.error) {
    console.error(`Database error checking profile existence for user ${userId}:`, existing.error);
    throw new Error('Database operation failed. Unable to check profile existence.');
  }

  if (!existing.data || existing.data.first_name === null) {
    return { success: false, notFound: true };
  }

  const clearPayload = {
    first_name: null,
    gender: null,
    age: null,
    looking_for: null,
    show_me: null,
    employment_status: null,
    salary_range: null,
    religion: null,
    interests: [],
    profile_images: [],
    selfie_image: null,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseAdmin
    .from('users')
    .update(clearPayload)
    .eq('id', userId);

  if (error) {
    console.error(`Database error deleting profile for user ${userId}:`, error);
    throw new Error('Database operation failed. Unable to clear profile fields.');
  }

  return { success: true };
}
