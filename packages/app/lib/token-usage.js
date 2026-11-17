/** Normalize prompt-cache read/write counters across Codex/OpenAI/legacy logs. */
export function getInputCacheUsage(usage) {
  if (!usage || typeof usage !== 'object') {
    return { read: 0, write: 0, hasCacheDetails: false };
  }
  const details = usage.input_tokens_details || usage.inputTokensDetails;
  const readValue = details?.cached_tokens
    ?? details?.cachedTokens
    ?? usage.cache_read_input_tokens
    ?? usage.cache_read_tokens;
  const writeValue = details?.cache_write_tokens
    ?? details?.cacheWriteTokens
    ?? usage.cache_creation_input_tokens
    ?? usage.cache_write_input_tokens
    ?? usage.cache_write_tokens;
  return {
    read: Number(readValue) || 0,
    write: Number(writeValue) || 0,
    hasCacheDetails: readValue != null || writeValue != null,
  };
}

export function getCachedInputTokens(usage) {
  return getInputCacheUsage(usage).read;
}

export function getCacheWriteTokens(usage) {
  return getInputCacheUsage(usage).write;
}
