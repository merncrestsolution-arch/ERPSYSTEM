// Browser-side password hashing for the Supabase (web/mobile) backend.
// Uses PBKDF2 via the Web Crypto API so passwords are never stored in plaintext.
// Format: "pbkdf2:<iterations>:<saltHex>:<hashHex>".

const PREFIX = 'pbkdf2';
const ITERATIONS = 100_000;
const KEYLEN_BYTES = 32;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEYLEN_BYTES * 8
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `${PREFIX}:${ITERATIONS}:${toHex(salt.buffer)}:${hash}`;
}

export function isHashed(stored: string | null | undefined): boolean {
  return typeof stored === 'string' && stored.startsWith(`${PREFIX}:`);
}

// Constant-ish time comparison of two hex strings of equal length.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (stored == null) return false;

  if (isHashed(stored)) {
    const [, iterationsStr, saltHex, originalHash] = stored.split(':');
    const iterations = parseInt(iterationsStr, 10) || ITERATIONS;
    if (!saltHex || !originalHash) return false;
    const derived = await derive(password, fromHex(saltHex), iterations);
    return safeEqual(derived, originalHash);
  }

  // Legacy plaintext comparison.
  return String(password) === String(stored);
}
