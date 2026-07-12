import { DEFAULT_UPLOAD_FOLDER } from './constants.js';

export function sanitizeFolder(input) {
  if (input == null || input === '') return { isValid: true, folder: DEFAULT_UPLOAD_FOLDER };

  if (typeof input !== 'string') return { isValid: false, error: 'Folder name must be a string.' };

  // Basic forbid: path traversal or absolute paths
  if (input.includes('..') || input.includes('/') || input.includes('\\')) {
    return { isValid: false, error: 'Invalid folder name.' };
  }

  const cleaned = input.trim().slice(0, 100);
  if (cleaned.length === 0) return { isValid: false, error: 'Invalid folder name.' };

  return { isValid: true, folder: `${DEFAULT_UPLOAD_FOLDER}/${cleaned}` };
}
