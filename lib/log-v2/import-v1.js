#!/usr/bin/env node
import crypto from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { validateLogPath } from '../log-management.js';
import { streamReconstructedEntries } from '../log-stream.js';
import { resolveLegacyEntryIdentity, hashStorageId } from './identity.js';
import { scanMaterializedSessionArchive } from './materializer.js';
import { normalizeParityEntry } from './parity.js';
import { IMPORT_RECEIPT_KIND, validateImportReceipt } from './schema.js';
import { atomicWriteJsonSync, stableJsonStringify } from './storage.js';
import { LogV2Writer } from './writer.js';
import { rebuildSessionSummary } from './session-summary.js';

const IMPORT_RECEIPT = 'import.json';

function fileSha256(filePath) {
  const hash = crypto.createHash('sha256');
  const fd = openSync(filePath, 'r');
  const buffer = Buffer.alloc(1024 * 1024);
  try {
    let bytesRead;
    while ((bytesRead = readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, bytesRead));
  } finally {
    closeSync(fd);
  }
  return hash.digest('hex');
}

function sourceSnapshot(filePath, minStableMs = 0) {
  const before = statSync(filePath);
  if (minStableMs > 0 && Date.now() - before.mtimeMs < minStableMs) {
    const error = new Error(`V1 log is still active; modified less than ${Math.ceil(minStableMs / 1000)} seconds ago`);
    error.code = 'CXV_LOG_V1_IMPORT_UNSTABLE';
    throw error;
  }
  const digest = `sha256:${fileSha256(filePath)}`;
  const after = statSync(filePath);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ino !== after.ino) {
    const error = new Error('V1 log changed while its import snapshot was being hashed');
    error.code = 'CXV_LOG_V1_IMPORT_UNSTABLE';
    throw error;
  }
  return Object.freeze({ size: after.size, mtimeMs: after.mtimeMs, ino: after.ino, digest });
}

function assertSourceUnchanged(filePath, snapshot) {
  const current = statSync(filePath);
  if (current.size !== snapshot.size || current.mtimeMs !== snapshot.mtimeMs || current.ino !== snapshot.ino) {
    const error = new Error('V1 log changed during import; no verified receipt was written');
    error.code = 'CXV_LOG_V1_IMPORT_UNSTABLE';
    throw error;
  }
}

function syncArchiveFiles(root) {
  let files = 0;
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) {
        const fd = openSync(path, 'r');
        try { fsyncSync(fd); } finally { closeSync(fd); }
        files++;
      }
    }
  };
  visit(root);
  return files;
}

function createEntriesDigest() {
  const hash = crypto.createHash('sha256');
  let count = 0;
  hash.update('[');
  return {
    add(entry) {
      if (count > 0) hash.update(',');
      hash.update(stableJsonStringify(normalizeParityEntry(entry)));
      count++;
    },
    finish() {
      hash.update(']');
      return Object.freeze({ count, digest: `sha256:${hash.digest('hex')}` });
    },
  };
}

function importedSessionId({ projectId, canonicalCwd, file }) {
  return `legacy-import:${hashStorageId(`${projectId}\u0000${canonicalCwd}\u0000${file}`)}`;
}

function compareImportedEntries(v1, v2) {
  return Object.freeze({
    ok: v1.count === v2.count && v1.digest === v2.digest,
    v1Entries: v1.count,
    v2Entries: v2.count,
    v1Digest: v1.digest,
    v2Digest: v2.digest,
  });
}

function scanV1Entries(sourcePath, onEntry = null) {
  const digester = createEntriesDigest();
  streamReconstructedEntries(sourcePath, (segment) => {
    for (const entry of segment) {
      onEntry?.(entry);
      digester.add(entry);
    }
  });
  return digester.finish();
}

function scanV2Entries(sessionDir) {
  const digester = createEntriesDigest();
  scanMaterializedSessionArchive(sessionDir, (entry) => digester.add(entry), { allowIncompleteImport: true });
  return digester.finish();
}

function readReceipt(sessionDir) {
  const path = resolve(sessionDir, IMPORT_RECEIPT);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function receiptMatchesSource(receipt, { snapshot, file, projectId, canonicalCwd, sessionId }) {
  return !!receipt
    && validateImportReceipt(receipt).ok
    && receipt.sourceFile === file
    && receipt.sourceDigest === snapshot.digest
    && receipt.sourceBytes === snapshot.size
    && receipt.projectId === projectId
    && receipt.canonicalCwd === canonicalCwd
    && receipt.sessionId === sessionId;
}

export function verifyImportedV1Log({ logDir, file, sessionDir, minStableMs = 0 }) {
  const sourcePath = validateLogPath(logDir, file);
  const snapshot = sourceSnapshot(sourcePath, minStableMs);
  const sourceDigest = snapshot.digest;
  const v1 = scanV1Entries(sourcePath);
  const v2 = scanV2Entries(sessionDir);
  assertSourceUnchanged(sourcePath, snapshot);
  const comparison = compareImportedEntries(v1, v2);
  const receipt = readReceipt(sessionDir);
  const receiptMatches = !!receipt
    && validateImportReceipt(receipt).ok
    && receipt.sourceFile === file
    && receipt.sourceDigest === sourceDigest;
  return Object.freeze({
    ...comparison,
    ok: comparison.ok && receiptMatches,
    sourceFile: file,
    sourceDigest,
    receiptMatches,
    sessionId: receipt?.sessionId || null,
    sessionDir,
  });
}

export function importV1LogFile({
  logDir,
  file,
  projectId = file?.split('/')?.[0],
  canonicalCwd,
  now = new Date(),
  minStableMs = 0,
}) {
  if (typeof logDir !== 'string' || !logDir) throw new TypeError('logDir is required');
  if (typeof file !== 'string' || !file.endsWith('.jsonl')) throw new TypeError('a V1 .jsonl file is required');
  if (typeof projectId !== 'string' || !projectId) throw new TypeError('projectId is required');
  if (typeof canonicalCwd !== 'string' || !canonicalCwd) throw new TypeError('canonicalCwd is required');
  const sourcePath = validateLogPath(logDir, file);
  const snapshot = sourceSnapshot(sourcePath, minStableMs);
  const sessionId = importedSessionId({ projectId, canonicalCwd, file });
  const createdAt = statSync(sourcePath).mtime.toISOString();
  const writerOptions = {
    rootDir: logDir,
    projectId,
    canonicalCwd,
    sessionId,
    rootThreadId: sessionId,
    createdAt,
    startReason: 'legacy',
    source: 'legacy-import',
    // Offline import is committed by a verified receipt. Per-entry fsync makes
    // large archives take hours; sync every produced file once after semantic
    // verification, then persist the receipt last as the durable commit marker.
    durability: 'buffered',
    // Bulk imports may contain tens of thousands of entries. Rewriting a
    // growing derived summary after each entry would be quadratic; finalize it
    // once after the canonical receipt is durable instead.
    summaryMode: 'deferred',
  };
  let writer = LogV2Writer.open(writerOptions);
  let existingReceipt = readReceipt(writer.sessionDir);
  const receiptIsCurrent = receiptMatchesSource(existingReceipt, {
    snapshot, file, projectId, canonicalCwd, sessionId,
  });
  if (writer.recovery.committedRecords > 0 && !receiptIsCurrent) {
    // A prior interrupted import or an older snapshot of a file that later
    // resumed growing must never be extended in place. Rebuild the deterministic
    // archive from the now-stable source so revision chains cannot mix snapshots.
    rmSync(writer.sessionDir, { recursive: true, force: false });
    writer = LogV2Writer.open(writerOptions);
    existingReceipt = null;
  } else if (!receiptIsCurrent) {
    // Do not leave a stale commit marker visible while populating an otherwise
    // empty deterministic archive.
    if (existingReceipt && existsSync(join(writer.sessionDir, IMPORT_RECEIPT))) {
      rmSync(join(writer.sessionDir, IMPORT_RECEIPT), { force: false });
    }
    existingReceipt = null;
  }
  const alreadyCommitted = writer.recovery.committedRecords > 0;
  let v1;
  if (!alreadyCommitted) {
    const identity = resolveLegacyEntryIdentity({}, {
      fallbackSessionId: sessionId,
      fallbackThreadId: sessionId,
    });
    v1 = scanV1Entries(sourcePath, (entry) => writer.append(entry, identity));
  } else {
    v1 = scanV1Entries(sourcePath);
  }
  if (v1.count === 0) throw new Error('V1 log contains no readable entries');
  const v2 = scanV2Entries(writer.sessionDir);
  const comparison = compareImportedEntries(v1, v2);
  if (!comparison.ok) {
    const error = new Error(`V1 import verification failed (${comparison.v1Entries} V1 vs ${comparison.v2Entries} V2 entries)`);
    error.code = 'CXV_LOG_V1_IMPORT_MISMATCH';
    error.report = comparison;
    throw error;
  }
  assertSourceUnchanged(sourcePath, snapshot);
  const sourceDigest = snapshot.digest;
  let syncedFiles = 0;
  if (!alreadyCommitted) syncedFiles = syncArchiveFiles(writer.sessionDir);
  const receipt = {
    kind: IMPORT_RECEIPT_KIND,
    version: 1,
    sourceFile: file,
    sourceBytes: snapshot.size,
    sourceDigest,
    projectId,
    canonicalCwd,
    sessionId,
    importedAt: new Date(now).toISOString(),
    entryCount: comparison.v2Entries,
    entriesDigest: comparison.v2Digest,
    durability: existingReceipt?.durability || (alreadyCommitted ? 'per-entry-fsync' : 'batched-fsync'),
    syncedFiles: existingReceipt?.syncedFiles ?? (alreadyCommitted ? null : syncedFiles),
  };
  atomicWriteJsonSync(resolve(writer.sessionDir, IMPORT_RECEIPT), receipt, { durable: true });
  let summaryError = null;
  try {
    rebuildSessionSummary(writer.sessionDir, { durable: true, lock: true });
  } catch (error) {
    // import.json is the canonical commit marker. A derived-cache failure must
    // not turn a verified import into a reported failure; listing/backfill can
    // recreate it later.
    summaryError = error;
  }
  return Object.freeze({
    ok: true,
    imported: !alreadyCommitted,
    verified: true,
    sourceFile: file,
    sourceDigest,
    sessionId,
    sessionDir: writer.sessionDir,
    entryCount: comparison.v2Entries,
    entriesDigest: comparison.v2Digest,
    durability: receipt.durability,
    syncedFiles: receipt.syncedFiles,
    summaryDegraded: !!summaryError,
    summaryError: summaryError?.message ?? null,
  });
}

function parseCli(argv) {
  const positional = [];
  const options = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) positional.push(arg);
    else {
      const [key, value] = arg.slice(2).split('=', 2);
      if (!value) throw new TypeError(`expected --${key}=VALUE`);
      if (key === 'cwd') options.canonicalCwd = value;
      else if (key === 'project') options.projectId = value;
      else if (key === 'project-dir') options.projectDir = value;
      else if (key === 'stable-seconds') options.minStableMs = Number(value) * 1000;
      else if (key === 'skip-unstable') options.skipUnstable = value === '1' || value === 'true';
      else throw new TypeError(`unknown option --${key}`);
    }
  }
  if (positional.length < 1 || !options.canonicalCwd || (positional.length < 2 && !options.projectDir)) {
    throw new TypeError('Usage: node lib/log-v2/import-v1.js <log-dir> <project/file.jsonl>... --cwd=/canonical/project [--project=ID] [--project-dir=DIR] [--stable-seconds=N] [--skip-unstable=1]');
  }
  if (!Number.isFinite(options.minStableMs ?? 0) || (options.minStableMs ?? 0) < 0) {
    throw new TypeError('--stable-seconds must be a non-negative number');
  }
  const logDir = resolve(positional[0]);
  let files = positional.slice(1);
  if (options.projectDir) {
    if (!/^[A-Za-z0-9._-]+$/.test(options.projectDir)) throw new TypeError('--project-dir must be one safe path segment');
    files = files.concat(readdirSync(join(logDir, options.projectDir), { withFileTypes: true })
      .filter((entry) => entry.isFile() && !entry.isSymbolicLink() && entry.name.endsWith('.jsonl'))
      .map((entry) => `${options.projectDir}/${entry.name}`)
      .sort());
  }
  const { projectDir, skipUnstable = false, ...importOptions } = options;
  return { logDir, files: [...new Set(files)], options: importOptions, skipUnstable };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { logDir, files, options, skipUnstable } = parseCli(process.argv.slice(2));
    const results = [];
    const skipped = [];
    for (const file of files) {
      try {
        const result = importV1LogFile({ logDir, file, ...options });
        results.push(result);
        console.error(`[log-v2-import] verified ${file} (${result.entryCount} entries)`);
      } catch (error) {
        if (skipUnstable && error.code === 'CXV_LOG_V1_IMPORT_UNSTABLE') {
          skipped.push({ file, code: error.code, error: error.message });
          console.error(`[log-v2-import] skipped active ${file}`);
          continue;
        }
        throw error;
      }
    }
    console.log(JSON.stringify({ ok: true, results, skipped }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message, code: error.code || null }, null, 2));
    process.exitCode = 1;
  }
}
