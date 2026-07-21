import { supabase } from '../config/supabase.js';

// In-memory mock database for testing
const mockDb = new Map();

/**
 * Resets the in-memory database. Used for test isolation.
 */
export function resetMockDb() {
  mockDb.clear();
}

/**
 * Service to handle data access for User Profiles in the 'users' table (Supabase).
 */

/**
 * Get profile fields for a user by their ID.
 * 
 * @param {string} userId User UID
 * @returns {Promise<object|null>} Profile record or null if not found
 */
export async function getProfileByUserId(userId) {
  if (process.env.NODE_ENV === 'test') {
    const profile = mockDb.get(userId);
    if (!profile || profile.full_name === null) {
      return null;
    }
    return { id: userId, ...profile };
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, gender, age, looking_for, show_me, employment_status, salary_range, religion, interests, selfie_image, profile_images, about, community, dob, updated_at')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    // If full_name is null, the profile has not been created yet
    if (data.full_name === null || data.full_name === undefined) {
      return null;
    }

    return {
      id: data.id,
      full_name: data.full_name,
      gender: data.gender || null,
      age: data.age || null,
      looking_for: data.looking_for || null,
      show_me: data.show_me || null,
      employment_status: data.employment_status || null,
      salary_range: data.salary_range || null,
      religion: data.religion || null,
      interests: data.interests || null,
      selfie_image: data.selfie_image || null,
      profile_images: data.profile_images || null,
      about: data.about || null,
      community: data.community || null,
      dob: data.dob || null,
      updated_at: data.updated_at || null
    };
  } catch (error) {
    console.error(`Database error in getProfileByUserId for user ${userId}:`, error);
    throw new Error('Database operation failed. Unable to fetch profile.');
  }
}

/**
 * Create a profile for the user.
 * Returns conflict if profile already exists.
 * 
 * @param {string} userId User UID
 * @param {object} profileData Profile data payload
 * @returns {Promise<object>} Status object indicating success or conflict
 */
export async function createProfile(userId, profileData) {
  if (process.env.NODE_ENV === 'test') {
    const existing = mockDb.get(userId);
    if (existing && existing.full_name !== null) {
      return { success: false, conflict: true };
    }
    const payload = {
      ...profileData,
      updated_at: new Date().toISOString()
    };
    mockDb.set(userId, payload);
    return { success: true, data: { id: userId, ...payload } };
  }

  try {
    // Check if user row exists and whether profile is already created
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', userId)
      .single();

    // Check if profile already exists
    if (existingUser && existingUser.full_name !== null && existingUser.full_name !== undefined) {
      return { success: false, conflict: true };
    }

    const payload = {
      ...profileData,
      updated_at: new Date().toISOString()
    };

    if (existingUser) {
      // Row exists but profile fields are null, so update it
      const { data: updatedData, error: updateError } = await supabase
        .from('users')
        .update(payload)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error(`Supabase update error creating profile for user ${userId}:`, updateError);
        throw new Error('Database operation failed. Unable to create profile.');
      }

      return { success: true, data: { id: userId, ...updatedData } };
    } else {
      // User row does not exist, insert it
      const { data: insertedData, error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          ...payload
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Supabase insert error creating profile for user ${userId}:`, insertError);
        throw new Error('Database operation failed. Unable to create profile.');
      }

      return { success: true, data: { id: userId, ...insertedData } };
    }
  } catch (error) {
    console.error(`Database error creating profile for user ${userId}:`, error);
    throw new Error('Database operation failed. Unable to create profile.');
  }
}

/**
 * Update dynamic profile fields for the user.
 * 
 * @param {string} userId User UID
 * @param {object} updateData Profile fields to update
 * @returns {Promise<object>} Status object indicating success or not found
 */
export async function updateProfile(userId, updateData) {
  if (process.env.NODE_ENV === 'test') {
    const existing = mockDb.get(userId);
    if (!existing || existing.full_name === null) {
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

  try {
    // Check if profile exists
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', userId)
      .single();

    if (!existingUser || selectError) {
      return { success: false, notFound: true };
    }

    if (existingUser.full_name === null || existingUser.full_name === undefined) {
      return { success: false, notFound: true };
    }

    const payload = {
      ...updateData,
      updated_at: new Date().toISOString()
    };

    const { data: updatedData, error: updateError } = await supabase
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error(`Supabase update error for user ${userId}:`, updateError);
      throw new Error('Database operation failed. Unable to update profile.');
    }

    return { success: true, data: { id: userId, ...updatedData } };
  } catch (error) {
    console.error(`Database error updating profile for user ${userId}:`, error);
    throw new Error('Database operation failed. Unable to update profile.');
  }
}

/**
 * Delete profile fields for the user (sets fields to null/empty array).
 * 
 * @param {string} userId User UID
 * @returns {Promise<object>} Status object indicating success or not found
 */
export async function deleteProfile(userId) {
  if (process.env.NODE_ENV === 'test') {
    const existing = mockDb.get(userId);
    if (!existing || existing.full_name === null) {
      return { success: false, notFound: true };
    }
    const clearPayload = {
      full_name: null,
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
      about: null,
      community: null,
      dob: null,
      updated_at: new Date().toISOString()
    };
    mockDb.set(userId, clearPayload);
    return { success: true };
  }

  try {
    // Check if profile exists
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', userId)
      .single();

    if (!existingUser || selectError) {
      return { success: false, notFound: true };
    }

    if (existingUser.full_name === null || existingUser.full_name === undefined) {
      return { success: false, notFound: true };
    }

    const clearPayload = {
      full_name: null,
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
      about: null,
      community: null,
      dob: null,
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('users')
      .update(clearPayload)
      .eq('id', userId);

    if (updateError) {
      console.error(`Supabase error deleting profile for user ${userId}:`, updateError);
      throw new Error('Database operation failed. Unable to clear profile fields.');
    }

    return { success: true };
  } catch (error) {
    console.error(`Database error deleting profile for user ${userId}:`, error);
    throw new Error('Database operation failed. Unable to clear profile fields.');
  }
}
