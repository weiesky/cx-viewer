// CLIENT-SAFE: no node deps. Imported by src/ — do not add fs/process/node: imports.
//
// 上下文相关规则唯一事实源(前后端同源):
//   - 血条总量固定为 CODEX_CONTEXT_WINDOW_TOKENS
//   - 模型窗口 helper 仅供 workflow 等非血条视图展示模型能力标签
//
export const CODEX_CONTEXT_WINDOW_TOKENS = 258000;

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
 * cache_creation 兼容求和:flat 字段(cache_creation_input_tokens)存在(非 null/undefined,
 * 0 也算存在)直接用;缺失时回落到新版嵌套对象 usage.cache_creation 的各 TTL 分桶求和
 * (ephemeral_5m_input_tokens + ephemeral_1h_input_tokens,未来新增分桶自动计入)。
 * @param {object|null|undefined} usage API usage 对象
 * @returns {number}
 */
export function sumCacheCreationTokens(usage) {
  if (!usage) return 0;
  if (usage.cache_creation_input_tokens != null) return usage.cache_creation_input_tokens || 0;
  const nested = usage.cache_creation;
  if (nested && typeof nested === 'object') {
    let sum = 0;
    for (const v of Object.values(nested)) {
      if (typeof v === 'number' && Number.isFinite(v)) sum += v;
    }
    return sum;
  }
  return 0;
}

/**
 * 输入侧上下文用量(不含 output_tokens)。用于自适应纠偏判定。
 * @param {object|null|undefined} usage
 * @returns {number}
 */
export function sumUsageInputTokens(usage) {
  if (!usage) return 0;
  return (usage.input_tokens || 0) + sumCacheCreationTokens(usage) + (usage.cache_read_input_tokens || 0);
}

/**
 * 血条分子统一口径:输入侧 + 末轮 output_tokens,对齐 Codex /context 的
 * "当前上下文占用"语义(末轮回复已进入下一轮上下文)。
 * @param {object|null|undefined} usage
 * @returns {number}
 */
export function sumUsageContextTokens(usage) {
  if (!usage) return 0;
  return sumUsageInputTokens(usage) + (usage.output_tokens || 0);
}
