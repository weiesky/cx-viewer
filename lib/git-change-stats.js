import { execFile } from 'node:child_process';
import { closeSync, lstatSync, openSync, readSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const DEFAULT_MAX_FILE_BYTES = 32 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 128 * 1024 * 1024;

export function parseGitNumstat(output) {
  let insertions = 0;
  let deletions = 0;
  for (const line of String(output || '').split('\n')) {
    if (!line) continue;
    const firstTab = line.indexOf('\t');
    const secondTab = firstTab < 0 ? -1 : line.indexOf('\t', firstTab + 1);
    if (firstTab < 0 || secondTab < 0) continue;
    const added = line.slice(0, firstTab);
    const removed = line.slice(firstTab + 1, secondTab);
    if (/^\d+$/.test(added)) insertions += Number(added);
    if (/^\d+$/.test(removed)) deletions += Number(removed);
  }
  return { insertions, deletions };
}

export function countUntrackedLines(cwd, files, {
  maxFileBytes = DEFAULT_MAX_FILE_BYTES,
  maxTotalBytes = DEFAULT_MAX_TOTAL_BYTES,
} = {}) {
  let insertions = 0;
  let scannedBytes = 0;
  let capped = false;
  const root = resolve(cwd);
  const buffer = Buffer.allocUnsafe(64 * 1024);

  for (const file of files || []) {
    const fullPath = resolve(root, file);
    const rel = relative(root, fullPath);
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || rel.startsWith(sep)) continue;

    let fd;
    try {
      const stat = lstatSync(fullPath);
      if (!stat.isFile() || stat.isSymbolicLink()) continue;
      const remainingBudget = Math.max(0, maxTotalBytes - scannedBytes);
      const scanLimit = Math.min(stat.size, maxFileBytes, remainingBudget);
      if (scanLimit < stat.size) capped = true;
      if (scanLimit === 0) continue;

      fd = openSync(fullPath, 'r');
      let fileBytes = 0;
      let fileLines = 0;
      let lastByte = null;
      let binary = false;
      while (fileBytes < scanLimit) {
        const length = Math.min(buffer.length, scanLimit - fileBytes);
        const bytesRead = readSync(fd, buffer, 0, length, null);
        if (bytesRead === 0) break;
        const chunk = buffer.subarray(0, bytesRead);
        if (chunk.includes(0)) { binary = true; break; }
        for (const byte of chunk) if (byte === 10) fileLines++;
        lastByte = chunk[bytesRead - 1];
        fileBytes += bytesRead;
      }
      scannedBytes += fileBytes;
      if (!binary && fileBytes > 0) insertions += fileLines + (lastByte === 10 ? 0 : 1);
    } catch {
      // The status may race with a file being removed; skip that entry.
    } finally {
      if (fd !== undefined) try { closeSync(fd); } catch {}
    }
  }

  return { insertions, capped };
}

export async function getGitWorkingTreeLineStats(cwd, untrackedFiles = []) {
  let tracked = { insertions: 0, deletions: 0 };
  try {
    const { stdout } = await execFileAsync('git', ['diff', '--numstat', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      timeout: 10_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    tracked = parseGitNumstat(stdout);
  } catch {
    // Repositories without HEAD still report their files as untracked below.
  }
  const untracked = countUntrackedLines(cwd, untrackedFiles);
  return {
    insertions: tracked.insertions + untracked.insertions,
    deletions: tracked.deletions,
    insertions_capped: untracked.capped,
  };
}
