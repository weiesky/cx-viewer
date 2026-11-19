import test from 'node:test';
import assert from 'node:assert/strict';

test('same-name workspaces keep independent browser entries, session history and metadata', async () => {
  const previous = { window: globalThis.window, indexedDB: globalThis.indexedDB, localStorage: globalThis.localStorage };
  const stores = new Map([['entries', new Map()], ['sessions', new Map()]]);
  const meta = new Map();
  const db = {
    transaction(name) {
      const tx = { objectStore: () => ({
        put(value, key) { stores.get(name).set(key, structuredClone(value)); queueMicrotask(() => tx.oncomplete?.()); },
        delete(key) { stores.get(name).delete(key); queueMicrotask(() => tx.oncomplete?.()); },
        get(key) {
          const req = {};
          queueMicrotask(() => { req.result = structuredClone(stores.get(name).get(key)); req.onsuccess?.(); });
          return req;
        },
      }) };
      return tx;
    },
  };
  globalThis.indexedDB = { open() {
    const req = {};
    queueMicrotask(() => { req.result = db; req.onsuccess?.(); });
    return req;
  } };
  globalThis.localStorage = { getItem: key => meta.get(key), setItem: (key, value) => meta.set(key, value), removeItem: key => meta.delete(key) };
  const loadModule = async instance => {
    globalThis.window = { location: new URL(`http://viewer.example/${instance ? `?instance=${instance}` : ''}`) };
    const cache = await import('../src/utils/entryCache.js?test=spa-isolation');
    return new Proxy(cache, { get(target, name) { if (typeof target[name] !== 'function') return target[name]; return (...args) => {
      window.location = new URL(`http://viewer.example/${instance ? `?instance=${instance}` : ''}`);
      return target[name](...args);
    }; } });
  };
  try {
    const legacy = await loadModule(null), a = await loadModule('cxv-a'), b = await loadModule('cxv-b');
    const old = [{ timestamp: 'old', text: 'legacy' }];
    const first = [{ timestamp: 'a', text: 'A' }], second = [{ timestamp: 'b', text: 'B' }];
    await legacy.saveEntries('same', old);
    await Promise.all([a.saveEntries('same', first), b.saveEntries('same', second)]);
    await Promise.all([a.saveSessionEntries('same', 'thread', first), b.saveSessionEntries('same', 'thread', second)]);
    assert.deepEqual(await legacy.loadEntries('same'), old);
    assert.deepEqual(await a.loadEntries('same'), first);
    assert.deepEqual(await b.loadEntries('same'), second);
    assert.deepEqual(await a.loadSessionEntries('same', 'thread'), first);
    assert.deepEqual(await b.loadSessionEntries('same', 'thread'), second);
    assert.equal(a.getCacheMeta().lastTs, 'a');
    assert.equal(b.getCacheMeta().lastTs, 'b');
    await a.clearEntries();
    assert.equal(a.getCacheMeta(), null);
    assert.deepEqual(await b.loadEntries('same'), second);
    assert.deepEqual(await legacy.loadEntries('same'), old);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});

test('clearing entries invalidates a pending old write before IndexedDB opens', async () => {
  const previous = { window: globalThis.window, indexedDB: globalThis.indexedDB, localStorage: globalThis.localStorage };
  const meta = new Map(), entries = new Map();
  let opening;
  globalThis.window = { location: new URL('http://viewer.example/?instance=resume-race') };
  globalThis.localStorage = { getItem: key => meta.get(key), setItem: (key, value) => meta.set(key, value), removeItem: key => meta.delete(key) };
  globalThis.indexedDB = { open() { opening = {}; return opening; } };
  try {
    const cache = await import('../src/utils/entryCache.js?test=resume-race');
    const saving = cache.saveEntries('same', [{ timestamp: 'old', text: 'old conversation' }]);
    const clearing = cache.clearEntries();
    opening.result = { transaction() {
      const tx = { objectStore: () => ({ put: (value, key) => entries.set(key, value), delete: key => entries.delete(key) }) };
      queueMicrotask(() => tx.oncomplete?.()); return tx;
    } };
    opening.onsuccess();
    await Promise.all([saving, clearing]);
    assert.equal(cache.getCacheMeta(), null);
    assert.equal(entries.size, 0);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});
