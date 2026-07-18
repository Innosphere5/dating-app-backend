import { errorResponse } from '../utils/apiResponse.js';

// Allowed fields list to reject unknown fields
const ALLOWED_FIELDS = [
  'full_name',
  'gender',
  'age',
  'looking_for',
  'show_me',
  'employment_status',
  'salary_range',
  'religion',
  'interests',
  'selfie_image',
  'profile_images'
];

// Enums
const GENDER_ENUM = ['male', 'female', 'lgbtqia_plus'];
const LOOKING_FOR_ENUM = ['relationship', 'casual', 'not_sure', 'prefer_not_say'];
const SHOW_ME_ENUM = ['men', 'women', 'both'];
const EMPLOYMENT_STATUS_ENUM = ['student', 'employed', 'self_employed', 'between_jobs', 'unemployed'];
const SALARY_RANGE_ENUM = [
  'below_30000',
  '30000_50000',
  '50000_100000',
  '100000_200000',
  '200000_300000',
  'above_300000'
];

/**
 * Detect SQL injection patterns in strings
 */
function hasSqlInjection(value) {
  if (typeof value !== 'string') return false;
  
  const sqlPatterns = [
    /UNION\s+SELECT/i,
    /SELECT\s+.*\s+FROM/i,
    /INSERT\s+INTO/i,
    /UPDATE\s+.*\s+SET/i,
    /DELETE\s+FROM/i,
    /DROP\s+TABLE/i,
    /--/,
    /\/\*/,
    /;/,
    /OR\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(value));
}

/**
 * Simple URL validator
 */
function isValidUrl(string) {
  if (typeof string !== 'string') return false;
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/**
 * Base field validator function.
 * Validates individual fields and populates the errors list.
 */
function validateField(field, value, errors, isPatch = false) {
  // If the field is explicitly set to null, check if it's allowed
  if (value === null) {
    if (field === 'full_name' || field === 'gender' || field === 'age' || field === 'looking_for' || field === 'show_me' || field === 'employment_status' || field === 'salary_range') {
      errors.push({ field, message: `${field} cannot be null.` });
    }
    return; // Allow other fields (like religion, interests, profile_images, selfie_image) to be set to null if explicitly provided in a PATCH
  }

  switch (field) {
    case 'full_name':
      if (typeof value !== 'string') {
        errors.push({ field, message: 'Full name must be a string.' });
      } else {
        const trimmed = value.trim();
        if (trimmed.length < 2 || trimmed.length > 50) {
          errors.push({ field, message: 'Full name must be between 2 and 50 characters.' });
        }
        if (hasSqlInjection(trimmed)) {
          errors.push({ field, message: 'Full name contains invalid characters (SQL injection protection).' });
        }
      }
      break;

    case 'gender':
      if (!GENDER_ENUM.includes(value)) {
        errors.push({ field, message: `Gender must be one of: ${GENDER_ENUM.join(', ')}.` });
      }
      break;

    case 'age':
      if (!Number.isInteger(value)) {
        errors.push({ field, message: 'Age must be an integer.' });
      } else if (value < 18 || value > 100) {
        errors.push({ field, message: 'Age must be between 18 and 100.' });
      }
      break;

    case 'looking_for':
      if (!LOOKING_FOR_ENUM.includes(value)) {
        errors.push({ field, message: `Looking for must be one of: ${LOOKING_FOR_ENUM.join(', ')}.` });
      }
      break;

    case 'show_me':
      if (!SHOW_ME_ENUM.includes(value)) {
        errors.push({ field, message: `Show me must be one of: ${SHOW_ME_ENUM.join(', ')}.` });
      }
      break;

    case 'employment_status':
      if (!EMPLOYMENT_STATUS_ENUM.includes(value)) {
        errors.push({ field, message: `Employment status must be one of: ${EMPLOYMENT_STATUS_ENUM.join(', ')}.` });
      }
      break;

    case 'salary_range':
      if (!SALARY_RANGE_ENUM.includes(value)) {
        errors.push({ field, message: `Salary range must be one of: ${SALARY_RANGE_ENUM.join(', ')}.` });
      }
      break;

    case 'religion':
      if (typeof value !== 'string') {
        errors.push({ field, message: 'Religion must be a string.' });
      } else {
        if (value.length > 50) {
          errors.push({ field, message: 'Religion must be at most 50 characters.' });
        }
        if (hasSqlInjection(value)) {
          errors.push({ field, message: 'Religion contains invalid characters (SQL injection protection).' });
        }
      }
      break;

    case 'interests':
      if (!Array.isArray(value)) {
        errors.push({ field, message: 'Interests must be an array.' });
      } else {
        if (value.length < 1 || value.length > 3) {
          errors.push({ field, message: 'Interests array must contain between 1 and 3 items.' });
        }
        const seen = new Set();
        for (const item of value) {
          if (typeof item !== 'string') {
            errors.push({ field, message: 'Every interest must be a string.' });
            break;
          }
          const trimmed = item.trim();
          if (trimmed.length === 0) {
            errors.push({ field, message: 'Interest cannot be an empty string.' });
            break;
          }
          if (seen.has(trimmed)) {
            errors.push({ field, message: 'Interests cannot contain duplicate values.' });
            break;
          }
          if (hasSqlInjection(trimmed)) {
            errors.push({ field, message: 'Interests contain invalid characters (SQL injection protection).' });
            break;
          }
          seen.add(trimmed);
        }
      }
      break;

    case 'profile_images':
      if (!Array.isArray(value)) {
        errors.push({ field, message: 'Profile images must be an array.' });
      } else {
        if (value.length > 6) {
          errors.push({ field, message: 'Profile images array can contain at most 6 images.' });
        }
        for (const imgUrl of value) {
          if (!isValidUrl(imgUrl)) {
            errors.push({ field, message: 'Profile images must contain only valid URLs.' });
            break;
          }
        }
      }
      break;

    case 'selfie_image':
      if (!isValidUrl(value)) {
        errors.push({ field, message: 'Selfie image must be a valid URL.' });
      }
      break;
  }
}

/**
 * Validator middleware for creating a profile (POST).
 * Requires all fields.
 */
export function validateCreateProfile(req, res, next) {
  const errors = [];

  // 1. Reject unknown fields
  const unknownFields = Object.keys(req.body).filter(key => !ALLOWED_FIELDS.includes(key));
  if (unknownFields.length > 0) {
    return errorResponse(res, 400, 'Validation failed', [
      { field: unknownFields[0], message: `Unknown field: ${unknownFields[0]} is not allowed.` }
    ]);
  }

  // 2. Ensure all fields are provided
  for (const field of ALLOWED_FIELDS) {
    if (req.body[field] === undefined) {
      errors.push({ field, message: `${field} is required.` });
    }
  }

  if (errors.length > 0) {
    return errorResponse(res, 400, 'Validation failed', errors);
  }

  // 3. Validate each field value and trim string inputs in place
  for (const field of ALLOWED_FIELDS) {
    let val = req.body[field];
    
    // Trim string inputs
    if (typeof val === 'string') {
      req.body[field] = val.trim();
      val = req.body[field];
    } else if (field === 'interests' && Array.isArray(val)) {
      req.body[field] = val.map(item => (typeof item === 'string' ? item.trim() : item));
      val = req.body[field];
    }

    validateField(field, val, errors, false);
  }

  if (errors.length > 0) {
    return errorResponse(res, 400, 'Validation failed', errors);
  }

  next();
}

/**
 * Validator middleware for updating a profile (PATCH).
 * Validates only provided fields.
 */
export function validateUpdateProfile(req, res, next) {
  const errors = [];

  // 1. Reject unknown fields
  const unknownFields = Object.keys(req.body).filter(key => !ALLOWED_FIELDS.includes(key));
  if (unknownFields.length > 0) {
    return errorResponse(res, 400, 'Validation failed', [
      { field: unknownFields[0], message: `Unknown field: ${unknownFields[0]} is not allowed.` }
    ]);
  }

  // 2. Reject empty body
  if (Object.keys(req.body).length === 0) {
    return errorResponse(res, 400, 'Validation failed', [
      { field: 'body', message: 'Request body cannot be empty.' }
    ]);
  }

  // 3. Validate provided fields and trim string inputs in place
  for (const field of ALLOWED_FIELDS) {
    if (req.body[field] !== undefined) {
      let val = req.body[field];
      
      // Trim string inputs if not null
      if (typeof val === 'string') {
        req.body[field] = val.trim();
        val = req.body[field];
      } else if (field === 'interests' && Array.isArray(val)) {
        req.body[field] = val.map(item => (typeof item === 'string' ? item.trim() : item));
        val = req.body[field];
      }

      validateField(field, val, errors, true);
    }
  }

  if (errors.length > 0) {
    return errorResponse(res, 400, 'Validation failed', errors);
  }

  next();
}
