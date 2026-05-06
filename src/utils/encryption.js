const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment variable
 * Supports both raw 32-byte strings and 64-char hex strings
 */
function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_SECRET;

  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable is required');
  }

  // If it's a 64-char hex string, convert to 32 bytes
  if (secret.length === 64 && /^[0-9a-f]+$/i.test(secret)) {
    return Buffer.from(secret, 'hex');
  }

  // Otherwise use as-is
  const keyBuffer = Buffer.from(secret);
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_SECRET must be exactly 32 bytes or 64 hex characters');
  }

  return keyBuffer;
}

/**
 * Encrypts text using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Format: iv:encrypted:authTag (base64)
 */
function encrypt(text) {
  const key = getEncryptionKey();

  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Return format: iv:encrypted:authTag (all base64)
  return `${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`;
}

/**
 * Decrypts encrypted text using AES-256-GCM
 * @param {string} payload - Format: iv:encrypted:authTag (base64)
 * @returns {string} - Decrypted plain text
 */
function decrypt(payload) {
  const key = getEncryptionKey();

  // Split payload
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const [ivBase64, encryptedBase64, authTagBase64] = parts;

  // Convert from base64
  const iv = Buffer.from(ivBase64, 'base64');
  const encrypted = Buffer.from(encryptedBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt
  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = {
  encrypt,
  decrypt
};
