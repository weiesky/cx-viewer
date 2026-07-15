import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';

import { LogV2Writer } from '../lib/log-v2/writer.js';
import { readV2WireCommitsFromCursor, readV2WireSnapshot } from '../lib/log-v2/transport.js';
import { closeIdleV2TimelinePublishers } from '../lib/log-v2/timeline-watcher.js';
import {
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
  response.write = (value) => { response.body += value; return true; };
  response.end = (value = '') => { response.body += value; response.writableEnded = true; };
  return response;
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
    await new Promise(resolve => setTimeout(resolve, 50));
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

    const pageResponse = mockResponse();
    await serveLogV2Page(new EventEmitter(), pageResponse, {
      logDir: root,
      body: { handle, archive: snapshot.start.archive, limit: 1 },
      readPage: () => { throw new Error('frozen handle must not replay the archive'); },
    });
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
