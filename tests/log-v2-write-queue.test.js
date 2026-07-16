import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LogV2WriteQueue } from '../lib/log-v2/write-queue.js';

function queueOptions(root) {
  return {
    rootDir: root,
    minFreeBytes: 0,
    minFreePercent: 0,
    durability: 'durable',
    authority: 'primary',
  };
}

function context(sessionId = 'session-worker') {
  return {
    source: 'app-server',
    cwd: '/workspace/project',
    projectId: 'project',
    thread: { id: sessionId, sessionId },
  };
}

function entry(timestamp, payload = timestamp) {
  return {
    timestamp,
    url: 'codex://item/test',
    body: { input: [{ type: 'message', text: payload }] },
    response: { status: 200, body: { content: [] } },
    mainAgent: true,
  };
}

test('durable V2 writes run in one ordered worker and flush through the last commit', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-write-queue-'));
  const queue = new LogV2WriteQueue(queueOptions(root));
  try {
    const first = queue.enqueue(entry('2026-07-17T01:00:00.000Z'), context());
    const second = queue.enqueue(entry('2026-07-17T01:00:01.000Z'), context());
    const flushed = await queue.flush();
    const [firstResult, secondResult] = await Promise.all([first, second]);

    assert.equal(firstResult.seq, 1);
    assert.equal(secondResult.seq, 2);
    assert.equal(firstResult.accepted, true);
    assert.equal(firstResult.durable, true);
    assert.equal(flushed.durable, true);
    assert.equal(flushed.written, 2);
    assert.equal(queue.snapshot().pendingWrites, 0);
    assert.equal(existsSync(join(secondResult.sessionDir, 'timeline.jsonl')), true);
  } finally {
    await queue.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test('durable write pressure does not monopolize the caller event loop', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-write-pressure-'));
  const queue = new LogV2WriteQueue(queueOptions(root));
  try {
    const writeContext = context('session-pressure');
    const payload = 'x'.repeat(256 * 1024);
    const writes = [];
    const started = Date.now();
    for (let index = 0; index < 24; index++) {
      const timestamp = new Date(Date.UTC(2026, 6, 17, 1, 0, index)).toISOString();
      writes.push(queue.enqueue(entry(timestamp, payload), writeContext));
    }
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.ok(Date.now() - started < 250, 'caller event loop was blocked by durable writes');
    await queue.flush();
    const results = await Promise.all(writes);
    assert.equal(results.at(-1).seq, 24);
  } finally {
    await queue.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test('overflow is observable while a flush barrier remains admissible at capacity', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-write-overflow-'));
  const queue = new LogV2WriteQueue(queueOptions(root), { maxPending: 1 });
  try {
    const first = queue.enqueue(
      entry('2026-07-17T02:00:00.000Z', 'x'.repeat(512 * 1024)),
      context('session-overflow'),
    );
    assert.throws(
      () => queue.enqueue(entry('2026-07-17T02:00:01.000Z'), context('session-overflow')),
      error => error?.code === 'CXV_LOG_V2_WRITE_QUEUE_OVERFLOW',
    );
    const status = queue.snapshot();
    assert.equal(status.pendingWrites, 1);
    assert.equal(status.overflowedWrites, 1);
    assert.equal(status.lastQueueErrorCode, 'CXV_LOG_V2_WRITE_QUEUE_OVERFLOW');

    const flushed = await queue.flush();
    assert.equal(flushed.durable, true);
    assert.equal((await first).durable, true);
    assert.equal(queue.snapshot().lastAdmissionErrorCode, 'CXV_LOG_V2_WRITE_QUEUE_OVERFLOW');
  } finally {
    await queue.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test('close seals admission before draining every previously accepted write', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-write-close-'));
  const queue = new LogV2WriteQueue(queueOptions(root));
  try {
    const accepted = queue.enqueue(
      entry('2026-07-17T03:00:00.000Z'),
      context('session-close'),
    );
    const closing = queue.close();
    assert.throws(
      () => queue.enqueue(entry('2026-07-17T03:00:01.000Z'), context('session-close')),
      error => error?.code === 'CXV_LOG_V2_WRITE_QUEUE_CLOSING',
    );
    assert.equal((await accepted).durable, true);
    const drained = await closing;
    assert.equal(drained.written, 1);
    assert.equal(drained.durable, true);
    assert.equal(queue.snapshot().closed, true);
  } finally {
    await queue.close().catch(() => {});
    rmSync(root, { recursive: true, force: true });
  }
});

test('an unexpected idle worker exit is fatal and future barriers fail promptly', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-write-exit-'));
  const queue = new LogV2WriteQueue(queueOptions(root));
  try {
    await new Promise(resolve => {
      if (queue.snapshot().ready) resolve();
      else queue.worker.once('message', resolve);
    });
    await queue.worker.terminate();
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(queue.snapshot().fatal, true);
    assert.equal(queue.snapshot().ready, false);
    assert.throws(
      () => queue.flush(),
      error => error?.code === 'CXV_LOG_V2_WRITE_WORKER_EXITED',
    );
  } finally {
    await queue.close().catch(() => {});
    rmSync(root, { recursive: true, force: true });
  }
});
