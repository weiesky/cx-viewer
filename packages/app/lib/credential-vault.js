// AES-GCM primitive only. Key storage and migration are separate; importing
// this module never creates files or changes runtime credentials.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1:';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function associatedData({ kind, ref } = {}) {
  if (typeof kind !== 'string' || !kind || typeof ref !== 'string' || !ref) {
    throw new TypeError('Credential kind and reference must be nonempty strings');
  }
  return Buffer.from(JSON.stringify([1, kind, ref]));
}

/** Encrypt even an explicit empty string; absence is a store-level decision. */
export function encryptSecret(key, plain, identity) {
  if (typeof plain !== 'string') throw new TypeError('Credential must be a string');
  const input = Buffer.from(plain, 'utf8');
  if (input.toString('utf8') !== plain) throw new TypeError('Credential must be valid UTF-8');
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(associatedData(identity));
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  return VERSION + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}

/** Throws on version/encoding errors, wrong identity/key, or tampering. */
export function decryptSecret(key, stored, identity) {
  if (typeof stored !== 'string' || !stored.startsWith(VERSION)) {
    throw new TypeError('Unsupported credential envelope');
  }
  const encoded = stored.slice(VERSION.length);
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length < IV_BYTES + TAG_BYTES || bytes.toString('base64') !== encoded) {
    throw new TypeError('Invalid credential encoding');
  }
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, IV_BYTES), { authTagLength: TAG_BYTES });
  decipher.setAAD(associatedData(identity));
  decipher.setAuthTag(bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  const plain = Buffer.concat([decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]);
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(plain);
}
