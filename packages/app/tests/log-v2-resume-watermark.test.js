import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';
import { LogV2Writer } from '../lib/log-v2/writer.js';
import { applyWireCommit, materializeWireDescriptor, restoreWireArchiveState } from '../lib/log-v2/reducer.js';
import { readContentObjectSync } from '../lib/log-v2/storage.js';
import { readV2WireSnapshot } from '../lib/log-v2/transport.js';
import { closeIdleV2TimelinePublishers, watchV2Timeline } from '../lib/log-v2/timeline-watcher.js';

const rootIdentity = { sessionId: 'session', rootThreadId: 'session', threadId: 'session', agentRole: 'main', isRoot: true };
const subIdentity = { ...rootIdentity, threadId: 'new-child', parentThreadId: 'session', agentRole: 'subagent', isRoot: false };
const entry = (index, input, child = false) => ({
  timestamp: `2026-11-18T00:00:0${index}.000Z`, url: `codex://sdk/${child ? 'new-child' : index}`,
  mainAgent: !child, ...(child ? { subAgent: true } : {}),
  body: { input }, response: { status: 200, body: { content: [{ type: 'text', text: `answer ${index}` }] } },
});

function subscriber(options) {
  const commits = [], waiters = [];
  let error = null;
  const stop = watchV2Timeline({ ...options,
    onCommits(values) {
      commits.push(...values);
      for (const waiter of [...waiters]) if (commits.some(commit => commit.frame.timeline.seq >= waiter.seq)) waiter.finish();
    },
    onError(failure) { error = failure; for (const waiter of [...waiters]) waiter.finish(failure); },
  });
  return { commits, stop, through(seq) {
    if (error) return Promise.reject(error);
    if (commits.some(commit => commit.frame.timeline.seq >= seq)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const waiter = { seq, finish(failure) {
        clearTimeout(timer); waiters.splice(waiters.indexOf(waiter), 1);
        if (failure) reject(failure); else resolve();
      } };
      const timer = setTimeout(() => waiter.finish(new Error(`missing live sequence ${seq}`)), 10000);
      waiters.push(waiter);
    });
  } };
}

for (const evicted of [false, true]) for (const seeded of [false, true]) {
  test(`resumed history forwards pre-attach appends once (${evicted ? 'evicted' : 'cold'}, ${seeded ? 'seeded' : 'rebuilt'} checkpoint)`, { timeout: 20000 }, async () => {
    const root = mkdtempSync(join(tmpdir(), 'cxv-v2-resume-watermark-'));
    let live, previous;
    try {
      const options = { rootDir: root, projectId: 'project', canonicalCwd: '/workspace/project',
        sessionId: 'session', rootThreadId: 'session', source: 'sdk', durability: 'buffered' };
      const writer = LogV2Writer.open(options);
      const first = [{ role: 'user', content: 'old question' }];
      writer.append(entry(1, first), rootIdentity);
      const timelinePath = join(writer.sessionDir, 'timeline.jsonl');
      const file = relative(root, timelinePath).split('\\').join('/');
      let snapshot = readV2WireSnapshot(root, file);
      let next = 2;
      if (evicted) {
        previous = subscriber({ logDir: root, file, timelinePath, cursor: snapshot.end.cursor,
          seedCheckpoint: snapshot.liveCheckpoint });
        writer.append(entry(next++, [...first, { role: 'assistant', content: 'old answer' }]), rootIdentity);
        await previous.through(2);
        snapshot = readV2WireSnapshot(root, file);
        previous.stop(); closeIdleV2TimelinePublishers();
      }
      const resumed = entry(next++, [...first, { role: 'assistant', content: 'old answer' },
        { role: 'user', content: 'resumed question before attach' }]);
      const child = entry(next++, [{ role: 'user', content: 'new child question before attach' }], true);
      // A separate producer finishes writing and exits before any re-attach.
      // No later append or watcher event can rescue a swallowed first turn.
      execFileSync(process.execPath, ['--input-type=module', '-e', `
        import { LogV2Writer } from ${JSON.stringify(new URL('../lib/log-v2/writer.js', import.meta.url).href)};
        const { options, entries, identities } = JSON.parse(process.argv[1]);
        const writer = LogV2Writer.open(options);
        entries.forEach((value, index) => writer.append(value, identities[index]));
      `, JSON.stringify({ options, entries: [resumed, child], identities: [rootIdentity, subIdentity] })]);
      const baseline = snapshot.end.cursor.throughSeq;
      live = subscriber({ logDir: root, file, timelinePath, cursor: snapshot.end.cursor,
        ...(seeded ? { seedCheckpoint: snapshot.liveCheckpoint } : {}) });
      await live.through(baseline + 2);
      assert.deepEqual(live.commits.map(commit => commit.frame.timeline.seq), [baseline + 1, baseline + 2]);
      const state = restoreWireArchiveState(snapshot.checkpoint);
      const assembled = live.commits.map(commit => {
        const descriptor = applyWireCommit(state, commit.frame);
        return materializeWireDescriptor(descriptor, ref => readContentObjectSync(writer.sessionDir, {
          ...ref, algorithm: 'sha256', path: `objects/${ref.hash.slice(0, 2)}/${ref.hash.slice(2, 4)}/${ref.hash}.json`,
        }), { state });
      });
      assert.deepEqual(assembled, [resumed, child]);
      LogV2Writer.open(options).append(entry(next, [{ role: 'user', content: 'later turn' }]), rootIdentity);
      await live.through(baseline + 3);
      assert.deepEqual(live.commits.map(commit => commit.frame.timeline.seq), [baseline + 1, baseline + 2, baseline + 3]);
    } finally {
      live?.stop(); previous?.stop(); closeIdleV2TimelinePublishers();
      rmSync(root, { recursive: true, force: true });
    }
  });
}
