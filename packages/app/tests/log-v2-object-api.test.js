import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';

import { LogV2Writer } from '../lib/log-v2/writer.js';
import { readV2WireCommitsFromCursor, readV2WireSnapshot, readV2WireSummariesForWinners } from '../lib/log-v2/transport.js';
import { closeIdleV2TimelinePublishers } from '../lib/log-v2/timeline-watcher.js';
import {
  classifyActiveSnapshotError,
  createActiveV2RecoveryState,
  extendV2ObjectHandle,
  registerV2ObjectHandle,
  resolveV2ObjectBatch,
  serveLogV2Live,
  serveLogV2Objects,
  serveLogV2Page,
  serveLogV2Snapshot,
} from '../server/lib/log-v2-routes.js';

function mockResponse() {
  const response = new EventEmitter();
  response.status = 0;
  response.headers = {};
  response.body = '';
  response.writeHead = (status, headers = {}) => { response.status = status; response.headers = headers; };
  response.write = (value) => {
    response.body += value;
    response.emit('body-write');
    return true;
  };
  response.end = (value = '') => { response.body += value; response.writableEnded = true; };
  return response;
}

function waitForBody(response, pattern, timeoutMs = 2000) {
  if (pattern.test(response.body)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      response.off('body-write', onWrite);
    };
    const onWrite = () => {
      if (!pattern.test(response.body)) return;
      cleanup();
      resolve();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`timed out waiting for response body to match ${pattern}`));
    }, timeoutMs);
    timer.unref?.();
    response.on('body-write', onWrite);
    // Close the check/listener registration race.
    onWrite();
  });
}

test('object hydration is archive-scoped, reference-whitelisted and returns verified raw JSON', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-object-api-'));
  try {
    const writer = LogV2Writer.open({
      rootDir: root, projectId: 'project', canonicalCwd: '/workspace/project',
      sessionId: 'session', rootThreadId: 'session', source: 'app-server', startReason: 'startup',
      durability: 'buffered',
    });
    writer.append({
      timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://one',
      body: { input: [{ role: 'user', content: 'hello' }] }, response: { status: 200 },
    }, { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true });
    const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file);
    const handle = registerV2ObjectHandle(file, snapshot);
    const firstRef = Object.values(snapshot.checkpoint.winners[0].descriptor.parts)[0];
    const values = resolveV2ObjectBatch(root, { handle, archive: snapshot.start.archive, hashes: [firstRef.hash, firstRef.hash] });

    assert.equal(values.length, 1);
    assert.equal(values[0].hash, firstRef.hash);
    assert.doesNotThrow(() => JSON.parse(values[0].raw));
    const streamed = mockResponse();
    await serveLogV2Objects(new EventEmitter(), streamed, {
      logDir: root,
      body: { handle, archive: snapshot.start.archive, hashes: [firstRef.hash] },
    });
    assert.equal(streamed.status, 200);
    const streamedFrame = JSON.parse(streamed.body.trim());
    assert.equal(streamedFrame.hash, firstRef.hash);
    assert.equal(streamedFrame.bytes, firstRef.bytes);
    assert.throws(() => resolveV2ObjectBatch(root, {
      handle, archive: snapshot.start.archive, hashes: ['f'.repeat(64)],
    }), error => error.code === 'ACCESS_DENIED');
    assert.throws(() => resolveV2ObjectBatch(root, {
      handle, archive: { ...snapshot.start.archive, generation: 'other' }, hashes: [firstRef.hash],
    }), error => error.code === 'CXV_LOG_V2_WIRE_RESET_REQUIRED');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('snapshot validation refreshes the handle without retransmitting an unchanged checkpoint', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-snapshot-cache-'));
  try {
    const writer = LogV2Writer.open({
      rootDir: root, projectId: 'project', canonicalCwd: '/workspace/project',
      sessionId: 'session', rootThreadId: 'session', source: 'app-server', startReason: 'startup',
      durability: 'buffered',
    });
    writer.append({ timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://one', body: { input: [] } }, {
      sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true,
    });
    const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file);
    const response = mockResponse();
    await serveLogV2Snapshot(new EventEmitter(), response, {
      logDir: root,
      file,
      limit: 10,
      knownCursor: snapshot.end.cursor,
      readSnapshot: async () => snapshot,
    });
    assert.equal(response.status, 200);
    assert.match(response.body, /"notModified":true/);
    assert.doesNotMatch(response.body, /log-v2-wire\.checkpoint/);
    assert.doesNotMatch(response.body, /log-v2-wire\.summaries/);
    assert.match(response.body, /"objectHandle":"[^"]+"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('active snapshot retries one healthy fallback after the fast-selected archive fails', async () => {
  const response = mockResponse();
  const fallbackSnapshot = {
    start: { kind: 'cx-viewer.log-v2-wire.start', version: 2, archive: { projectId: 'p', sessionId: 'healthy', generation: 'g' }, total: 0, windowCount: 0, hasMore: false },
    checkpoint: { kind: 'cx-viewer.log-v2-wire.checkpoint', version: 2, archive: { projectId: 'p', sessionId: 'healthy', generation: 'g' }, throughSeq: 0, timelineBytes: 0, entries: [], threads: [], winners: [] },
    summaries: [],
    end: { kind: 'cx-viewer.log-v2-wire.end', version: 2, archive: { projectId: 'p', sessionId: 'healthy', generation: 'g' }, cursor: { archive: { projectId: 'p', sessionId: 'healthy', generation: 'g' }, throughSeq: 0, timelineBytes: 0 } },
    pageIndex: null,
    liveCheckpoint: null,
  };
  const reads = [];
  const recoveries = [];
  await serveLogV2Snapshot(new EventEmitter(), response, {
    logDir: '/unused',
    file: 'broken/timeline.jsonl',
    readSnapshot: async (_logDir, file) => {
      reads.push(file);
      if (file === 'broken/timeline.jsonl') {
        throw new Error('content object checksum mismatch');
      }
      return fallbackSnapshot;
    },
    recoverActiveFile: async (file, error) => {
      recoveries.push([file, error.message]);
      return 'healthy/timeline.jsonl';
    },
  });
  assert.deepEqual(reads, ['broken/timeline.jsonl', 'healthy/timeline.jsonl']);
  assert.deepEqual(recoveries, [['broken/timeline.jsonl', 'content object checksum mismatch']]);
  assert.equal(response.status, 200);
  assert.match(response.body, /"sessionId":"healthy"/);
});

test('snapshot fallback retries only once and retains the original reader failure as cause', async () => {
  const response = mockResponse();
  const primary = new Error('primary corrupt timeline');
  primary.code = 'CXV_LOG_V2_CORRUPT';
  const fallback = new Error('fallback also failed');
  let recoveryCalls = 0;
  let readCalls = 0;
  await serveLogV2Snapshot(new EventEmitter(), response, {
    logDir: '/unused',
    file: 'broken/timeline.jsonl',
    readSnapshot: async () => {
      readCalls++;
      if (readCalls === 1) throw primary;
      throw fallback;
    },
    recoverActiveFile: async () => {
      recoveryCalls++;
      return 'fallback/timeline.jsonl';
    },
  });
  assert.equal(readCalls, 2);
  assert.equal(recoveryCalls, 1);
  assert.equal(fallback.cause, primary);
  assert.equal(response.status, 500);
  assert.match(response.body, /fallback also failed/);
});

test('active snapshot does not recover or stick on a transient reader failure', async () => {
  const response = mockResponse();
  let recoveryCalls = 0;
  await serveLogV2Snapshot(new EventEmitter(), response, {
    logDir: '/unused',
    file: 'active/timeline.jsonl',
    readSnapshot: async () => {
      const error = new Error('reader temporarily busy');
      error.code = 'CXV_LOG_V2_PAGE_BUSY';
      throw error;
    },
    recoverActiveFile: async () => {
      recoveryCalls++;
      return 'fallback/timeline.jsonl';
    },
  });
  assert.equal(recoveryCalls, 0);
  assert.equal(response.status, 500);
  assert.match(response.body, /reader temporarily busy/);
});

test('accepted active recovery expires and is invalidated by file identity or session changes', () => {
  let clock = 1_000;
  const identities = new Map([['broken', 'inode-a']]);
  const state = createActiveV2RecoveryState({
    identityForFile: file => identities.get(file) || null,
    now: () => clock,
    ttlMs: 100,
  });
  const corrupt = Object.assign(new Error('corrupt'), { code: 'CXV_LOG_V2_CORRUPT' });
  const prepared = state.prepare('broken', corrupt);
  assert.equal(prepared.accept('healthy'), true);
  assert.equal(state.apply('broken'), 'healthy');

  identities.set('broken', 'inode-b');
  assert.equal(state.apply('broken'), 'broken');
  assert.equal(state.snapshot(), null);

  identities.set('broken', 'inode-c');
  state.prepare('broken', corrupt).accept('healthy');
  assert.equal(state.apply('new-session'), 'new-session');
  assert.equal(state.snapshot(), null);

  state.prepare('broken', corrupt).accept('healthy');
  clock += 100;
  assert.equal(state.apply('broken'), 'broken');
  assert.equal(state.snapshot(), null);
  assert.equal(state.prepare('broken', Object.assign(new Error('busy'), {
    code: 'CXV_LOG_V2_PAGE_BUSY',
  })), null);
});

test('active recovery rejects an out-of-order accept from an older prepare epoch', () => {
  const state = createActiveV2RecoveryState({ identityForFile: () => 'same-inode' });
  const corrupt = Object.assign(new Error('corrupt'), { code: 'CXV_LOG_V2_CORRUPT' });
  const older = state.prepare('broken', corrupt);
  const newer = state.prepare('broken', corrupt);
  assert.equal(newer.accept('newer-fallback'), true);
  assert.equal(older.accept('older-fallback'), false);
  assert.equal(state.apply('broken'), 'newer-fallback');
});

test('snapshot error classification maps canonical object failures but preserves transient codes', () => {
  const objectFailure = new Error('content object checksum mismatch');
  assert.equal(classifyActiveSnapshotError(objectFailure).code, 'CXV_LOG_V2_CORRUPT');
  const transient = Object.assign(new Error('too many open files'), { code: 'EMFILE' });
  assert.equal(classifyActiveSnapshotError(transient).code, 'EMFILE');
});

test('live handle can replay from an acknowledged cursor behind the last socket write', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-live-resume-'));
  const req = new EventEmitter();
  try {
    const writer = LogV2Writer.open({
      rootDir: root, projectId: 'project', canonicalCwd: '/workspace/project',
      sessionId: 'session', rootThreadId: 'session', source: 'app-server', startReason: 'startup',
      durability: 'buffered',
    });
    const identity = { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true };
    writer.append({ timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://one', body: { input: [] } }, identity);
    const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file);
    const handle = registerV2ObjectHandle(file, snapshot);
    writer.append({ timestamp: '2026-07-15T00:00:01.000Z', url: 'codex://two', body: { input: [] } }, identity);
    const suffix = readV2WireCommitsFromCursor(root, file, { cursor: snapshot.end.cursor });
    assert.equal(extendV2ObjectHandle(handle, snapshot.start.archive, suffix.commits[0].frame), true);

    const response = mockResponse();
    await serveLogV2Live(req, response, {
      logDir: root,
      file,
      getActiveFile: () => file,
      afterSeq: snapshot.end.cursor.throughSeq,
      generation: snapshot.start.archive.generation,
      objectHandle: handle,
    });
    await waitForBody(response, /event: v2_commit/);
    assert.equal(response.status, 200);
    assert.match(response.body, /event: v2_commit/);
  } finally {
    req.emit('close');
    closeIdleV2TimelinePublishers();
    rmSync(root, { recursive: true, force: true });
  }
});

test('readonly historical handles can page and hydrate but can never subscribe live', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-readonly-api-'));
  try {
    const writer = LogV2Writer.open({
      rootDir: root, projectId: 'project', canonicalCwd: '/workspace/project',
      sessionId: 'session', rootThreadId: 'session', source: 'app-server', startReason: 'startup',
      durability: 'buffered',
    });
    const identity = { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true };
    writer.append({ timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://one', body: { input: [] } }, identity);
    writer.append({ timestamp: '2026-07-15T00:00:01.000Z', url: 'codex://two', body: { input: [] } }, identity);
    const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file, { limit: 1 });
    const handle = registerV2ObjectHandle(file, snapshot, { readOnly: true });
    let summaryWorkerCalls = 0;

    const pageResponse = mockResponse();
    await serveLogV2Page(new EventEmitter(), pageResponse, {
      logDir: root,
      body: { handle, archive: snapshot.start.archive, limit: 1 },
      readPage: () => { throw new Error('frozen handle must not replay the archive'); },
      readSummaries: async (nextRoot, nextFile, winners) => {
        summaryWorkerCalls++;
        await new Promise(resolve => setImmediate(resolve));
        return readV2WireSummariesForWinners(nextRoot, nextFile, winners);
      },
    });
    assert.equal(summaryWorkerCalls, 1);
    assert.equal(pageResponse.status, 200);
    assert.match(pageResponse.body, /"page":true/);
    assert.match(pageResponse.body, /"windowCount":1/);
    const firstPageStart = pageResponse.body.split('\n').map(line => line && JSON.parse(line))
      .find(value => value?.kind === 'cx-viewer.log-v2-wire.start');
    assert.equal(typeof firstPageStart.pageToken, 'string');

    const retryResponse = mockResponse();
    await serveLogV2Page(new EventEmitter(), retryResponse, {
      logDir: root,
      body: { handle, archive: snapshot.start.archive, limit: 1 },
      readPage: () => { throw new Error('frozen handle must not replay the archive'); },
    });
    assert.equal(retryResponse.status, 200);
    assert.equal(retryResponse.body, pageResponse.body);

    const ackResponse = mockResponse();
    await serveLogV2Page(new EventEmitter(), ackResponse, {
      logDir: root,
      body: { handle, archive: snapshot.start.archive, limit: 1, ackPageToken: firstPageStart.pageToken },
      readPage: () => { throw new Error('frozen handle must not replay the archive'); },
    });
    assert.equal(ackResponse.status, 204);

    const liveResponse = mockResponse();
    await serveLogV2Live(new EventEmitter(), liveResponse, {
      logDir: root,
      file,
      getActiveFile: () => file,
      afterSeq: snapshot.end.cursor.throughSeq,
      generation: snapshot.start.archive.generation,
      objectHandle: handle,
    });
    assert.equal(liveResponse.status, 409);
    assert.match(liveResponse.body, /CXV_LOG_V2_WIRE_RESET_REQUIRED/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
