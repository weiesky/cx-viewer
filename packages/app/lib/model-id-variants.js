const MODEL_ID_ALIASES = {
  k3: ['k3', 'kimi-k3', 'kimi'],
  'deepseek-flash': ['deepseek-flash', 'deepseek-v4-flash'],
};

// Keep the fixed upstream alias boundaries and prototype-safe lookup. A trailing
// routing/window suffix must not prevent a user entry from matching its model.
export function expandModelIdVariants(modelId) {
  if (!modelId || typeof modelId !== 'string') return [];
  const id = modelId.replace(/\s*\[[^\]]*\]$/, '').toLowerCase();
  const aliasId = /^k3(?:[.-]|$)/.test(id) ? 'k3' : id;
  return Object.hasOwn(MODEL_ID_ALIASES, aliasId) ? MODEL_ID_ALIASES[aliasId] : [id];
}
