import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { applyWireCommit, checkpointWireArchiveState, createWireArchiveState } from './reducer.js';
import { validateRequestSummary } from './request-summary.js';
import { validateSessionManifest, validateTimelineRecord } from './schema.js';
import { readContentObjectSync, readJsonReferenceSync, scanJsonlRangeSync, scanJsonlSync, sha256, stableJsonStringify } from './storage.js';
import { resolveV2SessionFile } from './materializer.js';
import { buildRequestSummary } from './request-summary.js';
import { threadStoreToken } from './identity.js';
import {
  createWireCursor,
  createWireEnvelope,
  LOG_V2_WIRE_KINDS,
  LOG_V2_WIRE_VERSION,
  sameWireArchive,
  validateWireCheckpoint,
  wireObjectRef,
} from './wire-schema.js';

const THREAD_TOKEN_PATTERN = /^t_[a-f0-9]{64}$/;
const MAX_SUMMARY_INDEXES = 16;
const summaryIndexes = new Map();
const requestSummaryReadStats = { indexedRecords: 0, selectedRecords: 0 };

export function getV2RequestSummaryReadStats() {
  return Object.freeze({ ...requestSummaryReadStats });
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function timelineIdentity(timelinePath, throughBytes) {
  const stat = statSync(timelinePath, { bigint: true });
  const fileBytes = Number(stat.size);
  if (!Number.isSafeInteger(fileBytes) || throughBytes > fileBytes) {
    const error = new Error('V2 timeline was truncated before the cursor');
    error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
    throw error;
  }
  const length = Math.min(4096, throughBytes);
  const buffer = Buffer.allocUnsafe(length);
  if (length > 0) {
    const fd = openSync(timelinePath, 'r');
    try {
      const read = readSync(fd, buffer, 0, length, throughBytes - length);
      if (read !== length) throw new Error('V2 timeline cursor tail could not be read');
    } finally {
      closeSync(fd);
    }
  }
  return Object.freeze({
    fileId: `${stat.dev}:${stat.ino}`,
    tailHash: sha256(buffer),
    fileVersion: `${stat.mtimeNs}:${stat.ctimeNs}`,
    fileBytes,
  });
}

function assertTimelineIdentity(timelinePath, cursor) {
  if (!cursor?.fileId && !cursor?.tailHash) return;
  const current = timelineIdentity(timelinePath, cursor.timelineBytes);
  if (current.fileId !== cursor.fileId || current.tailHash !== cursor.tailHash
      || (current.fileBytes === cursor.timelineBytes
        && cursor.fileVersion && current.fileVersion !== cursor.fileVersion)) {
    const error = new Error('V2 timeline identity changed before the cursor');
    error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
    throw error;
  }
}

export function assertV2WireCursorFile(logDir, file, cursor) {
  const { timelinePath } = resolveV2SessionFile(logDir, file);
  assertTimelineIdentity(timelinePath, cursor);
}

function archiveIdentity(manifest) {
  const generation = sha256(stableJsonStringify({
    projectId: manifest.projectId,
    sessionId: manifest.sessionId,
    sessionSeq: manifest.sessionSeq,
    rootThreadId: manifest.rootThreadId,
    createdAt: manifest.createdAt,
  }));
  return Object.freeze({ projectId: manifest.projectId, sessionId: manifest.sessionId, generation });
}

function threadRecord(sessionDir, ref, name) {
  if (!THREAD_TOKEN_PATTERN.test(ref?.thread || '')) throw new TypeError('invalid V2 thread reference');
  return readJsonReferenceSync(join(sessionDir, 'threads', ref.thread, name), ref, { rootDir: sessionDir });
}

function wireRefMap(value) {
  return Object.fromEntries(Object.entries(value || {}).map(([part, ref]) => [part, wireObjectRef(ref)]));
}

function loadRequestSummaries(sessionDir, wantedSeqs = null) {
  const file = join(sessionDir, 'request-summaries.jsonl');
  if (!existsSync(file)) return new Map();
  const stat = statSync(file, { bigint: true });
  const fileId = `${stat.dev}:${stat.ino}`;
  const size = Number(stat.size);
  let index = summaryIndexes.get(file);
  if (!index || index.fileId !== fileId || !Number.isSafeInteger(size) || size < index.validBytes) {
    index = { fileId, validBytes: 0, locators: new Map(), lastAccessAt: 0 };
    summaryIndexes.set(file, index);
  }
  if (size > index.validBytes) {
    const scan = scanJsonlRangeSync(file, {
      startOffset: index.validBytes,
      skipInvalidLines: true,
    }, ({ value, offset, length }) => {
      const validation = validateRequestSummary(value);
      if (validation.ok) {
        requestSummaryReadStats.indexedRecords++;
        index.locators.set(value.seq, Object.freeze({ offset, length }));
      }
    });
    index.validBytes = scan.validBytes;
  }
  index.lastAccessAt = Date.now();
  while (summaryIndexes.size > MAX_SUMMARY_INDEXES) {
    const oldest = [...summaryIndexes].sort((left, right) => left[1].lastAccessAt - right[1].lastAccessAt)[0];
    summaryIndexes.delete(oldest[0]);
  }
  const selected = [...(wantedSeqs == null ? index.locators.keys() : wantedSeqs)];
  const summaries = new Map();
  if (selected.length === 0) return summaries;
  const fd = openSync(file, 'r');
  try {
    for (const seq of selected) {
      const locator = index.locators.get(seq);
      if (!locator) continue;
      const raw = Buffer.allocUnsafe(locator.length);
      if (readSync(fd, raw, 0, raw.length, locator.offset) !== raw.length
          || raw[raw.length - 1] !== 0x0a) continue;
      requestSummaryReadStats.selectedRecords++;
      try {
        const value = JSON.parse(raw.subarray(0, raw.length - 1).toString('utf8'));
        if (validateRequestSummary(value).ok && value.seq === seq) summaries.set(seq, Object.freeze(value));
      } catch {}
    }
  } finally {
    closeSync(fd);
  }
  return summaries;
}

function requestSummaryLocator(sessionDir, seq) {
  const locator = summaryIndexes.get(join(sessionDir, 'request-summaries.jsonl'))?.locators.get(seq);
  return locator ? Object.freeze({ offset: locator.offset, length: locator.length }) : null;
}

function loadRequestSummariesAtLocators(sessionDir, winners, descriptors) {
  const summaries = new Map();
  const file = join(sessionDir, 'request-summaries.jsonl');
  if (!existsSync(file) || winners.length === 0) return summaries;
  const size = statSync(file).size;
  const fd = openSync(file, 'r');
  try {
    for (let index = 0; index < winners.length; index++) {
      const locator = winners[index]?.summaryLocator;
      const descriptor = descriptors[index];
      if (!locator || !Number.isSafeInteger(locator.offset) || locator.offset < 0
          || !Number.isSafeInteger(locator.length) || locator.length <= 1
          || locator.offset + locator.length > size) continue;
      const raw = Buffer.allocUnsafe(locator.length);
      if (readSync(fd, raw, 0, raw.length, locator.offset) !== raw.length
          || raw[raw.length - 1] !== 0x0a) continue;
      requestSummaryReadStats.selectedRecords++;
      try {
        const value = JSON.parse(raw.subarray(0, raw.length - 1).toString('utf8'));
        if (validateRequestSummary(value).ok && value.seq === descriptor.seq) {
          summaries.set(descriptor.seq, Object.freeze(value));
        }
      } catch {}
    }
  } finally {
    closeSync(fd);
  }
  return summaries;
}

function readWireObjectRef(sessionDir, ref) {
  if (!ref) return undefined;
  return readContentObjectSync(sessionDir, {
    algorithm: 'sha256',
    hash: ref.hash,
    bytes: ref.bytes,
    path: `objects/${ref.hash.slice(0, 2)}/${ref.hash.slice(2, 4)}/${ref.hash}.json`,
  });
}

/** Rebuilds the correctness-critical list/classification view from small canonical meta parts. */
export function rebuildRequestSummary(sessionDir, descriptor) {
  const part = (name) => descriptor.parts instanceof Map
    ? descriptor.parts.get(name)
    : descriptor.parts?.[name];
  const root = readWireObjectRef(sessionDir, part('root.meta')) || {};
  const body = readWireObjectRef(sessionDir, part('root.body'));
  const request = readWireObjectRef(sessionDir, part('request.meta'));
  const response = readWireObjectRef(sessionDir, part('response.meta'));
  const responseHeaders = readWireObjectRef(sessionDir, part('response.headers'));
  const responseBody = readWireObjectRef(sessionDir, part('response.body'));
  const entry = {
    ...root,
    ...(body !== undefined ? { body } : {}),
    ...(request !== undefined ? { request } : {}),
    ...(response !== undefined || responseHeaders !== undefined || responseBody !== undefined
      ? { response: {
          ...(response || {}),
          ...(responseHeaders !== undefined ? { headers: responseHeaders } : {}),
          ...(responseBody !== undefined ? { body: responseBody } : {}),
        } }
      : {}),
  };
  return buildRequestSummary(entry, {
    seq: descriptor.seq,
    eventId: descriptor.eventId,
    entryKey: descriptor.entryKey,
    entryRevision: descriptor.entryRevision,
    threadId: descriptor.threadId,
    parentThreadId: descriptor.parentThreadId,
    agentRole: descriptor.agentRole,
    turnId: descriptor.turnId,
    phase: descriptor.phase,
  });
}

function summaryForDescriptor(summaries, descriptor) {
  const value = summaries.get(descriptor.seq);
  return value
    && value.eventId === descriptor.eventId
    && value.entryKey === descriptor.entryKey
    && value.entryRevision === descriptor.entryRevision
    && value.threadId === descriptor.threadId
    ? value
    : null;
}

function summaryForTimeline(summaries, timeline) {
  const value = summaries.get(timeline.seq);
  return value
    && value.eventId === timeline.eventId
    && value.entryKey === timeline.entryKey
    && value.entryRevision === timeline.entryRevision
    && value.threadId === timeline.threadId
    ? value
    : null;
}

/** Resolve summaries for a bounded set of serialized winner descriptors. */
export function readV2WireSummariesForWinners(logDir, file, winners) {
  if (!Array.isArray(winners) || winners.length > 500) {
    throw new TypeError('V2 summary winners must be an array of at most 500 items');
  }
  const { sessionDir } = resolveV2SessionFile(logDir, file);
  const manifest = readJson(join(sessionDir, 'manifest.json'));
  const archive = archiveIdentity(manifest);
  const descriptors = winners.map((winner) => {
    const descriptor = winner?.descriptor || winner;
    if (!descriptor || !sameWireArchive(descriptor.archive, archive)
        || !Number.isSafeInteger(descriptor.seq) || descriptor.seq <= 0
        || typeof descriptor.eventId !== 'string' || !descriptor.eventId
        || typeof descriptor.entryKey !== 'string' || !descriptor.entryKey
        || typeof descriptor.threadId !== 'string' || !descriptor.threadId
        || !Number.isSafeInteger(descriptor.entryRevision) || descriptor.entryRevision <= 0
        || !descriptor.parts || typeof descriptor.parts !== 'object' || Array.isArray(descriptor.parts)
        || (winner?.descriptor && winner.entryKey !== descriptor.entryKey)) {
      const error = new Error('V2 summary winner does not match the archive');
      error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
      throw error;
    }
    return descriptor;
  });
  const seqs = new Set(descriptors.map(descriptor => descriptor.seq));
  if (seqs.size !== descriptors.length) throw new TypeError('V2 summary winner sequences must be unique');
  const checkpointValidation = validateWireCheckpoint({
    kind: LOG_V2_WIRE_KINDS.checkpoint,
    version: LOG_V2_WIRE_VERSION,
    archive,
    throughSeq: descriptors.reduce((max, descriptor) => Math.max(max, descriptor.seq), 0),
    timelineBytes: 0,
    entries: [],
    threads: [],
    winners: winners.map((winner, index) => ({
      entryKey: descriptors[index].entryKey,
      descriptor: descriptors[index],
    })),
  });
  if (!checkpointValidation.ok) {
    const error = new Error(`invalid V2 summary winners: ${checkpointValidation.errors.join('; ')}`);
    error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
    throw error;
  }
  // New frozen indexes carry trusted byte locators from the snapshot worker.
  // A fresh page worker can therefore pread only its bounded page instead of
  // rebuilding an O(history) locator index. Older callers without this
  // internal field keep the compatibility scan.
  const hasLocatorContract = winners.every(winner => Object.hasOwn(winner || {}, 'summaryLocator'));
  const summaries = hasLocatorContract
    ? loadRequestSummariesAtLocators(sessionDir, winners, descriptors)
    : loadRequestSummaries(sessionDir, seqs);
  return Object.freeze(descriptors.map(descriptor => (
    summaryForDescriptor(summaries, descriptor) || rebuildRequestSummary(sessionDir, descriptor)
  )));
}

export function toWireCommit(archive, sessionDir, timeline, timelineBytes) {
  const expectedThread = threadStoreToken(timeline.threadId);
  if (timeline.entryRef?.thread !== expectedThread) {
    throw new Error(`entry thread reference mismatch at timeline sequence ${timeline.seq}`);
  }
  const entry = threadRecord(sessionDir, timeline.entryRef, 'entries.jsonl');
  if (entry.kind !== 'cx-viewer.entry-revision'
      || entry.version !== 1
      || entry.txnId !== timeline.txnId
      || entry.entryKey !== timeline.entryKey
      || entry.revision !== timeline.entryRevision) {
    throw new Error(`entry revision mismatch at timeline sequence ${timeline.seq}`);
  }

  let input = null;
  let inputBinding = null;
  if (entry.inputBinding) {
    const binding = entry.inputBinding;
    inputBinding = {
      revision: binding.revision,
      path: binding.path,
      changed: !!binding.ref,
    };
    if (binding.ref) {
      if (binding.ref.thread !== expectedThread) {
        throw new Error(`input thread reference mismatch at timeline sequence ${timeline.seq}`);
      }
      const record = threadRecord(sessionDir, binding.ref, 'input.jsonl');
      if (record.kind !== 'cx-viewer.input-revision'
          || record.version !== 1
          || record.txnId !== timeline.txnId
          || record.revision !== binding.revision
          || record.path !== binding.path) {
        throw new Error(`input revision mismatch at timeline sequence ${timeline.seq}`);
      }
      input = {
        revision: record.revision,
        baseRevision: record.baseRevision,
        path: record.path,
        retain: record.retain,
        remove: record.remove,
        append: record.append.map(wireObjectRef),
      };
    }
  }

  return createWireEnvelope(LOG_V2_WIRE_KINDS.commit, archive, {
    timeline: Object.freeze({
      seq: timeline.seq,
      eventId: timeline.eventId,
      txnId: timeline.txnId,
      timestamp: timeline.timestamp,
      committedAt: timeline.committedAt || null,
      threadId: timeline.threadId,
      parentThreadId: timeline.parentThreadId ?? null,
      agentRole: timeline.agentRole,
      turnId: timeline.turnId ?? null,
      entryKey: timeline.entryKey,
      entryRevision: timeline.entryRevision,
      inputRevision: timeline.inputRevision,
      phase: timeline.phase,
    }),
    entry: Object.freeze({
      entryKey: entry.entryKey,
      revision: entry.revision,
      baseRevision: entry.baseRevision,
      set: Object.freeze(wireRefMap(entry.set)),
      delete: Object.freeze([...(entry.delete || [])]),
      inputBinding: inputBinding ? Object.freeze(inputBinding) : null,
    }),
    input: input ? Object.freeze(input) : null,
    timelineBytes,
  });
}

/**
 * Builds a frozen reference-only snapshot. No content object is decoded and no
 * legacy entry is assembled. The final checkpoint contains the revision state
 * needed to apply seq > throughSeq live commits.
 */
export function readV2WireSnapshot(logDir, file, {
  limit = 0,
  throughSeq = 0,
  includeRevisionState = false,
} = {}) {
  const { sessionDir, timelinePath } = resolveV2SessionFile(logDir, file);
  const manifest = readJson(join(sessionDir, 'manifest.json'));
  const manifestValidation = validateSessionManifest(manifest);
  if (!manifestValidation.ok) throw new Error(`invalid V2 session manifest: ${manifestValidation.errors.join('; ')}`);
  const archive = archiveIdentity(manifest);
  const state = createWireArchiveState(archive);
  let expectedSeq = 1;

  const timelineScan = scanJsonlSync(timelinePath, ({ value, offset, length }) => {
    const validation = validateTimelineRecord(value);
    if (!validation.ok) throw new Error(validation.errors.join('; '));
    if (value.seq !== expectedSeq) throw new Error(`timeline sequence gap at ${expectedSeq}`);
    expectedSeq++;
    if (!throughSeq || value.seq <= throughSeq) {
      applyWireCommit(state, toWireCommit(archive, sessionDir, value, offset + length));
    }
  });
  const incompleteTail = timelineScan.error?.cause?.message === 'incomplete JSONL tail';
  if (timelineScan.error && !incompleteTail) {
    const error = new Error(`invalid V2 timeline at byte ${timelineScan.error.offset}: ${timelineScan.error.cause.message}`);
    error.code = 'CXV_LOG_V2_CORRUPT';
    error.offset = timelineScan.error.offset;
    throw error;
  }
  if (throughSeq && state.throughSeq !== throughSeq) {
    const error = new Error('V2 frozen watermark is beyond the archive tail');
    error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
    throw error;
  }

  const winners = [...state.winners.values()];
  const selected = limit > 0 && winners.length > limit ? winners.slice(-limit) : winners;
  const selectedSeqs = new Set(selected.map(value => value.seq));
  const summariesBySeq = loadRequestSummaries(sessionDir, selectedSeqs);
  // The initial window is the only summary payload needed for the snapshot
  // response.  Older winners stay as lightweight descriptors in the frozen
  // page index and resolve their summaries only if that page is requested.
  // Rebuilding every missing derived summary here made a 200/400-entry first
  // window pay object I/O for the entire archive.
  const summaries = selected.map(descriptor => summaryForDescriptor(summariesBySeq, descriptor)
    || rebuildRequestSummary(sessionDir, descriptor));
  const cursor = createWireCursor(
    archive,
    state.throughSeq,
    state.timelineBytes,
    timelineIdentity(timelinePath, state.timelineBytes),
  );
  const fullCheckpoint = checkpointWireArchiveState(state, { includeEntries: includeRevisionState });
  const checkpoint = Object.freeze({
    ...fullCheckpoint,
    winners: Object.freeze(fullCheckpoint.winners.filter(value => selectedSeqs.has(value.descriptor.seq))),
  });
  const pageIndex = Object.freeze({
    cursor,
    // Internal locator used by readV2WirePageFromIndex. It is never emitted on
    // the wire, but survives the snapshot worker's structured clone.
    sessionDir,
    values: Object.freeze(fullCheckpoint.winners.map(winner => Object.freeze({
      winner,
      summaryLocator: requestSummaryLocator(sessionDir, winner.descriptor.seq),
    }))),
  });
  const liveCheckpoint = includeRevisionState
    ? fullCheckpoint
    : checkpointWireArchiveState(state, { winnerSeqs: new Set(), includeEntries: true });
  const start = createWireEnvelope(LOG_V2_WIRE_KINDS.start, archive, {
    cursor,
    total: winners.length,
    windowCount: selected.length,
    hasMore: selected.length < winners.length,
  });
  const end = createWireEnvelope(LOG_V2_WIRE_KINDS.end, archive, { cursor });
  return Object.freeze({
    start,
    checkpoint,
    summaries: Object.freeze(summaries),
    end,
    pageIndex,
    liveCheckpoint,
  });
}

/** Slices an immutable server-owned winner index without replaying the archive. */
export function readV2WirePageFromIndex(pageIndex, {
  cursor,
  beforeSeq = Number.MAX_SAFE_INTEGER,
  limit = 100,
  deferSummaries = false,
} = {}) {
  if (!cursor?.archive || !Number.isSafeInteger(cursor.throughSeq) || cursor.throughSeq < 0
      || !Number.isSafeInteger(cursor.timelineBytes) || cursor.timelineBytes < 0
      || !Number.isSafeInteger(beforeSeq) || beforeSeq <= 0
      || !Number.isSafeInteger(limit) || limit <= 0 || limit > 500) {
    throw new TypeError('invalid V2 page cursor');
  }
  if (!pageIndex?.cursor || !sameWireArchive(pageIndex.cursor.archive, cursor.archive)
      || pageIndex.cursor.throughSeq !== cursor.throughSeq
      || pageIndex.cursor.timelineBytes !== cursor.timelineBytes
      || !Array.isArray(pageIndex.values)) {
    const error = new Error('V2 frozen page index does not match its cursor');
    error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
    throw error;
  }
  let low = 0;
  let high = pageIndex.values.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (pageIndex.values[middle].winner.descriptor.seq < beforeSeq) low = middle + 1;
    else high = middle;
  }
  const eligibleCount = low;
  const selected = pageIndex.values.slice(Math.max(0, eligibleCount - limit), eligibleCount);
  const pageSeqs = new Set(selected.map(value => value.winner.descriptor.seq));
  const summariesBySeq = !deferSummaries && typeof pageIndex.sessionDir === 'string'
    ? loadRequestSummaries(pageIndex.sessionDir, pageSeqs)
    : null;
  const summaries = deferSummaries ? [] : selected.map((value) => {
    // Accept indexes produced by older in-process callers while lazily filling
    // the summary for the new descriptor-only index.
    if (value.summary) return value.summary;
    if (!summariesBySeq) {
      throw new Error('V2 frozen page index cannot resolve request summaries');
    }
    return summaryForDescriptor(summariesBySeq, value.winner.descriptor)
      || rebuildRequestSummary(pageIndex.sessionDir, value.winner.descriptor);
  });
  const nextBeforeSeq = selected.length > 0
    ? Math.min(...selected.map(value => value.winner.descriptor.seq))
    : beforeSeq;
  const checkpoint = Object.freeze({
    kind: LOG_V2_WIRE_KINDS.checkpoint,
    version: LOG_V2_WIRE_VERSION,
    archive: cursor.archive,
    throughSeq: cursor.throughSeq,
    timelineBytes: cursor.timelineBytes,
    entries: Object.freeze([]),
    threads: Object.freeze([]),
    winners: Object.freeze(selected.map(value => value.winner)),
  });
  const start = createWireEnvelope(LOG_V2_WIRE_KINDS.start, cursor.archive, {
    cursor,
    page: true,
    windowCount: selected.length,
    hasMore: eligibleCount > selected.length,
    nextBeforeSeq,
  });
  return Object.freeze({
    start,
    checkpoint,
    summaries: Object.freeze(summaries),
    // Server-internal worker payload. The route must pass this field to the
    // summary worker, but never serialize it as a control frame.
    summaryWinners: Object.freeze(selected.map(value => Object.freeze({
      ...value.winner,
      summaryLocator: value.summaryLocator ?? null,
    }))),
    end: createWireEnvelope(LOG_V2_WIRE_KINDS.end, cursor.archive, { cursor }),
  });
}

/** Compatibility reader used by offline/tests; HTTP handles use the frozen index. */
export function readV2WirePage(logDir, file, options = {}) {
  const { cursor } = options;
  if (!cursor?.archive) throw new TypeError('invalid V2 page cursor');
  const { timelinePath } = resolveV2SessionFile(logDir, file);
  assertTimelineIdentity(timelinePath, cursor);
  const frozen = readV2WireSnapshot(logDir, file, { throughSeq: cursor.throughSeq });
  if (!sameWireArchive(frozen.start.archive, cursor.archive)
      || frozen.end.cursor.timelineBytes !== cursor.timelineBytes
      || (cursor.fileId && frozen.end.cursor.fileId !== cursor.fileId)
      || (cursor.tailHash && frozen.end.cursor.tailHash !== cursor.tailHash)) {
    const error = new Error(`V2 frozen page watermark changed (${frozen.end.cursor.timelineBytes}/${cursor.timelineBytes})`);
    error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
    throw error;
  }
  return readV2WirePageFromIndex(frozen.pageIndex, options);
}

export function readV2WireCommitsAfter(logDir, file, {
  afterSeq = 0,
  generation = null,
} = {}) {
  const { sessionDir, timelinePath } = resolveV2SessionFile(logDir, file);
  const manifest = readJson(join(sessionDir, 'manifest.json'));
  const archive = archiveIdentity(manifest);
  if (generation && generation !== archive.generation) {
    const error = new Error('V2 archive generation changed');
    error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
    throw error;
  }
  const pending = [];
  const state = createWireArchiveState(archive);
  let expectedSeq = 1;
  const scan = scanJsonlSync(timelinePath, ({ value, offset, length }) => {
    const validation = validateTimelineRecord(value);
    if (!validation.ok) throw new Error(validation.errors.join('; '));
    if (value.seq !== expectedSeq) throw new Error(`timeline sequence gap at ${expectedSeq}`);
    expectedSeq++;
    const frame = toWireCommit(archive, sessionDir, value, offset + length);
    const descriptor = applyWireCommit(state, frame);
    if (value.seq <= afterSeq) return;
    pending.push({ frame, descriptor });
  });
  const incompleteTail = scan.error?.cause?.message === 'incomplete JSONL tail';
  if (scan.error && !incompleteTail) {
    const error = new Error(`invalid V2 timeline at byte ${scan.error.offset}: ${scan.error.cause.message}`);
    error.code = 'CXV_LOG_V2_CORRUPT';
    throw error;
  }
  if (!Number.isSafeInteger(afterSeq) || afterSeq < 0 || afterSeq > expectedSeq - 1) {
    const error = new Error('V2 replay cursor is beyond the archive tail');
    error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
    throw error;
  }
  const summaries = loadRequestSummaries(sessionDir, new Set(pending.map(value => value.frame.timeline.seq)));
  const commits = pending.map(({ frame, descriptor }) => Object.freeze({
    frame,
    summary: summaryForDescriptor(summaries, descriptor) || rebuildRequestSummary(sessionDir, descriptor),
  }));
  return Object.freeze({ archive, commits: Object.freeze(commits), throughSeq: expectedSeq - 1, timelineBytes: scan.validBytes });
}

export function readV2WireCommitsFromCursor(logDir, file, { cursor } = {}) {
  const { sessionDir, timelinePath } = resolveV2SessionFile(logDir, file);
  const manifest = readJson(join(sessionDir, 'manifest.json'));
  const archive = archiveIdentity(manifest);
  if (!cursor || !sameWireArchive(cursor.archive, archive)) {
    const error = new Error('V2 archive generation changed');
    error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
    throw error;
  }
  assertTimelineIdentity(timelinePath, cursor);
  const pending = [];
  let expectedSeq = cursor.throughSeq + 1;
  const scan = scanJsonlRangeSync(timelinePath, { startOffset: cursor.timelineBytes }, ({ value, offset, length }) => {
    const validation = validateTimelineRecord(value);
    if (!validation.ok) throw new Error(validation.errors.join('; '));
    if (value.seq !== expectedSeq) {
      const error = new Error(`V2 suffix sequence mismatch at ${expectedSeq}`);
      error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
      throw error;
    }
    expectedSeq++;
    const timelineBytes = offset + length;
    const frame = toWireCommit(archive, sessionDir, value, timelineBytes);
    pending.push({
      frame: Object.freeze({
        ...frame,
        cursor: createWireCursor(archive, value.seq, timelineBytes, timelineIdentity(timelinePath, timelineBytes)),
      }),
      timeline: value,
    });
  });
  const incompleteTail = scan.error?.cause?.message === 'incomplete JSONL tail';
  if (scan.error && !incompleteTail) throw scan.error.cause;
  const throughSeq = expectedSeq - 1;
  const summaries = loadRequestSummaries(sessionDir, new Set(pending.map(value => value.timeline.seq)));
  const commits = pending.map(({ frame, timeline }) => Object.freeze({
    frame,
    summary: summaryForTimeline(summaries, timeline),
  }));
  return Object.freeze({
    archive,
    commits: Object.freeze(commits),
    cursor: createWireCursor(
      archive,
      throughSeq,
      scan.validBytes,
      timelineIdentity(timelinePath, scan.validBytes),
    ),
  });
}
