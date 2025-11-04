/**
 * @license
 * SPDX-License-Identifier: MIT
 */

const crypto = require('crypto');

/**
 * Encryption Utility for API Keys and Secrets
 * 
 * Uses AES-256-GCM for encryption with authentication tags
 */

const ALGORITHM = 'aes-256-gcm';

// Get encryption key from environment or generate a default one (not recommended for production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32)
  : crypto.scryptSync('default-key-change-this-in-production', 'salt', 32);

if (!process.env.ENCRYPTION_KEY) {
  console.warn('⚠️  WARNING: No ENCRYPTION_KEY set in environment. Using default key (not secure!)');
  console.warn('   Please set ENCRYPTION_KEY in server/.env to a random 32+ character string');
}

/**
 * Encrypt a plaintext string
 * @param {string} text - The text to encrypt
 * @returns {string} - JSON string containing iv, authTag, and encrypted data
 */
function encrypt(text) {
  if (!text) {
    throw new Error('Text to encrypt cannot be empty');
  }
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return as JSON string for easy storage in database
  return JSON.stringify({
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encrypted: encrypted
  });
}

/**
 * Decrypt an encrypted string
 * @param {string} encryptedData - JSON string containing iv, authTag, and encrypted data
 * @returns {string} - The decrypted plaintext
 */
function decrypt(encryptedData) {
  if (!encryptedData) {
    throw new Error('Encrypted data cannot be empty');
  }
  
  let data;
  try {
    data = JSON.parse(encryptedData);
  } catch (error) {
    throw new Error('Invalid encrypted data format');
  }
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(data.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
  
  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Redact sensitive data for display (shows only last 4 characters)
 * @param {string} text - The text to redact
 * @returns {string} - Redacted text like "****1234"
 */
function redact(text) {
  if (!text || text.length < 4) {
    return '****';
  }
  
  return '****' + text.slice(-4);
}

/**
 * Test encryption/decryption
 * @returns {boolean} - True if test passes
 */
function testEncryption() {
  try {
    const testString = 'test-api-key-12345';
    const encrypted = encrypt(testString);
    const decrypted = decrypt(encrypted);
    
    return testString === decrypted;
  } catch (error) {
    console.error('Encryption test failed:', error.message);
    return false;
  }
}

module.exports = {
  encrypt,
  decrypt,
  redact,
  testEncryption
};

