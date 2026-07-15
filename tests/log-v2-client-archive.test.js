import assert from 'node:assert/strict';
import test from 'node:test';

import { LogV2Archive } from '../src/utils/logV2Archive.js';
import { reconcileV2CachedSnapshot } from '../src/utils/logV2Cache.js';
import { checkpointWireArchiveState, createWireArchiveState, applyWireCommit } from '../lib/log-v2/reducer.js';
import { LOG_V2_WIRE_KINDS, LOG_V2_WIRE_VERSION } from '../lib/log-v2/wire-schema.js';
import { batchLogV2ObjectRefs } from '../src/utils/logV2ObjectStore.js';
import { fetchLogV2Page, fetchLogV2Snapshot, readNdjsonResponse } from '../src/utils/logV2Transport.js';
import { encodeV2ControlFragments } from '../server/lib/log-v2-routes.js';

const archiveIdentity = { projectId: 'project', sessionId: 'session', generation: 'generation' };
const ref = (char, value) => ({ ref: { hash: char.repeat(64), bytes: JSON.stringify(value).length }, value });

test('client archive exposes lightweight rows and hydrates exact detail objects on demand', async () => {
  const meta = ref('a', { timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://one', mainAgent: true });
  const body = ref('b', { model: 'gpt-test' });
  const input = ref('c', { role: 'user', content: 'hello' });
  const state = createWireArchiveState(archiveIdentity);
  applyWireCommit(state, {
    kind: LOG_V2_WIRE_KINDS.commit, version: LOG_V2_WIRE_VERSION, archive: archiveIdentity, timelineBytes: 100,
    timeline: { seq: 1, eventId: 'event', txnId: 'txn', timestamp: '2026-07-15T00:00:00.000Z', threadId: 'thread', entryKey: 'entry', entryRevision: 1, inputRevision: 1, phase: 'completed' },
    entry: { entryKey: 'entry', revision: 1, baseRevision: 0, set: { 'root.meta': meta.ref, 'root.body': body.ref }, delete: [], inputBinding: { revision: 1, path: 'root.body.input', changed: true } },
    input: { revision: 1, baseRevision: 0, path: 'root.body.input', retain: 0, remove: 0, append: [input.ref] },
  });
  const objects = new Map([meta, body, input].map(item => [item.ref.hash, item.value]));
  const objectRefs = new Map([meta, body, input].map(item => [item.ref.hash, item.ref]));
  let fetches = 0;
  const fetchImpl = async (_url, options) => {
    fetches++;
    const hashes = JSON.parse(options.body).hashes;
    const text = hashes.map(hash => JSON.stringify({ kind: LOG_V2_WIRE_KINDS.object, version: LOG_V2_WIRE_VERSION, hash, bytes: objectRefs.get(hash).bytes, value: objects.get(hash) })).join('\n') + '\n';
    return new Response(text, { status: 200 });
  };
  const snapshot = {
    start: { kind: LOG_V2_WIRE_KINDS.start, version: LOG_V2_WIRE_VERSION, archive: archiveIdentity, objectHandle: 'handle' },
    checkpoint: checkpointWireArchiveState(state),
    summaries: [{ seq: 1, root: { timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://one', mainAgent: true }, body: { model: 'gpt-test' }, request: null, response: null }],
    end: { kind: LOG_V2_WIRE_KINDS.end, version: LOG_V2_WIRE_VERSION, archive: archiveIdentity },
  };
  const archive = new LogV2Archive(snapshot, { fetchImpl });

  assert.equal(fetches, 0);
  assert.equal(archive.rows[0].body.model, 'gpt-test');
  assert.equal(archive.rows[0]._classification.type, 'MainAgent');
  const exact = await archive.hydrate(archive.rows[0]._v2RowHandle);
  assert.equal(fetches, 1);
  assert.deepEqual(exact, {
    timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://one', mainAgent: true,
    body: { model: 'gpt-test', input: [{ role: 'user', content: 'hello' }] },
  });
  await archive.hydrate(archive.rows[0]._v2RowHandle);
  assert.equal(fetches, 1);
});

test('object hydration batches by count and declared bytes while streaming one oversized object alone', () => {
  const mib = 1024 * 1024;
  const refs = [
    { hash: 'd'.repeat(64), bytes: 10 * mib },
    { hash: 'e'.repeat(64), bytes: 10 * mib },
    { hash: 'f'.repeat(64), bytes: 20 * mib },
    { hash: '1'.repeat(64), bytes: 1 },
  ];
  const batches = batchLogV2ObjectRefs(refs);
  assert.deepEqual(batches.map(batch => batch.map(ref => ref.hash)), [
    ['d'.repeat(64)], ['e'.repeat(64)], ['f'.repeat(64)], ['1'.repeat(64)],
  ]);
});

test('fragmented control frames apply atomically only after every part arrives', async () => {
  const value = { kind: 'large-checkpoint', text: '你好'.repeat(1000) };
  const json = JSON.stringify(value);
  const base64 = Buffer.from(json).toString('base64');
  const split = Math.ceil(base64.length / 2 / 4) * 4;
  const frames = [
    { kind: LOG_V2_WIRE_KINDS.fragmentStart, version: LOG_V2_WIRE_VERSION, id: 'f1', bytes: Buffer.byteLength(json), parts: 2 },
    { kind: LOG_V2_WIRE_KINDS.fragmentPart, version: LOG_V2_WIRE_VERSION, id: 'f1', index: 0, data: base64.slice(0, split) },
    { kind: LOG_V2_WIRE_KINDS.fragmentPart, version: LOG_V2_WIRE_VERSION, id: 'f1', index: 1, data: base64.slice(split) },
    { kind: LOG_V2_WIRE_KINDS.fragmentEnd, version: LOG_V2_WIRE_VERSION, id: 'f1' },
  ];
  const response = new Response(`${frames.map(frame => JSON.stringify(frame)).join('\n')}\n`);
  assert.deepEqual(await readNdjsonResponse(response), [value]);
  const incomplete = new Response(`${frames.slice(0, 2).map(frame => JSON.stringify(frame)).join('\n')}\n`);
  await assert.rejects(() => readNdjsonResponse(incomplete), /Incomplete V2 fragmented response/);
});

test('server fragments every oversized wire/2 control value into bounded frames', async () => {
  const value = { kind: 'oversized', text: '界'.repeat(400_000) };
  const encoded = encodeV2ControlFragments(value, { id: 'bounded', event: 'v2_commit' });
  assert.ok(encoded.frames.length > 3);
  assert.equal(encoded.frames[0].event, 'v2_commit');
  assert.equal(encoded.frames.every(frame => Buffer.byteLength(JSON.stringify(frame)) < 1024 * 1024), true);
  const response = new Response(`${encoded.frames.map(frame => JSON.stringify(frame)).join('\n')}\n`);
  assert.deepEqual(await readNdjsonResponse(response), [value]);
});

test('readonly V2 history snapshot sends the validated locator through the reference protocol', async () => {
  let requested = '';
  const frames = [
    { kind: LOG_V2_WIRE_KINDS.start, version: LOG_V2_WIRE_VERSION, archive: archiveIdentity, objectHandle: 'h' },
    { kind: LOG_V2_WIRE_KINDS.checkpoint, version: LOG_V2_WIRE_VERSION, archive: archiveIdentity, throughSeq: 0, timelineBytes: 0, entries: [], threads: [], winners: [] },
    { kind: LOG_V2_WIRE_KINDS.end, version: LOG_V2_WIRE_VERSION, archive: archiveIdentity, cursor: { archive: archiveIdentity, throughSeq: 0, timelineBytes: 0 } },
  ];
  await fetchLogV2Snapshot({
    file: 'v2/projects/p/sessions/2026/07/15/s.cxvsession/timeline.jsonl',
    readOnly: true,
    fetchImpl: async (url) => {
      requested = url;
      return new Response(`${frames.map(frame => JSON.stringify(frame)).join('\n')}\n`);
    },
  });
  assert.match(requested, /\/api\/log-v2\/snapshot\?/);
  assert.match(requested, /file=v2%2Fprojects%2F/);
  assert.match(requested, /mode=readonly/);
});

test('page fetch acknowledges only the page token committed by the client', async () => {
  let requestBody = null;
  const frames = [
    { kind: LOG_V2_WIRE_KINDS.start, version: LOG_V2_WIRE_VERSION, archive: archiveIdentity, page: true, pageToken: 'page-1' },
    { kind: LOG_V2_WIRE_KINDS.checkpoint, version: LOG_V2_WIRE_VERSION, archive: archiveIdentity, throughSeq: 0, timelineBytes: 0, entries: [], threads: [], winners: [] },
    { kind: LOG_V2_WIRE_KINDS.end, version: LOG_V2_WIRE_VERSION, archive: archiveIdentity, cursor: { archive: archiveIdentity, throughSeq: 0, timelineBytes: 0 } },
  ];
  const page = await fetchLogV2Page({
    handle: 'handle',
    archive: archiveIdentity,
    ackPageToken: 'page-0',
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return new Response(`${frames.map(frame => JSON.stringify(frame)).join('\n')}\n`);
    },
  });
  assert.equal(requestBody.ackPageToken, 'page-0');
  assert.equal(page.start.pageToken, 'page-1');
});

test('validated cached snapshot reuses checkpoint while replacing the expired handle', async () => {
  const cursor = {
    archive: archiveIdentity,
    throughSeq: 3,
    timelineBytes: 120,
    fileId: '1:2',
    tailHash: 'a'.repeat(64),
  };
  const cached = {
    start: { kind: LOG_V2_WIRE_KINDS.start, version: LOG_V2_WIRE_VERSION, archive: archiveIdentity, objectHandle: 'expired' },
    checkpoint: { kind: LOG_V2_WIRE_KINDS.checkpoint, version: LOG_V2_WIRE_VERSION, archive: archiveIdentity, throughSeq: 3, timelineBytes: 120, entries: [], threads: [], winners: [] },
    summaries: [],
    end: { kind: LOG_V2_WIRE_KINDS.end, version: LOG_V2_WIRE_VERSION, archive: archiveIdentity, cursor },
  };
  let requested = '';
  const response = await fetchLogV2Snapshot({
    knownCursor: cursor,
    fetchImpl: async (url) => {
      requested = url;
      return new Response(`${JSON.stringify({ ...cached.start, objectHandle: 'fresh', notModified: true })}\n${JSON.stringify(cached.end)}\n`);
    },
  });
  const reconciled = reconcileV2CachedSnapshot(cached, response);
  assert.equal(reconciled.start.objectHandle, 'fresh');
  assert.equal(reconciled.checkpoint, cached.checkpoint);
  assert.match(requested, /knownGeneration=generation/);
  assert.match(requested, /knownThroughSeq=3/);
  assert.match(requested, /knownTimelineBytes=120/);
});
