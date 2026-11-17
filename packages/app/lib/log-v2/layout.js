import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const LOG_LAYOUT_MIGRATION_MARKER = '.log-v2-layout-migration.active';

export function logLayoutMigrationMarkerPath(logDir) {
  return join(logDir, LOG_LAYOUT_MIGRATION_MARKER);
}

export function assertLogLayoutWritable(logDir) {
  const marker = logLayoutMigrationMarkerPath(logDir);
  if (!existsSync(marker)) return;
  const stat = lstatSync(marker);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('Log layout migration marker is unsafe');
  }
  let detail = '';
  try {
    const value = JSON.parse(readFileSync(marker, 'utf8'));
    if (Number.isInteger(value?.pid)) detail = ` (pid ${value.pid})`;
  } catch {}
  const error = new Error(`Log layout migration is in progress${detail}; V2 writes are disabled`);
  error.code = 'CXV_LOG_LAYOUT_MIGRATING';
  throw error;
}
