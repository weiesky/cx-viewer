import { join } from 'node:path';
import { homedir } from 'node:os';
import { CODEX_CONTEXT_WINDOW_TOKENS, sumUsageInputTokens, sumUsageContextTokens } from '../server/lib/context-rules.js';

export const CONTEXT_WINDOW_FILE = join(homedir(), '.codex', 'context-window.json');

/**
 * Build a context_window SSE event payload from API usage data.
 * @param {object} usage - API response usage object
 * @returns {object|null} context_window event data, or null if usage missing
 */
export function buildContextWindowEvent(usage) {
  if (!usage) return null;
  const inputTokens = sumUsageInputTokens(usage);
  const outputTokens = usage.output_tokens || 0;
  const totalTokens = sumUsageContextTokens(usage);
  const usedPct = Math.round((totalTokens / CODEX_CONTEXT_WINDOW_TOKENS) * 100);
  return {
    total_input_tokens: inputTokens,
    total_output_tokens: outputTokens,
    context_window_size: CODEX_CONTEXT_WINDOW_TOKENS,
    current_usage: usage,
    used_percentage: usedPct,
    remaining_percentage: 100 - usedPct,
  };
}
