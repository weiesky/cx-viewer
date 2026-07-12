import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
} from 'node:fs';
import { execFile } from 'node:child_process';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { getCodexConfigDir } from './codex-config.js';

export const MEMORY_FILE_MAX_BYTES = 2 * 1024 * 1024;
const MEMORY_PATH_MAX_LENGTH = 1024;
const ROOT_FILES = new Set(['MEMORY.md', 'memory_summary.md']);
// These are the generated, navigable trees used by Codex memories. Keep
// raw_memories.md out of the viewer: it is an internal mechanical merge and can
// contain substantially more sensitive/noisy source material than MEMORY.md.
const ALLOWED_TREES = new Set(['rollout_summaries', 'skills']);

export class CodexMemoryError extends Error {
  constructor(code, status = 500) {
    super(code);
    this.name = 'CodexMemoryError';
    this.code = code;
    this.status = status;
  }
}

export function getCodexMemoryDir(env = process.env) {
  return join(getCodexConfigDir(env), 'memories');
}

/**
 * Validate an already URL-decoded, root-relative memory Markdown path.
 * Browser-side link resolution may consume ./ and ../ relative to the current
 * document; the server accepts only the canonical result and never decodes it
 * a second time.
 */
export function normalizeCodexMemoryPath(input) {
  if (typeof input !== 'string' || input.length === 0 || input.length > MEMORY_PATH_MAX_LENGTH) {
    throw new CodexMemoryError('invalid_path', 400);
  }
  if (input.includes('\0') || input.includes('\\') || isAbsolute(input) || input.startsWith('/')) {
    throw new CodexMemoryError('invalid_path', 400);
  }
  const parts = input.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || part.startsWith('.'))) {
    throw new CodexMemoryError('invalid_path', 400);
  }
  if (!/\.md$/i.test(parts[parts.length - 1])) {
    throw new CodexMemoryError('invalid_path', 400);
  }
  if (parts.length === 1) {
    if (!ROOT_FILES.has(parts[0])) throw new CodexMemoryError('invalid_path', 400);
  } else if (!ALLOWED_TREES.has(parts[0])) {
    throw new CodexMemoryError('invalid_path', 400);
  }
  return parts.join('/');
}

function assertContained(root, target) {
  const rel = relative(root, target);
  if (rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))) return;
  throw new CodexMemoryError('invalid_path', 400);
}

/**
 * Read a generated memory Markdown file. The configured memories root itself
 * may intentionally be a symlink (the user controls CODEX_HOME), but generated
 * descendants may not use symlinks.
 */
export function readCodexMemoryFile(file, { env = process.env, maxBytes = MEMORY_FILE_MAX_BYTES } = {}) {
  const normalized = normalizeCodexMemoryPath(file);
  const memoryDir = getCodexMemoryDir(env);
  if (!existsSync(memoryDir)) throw new CodexMemoryError('memory_dir_missing', 404);

  let root;
  try {
    root = realpathSync(memoryDir);
  } catch {
    throw new CodexMemoryError('memory_dir_unreadable', 500);
  }
  const target = resolve(root, ...normalized.split('/'));
  assertContained(root, target);

  // Reject every symlink component before resolving the final target. O_NOFOLLOW
  // below closes the final-file swap window; an attacker controlling this local
  // account can still race an intermediate directory, but already has direct
  // access to the same Codex home.
  let cursor = root;
  try {
    const pathParts = normalized.split('/');
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      cursor = join(cursor, part);
      const stat = lstatSync(cursor);
      if (stat.isSymbolicLink()) throw new CodexMemoryError('invalid_path', 400);
      if (i === pathParts.length - 1 && !stat.isFile()) throw new CodexMemoryError('invalid_path', 400);
    }
  } catch (err) {
    if (err instanceof CodexMemoryError) throw err;
    if (err?.code === 'ENOENT') throw new CodexMemoryError('memory_file_not_found', 404);
    throw new CodexMemoryError('memory_file_unreadable', 500);
  }

  let canonicalTarget;
  try {
    canonicalTarget = realpathSync(target);
    assertContained(root, canonicalTarget);
  } catch (err) {
    if (err instanceof CodexMemoryError) throw err;
    if (err?.code === 'ENOENT') throw new CodexMemoryError('memory_file_not_found', 404);
    throw new CodexMemoryError('memory_file_unreadable', 500);
  }

  let fd;
  try {
    const noFollow = fsConstants.O_NOFOLLOW || 0;
    fd = openSync(canonicalTarget, fsConstants.O_RDONLY | noFollow | (fsConstants.O_NONBLOCK || 0));
    const stat = fstatSync(fd);
    if (!stat.isFile()) throw new CodexMemoryError('invalid_path', 400);
    if (stat.size > maxBytes) throw new CodexMemoryError('memory_file_too_large', 413);

    // Allocate the hard cap rather than stat.size+1 so growth after fstat cannot
    // be silently returned as truncated content.
    const buffer = Buffer.alloc(maxBytes + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const n = readSync(fd, buffer, offset, buffer.length - offset, null);
      if (n === 0) break;
      offset += n;
    }
    if (offset > maxBytes) throw new CodexMemoryError('memory_file_too_large', 413);
    return { file: normalized, content: buffer.subarray(0, offset).toString('utf8') };
  } catch (err) {
    if (err instanceof CodexMemoryError) throw err;
    if (err?.code === 'ELOOP') throw new CodexMemoryError('invalid_path', 400);
    throw new CodexMemoryError('memory_file_unreadable', 500);
  } finally {
    if (fd !== undefined) {
      try { closeSync(fd); } catch {}
    }
  }
}

export function parseMemoriesFeatureList(output) {
  const lines = String(output || '').split(/\r?\n/);
  for (const line of lines) {
    const columns = line.trim().split(/\s+/);
    if (columns[0] !== 'memories') continue;
    const enabledIndex = columns.findLastIndex(value => value === 'true' || value === 'false');
    const stage = columns.slice(1, enabledIndex >= 0 ? enabledIndex : columns.length).join(' ') || null;
    if (enabledIndex < 0) return { supported: true, enabled: null, stage };
    return { supported: true, enabled: columns[enabledIndex] === 'true', stage };
  }
  return { supported: false, enabled: false, stage: null };
}

export function filterMemoryFeatureArgs(args) {
  const filtered = [];
  const input = Array.isArray(args) ? args : [];
  for (let i = 0; i < input.length; i++) {
    const arg = String(input[i]);
    if (arg === '--profile' || arg === '-p') {
      if (i + 1 < input.length) filtered.push(arg, String(input[++i]));
      continue;
    }
    if (arg === '--enable' || arg === '--disable') {
      if (String(input[i + 1] || '') === 'memories') filtered.push(arg, String(input[++i]));
      continue;
    }
    if (/^--(?:enable|disable)=memories$/.test(arg)) {
      filtered.push(arg);
      continue;
    }
    if (arg === '-c' || arg === '--config') {
      const value = String(input[i + 1] || '');
      if (/^(?:features\.memories|memories\.)\s*=/.test(value)) filtered.push(arg, value);
      if (i + 1 < input.length) i++;
    }
  }
  return filtered;
}

function runCodexFeatures({ cwd, env, executable, timeoutMs, featureArgs }) {
  return new Promise((resolvePromise, rejectPromise) => {
    const isNodeEntry = /\.m?js$/i.test(executable);
    const command = isNodeEntry ? process.execPath : executable;
    const args = [
      ...(isNodeEntry ? [executable] : []),
      ...filterMemoryFeatureArgs(featureArgs),
      'features', 'list',
    ];
    execFile(
      command,
      args,
      { cwd, env, timeout: timeoutMs, maxBuffer: 256 * 1024, shell: false },
      (error, stdout) => error ? rejectPromise(error) : resolvePromise(stdout),
    );
  });
}

export async function detectCodexMemoriesCapability({
  cwd = process.cwd(),
  env = process.env,
  executable = process.env.CXV_CODEX_BIN || 'codex',
  featureArgs = [],
  timeoutMs = 3000,
  runner = runCodexFeatures,
} = {}) {
  try {
    return { ...parseMemoriesFeatureList(await runner({ cwd, env, executable, timeoutMs, featureArgs })), error: null };
  } catch {
    return { supported: null, enabled: null, stage: null, error: 'feature_detection_failed' };
  }
}

export async function readCodexMemoryOverview(options = {}) {
  const env = options.env || process.env;
  const capability = await detectCodexMemoriesCapability(options);
  const directoryExists = existsSync(getCodexMemoryDir(env));
  let entry = null;
  for (const candidate of ['MEMORY.md', 'memory_summary.md']) {
    try {
      entry = readCodexMemoryFile(candidate, { env, maxBytes: options.maxBytes });
      break;
    } catch (err) {
      if (!(err instanceof CodexMemoryError) || !['memory_dir_missing', 'memory_file_not_found'].includes(err.code)) {
        return { schemaVersion: 1, status: 'error', directoryExists, ...capability, error: err.code || 'memory_file_unreadable' };
      }
    }
  }

  if (entry) {
    return { schemaVersion: 1, status: 'ready', directoryExists, ...capability, ...entry, error: capability.error };
  }
  if (capability.supported === false) {
    return { schemaVersion: 1, status: 'unsupported', directoryExists, ...capability };
  }
  if (capability.enabled === false) {
    return { schemaVersion: 1, status: 'disabled', directoryExists, ...capability };
  }
  if (capability.error) {
    return { schemaVersion: 1, status: 'error', directoryExists, ...capability };
  }
  return { schemaVersion: 1, status: 'missing', directoryExists, ...capability };
}

function parseHost(host) {
  try { return new URL(`http://${host}`).hostname.replace(/^\[|\]$/g, '').toLowerCase(); }
  catch { return ''; }
}

/** Protect global cross-project memories from browser DNS-rebinding/CORS reads. */
export function isCodexMemoryRequestAllowed({ host, origin, token, expectedToken, localIps = [] }) {
  if (expectedToken && token === expectedToken) return true;
  const hostname = parseHost(host);
  const allowedHosts = new Set(['localhost', '127.0.0.1', '::1', '::ffff:127.0.0.1', ...localIps]);
  if (!allowedHosts.has(hostname)) return false;
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    if (originUrl.protocol !== 'http:' && originUrl.protocol !== 'https:') return false;
    return originUrl.host.toLowerCase() === String(host || '').toLowerCase();
  } catch {
    return false;
  }
}
