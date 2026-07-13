import { getMainAgentConversationId, getMainAgentSessionKey } from './clearCheckpoint.js';

export const MAX_MODEL_NAME_LENGTH = 256;
export const MAX_SESSION_IDENTITY_LENGTH = 1024;

/**
 * Accept protocol identity strings without letting malformed log fields create
 * unbounded cache keys or labels. Oversized values are rejected, not truncated:
 * truncation could collapse two distinct model/session identities into one.
 */
export function normalizeBoundedIdentity(value, maxLength = MAX_SESSION_IDENTITY_LENGTH) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

export function normalizeModelName(value) {
  return normalizeBoundedIdentity(value, MAX_MODEL_NAME_LENGTH);
}

/**
 * Effective model for one wire entry. The completed upstream response is
 * authoritative under routing/model hot-switch; the request model is available
 * earlier and is therefore the transition-safe fallback.
 */
export function getEffectiveModelName(request) {
  return normalizeModelName(request?.response?.body?.model)
    || normalizeModelName(request?.body?.model)
    || null;
}

function pushCandidate(out, kind, value) {
  const normalized = normalizeBoundedIdentity(value);
  if (!normalized) return;
  const candidate = `${kind}:${normalized}`;
  if (!out.includes(candidate)) out.push(candidate);
}

/**
 * Build strongest-to-weakest identity candidates shared by raw entries and the
 * derived mainAgent session objects. The internal epoch comes first so `/clear`
 * never inherits identity merely because Codex retained the upstream thread id.
 */
export function getSessionIdentityCandidates(source) {
  if (!source || typeof source !== 'object') return [];
  const out = [];
  // Raw entries sometimes use top-level `sessionId` for the upstream protocol
  // id. Only derived session objects (`messages`/`_cold`) own `sessionId` as the
  // viewer's internal epoch; raw entries use the explicit `_sessionId` stamp.
  const isDerivedSession = Object.prototype.hasOwnProperty.call(source, 'messages') || source._cold === true;
  const internalSessionId = source._sessionId ?? (isDerivedSession ? source.sessionId : null);
  pushCandidate(out, 'internal', internalSessionId);

  const conversationId = source.conversationId || (source.body ? getMainAgentConversationId(source) : null);
  pushCandidate(out, 'conversation', conversationId);

  const sessionKey = source.sessionKey || (source.body ? getMainAgentSessionKey(source) : null);
  pushCandidate(out, 'session-key', sessionKey);
  return out;
}

/**
 * Model identity for UI affordances that represent the currently displayed
 * logical session as a whole (role filter, Terminal, live overlay fallback).
 * The last displayed session is the anchor after pin/current-session slicing.
 * Search never crosses its internal epoch (including `/clear`); duplicate
 * hot/cold fragments of the same epoch prefer hydrated data.
 */
export function getDisplayedSessionModelName(sessions, anchorSession = null) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const anchor = anchorSession || sessions[sessions.length - 1];
  if (!anchor || typeof anchor !== 'object') return null;
  const anchorIndex = sessions.lastIndexOf(anchor);
  if (anchorIndex < 0) return normalizeModelName(anchor.modelName);
  const anchorCandidates = getSessionIdentityCandidates(anchor);
  let coldFallback = null;

  for (let index = anchorIndex; index >= 0; index--) {
    const session = sessions[index];
    if (!session || typeof session !== 'object') continue;
    const candidates = getSessionIdentityCandidates(session);
    if (index !== anchorIndex && !sessionIdentityCandidatesMatch(candidates, anchorCandidates)) continue;
    const modelName = normalizeModelName(session.modelName);
    if (!modelName) continue;
    if (!session._cold) return modelName;
    if (!coldFallback) coldFallback = modelName;
  }
  return coldFallback;
}

function normalizedCandidates(candidates) {
  if (!Array.isArray(candidates)) return [];
  const out = [];
  for (const value of candidates) {
    const normalized = normalizeBoundedIdentity(value);
    if (normalized && !out.includes(normalized)) out.push(normalized);
  }
  return out;
}

/**
 * Internal epochs are authoritative when present on both sides. Only legacy
 * data lacking one side's internal id may fall through to conversation/session
 * candidates.
 */
export function sessionIdentityCandidatesMatch(left, right) {
  const a = normalizedCandidates(left);
  const b = normalizedCandidates(right);
  if (a.length === 0 || b.length === 0) return false;

  const aInternal = a.find(value => value.startsWith('internal:'));
  const bInternal = b.find(value => value.startsWith('internal:'));
  if (aInternal && bInternal) return aInternal === bInternal;

  const bSet = new Set(b);
  return a.some(value => bSet.has(value));
}

function lookupIndices(tsToIndex, timestamp) {
  if (!timestamp || !tsToIndex) return [];
  const raw = tsToIndex instanceof Map ? tsToIndex.get(timestamp) : tsToIndex[timestamp];
  if (Number.isInteger(raw) && raw >= 0) return [raw];
  if (!Array.isArray(raw)) return [];
  return raw.filter(index => Number.isInteger(index) && index >= 0);
}

function candidatesAt(candidateArrays, index) {
  return normalizedCandidates(Array.isArray(candidateArrays) ? candidateArrays[index] : null);
}

function modelAt(modelNames, index) {
  return normalizeModelName(Array.isArray(modelNames) ? modelNames[index] : null);
}

function isIndexInSession(candidateArrays, index, targetCandidates) {
  const sourceCandidates = candidatesAt(candidateArrays, index);
  // Old logs can lack identity metadata entirely. If either side is unknown,
  // exact timestamp resolution remains useful; scoped legacy carry does not.
  if (targetCandidates.length === 0 || sourceCandidates.length === 0) return true;
  return sessionIdentityCandidatesMatch(sourceCandidates, targetCandidates);
}

/**
 * Resolve the raw model name that produced a rendered message.
 *
 * Resolution order:
 *  1. assistant `_generatedTs` (the actual producer request);
 *  2. direct carrier timestamp for non-assistant messages;
 *  3. old-log assistant fallback: previous MainAgent in the SAME internal
 *     session, skipping interleaved SubAgent/tool requests;
 *  4. model owned by the rendered session.
 *
 * `tsToIndex` may be a Map or plain object. The parallel arrays deliberately
 * remain presentation-agnostic so ChatView can maintain them incrementally.
 */
export function resolveProducerModelName({
  message = null,
  timestamp = null,
  role = null,
  tsToIndex = null,
  modelNameByReqIdx = [],
  sessionIdentityCandidatesByReqIdx = [],
  mainAgentByReqIdx = [],
  sessionIdentityCandidates = [],
  sessionModelName = null,
} = {}) {
  const messageRole = role || message?.role || null;
  const carrierTimestamp = normalizeBoundedIdentity(timestamp || message?._timestamp);
  const generatedTimestamp = normalizeBoundedIdentity(message?._generatedTs);
  const targetCandidates = normalizedCandidates(sessionIdentityCandidates);

  const exactTimestamp = messageRole === 'assistant'
    ? generatedTimestamp
    : carrierTimestamp;
  const exactIndices = lookupIndices(tsToIndex, exactTimestamp);
  for (let position = exactIndices.length - 1; position >= 0; position--) {
    const exactIndex = exactIndices[position];
    if (!isIndexInSession(sessionIdentityCandidatesByReqIdx, exactIndex, targetCandidates)) continue;
    const exactModel = modelAt(modelNameByReqIdx, exactIndex);
    if (exactModel) return exactModel;
  }

  // A generated timestamp is already the authoritative producer. If it was not
  // resolvable, do not apply the old idx-1 convention to its carrier as well.
  if (messageRole === 'assistant' && !generatedTimestamp) {
    const carrierIndices = lookupIndices(tsToIndex, carrierTimestamp);
    const carrierIndex = [...carrierIndices].reverse().find(index => isIndexInSession(
      sessionIdentityCandidatesByReqIdx,
      index,
      targetCandidates,
    ));
    if (carrierIndex !== undefined) {
      const carrierCandidates = candidatesAt(sessionIdentityCandidatesByReqIdx, carrierIndex);
      const requiredCandidates = targetCandidates.length > 0 ? targetCandidates : carrierCandidates;
      for (let index = carrierIndex - 1; index >= 0; index--) {
        if (Array.isArray(mainAgentByReqIdx) && mainAgentByReqIdx[index] !== true) continue;
        const sourceCandidates = candidatesAt(sessionIdentityCandidatesByReqIdx, index);
        // Legacy carry is intentionally stricter than exact timestamp lookup:
        // without session identity on both sides it cannot safely cross entries.
        if (requiredCandidates.length === 0 || sourceCandidates.length === 0) continue;
        if (!sessionIdentityCandidatesMatch(sourceCandidates, requiredCandidates)) continue;
        const legacyModel = modelAt(modelNameByReqIdx, index);
        if (legacyModel) return legacyModel;
      }
    }
  }

  return normalizeModelName(sessionModelName);
}
