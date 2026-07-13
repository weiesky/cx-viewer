import { getResponseInputItems } from '../../lib/openai-body.js';
import { getMainAgentConversationId, getMainAgentSessionKey, isPostClearCheckpoint } from './clearCheckpoint.js';
import { isMainAgent } from './contentFilter.js';

export const CONTEXT_COMPACTION_SUMMARY_LIMIT = 4096;
export const CONTEXT_COMPACTION_EPOCH_STORAGE_KEY = 'cxv_context_compaction_excluded_epoch';

const ABSENT = Object.freeze({ present: false, count: 0, summary: null, truncated: false });
const BIDI_CONTROL_RE = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/;

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
  for (const item of input) {
    if (!item || typeof item !== 'object' || !Object.hasOwn(item, 'type')) continue;
    try {
      if (item.type === 'compaction') items.push(item);
    } catch { /* malformed/getter-backed protocol data is ignored */ }
  }
  return items;
}

function latestMainAgentAnchor(requests, anchorEpoch = null) {
  for (let i = requests.length - 1; i >= 0; i--) {
    if (!isMainAgent(requests[i])) continue;
    if (anchorEpoch && getContextCompactionEpochKey(requests[i]) !== anchorEpoch) continue;
    return { entry: requests[i], index: i };
  }
  return null;
}

function describeCompactions(compactions) {
  if (!Array.isArray(compactions) || compactions.length === 0) return ABSENT;
  const summaryState = readExplicitSummary(compactions[compactions.length - 1]);
  if (summaryState.chars.length === 0) {
    return { present: true, count: compactions.length, summary: null, truncated: false };
  }
  return {
    present: true,
    count: compactions.length,
    summary: summaryState.chars.join(''),
    truncated: summaryState.truncated,
  };
}

/** Capture a safe, bounded marker before entry slimming removes body.input. */
export function extractDirectContextCompaction(entry) {
  return describeCompactions(directCompactionItems(getResponseInputItems(entry?.body)));
}

function readPreservedContextCompaction(entry) {
  const stored = entry?._contextCompaction;
  if (!stored || stored.present !== true || !Number.isSafeInteger(stored.count) || stored.count < 1) {
    return ABSENT;
  }
  if (typeof stored.summary !== 'string' || !stored.summary) {
    return { present: true, count: stored.count, summary: null, truncated: false };
  }
  const summaryState = { chars: [], truncated: false };
  appendBoundedText(summaryState, stored.summary);
  return {
    present: true,
    count: stored.count,
    summary: summaryState.chars.join('') || null,
    truncated: stored.truncated === true || summaryState.truncated,
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

function latestCompactionForAnchor(requests, anchor, excludedEpoch) {
  const anchorEpoch = getContextCompactionEpochKey(anchor.entry);
  const anchorConversationId = getMainAgentConversationId(anchor.entry);
  if (excludedEpoch && anchorEpoch === excludedEpoch) return ABSENT;
  if (!anchorConversationId && !anchorEpoch) return ABSENT;

  // A compaction belongs to the MainAgent conversation, not just to the one
  // request snapshot that happened to carry the protocol item. Subsequent
  // snapshots can temporarily omit it (plan windows, deltas, repeat frames),
  // so walk the current upstream session/thread backwards until a real boundary.
  for (let i = anchor.index; i >= 0; i--) {
    const entry = requests[i];
    if (!isMainAgent(entry)) continue;

    const epoch = getContextCompactionEpochKey(entry);
    const conversationId = getMainAgentConversationId(entry);
    if (anchorConversationId) {
      if (conversationId && conversationId !== anchorConversationId) break;
      if (!conversationId && epoch !== anchorEpoch) break;
    } else if (epoch !== anchorEpoch) {
      break;
    }
    if (excludedEpoch && epoch === excludedEpoch) break;

    const direct = extractDirectContextCompaction(entry);
    if (direct.present) return direct;
    const preserved = readPreservedContextCompaction(entry);
    if (preserved.present) return preserved;

    // A recorded post-/clear checkpoint is an explicit context boundary even
    // when the upstream thread id itself remains unchanged.
    if (isPostClearCheckpoint(entry, Number.MAX_SAFE_INTEGER)) break;
  }
  return ABSENT;
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

  return latestCompactionForAnchor(requests, anchor, excludedEpoch);
}
