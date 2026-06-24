const crypto = require('crypto');

const SCRYPT_KEYLEN = 64;
const HASH_PREFIX = 'scrypt';

// Produces a self-describing hash string: "scrypt:<saltHex>:<hashHex>".
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN).toString('hex');
  return `${HASH_PREFIX}:${salt}:${derived}`;
}

function isHashed(stored) {
  return typeof stored === 'string' && stored.startsWith(`${HASH_PREFIX}:`);
}

// Returns true when `password` matches `stored`. Falls back to a plaintext
// comparison for legacy rows created before hashing was introduced.
function verifyPassword(password, stored) {
  if (stored == null) return false;

  if (isHashed(stored)) {
    const [, salt, originalHash] = stored.split(':');
    if (!salt || !originalHash) return false;
    const derived = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN).toString('hex');
    const a = Buffer.from(derived, 'hex');
    const b = Buffer.from(originalHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  // Legacy plaintext comparison.
  return String(password) === String(stored);
}

module.exports = { hashPassword, verifyPassword, isHashed };
