import { createCodexAppServerClient } from './codex-appserver-client.js';
import { appServerThreadParams, serializeAppServerConfig } from './sdk-appserver-transport.js';

// Keep only quota fields. Account identity, tokens and arbitrary RPC fields
// never enter the browser response or the conversation archive.
export function sdkPlanUsage(result) {
  const buckets = new Map();
  const add = (value, fallback) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const id = value.limitId ?? fallback;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) return;
    buckets.set(id, value);
  };
  add(result?.rateLimits, 'codex');
  if (result?.rateLimitsByLimitId && typeof result.rateLimitsByLimitId === 'object') {
    const entries = Object.entries(result.rateLimitsByLimitId);
    if (entries.length > 64) throw new Error('Too many Codex quota buckets');
    for (const [id, value] of entries) add(value, id);
  }
  const windows = [];
  let planType = null;
  for (const [id, bucket] of [...buckets].sort(([a], [b]) => a === b ? 0 : a === 'codex' ? -1 : b === 'codex' ? 1 : a.localeCompare(b))) {
    for (const slot of ['primary', 'secondary']) {
      const w = bucket[slot];
      if (typeof w?.usedPercent !== 'number' || !Number.isFinite(w.usedPercent) || w.usedPercent < 0) continue;
      const minutes = Number.isSafeInteger(w.windowDurationMins) && w.windowDurationMins > 0 ? w.windowDurationMins : null;
      const resetAt = Number.isSafeInteger(w.resetsAt) && w.resetsAt > 0 && w.resetsAt <= 8640000000000 ? w.resetsAt * 1000 : null;
      if (w.usedPercent === 0 && minutes === null && resetAt === null) continue;
      const name = typeof bucket.limitName === 'string' && bucket.limitName.trim() ? bucket.limitName.trim().slice(0, 128) : id === 'codex' ? 'Codex' : id;
      windows.push({ id: `${id}:${slot}`, label: `${name} ${slot}`, slot,
        utilization: w.usedPercent / 100, windowMinutes: minutes, resetAt });
      if (!planType && typeof bucket.planType === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(bucket.planType)) planType = bucket.planType;
    }
  }
  return windows.length ? { source: 'codex', windows, planType } : null;
}

// A read-only sidecar uses the session's executable, cwd and config. It never
// creates a thread or changes exec/appserver transport ownership.
export async function readSdkPlanUsage({ codexPath, cwd, codexOptions = {}, threadOptions = {},
  configOverrides = [], signal, clientFactory = createCodexAppServerClient }) {
  signal?.throwIfAborted();
  const client = clientFactory({ codexPath, cwd, env: { ...process.env, ...codexOptions.env },
    args: [...serializeAppServerConfig(codexOptions.config || {}),
      ...configOverrides.flatMap(value => ['-c', value]),
      ...serializeAppServerConfig(appServerThreadParams(cwd, {}, threadOptions).config)] });
  const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000);
  const request = (method, params = {}) => client.request(method, params, { signal: requestSignal, timeoutMs: 20000 });
  try {
    await request('initialize', { clientInfo: { name: 'cx_viewer', version: '1.1.20' } });
    client.notify('initialized');
    const auth = await request('account/read', { refreshToken: false });
    // API-key/custom-provider sessions have no ChatGPT subscription quota.
    if (auth?.account?.type !== 'chatgpt' || auth.requiresOpenaiAuth !== true) return null;
    return sdkPlanUsage(await request('account/rateLimits/read'));
  } finally {
    await client.stop();
  }
}
