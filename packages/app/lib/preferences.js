import { randomBytes } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';

import { renameSyncWithRetry } from './file-api.js';
import { getPreferencesPath } from './config-paths.js';
import { fsyncDirectorySync } from './log-v2/storage.js';
export { getPreferencesPath } from './config-paths.js';

export function readPreferences({ strict = false, file = getPreferencesPath() } = {}) {
  try {
    const stat = lstatSync(file, { throwIfNoEntry: false });
    if (stat && (!stat.isFile() || stat.nlink !== 1)) throw new Error('Unsafe preferences file');
    const bytes = readFileSync(file);
    const value = JSON.parse(strict ? new TextDecoder('utf-8', { fatal: true }).decode(bytes) : bytes.toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError('Preferences must contain a JSON object');
    }
    return value;
  } catch (cause) {
    if (!strict) return {};
    // Only an absent path may be initialized; a dangling symlink is unreadable.
    if (cause.code === 'ENOENT') {
      try { if (!lstatSync(file, { throwIfNoEntry: false })) return {}; } catch {}
    }
    throw Object.assign(new Error('Preferences are unreadable; restore preferences.json before saving', { cause }), {
      code: 'PREFERENCES_UNREADABLE', status: 409,
    });
  }
}

export function writePreferences(value, { durable = false, file: path = getPreferencesPath() } = {}) {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (stat && (!stat.isFile() || stat.nlink !== 1)) throw Object.assign(new Error('Unsafe preferences file'), { code: 'PREFERENCES_UNREADABLE', status: 409 });
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
  let created = false;
  try {
    const fd = openSync(tmp, 'wx', 0o600);
    created = true;
    try {
      writeFileSync(fd, JSON.stringify(value, null, 2));
      if (durable) fsyncSync(fd);
    } finally { closeSync(fd); }
    renameSyncWithRetry(tmp, path);
    if (durable) fsyncDirectorySync(dirname(path));
    try { chmodSync(path, 0o600); } catch {}
  } catch (error) {
    if (created) try { unlinkSync(tmp); } catch {}
    throw error;
  }
}

export function withPreferencesLock(operation, { file = getPreferencesPath() } = {}) {
  const lockPath = `${file}.lock`;
  mkdirSync(dirname(lockPath), { recursive: true, mode: 0o700 });
  const deadline = Date.now() + 2000;
  let fd;
  while (fd === undefined) {
    try {
      fd = openSync(lockPath, 'wx', 0o600);
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > 10_000) unlinkSync(lockPath);
      } catch {}
      if (Date.now() >= deadline) {
        throw Object.assign(new Error('Timed out waiting for preferences lock'), { code: 'PREFERENCES_LOCK_TIMEOUT' });
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  try {
    return operation();
  } finally {
    let ownsLockPath = false;
    try {
      const held = fstatSync(fd);
      const current = statSync(lockPath);
      ownsLockPath = held.dev === current.dev && held.ino === current.ino;
    } catch {}
    try { closeSync(fd); } catch {}
    if (ownsLockPath) try { unlinkSync(lockPath); } catch {}
  }
}

export function updatePreferences(updater, { file = getPreferencesPath(), durable = false } = {}) {
  return withPreferencesLock(() => {
    const current = readPreferences({ strict: true, file });
    const next = updater(current) || current;
    writePreferences(next, { file, durable });
    return next;
  }, { file });
}
