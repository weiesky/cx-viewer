import {
  closeSync,
  existsSync,
  fstatSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

import { projectUserPromptItem, projectedPromptFingerprint } from '../../src/utils/userPromptContent.js';
import { splitEntryParts } from './entry-codec.js';
import { scanMaterializedSessionArchive } from './materializer.js';
import { SESSION_SUMMARY_KIND, validateSessionSummary } from './schema.js';
import { atomicWriteJsonSync, sha256, stableJsonStringify, withFileLockSync } from './storage.js';

export const SESSION_SUMMARY_FILE = 'summary.json';
const SESSION_LOCK_FILE = '.append.lock';
const MAX_FIXED_POINT_ITERATIONS = 16;

function promptText(projected) {
  const parts = [];
  for (const segment of projected?.segments || []) {
    if (segment?.type === 'text' && typeof segment.text === 'string' && segment.text.trim()) {
      parts.push(segment.text.trim());
    } else if (segment?.type === 'image') {
      // Never derive overview text from a local path or remote URL. Even a
      // basename may contain credentials or other private identifiers.
      parts.push('[Image]');
    }
  }
  const text = parts.join('\n').trim();
  if (!text) return null;
  return projected?.truncated ? `${text}\n…` : text;
}

function opaqueFingerprint(value) {
  return `sha256:${sha256(value)}`;
}

/** Project exactly one item through the shared user-prompt classifier. */
export function projectPromptItemForSummary(item) {
  const projected = projectUserPromptItem(item);
  if (!projected) return null;
  const text = promptText(projected);
  if (!text) return null;
  return Object.freeze({
    fingerprint: opaqueFingerprint(projectedPromptFingerprint(projected)),
    text,
    truncated: projected.truncated === true,
  });
}

function itemHash(item) {
  return sha256(stableJsonStringify(item));
}

function nextOccurrenceId(state) {
  return `p_${String(state.userPrompts.length + 1).padStart(12, '0')}`;
}

export function createSessionSummaryState(manifest) {
  return {
    kind: SESSION_SUMMARY_KIND,
    version: 1,
    sessionId: manifest.sessionId,
    rootThreadId: manifest.rootThreadId,
    throughSeq: 0,
    indexedTimelineBytes: 0,
    committedEvents: 0,
    rootMainEvents: 0,
    lastRootMainActivity: null,
    turns: 0,
    turnIds: [],
    rootInputRevision: 0,
    lastRootTurnId: null,
    activeRootInput: [],
    userPrompts: [],
    archiveBytes: 0,
    summaryBytes: 0,
  };
}

function occurrenceById(state, occurrenceId) {
  if (!occurrenceId) return null;
  return state.userPrompts.find((prompt) => prompt.occurrenceId === occurrenceId) || null;
}

/**
 * Merge one cumulative root input snapshot without duplicating retained items.
 * Removed items may be replayed by compaction; identical content is reused only
 * from that removed suffix, while a normal tail append always creates a new
 * occurrence (so a user can intentionally send the same prompt twice).
 */
export function applyRootInputSnapshot(state, input, rootInputRevision = state.rootInputRevision + 1) {
  if (!Array.isArray(input)) return state;
  const hashes = input.map(itemHash);
  let retain = 0;
  while (retain < hashes.length
      && retain < state.activeRootInput.length
      && hashes[retain] === state.activeRootInput[retain].hash) retain++;
  const removed = state.activeRootInput.slice(retain);
  const removedUsed = new Set();
  const active = state.activeRootInput.slice(0, retain);

  for (let index = retain; index < input.length; index++) {
    const projected = projectPromptItemForSummary(input[index]);
    if (!projected) {
      active.push({ hash: hashes[index], promptOccurrenceId: null });
      continue;
    }

    let occurrence = null;
    for (let removedIndex = 0; removedIndex < removed.length; removedIndex++) {
      if (removedUsed.has(removedIndex) || removed[removedIndex].hash !== hashes[index]) continue;
      const candidate = occurrenceById(state, removed[removedIndex].promptOccurrenceId);
      if (candidate?.fingerprint === projected.fingerprint) {
        occurrence = candidate;
        removedUsed.add(removedIndex);
        break;
      }
    }
    if (!occurrence) {
      occurrence = {
        occurrenceId: nextOccurrenceId(state),
        fingerprint: projected.fingerprint,
        text: projected.text,
        truncated: projected.truncated,
      };
      state.userPrompts.push(occurrence);
    }
    active.push({ hash: hashes[index], promptOccurrenceId: occurrence.occurrenceId });
  }
  state.activeRootInput = active;
  state.rootInputRevision = rootInputRevision;
  return state;
}

/** Count an identical non-cumulative prompt submitted in a distinct turn. */
export function appendRepeatedRootPrompt(state, input) {
  if (!Array.isArray(input)) return false;
  for (let index = input.length - 1; index >= 0; index--) {
    const projected = projectPromptItemForSummary(input[index]);
    if (!projected) continue;
    const occurrence = {
      occurrenceId: nextOccurrenceId(state),
      fingerprint: projected.fingerprint,
      text: projected.text,
      truncated: projected.truncated,
    };
    state.userPrompts.push(occurrence);
    if (index < state.activeRootInput.length
        && state.activeRootInput[index].hash === itemHash(input[index])) {
      state.activeRootInput[index] = {
        ...state.activeRootInput[index],
        promptOccurrenceId: occurrence.occurrenceId,
      };
    }
    return true;
  }
  return false;
}

function stableEntryName(name) {
  return name !== SESSION_LOCK_FILE && !name.includes('.tmp-');
}

/** Sum logical bytes for stable regular files without following symlinks. */
export function directoryLogicalBytes(root, { excludeSummary = false } = {}) {
  let bytes = 0;
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || !stableEntryName(entry.name)) continue;
      if (excludeSummary && dir === root && entry.name === SESSION_SUMMARY_FILE) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) {
        const size = statSync(path).size;
        if (!Number.isSafeInteger(size) || bytes > Number.MAX_SAFE_INTEGER - size) {
          throw new RangeError('V2 session folder size exceeds the safe integer range');
        }
        bytes += size;
      }
    }
  };
  visit(resolve(root));
  return bytes;
}

function finalizeSize(draft, baseBytes) {
  let summaryBytes = 0;
  let archiveBytes = baseBytes;
  for (let iteration = 0; iteration < MAX_FIXED_POINT_ITERATIONS; iteration++) {
    const candidate = { ...draft, summaryBytes, archiveBytes };
    const nextSummaryBytes = Buffer.byteLength(`${stableJsonStringify(candidate)}\n`);
    const nextArchiveBytes = baseBytes + nextSummaryBytes;
    if (nextSummaryBytes === summaryBytes && nextArchiveBytes === archiveBytes) return candidate;
    summaryBytes = nextSummaryBytes;
    archiveBytes = nextArchiveBytes;
  }
  throw new Error('session summary byte-size fixed point did not converge');
}

export function writeSessionSummary(sessionDir, state, {
  durable = true,
  baseBytes = directoryLogicalBytes(resolve(sessionDir), { excludeSummary: true }),
} = {}) {
  const identity = readSessionTimelineIdentity(sessionDir, state.indexedTimelineBytes);
  const draft = identity ? {
    ...state,
    timelineFileId: identity.fileId,
    timelineFileVersion: identity.fileVersion,
    timelineTailHash: identity.tailHash,
  } : state;
  const final = finalizeSize(draft, baseBytes);
  const validation = validateSessionSummary(final);
  if (!validation.ok) throw new TypeError(`invalid V2 session summary: ${validation.errors.join('; ')}`);
  const path = join(resolve(sessionDir), SESSION_SUMMARY_FILE);
  atomicWriteJsonSync(path, final, { durable });
  if (statSync(path).size !== final.summaryBytes) throw new Error('session summary size changed after serialization');
  return final;
}

/** Read a stable identity for the exact canonical timeline byte watermark. */
export function readSessionTimelineIdentity(sessionDir, expectedBytes = null) {
  const path = join(resolve(sessionDir), 'timeline.jsonl');
  if (!existsSync(path)) return null;
  const fd = openSync(path, 'r');
  try {
    const before = fstatSync(fd, { bigint: true });
    const fileBytes = Number(before.size);
    if (!Number.isSafeInteger(fileBytes)
        || (expectedBytes != null && fileBytes !== expectedBytes)) return null;
    const length = Math.min(4096, fileBytes);
    const tail = Buffer.allocUnsafe(length);
    if (length > 0 && readSync(fd, tail, 0, length, fileBytes - length) !== length) return null;
    const after = fstatSync(fd, { bigint: true });
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
        || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) return null;
    return Object.freeze({
      fileId: `${after.dev}:${after.ino}`,
      fileVersion: `${after.mtimeNs}:${after.ctimeNs}`,
      tailHash: sha256(tail),
      fileBytes,
    });
  } finally {
    closeSync(fd);
  }
}

export function readSessionSummary(sessionDir, { manifest = null, timelineBytes = null } = {}) {
  const path = join(resolve(sessionDir), SESSION_SUMMARY_FILE);
  if (!existsSync(path)) return null;
  const stats = statSync(path);
  const value = JSON.parse(readFileSync(path, 'utf8'));
  const validation = validateSessionSummary(value);
  if (!validation.ok) throw new Error(`invalid V2 session summary: ${validation.errors.join('; ')}`);
  if (value.summaryBytes !== stats.size) throw new Error('V2 session summary byte count is stale');
  if (manifest && (value.sessionId !== manifest.sessionId || value.rootThreadId !== manifest.rootThreadId)) {
    throw new Error('V2 session summary identity mismatch');
  }
  if (timelineBytes != null && value.indexedTimelineBytes !== timelineBytes) return null;
  const hasStrongIdentity = value.timelineFileId !== undefined
    || value.timelineFileVersion !== undefined || value.timelineTailHash !== undefined;
  if (timelineBytes != null && hasStrongIdentity) {
    const current = readSessionTimelineIdentity(sessionDir, timelineBytes);
    if (!current || value.timelineFileId !== current.fileId
        || value.timelineFileVersion !== current.fileVersion
        || value.timelineTailHash !== current.tailHash) return null;
  }
  return value;
}

export function invalidateSessionSummary(sessionDir) {
  const path = join(resolve(sessionDir), SESSION_SUMMARY_FILE);
  if (existsSync(path)) {
    try { unlinkSync(path); } catch {}
  }
}

function rebuildUnlocked(sessionDir, { durable = true, write = true } = {}) {
  const resolvedSessionDir = resolve(sessionDir);
  const manifest = JSON.parse(readFileSync(join(resolvedSessionDir, 'manifest.json'), 'utf8'));
  const state = createSessionSummaryState(manifest);
  const turnIds = new Set();
  const report = scanMaterializedSessionArchive(resolvedSessionDir, (entry, record) => {
    state.throughSeq = record.seq;
    state.committedEvents++;
    if (record.turnId) turnIds.add(opaqueFingerprint(record.turnId));
    if (record.threadId === state.rootThreadId && record.agentRole === 'main') {
      state.rootMainEvents++;
      const activity = record.timestamp || record.committedAt;
      if (activity && (!state.lastRootMainActivity || activity > state.lastRootMainActivity)) {
        state.lastRootMainActivity = activity;
      }
    }
    if (record.threadId !== state.rootThreadId) return;
    const input = splitEntryParts(entry).input?.items;
    const turnHash = record.turnId ? opaqueFingerprint(record.turnId) : null;
    const promptCountBefore = state.userPrompts.length;
    if (record.inputRevision > state.rootInputRevision && Array.isArray(input)) {
      applyRootInputSnapshot(state, input, record.inputRevision);
    }
    if (turnHash && turnHash !== state.lastRootTurnId
        && state.userPrompts.length === promptCountBefore
        && Array.isArray(input)) {
      appendRepeatedRootPrompt(state, input);
    }
    if (turnHash) state.lastRootTurnId = turnHash;
  }, {
    includeRecord: () => true,
  });
  state.indexedTimelineBytes = report.validTimelineBytes;
  state.committedEvents = report.committedEvents;
  state.throughSeq = report.committedEvents;
  state.turnIds = [...turnIds].sort();
  state.turns = state.turnIds.length;
  const baseBytes = directoryLogicalBytes(resolvedSessionDir, { excludeSummary: true });
  return write ? writeSessionSummary(resolvedSessionDir, state, { durable, baseBytes }) : finalizeSize(state, baseBytes);
}

export function rebuildSessionSummary(sessionDir, {
  durable = true,
  lock = true,
  write = true,
} = {}) {
  const resolvedSessionDir = resolve(sessionDir);
  if (!lock) return rebuildUnlocked(resolvedSessionDir, { durable, write });
  return withFileLockSync(join(resolvedSessionDir, SESSION_LOCK_FILE), () => (
    rebuildUnlocked(resolvedSessionDir, { durable, write })
  ));
}

export function inspectSessionSummary(sessionDir) {
  const resolved = resolve(sessionDir);
  const manifest = JSON.parse(readFileSync(join(resolved, 'manifest.json'), 'utf8'));
  const timelinePath = join(resolved, 'timeline.jsonl');
  const timelineBytes = existsSync(timelinePath) ? statSync(timelinePath).size : 0;
  try {
    const summary = readSessionSummary(resolved, { manifest, timelineBytes });
    return { fresh: !!summary, summary };
  } catch (error) {
    return { fresh: false, summary: null, error: error.message };
  }
}

export function summaryPreview(summary) {
  return Array.isArray(summary?.userPrompts)
    ? summary.userPrompts.map((prompt) => prompt.text).filter((text) => typeof text === 'string' && text)
    : [];
}

export function summaryBaseBytes(summary) {
  if (!summary || !Number.isSafeInteger(summary.archiveBytes) || !Number.isSafeInteger(summary.summaryBytes)) return null;
  return summary.archiveBytes - summary.summaryBytes;
}

export function hashTurnId(turnId) {
  return opaqueFingerprint(turnId);
}
