import { randomBytes } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  existsSync,
  fstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import { LOG_DIR } from '../findcx.js';
import { renameSyncWithRetry } from './file-api.js';

export function getPreferencesPath() {
  return join(LOG_DIR, 'preferences.json');
}

export function readPreferences() {
  try {
    const path = getPreferencesPath();
    if (!existsSync(path)) return {};
    const value = JSON.parse(readFileSync(path, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function writePreferences(value) {
  const path = getPreferencesPath();
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
  try {
    writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
    renameSyncWithRetry(tmp, path);
    try { chmodSync(path, 0o600); } catch {}
  } catch (error) {
    try { unlinkSync(tmp); } catch {}
    throw error;
  }
}

export function updatePreferences(updater) {
  const lockPath = `${getPreferencesPath()}.lock`;
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
    const current = readPreferences();
    const next = updater(current) || current;
    writePreferences(next);
    return next;
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
