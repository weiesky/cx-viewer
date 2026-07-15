import {
  closeSync,
  copyFileSync,
  createReadStream,
  createWriteStream,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve, sep } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { readFile } from 'node:fs/promises';

import JSZip from 'jszip';

import { decodeLogStorageSegment, sessionArchiveDirectoryName } from './identity.js';
import { inspectSessionArchive } from './inspect.js';
import {
  readV2SessionEntries,
  resolveV2SessionFile,
  scanMaterializedSessionArchive,
} from './materializer.js';
import { validateSessionManifest } from './schema.js';
import { scanJsonlSync, withFileLockSync } from './storage.js';

export const LOG_ARCHIVE_LIMITS = Object.freeze({
  compressedBytes: 64 * 1024 * 1024,
  entries: 20_000,
  pathBytes: 512,
  pathDepth: 32,
  singleExpandedBytes: 64 * 1024 * 1024,
  totalExpandedBytes: 128 * 1024 * 1024,
  expansionRatio: 200,
  materializedBytes: 128 * 1024 * 1024,
});

const SESSION_ROOT_PATTERN = /^(\d{8})_([a-z0-9._~-]+)\.cxvsession$/;
const ZIP_SIGNATURES = new Set([0x0403, 0x0506, 0x0708]);
const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_SIGNATURE = 0x02014b50;

function archiveError(message, status = 400, code = 'CXV_LOG_ARCHIVE_INVALID') {
  return Object.assign(new Error(message), { status, code });
}

function isCanonicalSessionRoot(name) {
  const match = SESSION_ROOT_PATTERN.exec(name);
  if (!match) return false;
  try {
    decodeLogStorageSegment(match[2], 'sessionId');
    return true;
  } catch {
    return false;
  }
}

function isContained(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep));
}

function isTransientName(name) {
  return name === '.append.lock'
    || name === '.DS_Store'
    || name === '__MACOSX'
    || name.startsWith('._')
    || name.includes('.tmp-');
}

function copyStableTree(source, target, counters, maxBytes) {
  const stat = lstatSync(source);
  if (stat.isSymbolicLink()) throw archiveError('Session archive contains a symbolic link', 422, 'CXV_LOG_ARCHIVE_UNSAFE_FILE');
  if (stat.isDirectory()) {
    mkdirSync(target, { recursive: true });
    for (const name of readdirSync(source).sort()) {
      if (isTransientName(name)) continue;
      copyStableTree(join(source, name), join(target, name), counters, maxBytes);
    }
    return;
  }
  if (!stat.isFile()) throw archiveError('Session archive contains a non-regular file', 422, 'CXV_LOG_ARCHIVE_UNSAFE_FILE');
  counters.total += stat.size;
  if (counters.total > maxBytes) {
    throw archiveError('Session archive is too large to export', 413, 'CXV_LOG_ARCHIVE_TOO_LARGE');
  }
  copyFileSync(source, target);
}

function addSnapshotTree(zip, rootName, snapshotDir, currentDir = snapshotDir) {
  for (const name of readdirSync(currentDir).sort()) {
    const source = join(currentDir, name);
    const stat = lstatSync(source);
    const rel = relative(snapshotDir, source).split(sep).join('/');
    const archivePath = `${rootName}/${rel}`;
    if (stat.isDirectory()) {
      zip.folder(archivePath);
      addSnapshotTree(zip, rootName, snapshotDir, source);
    } else if (stat.isFile()) {
      zip.file(archivePath, stat.size === 0 ? Buffer.alloc(0) : createReadStream(source), {
        date: stat.mtime,
        createFolders: true,
      });
    } else {
      throw archiveError('Snapshot contains a non-regular file', 422, 'CXV_LOG_ARCHIVE_UNSAFE_FILE');
    }
  }
}

function outputLimitTransform(counters, maxBytes) {
  return new Transform({
    transform(chunk, _encoding, callback) {
      counters.total += chunk.length;
      if (counters.total > maxBytes) {
        callback(archiveError('Log archive exceeds the portable ZIP limit', 413, 'CXV_LOG_ARCHIVE_TOO_LARGE'));
        return;
      }
      callback(null, chunk);
    },
  });
}

/** Creates a stable, upload-compatible V2 session ZIP on disk and returns its read stream. */
export async function createV2SessionZip(logDir, file, {
  tempRoot = tmpdir(),
  maxBytes = LOG_ARCHIVE_LIMITS.compressedBytes,
} = {}) {
  const { sessionDir } = resolveV2SessionFile(logDir, file);
  const rootName = basename(sessionDir);
  if (!isCanonicalSessionRoot(rootName)) throw archiveError('Invalid V2 session directory', 422);
  const stagingDir = mkdtempSync(join(tempRoot, 'cxv-log-export-'));
  const snapshotDir = join(stagingDir, rootName);
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    rmSync(stagingDir, { recursive: true, force: true });
  };

  try {
    // Copy only while the append lock is held; compression and network I/O happen lock-free.
    const snapshotBytes = { total: 0 };
    withFileLockSync(
      join(sessionDir, '.append.lock'),
      () => copyStableTree(sessionDir, snapshotDir, snapshotBytes, LOG_ARCHIVE_LIMITS.totalExpandedBytes),
    );
    const report = inspectSessionArchive(snapshotDir);
    if (!report.ok) {
      throw archiveError(`Session snapshot is invalid: ${report.errors.join('; ')}`, 422, 'CXV_LOG_ARCHIVE_CORRUPT');
    }
    const zip = new JSZip();
    zip.folder(rootName);
    addSnapshotTree(zip, rootName, snapshotDir);
    const generated = zip.generateNodeStream({
      type: 'nodebuffer',
      streamFiles: true,
      compression: 'DEFLATE',
      compressionOptions: { level: 1 },
    });
    const zipPath = join(stagingDir, `${rootName}.zip`);
    const counters = { total: 0 };
    await pipeline(
      generated,
      outputLimitTransform(counters, maxBytes),
      createWriteStream(zipPath, { flags: 'wx', mode: 0o600 }),
    );
    return {
      stream: createReadStream(zipPath),
      dispose,
      fileName: `${rootName}.zip`,
      rootName,
      size: counters.total,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

function findEocd(data) {
  if (data.length < 22) throw archiveError('ZIP central directory is missing');
  const start = Math.max(0, data.length - 65_557);
  for (let offset = data.length - 22; offset >= start; offset--) {
    if (data.readUInt32LE(offset) === ZIP_EOCD_SIGNATURE) return offset;
  }
  throw archiveError('ZIP central directory is missing');
}

/** Reads central-directory names before JSZip sanitizes them, including duplicates. */
function readCentralDirectory(data) {
  const eocd = findEocd(data);
  const count = data.readUInt16LE(eocd + 10);
  const size = data.readUInt32LE(eocd + 12);
  const start = data.readUInt32LE(eocd + 16);
  if (count === 0xffff || size === 0xffffffff || start === 0xffffffff) {
    throw archiveError('ZIP64 log archives are not supported');
  }
  if (start + size > eocd || count > LOG_ARCHIVE_LIMITS.entries) {
    throw archiveError('Invalid ZIP central directory');
  }
  const entries = [];
  let offset = start;
  for (let index = 0; index < count; index++) {
    if (offset + 46 > data.length || data.readUInt32LE(offset) !== ZIP_CENTRAL_SIGNATURE) {
      throw archiveError('Invalid ZIP central directory entry');
    }
    const flags = data.readUInt16LE(offset + 8);
    const compressedSize = data.readUInt32LE(offset + 20);
    const uncompressedSize = data.readUInt32LE(offset + 24);
    const nameLength = data.readUInt16LE(offset + 28);
    const extraLength = data.readUInt16LE(offset + 30);
    const commentLength = data.readUInt16LE(offset + 32);
    const versionMadeBy = data.readUInt16LE(offset + 4);
    const externalAttributes = data.readUInt32LE(offset + 38);
    const end = offset + 46 + nameLength + extraLength + commentLength;
    if (end > data.length) throw archiveError('Truncated ZIP central directory');
    const name = data.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    entries.push({ name, flags, compressedSize, uncompressedSize, versionMadeBy, externalAttributes });
    offset = end;
  }
  if (offset !== start + size) throw archiveError('ZIP central directory size mismatch');
  return entries;
}

function validateRawPath(name, limits) {
  if (!name || name.includes('\0') || name.includes('\\') || name.startsWith('/')
      || /^[A-Za-z]:/.test(name) || name.startsWith('//') || !/^[A-Za-z0-9._~/-]+$/.test(name)) {
    throw archiveError(`Unsafe ZIP path: ${name || '<empty>'}`);
  }
  if (Buffer.byteLength(name) > limits.pathBytes) throw archiveError('ZIP path is too long', 413, 'CXV_LOG_ARCHIVE_TOO_LARGE');
  const trimmed = name.endsWith('/') ? name.slice(0, -1) : name;
  const parts = trimmed.split('/');
  if (!trimmed || parts.length > limits.pathDepth || parts.some(part => !part || part === '.' || part === '..')) {
    throw archiveError(`Unsafe ZIP path: ${name}`);
  }
  return parts;
}

function isIgnoredMetadata(parts) {
  return parts.some(part => part === '__MACOSX' || part === '.DS_Store' || part.startsWith('._'));
}

function assertRegularCentralEntry(entry, isDirectory) {
  const platform = entry.versionMadeBy >>> 8;
  if (platform !== 3) return;
  const mode = entry.externalAttributes >>> 16;
  const type = mode & 0o170000;
  if (type !== 0 && type !== (isDirectory ? 0o040000 : 0o100000)) {
    throw archiveError(`ZIP contains a non-regular entry: ${entry.name}`, 400, 'CXV_LOG_ARCHIVE_UNSAFE_FILE');
  }
}

function auditZipEntries(centralEntries, zip, limits) {
  if (centralEntries.length === 0 || centralEntries.length > limits.entries) {
    throw archiveError('ZIP has an invalid number of entries', 413, 'CXV_LOG_ARCHIVE_TOO_LARGE');
  }
  const exact = new Set();
  const folded = new Map();
  const kinds = new Map();
  const accepted = [];
  let totalExpanded = 0;
  let acceptedCompressed = 0;
  let sessionRoot = null;

  for (const central of centralEntries) {
    const parts = validateRawPath(central.name, limits);
    const isDirectory = central.name.endsWith('/');
    assertRegularCentralEntry(central, isDirectory);
    const normalized = central.name.normalize('NFC');
    const comparable = (isDirectory ? normalized.slice(0, -1) : normalized).toLocaleLowerCase('en-US');
    if (exact.has(normalized)) throw archiveError(`Duplicate ZIP path: ${central.name}`);
    exact.add(normalized);
    const previousFolded = folded.get(comparable);
    if (previousFolded && previousFolded !== normalized) throw archiveError(`Colliding ZIP paths: ${previousFolded} and ${central.name}`);
    folded.set(comparable, normalized);
    const previousKind = kinds.get(comparable);
    if (previousKind && previousKind !== (isDirectory ? 'dir' : 'file')) throw archiveError(`File/directory ZIP collision: ${central.name}`);
    kinds.set(comparable, isDirectory ? 'dir' : 'file');
    const ancestors = comparable.split('/');
    for (let i = 1; i < ancestors.length; i++) {
      if (kinds.get(ancestors.slice(0, i).join('/')) === 'file') throw archiveError(`ZIP path descends through a file: ${central.name}`);
    }
    if (isIgnoredMetadata(parts)) continue;
    if (!isCanonicalSessionRoot(parts[0])) throw archiveError('ZIP must contain exactly one canonical .cxvsession root directory');
    if (sessionRoot && sessionRoot !== parts[0]) throw archiveError('ZIP contains multiple session roots');
    sessionRoot = parts[0];
    if (central.uncompressedSize > limits.singleExpandedBytes) throw archiveError('A ZIP entry is too large', 413, 'CXV_LOG_ARCHIVE_TOO_LARGE');
    if (!isDirectory && central.uncompressedSize > 0
        && (central.compressedSize === 0 || central.uncompressedSize > central.compressedSize * limits.expansionRatio)) {
      throw archiveError('A ZIP entry has an unsafe expansion ratio', 413, 'CXV_LOG_ARCHIVE_TOO_LARGE');
    }
    totalExpanded += central.uncompressedSize;
    acceptedCompressed += central.compressedSize;
    if (totalExpanded > limits.totalExpandedBytes
        || (acceptedCompressed > 0 && totalExpanded > acceptedCompressed * limits.expansionRatio)) {
      throw archiveError('Expanded ZIP is too large', 413, 'CXV_LOG_ARCHIVE_TOO_LARGE');
    }
    const object = zip.file(central.name);
    if (!isDirectory && !object) throw archiveError(`ZIP entry is unavailable: ${central.name}`);
    accepted.push({ central, object, parts, isDirectory, normalized: central.name.normalize('NFC') });
  }
  if (!sessionRoot) throw archiveError('ZIP does not contain a session archive');
  const required = new Set([`${sessionRoot}/manifest.json`, `${sessionRoot}/timeline.jsonl`]);
  for (const item of accepted) required.delete(item.normalized);
  if (required.size) throw archiveError(`ZIP is missing ${[...required].map(value => value.split('/').pop()).join(' and ')}`);
  return { accepted, sessionRoot, acceptedCompressed };
}

function limitTransform(entryName, counters, limits) {
  let entryBytes = 0;
  return new Transform({
    transform(chunk, _encoding, callback) {
      entryBytes += chunk.length;
      counters.total += chunk.length;
      if (entryBytes > limits.singleExpandedBytes || counters.total > limits.totalExpandedBytes
          || counters.total > counters.compressedBytes * limits.expansionRatio) {
        callback(archiveError(`Expanded ZIP limit exceeded at ${entryName}`, 413, 'CXV_LOG_ARCHIVE_TOO_LARGE'));
        return;
      }
      callback(null, chunk);
    },
  });
}

/** Safely extracts and validates one portable V2 session ZIP without installing it. */
async function extractV2SessionZip(data, {
  filename = 'log.zip',
  tempRoot = tmpdir(),
  limits = LOG_ARCHIVE_LIMITS,
} = {}) {
  if (!Buffer.isBuffer(data)) data = Buffer.from(data || []);
  if (!filename.toLowerCase().endsWith('.zip')) throw archiveError('Only .zip log archives are supported');
  if (data.length === 0 || data.length > limits.compressedBytes) throw archiveError('Log archive is too large', 413, 'CXV_LOG_ARCHIVE_TOO_LARGE');
  if (data.length < 4 || data[0] !== 0x50 || data[1] !== 0x4b || !ZIP_SIGNATURES.has(data.readUInt16LE(2))) {
    throw archiveError('File is not a ZIP archive');
  }

  const centralEntries = readCentralDirectory(data);
  let zip;
  try {
    zip = await JSZip.loadAsync(data, { createFolders: true });
  } catch (error) {
    throw archiveError(`Invalid ZIP archive: ${error.message}`);
  }
  const { accepted, sessionRoot, acceptedCompressed } = auditZipEntries(centralEntries, zip, limits);
  const stagingDir = mkdtempSync(join(tempRoot, 'cxv-log-import-'));
  const sessionDir = join(stagingDir, sessionRoot);
  const counters = { total: 0, compressedBytes: acceptedCompressed };
  try {
    for (const item of accepted) {
      const target = resolve(stagingDir, item.normalized);
      if (!isContained(stagingDir, target)) throw archiveError(`Unsafe ZIP target: ${item.central.name}`);
      if (item.isDirectory) {
        mkdirSync(target, { recursive: true });
        continue;
      }
      mkdirSync(resolve(target, '..'), { recursive: true });
      await pipeline(
        item.object.nodeStream('nodebuffer'),
        limitTransform(item.central.name, counters, limits),
        createWriteStream(target, { flags: 'wx', mode: 0o600 }),
      );
    }

    const manifest = JSON.parse(await readFile(join(sessionDir, 'manifest.json'), 'utf8'));
    const validation = validateSessionManifest(manifest);
    if (!validation.ok) throw archiveError(`Invalid session manifest: ${validation.errors.join('; ')}`, 422, 'CXV_LOG_ARCHIVE_CORRUPT');
    if (sessionArchiveDirectoryName({
      sessionId: manifest.sessionId,
      createdAt: manifest.createdAt,
    }) !== sessionRoot) {
      throw archiveError('Session directory does not match manifest identity', 422, 'CXV_LOG_ARCHIVE_CORRUPT');
    }
    const report = inspectSessionArchive(sessionDir);
    if (!report.ok) throw archiveError(`Invalid session archive: ${report.errors.join('; ')}`, 422, 'CXV_LOG_ARCHIVE_CORRUPT');
    let disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      rmSync(stagingDir, { recursive: true, force: true });
    };
    return Object.freeze({ sessionDir, stagingDir, manifest: Object.freeze(manifest), report, dispose });
  } catch (error) {
    rmSync(stagingDir, { recursive: true, force: true });
    if (error?.status) throw error;
    throw archiveError(`Invalid session archive: ${error.message}`, 422, 'CXV_LOG_ARCHIVE_CORRUPT');
  }
}

function checkedMaterializedBytes(entries, limits) {
  let materializedBytes = 0;
  for (const entry of entries) {
    materializedBytes += Buffer.byteLength(JSON.stringify(entry));
    if (materializedBytes > limits.materializedBytes) {
      throw archiveError('Parsed log is too large', 413, 'CXV_LOG_ARCHIVE_TOO_LARGE');
    }
  }
  return materializedBytes;
}

/** Safely extracts and materializes a portable V2 session ZIP without installing it. */
export async function parseV2SessionZip(data, options = {}) {
  const limits = options.limits || LOG_ARCHIVE_LIMITS;
  const extracted = await extractV2SessionZip(data, { ...options, limits });
  try {
    const entries = readV2SessionEntries(extracted.sessionDir, { dedupe: true, strict: true });
    checkedMaterializedBytes(entries, limits);
    return Object.freeze({ entries, manifest: extracted.manifest, report: extracted.report });
  } catch (error) {
    if (error?.status) throw error;
    throw archiveError(`Invalid session archive: ${error.message}`, 422, 'CXV_LOG_ARCHIVE_CORRUPT');
  } finally {
    extracted.dispose();
  }
}

function winningTimelineSequences(sessionDir) {
  const winners = new Map();
  let expectedSeq = 1;
  const timeline = scanJsonlSync(join(sessionDir, 'timeline.jsonl'), ({ value }) => {
    if (value.seq !== expectedSeq++) throw new Error(`timeline sequence gap at ${expectedSeq - 1}`);
    if (winners.has(value.entryKey)) winners.delete(value.entryKey);
    winners.set(value.entryKey, value.seq);
  });
  if (timeline.error) throw timeline.error.cause;
  return new Set(winners.values());
}

function writeAllSync(fd, buffer) {
  let offset = 0;
  while (offset < buffer.length) offset += writeSync(fd, buffer, offset, buffer.length - offset);
}

function writeMaterializedEntryStream(sessionDir, outputPath, limits) {
  const selectedSeqs = winningTimelineSequences(sessionDir);
  const delimiter = Buffer.from('\n---\n');
  let bytes = 0;
  let count = 0;
  let fd = null;
  try {
    fd = openSync(outputPath, 'wx', 0o600);
    scanMaterializedSessionArchive(sessionDir, (entry) => {
      const raw = Buffer.from(JSON.stringify(entry));
      const nextBytes = bytes + raw.length + delimiter.length;
      if (nextBytes > limits.materializedBytes) {
        throw archiveError('Parsed log is too large', 413, 'CXV_LOG_ARCHIVE_TOO_LARGE');
      }
      writeAllSync(fd, raw);
      writeAllSync(fd, delimiter);
      bytes = nextBytes;
      count++;
    }, {
      strict: true,
      includeRecord: (record) => selectedSeqs.has(record.seq),
    });
    closeSync(fd);
    fd = null;
    return { bytes, count };
  } catch (error) {
    if (fd !== null) closeSync(fd);
    if (existsSync(outputPath)) unlinkSync(outputPath);
    throw error;
  }
}

/**
 * Validates an uploaded ZIP and materializes its winning entries into a bounded
 * temporary response file. The caller must dispose the result after streaming.
 */
export async function createV2SessionEntryStream(data, options = {}) {
  const limits = options.limits || LOG_ARCHIVE_LIMITS;
  const extracted = await extractV2SessionZip(data, { ...options, limits });
  try {
    const outputPath = join(extracted.stagingDir, 'materialized.entries');
    const result = writeMaterializedEntryStream(extracted.sessionDir, outputPath, limits);
    const stream = createReadStream(outputPath);
    let disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      stream.destroy();
      extracted.dispose();
    };
    return Object.freeze({
      stream,
      dispose,
      size: result.bytes,
      count: result.count,
      manifest: extracted.manifest,
      report: extracted.report,
    });
  } catch (error) {
    extracted.dispose();
    if (error?.status) throw error;
    throw archiveError(`Invalid session archive: ${error.message}`, 422, 'CXV_LOG_ARCHIVE_CORRUPT');
  }
}
