import { join } from 'node:path';
import { homedir } from 'node:os';
import { nativeContextPercent, sumUsageInputTokens, sumUsageContextTokens } from "@cxv/core/context-rules";

export const CONTEXT_WINDOW_FILE = join(homedir(), '.codex', 'context-window.json');

/**
 * Build a context_window SSE event payload from API usage data.
 * @param {object} usage - API response usage object
 * @returns {object|null} context_window event data, or null if usage missing
 */
export function buildContextWindowEvent(usage, window = null) {
  if (!usage) return null;
  const inputTokens = sumUsageInputTokens(usage);
  const outputTokens = usage.output_tokens || 0;
  const totalTokens = sumUsageContextTokens(usage);
  const usedPct = nativeContextPercent(totalTokens, window);
  return {
    total_input_tokens: inputTokens,
    total_output_tokens: outputTokens,
    context_window_size: Number.isSafeInteger(window) && window > 0 ? window : null,
    current_usage: usage,
    used_percentage: usedPct,
    remaining_percentage: usedPct == null ? null : 100 - usedPct,
  };
}
