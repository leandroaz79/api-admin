const crypto = require('crypto');
const { hashKey } = require('../utils/hash');

function generateApiKey() {
  const randomHex = crypto.randomBytes(24).toString('hex');
  return `lk_live_${randomHex}`;
}

function generateAdminKey() {
  const randomHex = crypto.randomBytes(24).toString('hex');
  return `sk_admin_${randomHex}`;
}

function generateMasterKey() {
  const randomHex = crypto.randomBytes(24).toString('hex');
  return `sk_master_${randomHex}`;
}

/**
 * Generate API key with hash
 * @returns {object} - { key, hash }
 */
function generateApiKeyWithHash() {
  const key = generateApiKey();
  const hash = hashKey(key);
  return { key, hash };
}

/**
 * Generate admin key with hash
 * @returns {object} - { key, hash }
 */
function generateAdminKeyWithHash() {
  const key = generateAdminKey();
  const hash = hashKey(key);
  return { key, hash };
}

module.exports = {
  generateApiKey,
  generateAdminKey,
  generateMasterKey,
  generateApiKeyWithHash,
  generateAdminKeyWithHash
};
