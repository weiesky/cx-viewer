import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { UPLOAD_DIR } from './constants.js';

// Native workspaces may share a basename. Durable scheduled attachments must
// keep their exact cwd owner and never overwrite a sibling's same-name upload.
export function workspaceUploadPaths(cwd, projectName) {
  const key = createHash('sha256').update(resolve(cwd)).digest('hex').slice(0, 32);
  const legacyPersist = join(homedir(), '.codex', 'cx-viewer', projectName || 'default', 'images');
  return { temporary: join(UPLOAD_DIR, key), persistent: join(legacyPersist, key),
    legacyTemporary: UPLOAD_DIR, legacyPersistent: legacyPersist };
}
