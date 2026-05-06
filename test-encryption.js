require('dotenv').config();
const crypto = require('crypto');
const { encrypt, decrypt } = require('./src/utils/encryption');

// Test encryption/decryption
console.log('🔐 Testing AES-256-GCM Encryption\n');

// Test 1: Basic encryption/decryption
console.log('Test 1: Basic encryption/decryption');
const testKey = 'lk_live_test123456789';
try {
  const encrypted = encrypt(testKey);
  console.log('✅ Encrypted:', encrypted.substring(0, 50) + '...');

  const decrypted = decrypt(encrypted);
  console.log('✅ Decrypted:', decrypted);
  console.log('✅ Match:', testKey === decrypted ? 'YES' : 'NO');
} catch (err) {
  console.error('❌ Error:', err.message);
}

console.log('\n---\n');

// Test 2: Multiple encryptions produce different ciphertexts
console.log('Test 2: Different IVs produce different ciphertexts');
try {
  const enc1 = encrypt(testKey);
  const enc2 = encrypt(testKey);
  console.log('✅ Encryption 1:', enc1.substring(0, 50) + '...');
  console.log('✅ Encryption 2:', enc2.substring(0, 50) + '...');
  console.log('✅ Different:', enc1 !== enc2 ? 'YES (secure)' : 'NO (insecure)');

  const dec1 = decrypt(enc1);
  const dec2 = decrypt(enc2);
  console.log('✅ Both decrypt to same value:', dec1 === dec2 && dec1 === testKey ? 'YES' : 'NO');
} catch (err) {
  console.error('❌ Error:', err.message);
}

console.log('\n---\n');

// Test 3: Tampering detection
console.log('Test 3: Tampering detection');
try {
  const encrypted = encrypt(testKey);
  const parts = encrypted.split(':');

  // Tamper with encrypted data
  const tamperedEncrypted = parts[0] + ':' + 'tampered' + ':' + parts[2];

  try {
    decrypt(tamperedEncrypted);
    console.log('❌ SECURITY ISSUE: Tampered data was accepted!');
  } catch (err) {
    console.log('✅ Tampering detected:', err.message);
  }
} catch (err) {
  console.error('❌ Error:', err.message);
}

console.log('\n---\n');

// Test 4: Invalid format
console.log('Test 4: Invalid format handling');
try {
  decrypt('invalid:format');
  console.log('❌ Invalid format was accepted!');
} catch (err) {
  console.log('✅ Invalid format rejected:', err.message);
}

console.log('\n---\n');

// Test 5: Real API key format
console.log('Test 5: Real API key format');
const realKey = 'lk_live_' + crypto.randomBytes(24).toString('hex');
try {
  const encrypted = encrypt(realKey);
  const decrypted = decrypt(encrypted);
  console.log('✅ Original:', realKey);
  console.log('✅ Encrypted length:', encrypted.length, 'chars');
  console.log('✅ Decrypted:', decrypted);
  console.log('✅ Match:', realKey === decrypted ? 'YES' : 'NO');
} catch (err) {
  console.error('❌ Error:', err.message);
}

console.log('\n---\n');
console.log('✅ All encryption tests completed!');
