import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { LogV2Writer } from '../lib/log-v2/writer.js';
import { resolveAppServerThreadIdentity } from '../lib/log-v2/identity.js';
import { readV2WirePage, readV2WireSnapshot } from '../lib/log-v2/transport.js';
import { materializeSessionArchive, resolveV2SessionFile, summarizeV2SessionArchive } from '../lib/log-v2/materializer.js';
import { materializeWireDescriptor, restoreWireArchiveState } from '../lib/log-v2/reducer.js';
import { readContentObjectSync } from '../lib/log-v2/storage.js';
import { inspectSessionArchive } from '../lib/log-v2/inspect.js';
import { validateSessionManifest } from '../lib/log-v2/schema.js';
import { activeTimelinePath, publishTimelineShard, readShardBaseline, readShardLayout, scanSessionTimelineSync } from '../lib/log-v2/shards.js';

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-shards-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const writer = LogV2Writer.open({ rootDir: root, projectId: 'p', canonicalCwd: '/fixture',
    sessionId: 's', durability: 'buffered' });
  writer.append({ timestamp: '2026-11-20T00:00:00Z', mainAgent: true, url: 'codex://test',
    body: { input: [{ type: 'message', role: 'user', content: 'one' }] }, response: { body: 'done' } },
  resolveAppServerThreadIdentity({ id: 's', sessionId: 's' }));
  const file = relative(root, join(writer.sessionDir, 'timeline.jsonl'));
  const snapshot = readV2WireSnapshot(root, file, { includeRevisionState: true });
  return { root, writer, file, checkpoint: snapshot.checkpoint };
}

test('shard publication preserves original bytes and uses one manifest commit point', t => {
  const { writer, checkpoint } = fixture(t);
  const original = readFileSync(activeTimelinePath(writer.sessionDir));
  const result = publishTimelineShard(writer.sessionDir, checkpoint, 1, { durable: false });
  assert.equal(result.activePart, 1);
  assert.equal(result.manifest.version, 3);
  assert.equal(validateSessionManifest({ ...result.manifest, version: 2 }).ok, false, 'a sharded archive cannot masquerade as the old layout');
  assert.deepEqual(readFileSync(join(writer.sessionDir, 'timeline.jsonl')), original);
  assert.equal(readFileSync(activeTimelinePath(writer.sessionDir), 'utf8'), '');
  const baseline = readShardBaseline(writer.sessionDir, 1);
  assert.equal(baseline.checkpoint.throughSeq, 1);
  assert.equal(baseline.checkpoint.timelineBytes, 0);
  assert.deepEqual(baseline.checkpoint.winners, []);
  const seqs = [];
  assert.equal(scanSessionTimelineSync(writer.sessionDir, ({ value }) => seqs.push(value.seq)).error, null);
  assert.deepEqual(seqs, [1]);
});

for (const stage of ['shard-directory-created', 'shard-baseline-persisted', 'shard-manifest-published']) {
  test(`shard interruption at ${stage} leaves one authoritative history and retains prepared bytes`, t => {
    const { writer, checkpoint } = fixture(t);
    assert.throws(() => publishTimelineShard(writer.sessionDir, checkpoint, 1, {
      durable: false, faultInjector(at) { if (at === stage) throw new Error(stage); },
    }), new RegExp(stage));
    const published = stage === 'shard-manifest-published';
    assert.equal(readShardLayout(writer.sessionDir).activePart, published ? 1 : 0);
    if (!published) {
      const prepared = readFileSync(join(writer.sessionDir, 'parts/1/prepare.json'));
      publishTimelineShard(writer.sessionDir, checkpoint, 1, { durable: false });
      const retained = readdirSync(join(writer.sessionDir, 'parts')).find(name => name.startsWith('.unpublished-1-'));
      assert.ok(retained);
      assert.deepEqual(readFileSync(join(writer.sessionDir, 'parts', retained, 'prepare.json')), prepared);
    }
    assert.equal(readShardBaseline(writer.sessionDir, 1).checkpoint.throughSeq, 1);
  });
}

test('shard baseline tampering and dangling directory aliases fail closed', t => {
  const { root, writer, checkpoint } = fixture(t);
  symlinkSync(join(root, 'absent'), join(writer.sessionDir, 'parts'));
  assert.throws(() => publishTimelineShard(writer.sessionDir, checkpoint, 1), /symbolic link/);
  rmSync(join(writer.sessionDir, 'parts'));
  publishTimelineShard(writer.sessionDir, checkpoint, 1, { durable: false });
  writeFileSync(join(writer.sessionDir, 'parts/1/baseline.json'), '{}\n');
  assert.throws(() => readShardBaseline(writer.sessionDir, 1));
});

test('progressive parts preserve revision chains, lazy historical pages, summaries and complete inspection', t => {
  const { root, writer, file, checkpoint } = fixture(t);
  const options = { rootDir: root, projectId: 'p', canonicalCwd: '/fixture', sessionId: 's', durability: 'buffered' };
  const original = readFileSync(join(writer.sessionDir, 'timeline.jsonl'));
  const identity = resolveAppServerThreadIdentity({ id: 's', sessionId: 's' });
  publishTimelineShard(writer.sessionDir, checkpoint, 1, { durable: false });
  for (let index = 2; index <= 3; index++) {
    const reopened = LogV2Writer.open(options);
    const result = reopened.append({ timestamp: `2026-11-20T00:00:0${index}Z`, mainAgent: true, url: 'codex://test',
      body: { input: [{ type: 'message', role: 'user', content: `prompt-${index}` }] }, response: { body: `reply-${index}` } }, identity);
    assert.equal(result.seq, index);
    const snapshot = readV2WireSnapshot(root, file, { includeRevisionState: true });
    assert.deepEqual(snapshot.checkpoint.winners.map(row => row.descriptor.seq), [index]);
    assert.equal(snapshot.start.hasMore, true);
    const state = restoreWireArchiveState(snapshot.checkpoint);
    let beforeSeq = index;
    for (let expected = index - 1; expected > 0; expected--) {
      const page = readV2WirePage(root, file, { cursor: snapshot.end.cursor, beforeSeq, limit: 1 });
      assert.equal(page.checkpoint.winners[0].descriptor.seq, expected);
      const descriptor = restoreWireArchiveState(page.checkpoint).winners.values().next().value;
      const entry = materializeWireDescriptor(descriptor, ref => readContentObjectSync(writer.sessionDir, {
        ...ref, algorithm: 'sha256', path: `objects/${ref.hash.slice(0, 2)}/${ref.hash.slice(2, 4)}/${ref.hash}.json`,
      }), { state });
      assert.equal(entry.body.input[0].content, expected === 1 ? 'one' : `prompt-${expected}`);
      beforeSeq = page.start.nextBeforeSeq;
      assert.equal(page.start.hasMore, expected > 1);
    }
    assert.equal(summarizeV2SessionArchive(writer.sessionDir).committedEvents, index);
    assert.equal(inspectSessionArchive(writer.sessionDir).ok, true);
    assert.equal(materializeSessionArchive(writer.sessionDir).entries.length, index);
    assert.equal(resolveV2SessionFile(root, file).timelinePath, activeTimelinePath(writer.sessionDir));
    if (index === 2) publishTimelineShard(writer.sessionDir, snapshot.checkpoint, 2, { durable: false });
  }
  assert.deepEqual(readFileSync(join(writer.sessionDir, 'timeline.jsonl')), original);
});

test('automatic sharding cuts at a new user prompt, defers in-flight tools and survives stale writers/restarts', t => {
  const { root, writer: original } = fixture(t);
  const options = { rootDir: root, projectId: 'p', canonicalCwd: '/fixture', sessionId: 's', durability: 'buffered', shardPrompts: 2 };
  let writer = LogV2Writer.open(options);
  const stale = LogV2Writer.open(options);
  const rootIdentity = resolveAppServerThreadIdentity({ id: 's', sessionId: 's' });
  const child = resolveAppServerThreadIdentity({ id: 'child', sessionId: 's', parentThreadId: 's' });
  const prompt = (number, inProgress = false) => ({ timestamp: `2026-11-20T00:00:${String(number).padStart(2, '0')}Z`,
    mainAgent: true, inProgress, url: 'codex://test',
    body: { input: [{ type: 'message', role: 'user', content: `prompt-${number}` }] }, response: { body: `reply-${number}` } });
  writer.append(prompt(2), rootIdentity);
  const frozen = readFileSync(join(writer.sessionDir, 'timeline.jsonl'));
  const tool = { ...prompt(10, true), mainAgent: false };
  writer.append(tool, child);
  writer.append(prompt(3), rootIdentity);
  assert.equal(readShardLayout(writer.sessionDir).activePart, 0, 'in-flight child prevents a cut');
  writer.append({ ...tool, inProgress: false }, child);
  const result = stale.append(prompt(4, true), rootIdentity);
  assert.equal(result.seq, 6);
  assert.equal(readShardLayout(writer.sessionDir).activePart, 1);
  assert.ok(readFileSync(join(writer.sessionDir, 'timeline.jsonl')).subarray(0, frozen.length).equals(frozen));
  assert.equal(readV2WireSnapshot(root, relative(root, join(writer.sessionDir, 'timeline.jsonl'))).start.shard.part, 1);
  writer = LogV2Writer.open(options);
  writer.append(prompt(4, false), rootIdentity);
  writer.append(prompt(5), rootIdentity);
  assert.equal(readShardLayout(writer.sessionDir).activePart, 1, 'second part has exactly two prompts');
  writer = LogV2Writer.open(options);
  writer.append(prompt(6), rootIdentity);
  const layout = readShardLayout(writer.sessionDir);
  assert.equal(layout.activePart, 2);
  assert.deepEqual(layout.cuts.map(cut => cut.promptCount), [3, 5]);
  assert.equal(summarizeV2SessionArchive(original.sessionDir).committedEvents, 9);
  assert.equal(inspectSessionArchive(original.sessionDir).ok, true);
});
