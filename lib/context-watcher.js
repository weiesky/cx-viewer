import { join } from 'node:path';
import { homedir } from 'node:os';
import { CODEX_CONTEXT_WINDOW_TOKENS, sumUsageInputTokens, sumUsageContextTokens } from '../server/lib/context-rules.js';

export const CONTEXT_WINDOW_FILE = join(homedir(), '.codex', 'context-window.json');

/**
 * Build a context_window SSE event payload from API usage data.
 * @param {object} usage - API response usage object
 * @param {number} contextSize - total context window size in tokens
 * @returns {object|null} context_window event data, or null if usage missing
 */
export function buildContextWindowEvent(usage, contextSize) {
  if (!usage) return null;
  const fixedContextSize = contextSize || CODEX_CONTEXT_WINDOW_TOKENS;
  const inputTokens = sumUsageInputTokens(usage);
  const outputTokens = usage.output_tokens || 0;
  const totalTokens = sumUsageContextTokens(usage);
  const usedPct = Math.round((totalTokens / fixedContextSize) * 100);
  return {
    total_input_tokens: inputTokens,
    total_output_tokens: outputTokens,
    context_window_size: fixedContextSize,
    current_usage: usage,
    used_percentage: usedPct,
    remaining_percentage: 100 - usedPct,
  };
}
