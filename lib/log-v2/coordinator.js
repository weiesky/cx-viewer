import crypto from 'node:crypto';
import { basename } from 'node:path';
import { mkdirSync, statfsSync } from 'node:fs';

import { resolveAppServerThreadIdentity, resolveIngestionSourceIdentity } from './identity.js';
import { LogV2Writer } from './writer.js';

function normalizeStartReason(thread, context) {
  const value = context.sessionStartSource
    ?? thread.sessionStartSource
    ?? thread.session_start_source
    ?? null;
  if (value === 'clear' || value === 'fork' || value === 'resume') return value;
  return 'startup';
}

export class LogV2WriteCoordinator {
  constructor({
    rootDir,
    writerFactory = (options) => LogV2Writer.open(options),
    debug = false,
    minFreeBytes = 512 * 1024 * 1024,
    minFreePercent = 5,
    failureLimit = 3,
    maxActiveWriters = 8,
    capacityProbe = null,
    onDegraded = (message) => console.warn(`[CX Viewer] ${message}`),
    runtimeId = crypto.randomUUID(),
    durability = 'buffered',
  }) {
    if (typeof rootDir !== 'string' || !rootDir) throw new TypeError('rootDir is required');
    mkdirSync(rootDir, { recursive: true });
    this.rootDir = rootDir;
    this.writerFactory = writerFactory;
    this.debug = debug;
    this.minFreeBytes = minFreeBytes;
    this.minFreePercent = minFreePercent;
    this.failureLimit = failureLimit;
    this.maxActiveWriters = maxActiveWriters;
    this.capacityProbe = capacityProbe || (() => {
      const stats = statfsSync(this.rootDir);
      const freeBytes = Number(stats.bavail) * Number(stats.bsize);
      const totalBytes = Number(stats.blocks) * Number(stats.bsize);
      return { freeBytes, totalBytes, freePercent: totalBytes > 0 ? (freeBytes / totalBytes) * 100 : 0 };
    });
    this.onDegraded = onDegraded;
    this.runtimeId = runtimeId;
    if (!['buffered', 'durable'].includes(durability)) throw new TypeError('durability must be buffered or durable');
    this.durability = durability;
    this.degradedNotified = false;
    this.writers = new Map();
    this.latestSessionByProject = new Map();
    this.latestConversationSourceByProject = new Map();
    this.consecutiveFailures = 0;
    this.circuitOpen = false;
    this.stats = {
      attempted: 0,
      written: 0,
      failed: 0,
      skipped: 0,
      evictedWriters: 0,
      lastError: null,
      // `lastError` describes the current/recoverable state and is cleared by
      // a successful write. Keep the most recent failure separately so an
      // operator can still diagnose a recovered write failure.
      lastFailure: null,
      lastLocator: null,
      lastConversationLocator: null,
      lastCapacity: null,
      sources: {},
    };
  }

  sourceIdentity(entry, context, projectKey) {
    const source = context.source || 'proxy';
    if (source === 'app-server') {
      const nativeThreadId = context.thread?.id
        || context.thread?.threadId
        || context.thread?.thread_id
        || null;
      const nativeSessionId = context.thread?.sessionId
        || context.thread?.session_id
        || null;
      const threadId = nativeThreadId
        || entry?._agentThreadId
        || entry?.body?.metadata?.thread_id
        || entry?.body?._threadId
        || null;
      // Thread-scoped App Server records must retain the authoritative native
      // session identity. Startup warnings and other server-global events have
      // no thread at all; keep those in a process/project scoped auxiliary
      // session instead of dropping the V2 write.
      if (nativeThreadId && nativeSessionId) return resolveAppServerThreadIdentity(context.thread);
      const isSessionlessGlobalAuxiliary = typeof entry?.url === 'string'
        && entry.url.startsWith('codex://warning/');
      if (threadId && !isSessionlessGlobalAuxiliary) {
        return resolveAppServerThreadIdentity(context.thread);
      }
      const projectScope = crypto.createHash('sha256').update(projectKey).digest('hex').slice(0, 24);
      const globalSessionId = `synthetic:app-server-global:${this.runtimeId}:${projectScope}`;
      return resolveIngestionSourceIdentity(entry, {
        ...context,
        source: 'app-server-global',
      }, {
        source: 'app-server-global',
        fallbackSessionId: globalSessionId,
        fallbackThreadId: globalSessionId,
      });
    }
    const projectScope = crypto.createHash('sha256').update(projectKey).digest('hex').slice(0, 24);
    const syntheticSessionId = `synthetic:${source}:${this.runtimeId}:${projectScope}`;
    return resolveIngestionSourceIdentity(entry, context, {
      source,
      fallbackSessionId: syntheticSessionId,
      fallbackThreadId: source === 'otel' && entry?._otelTraceId ? entry._otelTraceId : syntheticSessionId,
    });
  }

  assertWritable() {
    if (this.circuitOpen) {
      this.stats.skipped++;
      const error = new Error('V2 circuit is open until CX Viewer restarts');
      error.code = 'CXV_LOG_V2_CIRCUIT_OPEN';
      throw error;
    }
    const capacity = this.capacityProbe();
    this.stats.lastCapacity = capacity;
    if (capacity.freeBytes < this.minFreeBytes || capacity.freePercent < this.minFreePercent) {
      this.circuitOpen = true;
      const error = new Error(
        `V2 stopped at disk watermark (${capacity.freeBytes} bytes, ${capacity.freePercent.toFixed(2)}% free)`,
      );
      error.code = 'CXV_LOG_V2_DISK_WATERMARK';
      this.notifyDegraded(error.message);
      throw error;
    }
  }

  notifyDegraded(message) {
    if (this.degradedNotified) return;
    this.degradedNotified = true;
    if (typeof this.onDegraded === 'function') {
      this.onDegraded(`${message}; V2 logging is unavailable until capacity is restored and CX Viewer restarts`);
    }
  }

  rememberWriter(key, writer) {
    this.writers.set(key, writer);
    while (this.writers.size > this.maxActiveWriters) {
      const oldest = this.writers.keys().next().value;
      this.writers.delete(oldest);
      this.stats.evictedWriters++;
    }
  }

  writeEntry(entry, context = {}) {
    this.stats.attempted++;
    try {
      this.assertWritable();
      const canonicalCwd = context.cwd;
      if (typeof canonicalCwd !== 'string' || !canonicalCwd) throw new TypeError('V2 context.cwd is required');
      const projectId = context.projectId || entry?.project || basename(canonicalCwd) || 'codex';
      const projectKey = `${projectId}\u0000${canonicalCwd}`;
      const identity = this.sourceIdentity(entry, context, projectKey);
      const writerKey = `${projectKey}\u0000${identity.sessionId}`;
      let writer = this.writers.get(writerKey);
      if (writer) {
        this.writers.delete(writerKey);
        this.writers.set(writerKey, writer);
      }
      if (!writer) {
        const startReason = identity.source === 'app-server' ? normalizeStartReason(context.thread, context) : 'startup';
        const previousSessionId = identity.source === 'app-server'
          ? (context.thread.previousSessionId
            ?? context.thread.previous_session_id
            ?? this.latestSessionByProject.get(projectKey)
            ?? null)
          : null;
        writer = this.writerFactory({
          rootDir: this.rootDir,
          projectId,
          canonicalCwd,
          sessionId: identity.sessionId,
          rootThreadId: identity.rootThreadId,
          createdAt: entry.timestamp || new Date().toISOString(),
          startReason,
          source: identity.source,
          previousSessionId,
          replacesSessionId: startReason === 'clear' ? previousSessionId : null,
          durability: this.durability,
        });
        this.rememberWriter(writerKey, writer);
      }

      const result = writer.append(entry, identity);
      let latestPointerError = null;
      const isConversationRoot = identity.isRoot === true && identity.agentRole === 'main';
      const previousConversationSource = this.latestConversationSourceByProject.get(projectKey) || null;
      // Native app-server sessions are the authoritative conversation lane.
      // Before one is observed, proxy/SDK roots may provide the conversation;
      // afterwards their mirrored traffic must not steal the restart pointer.
      const mayPromoteConversation = isConversationRoot
        && (identity.source === 'app-server' || previousConversationSource !== 'app-server');
      let conversationSelected = false;
      if (mayPromoteConversation) {
        try {
          const pointer = writer.markProjectLatest({ source: identity.source });
          conversationSelected = pointer.selected === true;
          if (conversationSelected) {
            this.latestSessionByProject.set(projectKey, identity.sessionId);
            this.latestConversationSourceByProject.set(projectKey, identity.source);
          }
        } catch (error) {
          // The canonical timeline commit already succeeded. Treat the project
          // pointer as repairable metadata and retry it on the next write.
          latestPointerError = error;
        }
      }
      this.stats.written++;
      this.stats.sources[identity.source] = (this.stats.sources[identity.source] || 0) + 1;
      this.consecutiveFailures = 0;
      this.stats.lastError = null;
      this.stats.lastLocator = {
        sessionId: identity.sessionId,
        threadId: identity.threadId,
        seq: result.seq,
        entryKey: result.entryKey,
      };
      if (mayPromoteConversation && conversationSelected) {
        this.latestConversationSourceByProject.set(projectKey, identity.source);
        this.stats.lastConversationLocator = { ...this.stats.lastLocator, source: identity.source };
      }
      return Object.freeze({
        ...result,
        accepted: true,
        durable: this.durability === 'durable',
        ...(latestPointerError ? {
          latestPointerDegraded: true,
          latestPointerError: latestPointerError.message,
        } : {}),
      });
    } catch (error) {
      this.stats.lastError = error.message;
      this.stats.lastFailure = Object.freeze({
        at: new Date().toISOString(),
        attempt: this.stats.attempted,
        code: typeof error?.code === 'string' ? error.code : null,
        message: error?.message || String(error),
        source: context?.source || 'proxy',
      });
      if (error?.code !== 'CXV_LOG_V2_CIRCUIT_OPEN') {
        this.stats.failed++;
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.failureLimit) {
          this.circuitOpen = true;
          this.notifyDegraded(`V2 circuit opened after ${this.consecutiveFailures} consecutive failures`);
        }
      }
      if (this.debug) console.warn('[CX Viewer] V2 write failed:', error.message);
      throw error;
    }
  }


  writeAppServerEntry(entry, context = {}) {
    return this.writeEntry(entry, { ...context, source: 'app-server' });
  }

  snapshot() {
    return Object.freeze({
      ...this.stats,
      sources: Object.freeze({ ...this.stats.sources }),
      activeWriters: this.writers.size,
      consecutiveFailures: this.consecutiveFailures,
      circuitOpen: this.circuitOpen,
      lastLocator: this.stats.lastLocator ? Object.freeze({ ...this.stats.lastLocator }) : null,
      lastFailure: this.stats.lastFailure ? Object.freeze({ ...this.stats.lastFailure }) : null,
    });
  }
}
