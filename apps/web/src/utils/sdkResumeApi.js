import { apiUrl } from './apiUrl.js';

async function request(instanceKey, path, options) {
  if (typeof instanceKey !== 'string' || !instanceKey) throw new Error('SDK workspace is unavailable');
  const response = await fetch(apiUrl(`${path}${path.includes('?') ? '&' : '?'}instance=${encodeURIComponent(instanceKey)}`), options);
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'SDK history request failed'), { code: data.code });
  if (data.instanceKey !== instanceKey) throw Object.assign(new Error('SDK history belongs to a different workspace'), { code: 'SDK_SCOPE_MISMATCH' });
  return data;
}

export function loadSdkResumeSessions(instanceKey, signal, limit = 50) {
  return request(instanceKey, `/api/resume-sessions?limit=${limit}`, { signal });
}

export function restoreSdkResumeSession(instanceKey, file) {
  return request(instanceKey, '/api/resume-session', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instanceKey, file }),
  });
}
