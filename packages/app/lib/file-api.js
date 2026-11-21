/**
 * File API business logic — extracted from server.js
 * Provides path validation, file read/write with security checks.
 */
import { resolve, relative, sep, isAbsolute, dirname } from 'node:path';
import { constants, mkdirSync, closeSync, fstatSync, ftruncateSync, openSync, realpathSync, existsSync, statSync, readSync, writeFileSync, renameSync } from 'node:fs';
import { getUtf16Encoding, isBinaryBuffer } from './binary-sniff.js';
import { canonicalPath } from './canonical-path.js';
import { assertPublicFilePath } from './credential-file-policy.js';

/**
 * Check whether targetPath is contained within the project root directory.
 * Resolves symlinks via realpathSync. Returns false on any error.
 * @param {string} targetPath - absolute path to check
 * @param {string} [root] - project root (defaults to CXV_PROJECT_DIR or cwd)
 * @returns {boolean}
 */
export function isPathContained(targetPath, root) {
  try {
    const resolvedRoot = realpathSync(resolve(root || process.env.CXV_PROJECT_DIR || process.cwd()));
    const real = realpathSync(resolve(targetPath));
    return real === resolvedRoot || real.startsWith(resolvedRoot + sep);
  } catch { return false; }
}

/** Custom error with a code property for HTTP status mapping */
class FileApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Resolve and validate a file path. Used by readFileContent and file-raw handler.
 * @param {string} cwd - project working directory
 * @param {string} reqPath - requested path (relative or absolute)
 * @param {boolean} isEditorSession - whether this is an editor session
 * @returns {string} resolved absolute file path
 * @throws {FileApiError} with code 'INVALID_PATH'
 */
export function resolveFilePath(cwd, reqPath, isEditorSession) {
  if (typeof reqPath !== 'string' || !reqPath) {
    throw new FileApiError('INVALID_PATH', 'Invalid path');
  }
  const target = resolve(cwd, reqPath);
  if (isEditorSession === true) return assertPublicFilePath(target);
  try {
    const canonical = canonicalPath(target);
    const root = realpathSync(resolve(cwd));
    const rel = relative(root, canonical);
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error('Path escapes project');
    return assertPublicFilePath(canonical);
  } catch (error) {
    if (error.code === 'ACCESS_DENIED') throw error;
    throw new FileApiError('INVALID_PATH', 'Invalid path');
  }
}

/**
 * Read file content with size limit and security checks.
 * @param {string} cwd - project working directory
 * @param {string} reqPath - requested path
 * @param {boolean} isEditorSession
 * @returns {{ path: string, content: string, size: number }}
 */
export function readFileContent(cwd, reqPath, isEditorSession, assertAccess) {
  const targetFile = resolveFilePath(cwd, reqPath, isEditorSession);
  assertAccess?.(targetFile);
  const displayPath = isEditorSession !== true && (isAbsolute(reqPath) || reqPath.includes('..'))
    ? relative(realpathSync(resolve(cwd)), targetFile)
    : reqPath;
  return _readAndReturn(targetFile, displayPath, assertAccess);
}

// Positioned reads preserve the write descriptor's offset until validation passes.
function readEditorBytes(fd, size) {
  const raw = Buffer.alloc(size);
  let offset = 0;
  while (offset < size) {
    const count = readSync(fd, raw, offset, size - offset, offset);
    if (!count) break;
    offset += count;
  }
  return raw.subarray(0, offset);
}

function _readAndReturn(targetFile, displayPath, assertAccess) {
  if (!existsSync(targetFile)) {
    throw new FileApiError('NOT_FOUND', `File not found: ${targetFile}`);
  }
  if (!statSync(targetFile).isFile()) throw new FileApiError('NOT_FILE', 'Not a file');
  const fd = openSync(targetFile, constants.O_RDONLY | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0));
  try {
    const stat = fstatSync(fd);
    assertPublicFilePath(targetFile, stat);
    assertAccess?.(targetFile, stat);
    if (!stat.isFile()) throw new FileApiError('NOT_FILE', 'Not a file');
    if (stat.size > 5 * 1024 * 1024) throw new FileApiError('TOO_LARGE', 'File too large');
    const raw = readEditorBytes(fd, stat.size);
    if (isBinaryBuffer(raw)) throw Object.assign(new FileApiError('BINARY', 'Binary file'), { reason: 'binary', size: stat.size });
    const encoding = getUtf16Encoding(raw);
    const content = encoding === 'utf16le' ? raw.subarray(2).toString('utf16le')
      : encoding === 'utf16be' ? raw.subarray(2).swap16().toString('utf16le')
      : raw.toString('utf-8');
    return { path: displayPath, content, size: stat.size, ...(encoding ? { encoding, readOnly: true } : {}) };
  } finally { closeSync(fd); }
}

/**
 * Write file content.
 * @param {string} cwd - project working directory
 * @param {string} reqPath - requested path
 * @param {string} content - file content to write
 * @param {boolean} isEditorSession
 * @returns {{ path: string, size: number }}
 */
export function writeFileContent(cwd, reqPath, content, isEditorSession, assertAccess, createParents = false) {
  if (typeof reqPath !== 'string' || !reqPath) {
    throw new FileApiError('INVALID_PATH', 'Invalid path');
  }
  if (isEditorSession !== true && (isAbsolute(reqPath) || reqPath.includes('..'))) {
    throw new FileApiError('INVALID_PATH', 'Invalid path');
  }
  if (typeof content !== 'string') {
    throw new FileApiError('INVALID_CONTENT', 'Content must be a string');
  }
  const targetFile = resolveFilePath(cwd, reqPath, isEditorSession);
  assertAccess?.(targetFile);
  if (createParents) mkdirSync(dirname(targetFile), { recursive: true });
  // Validate the descriptor before truncating, so a raced-in key/backup inode
  // cannot be damaged even if the pathname looked public before open().
  const fd = openSync(targetFile, constants.O_RDWR | constants.O_CREAT | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0), 0o666);
  try {
    const stat = fstatSync(fd);
    assertPublicFilePath(targetFile, stat);
    assertAccess?.(targetFile, stat);
    if (!stat.isFile()) throw new FileApiError('NOT_FILE', 'Not a file');
    // A direct/stale editor POST must not transcode a binary or UTF-16 file.
    // Inspect the same validated descriptor before truncation, within the read cap.
    if (stat.size > 5 * 1024 * 1024) throw new FileApiError('TOO_LARGE', 'File too large');
    const raw = readEditorBytes(fd, stat.size);
    if (isBinaryBuffer(raw)) throw Object.assign(new FileApiError('BINARY', 'Binary file'), { reason: 'binary', size: stat.size });
    if (getUtf16Encoding(raw)) throw new FileApiError('READ_ONLY_ENCODING', 'File encoding is read-only');
    ftruncateSync(fd, 0);
    writeFileSync(fd, content, 'utf-8');
    return { path: reqPath, size: fstatSync(fd).size };
  } finally { closeSync(fd); }
}

/** Atomic replace helper with a short retry for Windows file-lock races. */
export function renameSyncWithRetry(src, dst, opts = {}) {
  const retries = opts.retries ?? 3;
  const delayMs = opts.delayMs ?? 20;
  const retryable = new Set(['EACCES', 'EPERM', 'EBUSY']);
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      renameSync(src, dst);
      return;
    } catch (error) {
      lastError = error;
      if (attempt === retries - 1 || !retryable.has(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
    }
  }
  throw lastError;
}

/** Map FileApiError codes to HTTP status codes */
export const ERROR_STATUS_MAP = {
  ACCESS_DENIED: 403,
  BINARY: 415,
  READ_ONLY_ENCODING: 415,
  INVALID_PATH: 400,
  NOT_FOUND: 404,
  NOT_FILE: 400,
  TOO_LARGE: 413,
  INVALID_CONTENT: 400,
};
