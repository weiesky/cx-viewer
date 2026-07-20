import crypto from 'node:crypto';
import { isOpenAiResponsesMasterEntry } from '../openai-responses-url.js';

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === 'string' && value.trim() !== '')?.trim() ?? null;
}

function requiredId(value, name) {
  const id = firstNonEmpty(value);
  if (!id) throw new TypeError(`${name} is required`);
  return id;
}

// A session file adds a 9-byte UTC date prefix and the 11-byte `.cxvsession`
// suffix. 230 keeps the complete filename at 250 bytes, below the portable
// 255-byte filesystem component limit while allowing more escaped Unicode.
export const MAX_LOG_STORAGE_SEGMENT_BYTES = 230;
const SAFE_STORAGE_BYTE = /^[a-z0-9._-]$/;
const WINDOWS_RESERVED_SEGMENT = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const RESERVED_PROJECT_ARCHIVE_NAMES = new Set([
  'v2',
  'runtime',
  'plugins',
  '.log-v2-layout-migration.active',
  '.log-v2-layout-migration.staging',
  '.log-v2-layout-migration.receipt.json',
]);

function escapeStorageByte(byte) {
  return `~${byte.toString(16).padStart(2, '0')}`;
}

/**
 * Encodes an external identity as one canonical, cross-platform path segment.
 * Lowercase portable ASCII remains readable; every other UTF-8 byte is escaped.
 * This is intentionally reversible and collision-free rather than a slug/hash.
 */
export function encodeLogStorageSegment(value, name = 'storage identity') {
  if (typeof value !== 'string' || value.length === 0 || value.trim() === '') {
    throw new TypeError(`${name} is required`);
  }
  const identity = value;
  if (Buffer.from(identity, 'utf8').toString('utf8') !== identity) {
    throw new TypeError(`${name} contains invalid Unicode`);
  }
  let encoded = '';
  for (const byte of Buffer.from(identity, 'utf8')) {
    const char = String.fromCharCode(byte);
    encoded += SAFE_STORAGE_BYTE.test(char) ? char : escapeStorageByte(byte);
  }
  if (encoded === '.' || encoded === '..' || WINDOWS_RESERVED_SEGMENT.test(encoded)) {
    const first = encoded.charCodeAt(0);
    encoded = `${escapeStorageByte(first)}${encoded.slice(1)}`;
  }
  while (encoded.endsWith('.')) encoded = `${encoded.slice(0, -1)}${escapeStorageByte(0x2e)}`;
  const bytes = Buffer.byteLength(encoded);
  if (bytes === 0 || bytes > MAX_LOG_STORAGE_SEGMENT_BYTES) {
    throw new TypeError(`${name} exceeds the ${MAX_LOG_STORAGE_SEGMENT_BYTES}-byte storage name limit`);
  }
  return encoded;
}

/** Decodes and canonicality-checks a segment produced by encodeLogStorageSegment. */
export function decodeLogStorageSegment(segment, name = 'storage identity') {
  if (typeof segment !== 'string' || !segment) throw new TypeError(`${name} storage segment is required`);
  const bytes = [];
  for (let index = 0; index < segment.length;) {
    const char = segment[index];
    if (SAFE_STORAGE_BYTE.test(char)) {
      bytes.push(char.charCodeAt(0));
      index++;
      continue;
    }
    const escape = segment.slice(index, index + 3);
    if (!/^~[0-9a-f]{2}$/.test(escape)) throw new TypeError(`invalid ${name} storage segment`);
    bytes.push(Number.parseInt(escape.slice(1), 16));
    index += 3;
  }
  const value = Buffer.from(bytes).toString('utf8');
  if (encodeLogStorageSegment(value, name) !== segment) {
    throw new TypeError(`non-canonical ${name} storage segment`);
  }
  return value;
}

export function projectArchiveDirectoryName(projectId) {
  const name = encodeLogStorageSegment(projectId, 'projectId');
  if (RESERVED_PROJECT_ARCHIVE_NAMES.has(name)
      || name.startsWith('.log-v2-layout-migration.')
      || name.startsWith('projects.layout-v1-backup-')) {
    throw new TypeError(`projectId maps to reserved log layout name: ${name}`);
  }
  return name;
}

/**
 * Resolves the authoritative identity carried by Codex App Server threads.
 * A root thread has threadId === sessionId; child agents retain the sessionId
 * and use parentThreadId to form the thread tree.
 */
export function resolveAppServerThreadIdentity(thread) {
  if (!thread || typeof thread !== 'object') {
    throw new TypeError('thread must be an object');
  }

  const threadId = requiredId(firstNonEmpty(thread.id, thread.threadId, thread.thread_id), 'thread.id');
  const sessionId = requiredId(firstNonEmpty(thread.sessionId, thread.session_id), 'thread.sessionId');
  const parentThreadId = firstNonEmpty(thread.parentThreadId, thread.parent_thread_id);
  const isRoot = threadId === sessionId;

  return Object.freeze({
    source: 'app-server',
    sessionId,
    rootThreadId: sessionId,
    threadId,
    parentThreadId,
    isRoot,
    agentRole: isRoot ? 'main' : 'subagent',
  });
}

function entryMetadata(entry) {
  const candidates = [
    entry?.body?.metadata,
    entry?.request?.body?.metadata,
    entry?.metadata,
  ];
  return candidates.find((value) => value && typeof value === 'object' && !Array.isArray(value)) || {};
}

function entryClientMetadata(entry) {
  const candidates = [
    entry?.body?.client_metadata,
    entry?.body?.clientMetadata,
    entry?.request?.body?.client_metadata,
    entry?.request?.body?.clientMetadata,
  ];
  return candidates.find((value) => value && typeof value === 'object' && !Array.isArray(value)) || {};
}

/**
 * Resolves SDK, proxy, OTel, and sessionless App Server global identities. A
 * caller-scoped synthetic session is required when the source protocol exposes
 * no authoritative session id.
 */
export function resolveIngestionSourceIdentity(entry, context = {}, options = {}) {
  if (!entry || typeof entry !== 'object') throw new TypeError('entry must be an object');
  const source = firstNonEmpty(context.source, options.source);
  if (!['sdk', 'proxy', 'otel', 'app-server-global'].includes(source)) {
    throw new TypeError(`unsupported V2 ingestion source: ${source}`);
  }
  const metadata = entryMetadata(entry);
  const clientMetadata = entryClientMetadata(entry);
  const headers = entry.headers && typeof entry.headers === 'object' && !Array.isArray(entry.headers)
    ? entry.headers
    : {};
  const explicitThreadId = firstNonEmpty(
    context.threadId,
    entry.threadId,
    entry.thread_id,
    entry._agentThreadId,
    entry.body?._threadId,
    metadata.threadId,
    metadata.thread_id,
    clientMetadata.threadId,
    clientMetadata.thread_id,
    headers['thread-id'],
  );
  const explicitSessionId = firstNonEmpty(
    context.sessionId,
    entry.sessionId,
    entry.session_id,
    entry._otelSessionId,
    metadata.sessionId,
    metadata.session_id,
    clientMetadata.sessionId,
    clientMetadata.session_id,
    headers['session-id'],
    source === 'sdk' ? explicitThreadId : null,
  );
  const sessionId = requiredId(firstNonEmpty(explicitSessionId, options.fallbackSessionId), 'sessionId');
  const threadId = requiredId(firstNonEmpty(
    source === 'otel' ? firstNonEmpty(context.threadId, entry._otelTraceId) : null,
    explicitThreadId,
    options.fallbackThreadId,
    sessionId,
  ), 'threadId');
  const parentThreadId = firstNonEmpty(
    context.parentThreadId,
    entry.parentThreadId,
    entry.parent_thread_id,
    entry._parentThreadId,
    metadata.parentThreadId,
    metadata.parent_thread_id,
    clientMetadata.parentThreadId,
    clientMetadata.parent_thread_id,
    clientMetadata['x-codex-parent-thread-id'],
    headers['x-codex-parent-thread-id'],
  );
  const isMaster = isOpenAiResponsesMasterEntry(entry);
  const role = isMaster
    ? 'auxiliary'
    : (entry.mainAgent === true
      ? 'main'
      : (entry.subAgent || entry.teammate ? 'subagent' : source === 'otel' ? 'telemetry' : 'auxiliary'));
  return Object.freeze({
    source,
    sessionId,
    rootThreadId: sessionId,
    threadId,
    parentThreadId,
    isRoot: threadId === sessionId,
    agentRole: role,
    synthetic: !explicitSessionId,
  });
}

export function hashStorageId(value, prefix = '') {
  const id = requiredId(value, 'storage identity');
  const digest = crypto.createHash('sha256').update(id).digest('hex');
  return `${prefix}${digest}`;
}

function asDate(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError('createdAt must be a valid date');
  return date;
}

export function sessionArchiveRelativePath({ sessionId, createdAt = new Date() }) {
  const date = asDate(createdAt);
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const token = encodeLogStorageSegment(sessionId, 'sessionId');
  return `${year}${month}${day}_${token}.cxvsession`;
}

export function sessionArchiveDirectoryName(options) {
  return sessionArchiveRelativePath(options);
}

export function threadStoreToken(threadId) {
  return hashStorageId(threadId, 't_');
}
