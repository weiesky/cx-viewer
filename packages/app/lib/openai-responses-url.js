/**
 * The direct OpenAI Responses create endpoint is displayed as the neutral
 * `Master` request type. Keep this URL-only predicate independent from body
 * heuristics so capture, archive, and UI classification cannot drift.
 */
export function isOpenAiResponsesMasterUrl(value) {
  if (typeof value !== 'string' || !value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'api.openai.com'
      && /^\/v1\/responses\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

/** Master identity follows the original captured request URL. */
export function isOpenAiResponsesMasterEntry(entry) {
  return isOpenAiResponsesMasterUrl(entry?.url);
}

/**
 * Conversation projection also guards the effective proxy destination. This
 * preserves the existing transport exclusion without changing request type.
 */
export function hasOpenAiResponsesConversationTransport(entry) {
  return isOpenAiResponsesMasterUrl(entry?.url)
    || isOpenAiResponsesMasterUrl(entry?.proxyUrl);
}
