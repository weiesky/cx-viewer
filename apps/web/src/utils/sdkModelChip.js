import { apiUrl } from './apiUrl.js';

// Keep the existing proxy editor for explicit profile rewrites. Native SDK
// selection fills its composer slot, including a previously unknown default.
export function shouldRenderSdkModelChip({ sdkMode, proxyChipVisible }) {
  return !!sdkMode && !proxyChipVisible;
}

export async function requestSdkModels({ instanceKey, selection, signal } = {}) {
  const expected = instanceKey || new URLSearchParams(window.location.search).get('instance');
  const path = selection ? '/api/sdk-model' : '/api/sdk-models';
  const response = await fetch(apiUrl(`${path}${expected ? `?instance=${encodeURIComponent(expected)}` : ''}`), {
    signal, ...(selection ? { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...selection, instanceKey: expected }) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Could not load Codex models'), { code: data.code });
  if (typeof data.instanceKey !== 'string' || !data.instanceKey || (expected && data.instanceKey !== expected)) {
    throw new Error('Model selection belongs to a different workspace');
  }
  if (!Array.isArray(data.models) || typeof data.revision !== 'string') throw new Error('Invalid Codex model list');
  return data;
}
