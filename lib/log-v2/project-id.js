import { basename } from 'node:path';

function readable(value) {
  return String(value || 'project').replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 80) || 'project';
}

export function projectIdForCwd(cwd, displayName = basename(cwd || 'project')) {
  return readable(displayName);
}

export function rawProjectDirectoryToken(projectId) {
  return readable(projectId);
}
