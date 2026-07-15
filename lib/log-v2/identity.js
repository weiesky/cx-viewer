import crypto from 'node:crypto';

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === 'string' && value.trim() !== '')?.trim() ?? null;
}

function requiredId(value, name) {
  const id = firstNonEmpty(value);
  if (!id) throw new TypeError(`${name} is required`);
  return id;
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

/**
 * Transitional identity resolver for sources that do not expose Thread.
 * It never guesses across projects. The caller must provide a scoped fallback
 * if neither the entry nor its metadata contains session identity.
 */
export function resolveLegacyEntryIdentity(entry, options = {}) {
  if (!entry || typeof entry !== 'object') {
    throw new TypeError('entry must be an object');
  }

  const metadata = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};
  const sessionId = requiredId(
    firstNonEmpty(
      entry.sessionId,
      entry.session_id,
      metadata.sessionId,
      metadata.session_id,
      options.fallbackSessionId,
    ),
    'sessionId',
  );
  const threadId = requiredId(
    firstNonEmpty(
      entry.threadId,
      entry.thread_id,
      metadata.threadId,
      metadata.thread_id,
      options.fallbackThreadId,
      sessionId,
    ),
    'threadId',
  );
  const parentThreadId = firstNonEmpty(
    entry.parentThreadId,
    entry.parent_thread_id,
    metadata.parentThreadId,
    metadata.parent_thread_id,
  );

  return Object.freeze({
    source: 'legacy-adapter',
    sessionId,
    rootThreadId: sessionId,
    threadId,
    parentThreadId,
    isRoot: threadId === sessionId,
    agentRole: threadId === sessionId ? 'main' : 'subagent',
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
  const role = entry.mainAgent === true
    ? 'main'
    : (entry.subAgent || entry.teammate ? 'subagent' : source === 'otel' ? 'telemetry' : 'auxiliary');
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
  const token = hashStorageId(sessionId, 's_');
  return `sessions/${year}/${month}/${day}/${token}.cxvsession`;
}

export function threadStoreToken(threadId) {
  return hashStorageId(threadId, 't_');
}
