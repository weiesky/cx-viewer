// 解析 Codex / OpenAI 响应头里的限流信息，归一化成前端血条旁
// 「套餐用量」组件可直接用的结构。
//
// 纯函数、零依赖：仅做字符串 → 数值的安全转换，便于单元测试，也避免被
// ESM 后缀缺失的传递依赖污染（参考 readResultPool 测试注释）。
//
// 数据来源：cx-viewer 拦截器已把响应头原样写进日志(interceptor.js)，前端的
// request.response.headers 即可直接读到，无需任何服务端改动。
//
// Codex 当前源码解析的默认 header family：
//   - x-codex-primary-used-percent / x-codex-primary-window-minutes / x-codex-primary-reset-at
//   - x-codex-secondary-used-percent / x-codex-secondary-window-minutes / x-codex-secondary-reset-at
// 也可能出现 x-{limit-id}-primary-* 的多 limit family。普通 OpenAI API 还可能返回
// x-ratelimit-* headers。解析必须容忍缺失/多余 key。

const LEGACY_PREFIX = 'anthropic-ratelimit-unified-';
const CODEX_PREFIX = 'x-codex-';

// 安全转数值：非有限值（NaN/Infinity/null/空串）一律返回 null，避免污染显示。
function toNum(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// 把 headers 的 key 统一成小写做大小写无关查找（fetch 一般已小写，这里再兜底一次）。
function lowerKeyMap(headers) {
  const map = {};
  for (const k of Object.keys(headers)) map[k.toLowerCase()] = headers[k];
  return map;
}

function toEpochMillis(value) {
  const n = toNum(value);
  return n == null ? null : n * 1000;
}

function openAiResetToMillis(value) {
  if (value == null || value === '') return null;
  const raw = String(value).trim().toLowerCase();
  const epoch = toNum(raw);
  if (epoch != null) return epoch > 1000000000000 ? epoch : epoch * 1000;
  const match = raw.match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/);
  if (!match) return null;
  const n = Number(match[1]);
  const unit = match[2];
  const mult = unit === 'ms' ? 1 : unit === 's' ? 1000 : unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;
  return Date.now() + n * mult;
}

function normalizeLimitId(name) {
  return String(name || 'codex').trim().toLowerCase().replace(/-/g, '_');
}

/**
 * 解析单个窗口（如 '5h' / '7d'）。三项全缺则返回 null（该窗口不存在）。
 * @returns {{id:string, utilization:number|null, status:string|null, resetAt:number|null}|null}
 */
function parseLegacyWindow(map, id) {
  const utilization = toNum(map[`${LEGACY_PREFIX}${id}-utilization`]);
  const resetSec = toNum(map[`${LEGACY_PREFIX}${id}-reset`]);
  const status = map[`${LEGACY_PREFIX}${id}-status`] || null;
  if (utilization == null && resetSec == null && !status) return null;
  return {
    id,
    utilization,                                   // 0~1 占比
    status,                                         // allowed / rejected / queued ...
    resetAt: resetSec != null ? resetSec * 1000 : null, // epoch 秒 → 毫秒
  };
}

function parseLegacyRateLimitHeaders(map) {
  const hasUnified = Object.keys(map).some((k) => k.startsWith(LEGACY_PREFIX));
  if (!hasUnified) return null;

  const windows = [parseLegacyWindow(map, '5h'), parseLegacyWindow(map, '7d')].filter(Boolean);
  if (windows.length === 0) return null;

  return {
    source: 'legacy-plan',
    windows,
    overallStatus: map[`${LEGACY_PREFIX}status`] || null,
    representativeClaim: map[`${LEGACY_PREFIX}representative-claim`] || null,
    overage: {
      status: map[`${LEGACY_PREFIX}overage-status`] || null,
      disabledReason: map[`${LEGACY_PREFIX}overage-disabled-reason`] || null,
    },
    fallbackPercentage: toNum(map[`${LEGACY_PREFIX}fallback-percentage`]),
  };
}

function parseCodexWindow(map, limitPrefix, slot, id, label) {
  const usedPercent = toNum(map[`${limitPrefix}-${slot}-used-percent`]);
  const windowMinutes = toNum(map[`${limitPrefix}-${slot}-window-minutes`]);
  const resetAt = toEpochMillis(map[`${limitPrefix}-${slot}-reset-at`]);
  if (usedPercent == null && windowMinutes == null && resetAt == null) return null;
  return {
    id,
    label,
    utilization: usedPercent == null ? null : usedPercent / 100,
    status: null,
    resetAt,
    windowMinutes,
  };
}

function headerNameToCodexLimitId(headerName) {
  const suffix = '-primary-used-percent';
  if (!headerName.startsWith('x-') || !headerName.endsWith(suffix)) return null;
  return normalizeLimitId(headerName.slice(2, -suffix.length));
}

function parseCodexRateLimitHeaders(map) {
  const limitIds = new Set(['codex']);
  for (const key of Object.keys(map)) {
    const limitId = headerNameToCodexLimitId(key);
    if (limitId) limitIds.add(limitId);
  }

  const windows = [];
  let limitName = null;
  for (const limitId of limitIds) {
    const limitPrefix = `x-${limitId.replace(/_/g, '-')}`;
    const name = map[`${limitPrefix}-limit-name`] || (limitId === 'codex' ? 'Codex' : limitId);
    const primary = parseCodexWindow(map, limitPrefix, 'primary', `${limitId}:primary`, `${name} primary`);
    const secondary = parseCodexWindow(map, limitPrefix, 'secondary', `${limitId}:secondary`, `${name} secondary`);
    if (primary) windows.push(primary);
    if (secondary) windows.push(secondary);
    if ((primary || secondary) && !limitName) limitName = name;
  }

  const hasCredits =
    map[`${CODEX_PREFIX}credits-has-credits`] != null
    || map[`${CODEX_PREFIX}credits-unlimited`] != null
    || map[`${CODEX_PREFIX}credits-balance`] != null;
  if (windows.length === 0 && !hasCredits) return null;

  return {
    source: 'codex',
    windows,
    overallStatus: map[`${CODEX_PREFIX}rate-limit-reached-type`] || null,
    representativeClaim: limitName,
    overage: {
      status: null,
      disabledReason: null,
    },
    fallbackPercentage: null,
    credits: hasCredits ? {
      hasCredits: map[`${CODEX_PREFIX}credits-has-credits`] ?? null,
      unlimited: map[`${CODEX_PREFIX}credits-unlimited`] ?? null,
      balance: map[`${CODEX_PREFIX}credits-balance`] ?? null,
    } : null,
  };
}

function parseOpenAiWindow(map, id, label, limitKey, remainingKey, resetKey) {
  const limit = toNum(map[limitKey]);
  const remaining = toNum(map[remainingKey]);
  const resetAt = openAiResetToMillis(map[resetKey]);
  if (limit == null && remaining == null && resetAt == null) return null;
  const utilization = limit != null && limit > 0 && remaining != null
    ? Math.max(0, Math.min(1, (limit - remaining) / limit))
    : null;
  return {
    id,
    label,
    utilization,
    status: null,
    resetAt,
    limit,
    remaining,
  };
}

function parseOpenAiRateLimitHeaders(map) {
  const windows = [
    parseOpenAiWindow(map, 'requests', 'Requests', 'x-ratelimit-limit-requests', 'x-ratelimit-remaining-requests', 'x-ratelimit-reset-requests'),
    parseOpenAiWindow(map, 'tokens', 'Tokens', 'x-ratelimit-limit-tokens', 'x-ratelimit-remaining-tokens', 'x-ratelimit-reset-tokens'),
  ].filter(Boolean);
  if (windows.length === 0) return null;
  return {
    source: 'openai',
    windows,
    overallStatus: null,
    representativeClaim: null,
    overage: {
      status: null,
      disabledReason: null,
    },
    fallbackPercentage: null,
  };
}

/**
 * 解析限流响应头。
 * @param {Record<string,string>|null|undefined} headers - request.response.headers
 * @returns {null | {
 *   source: 'codex'|'openai'|'legacy-plan',
 *   windows: Array<{id, utilization, status, resetAt}>,
 *   overallStatus: string|null,
  *   representativeClaim: string|null,
 *   overage: { status: string|null, disabledReason: string|null },
 *   fallbackPercentage: number|null,
 * }}
 * 无任何 unified header 时返回 null（调用方据此决定不渲染套餐用量）。
 */
export function parseRateLimitHeaders(headers) {
  if (!headers || typeof headers !== 'object') return null;
  const map = lowerKeyMap(headers);
  return parseCodexRateLimitHeaders(map)
    || parseOpenAiRateLimitHeaders(map)
    || parseLegacyRateLimitHeaders(map);
}

/**
 * 从 requests 列表里取「最近一条带限流头」的响应，解析成套餐用量。
 * 限流头是账号级、随每条响应下发的，所以从后往前找第一条可解析的即可
 * （不依赖 isMainAgent，保持本模块零依赖、可独立单测）。
 * @param {Array} requests
 * @returns {ReturnType<typeof parseRateLimitHeaders>}
 */
export function extractLatestPlanUsage(requests) {
  if (!Array.isArray(requests)) return null;
  for (let i = requests.length - 1; i >= 0; i--) {
    const headers = requests[i] && requests[i].response && requests[i].response.headers;
    if (!headers) continue;
    const pu = parseRateLimitHeaders(headers);
    if (pu) return pu;
  }
  return null;
}

/**
 * 选出「当前绑定」的代表窗口，用于 pill 的主色与主进度。
 * 规则：representative-claim='five_hour' → 5h；明显的周/天 → 7d；
 *      无法识别时回落到使用率更高的窗口（更接近“离限额最近”的语义）。
 */
export function pickHeadlineWindow(planUsage) {
  if (!planUsage || !Array.isArray(planUsage.windows) || planUsage.windows.length === 0) return null;
  const claim = planUsage.representativeClaim;
  let id = null;
  if (claim === 'five_hour') id = '5h';
  else if (claim && /(day|week|7d|seven)/i.test(claim)) id = '7d';
  if (id) {
    const hit = planUsage.windows.find((w) => w.id === id);
    if (hit) return hit;
  }
  return planUsage.windows.reduce((a, b) => ((b.utilization || 0) > (a.utilization || 0) ? b : a));
}
