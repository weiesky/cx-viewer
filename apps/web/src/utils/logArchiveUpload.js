import { apiUrl } from './apiUrl.js';

export const MAX_LOG_ARCHIVE_UPLOAD_BYTES = 64 * 1024 * 1024;
export const MAX_LOG_ARCHIVE_RESPONSE_BYTES = 128 * 1024 * 1024;
const ENTRY_DELIMITER = '\n---\n';
const PROGRESS_ENTRY_INTERVAL = 250;
const PROGRESS_TIME_INTERVAL_MS = 100;

async function responseError(response) {
  let detail = '';
  try { detail = await response.text(); } catch {}
  try { detail = JSON.parse(detail)?.error || detail; } catch {}
  const error = new Error(detail || `Log archive upload failed (${response.status})`);
  error.status = response.status;
  throw error;
}

export async function parseLogArchiveResponse(response, {
  onProgress = null,
  maxBytes = MAX_LOG_ARCHIVE_RESPONSE_BYTES,
} = {}) {
  if (!response.ok) return responseError(response);
  if (!response.body?.getReader) throw new Error('Streaming upload response is unavailable');
  const reader = response.body.getReader();
  const declaredBytes = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
    const error = new Error('Parsed log is too large');
    error.code = 'CXV_LOG_ARCHIVE_TOO_LARGE';
    try { await reader.cancel(error); } catch {}
    try { reader.releaseLock(); } catch {}
    throw error;
  }
  const decoder = new TextDecoder();
  const entries = [];
  let carry = '';
  let receivedBytes = 0;
  let lastProgressCount = 0;
  let lastProgressAt = 0;
  const reportProgress = (force = false) => {
    if (!onProgress || entries.length === lastProgressCount) return;
    const now = Date.now();
    if (!force && lastProgressCount !== 0
        && entries.length - lastProgressCount < PROGRESS_ENTRY_INTERVAL
        && now - lastProgressAt < PROGRESS_TIME_INTERVAL_MS) return;
    lastProgressCount = entries.length;
    lastProgressAt = now;
    onProgress(entries.length);
  };
  const consume = (final = false) => {
    let delimiterAt;
    while ((delimiterAt = carry.indexOf(ENTRY_DELIMITER)) !== -1) {
      const raw = carry.slice(0, delimiterAt);
      carry = carry.slice(delimiterAt + ENTRY_DELIMITER.length);
      if (!raw.trim()) continue;
      entries.push(JSON.parse(raw));
      reportProgress();
    }
    if (final && carry.trim()) {
      entries.push(JSON.parse(carry));
      reportProgress();
      carry = '';
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > maxBytes) {
        const error = new Error('Parsed log is too large');
        error.code = 'CXV_LOG_ARCHIVE_TOO_LARGE';
        throw error;
      }
      carry += decoder.decode(value, { stream: true });
      consume(false);
    }
    carry += decoder.decode();
    consume(true);
    reportProgress(true);
    return entries;
  } catch (error) {
    try { await reader.cancel(error); } catch {}
    throw error;
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}

export async function uploadLogArchive(file, {
  fetchImpl = fetch,
  endpoint = apiUrl('/api/parse-log-archive'),
  onProgress = null,
  signal = undefined,
} = {}) {
  if (!file || typeof file.name !== 'string' || !file.name.toLowerCase().endsWith('.zip')) {
    throw new Error('Only .zip log archives are supported');
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_LOG_ARCHIVE_UPLOAD_BYTES) {
    const error = new Error('Log archive is too large (max 64MB)');
    error.code = 'CXV_LOG_ARCHIVE_TOO_LARGE';
    throw error;
  }
  const form = new FormData();
  form.append('file', file);
  const response = await fetchImpl(endpoint, { method: 'POST', body: form, signal });
  return parseLogArchiveResponse(response, { onProgress });
}
