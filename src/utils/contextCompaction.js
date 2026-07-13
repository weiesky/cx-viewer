import { getResponseInputItems } from '../../lib/openai-body.js';
import { conversationIdsConflict, getEntryUserId, getMainAgentConversationId, getMainAgentSessionKey, isPostClearCheckpoint } from './clearCheckpoint.js';
import { isMainAgent } from './contentFilter.js';
import { projectedPromptFingerprint, projectUserPrompts, sanitizeProjectedUserPrompts } from './userPromptContent.js';

export const CONTEXT_COMPACTION_SUMMARY_LIMIT = 4096;
export const CONTEXT_COMPACTION_EPOCH_STORAGE_KEY = 'cxv_context_compaction_excluded_epoch';

const ABSENT = Object.freeze({ present: false, count: 0, summary: null, truncated: false });
const ABSENT_RECORD = Object.freeze({ ...ABSENT, sourceKey: null, prompts: Object.freeze([]) });
const BIDI_CONTROL_RE = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/;
const RUNTIME_ENTRY_GENERATIONS = new WeakMap();
let nextRuntimeEntryGeneration = 1;

function isDiscardedCodePoint(value) {
  const code = value.codePointAt(0);
  return (code <= 0x08) || code === 0x0b || code === 0x0c
    || (code >= 0x0e && code <= 0x1f) || code === 0x7f
    || BIDI_CONTROL_RE.test(value);
}

function appendBoundedText(state, value, separator = '') {
  if (typeof value !== 'string' || state.truncated) return;
  const trimmed = value.trim();
  if (!trimmed) return;
  let separatorPending = state.chars.length > 0 && separator;
  for (const codePoint of trimmed) {
    if (isDiscardedCodePoint(codePoint)) continue;
    if (separatorPending) {
      if (state.chars.length + 2 > CONTEXT_COMPACTION_SUMMARY_LIMIT) {
        state.truncated = true;
        return;
      }
      state.chars.push(separatorPending);
      separatorPending = '';
    }
    if (state.chars.length >= CONTEXT_COMPACTION_SUMMARY_LIMIT) {
      state.truncated = true;
      return;
    }
    state.chars.push(codePoint);
  }
}

// Compaction payloads are encrypted today. Only a future, explicitly named
// plaintext `summary` field is eligible for display; generic content/text
// fields and neighboring rollout messages are deliberately not inspected.
function readExplicitSummary(item) {
  const state = { chars: [], truncated: false };
  if (!item || typeof item !== 'object' || !Object.hasOwn(item, 'summary')) return state;
  let summary;
  try { summary = item.summary; } catch { return state; }
  if (typeof summary === 'string') {
    appendBoundedText(state, summary);
    return state;
  }
  if (!Array.isArray(summary)) return state;

  for (const block of summary) {
    if (!block || typeof block !== 'object'
        || !Object.hasOwn(block, 'type') || !Object.hasOwn(block, 'text')) continue;
    try {
      if (block.type === 'summary_text' && typeof block.text === 'string') {
        appendBoundedText(state, block.text, '\n');
        if (state.truncated) break;
      }
    } catch { /* malformed/getter-backed protocol data is ignored */ }
  }
  return state;
}

function directCompactionItems(input) {
  const items = [];
  for (let index = 0; index < input.length; index++) {
    const item = input[index];
    if (!item || typeof item !== 'object' || !Object.hasOwn(item, 'type')) continue;
    try {
      if (item.type === 'compaction') items.push({ item, index });
    } catch { /* malformed/getter-backed protocol data is ignored */ }
  }
  return items;
}

function latestMainAgentAnchor(requests, anchorEpoch = null) {
  for (let i = requests.length - 1; i >= 0; i--) {
    if (!isMainAgent(requests[i]) || requests[i]?._otelSource === true) continue;
    if (anchorEpoch && getContextCompactionEpochKey(requests[i]) !== anchorEpoch) continue;
    return { entry: requests[i], index: i };
  }
  return null;
}

function readOwnString(object, key) {
  if (!object || typeof object !== 'object' || !Object.hasOwn(object, key)) return null;
  try {
    const value = object[key];
    return typeof value === 'string' && value ? value : null;
  } catch {
    return null;
  }
}

function compactionSuffix(lastCompaction, count) {
  const itemId = readOwnString(lastCompaction?.item, 'id');
  if (itemId) return `id:${itemId}`;
  const ciphertext = readOwnString(lastCompaction?.item, 'encrypted_content');
  if (ciphertext) {
    return `encrypted:${projectedPromptFingerprint({ segments: [{ type: 'text', text: ciphertext }] })}`;
  }
  // Older/test captures may omit both id and ciphertext. Keep this structural
  // marker payload-free; sourceKeyForIdlessCompaction adds an ingestion-stable
  // generation without inspecting user prompt content in the collapsed UI.
  return `ordinal:${count}:${lastCompaction?.index ?? -1}`;
}

function sourceScope(entry) {
  // `_sessionId` is an internal storage split and is deliberately excluded:
  // one upstream conversation can acquire several internal groups. Conversely,
  // an authoritative session_id must isolate owners even on one shared thread.
  return getMainAgentConversationId(entry) || getMainAgentSessionKey(entry) || 'unscoped';
}

function sourceKeyHasSuffix(sourceKey, suffix) {
  return typeof sourceKey === 'string' && sourceKey.endsWith(`:${suffix}`);
}

function matchingDirectCompaction(input, targetSuffix) {
  const candidates = directCompactionItems(input);
  return candidates.find(candidate => (
    compactionSuffix(candidate, candidates.length) === targetSuffix
  )) || null;
}

function entryGenerationIdentity(entry, currentIndex = null) {
  const timestamp = readOwnString(entry, 'timestamp') || readOwnString(entry, '_generatedTs');
  const stablePosition = Number.isSafeInteger(currentIndex) ? `index:${currentIndex}` : null;
  if (timestamp && stablePosition) return `timestamp:${timestamp}:${stablePosition}`;
  if (entry && typeof entry === 'object') {
    let generation = RUNTIME_ENTRY_GENERATIONS.get(entry);
    if (!generation) {
      generation = nextRuntimeEntryGeneration++;
      RUNTIME_ENTRY_GENERATIONS.set(entry, generation);
    }
    return timestamp ? `timestamp:${timestamp}:runtime:${generation}` : `runtime:${generation}`;
  }
  return stablePosition || 'index:-1';
}

function isCompactionClearBoundary(entry, inspectPayload = true) {
  if (entry?._postClearCheckpoint === true) return true;
  if (inspectPayload) return isPostClearCheckpoint(entry, Number.MAX_SAFE_INTEGER);
  if (!entry || entry._isCheckpoint !== true) return false;
  const input = entry?.body?.input;
  const first = Array.isArray(input) ? input[0] : null;
  if (!first || first.role !== 'user') return false;
  const contentDescriptor = Object.getOwnPropertyDescriptor(first, 'content');
  if (contentDescriptor && !Object.hasOwn(contentDescriptor, 'value')) return true;
  const content = contentDescriptor?.value;
  if (!Array.isArray(content)) return false;
  for (const block of content) {
    if (!block || block.type !== 'text') continue;
    const descriptor = Object.getOwnPropertyDescriptor(block, 'text');
    // Accessor-backed protocol data stays lazy. Treat an unreadable checkpoint
    // marker conservatively as a boundary so an old compaction cannot revive.
    if (descriptor && !Object.hasOwn(descriptor, 'value')) return true;
    if (typeof descriptor?.value === 'string'
        && descriptor.value.includes('<command-name>/clear</command-name>')) return true;
  }
  return false;
}

function previousCompatibleRealEntry(requests, currentIndex, entry, inspectPayload = true) {
  if (!Array.isArray(requests) || !Number.isSafeInteger(currentIndex)) return null;
  for (let i = currentIndex - 1; i >= 0; i--) {
    const candidate = requests[i];
    if (!isMainAgent(candidate) || candidate?._otelSource === true) continue;
    return canBorrowPromptSnapshot(entry, candidate, { inspectPayload }) ? candidate : null;
  }
  return null;
}

function sourceKeyForIdlessCompaction(
  entry,
  suffix,
  fallbackEntries,
  historyContext,
  inspectPayload = true,
) {
  const ownKey = entry?._contextCompaction?.sourceKey;
  if (sourceKeyHasSuffix(ownKey, suffix)) return ownKey;

  // The slimmer stamps every direct marker before releasing its raw input. A
  // consecutive repeat inherits that key; a real marker-less frame intentionally
  // breaks the chain so a later anonymous marker starts a new disclosure epoch.
  const previous = previousCompatibleRealEntry(
    historyContext?.requests,
    historyContext?.currentIndex,
    entry,
    inspectPayload,
  ) || fallbackEntries[fallbackEntries.length - 1] || null;
  if (previous && canBorrowPromptSnapshot(entry, previous, { inspectPayload })) {
    const previousKey = previous?._contextCompaction?.sourceKey;
    if (sourceKeyHasSuffix(previousKey, suffix)) return previousKey;
  }

  const identity = entryGenerationIdentity(entry, historyContext?.currentIndex);
  const generation = projectedPromptFingerprint({
    segments: [{ type: 'text', text: identity }],
  });
  return `${sourceScope(entry)}:generation:${generation}:${suffix}`;
}

function sourceKeyFor(entry, suffix, fallbackEntries = []) {
  // Sparse frames may alternate between session_id+thread_id and thread-only.
  // Reuse the compatible prior owner's key so that one marker has one owner,
  // while canBorrowPromptSnapshot still rejects conflicting authoritative ids.
  for (const sourceEntry of fallbackEntries) {
    if (!canBorrowPromptSnapshot(entry, sourceEntry)) continue;
    const storedKey = sourceEntry?._contextCompaction?.sourceKey;
    if (sourceKeyHasSuffix(storedKey, suffix)) return storedKey;
    if (matchingDirectCompaction(getResponseInputItems(sourceEntry?.body), suffix)) {
      return `${sourceScope(sourceEntry)}:${suffix}`;
    }
  }
  return `${sourceScope(entry)}:${suffix}`;
}

function canBorrowPromptSnapshot(entry, fallbackEntry, { inspectPayload = true } = {}) {
  if (!isMainAgent(fallbackEntry) || fallbackEntry?._otelSource === true
      || isCompactionClearBoundary(entry, inspectPayload)
      || isCompactionClearBoundary(fallbackEntry, inspectPayload)) return false;
  const userId = getEntryUserId(entry);
  const fallbackUserId = getEntryUserId(fallbackEntry);
  if (userId && fallbackUserId && userId !== fallbackUserId) return false;
  const conversationId = getMainAgentConversationId(entry);
  const fallbackConversationId = getMainAgentConversationId(fallbackEntry);
  if (conversationIdsConflict(conversationId, fallbackConversationId)) return false;
  const sessionKey = getMainAgentSessionKey(entry);
  const fallbackSessionKey = getMainAgentSessionKey(fallbackEntry);
  if (sessionKey && fallbackSessionKey) return sessionKey === fallbackSessionKey;
  return !!conversationId && conversationId === fallbackConversationId;
}

function promptFingerprint(prompt) {
  return projectedPromptFingerprint(prompt);
}

function mergePromptSnapshots(previous, current) {
  if (!Array.isArray(previous) || previous.length === 0) return sanitizeProjectedUserPrompts(current);
  if (!Array.isArray(current) || current.length === 0) return sanitizeProjectedUserPrompts(previous);
  const previousKeys = previous.map(promptFingerprint);
  const currentKeys = current.map(promptFingerprint);
  const isPrefix = (prefix, full) => prefix.length <= full.length
    && prefix.every((key, index) => key === full[index]);
  if (isPrefix(currentKeys, previousKeys)) return sanitizeProjectedUserPrompts(previous);
  if (isPrefix(previousKeys, currentKeys)) return sanitizeProjectedUserPrompts(current);
  const maxOverlap = Math.min(previousKeys.length, currentKeys.length);
  let overlap = 0;
  for (let size = maxOverlap; size > 0; size--) {
    let matches = true;
    for (let i = 0; i < size; i++) {
      if (previousKeys[previousKeys.length - size + i] !== currentKeys[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      overlap = size;
      break;
    }
  }
  return sanitizeProjectedUserPrompts([...previous, ...current.slice(overlap)]);
}

function describeCompactions(
  compactions,
  entry,
  fallbackEntry = null,
  includePrompts = true,
  historyContext = null,
) {
  if (!Array.isArray(compactions) || compactions.length === 0) return ABSENT;
  const lastCompaction = compactions[compactions.length - 1];
  const summaryState = readExplicitSummary(lastCompaction.item);
  const fallbackEntries = (Array.isArray(fallbackEntry) ? fallbackEntry : [fallbackEntry]).filter(Boolean);
  const input = getResponseInputItems(entry?.body);
  const suffix = compactionSuffix(lastCompaction, compactions.length);
  const isIdless = suffix.startsWith('ordinal:');
  const sourceKey = isIdless
    ? sourceKeyForIdlessCompaction(entry, suffix, fallbackEntries, historyContext, includePrompts)
    : sourceKeyFor(entry, suffix, fallbackEntries);
  let prompts = [];
  if (includePrompts) {
    const directPrompts = projectUserPrompts(input, lastCompaction.index);
    let fallbackPrompts = [];
    const matchingOwnerIndex = fallbackEntries.findIndex(sourceEntry => {
      if (!canBorrowPromptSnapshot(entry, sourceEntry)) return false;
      const storedSourceKey = sourceEntry?._contextCompaction?.sourceKey;
      // An anonymous marker's ordinal is only structural. Once its generation
      // changes, suffix equality must not classify an older marker as the same
      // owner and cut out the real work between both compactions.
      if (isIdless) return storedSourceKey === sourceKey;
      if (sourceKeyHasSuffix(storedSourceKey, suffix)) return true;
      return !!matchingDirectCompaction(
        getResponseInputItems(sourceEntry?.body),
        suffix,
      );
    });
    // A repeated marker describes the same historical cut. Entries after its
    // prior owner are later work and must never be backfilled into that marker.
    const promptSources = matchingOwnerIndex >= 0
      ? fallbackEntries.slice(0, matchingOwnerIndex + 1)
      : fallbackEntries;
    for (const sourceEntry of promptSources) {
      if (!canBorrowPromptSnapshot(entry, sourceEntry)) continue;
      const sourceInput = getResponseInputItems(sourceEntry?.body);
      const sameStoredOwner = sourceEntry?._contextCompaction?.sourceKey === sourceKey;
      const matchingMarker = (!isIdless || sameStoredOwner)
        ? matchingDirectCompaction(sourceInput, suffix)
        : null;
      const fallbackDirectPrompts = projectUserPrompts(
        sourceInput,
        matchingMarker ? matchingMarker.index : sourceInput.length,
      );
      const fallbackPreservedPrompts = sanitizeProjectedUserPrompts(sourceEntry?._contextCompaction?.prompts);
      const sourcePrompts = mergePromptSnapshots(fallbackPreservedPrompts, fallbackDirectPrompts);
      fallbackPrompts = mergePromptSnapshots(fallbackPrompts, sourcePrompts);
    }
    prompts = mergePromptSnapshots(fallbackPrompts, directPrompts);

    // A live in-progress frame may already carry the authoritative prompt
    // projection captured before its predecessor was slimmed. Keep the larger
    // projection when the finalized replacement contains only a sparse prefix.
    const preservedPrompts = sanitizeProjectedUserPrompts(entry?._contextCompaction?.prompts);
    prompts = mergePromptSnapshots(preservedPrompts, prompts);
  }

  return {
    present: true,
    count: compactions.length,
    summary: summaryState.chars.length > 0 ? summaryState.chars.join('') : null,
    truncated: summaryState.truncated,
    sourceKey,
    prompts,
  };
}

function toDescriptor(record) {
  if (!record?.present) return ABSENT;
  return {
    present: true,
    count: record.count,
    summary: record.summary,
    truncated: record.truncated,
    sourceKey: record.sourceKey || null,
  };
}

/** Capture one atomic compaction marker before entry slimming removes input. */
export function extractDirectContextCompactionRecord(entry, fallbackEntry = null) {
  return describeCompactions(
    directCompactionItems(getResponseInputItems(entry?.body)),
    entry,
    fallbackEntry,
  );
}

export function extractDirectContextCompactionRecordFromHistory(entry, requests, currentIndex) {
  const sources = previousPromptSnapshots(requests, currentIndex, entry);
  return describeCompactions(
    directCompactionItems(getResponseInputItems(entry?.body)),
    entry,
    sources,
    true,
    { requests, currentIndex },
  );
}

/** Capture the existing compact descriptor without exposing prompt payloads. */
export function extractDirectContextCompaction(entry) {
  return toDescriptor(describeCompactions(
    directCompactionItems(getResponseInputItems(entry?.body)),
    entry,
    null,
    false,
  ));
}

function readPreservedContextCompactionRecord(entry, includePrompts = true) {
  const stored = entry?._contextCompaction;
  if (!stored || stored.present !== true || !Number.isSafeInteger(stored.count) || stored.count < 1) {
    return ABSENT_RECORD;
  }
  const summaryState = { chars: [], truncated: false };
  if (typeof stored.summary === 'string' && stored.summary) appendBoundedText(summaryState, stored.summary);
  return {
    present: true,
    count: stored.count,
    summary: summaryState.chars.join('') || null,
    truncated: stored.truncated === true || summaryState.truncated,
    sourceKey: typeof stored.sourceKey === 'string' && stored.sourceKey ? stored.sourceKey : null,
    prompts: includePrompts ? sanitizeProjectedUserPrompts(stored.prompts) : [],
  };
}

export function getContextCompactionEpochKey(entry) {
  if (!entry || typeof entry !== 'object') return null;
  return entry._sessionId || getMainAgentSessionKey(entry) || null;
}

function excludedEpochStorageKey(scope) {
  return scope ? `${CONTEXT_COMPACTION_EPOCH_STORAGE_KEY}:${encodeURIComponent(scope)}` : CONTEXT_COMPACTION_EPOCH_STORAGE_KEY;
}

export function loadExcludedContextCompactionEpoch(scope = null, storage = undefined) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    const value = target?.getItem(excludedEpochStorageKey(scope));
    return typeof value === 'string' && value ? value : null;
  } catch {
    return null;
  }
}

export function saveExcludedContextCompactionEpoch(epoch, scope = null, storage = undefined) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    const key = excludedEpochStorageKey(scope);
    if (epoch) target?.setItem(key, epoch);
    else target?.removeItem(key);
  } catch { /* storage may be unavailable in privacy/sandboxed contexts */ }
}

function previousPromptSnapshots(requests, sourceIndex, sourceEntry) {
  const sources = [];
  for (let i = sourceIndex - 1; i >= 0; i--) {
    const entry = requests[i];
    if (!isMainAgent(entry) || entry?._otelSource === true) continue;
    if (!canBorrowPromptSnapshot(sourceEntry, entry)) break;
    const preservedPrompts = sanitizeProjectedUserPrompts(entry?._contextCompaction?.prompts);
    if (getResponseInputItems(entry?.body).length > 0 || preservedPrompts.length > 0) sources.push(entry);
    if (preservedPrompts.length > 0) break;
  }
  return sources.reverse();
}

function latestCompactionForAnchor(requests, anchor, excludedEpoch, includePrompts = true) {
  const anchorEpoch = getContextCompactionEpochKey(anchor.entry);
  const anchorConversationId = getMainAgentConversationId(anchor.entry);
  const anchorSessionKey = getMainAgentSessionKey(anchor.entry);
  const anchorUserId = getEntryUserId(anchor.entry);
  if (excludedEpoch && anchorEpoch === excludedEpoch) return ABSENT_RECORD;
  if (!anchorConversationId && !anchorSessionKey && !anchorEpoch) return ABSENT_RECORD;

  // A compaction belongs to the MainAgent conversation, not just to the one
  // request snapshot that happened to carry the protocol item. Subsequent
  // snapshots can temporarily omit it (plan windows, deltas, repeat frames),
  // so walk the current upstream session/thread backwards until a real boundary.
  for (let i = anchor.index; i >= 0; i--) {
    const entry = requests[i];
    // OTel mirrors are telemetry projections, not authoritative conversation
    // snapshots. They may omit every durable identity field, so treating one as
    // a boundary makes a real compaction flicker off until the next full frame.
    if (!isMainAgent(entry) || entry?._otelSource === true) continue;

    const epoch = getContextCompactionEpochKey(entry);
    const conversationId = getMainAgentConversationId(entry);
    const sessionKey = getMainAgentSessionKey(entry);
    const userId = getEntryUserId(entry);
    if (anchorUserId && userId && anchorUserId !== userId) break;
    if (conversationIdsConflict(anchorConversationId, conversationId)) break;
    if (anchorSessionKey && sessionKey && anchorSessionKey !== sessionKey) break;
    // Only fall back to the internal epoch when neither side exposes a durable
    // upstream identity. This keeps session-id and thread-only frames in one
    // lane while still bounding legacy/unscoped logs.
    if (!anchorConversationId && !anchorSessionKey && epoch !== anchorEpoch) break;
    if ((anchorConversationId || anchorSessionKey) && !conversationId && !sessionKey
        && epoch !== anchorEpoch) break;
    if (excludedEpoch && epoch === excludedEpoch) break;

    // Check the boundary before inspecting either raw or preserved markers.
    // Legacy/cached clear checkpoints can themselves still carry a compaction
    // snapshot from the previous context; it must never become current again.
    if (isCompactionClearBoundary(entry, includePrompts)) break;

    const direct = describeCompactions(
      directCompactionItems(getResponseInputItems(entry?.body)),
      entry,
      includePrompts ? previousPromptSnapshots(requests, i, entry) : null,
      includePrompts,
      { requests, currentIndex: i },
    );
    if (direct.present) return direct;
    const preserved = readPreservedContextCompactionRecord(entry, includePrompts);
    if (preserved.present) return preserved;

  }
  return ABSENT_RECORD;
}

/**
 * Describe whether the current MainAgent context contains a native Responses
 * `type: "compaction"` item. This never returns encrypted payload data.
 */
export function extractCurrentContextCompaction(requests, {
  suppressed = false,
  excludedEpoch = null,
  anchorEpoch = null,
} = {}) {
  if (suppressed || !Array.isArray(requests) || requests.length === 0) return ABSENT;
  const anchor = latestMainAgentAnchor(requests, anchorEpoch);
  if (!anchor) return ABSENT;

  return toDescriptor(latestCompactionForAnchor(requests, anchor, excludedEpoch, false));
}

/** Resolve the same current compaction together with its user-prompt projection. */
export function extractCurrentContextCompactionRecord(requests, {
  suppressed = false,
  excludedEpoch = null,
  anchorEpoch = null,
} = {}) {
  if (suppressed || !Array.isArray(requests) || requests.length === 0) return ABSENT_RECORD;
  const anchor = latestMainAgentAnchor(requests, anchorEpoch);
  if (!anchor) return ABSENT_RECORD;
  return latestCompactionForAnchor(requests, anchor, excludedEpoch);
}
