import { createHash } from 'node:crypto';
import { ensureV2ProjectIdentity, readV2ProjectIdentity } from './writer.js';
import { basename } from 'node:path';
import { MAX_LOG_STORAGE_SEGMENT_BYTES } from './identity.js';

function readable(value) {
  return String(value || 'project').replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 80) || 'project';
}

export function projectIdForCwd(cwd, displayName = basename(cwd || 'project')) {
  return readable(displayName);
}

export function rawProjectDirectoryToken(projectId) {
  return readable(projectId);
}

function collisionProjectId(cwd, displayName) {
  // Uppercase bytes take three storage bytes each; leave room for -- + digest.
  const stem = readable(displayName).slice(0, Math.floor((MAX_LOG_STORAGE_SEGMENT_BYTES - 18) / 3));
  return `${stem}--${createHash('sha256').update(cwd).digest('hex').slice(0, 16)}`;
}

// Prefer an already allocated suffix even if the original project was deleted.
// Reads never create directories, rename archives, or repair invalid metadata.
export function resolveProjectIdForCwd(logDir, cwd, displayName = basename(cwd || 'project')) {
  const base = projectIdForCwd(cwd, displayName);
  const alternative = collisionProjectId(cwd, displayName);
  const alias = readV2ProjectIdentity(logDir, alternative);
  if (alias) {
    if (alias.canonicalCwd !== cwd) throw new Error('V2 project path digest collision');
    return alternative;
  }
  const existing = readV2ProjectIdentity(logDir, base);
  return !existing || existing.canonicalCwd === cwd ? base : alternative;
}

export function ensureProjectIdForCwd(logDir, cwd, displayName = basename(cwd || 'project')) {
  const base = projectIdForCwd(cwd, displayName);
  let projectId = resolveProjectIdForCwd(logDir, cwd, displayName);
  try {
    ensureV2ProjectIdentity({ rootDir: logDir, projectId, canonicalCwd: cwd });
  } catch (error) {
    // Two processes may both select the unclaimed readable name. The existing
    // project lock elects its owner; only a validated cwd collision may retry.
    if (error.code !== 'CXV_LOG_PROJECT_ID_COLLISION' || projectId !== base) throw error;
    projectId = collisionProjectId(cwd, displayName);
    ensureV2ProjectIdentity({ rootDir: logDir, projectId, canonicalCwd: cwd });
  }
  return projectId;
}
