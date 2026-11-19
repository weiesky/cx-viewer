import { isSessionDividerBoundary } from './sessionManager.js';

/** First timestamp covered by a hot or cold session fragment. */
export function getSessionFragmentStartTs(session) {
  if (!session) return null;
  return session.messages?.[0]?._timestamp
    || session.firstTs
    || session.entryTimestamp
    || null;
}

/**
 * Return the latest logical epoch. Visible dividers deliberately use the
 * authoritative upstream conversation id, but current-only/pin semantics must
 * still follow internal epochs such as a successful /clear checkpoint.
 */
export function getCurrentConversationStartIndex(sessions, anchorSession = null) {
  if (!Array.isArray(sessions) || sessions.length === 0) return 0;
  const index = anchorSession ? sessions.lastIndexOf(anchorSession) : -1;
  return index >= 0 ? index : sessions.length - 1;
}

/**
 * Start index for the compact live window: the current logical session plus
 * the immediately preceding one. Keeping this separate from
 * getCurrentConversationStartIndex lets callers still identify the true live
 * session for streaming and chronology boundaries.
 */
export function getCurrentConversationWindowStartIndex(sessions, anchorSession = null) {
  const currentIndex = getCurrentConversationStartIndex(sessions, anchorSession);
  return Math.max(0, currentIndex - 1);
}

/** True on the one parent-prop transition that finishes a non-empty history load. */
export function didFinishConversationHydration(prevFileLoading, fileLoading, sessions) {
  return prevFileLoading === true
    && fileLoading === false
    && Array.isArray(sessions)
    && sessions.length > 0;
}

/**
 * Find the earliest usable timestamp in one visible conversation group. Cold
 * placeholders expose `firstTs`; hot fragments expose messages[0]._timestamp.
 */
export function getConversationGroupStartTs(sessions, startIndex) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  for (let i = Math.max(0, startIndex); i < sessions.length; i++) {
    if (i > startIndex && isSessionDividerBoundary(sessions[i - 1], sessions[i])) break;
    const timestamp = getSessionFragmentStartTs(sessions[i]);
    if (timestamp) return timestamp;
  }
  return null;
}

/**
 * Chronological insertion follows every immediate fragment boundary, even
 * when that boundary is intentionally hidden from the visible Session divider.
 */
export function getImmediateFragmentUpperBound(sessions, index, fallback = null) {
  const next = Array.isArray(sessions) ? sessions[index + 1] : null;
  return getSessionFragmentStartTs(next) || fallback || null;
}
