import assert from 'node:assert/strict';
import test from 'node:test';

import { LogV2Archive } from '../src/utils/logV2Archive.js';
import { readV2CachedObjectBatch, reconcileV2CachedSnapshot } from '../src/utils/logV2Cache.js';
import { checkpointWireArchiveState, createWireArchiveState, applyWireCommit } from '../lib/log-v2/reducer.js';
import { LOG_V2_WIRE_KINDS, LOG_V2_WIRE_VERSION } from '../lib/log-v2/wire-schema.js';
import { batchLogV2ObjectRefs, LogV2ObjectStore } from '../src/utils/logV2ObjectStore.js';
import { fetchLogV2Page, fetchLogV2Snapshot, readNdjsonResponse } from '../src/utils/logV2Transport.js';
import { encodeV2ControlFragments } from '../server/lib/log-v2-routes.js';
import { extractLatestPlanUsage } from '../src/utils/rateLimitParser.js';

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

test('client archive exposes usage headers from lightweight summaries without hydration', () => {
  const state = createWireArchiveState(archiveIdentity);
  applyWireCommit(state, {
    kind: LOG_V2_WIRE_KINDS.commit, version: LOG_V2_WIRE_VERSION, archive: archiveIdentity, timelineBytes: 100,
    timeline: { seq: 1, eventId: 'event', txnId: 'txn', timestamp: '2026-07-16T00:00:00.000Z', threadId: 'thread', entryKey: 'entry', entryRevision: 1, inputRevision: null, phase: 'completed' },
    entry: { entryKey: 'entry', revision: 1, baseRevision: 0, set: {}, delete: [] },
  });
  const snapshot = {
    start: { kind: LOG_V2_WIRE_KINDS.start, version: LOG_V2_WIRE_VERSION, archive: archiveIdentity, objectHandle: 'handle' },
    checkpoint: checkpointWireArchiveState(state),
    summaries: [{
      seq: 1,
      root: { timestamp: '2026-07-16T00:00:00.000Z' },
      body: {},
      request: null,
      response: { headers: {
        'x-codex-active-limit': 'premium',
        'x-codex-plan-type': 'prolite',
        'x-codex-primary-used-percent': '19',
        'x-codex-primary-window-minutes': '10080',
        'x-codex-primary-reset-at': '1784505600',
      } },
    }],
    end: { kind: LOG_V2_WIRE_KINDS.end, version: LOG_V2_WIRE_VERSION, archive: archiveIdentity },
  };

  const archive = new LogV2Archive(snapshot);
  const usage = extractLatestPlanUsage(archive.rows);
  assert.equal(usage.source, 'codex');
  assert.equal(usage.planType, 'prolite');
  assert.equal(usage.windows[0].utilization, 0.19);
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

test('object cache reads duplicate refs through one IndexedDB transaction', async () => {
  let transactions = 0;
  const generation = 'batch-generation';
  const values = new Map([
    [`${generation}:${'a'.repeat(64)}`, { value: { cached: 'a' }, bytes: 12 }],
    [`${generation}:${'b'.repeat(64)}`, { value: { cached: 'b' }, bytes: 13 }],
  ]);
  const db = {
    transaction() {
      transactions++;
      let pending = 0;
      const tx = {
        objectStore() {
          return {
            get(cacheKey) {
              pending++;
              const request = {};
              queueMicrotask(() => {
                request.result = values.get(cacheKey);
                request.onsuccess?.();
                pending--;
                if (pending === 0) queueMicrotask(() => tx.oncomplete?.());
              });
              return request;
            },
          };
        },
      };
      return tx;
    },
  };
  const refs = [
    { hash: 'a'.repeat(64) },
    { hash: 'b'.repeat(64) },
    { hash: 'a'.repeat(64) },
    { hash: 'c'.repeat(64) },
  ];

  const cached = await readV2CachedObjectBatch(db, generation, refs);
  assert.equal(transactions, 1);
  assert.deepEqual([...cached.keys()], ['a'.repeat(64), 'b'.repeat(64)]);
  assert.deepEqual(cached.get('a'.repeat(64)), { hit: true, value: { cached: 'a' }, bytes: 12 });
});

test('object hydration deduplicates hashes, uses the batch cache, and globally bounds miss concurrency', async () => {
  const mib = 1024 * 1024;
  const refs = Array.from({ length: 7 }, (_, index) => ({
    hash: (index + 1).toString(16).repeat(64),
    bytes: 10 * mib,
  }));
  const cachedRef = refs[0];
  let cacheReads = 0;
  let active = 0;
  let peak = 0;
  const fetched = [];
  const store = new LogV2ObjectStore({
    handle: 'handle',
    archive: archiveIdentity,
    fetchConcurrency: 3,
    loadCachedObjects: async (_generation, requested) => {
      cacheReads++;
      assert.equal(new Set(requested.map(item => item.hash)).size, requested.length);
      return new Map([[cachedRef.hash, { hit: true, bytes: cachedRef.bytes, value: { source: 'cache' } }]]);
    },
    saveCachedObjects: () => {},
    fetchImpl: async (_url, options) => {
      active++;
      peak = Math.max(peak, active);
      const hashes = JSON.parse(options.body).hashes;
      fetched.push(...hashes);
      await new Promise(resolve => setTimeout(resolve, 5));
      active--;
      return new Response(`${hashes.map(hash => JSON.stringify({
        kind: LOG_V2_WIRE_KINDS.object,
        version: LOG_V2_WIRE_VERSION,
        hash,
        bytes: refs.find(item => item.hash === hash).bytes,
        value: { source: hash },
      })).join('\n')}\n`, { status: 200 });
    },
  });

  await Promise.all([
    store.hydrateRefs([...refs.slice(0, 4), refs[1], refs[2]]),
    store.hydrateRefs(refs.slice(4)),
  ]);
  assert.equal(cacheReads, 2);
  assert.equal(peak, 3);
  assert.equal(fetched.includes(cachedRef.hash), false);
  assert.equal(new Set(fetched).size, refs.length - 1);
  assert.equal(store.values.get(cachedRef.hash).source, 'cache');
  for (const refValue of refs.slice(1)) assert.equal(store.values.get(refValue.hash).source, refValue.hash);
});

test('object hydration honors an already-aborted signal before cache or network I/O', async () => {
  let cacheReads = 0;
  let fetches = 0;
  const controller = new AbortController();
  controller.abort();
  const store = new LogV2ObjectStore({
    handle: 'handle',
    archive: archiveIdentity,
    loadCachedObjects: async () => { cacheReads++; return new Map(); },
    fetchImpl: async () => { fetches++; return new Response(); },
  });
  await assert.rejects(
    () => store.hydrateRefs([{ hash: 'a'.repeat(64), bytes: 1 }], { signal: controller.signal }),
    error => error?.name === 'AbortError',
  );
  assert.equal(cacheReads, 0);
  assert.equal(fetches, 0);
});

test('shared object fetch gives each consumer independent abort semantics', async () => {
  const sharedRef = { hash: '8'.repeat(64), bytes: 1 };
  for (const abortIndex of [0, 1]) {
    let resolveFetch;
    let fetches = 0;
    let underlyingSignal = null;
    const store = new LogV2ObjectStore({
      handle: 'handle',
      archive: archiveIdentity,
      loadCachedObjects: async () => new Map(),
      saveCachedObjects: () => {},
      fetchImpl: async (_url, options) => {
        fetches++;
        underlyingSignal = options.signal;
        await new Promise(resolve => { resolveFetch = resolve; });
        return new Response(`${JSON.stringify({
          kind: LOG_V2_WIRE_KINDS.object,
          version: LOG_V2_WIRE_VERSION,
          hash: sharedRef.hash,
          bytes: sharedRef.bytes,
          value: { shared: true },
        })}\n`, { status: 200 });
      },
    });
    const controllers = [new AbortController(), new AbortController()];
    const hydrations = controllers.map(controller => store.hydrateRefs([sharedRef], { signal: controller.signal }));
    await new Promise(resolve => setImmediate(resolve));
    controllers[abortIndex].abort();
    await assert.rejects(hydrations[abortIndex], error => error?.name === 'AbortError');
    assert.equal(underlyingSignal.aborted, false);
    resolveFetch();
    await hydrations[1 - abortIndex];
    assert.equal(fetches, 1);
  }
});

test('overlapping object batches deduplicate each hash across concurrent consumers', async () => {
  const refs = ['a', 'b', 'c'].map(char => ({ hash: char.repeat(64), bytes: 1 }));
  const requested = [];
  const store = new LogV2ObjectStore({
    handle: 'handle',
    archive: archiveIdentity,
    loadCachedObjects: async () => new Map(),
    saveCachedObjects: () => {},
    fetchImpl: async (_url, options) => {
      const hashes = JSON.parse(options.body).hashes;
      requested.push(...hashes);
      await new Promise(resolve => setTimeout(resolve, 5));
      return new Response(`${hashes.map(hash => JSON.stringify({
        kind: LOG_V2_WIRE_KINDS.object,
        version: LOG_V2_WIRE_VERSION,
        hash,
        bytes: 1,
        value: { hash },
      })).join('\n')}\n`, { status: 200 });
    },
  });

  const first = store.hydrateRefs(refs.slice(0, 2));
  await new Promise(resolve => setImmediate(resolve));
  const second = store.hydrateRefs(refs.slice(1));
  await Promise.all([first, second]);
  assert.deepEqual([...requested].sort(), refs.map(refValue => refValue.hash).sort());
});

test('concurrent materialization keeps a per-consumer snapshot under a tiny decoded budget', async () => {
  const metaRef = { hash: '4'.repeat(64), bytes: 10 };
  const bodyRef = { hash: '5'.repeat(64), bytes: 10 };
  const values = new Map([
    [metaRef.hash, { shared: true }],
    [bodyRef.hash, { value: 'body' }],
  ]);
  const store = new LogV2ObjectStore({
    handle: 'handle',
    archive: archiveIdentity,
    maxDecodedBytes: 10,
    loadCachedObjects: async () => new Map(),
    saveCachedObjects: () => {},
    fetchImpl: async (_url, options) => {
      const hashes = JSON.parse(options.body).hashes;
      return new Response(`${hashes.map(hash => JSON.stringify({
        kind: LOG_V2_WIRE_KINDS.object,
        version: LOG_V2_WIRE_VERSION,
        hash,
        bytes: 10,
        value: values.get(hash),
      })).join('\n')}\n`, { status: 200 });
    },
  });
  const full = { parts: new Map([['root.meta', metaRef], ['root.body', bodyRef]]), input: null };
  const metaOnly = { parts: new Map([['root.meta', metaRef]]), input: null };

  const [first, second] = await Promise.all([
    store.materializeParts(full, ['root.meta', 'root.body']),
    store.materializeParts(metaOnly, ['root.meta']),
  ]);

  assert.deepEqual(first, { shared: true, body: { value: 'body' } });
  assert.deepEqual(second, { shared: true });
});

test('object hydration fails closed on conflicting declared bytes for shared and resident hashes', async () => {
  const hash = '6'.repeat(64);
  const original = { hash, bytes: 1 };
  const conflict = { hash, bytes: 2 };
  let releaseFetch;
  const store = new LogV2ObjectStore({
    handle: 'handle',
    archive: archiveIdentity,
    loadCachedObjects: async () => new Map(),
    saveCachedObjects: () => {},
    fetchImpl: async () => {
      await new Promise(resolve => { releaseFetch = resolve; });
      return new Response(`${JSON.stringify({
        kind: LOG_V2_WIRE_KINDS.object,
        version: LOG_V2_WIRE_VERSION,
        hash,
        bytes: original.bytes,
        value: { stable: true },
      })}\n`, { status: 200 });
    },
  });

  const first = store.hydrateRefs([original]);
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(() => store.hydrateRefs([conflict]), /Conflicting V2 object byte count/);
  releaseFetch();
  const snapshot = await first;
  assert.deepEqual(snapshot.get(hash), { stable: true });
  await assert.rejects(() => store.hydrateRefs([conflict]), /Conflicting V2 object byte count/);
  await assert.rejects(
    () => store.hydrateRefs([original, conflict]),
    /Conflicting V2 object byte count/,
  );
});

test('cache persistence failures do not fail completed object hydration', async () => {
  const objectRef = { hash: '7'.repeat(64), bytes: 1 };
  const failures = [
    () => { throw new Error('sync cache failure'); },
    async () => { throw new Error('async cache failure'); },
  ];
  for (const saveCachedObjects of failures) {
    const store = new LogV2ObjectStore({
      handle: 'handle',
      archive: archiveIdentity,
      loadCachedObjects: async () => new Map(),
      saveCachedObjects,
      fetchImpl: async () => new Response(`${JSON.stringify({
        kind: LOG_V2_WIRE_KINDS.object,
        version: LOG_V2_WIRE_VERSION,
        hash: objectRef.hash,
        bytes: objectRef.bytes,
        value: { hydrated: true },
      })}\n`, { status: 200 }),
    });
    const snapshot = await store.hydrateRefs([objectRef]);
    assert.deepEqual(snapshot.get(objectRef.hash), { hydrated: true });
  }
  await new Promise(resolve => setImmediate(resolve));
});

test('a failed object batch stops the same hydration from starting queued batches', async () => {
  const mib = 1024 * 1024;
  const refs = Array.from({ length: 6 }, (_, index) => ({
    hash: (index + 1).toString(16).repeat(64),
    bytes: 10 * mib,
  }));
  let fetches = 0;
  const store = new LogV2ObjectStore({
    handle: 'handle',
    archive: archiveIdentity,
    fetchConcurrency: 2,
    loadCachedObjects: async () => new Map(),
    saveCachedObjects: () => {},
    fetchImpl: async (_url, options) => {
      const call = ++fetches;
      if (call === 1) return new Response(JSON.stringify({ error: 'broken batch' }), { status: 500 });
      await new Promise(resolve => setTimeout(resolve, 10));
      const hashes = JSON.parse(options.body).hashes;
      return new Response(`${hashes.map(hash => JSON.stringify({
        kind: LOG_V2_WIRE_KINDS.object,
        version: LOG_V2_WIRE_VERSION,
        hash,
        bytes: refs.find(item => item.hash === hash).bytes,
        value: { hash },
      })).join('\n')}\n`, { status: 200 });
    },
  });

  await assert.rejects(() => store.hydrateRefs(refs), /broken batch/);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(fetches, 2);
});

test('object fetch retries 429 with bounded Retry-After handling', async () => {
  const objectRef = { hash: '9'.repeat(64), bytes: 1 };
  let attempts = 0;
  const store = new LogV2ObjectStore({
    handle: 'handle',
    archive: archiveIdentity,
    loadCachedObjects: async () => new Map(),
    saveCachedObjects: () => {},
    fetchImpl: async () => {
      attempts++;
      if (attempts < 3) {
        return new Response(JSON.stringify({ error: 'busy' }), {
          status: 429,
          headers: { 'Retry-After': '0' },
        });
      }
      return new Response(`${JSON.stringify({
        kind: LOG_V2_WIRE_KINDS.object,
        version: LOG_V2_WIRE_VERSION,
        hash: objectRef.hash,
        bytes: objectRef.bytes,
        value: { ok: true },
      })}\n`, { status: 200 });
    },
  });
  await store.hydrateRefs([objectRef]);
  assert.equal(attempts, 3);

  let rejectedAttempts = 0;
  const rejected = new LogV2ObjectStore({
    handle: 'handle',
    archive: archiveIdentity,
    loadCachedObjects: async () => new Map(),
    saveCachedObjects: () => {},
    fetchImpl: async () => {
      rejectedAttempts++;
      return new Response(JSON.stringify({ error: 'still busy' }), {
        status: 429,
        headers: { 'Retry-After': '0' },
      });
    },
  });
  await assert.rejects(() => rejected.hydrateRefs([objectRef]), /still busy/);
  assert.equal(rejectedAttempts, 3);
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
    file: 'project/20260715_session.cxvsession/timeline.jsonl',
    readOnly: true,
    fetchImpl: async (url) => {
      requested = url;
      return new Response(`${frames.map(frame => JSON.stringify(frame)).join('\n')}\n`);
    },
  });
  assert.match(requested, /\/api\/log-v2\/snapshot\?/);
  assert.match(requested, /file=project%2F20260715_session\.cxvsession%2Ftimeline\.jsonl/);
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
