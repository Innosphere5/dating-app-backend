import { db, firestoreFieldValue } from '../config/firebase.js';

// In-memory mock database for testing
const mockDb = new Map();

/**
 * Resets the in-memory database. Used for test isolation.
 */
export function resetMockDb() {
  mockDb.clear();
}

/**
 * Service to handle data access for User Profiles in the 'users' collection.
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
    if (!profile || profile.first_name === null) {
      return null;
    }
    return { id: userId, ...profile };
  }

  try {
    const docRef = db.collection('users').doc(userId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return null;
    }

    const data = docSnap.data();

    // If first_name is null, the profile has not been created yet
    if (!data || data.first_name === null || data.first_name === undefined) {
      return null;
    }

    // Return only the profile fields (matching existing select)
    return {
      id: docSnap.id,
      first_name: data.first_name,
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

  try {
    const docRef = db.collection('users').doc(userId);
    const docSnap = await docRef.get();

    // Check if profile already exists
    if (docSnap.exists) {
      const existingData = docSnap.data();
      if (existingData && existingData.first_name !== null && existingData.first_name !== undefined) {
        return { success: false, conflict: true };
      }
    }

    const payload = {
      ...profileData,
      updated_at: firestoreFieldValue.serverTimestamp()
    };

    if (docSnap.exists) {
      // Row exists but profile fields are null, so update it
      await docRef.update(payload);
    } else {
      // Document does not exist, create it
      await docRef.set({
        id: userId,
        ...payload
      });
    }

    // Read back the document to return the created data
    const updatedDoc = await docRef.get();
    const resultData = updatedDoc.data();
    // Convert serverTimestamp to ISO string for consistency
    if (resultData.updated_at && resultData.updated_at.toDate) {
      resultData.updated_at = resultData.updated_at.toDate().toISOString();
    }

    return { success: true, data: { id: userId, ...resultData } };
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

  try {
    const docRef = db.collection('users').doc(userId);
    const docSnap = await docRef.get();

    // Check if profile exists
    if (!docSnap.exists) {
      return { success: false, notFound: true };
    }

    const existingData = docSnap.data();
    if (!existingData || existingData.first_name === null || existingData.first_name === undefined) {
      return { success: false, notFound: true };
    }

    const payload = {
      ...updateData,
      updated_at: firestoreFieldValue.serverTimestamp()
    };

    await docRef.update(payload);

    // Read back for response
    const updatedDoc = await docRef.get();
    const resultData = updatedDoc.data();
    if (resultData.updated_at && resultData.updated_at.toDate) {
      resultData.updated_at = resultData.updated_at.toDate().toISOString();
    }

    return { success: true, data: { id: userId, ...resultData } };
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

  try {
    const docRef = db.collection('users').doc(userId);
    const docSnap = await docRef.get();

    // Check if profile exists
    if (!docSnap.exists) {
      return { success: false, notFound: true };
    }

    const existingData = docSnap.data();
    if (!existingData || existingData.first_name === null || existingData.first_name === undefined) {
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
      updated_at: firestoreFieldValue.serverTimestamp()
    };

    await docRef.update(clearPayload);

    return { success: true };
  } catch (error) {
    console.error(`Database error deleting profile for user ${userId}:`, error);
    throw new Error('Database operation failed. Unable to clear profile fields.');
  }
}
