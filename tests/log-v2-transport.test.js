import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';
import { Worker } from 'node:worker_threads';

import { applyWireCommit, restoreWireArchiveState, materializeWireDescriptor } from '../lib/log-v2/reducer.js';
import { getV2RequestSummaryReadStats, readV2WireCommitsAfter, readV2WireCommitsFromCursor, readV2WirePage, readV2WirePageFromIndex, readV2WireSnapshot, readV2WireSummariesForWinners } from '../lib/log-v2/transport.js';
import { createV2WireLiveReader, readV2WireSnapshotAsync, readV2WireSummariesAsync } from '../lib/log-v2/materializer.js';
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

function readSummariesInFreshInstrumentedWorker(logDir, file, winners) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`
      const { parentPort, workerData } = require('node:worker_threads');
      import(workerData.module).then((transport) => {
        const before = transport.getV2RequestSummaryReadStats();
        const values = transport.readV2WireSummariesForWinners(
          workerData.logDir, workerData.file, workerData.winners,
        );
        const after = transport.getV2RequestSummaryReadStats();
        parentPort.postMessage({
          seqs: values.map(value => value.seq),
          indexedRecords: after.indexedRecords - before.indexedRecords,
          selectedRecords: after.selectedRecords - before.selectedRecords,
        });
      }).catch(error => { throw error; });
    `, {
      eval: true,
      workerData: {
        module: new URL('../lib/log-v2/transport.js', import.meta.url).href,
        logDir,
        file,
        winners,
      },
    });
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', code => { if (code !== 0) reject(new Error(`summary worker exited ${code}`)); });
  });
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

test('long-history suffix readers decode summaries only for newly committed sequences', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-wire-live-summary-suffix-'));
  try {
    const writer = LogV2Writer.open(options(root));
    const identity = { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true };
    const append = (index) => writer.append({
      timestamp: new Date(Date.UTC(2026, 6, 15, 0, 0, index)).toISOString(),
      url: `codex://summary-suffix/${index}`,
      mainAgent: true,
      body: { model: `model-${index}`, input: [] },
      response: { status: 200 },
    }, identity);
    for (let index = 0; index < 200; index++) append(index);
    const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file, { limit: 200 });

    append(200);
    let before = getV2RequestSummaryReadStats();
    const first = readV2WireCommitsFromCursor(root, file, { cursor: snapshot.end.cursor });
    let after = getV2RequestSummaryReadStats();
    assert.equal(first.commits.length, 1);
    assert.equal(after.selectedRecords - before.selectedRecords, 1);

    append(201);
    before = getV2RequestSummaryReadStats();
    const second = readV2WireCommitsFromCursor(root, file, { cursor: first.cursor });
    after = getV2RequestSummaryReadStats();
    assert.equal(second.commits.length, 1);
    assert.equal(after.selectedRecords - before.selectedRecords, 1);

    before = getV2RequestSummaryReadStats();
    const replay = readV2WireCommitsAfter(root, file, {
      afterSeq: snapshot.end.cursor.throughSeq,
      generation: snapshot.start.archive.generation,
    });
    after = getV2RequestSummaryReadStats();
    assert.deepEqual(replay.commits.map(value => value.frame.timeline.seq), [201, 202]);
    assert.equal(after.selectedRecords - before.selectedRecords, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('stateful live reader retains reducer state across incremental reads', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-wire-stateful-live-'));
  let reader = null;
  try {
    const writer = LogV2Writer.open(options(root));
    const identity = { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true };
    const entry = (timestamp, model) => ({
      timestamp, url: 'codex://stateful', mainAgent: true,
      body: { model, input: [] }, response: { status: 200 },
    });
    writer.append(entry('2026-07-15T00:00:00.000Z', 'one'), identity);
    const timelinePath = join(writer.sessionDir, 'timeline.jsonl');
    const file = relative(root, timelinePath).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file);
    reader = createV2WireLiveReader({
      logDir: root, file, timelinePath, checkpoint: snapshot.liveCheckpoint,
    });

    writer.append(entry('2026-07-15T00:00:01.000Z', 'two'), identity);
    const first = await reader.read(snapshot.end.cursor);
    assert.deepEqual(first.commits.map(commit => commit.frame.timeline.seq), [2]);
    assert.equal('checkpoint' in first, false, 'full reducer state must not return to the main thread');

    writer.append(entry('2026-07-15T00:00:02.000Z', 'three'), identity);
    const second = await reader.read(first.cursor);
    assert.deepEqual(second.commits.map(commit => commit.frame.timeline.seq), [3]);
    assert.equal(second.commits[0].frame.entry.upsert, true);
  } finally {
    reader?.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test('stateful live reader rejects initialization failure instead of hanging ready', async () => {
  const reader = createV2WireLiveReader({
    logDir: '/nonexistent',
    file: 'missing/timeline.jsonl',
    timelinePath: '/nonexistent/timeline.jsonl',
    checkpoint: { invalid: true },
  });
  try {
    await assert.rejects(
      reader.read({}),
      error => /checkpoint|wire/i.test(error.message),
    );
  } finally {
    reader.close();
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

test('wire snapshot rebuilds summaries only for the selected window and pages older summaries lazily', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-wire-selected-summary-'));
  try {
    const writer = LogV2Writer.open(options(root));
    const identity = { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true };
    for (let index = 1; index <= 3; index++) {
      writer.append({
        timestamp: `2026-07-15T00:00:0${index}.000Z`,
        url: `codex://${index}`,
        mainAgent: true,
        body: { model: `model-${index}`, input: [] },
        response: { status: 200 },
      }, identity);
    }
    const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
    const seeded = readV2WireSnapshot(root, file, { limit: 3 });
    const oldest = seeded.pageIndex.values[0].winner.descriptor;
    const oldestRoot = oldest.parts['root.meta'];
    unlinkSync(join(writer.sessionDir, 'request-summaries.jsonl'));
    // If snapshot still rebuilt every winner, this deliberately unavailable
    // object from outside the selected window would make the request fail.
    unlinkSync(join(writer.sessionDir, `objects/${oldestRoot.hash.slice(0, 2)}/${oldestRoot.hash.slice(2, 4)}/${oldestRoot.hash}.json`));

    const snapshot = readV2WireSnapshot(root, file, { limit: 1 });
    assert.equal(snapshot.summaries.length, 1);
    assert.equal(snapshot.summaries[0].root.url, 'codex://3');
    assert.equal(snapshot.pageIndex.values.length, 3);
    assert.equal('summary' in snapshot.pageIndex.values[0], false);

    const page = readV2WirePageFromIndex(snapshot.pageIndex, {
      cursor: snapshot.end.cursor,
      beforeSeq: 3,
      limit: 1,
    });
    assert.equal(page.summaries.length, 1);
    assert.equal(page.summaries[0].root.url, 'codex://2');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('bounded winner summary reader validates archive identity and reads only requested sequences', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-wire-winner-summaries-'));
  try {
    const writer = LogV2Writer.open(options(root));
    const identity = { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true };
    for (let index = 1; index <= 5; index++) {
      writer.append({
        timestamp: `2026-07-15T00:00:0${index}.000Z`, url: `codex://${index}`,
        mainAgent: true, body: { model: `model-${index}`, input: [] }, response: { status: 200 },
      }, identity);
    }
    const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file, { limit: 2 });
    const winners = snapshot.checkpoint.winners;
    const before = getV2RequestSummaryReadStats();
    const summaries = readV2WireSummariesForWinners(root, file, winners);
    const after = getV2RequestSummaryReadStats();
    assert.deepEqual(summaries.map(value => value.seq), [4, 5]);
    assert.equal(after.selectedRecords - before.selectedRecords, 2);
    assert.throws(() => readV2WireSummariesForWinners(root, file, [{
      ...winners[0], descriptor: { ...winners[0].descriptor, archive: { ...winners[0].descriptor.archive, generation: 'other' } },
    }]), error => error.code === 'CXV_LOG_V2_WIRE_RESET_REQUIRED');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fresh page workers pread snapshot locators without rescanning long summary history', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-wire-page-summary-locators-'));
  try {
    const writer = LogV2Writer.open(options(root));
    const identity = { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true };
    for (let index = 1; index <= 120; index++) {
      writer.append({
        timestamp: new Date(Date.UTC(2026, 6, 15, 0, 0, index)).toISOString(),
        url: `codex://locator/${index}`, mainAgent: true,
        body: { model: `model-${index}`, input: [] }, response: { status: 200 },
      }, identity);
    }
    const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
    const snapshot = await readV2WireSnapshotAsync(root, file, { limit: 20 });
    assert.equal(snapshot.pageIndex.values.every(value => (
      value.summaryLocator === null
      || (Number.isSafeInteger(value.summaryLocator?.offset)
        && Number.isSafeInteger(value.summaryLocator?.length))
    )), true);

    const firstPage = readV2WirePageFromIndex(snapshot.pageIndex, {
      cursor: snapshot.end.cursor, beforeSeq: 101, limit: 20, deferSummaries: true,
    });
    const secondPage = readV2WirePageFromIndex(snapshot.pageIndex, {
      cursor: snapshot.end.cursor, beforeSeq: 81, limit: 20, deferSummaries: true,
    });
    assert.deepEqual(firstPage.checkpoint.winners.map(value => value.descriptor.seq),
      Array.from({ length: 20 }, (_, index) => index + 81));
    assert.deepEqual(secondPage.checkpoint.winners.map(value => value.descriptor.seq),
      Array.from({ length: 20 }, (_, index) => index + 61));

    // Exercise the production reader-worker operation as well as two entirely
    // fresh instrumented workers. A process-local cache cannot make these
    // assertions pass: locator pread must index zero historical records.
    const productionValues = await readV2WireSummariesAsync(root, file, firstPage.summaryWinners);
    assert.deepEqual(productionValues.map(value => value.seq),
      Array.from({ length: 20 }, (_, index) => index + 81));
    const firstStats = await readSummariesInFreshInstrumentedWorker(root, file, firstPage.summaryWinners);
    const secondStats = await readSummariesInFreshInstrumentedWorker(root, file, secondPage.summaryWinners);
    assert.deepEqual(firstStats, {
      seqs: Array.from({ length: 20 }, (_, index) => index + 81),
      indexedRecords: 0,
      selectedRecords: 20,
    });
    assert.deepEqual(secondStats, {
      seqs: Array.from({ length: 20 }, (_, index) => index + 61),
      indexedRecords: 0,
      selectedRecords: 20,
    });
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
