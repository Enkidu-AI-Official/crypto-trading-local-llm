/**
 * @license
 * SPDX-License-Identifier: MIT
 */

const { validationResult } = require('express-validator');

/**
 * Validation Middleware
 * 
 * Handles validation errors from express-validator
 */

/**
 * Middleware to check validation results
 * Returns 400 with validation errors if any exist
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
}

/**
 * Custom validator: Check if value is a valid JSON string
 */
function isValidJSON(value) {
  try {
    JSON.parse(value);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Custom validator: Check if value is a valid URL
 */
function isValidURL(value) {
  try {
    new URL(value);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Custom validator: Check if value is in allowed list
 */
function isInArray(array) {
  return (value) => {
    return array.includes(value);
  };
}

/**
 * Custom sanitizer: Trim and remove extra whitespace
 */
function sanitizeString(value) {
  return value.trim().replace(/\s+/g, ' ');
}

module.exports = {
  validateRequest,
  isValidJSON,
  isValidURL,
  isInArray,
  sanitizeString
};

