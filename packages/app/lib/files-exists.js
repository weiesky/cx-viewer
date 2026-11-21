// Original 6880f773 batch oracle: every missing/denied/non-file outcome is false.
// Native adaptation reuses the viewed workspace's existing file resolution.
import { isAbsolute, resolve } from 'node:path';
import { statSync } from 'node:fs';
import { resolveFilePath } from './file-api.js';
import { getAllowedRoots, isReadAllowed } from './file-access-policy.js';

export function probeFilesExist(paths, cwd) {
  if (!Array.isArray(paths) || paths.length > 50 || paths.some(path => typeof path !== 'string' || path.length > 1024)) {
    throw Object.assign(new Error('Invalid paths'), { status: 400 });
  }
  const options = { cwd, roots: getAllowedRoots(cwd) };
  return paths.map(path => {
    let exists = false;
    try {
      const absolute = isAbsolute(path) || /^[a-zA-Z]:[\\/]/.test(path);
      if (path && (absolute || !path.split(/[\\/]/).includes('..'))) {
        const file = resolveFilePath(cwd, absolute ? path : resolve(cwd, path), false);
        const policy = isReadAllowed(file, options);
        exists = policy.ok && statSync(policy.real).isFile();
      }
    } catch { /* Uniform false: never expose denial reasons or file bytes. */ }
    return { path, exists };
  });
}
