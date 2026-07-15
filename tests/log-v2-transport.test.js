import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';

import { applyWireCommit, restoreWireArchiveState, materializeWireDescriptor } from '../lib/log-v2/reducer.js';
import { readV2WireCommitsAfter, readV2WireCommitsFromCursor, readV2WirePage, readV2WireSnapshot } from '../lib/log-v2/transport.js';
import { readV2WireSnapshotAsync } from '../lib/log-v2/materializer.js';
import { readContentObjectSync } from '../lib/log-v2/storage.js';
import { closeIdleV2TimelinePublishers, getV2TimelineWatcherStats, watchV2Timeline } from '../lib/log-v2/timeline-watcher.js';
import { LogV2Writer } from '../lib/log-v2/writer.js';

function options(root) {
  return {
    rootDir: root,
    projectId: 'project', canonicalCwd: '/workspace/project',
    sessionId: 'session', rootThreadId: 'session', source: 'app-server', startReason: 'startup',
    durability: 'buffered',
  };
}

test('wire snapshot carries only refs and summaries while exact client assembly matches source entries', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-wire-'));
  try {
    const writer = LogV2Writer.open(options(root));
    const identity = { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true };
    const first = {
      timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://one', method: 'POST', mainAgent: true,
      body: { model: 'gpt-test', input: [{ role: 'user', content: 'hello' }] },
      response: { status: 200, body: { usage: { input_tokens: 1 }, content: [{ type: 'text', text: 'hi' }] } },
    };
    writer.append(first, identity);
    const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file, { limit: 10 });
    const state = restoreWireArchiveState(snapshot.checkpoint);
    const descriptor = [...state.winners.values()][0];
    const exact = materializeWireDescriptor(descriptor, ref => readContentObjectSync(writer.sessionDir, {
      algorithm: 'sha256', hash: ref.hash, bytes: ref.bytes,
      path: `objects/${ref.hash.slice(0, 2)}/${ref.hash.slice(2, 4)}/${ref.hash}.json`,
    }), { state });

    assert.deepEqual(exact, first);
    assert.equal(snapshot.summaries[0].body.model, 'gpt-test');
    assert.equal(JSON.stringify(snapshot).includes('hello'), false);
    assert.equal(JSON.stringify(snapshot).includes('"text":"hi"'), false);
    assert.equal(snapshot.end.cursor.throughSeq, 1);
    assert.equal(snapshot.checkpoint.entries.length, 0);
    const workerSnapshot = await readV2WireSnapshotAsync(root, file, { limit: 10 });
    assert.deepEqual(workerSnapshot, snapshot);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('wire live replay resumes strictly after the snapshot sequence', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-wire-live-'));
  try {
    const writer = LogV2Writer.open(options(root));
    const identity = { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true };
    const entry = (timestamp, content) => ({
      timestamp, url: 'codex://one', mainAgent: true,
      body: { input: [{ role: 'user', content }] }, response: { status: 200 },
    });
    writer.append(entry('2026-07-15T00:00:00.000Z', 'first'), identity);
    const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file);
    writer.append(entry('2026-07-15T00:00:01.000Z', 'second'), identity);
    const replay = readV2WireCommitsAfter(root, file, {
      afterSeq: snapshot.end.cursor.throughSeq,
      generation: snapshot.start.archive.generation,
    });
    assert.deepEqual(replay.commits.map(value => value.frame.timeline.seq), [2]);
    assert.equal(replay.throughSeq, 2);
    const suffix = readV2WireCommitsFromCursor(root, file, { cursor: snapshot.end.cursor });
    assert.deepEqual(suffix.commits.map(value => value.frame.timeline.seq), [2]);
    assert.equal(suffix.cursor.throughSeq, 2);
    assert.ok(suffix.cursor.timelineBytes > snapshot.end.cursor.timelineBytes);
    assert.throws(() => readV2WireCommitsAfter(root, file, {
      afterSeq: 1, generation: 'other',
    }), error => error.code === 'CXV_LOG_V2_WIRE_RESET_REQUIRED');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('byte cursor rejects an in-place same-size timeline rewrite', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-wire-rewrite-'));
  try {
    const writer = LogV2Writer.open(options(root));
    writer.append({ timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://one', mainAgent: true, body: { input: [] } }, {
      sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true,
    });
    const timelinePath = join(writer.sessionDir, 'timeline.jsonl');
    const file = relative(root, timelinePath).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file);
    const bytes = readFileSync(timelinePath);
    const index = Math.max(0, bytes.length - 8);
    bytes[index] = bytes[index] === 0x61 ? 0x62 : 0x61;
    writeFileSync(timelinePath, bytes);
    assert.throws(() => readV2WireCommitsFromCursor(root, file, { cursor: snapshot.end.cursor }),
      error => error.code === 'CXV_LOG_V2_WIRE_RESET_REQUIRED');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('wire transport rebuilds correctness-critical summaries from canonical meta parts', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-wire-summary-'));
  try {
    const writer = LogV2Writer.open(options(root));
    const identity = { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true };
    writer.append({
      timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://one', method: 'POST', mainAgent: true,
      body: { model: 'gpt-test', input: [{ role: 'user', content: 'large private prompt' }] },
      response: {
        status: 200,
        headers: {
          'x-codex-plan-type': 'prolite',
          'x-codex-primary-used-percent': '19',
          'x-codex-primary-window-minutes': '10080',
          authorization: 'Bearer private-token',
        },
        body: { output: 'large private result' },
      },
    }, identity);
    unlinkSync(join(writer.sessionDir, 'request-summaries.jsonl'));
    const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file);
    assert.equal(snapshot.summaries[0].root.mainAgent, true);
    assert.equal(snapshot.summaries[0].root.url, 'codex://one');
    assert.deepEqual(snapshot.summaries[0].response.headers, {
      'x-codex-plan-type': 'prolite',
      'x-codex-primary-used-percent': '19',
      'x-codex-primary-window-minutes': '10080',
    });
    assert.equal(JSON.stringify(snapshot.summaries).includes('large private prompt'), false);
    assert.equal(JSON.stringify(snapshot.summaries).includes('private-token'), false);
    const replay = readV2WireCommitsAfter(root, file, { afterSeq: 0, generation: snapshot.start.archive.generation });
    assert.equal(replay.commits[0].summary.root.mainAgent, true);
    assert.equal(JSON.stringify(replay.commits[0].summary).includes('large private result'), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('live publisher rebuilds a missing derived summary from canonical parts', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-wire-live-summary-'));
  let stop = () => {};
  try {
    const writer = LogV2Writer.open(options(root));
    const identity = { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true };
    writer.append({
      timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://one', mainAgent: true,
      body: { model: 'gpt-test', input: [{ role: 'user', content: 'first' }] },
    }, identity);
    const timelinePath = join(writer.sessionDir, 'timeline.jsonl');
    const file = relative(root, timelinePath).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file);
    appendFileSync(join(writer.sessionDir, 'request-summaries.jsonl'), '{not-json}\n');
    const received = new Promise((resolve, reject) => {
      stop = watchV2Timeline({
        logDir: root,
        file,
        timelinePath,
        cursor: snapshot.end.cursor,
        seedCheckpoint: snapshot.liveCheckpoint,
        onCommits: resolve,
        onError: reject,
      });
    });
    writer.append({
      timestamp: '2026-07-15T00:00:01.000Z', url: 'codex://two', mainAgent: true,
      body: { model: 'gpt-live', input: [{ role: 'user', content: 'second' }] },
    }, identity);
    const commits = await received;
    assert.equal(commits[0].summary.root.url, 'codex://two');
    assert.equal(commits[0].summary.body.model, 'gpt-live');
    assert.equal(JSON.stringify(commits[0].summary).includes('second'), false);
  } finally {
    stop();
    closeIdleV2TimelinePublishers();
    rmSync(root, { recursive: true, force: true });
  }
});

test('timeline watcher uses the archive id for replay and the resolved path for watching', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-wire-watch-'));
  let stop = () => {};
  try {
    const writer = LogV2Writer.open(options(root));
    const identity = { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true };
    writer.append({
      timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://one', mainAgent: true,
      body: { input: [{ role: 'user', content: 'first' }] }, response: { status: 200 },
    }, identity);
    const timelinePath = join(writer.sessionDir, 'timeline.jsonl');
    const file = relative(root, timelinePath).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file);
    const commitsPromise = new Promise((resolve, reject) => {
      stop = watchV2Timeline({
        logDir: root,
        file,
        timelinePath,
        cursor: { archive: snapshot.end.cursor.archive, throughSeq: 0, timelineBytes: 0 },
        onCommits: resolve,
        onError: reject,
      });
    });
    const commits = await commitsPromise;
    assert.deepEqual(commits.map(value => value.frame.timeline.seq), [1]);
  } finally {
    stop();
    closeIdleV2TimelinePublishers();
    rmSync(root, { recursive: true, force: true });
  }
});

test('wire pages are frozen at the snapshot watermark and contain only older winner descriptors', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-wire-page-'));
  try {
    const writer = LogV2Writer.open(options(root));
    const identity = { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true };
    for (let index = 1; index <= 5; index++) {
      writer.append({ timestamp: `2026-07-15T00:00:0${index}.000Z`, url: `codex://${index}`, mainAgent: true, body: { input: [{ role: 'user', content: String(index) }] } }, identity);
    }
    const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file, { limit: 2 });
    assert.deepEqual(snapshot.checkpoint.winners.map(value => value.descriptor.seq), [4, 5]);
    writer.append({ timestamp: '2026-07-15T00:00:06.000Z', url: 'codex://6', mainAgent: true, body: { input: [{ role: 'user', content: '6' }] } }, identity);
    const first = readV2WirePage(root, file, { cursor: snapshot.end.cursor, beforeSeq: 4, limit: 2 });
    assert.deepEqual(first.checkpoint.winners.map(value => value.descriptor.seq), [2, 3]);
    assert.equal(first.start.hasMore, true);
    assert.equal(first.start.nextBeforeSeq, 2);
    assert.equal(first.checkpoint.entries.length, 0);
    assert.equal(first.checkpoint.threads.length, 0);
    const second = readV2WirePage(root, file, { cursor: snapshot.end.cursor, beforeSeq: 2, limit: 2 });
    assert.deepEqual(second.checkpoint.winners.map(value => value.descriptor.seq), [1]);
    assert.equal(second.start.hasMore, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('timeline subscribers share one publisher and release it after the last unsubscribe', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-wire-shared-watch-'));
  const stops = [];
  try {
    const writer = LogV2Writer.open(options(root));
    const identity = { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true };
    writer.append({ timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://shared', mainAgent: true, body: { input: [] } }, identity);
    const timelinePath = join(writer.sessionDir, 'timeline.jsonl');
    const file = relative(root, timelinePath).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file);
    const cursor = { archive: snapshot.end.cursor.archive, throughSeq: 0, timelineBytes: 0 };
    const received = Array.from({ length: 50 }, () => new Promise((resolve, reject) => {
      stops.push(watchV2Timeline({ logDir: root, file, timelinePath, cursor, onCommits: resolve, onError: reject }));
    }));
    assert.deepEqual(getV2TimelineWatcherStats(), { publishers: 1, subscribers: 50 });
    const values = await Promise.all(received);
    assert.equal(values.length, 50);
    assert.equal(values.every(commits => commits.length === 1 && commits[0].frame.timeline.seq === 1), true);
    stops.splice(0).forEach(stop => stop());
    closeIdleV2TimelinePublishers();
    assert.deepEqual(getV2TimelineWatcherStats(), { publishers: 0, subscribers: 0 });
  } finally {
    stops.forEach(stop => stop());
    closeIdleV2TimelinePublishers();
    rmSync(root, { recursive: true, force: true });
  }
});

test('live publisher emits self-contained entry upserts for entries outside the initial window', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-wire-upsert-'));
  let stop = () => {};
  try {
    const writer = LogV2Writer.open(options(root));
    const identity = { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true };
    writer.append({ timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://old', mainAgent: true, body: { model: 'first', input: [] } }, identity);
    writer.append({ timestamp: '2026-07-15T00:00:01.000Z', url: 'codex://visible', mainAgent: true, body: { input: [] } }, identity);
    const timelinePath = join(writer.sessionDir, 'timeline.jsonl');
    const file = relative(root, timelinePath).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file, { limit: 1 });
    assert.equal(snapshot.checkpoint.entries.length, 0);
    writer.append({ timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://old', mainAgent: true, body: { model: 'updated', input: [] } }, identity);
    const commits = await new Promise((resolve, reject) => {
      stop = watchV2Timeline({
        logDir: root, file, timelinePath, cursor: snapshot.end.cursor,
        onCommits: resolve, onError: reject,
      });
    });
    assert.equal(commits[0].frame.entry.upsert, true);
    assert.equal(commits[0].frame.entry.baseRevision, 0);
    assert.ok(Object.keys(commits[0].frame.entry.set).length > 1);
    const client = restoreWireArchiveState(snapshot.checkpoint);
    assert.doesNotThrow(() => applyWireCommit(client, commits[0].frame));
  } finally {
    stop();
    closeIdleV2TimelinePublishers();
    rmSync(root, { recursive: true, force: true });
  }
});
