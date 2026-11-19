import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  lstatSync,
  openSync,
  readdirSync,
  renameSync,
  unlinkSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

const LEGACY_NAME = /^terminal-history-\d+\.log$/;

export function defaultLegacyTerminalHistoryDir() {
  return process.env.CXV_RUNTIME_DIR || join(homedir(), '.codex', 'cx-viewer', 'runtime');
}

export function inventoryLegacyTerminalHistory({ dir = defaultLegacyTerminalHistoryDir(), hardenPermissions = false } = {}) {
  const root = resolve(dir);
  let names;
  try { names = readdirSync(root); } catch (error) {
    if (error?.code === 'ENOENT') return { dir: root, files: [], skipped: [], totalBytes: 0 };
    throw error;
  }

  const files = [];
  const skipped = [];
  for (const name of names.sort()) {
    if (!LEGACY_NAME.test(name)) continue;
    const path = join(root, name);
    let stat;
    try { stat = lstatSync(path, { bigint: true }); } catch (error) {
      skipped.push({ path, reason: error?.code || 'lstat-failed' });
      continue;
    }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n) {
      skipped.push({ path, reason: 'not-private-regular-file' });
      continue;
    }
    if (hardenPermissions && process.platform !== 'win32') {
      let fd;
      try {
        fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
        const opened = fstatSync(fd, { bigint: true });
        if (!opened.isFile() || opened.nlink !== 1n
          || opened.dev !== stat.dev || opened.ino !== stat.ino) {
          throw Object.assign(new Error('file changed before permission hardening'), {
            code: 'CHANGED_BEFORE_CHMOD',
          });
        }
        fchmodSync(fd, 0o600);
        stat = fstatSync(fd, { bigint: true });
      } catch (error) {
        skipped.push({ path, reason: error?.code || 'chmod-failed' });
        continue;
      } finally {
        if (fd !== undefined) try { closeSync(fd); } catch { }
      }
    }
    files.push({
      path,
      size: Number(stat.size),
      dev: String(stat.dev),
      ino: String(stat.ino),
      mtimeNs: String(stat.mtimeNs),
      ctimeNs: String(stat.ctimeNs),
    });
  }
  return { dir: root, files, skipped, totalBytes: files.reduce((sum, file) => sum + file.size, 0) };
}

export function deleteLegacyTerminalHistory(plan, {
  confirm = false,
  beforeStagedDelete = null,
} = {}) {
  if (!confirm) return { deleted: [], skipped: plan?.files || [], totalBytes: 0, dryRun: true };
  const deleted = [];
  const skipped = [...(plan?.skipped || [])];
  let totalBytes = 0;
  for (const file of plan?.files || []) {
    const stagedPath = join(resolve(plan.dir), `.cxv-delete-${randomUUID()}`);
    try {
      // Move the directory entry first. A concurrent replacement at the public
      // name can no longer make us unlink a different file after validation.
      renameSync(file.path, stagedPath);
      if (typeof beforeStagedDelete === 'function') beforeStagedDelete({ file, stagedPath });
      const current = lstatSync(stagedPath, { bigint: true });
      // rename(2) may update ctime on some platforms, so the staged check uses
      // identity plus content-related metadata. Pre-rename swaps still change
      // the inode, while in-place rewrites change size or mtime.
      if (!current.isFile() || current.isSymbolicLink() || current.nlink !== 1n
        || String(current.dev) !== file.dev || String(current.ino) !== file.ino
        || Number(current.size) !== file.size || String(current.mtimeNs) !== file.mtimeNs) {
        try { renameSync(stagedPath, file.path); } catch { }
        skipped.push({ path: file.path, reason: 'changed-during-staged-delete' });
        continue;
      }
      unlinkSync(stagedPath);
      deleted.push(file.path);
      totalBytes += file.size;
    } catch (error) {
      try { renameSync(stagedPath, file.path); } catch { }
      skipped.push({ path: file.path, reason: error?.code || 'delete-failed' });
    }
  }
  return { deleted, skipped, totalBytes, dryRun: false };
}
