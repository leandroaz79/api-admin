const crypto = require('crypto');

/**
 * Hash an API key using HMAC-SHA256 with secret
 * More secure than plain SHA-256 as it requires a secret key
 * @param {string} key - The API key to hash
 * @returns {string} - The hashed key in hex format
 */
function hashKey(key) {
  const secret = process.env.HASH_SECRET;

  if (!secret) {
    throw new Error('HASH_SECRET environment variable is required');
  }

  return crypto
    .createHmac('sha256', secret)
    .update(key)
    .digest('hex');
}

/**
 * Compare a plain API key with a hashed key using timing-safe comparison
 * Prevents timing attacks by ensuring comparison takes constant time
 * @param {string} key - The plain API key
 * @param {string} hash - The hashed key to compare against
 * @returns {boolean} - True if they match
 */
function compareKey(key, hash) {
  try {
    const keyHash = hashKey(key);

    // Ensure both strings are same length for timingSafeEqual
    if (keyHash.length !== hash.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(keyHash, 'hex'),
      Buffer.from(hash, 'hex')
    );
  } catch (err) {
    console.error('[HASH ERROR]', err.message);
    return false;
  }
}

module.exports = {
  hashKey,
  compareKey
};
