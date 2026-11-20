// Synthetic B3 baseline using the real V2 writer, publisher and SSE route.
// The slow response models write()/drain; this is not a browser/network test.
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { performance } from 'node:perf_hooks';
import { LogV2Writer } from '../../packages/app/lib/log-v2/writer.js';
import { readV2WireSnapshot } from '../../packages/app/lib/log-v2/transport.js';
import { closeIdleV2TimelinePublishers, getV2TimelineWatcherStats } from '../../packages/app/lib/log-v2/timeline-watcher.js';
import { registerV2ObjectHandle, serveLogV2Live } from '../../packages/app/server/lib/log-v2-routes.js';

async function benchmark(events, slowDrainMs) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-b3-live-benchmark-'));
  const clients = [];
  const timers = new Set();
  let sampledRssBytes = process.memoryUsage().rss;
  const started = performance.now();
  try {
    const writer = LogV2Writer.open({ rootDir: root, projectId: 'synthetic', canonicalCwd: '/synthetic',
      sessionId: 'benchmark', rootThreadId: 'benchmark', source: 'app-server', startReason: 'startup', durability: 'buffered' });
    const identity = { sessionId: 'benchmark', rootThreadId: 'benchmark', threadId: 'benchmark', agentRole: 'main', isRoot: true };
    const append = seq => writer.append({ timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, seq)).toISOString(),
      url: `codex://synthetic/${seq}`, mainAgent: true,
      body: { input: [{ role: 'user', content: `synthetic-${seq}` }] } }, identity);
    append(0);
    const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file);
    const handle = registerV2ObjectHandle(file, snapshot);
    let burstStarted;
    for (const delayMs of [0, slowDrainMs]) {
      const req = new EventEmitter(), res = new EventEmitter();
      const client = { req, res, delayMs, seqs: [], reset: null, firstFrameMs: null, completeMs: null };
      clients.push(client);
      client.done = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('synthetic live benchmark timed out')), 15_000);
        timers.add(timeout);
        client.finish = () => { clearTimeout(timeout); timers.delete(timeout); resolve(); };
      });
      res.writeHead = () => {};
      res.end = () => { res.writableEnded = true; client.finish(); };
      res.write = payload => {
        sampledRssBytes = Math.max(sampledRssBytes, process.memoryUsage().rss);
        if (client.firstFrameMs === null) client.firstFrameMs = performance.now() - burstStarted;
        const commit = payload.match(/event: v2_commit\ndata: ([^\n]+)/);
        if (commit) {
          client.seqs.push(JSON.parse(commit[1]).frame.timeline.seq);
          if (client.seqs.length === events) {
            client.completeMs = performance.now() - burstStarted;
            client.finish();
          }
        }
        const reset = payload.match(/event: v2_reset\ndata: ([^\n]+)/);
        if (reset) client.reset = JSON.parse(reset[1]).code;
        if (!delayMs) return true;
        res.writableNeedDrain = true;
        const timer = setTimeout(() => {
          timers.delete(timer); res.writableNeedDrain = false; res.emit('drain');
        }, delayMs);
        timers.add(timer);
        return false;
      };
      await serveLogV2Live(req, res, { logDir: root, file, getActiveFile: () => file,
        afterSeq: snapshot.end.cursor.throughSeq, generation: snapshot.start.archive.generation, objectHandle: handle });
    }
    burstStarted = performance.now();
    for (let i = 1; i <= events; i++) append(i);
    const burstWriteMs = performance.now() - burstStarted;
    await Promise.all(clients.map(client => client.done));
    const subscribersBeforeClose = getV2TimelineWatcherStats().subscribers;
    for (const client of clients) client.req.emit('close');
    assert.equal(getV2TimelineWatcherStats().subscribers, 0);
    const finalSnapshot = readV2WireSnapshot(root, file);
    assert.equal(finalSnapshot.end.cursor.throughSeq, events + 1);
    for (const client of clients) {
      if (events <= 256) {
        assert.equal(client.reset, null);
        assert.deepEqual(client.seqs, Array.from({ length: events }, (_, i) => i + 2));
      } else {
        assert.equal(client.reset, 'CXV_LOG_V2_WIRE_RESET_REQUIRED');
        assert.equal(client.seqs.length, 0);
      }
    }
    return { events, slowDrainMs, burstWriteMs, totalMs: performance.now() - started,
      sampledRssBytes, subscribersBeforeClose, subscribersAfterClose: getV2TimelineWatcherStats().subscribers,
      finalSnapshotSeq: finalSnapshot.end.cursor.throughSeq,
      clients: clients.map(({ delayMs, seqs, reset, firstFrameMs, completeMs }) => ({
        delayMs, delivered: seqs.length, reset, firstFrameMs, completeMs,
      })) };
  } finally {
    for (const client of clients) client.req.emit('close');
    for (const timer of timers) clearTimeout(timer);
    closeIdleV2TimelinePublishers();
    rmSync(root, { recursive: true, force: true });
  }
}

console.log(JSON.stringify({ runtime: process.version, platform: process.platform, arch: process.arch,
  scenarios: [await benchmark(200, 3), await benchmark(300, 3)] }, null, 2));
