import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { Worker } from 'node:worker_threads';

import { assembleEntryParts, applyInputOperations } from './entry-codec.js';
import { setLatestMapValue } from '../log-entry-order.js';
import {
  projectArchiveDirectoryName,
  sessionArchiveDirectoryName,
  threadStoreToken,
} from './identity.js';
import {
  validateImportReceipt,
  validateProjectManifest,
  validateSessionManifest,
  validateTimelineRecord,
} from './schema.js';
import { readContentObjectSync, readJsonReferenceSync, scanJsonlSync } from './storage.js';
import {
  directoryLogicalBytes,
  readSessionSummary,
  rebuildSessionSummary,
  summaryPreview,
} from './session-summary.js';

const PROJECT_DIR_PATTERN = /^[a-z0-9._~-]+$/;
const THREAD_TOKEN_PATTERN = /^t_[a-f0-9]{64}$/;
const SESSION_DIR_PATTERN = /^\d{8}_[a-z0-9._~-]+\.cxvsession$/;

function readJson(filePath) {
  const stat = lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`unsafe V2 JSON file: ${filePath}`);
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function readCommittedImportReceipt(sessionDir, manifest) {
  if (manifest.source !== 'legacy-import') return null;
  const receiptPath = join(sessionDir, 'import.json');
  if (!existsSync(receiptPath)) throw new Error('legacy import is incomplete: import.json is missing');
  const receipt = readJson(receiptPath);
  const validation = validateImportReceipt(receipt);
  if (!validation.ok) throw new Error(`invalid legacy import receipt: ${validation.errors.join('; ')}`);
  if (receipt.projectId !== manifest.projectId || receipt.sessionId !== manifest.sessionId) {
    throw new Error('legacy import receipt identity does not match session manifest');
  }
  return receipt;
}

function contained(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep));
}

function listDirectories(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
    .map((entry) => join(root, entry.name));
}

function threadRecordPath(sessionDir, ref, fileName) {
  if (!THREAD_TOKEN_PATTERN.test(ref?.thread || '')) throw new TypeError('invalid V2 thread reference');
  return join(sessionDir, 'threads', ref.thread, fileName);
}

function readThreadRecord(sessionDir, ref, fileName) {
  return readJsonReferenceSync(threadRecordPath(sessionDir, ref, fileName), ref, { rootDir: sessionDir });
}

function applyPartRevision(previous, record, sessionDir) {
  const next = new Map(previous);
  for (const part of record.delete || []) next.delete(part);
  for (const [part, ref] of Object.entries(record.set || {})) {
    // Validate every newly committed object, but retain only its compact ref in
    // revision state. Keeping decoded response bodies for every unique entry
    // made even filtered/paged reads grow with the whole session.
    readContentObjectSync(sessionDir, ref);
    next.set(part, ref);
  }
  return next;
}

function readEntryParts(sessionDir, refs) {
  return new Map([...refs].map(([part, ref]) => [part, readContentObjectSync(sessionDir, ref)]));
}

function materializeTimelineRecord(sessionDir, timelineRecord, states, { assemble = true } = {}) {
  const validation = validateTimelineRecord(timelineRecord);
  if (!validation.ok) throw new Error(validation.errors.join('; '));
  if (timelineRecord.seq !== states.nextSeq) throw new Error(`timeline sequence gap at ${states.nextSeq}`);
  const expectedThreadToken = threadStoreToken(timelineRecord.threadId);
  if (timelineRecord.entryRef.thread !== expectedThreadToken) {
    throw new Error(`entry thread reference mismatch at timeline sequence ${timelineRecord.seq}`);
  }

  const entryRecord = readThreadRecord(sessionDir, timelineRecord.entryRef, 'entries.jsonl');
  if (entryRecord.kind !== 'cx-viewer.entry-revision'
      || entryRecord.version !== 1
      || entryRecord.txnId !== timelineRecord.txnId
      || entryRecord.entryKey !== timelineRecord.entryKey
      || entryRecord.revision !== timelineRecord.entryRevision) {
    throw new Error(`entry revision mismatch at timeline sequence ${timelineRecord.seq}`);
  }
  const entryStateKey = `${expectedThreadToken}\u0000${entryRecord.entryKey}`;
  const previousEntry = states.entries.get(entryStateKey) || { revision: 0, parts: new Map() };
  if (entryRecord.baseRevision !== previousEntry.revision || entryRecord.revision !== previousEntry.revision + 1) {
    throw new Error(`entry revision chain mismatch at timeline sequence ${timelineRecord.seq}`);
  }
  const nextEntry = {
    revision: entryRecord.revision,
    parts: applyPartRevision(previousEntry.parts, entryRecord, sessionDir),
  };

  const previousThread = states.threads.get(expectedThreadToken) || {
    inputRevision: 0,
    inputRefs: [],
    inputPath: null,
  };
  let nextThread = previousThread;
  const binding = entryRecord.inputBinding;
  if (binding?.ref) {
    if (binding.ref.thread !== expectedThreadToken) {
      throw new Error(`input thread reference mismatch at timeline sequence ${timelineRecord.seq}`);
    }
    const inputRecord = readThreadRecord(sessionDir, binding.ref, 'input.jsonl');
    if (inputRecord.kind !== 'cx-viewer.input-revision'
        || inputRecord.version !== 1
        || inputRecord.txnId !== timelineRecord.txnId
        || inputRecord.baseRevision !== previousThread.inputRevision
        || inputRecord.revision !== previousThread.inputRevision + 1
        || binding.revision !== inputRecord.revision
        || binding.path !== inputRecord.path) {
      throw new Error(`input revision mismatch at timeline sequence ${timelineRecord.seq}`);
    }
      nextThread = {
        inputRevision: inputRecord.revision,
        inputRefs: applyInputOperations(previousThread.inputRefs, inputRecord),
        inputPath: inputRecord.path,
      };
      // Previous refs were validated when first introduced. Validating only the
      // append delta preserves committed-corruption detection without rereading
      // the cumulative input prefix on every timeline record.
      for (const ref of inputRecord.append) readContentObjectSync(sessionDir, ref);
  } else if (binding && (binding.revision !== previousThread.inputRevision || binding.path !== previousThread.inputPath)) {
    throw new Error(`input binding mismatch at timeline sequence ${timelineRecord.seq}`);
  }
  if ((binding?.revision ?? 0) !== timelineRecord.inputRevision) {
    throw new Error(`timeline input revision mismatch at sequence ${timelineRecord.seq}`);
  }

  let entry = null;
  if (assemble) {
    const input = binding
      ? {
          path: binding.path,
          items: nextThread.inputRefs.map((ref) => readContentObjectSync(sessionDir, ref)),
        }
      : null;
    entry = assembleEntryParts(readEntryParts(sessionDir, nextEntry.parts), input);
  }
  states.entries.set(entryStateKey, nextEntry);
  if (binding) states.threads.set(expectedThreadToken, nextThread);
  states.nextSeq++;
  return entry;
}

/**
 * Reconstructs every committed V2 timeline revision into the safe full-entry view.
 * An incomplete final JSONL line is ignored and reported; corruption in a committed
 * record or one of its references throws unless `strict:false` is requested.
 */
export function materializeSessionArchive(sessionDir, { strict = true, allowIncompleteImport = false } = {}) {
  const entries = [];
  const records = [];
  const report = scanMaterializedSessionArchive(sessionDir, (entry, record) => {
    entries.push(entry);
    records.push(record);
  }, { strict, allowIncompleteImport });
  return Object.freeze({
    ...report,
    entries: Object.freeze(entries),
    records: Object.freeze(records),
  });
}

/**
 * Materializes a committed archive one entry at a time. State is limited to
 * current thread/entry revisions, allowing migration verification without
 * retaining an entire multi-gigabyte history in memory.
 */
export function scanMaterializedSessionArchive(sessionDir, onEntry, {
  strict = true,
  allowIncompleteImport = false,
  includeRecord = null,
} = {}) {
  if (typeof onEntry !== 'function') throw new TypeError('onEntry callback is required');
  const resolvedSessionDir = resolve(sessionDir);
  const manifest = readJson(join(resolvedSessionDir, 'manifest.json'));
  const manifestValidation = validateSessionManifest(manifest);
  if (!manifestValidation.ok) throw new Error(`invalid V2 session manifest: ${manifestValidation.errors.join('; ')}`);
  const importReceipt = allowIncompleteImport ? null : readCommittedImportReceipt(resolvedSessionDir, manifest);

  let committedEvents = 0;
  const states = { nextSeq: 1, entries: new Map(), threads: new Map() };
  const timeline = scanJsonlSync(join(resolvedSessionDir, 'timeline.jsonl'), ({ value }) => {
    const included = includeRecord ? !!includeRecord(value) : true;
    const entry = materializeTimelineRecord(resolvedSessionDir, value, states, { assemble: included });
    if (included) onEntry(entry, value);
    committedEvents++;
  });
  const incompleteTail = timeline.error?.cause?.message === 'incomplete JSONL tail';
  if (timeline.error && !incompleteTail && strict) {
    const error = new Error(`invalid V2 timeline at byte ${timeline.error.offset}: ${timeline.error.cause.message}`);
    error.code = 'CXV_LOG_V2_CORRUPT';
    error.offset = timeline.error.offset;
    throw error;
  }
  if (importReceipt && committedEvents !== importReceipt.entryCount) {
    throw new Error(`legacy import receipt entry count mismatch (${importReceipt.entryCount} receipt vs ${committedEvents} timeline)`);
  }
  return Object.freeze({
    manifest: Object.freeze(manifest),
    committedEvents,
    validTimelineBytes: timeline.validBytes,
    timelineBytes: timeline.fileSize,
    ignoredTailBytes: timeline.fileSize - timeline.validBytes,
    error: timeline.error ? timeline.error.cause.message : null,
  });
}

function sessionTimestamp(createdAt) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '00000000_000000';
  return date.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
}

/**
 * Builds log-picker metadata. User prompts and folder bytes come from the
 * derived session summary; the canonical timeline remains the source for event
 * and turn counts. Missing or stale summaries are rebuilt once and then reused.
 */
export function summarizeV2SessionArchive(sessionDir) {
  const resolvedSessionDir = resolve(sessionDir);
  const manifest = readJson(join(resolvedSessionDir, 'manifest.json'));
  const manifestValidation = validateSessionManifest(manifest);
  if (!manifestValidation.ok) throw new Error(`invalid V2 session manifest: ${manifestValidation.errors.join('; ')}`);
  const importReceipt = readCommittedImportReceipt(resolvedSessionDir, manifest);
  const timelinePath = join(resolvedSessionDir, 'timeline.jsonl');
  const timelineFileBytes = existsSync(timelinePath) ? statSync(timelinePath).size : 0;

  // Normal hot path: the summary watermark covers the complete stable
  // timeline, so counts, prompts, and folder bytes are already materialized.
  // Any tail, missing file, or invalid cache falls through to canonical scan +
  // rebuild below.
  try {
    const cached = readSessionSummary(resolvedSessionDir, {
      manifest,
      timelineBytes: timelineFileBytes,
    });
    if (cached) {
      if (importReceipt && cached.committedEvents !== importReceipt.entryCount) {
        throw new Error(`legacy import receipt entry count mismatch (${importReceipt.entryCount} receipt vs ${cached.committedEvents} summary)`);
      }
      return Object.freeze({
        manifest: Object.freeze(manifest),
        committedEvents: cached.committedEvents,
        turns: cached.turns,
        previews: Object.freeze(summaryPreview(cached)),
        archiveBytes: cached.archiveBytes,
        validTimelineBytes: timelineFileBytes,
        timelineBytes: timelineFileBytes,
        ignoredTailBytes: 0,
        error: null,
        incompleteTail: false,
      });
    }
  } catch {
    // Derived metadata is disposable. The slow path distinguishes canonical
    // corruption from a cache that can simply be rebuilt.
  }

  const turnIds = new Set();
  let nextSeq = 1;
  let committedEvents = 0;

  const timeline = scanJsonlSync(timelinePath, ({ value: timelineRecord }) => {
    const validation = validateTimelineRecord(timelineRecord);
    if (!validation.ok) throw new Error(validation.errors.join('; '));
    if (timelineRecord.seq !== nextSeq) throw new Error(`timeline sequence gap at ${nextSeq}`);
    nextSeq++;
    committedEvents++;
    if (timelineRecord.turnId) turnIds.add(timelineRecord.turnId);
  });

  const incompleteTail = timeline.error?.cause?.message === 'incomplete JSONL tail';
  if (importReceipt && committedEvents !== importReceipt.entryCount) {
    throw new Error(`legacy import receipt entry count mismatch (${importReceipt.entryCount} receipt vs ${committedEvents} timeline)`);
  }
  let summary = null;
  let summaryError = null;
  try {
    summary = readSessionSummary(resolvedSessionDir, {
      manifest,
      timelineBytes: timeline.validBytes,
    });
  } catch (error) {
    summaryError = error.message;
  }
  if (!summary) {
    try {
      summary = rebuildSessionSummary(resolvedSessionDir, { durable: true, lock: true });
      summaryError = null;
    } catch (error) {
      summaryError = error.message;
    }
  }
  let archiveBytes = summary?.archiveBytes ?? timeline.fileSize;
  if (!summary || incompleteTail) {
    try { archiveBytes = directoryLogicalBytes(resolvedSessionDir); } catch {}
  }
  const summaryAdvanced = !!summary && summary.indexedTimelineBytes !== timeline.validBytes;
  return Object.freeze({
    manifest: Object.freeze(manifest),
    committedEvents: summaryAdvanced ? summary.committedEvents : committedEvents,
    turns: summaryAdvanced ? summary.turns : turnIds.size,
    previews: Object.freeze(summaryPreview(summary)),
    archiveBytes,
    validTimelineBytes: summaryAdvanced ? summary.indexedTimelineBytes : timeline.validBytes,
    timelineBytes: summaryAdvanced ? summary.indexedTimelineBytes : timeline.fileSize,
    ignoredTailBytes: summaryAdvanced ? 0 : timeline.fileSize - timeline.validBytes,
    error: summaryError || (timeline.error ? timeline.error.cause.message : null),
    incompleteTail: summaryAdvanced ? false : incompleteTail,
  });
}

function listSessionDirs(projectDir) {
  return listDirectories(projectDir)
    .filter((candidate) => basename(candidate).endsWith('.cxvsession'));
}

function listProjectDirs(logDir) {
  return listDirectories(logDir).filter((projectDir) => existsSync(join(projectDir, 'project.json')));
}

function readValidatedProject(projectDir) {
  const project = readJson(join(projectDir, 'project.json'));
  const validation = validateProjectManifest(project);
  if (!validation.ok) throw new Error(validation.errors.join('; '));
  const expected = projectArchiveDirectoryName(project.projectId);
  if (!PROJECT_DIR_PATTERN.test(basename(projectDir)) || basename(projectDir) !== expected) {
    throw new Error('project directory name does not match manifest identity');
  }
  return project;
}

function readValidatedSession(project, sessionDir) {
  const manifest = readJson(join(sessionDir, 'manifest.json'));
  const validation = validateSessionManifest(manifest);
  if (!validation.ok) throw new Error(validation.errors.join('; '));
  if (manifest.projectId !== project.projectId) throw new Error('session project identity mismatch');
  const expected = sessionArchiveDirectoryName({
    sessionId: manifest.sessionId,
    createdAt: manifest.createdAt,
  });
  if (!SESSION_DIR_PATTERN.test(basename(sessionDir)) || basename(sessionDir) !== expected) {
    throw new Error('session directory name does not match manifest identity');
  }
  readCommittedImportReceipt(sessionDir, manifest);
  return manifest;
}

/** Discovers every structurally valid V2 archive and reports invalid manifests separately. */
export function discoverV2SessionArchives(logDir, { projectId = null } = {}) {
  const archives = [];
  const errors = [];
  for (const projectDir of listProjectDirs(logDir)) {
    let project;
    try {
      project = readValidatedProject(projectDir);
    } catch (error) {
      errors.push({ scope: 'project', path: relative(logDir, projectDir), error: error.message });
      continue;
    }
    if (projectId && project.projectId !== projectId) continue;
    for (const sessionDir of listSessionDirs(projectDir)) {
      try {
        const manifest = readValidatedSession(project, sessionDir);
        archives.push(Object.freeze({
          project: Object.freeze(project),
          manifest: Object.freeze(manifest),
          projectDir,
          sessionDir,
          file: relative(logDir, join(sessionDir, 'timeline.jsonl')).split(sep).join('/'),
        }));
      } catch (error) {
        errors.push({ scope: 'session', path: relative(logDir, sessionDir), error: error.message });
      }
    }
  }
  archives.sort((a, b) => a.manifest.createdAt.localeCompare(b.manifest.createdAt));
  return Object.freeze({ archives: Object.freeze(archives), errors: Object.freeze(errors) });
}

/** Lists validated V2 sessions in the shape consumed by the existing log picker. */
export function listV2LocalLogs(logDir, currentProjectName = '') {
  const grouped = {};
  for (const projectDir of listProjectDirs(logDir)) {
    try {
      const project = readValidatedProject(projectDir);
      for (const sessionDir of listSessionDirs(projectDir)) {
        try {
          readValidatedSession(project, sessionDir);
          const summary = summarizeV2SessionArchive(sessionDir);
          if (summary.committedEvents === 0) continue;
          const timelinePath = join(sessionDir, 'timeline.jsonl');
          if (!grouped[project.projectId]) grouped[project.projectId] = [];
          grouped[project.projectId].push({
            file: relative(logDir, timelinePath).split(sep).join('/'),
            timestamp: sessionTimestamp(summary.manifest.createdAt),
            size: summary.archiveBytes,
            turns: summary.turns,
            preview: summary.previews,
            sessionId: summary.manifest.sessionId,
            logStore: 'v2',
            degraded: !!summary.error,
          });
        } catch {}
      }
    } catch {}
  }
  for (const logs of Object.values(grouped)) logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return { ...grouped, _currentProject: currentProjectName || '' };
}

/** Resolves a user-facing V2 timeline locator to its validated session archive. */
export function resolveV2SessionFile(logDir, file) {
  const parts = typeof file === 'string' ? file.split('/') : [];
  if (parts.length !== 3 || parts[2] !== 'timeline.jsonl'
      || !PROJECT_DIR_PATTERN.test(parts[0]) || !SESSION_DIR_PATTERN.test(parts[1])) {
    throw new TypeError('invalid V2 session file');
  }
  const root = resolve(logDir);
  const requestedTimelinePath = resolve(logDir, file);
  const requestedSessionDir = dirname(requestedTimelinePath);
  const requestedProjectDir = dirname(requestedSessionDir);
  if (!contained(root, requestedTimelinePath)
      || dirname(requestedProjectDir) !== root
      || !SESSION_DIR_PATTERN.test(basename(requestedSessionDir))) {
    const error = new Error('Access denied');
    error.code = 'ACCESS_DENIED';
    throw error;
  }
  if (!existsSync(requestedTimelinePath)
      || !existsSync(join(requestedSessionDir, 'manifest.json'))
      || !existsSync(join(requestedProjectDir, 'project.json'))) {
    const error = new Error('V2 session not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (lstatSync(requestedProjectDir).isSymbolicLink()
      || lstatSync(requestedSessionDir).isSymbolicLink()
      || lstatSync(requestedTimelinePath).isSymbolicLink()) {
    const error = new Error('Access denied');
    error.code = 'ACCESS_DENIED';
    throw error;
  }
  const realRoot = realpathSync(root);
  const timelinePath = realpathSync(requestedTimelinePath);
  const sessionDir = realpathSync(requestedSessionDir);
  const projectDir = realpathSync(requestedProjectDir);
  if (!contained(realRoot, timelinePath) || !contained(realRoot, sessionDir)
      || !contained(realRoot, projectDir) || dirname(projectDir) !== realRoot
      || dirname(sessionDir) !== projectDir || dirname(timelinePath) !== sessionDir
      || !SESSION_DIR_PATTERN.test(basename(sessionDir))) {
    const error = new Error('Access denied');
    error.code = 'ACCESS_DENIED';
    throw error;
  }
  const project = readValidatedProject(projectDir);
  readValidatedSession(project, sessionDir);
  return { sessionDir, timelinePath };
}

export function isV2SessionFile(file) {
  if (typeof file !== 'string') return false;
  const parts = file.split('/');
  return parts.length === 3 && parts[2] === 'timeline.jsonl'
    && PROJECT_DIR_PATTERN.test(parts[0]) && SESSION_DIR_PATTERN.test(parts[1]);
}

export function dedupeMaterializedEntries(entries) {
  const dedup = new Map();
  let anonymous = 0;
  for (const entry of entries) {
    const key = entry?.timestamp && entry?.url ? `${entry.timestamp}|${entry.url}` : `__nokey_${anonymous++}`;
    setLatestMapValue(dedup, key, entry);
  }
  return [...dedup.values()];
}

function selectWinningTimelineRecords(sessionDir, { strict = true } = {}) {
  const winners = new Map();
  let expectedSeq = 1;
  const timeline = scanJsonlSync(join(sessionDir, 'timeline.jsonl'), ({ value }) => {
    const validation = validateTimelineRecord(value);
    if (!validation.ok) throw new Error(validation.errors.join('; '));
    if (value.seq !== expectedSeq) throw new Error(`timeline sequence gap at ${expectedSeq}`);
    expectedSeq++;
    // entryKey is the persisted hash of timestamp|url. Moving a replacement to
    // the Map tail preserves the same last-physical-record ordering as the V1
    // compatibility deduper without reconstructing the entry body.
    setLatestMapValue(winners, value.entryKey, Object.freeze({
      seq: value.seq,
      timestamp: value.timestamp,
      entryKey: value.entryKey,
    }));
  });
  const incompleteTail = timeline.error?.cause?.message === 'incomplete JSONL tail';
  if (timeline.error && !incompleteTail && strict) {
    const error = new Error(`invalid V2 timeline at byte ${timeline.error.offset}: ${timeline.error.cause.message}`);
    error.code = 'CXV_LOG_V2_CORRUPT';
    error.offset = timeline.error.offset;
    throw error;
  }
  return Object.freeze({
    winners: Object.freeze([...winners.values()]),
    timeline,
  });
}

export function countV2LogEntries(logDir, file, { strict = true } = {}) {
  const { sessionDir } = resolveV2SessionFile(logDir, file);
  return selectWinningTimelineRecords(sessionDir, { strict }).winners.length;
}

export function readV2LogEntries(logDir, file, { dedupe = true, strict = true } = {}) {
  const { sessionDir } = resolveV2SessionFile(logDir, file);
  return readV2SessionEntries(sessionDir, { dedupe, strict });
}

/** Reads the final user-visible entries from an already validated session directory. */
export function readV2SessionEntries(sessionDir, { dedupe = true, strict = true } = {}) {
  if (dedupe) {
    const selected = selectWinningTimelineRecords(sessionDir, { strict }).winners;
    const selectedSeqs = new Set(selected.map((record) => record.seq));
    const entries = [];
    scanMaterializedSessionArchive(sessionDir, (entry) => entries.push(entry), {
      strict,
      includeRecord: (record) => selectedSeqs.has(record.seq),
    });
    return entries;
  }
  const materialized = materializeSessionArchive(sessionDir, { strict });
  return [...materialized.entries];
}

export function deleteV2SessionFile(logDir, file) {
  const { sessionDir } = resolveV2SessionFile(logDir, file);
  rmSync(sessionDir, { recursive: true, force: false });
  return true;
}

/** In-process implementation used by the reader worker and focused unit tests. */
export function streamV2LogEntriesInProcess(logDir, file, onRawEntry, opts = {}) {
  const { sessionDir } = resolveV2SessionFile(logDir, file);
  const winners = selectWinningTimelineRecords(sessionDir).winners;
  const totalCount = winners.length;
  const since = opts.since || null;
  let hasMore = false;
  let oldestTs = null;
  let outputWinners = winners;
  if (opts.limit > 0 && winners.length > opts.limit) {
    hasMore = true;
    outputWinners = winners.slice(-opts.limit);
    oldestTs = outputWinners[0]?.timestamp || null;
  }
  opts.onReady?.({ totalCount, hasMore, oldestTs });

  const scanSeqs = opts.onScan ? new Set(winners.map((record) => record.seq)) : new Set();
  const outputSeqs = new Set(outputWinners.map((record) => record.seq));
  const includedSeqs = opts.onScan
    ? scanSeqs
    : outputSeqs;
  let sentCount = 0;
  scanMaterializedSessionArchive(sessionDir, (entry, record) => {
    const raw = JSON.stringify(entry);
    const scan = scanSeqs.has(record.seq);
    const emit = outputSeqs.has(record.seq)
      && !(since && entry?.timestamp && entry.timestamp < since);
    if (opts.onRecord) opts.onRecord(raw, { scan, emit });
    else {
      if (scan) opts.onScan(raw);
      if (emit) onRawEntry(raw);
    }
    if (emit) sentCount++;
  }, {
    includeRecord: (record) => includedSeqs.has(record.seq),
  });
  return { sentCount, totalCount };
}

export function runReaderWorker(operation, payload, handlers = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const ackBuffer = new SharedArrayBuffer(4);
    const ack = new Int32Array(ackBuffer);
    const worker = new Worker(new URL('./reader-worker.js', import.meta.url), {
      workerData: { operation, payload, ackBuffer },
      // `node --input-type=module -e ...` is useful for diagnostics, but that
      // flag is invalid when inherited by a file-backed worker.
      execArgv: [],
    });
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      if (error) rejectPromise(error);
      else resolvePromise(value);
    };
    worker.on('message', (message) => {
      if (message?.type === 'ready') {
        try { handlers.onReady?.(message.value); }
        catch (error) { worker.terminate(); finish(error); }
        return;
      }
      if (message?.type === 'entry') {
        try {
          if (message.scan) handlers.onScan?.(message.raw);
          if (message.emit) handlers.onEntry?.(message.raw);
        } catch (error) {
          worker.terminate();
          finish(error);
        } finally {
          Atomics.add(ack, 0, 1);
          Atomics.notify(ack, 0);
        }
        return;
      }
      if (message?.type === 'result') finish(null, message.value);
      else if (message?.type === 'error') {
        const error = new Error(message.message || 'V2 reader worker failed');
        if (message.code) error.code = message.code;
        if (message.stack) error.stack = message.stack;
        finish(error);
      }
    });
    worker.on('error', (error) => finish(error));
    worker.on('exit', (code) => {
      if (!settled && code !== 0) finish(new Error(`V2 reader worker exited with code ${code}`));
    });
  });
}

/**
 * Streams V2 entries from a worker so large histories cannot monopolize the
 * HTTP server's event loop. A shared one-entry acknowledgement provides
 * backpressure and prevents the worker/message queue from retaining a whole
 * cumulative conversation at once.
 */
export async function streamV2LogEntries(logDir, file, onRawEntry, opts = {}) {
  return runReaderWorker('stream', {
    logDir,
    file,
    options: {
      since: opts.since || null,
      limit: opts.limit || 0,
      wantScan: typeof opts.onScan === 'function',
    },
  }, {
    onReady: opts.onReady,
    onScan: opts.onScan,
    onEntry: onRawEntry,
  });
}

/** Finds the V2 session whose commits point at one authoritative V1 log. */
export function findV2SessionFileByLegacyLog(logDir, legacyLogFile, { conversationOnly = false } = {}) {
  if (typeof legacyLogFile !== 'string' || !legacyLogFile || legacyLogFile.startsWith('/')
      || legacyLogFile.split('/').includes('..')) return null;
  let best = null;
  for (const projectDir of listProjectDirs(logDir)) {
    let project;
    try { project = readValidatedProject(projectDir); } catch { continue; }
    for (const sessionDir of listSessionDirs(projectDir)) {
      try {
        const manifest = readValidatedSession(project, sessionDir);
        if (conversationOnly && manifest.source === 'app-server-global') continue;
        let matched = false;
        let hasRootMain = false;
        scanJsonlSync(join(sessionDir, 'timeline.jsonl'), ({ value }) => {
          if (value?.legacyRef?.logFile === legacyLogFile) matched = true;
          if (value?.threadId === manifest.rootThreadId && value?.agentRole === 'main') hasRootMain = true;
        });
        if (!matched || (conversationOnly && !hasRootMain)) continue;
        const timestamp = sessionTimestamp(manifest.createdAt);
        const file = relative(logDir, join(sessionDir, 'timeline.jsonl')).split(sep).join('/');
        if (!best || timestamp > best.timestamp) best = { file, timestamp };
      } catch {}
    }
  }
  return best?.file || null;
}

export function findV2SessionFileBySessionId(logDir, sessionId, {
  projectId = null,
  canonicalCwd = null,
} = {}) {
  if (typeof sessionId !== 'string' || !sessionId) return null;
  const discovery = discoverV2SessionArchives(logDir, { projectId });
  const matches = discovery.archives.filter((archive) => (
    archive.manifest.sessionId === sessionId
    && (!canonicalCwd || archive.project.canonicalCwd === canonicalCwd)
  ));
  matches.sort((a, b) => b.manifest.createdAt.localeCompare(a.manifest.createdAt));
  return matches[0]?.file || null;
}

function rootMainActivity(sessionDir, manifest) {
  let lastMainActivity = null;
  let expectedSeq = 1;
  const timeline = scanJsonlSync(join(sessionDir, 'timeline.jsonl'), ({ value }) => {
    const recordValidation = validateTimelineRecord(value);
    if (!recordValidation.ok) throw new Error(recordValidation.errors.join('; '));
    if (value.seq !== expectedSeq) throw new Error(`timeline sequence gap at ${expectedSeq}`);
    expectedSeq++;
    if (value.threadId !== manifest.rootThreadId || value.agentRole !== 'main') return;
    const activity = value.timestamp || value.committedAt;
    if (activity && (!lastMainActivity || activity > lastMainActivity)) lastMainActivity = activity;
  });
  const incompleteTail = timeline.error?.cause?.message === 'incomplete JSONL tail';
  if (timeline.error && !incompleteTail) throw timeline.error.cause;
  return lastMainActivity;
}

/**
 * Resolve the durable last-active-session pointer for one exact project.
 * The writer coordinator's in-memory lastLocator is empty after a restart, so
 * project.json is the cold-start anchor used before the next live write.
 */
export function findLatestV2SessionFile(logDir, { projectId, canonicalCwd } = {}) {
  if (typeof projectId !== 'string' || !projectId
      || typeof canonicalCwd !== 'string' || !canonicalCwd) return null;
  let projectDir;
  try { projectDir = join(logDir, projectArchiveDirectoryName(projectId)); } catch { return null; }
  if (!existsSync(projectDir) || !statSync(projectDir).isDirectory()) return null;

  let project;
  try {
    project = readValidatedProject(projectDir);
    if (project.projectId !== projectId || project.canonicalCwd !== canonicalCwd) return null;
  } catch {
    return null;
  }

  const candidates = [];
  for (const sessionDir of listSessionDirs(projectDir)) {
    try {
      const manifest = readValidatedSession(project, sessionDir);
      if (manifest.source === 'app-server-global') continue;
      const timelinePath = join(sessionDir, 'timeline.jsonl');
      // A crash can leave project.json pointing at a newly created but never
      // committed archive. Do not let that hide the preceding conversation.
      if (!existsSync(timelinePath) || statSync(timelinePath).size === 0) continue;
      const lastMainActivity = rootMainActivity(sessionDir, manifest);
      if (!lastMainActivity) continue;
      candidates.push({
        sessionId: manifest.sessionId,
        sessionSeq: manifest.sessionSeq,
        createdAt: manifest.createdAt,
        lastMainActivity,
        file: relative(logDir, timelinePath).split(sep).join('/'),
      });
    } catch {}
  }
  if (candidates.length === 0) return null;
  // project.latestSessionId is authoritative after invalid/global pointers
  // from older builds have been filtered out. A valid pointer wins over
  // lower-authority mirrored proxy activity; activity orders the fallback.
  candidates.sort((a, b) => (
    Number(b.sessionId === project.latestSessionId) - Number(a.sessionId === project.latestSessionId)
    || b.lastMainActivity.localeCompare(a.lastMainActivity)
    || b.sessionSeq - a.sessionSeq
    || b.createdAt.localeCompare(a.createdAt)
  ));
  for (const candidate of candidates) {
    try {
      const sessionDir = dirname(join(logDir, candidate.file));
      scanMaterializedSessionArchive(sessionDir, () => {}, { includeRecord: () => false });
      return candidate.file;
    } catch {
      // A structurally plausible but unreadable latest archive must not hide a
      // preceding healthy conversation during startup.
    }
  }
  return null;
}

/** Select the renderable current V2 conversation, or null to let V1 load. */
export function findActiveV2SessionFile(logDir, {
  runtime = null,
  projectId,
  canonicalCwd,
  legacyLogFile = null,
} = {}) {
  const runtimeSessionId = runtime?.config?.writeMode === 'v2'
    ? runtime?.writer?.lastConversationLocator?.sessionId
    : null;
  if (runtimeSessionId) {
    const runtimeFile = findV2SessionFileBySessionId(logDir, runtimeSessionId, {
      projectId: projectId || null,
      canonicalCwd: canonicalCwd || null,
    });
    if (runtimeFile) {
      try {
        const { sessionDir } = resolveV2SessionFile(logDir, runtimeFile);
        const manifest = readJson(join(sessionDir, 'manifest.json'));
        if (manifest.source === 'app-server-global' || !rootMainActivity(sessionDir, manifest)) {
          throw new Error('runtime locator is not a root conversation');
        }
        const report = scanMaterializedSessionArchive(sessionDir, () => {}, { includeRecord: () => false });
        if (report.committedEvents > 0) return runtimeFile;
      } catch {
        // Fall through to the durable healthy-session selection.
      }
    }
  }
  const durable = findLatestV2SessionFile(logDir, { projectId, canonicalCwd });
  if (durable) return durable;
  return legacyLogFile
    ? findV2SessionFileByLegacyLog(logDir, legacyLogFile, { conversationOnly: true })
    : null;
}

export function readV2PagedEntries(logDir, file, { before, limit }) {
  const { sessionDir } = resolveV2SessionFile(logDir, file);
  const eligible = selectWinningTimelineRecords(sessionDir).winners
    .filter((record) => record.timestamp && record.timestamp < before);
  if (eligible.length === 0) return { entries: [], hasMore: false, oldestTimestamp: '', count: 0 };
  const start = Math.max(0, eligible.length - limit);
  const selected = eligible.slice(start);
  const selectedSeqs = new Set(selected.map((record) => record.seq));
  const entries = [];
  scanMaterializedSessionArchive(sessionDir, (entry) => entries.push(JSON.stringify(entry)), {
    includeRecord: (record) => selectedSeqs.has(record.seq),
  });
  return {
    entries,
    hasMore: start > 0,
    oldestTimestamp: selected[0]?.timestamp || '',
    count: entries.length,
  };
}

export async function readV2PagedEntriesAsync(logDir, file, options) {
  return runReaderWorker('page', { logDir, file, options });
}

export async function readV2WireSnapshotAsync(logDir, file, options = {}) {
  return runReaderWorker('wire-snapshot', { logDir, file, options });
}

export async function readV2WirePageAsync(logDir, file, options = {}) {
  return runReaderWorker('wire-page', { logDir, file, options });
}
