/**
 * Phone number validation utility
 * Ensures phone numbers are strictly 10 digits
 */

/**
 * Extract only digits from a phone number string
 * @param {string} phone - The phone number string
 * @returns {string} - Only the digits
 */
function extractDigits(phone) {
  if (typeof phone !== 'string') return '';
  return phone.replace(/\D/g, '');
}

/**
 * Validate that phone number is exactly 10 digits
 * @param {string} phone - The phone number to validate
 * @returns {object} - { isValid: boolean, error?: string, cleanedPhone?: string }
 */
function validatePhoneNumber(phone) {
  // Check if phone is provided and is a string
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      error: 'Phone number is required and must be a string',
    };
  }

  // Trim whitespace
  const trimmedPhone = phone.trim();

  // Extract only digits
  const digitsOnly = extractDigits(trimmedPhone);

  // Check if exactly 10 digits
  if (digitsOnly.length !== 10) {
    return {
      isValid: false,
      error: `Phone number must be exactly 10 digits. Received ${digitsOnly.length} digits.`,
    };
  }

  // Check if all characters are digits
  if (!/^\d{10}$/.test(digitsOnly)) {
    return {
      isValid: false,
      error: 'Phone number must contain only digits',
    };
  }

  return {
    isValid: true,
    cleanedPhone: digitsOnly,
  };
}

module.exports = {
  validatePhoneNumber,
  extractDigits,
};
