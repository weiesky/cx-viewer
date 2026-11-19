// B0 fault-injection evidence. Exit 0 means known pre-migration behavior was
// observed, including defects. No user configuration or Codex process is used.
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { runInNewContext } from 'node:vm';
import { LogV2Writer } from '../../lib/log-v2/writer.js';
import { readV2WireSnapshot } from '../../lib/log-v2/transport.js';
import { registerV2ObjectHandle, serveLogV2Live } from '../../server/lib/log-v2-routes.js';
import { closeIdleV2TimelinePublishers, getV2TimelineWatcherStats } from '../../lib/log-v2/timeline-watcher.js';
import { isV2ConversationCandidate } from '../../src/utils/logV2Archive.js';

const source = readFileSync(new URL('../../src/AppBase.jsx', import.meta.url), 'utf8');
function extract(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `source anchors changed: ${start}`);
  return source.slice(a, b);
}
const swallowed = [];
const Host = runInNewContext(`(class {
  ${extract('  _queueV2Commit(commit, epoch = this._v2Epoch) {', '  _resetV2Communication() {')}
  ${extract('  handleEntryObject(entry) {', '  _flushPendingEntries =')}
})`, {
  isV2ConversationCandidate,
  requestAnimationFrame: () => 1,
  reportSwallowed: (scope, error) => swallowed.push([scope, error.message]),
  console: { error: (...args) => swallowed.push(args.map(String)) },
});
for (const failure of ['apply', 'enqueue']) {
  let resets = 0;
  let applies = 0;
  const h = Object.assign(new Host(), {
    _v2Epoch: 1, _v2AppliedSeq: 1, _v2LiveChain: Promise.resolve(),
    _pendingEntries: { push() { throw new Error('B0 enqueue failure'); } },
    _resetV2Communication() { resets++; },
    _v2Archive: { applyCommit() {
      applies++;
      if (failure === 'apply') throw new Error('B0 apply failure');
      return { timestamp: 'fixture', _classification: { type: 'Metadata' }, body: {} };
    } },
  });
  const commit = { frame: { timeline: { seq: 2 } } };
  h._queueV2Commit(commit);
  await h._v2LiveChain;
  assert.equal(h._v2AppliedSeq, failure === 'enqueue' ? 2 : 1);
  assert.equal(resets, failure === 'enqueue' ? 0 : 1);
  if (failure === 'enqueue') {
    h._queueV2Commit(commit);
    await h._v2LiveChain;
    assert.equal(applies, 1, 'acknowledged frame is skipped on resend');
  }
  console.log(JSON.stringify({ scenario: `client-${failure}-failure`, appliedSeq: h._v2AppliedSeq, resets, applies }));
}

const root = mkdtempSync(join(tmpdir(), 'cxv-b0-live-failure-'));
try {
  for (const failure of ['once', 'always']) {
    const writer = LogV2Writer.open({ rootDir: root, projectId: 'fixture', canonicalCwd: '/fixture',
      sessionId: failure, rootThreadId: failure, source: 'app-server', startReason: 'startup', durability: 'buffered' });
    const identity = { sessionId: failure, rootThreadId: failure, threadId: failure, agentRole: 'main', isRoot: true };
    const entry = timestamp => ({ timestamp, url: 'codex://fixture', mainAgent: true, body: { input: [] } });
    writer.append(entry('2026-07-15T00:00:00Z'), identity);
    const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
    const snapshot = readV2WireSnapshot(root, file);
    const handle = registerV2ObjectHandle(file, snapshot);
    writer.append(entry('2026-07-15T00:01:00Z'), identity);
    const req = new EventEmitter();
    const res = new EventEmitter();
    let writes = 0;
    let finish;
    let timer;
    const done = new Promise((resolve, reject) => {
      finish = resolve;
      timer = setTimeout(() => reject(new Error('SSE injection timed out')), 3000);
    });
    let rejection = null;
    const onRejection = error => { rejection = error.message; finish(); };
    process.on('unhandledRejection', onRejection);
    res.writeHead = () => {};
    res.write = () => {
      writes++;
      if (writes === 1 || failure === 'always') throw new Error('B0 write failure');
      return true;
    };
    res.end = () => { res.writableEnded = true; finish(); };
    try {
      await serveLogV2Live(req, res, { logDir: root, file, getActiveFile: async () => file,
        afterSeq: snapshot.end.cursor.throughSeq, generation: snapshot.start.archive.generation, objectHandle: handle });
      await done;
      // Let the subscriber catch/finally finish after end() resolves the probe.
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(!!res.writableEnded, failure === 'once');
      assert.equal(rejection, failure === 'always' ? 'B0 write failure' : null);
      assert.equal(getV2TimelineWatcherStats().subscribers, failure === 'once' ? 0 : 1);
      console.log(JSON.stringify({ scenario: `server-write-${failure}`, writes, ended: !!res.writableEnded,
        unhandledRejection: rejection, subscribersBeforeCleanup: getV2TimelineWatcherStats().subscribers }));
    } finally {
      clearTimeout(timer);
      process.off('unhandledRejection', onRejection);
      req.emit('close');
      closeIdleV2TimelinePublishers();
    }
  }
} finally { rmSync(root, { recursive: true, force: true }); }
