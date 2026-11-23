// CLIENT-SAFE: no node deps. Imported by src/ — do not add fs/process/node: imports.
//
// Model-name estimates below describe capabilities only. The live bar uses
// the owned native thread/turn window; an absent window remains unknown.
export function nativeContextWindow(entry) {
  const native = entry?._appServerSource === true || (entry?._sdkSource === true
    && (entry.body?.metadata?.transport === 'appserver' || entry.response?.body?.context_usage));
  const window = native ? entry.response?.body?.context_window : null;
  return Number.isSafeInteger(window) && window > 0 ? window : null;
}

// SDK exec usage is cumulative accounting. Only the owned rollout snapshot
// describes its active context; never display cumulative usage as occupancy.
export function contextUsageForEntry(entry) {
  return entry?._sdkSource === true && entry.body?.metadata?.transport !== 'appserver'
    ? entry.response?.body?.context_usage || null : entry?.response?.body?.usage || null;
}

function contextForView({ contextWindow, lastMainAgent = null }) {
  if (lastMainAgent) {
    const meta = lastMainAgent.body?.metadata;
    const live = lastMainAgent._sdkSource === true && contextWindow?.source === 'codex-rollout'
      && meta?.thread_id && meta.cwd && meta.instance_key
      && meta?.thread_id === contextWindow.sessionId && meta?.cwd === contextWindow.cwd
      && meta?.instance_key === contextWindow.instanceKey
      && Date.parse(contextWindow.turn_timestamp) >= Date.parse(lastMainAgent.timestamp);
    if (!live) return { usage: contextUsageForEntry(lastMainAgent), window: nativeContextWindow(lastMainAgent) };
  }
  return { usage: contextWindow?.current_usage || null, window: contextWindow?.context_window_size };
}

export function contextUsageForView(options) { return contextForView(options).usage; }

// Codex protocol TokenUsage::percent_of_context_window_remaining: the native
// window is already the usable window (usually 95% of the raw model window).
export function nativeContextPercent(total, window) {
  if (!Number.isSafeInteger(window) || window <= 0
      || !Number.isSafeInteger(total) || total < 0) return null;
  if (window <= 12000) return 100;
  const remaining = Math.max(window - 12000 - Math.max(total - 12000, 0), 0);
  return 100 - Math.min(100, Math.round(remaining / (window - 12000) * 100));
}

export function formatContextUsage(tokens, percent) {
  const value = percent == null ? '—' : `${percent}%`;
  return tokens > 0 ? `${(tokens / 1000).toFixed(1)}K (${value})` : value;
}

// [Nk]/[Nm] 显式窗口后缀,如 gpt-5[1m]、codex-large[200k]、[500k]。
// 显式 opt-in 优先级最高,胜过一切家族规则。
const SIZE_SUFFIX_RE = /\[(\d+)([km])\]/i;

/**
 * 解析模型名里的 [Nk]/[Nm] 窗口后缀。
 * @param {string} modelName
 * @returns {number|null} 解析出的窗口 token 数,无后缀返回 null
 */
export function parseContextSizeSuffix(modelName) {
  if (!modelName || typeof modelName !== 'string') return null;
  const m = modelName.match(SIZE_SUFFIX_RE);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  return m[2].toLowerCase() === 'm' ? num * 1000000 : num * 1000;
}

// 模型家族 → 窗口档位表(有序,首条命中)。后缀解析在表外先行(见 getModelMaxTokens)。
// 仅保留稳定且通用的公开模型族粗略估算,避免从旧项目模型名推断 Codex 窗口。
const MODEL_CONTEXT_SIZES = [
  { match: /codex/i, tokens: 200000 },
  { match: /gpt-4o|o1|o3|o4/i, tokens: 128000 },
  { match: /gpt-4/i, tokens: 128000 },
  { match: /gpt-3/i, tokens: 16000 },
  { match: /deepseek/i, tokens: 128000 },
];

/**
 * 模型名 → 上下文窗口 token 数。后缀优先,其次家族档位表,默认 200K。
 * @param {string|null|undefined} modelName
 * @returns {number}
 */
export function getModelMaxTokens(modelName) {
  if (!modelName) return 200000;
  const suffix = parseContextSizeSuffix(modelName);
  if (suffix) return suffix;
  for (const entry of MODEL_CONTEXT_SIZES) {
    if (entry.match.test(modelName)) return entry.tokens;
  }
  return 200000;
}

/**
 * 输入侧上下文用量(不含 output_tokens)。
 * @param {object|null|undefined} usage
 * @returns {number}
 */
export function sumUsageInputTokens(usage) {
  if (!usage) return 0;
  return usage.input_tokens || 0;
}

/**
 * 血条分子使用原生末轮 total_tokens（缺失时输入+输出），对齐 Codex 的
 * "当前上下文占用"语义(末轮回复已进入下一轮上下文)。
 * @param {object|null|undefined} usage
 * @returns {number}
 */
export function sumUsageContextTokens(usage) {
  if (!usage) return 0;
  return Number.isSafeInteger(usage.total_tokens) && usage.total_tokens >= 0
    ? usage.total_tokens : sumUsageInputTokens(usage) + (usage.output_tokens || 0);
}

// A latest entry with no native window invalidates an older SSE snapshot.
// In particular, never borrow another model/turn's window or cumulative usage.
export function computeContextPercent({ contextWindow, lastMainAgent = null }) {
  const { usage, window } = contextForView({ contextWindow, lastMainAgent });
  return usage ? nativeContextPercent(sumUsageContextTokens(usage), window) : null;
}
