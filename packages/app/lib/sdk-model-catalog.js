import { createCodexAppServerClient } from './codex-appserver-client.js';
import { appServerThreadParams, serializeAppServerConfig } from './sdk-appserver-transport.js';

// Query the SAME executable/config as the session. This short-lived catalog
// client never creates/resumes a thread, submits input or changes the transport.
export async function readSdkModelCatalog({ codexPath, cwd, codexOptions = {}, threadOptions = {},
  configOverrides = [], signal, clientFactory = createCodexAppServerClient }) {
  const explicit = appServerThreadParams(cwd, {}, threadOptions).config;
  if (threadOptions.model) explicit.model = threadOptions.model;
  const client = clientFactory({ codexPath, cwd, env: { ...process.env, ...codexOptions.env },
    args: [...serializeAppServerConfig(codexOptions.config || {}),
      ...configOverrides.flatMap(value => ['-c', value]), ...serializeAppServerConfig(explicit)] });
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(() => controller.abort(new Error('Codex model list timed out')), 20000);
  const request = (method, params) => client.request(method, params, { signal: controller.signal, timeoutMs: 20000 });
  try {
    await request('initialize', { clientInfo: { name: 'cx_viewer', version: '1.1.20' } });
    client.notify('initialized');
    const models = [], cursors = new Set(), seen = new Set();
    let cursor, bytes = 0;
    do {
      const page = await request('model/list', { includeHidden: false, limit: 100, ...(cursor ? { cursor } : {}) });
      if (!Array.isArray(page?.data) || (page.nextCursor != null && typeof page.nextCursor !== 'string')) {
        throw new Error('Invalid Codex model list');
      }
      bytes += Buffer.byteLength(JSON.stringify(page));
      if (bytes > 4 * 1024 * 1024 || models.length + page.data.length > 1024) throw new Error('Codex model list exceeds limit');
      for (const item of page.data) {
        if (item?.hidden === true) continue;
        if (typeof item?.model !== 'string' || !item.model || item.model.length > 256
            || /[\x00-\x20\x7f]/.test(item.model) || !Array.isArray(item.supportedReasoningEfforts)) {
          throw new Error('Invalid Codex model');
        }
        if (seen.has(item.model)) continue;
        seen.add(item.model);
        const efforts = item.supportedReasoningEfforts.map(e => {
          if (!/^[a-z][a-z0-9_-]{0,63}$/.test(e?.reasoningEffort || '')) throw new Error('Invalid Codex reasoning effort');
          return { reasoningEffort: e.reasoningEffort, description: String(e.description || '').slice(0, 2048) };
        });
        if (item.defaultReasoningEffort != null && !efforts.some(e => e.reasoningEffort === item.defaultReasoningEffort)) {
          throw new Error('Invalid Codex default reasoning effort');
        }
        models.push({ model: item.model, displayName: String(item.displayName || item.model).slice(0, 256),
          description: String(item.description || '').slice(0, 2048), isDefault: item.isDefault === true,
          supportedReasoningEfforts: efforts, defaultReasoningEffort: item.defaultReasoningEffort || null });
      }
      cursor = page.nextCursor;
      if (cursor != null) {
        if (!cursor || cursors.has(cursor) || cursors.size >= 32) throw new Error('Invalid Codex model cursor');
        cursors.add(cursor);
      }
    } while (cursor != null);
    if (!models.length) throw new Error('Codex returned no available models');
    const result = await request('config/read', { includeLayers: false });
    return { models, configuredModel: result?.config?.model || null,
      configuredReasoningEffort: result?.config?.model_reasoning_effort || null };
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', abort);
    await client.stop();
  }
}
