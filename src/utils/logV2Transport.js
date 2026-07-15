import { apiUrl } from './apiUrl.js';
import {
  LOG_V2_WIRE_KINDS,
  LOG_V2_WIRE_LIMITS,
  LOG_V2_WIRE_VERSION,
} from '../../lib/log-v2/wire-schema.js';

export async function readNdjsonResponse(response, onValue = null, { collect = true } = {}) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error || `HTTP ${response.status}`);
    error.code = payload.code || null;
    error.status = response.status;
    throw error;
  }
  const values = [];
  const fragments = new Map();
  const emit = (value) => {
    if (typeof value?.kind === 'string' && value.kind.startsWith('cx-viewer.log-v2-wire.')
        && value.version !== LOG_V2_WIRE_VERSION) throw new Error('Unsupported V2 wire protocol version');
    if (value?.kind === LOG_V2_WIRE_KINDS.fragmentStart) {
      if (!Number.isSafeInteger(value.parts) || value.parts <= 0 || value.parts > 4096
          || !Number.isSafeInteger(value.bytes) || value.bytes < 0
          || value.bytes > LOG_V2_WIRE_LIMITS.maxFragmentedControlBytes
          || typeof value.id !== 'string' || !value.id || fragments.has(value.id)) {
        throw new Error('Invalid V2 fragment header');
      }
      fragments.set(value.id, { parts: new Array(value.parts), bytes: value.bytes });
      return;
    }
    if (value?.kind === LOG_V2_WIRE_KINDS.fragmentPart) {
      const fragment = fragments.get(value.id);
      if (!fragment || !Number.isSafeInteger(value.index) || value.index < 0
          || value.index >= fragment.parts.length || fragment.parts[value.index] !== undefined
          || typeof value.data !== 'string') {
        throw new Error('Invalid V2 control fragment');
      }
      fragment.parts[value.index] = value.data;
      return;
    }
    if (value?.kind === LOG_V2_WIRE_KINDS.fragmentEnd) {
      const fragment = fragments.get(value.id);
      if (!fragment || fragment.parts.filter(part => typeof part === 'string').length !== fragment.parts.length) {
        throw new Error('Incomplete V2 control fragment');
      }
      fragments.delete(value.id);
      const binary = globalThis.atob(fragment.parts.join(''));
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      if (bytes.byteLength !== fragment.bytes) throw new Error('V2 control fragment byte length mismatch');
      emit(JSON.parse(new TextDecoder().decode(bytes)));
      return;
    }
    if (collect) values.push(value);
    onValue?.(value);
  };
  if (!response.body?.getReader) {
    const text = await response.text();
    for (const line of text.split('\n')) if (line.trim()) emit(JSON.parse(line));
    return values;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let carry = '';
  while (true) {
    const { done, value } = await reader.read();
    carry += decoder.decode(value || new Uint8Array(), { stream: !done });
    let newline;
    while ((newline = carry.indexOf('\n')) !== -1) {
      const line = carry.slice(0, newline);
      carry = carry.slice(newline + 1);
      if (line.trim()) emit(JSON.parse(line));
    }
    if (done) break;
  }
  if (carry.trim()) emit(JSON.parse(carry));
  if (fragments.size > 0) throw new Error('Incomplete V2 fragmented response');
  return values;
}

async function parseWireWindow(response) {
  const result = { start: null, checkpoint: null, summaries: [], end: null };
  await readNdjsonResponse(response, (frame) => {
    if (frame.kind === LOG_V2_WIRE_KINDS.start) result.start = frame;
    else if (frame.kind === LOG_V2_WIRE_KINDS.checkpoint) result.checkpoint = frame;
    else if (frame.kind === LOG_V2_WIRE_KINDS.summaries) result.summaries.push(...(frame.values || []));
    else if (frame.kind === LOG_V2_WIRE_KINDS.end) result.end = frame;
  });
  if (!result.start || !result.end || (!result.start.notModified && !result.checkpoint)) {
    throw new Error('Incomplete V2 snapshot response');
  }
  return result;
}

export async function fetchLogV2Snapshot({
  limit = 0,
  file = null,
  readOnly = false,
  knownCursor = null,
  signal,
  fetchImpl = fetch,
} = {}) {
  const query = new URLSearchParams({ limit: String(Math.max(0, limit | 0)) });
  if (file) query.set('file', file);
  if (readOnly) query.set('mode', 'readonly');
  if (knownCursor?.archive?.generation) {
    query.set('knownProjectId', knownCursor.archive.projectId || '');
    query.set('knownSessionId', knownCursor.archive.sessionId || '');
    query.set('knownGeneration', knownCursor.archive.generation);
    query.set('knownThroughSeq', String(knownCursor.throughSeq));
    query.set('knownTimelineBytes', String(knownCursor.timelineBytes));
    if (knownCursor.fileId) query.set('knownFileId', knownCursor.fileId);
    if (knownCursor.tailHash) query.set('knownTailHash', knownCursor.tailHash);
  }
  return parseWireWindow(await fetchImpl(apiUrl(`/api/log-v2/snapshot?${query}`), { signal }));
}

export async function fetchLogV2Page({
  handle,
  archive,
  limit = 100,
  ackPageToken = null,
  signal,
  fetchImpl = fetch,
} = {}) {
  const response = await fetchImpl(apiUrl('/api/log-v2/page'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle, archive, limit, ...(ackPageToken ? { ackPageToken } : {}) }),
    signal,
  });
  if (response.status === 204) return null;
  return parseWireWindow(response);
}
