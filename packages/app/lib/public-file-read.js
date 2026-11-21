import { closeSync, constants, fstatSync, openSync, readFileSync } from 'node:fs';
import { assertPublicFilePath } from './credential-file-policy.js';

// For file-backed responses that do not use the content API's size limits.
export function readPublicFileSync(path, encoding, assertAccess) {
  const canonical = assertPublicFilePath(path);
  assertAccess?.(canonical);
  const fd = openSync(canonical, constants.O_RDONLY | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0));
  try {
    const stat = fstatSync(fd);
    assertPublicFilePath(canonical, stat);
    assertAccess?.(canonical, stat);
    if (!stat.isFile()) throw Object.assign(new Error('Not a file'), { code: 'NOT_FILE', status: 400 });
    return readFileSync(fd, encoding);
  } finally { closeSync(fd); }
}
