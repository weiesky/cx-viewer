import { assembleEntryParts, applyInputOperations } from './entry-codec.js';
import {
  LOG_V2_WIRE_KINDS,
  LOG_V2_WIRE_VERSION,
  sameWireArchive,
  validateWireArchive,
  validateWireCheckpoint,
  validateWireInputLocator,
  validateWireObjectRef,
} from './wire-schema.js';

function fail(message, code = 'CXV_LOG_V2_WIRE_INVALID') {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function entryStateKey(threadId, entryKey) {
  return `${threadId}\u0000${entryKey}`;
}

function copyRef(ref) {
  const result = validateWireObjectRef(ref);
  if (!result.ok) fail(result.errors.join('; '));
  return Object.freeze({ hash: ref.hash, bytes: ref.bytes });
}

function refsEqual(left, right) {
  return left?.hash === right?.hash && left?.bytes === right?.bytes;
}

function applyEntryRevision(previous, revision) {
  if (!Number.isSafeInteger(revision?.revision) || revision.revision <= 0
      || !Number.isSafeInteger(revision?.baseRevision) || revision.baseRevision < 0) {
    fail('invalid entry revision');
  }
  if (revision.upsert === true) {
    if ((revision.delete || []).length > 0) fail('self-contained entry upsert must not delete parts');
    if (previous.revision > 0 && revision.revision !== previous.revision + 1) {
      fail('self-contained entry upsert revision is not monotonic', 'CXV_LOG_V2_WIRE_GAP');
    }
    return {
      revision: revision.revision,
      parts: new Map(Object.entries(revision.set || {}).map(([part, ref]) => [part, copyRef(ref)])),
    };
  }
  if (revision.baseRevision !== previous.revision || revision.revision !== previous.revision + 1) {
    fail('entry revision chain mismatch', 'CXV_LOG_V2_WIRE_GAP');
  }
  const parts = new Map(previous.parts);
  for (const part of revision.delete || []) parts.delete(part);
  for (const [part, ref] of Object.entries(revision.set || {})) parts.set(part, copyRef(ref));
  return { revision: revision.revision, parts };
}

function applyThreadRevision(previous, binding, input) {
  if (!binding) return previous;
  if (!Number.isSafeInteger(binding.revision) || binding.revision < 0 || typeof binding.path !== 'string') {
    fail('invalid input binding');
  }
  if (!binding.changed) {
    if (binding.revision !== previous.revision || binding.path !== previous.path) {
      fail('unchanged input binding mismatch', 'CXV_LOG_V2_WIRE_GAP');
    }
    return previous;
  }
  if (!input || input.revision !== binding.revision || input.path !== binding.path) {
    fail('input revision is missing or does not match its binding');
  }
  if (input.baseRevision !== previous.revision || input.revision !== previous.revision + 1) {
    fail('input revision chain mismatch', 'CXV_LOG_V2_WIRE_GAP');
  }
  const append = (input.append || []).map(copyRef);
  if (!Number.isSafeInteger(input.retain) || input.retain < 0 || input.retain > previous.length
      || !Number.isSafeInteger(input.remove) || input.remove < 0
      || input.retain + input.remove !== previous.length) {
    fail('invalid input retain/remove operation');
  }
  const node = Object.freeze({
    revision: input.revision,
    baseRevision: input.baseRevision,
    path: input.path,
    retain: input.retain,
    remove: input.remove,
    append: Object.freeze(append),
  });
  // Keep preparation side-effect free. The caller installs pendingNode only
  // after every remaining frame/descriptor validation succeeds, retaining O(1)
  // append cost without allowing a rejected commit to poison thread state.
  return {
    revision: node.revision,
    path: node.path,
    length: node.retain + node.append.length,
    nodes: previous.nodes,
    resolvedRevision: previous.resolvedRevision,
    resolvedRefs: previous.resolvedRefs,
    pendingNode: node,
  };
}

function validateCommitFrame(state, frame) {
  if (frame?.kind !== LOG_V2_WIRE_KINDS.commit || frame.version !== LOG_V2_WIRE_VERSION) {
    fail('invalid V2 wire commit envelope');
  }
  if (!sameWireArchive(state.archive, frame.archive)) {
    fail('V2 wire archive generation mismatch', 'CXV_LOG_V2_WIRE_RESET_REQUIRED');
  }
  const timeline = frame.timeline;
  if (!Number.isSafeInteger(timeline?.seq) || timeline.seq <= 0
      || typeof timeline.eventId !== 'string' || !timeline.eventId
      || typeof timeline.threadId !== 'string' || !timeline.threadId
      || typeof timeline.entryKey !== 'string' || !timeline.entryKey) {
    fail('invalid V2 wire timeline metadata');
  }
}

export function createWireArchiveState(archive) {
  const validation = validateWireArchive(archive);
  if (!validation.ok) throw new TypeError(validation.errors.join('; '));
  return {
    archive: Object.freeze({ ...archive }),
    throughSeq: 0,
    timelineBytes: 0,
    commits: new Map(),
    entries: new Map(),
    threads: new Map(),
    winners: new Map(),
  };
}

export function applyWireCommit(state, frame) {
  validateCommitFrame(state, frame);
  const { timeline, entry, input = null } = frame;
  const existing = state.commits.get(timeline.seq);
  if (existing) {
    if (existing.eventId !== timeline.eventId) {
      fail('conflicting V2 wire commit at an existing sequence', 'CXV_LOG_V2_WIRE_CONFLICT');
    }
    return existing.descriptor;
  }
  if (timeline.seq !== state.throughSeq + 1) {
    fail(`V2 wire sequence gap at ${state.throughSeq + 1}`, 'CXV_LOG_V2_WIRE_GAP');
  }
  if (entry?.entryKey !== timeline.entryKey || entry?.revision !== timeline.entryRevision) {
    fail('entry revision does not match timeline metadata');
  }

  const key = entryStateKey(timeline.threadId, timeline.entryKey);
  const previousEntry = state.entries.get(key) || { revision: 0, parts: new Map() };
  const nextEntry = applyEntryRevision(previousEntry, entry);
  if ((entry.inputBinding?.revision ?? 0) !== (timeline.inputRevision ?? 0)) {
    fail('timeline input revision mismatch');
  }
  const previousThread = state.threads.get(timeline.threadId) || {
    revision: 0, path: null, length: 0, nodes: new Map(), resolvedRevision: 0, resolvedRefs: [],
  };
  const nextThread = applyThreadRevision(previousThread, entry.inputBinding || null, input);

  const descriptor = Object.freeze({
    archive: state.archive,
    seq: timeline.seq,
    eventId: timeline.eventId,
    txnId: timeline.txnId || null,
    timestamp: timeline.timestamp || null,
    committedAt: timeline.committedAt || null,
    threadId: timeline.threadId,
    parentThreadId: timeline.parentThreadId ?? null,
    agentRole: timeline.agentRole || null,
    turnId: timeline.turnId ?? null,
    phase: timeline.phase || null,
    entryKey: timeline.entryKey,
    entryRevision: entry.revision,
    parts: nextEntry.parts,
    input: entry.inputBinding
      ? Object.freeze({ threadId: timeline.threadId, path: nextThread.path, revision: nextThread.revision, length: nextThread.length })
      : null,
  });
  if (descriptor.input) {
    const locator = validateWireInputLocator(descriptor.input);
    if (!locator.ok) fail(locator.errors.join('; '));
  }

  state.entries.set(key, nextEntry);
  if (entry.inputBinding) {
    if (nextThread.pendingNode) nextThread.nodes.set(nextThread.pendingNode.revision, nextThread.pendingNode);
    const { pendingNode: _pendingNode, ...committedThread } = nextThread;
    state.threads.set(timeline.threadId, committedThread);
  }
  // V2 winners use later physical commit order, not Map's original slot.
  if (state.winners.has(timeline.entryKey)) state.winners.delete(timeline.entryKey);
  state.winners.set(timeline.entryKey, descriptor);
  state.commits.set(timeline.seq, Object.freeze({ eventId: timeline.eventId, descriptor }));
  while (state.commits.size > 1024) state.commits.delete(state.commits.keys().next().value);
  state.throughSeq = timeline.seq;
  if (Number.isSafeInteger(frame.timelineBytes) && frame.timelineBytes >= state.timelineBytes) {
    state.timelineBytes = frame.timelineBytes;
  }
  return descriptor;
}

function serializeDescriptor(descriptor) {
  return Object.freeze({
    ...descriptor,
    archive: descriptor.archive,
    parts: Object.freeze(Object.fromEntries(descriptor.parts)),
    input: descriptor.input ? Object.freeze({ ...descriptor.input }) : null,
  });
}

function restoreDescriptor(value, archive) {
  return Object.freeze({
    ...value,
    archive,
    parts: new Map(Object.entries(value.parts || {}).map(([part, ref]) => [part, copyRef(ref)])),
    input: value.input ? Object.freeze({ ...value.input }) : null,
  });
}

export function checkpointWireArchiveState(state, { winnerSeqs = null, includeEntries = true } = {}) {
  return Object.freeze({
    kind: LOG_V2_WIRE_KINDS.checkpoint,
    version: LOG_V2_WIRE_VERSION,
    archive: state.archive,
    throughSeq: state.throughSeq,
    timelineBytes: state.timelineBytes,
    entries: Object.freeze((includeEntries ? [...state.entries] : []).map(([key, value]) => Object.freeze({
      key,
      revision: value.revision,
      parts: Object.freeze(Object.fromEntries(value.parts)),
    }))),
    threads: Object.freeze([...state.threads].map(([threadId, value]) => Object.freeze({
      threadId,
      revision: value.revision,
      path: value.path,
      length: value.length,
      nodes: Object.freeze([...value.nodes.values()].map(node => Object.freeze({
        ...node,
        append: Object.freeze([...node.append]),
      }))),
    }))),
    winners: Object.freeze([...state.winners]
      .filter(([, descriptor]) => !winnerSeqs || winnerSeqs.has(descriptor.seq))
      .map(([entryKey, descriptor]) => Object.freeze({
        entryKey,
        descriptor: serializeDescriptor(descriptor),
      }))),
  });
}

export function restoreWireArchiveState(checkpoint) {
  const validation = validateWireCheckpoint(checkpoint);
  if (!validation.ok) fail(validation.errors.join('; '));
  const state = createWireArchiveState(checkpoint.archive);
  state.throughSeq = checkpoint.throughSeq;
  state.timelineBytes = checkpoint.timelineBytes;
  for (const entry of checkpoint.entries || []) {
    state.entries.set(entry.key, {
      revision: entry.revision,
      parts: new Map(Object.entries(entry.parts || {}).map(([part, ref]) => [part, copyRef(ref)])),
    });
  }
  for (const thread of checkpoint.threads || []) {
    const nodes = new Map();
    let expectedRevision = 1;
    let length = 0;
    let path = null;
    for (const raw of thread.nodes || []) {
      if (raw.revision !== expectedRevision || raw.baseRevision !== expectedRevision - 1
          || raw.retain + raw.remove !== length) fail('invalid checkpoint input revision chain');
      const node = Object.freeze({
        ...raw,
        append: Object.freeze((raw.append || []).map(copyRef)),
      });
      nodes.set(node.revision, node);
      length = node.retain + node.append.length;
      path = node.path;
      expectedRevision++;
    }
    if (thread.revision !== expectedRevision - 1 || thread.length !== length || thread.path !== path) {
      fail('checkpoint thread watermark mismatch');
    }
    state.threads.set(thread.threadId, {
      revision: thread.revision,
      path: thread.path,
      length,
      nodes,
      resolvedRevision: 0,
      resolvedRefs: [],
    });
  }
  for (const winner of checkpoint.winners || []) {
    const descriptor = restoreDescriptor(winner.descriptor, state.archive);
    state.winners.set(winner.entryKey, descriptor);
  }
  return state;
}

export function resolveWireInputRefs(state, input) {
  if (!input) return [];
  const thread = state?.threads?.get(input.threadId);
  if (!thread || input.revision > thread.revision || input.revision < 0) {
    fail('input revision is unavailable', 'CXV_LOG_V2_WIRE_GAP');
  }
  let revision = thread.resolvedRevision;
  let refs = thread.resolvedRefs;
  if (revision > input.revision) {
    revision = 0;
    refs = [];
  }
  while (revision < input.revision) {
    const node = thread.nodes.get(revision + 1);
    if (!node) fail('input revision chain is incomplete', 'CXV_LOG_V2_WIRE_GAP');
    refs = applyInputOperations(refs, node);
    revision = node.revision;
  }
  if (revision >= thread.resolvedRevision) {
    thread.resolvedRevision = revision;
    thread.resolvedRefs = refs;
  }
  if (refs.length !== input.length) fail('input locator length mismatch');
  return refs;
}

export function materializeWireDescriptor(descriptor, resolveObject, { state = null, inputRefs = null } = {}) {
  if (!descriptor || typeof resolveObject !== 'function') throw new TypeError('descriptor and object resolver are required');
  const parts = new Map();
  for (const [part, ref] of descriptor.parts) parts.set(part, resolveObject(ref));
  const refs = descriptor.input ? (inputRefs || resolveWireInputRefs(state, descriptor.input)) : [];
  const input = descriptor.input
    ? { path: descriptor.input.path, items: refs.map(resolveObject) }
    : null;
  return assembleEntryParts(parts, input);
}

export function equalWireRef(left, right) {
  return refsEqual(left, right);
}
