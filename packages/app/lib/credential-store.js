// Path-injected private store. No LOG_DIR import and no startup integration.
import { randomBytes } from 'node:crypto';
import { constants, closeSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { atomicWriteJsonSync, fsyncDirectorySync, withFileLockSync } from './log-v2/storage.js';
import { encryptSecret, decryptSecret } from './credential-vault.js';

const KINDS = new Set(['lan-password', 'profile-apiKey', 'im-secret', 'configuration-state']);
const MAX_STORE_BYTES = 4 * 1024 * 1024;
const MAX_SECRET_BYTES = 64 * 1024;

function failure(cause) {
  return Object.assign(new Error('Credential store is unreadable; restore the matching store and master key', { cause }), {
    code: 'CREDENTIALS_UNREADABLE', status: 409,
  });
}

function identityKey(kind, ref) {
  if (!KINDS.has(kind) || typeof ref !== 'string' || !ref || Buffer.byteLength(ref) > 8192) {
    throw new TypeError('Invalid credential identity');
  }
  return JSON.stringify([kind, ref]);
}

function privateStat(path, directory = false) {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (!stat) return null;
  if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1)
      || (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)) {
    throw new Error('Unsafe credential path or permissions');
  }
  return stat;
}

function readPrivateFile(path, maxBytes) {
  const before = privateStat(path);
  if (!before) return null;
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const stat = fstatSync(fd);
    // An atomic rename may replace the path between lstat and open, or unlink
    // the opened snapshot before fstat. Validate the descriptor itself: a
    // private immutable snapshot remains readable, while links/public modes do not.
    if (!stat.isFile() || stat.nlink > 1
        || (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)
        || stat.size > maxBytes) throw new Error('Invalid credential file');
    const bytes = readFileSync(fd);
    if (bytes.length > maxBytes) throw new Error('Credential file exceeds its limit');
    return bytes;
  } finally { closeSync(fd); }
}

function parseData(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length > MAX_STORE_BYTES) throw new Error('Invalid credential store bytes');
  const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (data?.version !== 1 || !data.creds || typeof data.creds !== 'object' || Array.isArray(data.creds)) {
    throw new Error('Invalid credential store format');
  }
  for (const [id, stored] of Object.entries(data.creds)) {
    const parts = JSON.parse(id);
    if (!Array.isArray(parts) || parts.length !== 2 || identityKey(...parts) !== id
        || typeof stored !== 'string' || stored.length > 2 * MAX_SECRET_BYTES) throw new Error('Invalid credential record');
  }
  return data;
}

function verifiedValues(data, key) {
  const values = new Map();
  for (const [id, stored] of Object.entries(data.creds)) {
    const [kind, ref] = JSON.parse(id);
    values.set(id, decryptSecret(key, stored, { kind, ref }));
  }
  return values;
}

// Offline proof only: authenticate every current record with a candidate key
// without writing files or returning any decrypted credential.
export function verifyCredentialStoreSnapshot(bytes, key) {
  try {
    if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('Invalid candidate key');
    const data = parseData(bytes);
    return { records: verifiedValues(data, key).size };
  } catch (cause) { throw failure(cause); }
}

export function createCredentialStore(directory) {
  const root = resolve(directory);
  const file = join(root, 'credentials.json');
  const keyPath = join(root, 'master.key');
  const lockPath = join(root, 'credentials.lock');

  function readData() {
    if (!privateStat(root, true)) return { version: 1, creds: {} };
    const bytes = readPrivateFile(file, MAX_STORE_BYTES);
    if (!bytes) return { version: 1, creds: {} };
    return parseData(bytes);
  }

  function readKey(data, create) {
    let bytes = readPrivateFile(keyPath, 32);
    if (!bytes && create && Object.keys(data.creds).length === 0) {
      // The store lock serializes creators; wx never replaces an existing key.
      const fd = openSync(keyPath, 'wx', 0o600);
      try { writeFileSync(fd, randomBytes(32)); fsyncSync(fd); } finally { closeSync(fd); }
      fsyncDirectorySync(root);
      bytes = readPrivateFile(keyPath, 32);
    }
    if (!bytes || bytes.length !== 32) throw new Error('Master key is missing or malformed');
    return bytes;
  }

  function guarded(operation) {
    try { return operation(); } catch (cause) { throw failure(cause); }
  }

  function mutate(operation) {
    return guarded(() => {
      if (!privateStat(root, true)) mkdirSync(root, { recursive: true, mode: 0o700 });
      privateStat(root, true);
      // Reject unsafe existing lock paths before the shared lock helper reads them.
      privateStat(lockPath);
      return withFileLockSync(lockPath, () => {
        const data = readData();
        const key = readKey(data, true);
        const values = verifiedValues(data, key);
        const changed = operation(data, key, values);
        if (changed) {
          if (Buffer.byteLength(JSON.stringify(data)) + 1 > MAX_STORE_BYTES) throw new Error('Credential store is full');
          privateStat(file);
          atomicWriteJsonSync(file, data);
        }
        return changed;
      }, { timeoutMs: 2000, staleMs: 60_000 });
    });
  }

  return Object.freeze({
    root, file, keyPath,
    get(kind, ref) {
      const id = identityKey(kind, ref);
      return guarded(() => {
        const data = readData();
        if (Object.keys(data.creds).length === 0) return null;
        const key = readKey(data, false);
        return verifiedValues(data, key).get(id) ?? null;
      });
    },
    set(kind, ref, plain) {
      const id = identityKey(kind, ref);
      if (typeof plain !== 'string' || Buffer.byteLength(plain) > MAX_SECRET_BYTES) throw new TypeError('Invalid credential value');
      if (Buffer.from(plain, 'utf8').toString('utf8') !== plain) throw new TypeError('Credential must be valid UTF-8');
      return mutate((data, key, values) => {
        if (values.get(id) === plain) return false;
        data.creds[id] = encryptSecret(key, plain, { kind, ref });
        return true;
      });
    },
    remove(kind, ref) {
      const id = identityKey(kind, ref);
      if (this.get(kind, ref) === null) return false;
      return mutate(data => {
        const present = Object.hasOwn(data.creds, id);
        delete data.creds[id];
        return present;
      });
    },
  });
}
