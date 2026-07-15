import { createHash, randomBytes } from 'node:crypto';
import { closeSync, constants, createReadStream, fstatSync, openSync, readSync } from 'node:fs';
import { join } from 'node:path';

import { resolveV2SessionFile } from '../../lib/log-v2/materializer.js';
import { readContentObjectRawSync } from '../../lib/log-v2/storage.js';
import { assertV2WireCursorFile, readV2WirePageFromIndex } from '../../lib/log-v2/transport.js';
import {
  LOG_V2_WIRE_KINDS,
  LOG_V2_WIRE_LIMITS,
  LOG_V2_WIRE_VERSION,
  sameWireArchive,
} from '../../lib/log-v2/wire-schema.js';
import { watchV2Timeline } from '../../lib/log-v2/timeline-watcher.js';

const OBJECT_HANDLE_TTL_MS = 30 * 60 * 1000;
const MAX_OBJECT_HANDLES = 64;
const MAX_CONCURRENT_OBJECT_REQUESTS = 4;
const MAX_FROZEN_PAGE_INDEXES = 16;
const objectHandles = new Map();
const frozenPageIndexes = new Map();
let activeObjectRequests = 0;

function collectCheckpointRefs(checkpoint) {
  const refs = new Map();
  const add = (ref) => {
    if (ref?.hash && Number.isSafeInteger(ref.bytes)) refs.set(ref.hash, { hash: ref.hash, bytes: ref.bytes });
  };
  for (const thread of checkpoint.threads || []) {
    for (const node of thread.nodes || []) for (const ref of node.append || []) add(ref);
  }
  for (const winner of checkpoint.winners || []) {
    for (const ref of Object.values(winner.descriptor?.parts || {})) add(ref);
  }
  return refs;
}

function pruneObjectHandles(now = Date.now()) {
  for (const [handle, value] of objectHandles) {
    if (value.liveConnections === 0 && now - value.lastAccessAt > OBJECT_HANDLE_TTL_MS) objectHandles.delete(handle);
  }
  while (objectHandles.size >= MAX_OBJECT_HANDLES) {
    const inactive = [...objectHandles].filter(([, value]) => value.liveConnections === 0);
    if (inactive.length === 0) {
      const error = new Error('Too many active V2 object handles');
      error.code = 'CXV_LOG_V2_OBJECT_CAPACITY';
      throw error;
    }
    inactive.sort((left, right) => left[1].lastAccessAt - right[1].lastAccessAt);
    objectHandles.delete(inactive[0][0]);
  }
}

function sharedFrozenSnapshotState(snapshot) {
  if (!snapshot.pageIndex) return { pageIndex: null, liveCheckpoint: snapshot.liveCheckpoint };
  const cursor = snapshot.end.cursor;
  const key = `${cursor.archive.generation}:${cursor.throughSeq}:${cursor.timelineBytes}:${cursor.fileId || ''}:${cursor.tailHash || ''}`;
  const existing = frozenPageIndexes.get(key);
  if (existing) {
    existing.lastAccessAt = Date.now();
    return existing.state;
  }
  const state = Object.freeze({ pageIndex: snapshot.pageIndex, liveCheckpoint: snapshot.liveCheckpoint });
  frozenPageIndexes.set(key, { state, lastAccessAt: Date.now() });
  while (frozenPageIndexes.size > MAX_FROZEN_PAGE_INDEXES) {
    const oldest = [...frozenPageIndexes].sort((left, right) => left[1].lastAccessAt - right[1].lastAccessAt)[0];
    frozenPageIndexes.delete(oldest[0]);
  }
  return state;
}

export function registerV2ObjectHandle(file, snapshot, { readOnly = false } = {}) {
  pruneObjectHandles();
  const handle = randomBytes(24).toString('base64url');
  const frozenState = sharedFrozenSnapshotState(snapshot);
  objectHandles.set(handle, {
    file,
    archive: snapshot.start.archive,
    refs: collectCheckpointRefs(snapshot.checkpoint),
    frozenCursor: snapshot.end.cursor,
    pageIndex: frozenState.pageIndex,
    liveCheckpoint: readOnly ? null : frozenState.liveCheckpoint,
    liveCursor: snapshot.end.cursor,
    liveCursors: new Map([[snapshot.end.cursor.throughSeq, snapshot.end.cursor]]),
    nextBeforeSeq: snapshot.checkpoint.winners.length > 0
      ? Math.min(...snapshot.checkpoint.winners.map(value => value.descriptor.seq))
      : Number.MAX_SAFE_INTEGER,
    hasMore: !!snapshot.start.hasMore,
    pagePending: false,
    pendingPage: null,
    readOnly: !!readOnly,
    allowLive: !readOnly,
    lastAccessAt: Date.now(),
    liveConnections: 0,
  });
  return handle;
}

function extendHandleFromCheckpoint(registration, checkpoint) {
  for (const [hash, ref] of collectCheckpointRefs(checkpoint)) registration.refs.set(hash, ref);
  registration.lastAccessAt = Date.now();
}

function authorizeV2ObjectBatch(logDir, { handle, archive, hashes }) {
  pruneObjectHandles();
  const registration = objectHandles.get(handle);
  if (!registration || !sameWireArchive(registration.archive, archive)) {
    const error = new Error('V2 object handle expired or does not match the archive');
    error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
    throw error;
  }
  registration.lastAccessAt = Date.now();
  if (!Array.isArray(hashes) || hashes.length === 0 || hashes.length > LOG_V2_WIRE_LIMITS.maxObjectBatch) {
    const error = new Error(`hashes must contain 1-${LOG_V2_WIRE_LIMITS.maxObjectBatch} items`);
    error.code = 'CXV_LOG_V2_OBJECT_LIMIT';
    throw error;
  }
  const unique = [...new Set(hashes)];
  const selected = unique.map((hash) => {
    const ref = registration.refs.get(hash);
    if (!ref) {
      const error = new Error('Requested object is not referenced by this archive snapshot');
      error.code = 'ACCESS_DENIED';
      throw error;
    }
    return ref;
  });
  if (selected.some(ref => ref.bytes > LOG_V2_WIRE_LIMITS.maxSingleObjectBytes)) {
    const error = new Error('V2 object exceeds the single-object byte limit');
    error.code = 'CXV_LOG_V2_OBJECT_LIMIT';
    throw error;
  }
  const declaredBytes = selected.reduce((sum, ref) => sum + ref.bytes, 0);
  if (selected.length > 1 && declaredBytes > LOG_V2_WIRE_LIMITS.maxObjectBatchBytes) {
    const error = new Error('V2 object batch exceeds the byte limit');
    error.code = 'CXV_LOG_V2_OBJECT_LIMIT';
    throw error;
  }
  const { sessionDir } = resolveV2SessionFile(logDir, registration.file);
  return { selected, sessionDir };
}

export function resolveV2ObjectBatch(logDir, request) {
  const { selected, sessionDir } = authorizeV2ObjectBatch(logDir, request);
  return selected.map((ref) => {
    const path = `objects/${ref.hash.slice(0, 2)}/${ref.hash.slice(2, 4)}/${ref.hash}.json`;
    const value = readContentObjectRawSync(sessionDir, { algorithm: 'sha256', ...ref, path });
    return Object.freeze({ hash: ref.hash, bytes: value.bytes, raw: value.raw });
  });
}

async function verifyStreamableObject(sessionDir, ref) {
  const path = join(sessionDir, 'objects', ref.hash.slice(0, 2), ref.hash.slice(2, 4), `${ref.hash}.json`);
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size !== ref.bytes + 1) throw new Error('content object byte count mismatch');
    const newline = Buffer.allocUnsafe(1);
    if (readSync(fd, newline, 0, 1, ref.bytes) !== 1 || newline[0] !== 0x0a) {
      throw new Error('content object is not canonically newline terminated');
    }
    const hash = createHash('sha256');
    let bytes = 0;
    for await (const chunk of createReadStream(null, {
      fd, start: 0, end: ref.bytes - 1, autoClose: false,
    })) {
      bytes += chunk.length;
      hash.update(chunk);
    }
    if (bytes !== ref.bytes || hash.digest('hex') !== ref.hash) throw new Error('content object checksum mismatch');
    return { path, fd };
  } catch (error) {
    closeSync(fd);
    throw error;
  }
}

async function streamVerifiedObject(req, res, ref, fd, closed) {
  const prefix = `{"kind":"${LOG_V2_WIRE_KINDS.object}","version":${LOG_V2_WIRE_VERSION},"hash":"${ref.hash}","bytes":${ref.bytes},"value":`;
  if (!res.write(prefix) && !await waitForDrain(req, res)) return false;
  for await (const chunk of createReadStream(null, {
    fd, start: 0, end: ref.bytes - 1, autoClose: false,
  })) {
    if (closed() || res.destroyed || res.writableEnded) return false;
    if (!res.write(chunk) && !await waitForDrain(req, res)) return false;
  }
  return res.write('}\n') || waitForDrain(req, res);
}

export function extendV2ObjectHandle(handle, archive, frame) {
  const registration = objectHandles.get(handle);
  if (!registration || !sameWireArchive(registration.archive, archive)) return false;
  registration.lastAccessAt = Date.now();
  const add = (ref) => {
    if (ref?.hash && Number.isSafeInteger(ref.bytes)) registration.refs.set(ref.hash, { hash: ref.hash, bytes: ref.bytes });
  };
  for (const ref of Object.values(frame.entry?.set || {})) add(ref);
  for (const ref of frame.input?.append || []) add(ref);
  registration.liveCursor = frame.cursor || {
    archive: registration.liveCursor.archive,
    throughSeq: frame.timeline.seq,
    timelineBytes: frame.timelineBytes,
  };
  registration.liveCursors.set(registration.liveCursor.throughSeq, registration.liveCursor);
  while (registration.liveCursors.size > 512) {
    registration.liveCursors.delete(registration.liveCursors.keys().next().value);
  }
  return true;
}

function retainV2ObjectHandle(handle, archive) {
  pruneObjectHandles();
  const registration = objectHandles.get(handle);
  if (!registration || !sameWireArchive(registration.archive, archive)) return false;
  registration.liveConnections++;
  registration.lastAccessAt = Date.now();
  return true;
}

function releaseV2ObjectHandle(handle) {
  const registration = objectHandles.get(handle);
  if (!registration) return;
  registration.liveConnections = Math.max(0, registration.liveConnections - 1);
  registration.lastAccessAt = Date.now();
}

function waitForDrain(req, res) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      res.destroy?.();
      resolve(false);
    }, 15_000);
    const cleanup = () => {
      clearTimeout(timer);
      res.off('drain', onDrain);
      res.off('close', onClose);
      res.off('error', onClose);
      req?.off('close', onClose);
    };
    const finish = (ok) => { cleanup(); resolve(ok); };
    const onDrain = () => finish(true);
    const onClose = () => finish(false);
    res.once('drain', onDrain);
    res.once('close', onClose);
    res.once('error', onClose);
    req?.once('close', onClose);
  });
}

async function writeNdjson(req, res, value) {
  if (res.destroyed || res.writableEnded) return false;
  if (res.write(`${JSON.stringify(value)}\n`)) return true;
  return waitForDrain(req, res);
}

let nextFragmentId = 1;
export function encodeV2ControlFragments(value, { id, event = null } = {}) {
  const json = JSON.stringify(value);
  const jsonBytes = Buffer.byteLength(json);
  if (jsonBytes > LOG_V2_WIRE_LIMITS.maxFragmentedControlBytes) {
    const error = new Error('V2 control value exceeds the fragmented byte limit');
    error.code = 'CXV_LOG_V2_CONTROL_LIMIT';
    throw error;
  }
  if (jsonBytes <= LOG_V2_WIRE_LIMITS.maxControlFrameBytes) {
    return Object.freeze({ json, frames: null });
  }
  if (typeof id !== 'string' || !id) throw new TypeError('fragment id is required');
  const base64 = Buffer.from(json).toString('base64');
  const partChars = 512 * 1024;
  const parts = Math.ceil(base64.length / partChars);
  const frames = [{
    kind: LOG_V2_WIRE_KINDS.fragmentStart,
    version: LOG_V2_WIRE_VERSION,
    id,
    ...(event ? { event } : {}),
    bytes: jsonBytes,
    parts,
  }];
  for (let index = 0; index < parts; index++) {
    frames.push({
      kind: LOG_V2_WIRE_KINDS.fragmentPart,
      version: LOG_V2_WIRE_VERSION,
      id,
      index,
      data: base64.slice(index * partChars, (index + 1) * partChars),
    });
  }
  frames.push({ kind: LOG_V2_WIRE_KINDS.fragmentEnd, version: LOG_V2_WIRE_VERSION, id });
  return Object.freeze({ json, frames: Object.freeze(frames.map(frame => Object.freeze(frame))) });
}

async function writeControlNdjson(req, res, value) {
  const encoded = encodeV2ControlFragments(value, { id: `f${nextFragmentId++}` });
  if (!encoded.frames) {
    return writeNdjson(req, res, value);
  }
  for (const frame of encoded.frames) if (!await writeNdjson(req, res, frame)) return false;
  return true;
}

export async function serveLogV2Snapshot(req, res, {
  logDir,
  file,
  limit = 0,
  readSnapshot,
  readOnly = false,
  knownCursor = null,
}) {
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'No active V2 session' }));
    return;
  }
  try {
    if (typeof readSnapshot !== 'function') throw new TypeError('V2 snapshot reader is required');
    const snapshot = await readSnapshot(logDir, file, { limit });
    const objectHandle = registerV2ObjectHandle(file, snapshot, { readOnly });
    const cursor = snapshot.end.cursor;
    const notModified = !!knownCursor
      && sameWireArchive(knownCursor.archive, cursor.archive)
      && knownCursor.throughSeq === cursor.throughSeq
      && knownCursor.timelineBytes === cursor.timelineBytes
      && knownCursor.fileId === cursor.fileId
      && knownCursor.tailHash === cursor.tailHash;
    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-CX-Log-Protocol': `log-v2-wire/${LOG_V2_WIRE_VERSION}`,
    });
    if (!await writeControlNdjson(req, res, {
      ...snapshot.start,
      objectHandle,
      ...(notModified ? { notModified: true } : {}),
    })) return;
    if (!notModified) {
      if (!await writeControlNdjson(req, res, snapshot.checkpoint)) return;
      const chunkSize = 100;
      for (let index = 0; index < snapshot.summaries.length; index += chunkSize) {
        if (!await writeControlNdjson(req, res, {
          kind: LOG_V2_WIRE_KINDS.summaries,
          version: LOG_V2_WIRE_VERSION,
          archive: snapshot.start.archive,
          values: snapshot.summaries.slice(index, index + chunkSize),
        })) return;
      }
    }
    if (!await writeControlNdjson(req, res, snapshot.end)) return;
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      const status = error.code === 'NOT_FOUND' ? 404
        : error.code === 'ACCESS_DENIED' ? 403
          : error.code === 'CXV_LOG_V2_CONTROL_LIMIT' ? 413
            : error.code === 'CXV_LOG_V2_OBJECT_CAPACITY' ? 503 : 500;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message, code: error.code || 'CXV_LOG_V2_SNAPSHOT_FAILED' }));
    } else if (!res.writableEnded) {
      res.end();
    }
  }
}

export async function serveLogV2Page(req, res, { logDir, body, readPage }) {
  let pageRegistration = null;
  let pageLease = false;
  try {
    const registration = objectHandles.get(body?.handle);
    if (!registration || !sameWireArchive(registration.archive, body?.archive)) {
      const error = new Error('V2 page handle expired or mismatched');
      error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
      throw error;
    }
    pageRegistration = registration;
    if (registration.pagePending) {
      const error = new Error('A V2 page request is already active for this handle');
      error.code = 'CXV_LOG_V2_PAGE_BUSY';
      throw error;
    }
    registration.pagePending = true;
    pageLease = true;
    if (registration.pendingPage && body?.ackPageToken === registration.pendingPage.token) {
      registration.nextBeforeSeq = registration.pendingPage.nextBeforeSeq;
      registration.hasMore = registration.pendingPage.hasMore;
      registration.pendingPage = null;
    }
    if (!registration.hasMore) {
      res.writeHead(204, { 'Cache-Control': 'no-store' });
      res.end();
      return;
    }
    let page = registration.pendingPage?.page;
    let pageToken = registration.pendingPage?.token;
    if (!page) {
      const limit = Math.min(Math.max(Number(body?.limit) || 100, 1), 500);
      assertV2WireCursorFile(logDir, registration.file, registration.frozenCursor);
      page = registration.pageIndex
        ? readV2WirePageFromIndex(registration.pageIndex, {
            cursor: registration.frozenCursor,
            beforeSeq: registration.nextBeforeSeq,
            limit,
          })
        : await readPage(logDir, registration.file, {
            cursor: registration.frozenCursor,
            beforeSeq: registration.nextBeforeSeq,
            limit,
          });
      pageToken = randomBytes(18).toString('base64url');
      registration.pendingPage = {
        token: pageToken,
        page,
        nextBeforeSeq: page.start.nextBeforeSeq,
        hasMore: !!page.start.hasMore,
      };
    }
    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-CX-Log-Protocol': `log-v2-wire/${LOG_V2_WIRE_VERSION}`,
    });
    if (!await writeControlNdjson(req, res, {
      ...page.start,
      objectHandle: body.handle,
      pageToken,
    })) return;
    if (!await writeControlNdjson(req, res, page.checkpoint)) return;
    if (page.summaries.length > 0 && !await writeControlNdjson(req, res, {
      kind: LOG_V2_WIRE_KINDS.summaries, version: LOG_V2_WIRE_VERSION,
      archive: page.start.archive, values: page.summaries,
    })) return;
    if (!await writeControlNdjson(req, res, page.end)) return;
    // Object access is available immediately, but the page cursor remains
    // unchanged until the client acknowledges successful parse/projection in
    // its next request. A socket write is not proof that the browser received
    // the complete NDJSON response.
    extendHandleFromCheckpoint(registration, page.checkpoint);
    res.end();
  } catch (error) {
    const status = error.code === 'CXV_LOG_V2_WIRE_RESET_REQUIRED' ? 409
      : error.code === 'CXV_LOG_V2_PAGE_BUSY' ? 409
      : error.code === 'ACCESS_DENIED' ? 403
        : error.code === 'CXV_LOG_V2_CONTROL_LIMIT' ? 413 : 500;
    if (!res.headersSent) {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message, code: error.code || 'CXV_LOG_V2_PAGE_FAILED' }));
    } else if (!res.writableEnded) res.end();
  } finally {
    if (pageLease && pageRegistration) pageRegistration.pagePending = false;
  }
}

export async function serveLogV2Objects(req, res, { logDir, body }) {
  if (activeObjectRequests >= MAX_CONCURRENT_OBJECT_REQUESTS) {
    res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '1' });
    res.end(JSON.stringify({ error: 'Too many concurrent V2 object requests' }));
    return;
  }
  activeObjectRequests++;
  let closed = false;
  const objects = [];
  const onClose = () => { closed = true; };
  req.on('close', onClose);
  try {
    const { selected, sessionDir } = authorizeV2ObjectBatch(logDir, body || {});
    // Verify every selected object before sending response headers so corrupt
    // content can never be partially disclosed. The second pass streams raw
    // canonical JSON and avoids a full-object server heap allocation.
    for (const ref of selected) objects.push({ ref, ...await verifyStreamableObject(sessionDir, ref) });
    if (closed) return;
    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-CX-Log-Protocol': `log-v2-wire/${LOG_V2_WIRE_VERSION}`,
    });
    for (const object of objects) {
      if (closed || res.destroyed || res.writableEnded) return;
      if (!await streamVerifiedObject(req, res, object.ref, object.fd, () => closed)) return;
    }
    if (!closed) res.end();
  } catch (error) {
    if (!res.headersSent) {
      const status = error.code === 'ACCESS_DENIED' ? 403
        : error.code === 'CXV_LOG_V2_WIRE_RESET_REQUIRED' ? 409
          : error.code === 'CXV_LOG_V2_OBJECT_LIMIT' ? 413 : 500;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message, code: error.code || 'CXV_LOG_V2_OBJECT_FAILED' }));
    } else if (!res.writableEnded) res.end();
  } finally {
    for (const object of objects) {
      try { closeSync(object.fd); } catch {}
    }
    activeObjectRequests--;
    req.off('close', onClose);
  }
}

export async function serveLogV2Live(req, res, {
  logDir,
  file,
  getActiveFile,
  afterSeq,
  generation,
  objectHandle,
}) {
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'No active V2 session' }));
    return;
  }
  const registration = objectHandles.get(objectHandle);
  const resumeCursor = registration?.liveCursors?.get(afterSeq);
  if (!registration || registration.file !== file || registration.archive.generation !== generation
      || !resumeCursor
      || !registration.allowLive
      || !retainV2ObjectHandle(objectHandle, registration.archive)) {
    res.writeHead(409, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'V2 object handle expired', code: 'CXV_LOG_V2_WIRE_RESET_REQUIRED' }));
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-CX-Log-Protocol': `log-v2-wire/${LOG_V2_WIRE_VERSION}`,
  });
  let stopped = false;
  const sendRaw = async (event, data, id = null) => {
    if (stopped || res.destroyed || res.writableEnded) return false;
    if (event === 'ping' && res.writableNeedDrain) return false;
    const payload = `${id ? `id: ${id}\n` : ''}event: ${event}\ndata: ${data}\n\n`;
    if (res.write(payload)) return true;
    return waitForDrain(req, res);
  };
  const send = async (event, value, id = null) => {
    const encoded = encodeV2ControlFragments(value, { id: `s${nextFragmentId++}`, event });
    if (!encoded.frames) return sendRaw(event, encoded.json, id);
    for (let index = 0; index < encoded.frames.length; index++) {
      const resumeId = index === encoded.frames.length - 1 ? id : null;
      if (!await sendRaw('v2_fragment', JSON.stringify(encoded.frames[index]), resumeId)) return false;
    }
    return true;
  };
  const stopWatch = watchV2Timeline({
    logDir,
    file,
    timelinePath: resolveV2SessionFile(logDir, file).timelinePath,
    cursor: resumeCursor,
    seedCheckpoint: registration.liveCheckpoint,
    onCommits: async (commits) => {
      for (const commit of commits) {
        if (!await send('v2_commit', commit, `${generation}:${commit.frame.timeline.seq}`)) break;
        extendV2ObjectHandle(objectHandle, commit.frame.archive, commit.frame);
      }
    },
    onError: async (error) => {
      await send('v2_reset', {
        code: error.code || 'CXV_LOG_V2_LIVE_FAILED', message: error.message,
      });
      if (!res.writableEnded) res.end();
    },
  });
  const heartbeat = setInterval(() => { send('ping', {}); }, 15_000);
  const activeCheck = setInterval(async () => {
    if (getActiveFile() !== file) {
      await send('v2_reset', { code: 'CXV_LOG_V2_ARCHIVE_CHANGED' });
      res.end();
    }
  }, 1000);
  const close = () => {
    if (stopped) return;
    stopped = true;
    stopWatch();
    clearInterval(heartbeat);
    clearInterval(activeCheck);
    releaseV2ObjectHandle(objectHandle);
  };
  req.on('close', close);
  res.on('close', close);
}
