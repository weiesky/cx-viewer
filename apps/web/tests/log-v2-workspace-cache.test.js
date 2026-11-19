import assert from 'node:assert/strict';
import test from 'node:test';
import { loadV2CachedSnapshot, saveV2CachedSnapshot, v2SnapshotCacheScope } from '../src/utils/logV2Cache.js';

test('persisted snapshot cursors stay within the instance, proxy path and selected archive', async t => {
  const records = new Map();
  const db = { objectStoreNames: { contains: () => true }, transaction() {
    const tx = { objectStore: () => ({
      get(key) { const request = {}; queueMicrotask(() => { request.result = records.get(key); request.onsuccess(); }); return request; },
      put(value, key) { records.set(key, value); queueMicrotask(() => tx.oncomplete()); },
    }) };
    return tx;
  } };
  for (const key of ['window', 'indexedDB']) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    t.after(() => { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; });
  }
  globalThis.indexedDB = { open() {
    const request = { result: db }; queueMicrotask(() => request.onsuccess()); return request;
  } };
  globalThis.window = { location: new URL('http://fixture/viewer/?instance=a&token=first'), __CXV_BASE_PATH__: '/viewer/' };
  const snapshot = { start: {}, checkpoint: {}, summaries: [], end: { cursor: { archive: { projectId: 'same', sessionId: 'thread-a' } } } };
  const a = v2SnapshotCacheScope(200);
  await saveV2CachedSnapshot(a, snapshot);
  window.location.search = '?instance=b&token=first';
  assert.equal(await loadV2CachedSnapshot(v2SnapshotCacheScope(200)), null);
  window.location.search = '?instance=a&token=rotated';
  assert.equal(v2SnapshotCacheScope(200), a, 'credential changes neither partition nor enter cache keys');
  assert.deepEqual(await loadV2CachedSnapshot(a), snapshot);
  assert.equal(await loadV2CachedSnapshot(v2SnapshotCacheScope(400)), null);
  assert.equal(await loadV2CachedSnapshot(v2SnapshotCacheScope(200, 'same/archive/timeline.jsonl')), null);
  window.__CXV_BASE_PATH__ = '/other-backend/';
  assert.equal(await loadV2CachedSnapshot(v2SnapshotCacheScope(200)), null);
  window.__CXV_BASE_PATH__ = '/viewer/'; window.location.search = '';
  assert.equal(await loadV2CachedSnapshot(v2SnapshotCacheScope(200)), null, 'legacy unscoped pages do not inherit an explicit instance cursor');
  assert.ok(!a.includes('first'));
});
