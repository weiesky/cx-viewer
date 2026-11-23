// Shared archive scanner: below both materializer and session-summary.
import { lstatSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { assembleEntryParts, applyInputOperations } from '@cxv/core/log-v2/entry-codec';
import { scanSessionTimelineSync } from './shards.js';
import { threadStoreToken } from './identity.js';
import { validateSessionManifest, validateTimelineRecord } from './schema.js';
import { readContentObjectSync, readJsonReferenceSync } from './storage.js';

const THREAD_TOKEN_PATTERN = /^t_[a-f0-9]{64}$/;

export function readArchiveJson(filePath) {
  const stat = lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`unsafe V2 JSON file: ${filePath}`);
  return JSON.parse(readFileSync(filePath, 'utf8'));
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
 * Materializes a committed archive one entry at a time. State is limited to
 * current thread/entry revisions, allowing migration verification without
 * retaining an entire multi-gigabyte history in memory.
 */
export function scanMaterializedSessionArchive(sessionDir, onEntry, {
  strict = true,
  includeRecord = null,
} = {}) {
  if (typeof onEntry !== 'function') throw new TypeError('onEntry callback is required');
  const resolvedSessionDir = resolve(sessionDir);
  const manifest = readArchiveJson(join(resolvedSessionDir, 'manifest.json'));
  const manifestValidation = validateSessionManifest(manifest);
  if (!manifestValidation.ok) throw new Error(`invalid V2 session manifest: ${manifestValidation.errors.join('; ')}`);
  let committedEvents = 0;
  const states = { nextSeq: 1, entries: new Map(), threads: new Map() };
  const timeline = scanSessionTimelineSync(resolvedSessionDir, ({ value }) => {
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
  return Object.freeze({
    manifest: Object.freeze(manifest),
    committedEvents,
    validTimelineBytes: timeline.validBytes,
    timelineBytes: timeline.fileSize,
    ignoredTailBytes: timeline.fileSize - timeline.validBytes,
    error: timeline.error ? timeline.error.cause.message : null,
  });
}

