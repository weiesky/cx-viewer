const DB_NAME = 'cxv_logV2WireCache';
const DB_VERSION = 2;
const OBJECT_STORE = 'objects';
const SNAPSHOT_STORE = 'snapshots';
const MAX_PERSISTED_OBJECT_BYTES = 2 * 1024 * 1024;
const MAX_SNAPSHOT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let dbPromise = null;

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let settled = false;
    const finish = (value) => {
      if (settled) {
        if (value) value.close();
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve(value);
    };
    const timeout = setTimeout(() => finish(null), 500);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OBJECT_STORE)) db.createObjectStore(OBJECT_STORE);
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) db.createObjectStore(SNAPSHOT_STORE);
    };
    request.onsuccess = () => finish(request.result);
    request.onerror = () => finish(null);
    request.onblocked = () => finish(null);
  });
  return dbPromise;
}

function key(generation, hash) {
  return `${generation}:${hash}`;
}

export async function loadV2CachedObject(generation, hash) {
  const values = await loadV2CachedObjects(generation, [{ hash }]);
  return values.get(hash) || null;
}

/** Read many object keys through one IndexedDB transaction. */
export function readV2CachedObjectBatch(db, generation, refs) {
  const hashes = [...new Set((refs || []).map(ref => ref?.hash).filter(Boolean))];
  if (!db || !generation || hashes.length === 0) return Promise.resolve(new Map());
  return new Promise((resolve) => {
    const values = new Map();
    let tx;
    try {
      tx = db.transaction(OBJECT_STORE, 'readonly');
      const store = tx.objectStore(OBJECT_STORE);
      for (const hash of hashes) {
        const request = store.get(key(generation, hash));
        request.onsuccess = () => {
          if (request.result) {
            values.set(hash, {
              hit: true,
              value: request.result.value,
              bytes: request.result.bytes,
            });
          }
        };
      }
      tx.oncomplete = () => resolve(values);
      tx.onerror = () => resolve(values);
      tx.onabort = () => resolve(values);
    } catch {
      resolve(values);
    }
  });
}

export async function loadV2CachedObjects(generation, refs) {
  try {
    const db = await openDb();
    if (!db) return new Map();
    return await readV2CachedObjectBatch(db, generation, refs);
  } catch { return new Map(); }
}

export async function saveV2CachedObject(generation, hash, bytes, value) {
  return saveV2CachedObjects(generation, [{ hash, bytes, value }]);
}

export async function saveV2CachedObjects(generation, values) {
  const cacheable = [...new Map((values || [])
    .filter(item => generation && item?.hash && Number.isSafeInteger(item.bytes)
      && item.bytes <= MAX_PERSISTED_OBJECT_BYTES)
    .map(item => [item.hash, item])).values()];
  if (cacheable.length === 0) return;
  try {
    const db = await openDb();
    if (!db) return;
    await new Promise((resolve) => {
      const tx = db.transaction(OBJECT_STORE, 'readwrite');
      const store = tx.objectStore(OBJECT_STORE);
      const touchedAt = Date.now();
      for (const item of cacheable) {
        store.put({ value: item.value, bytes: item.bytes, touchedAt }, key(generation, item.hash));
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch { /* quota/private mode: memory cache remains authoritative */ }
}

export async function loadV2CachedSnapshot(scope = 'active') {
  try {
    const db = await openDb();
    if (!db) return null;
    return await new Promise((resolve) => {
      const request = db.transaction(SNAPSHOT_STORE, 'readonly').objectStore(SNAPSHOT_STORE).get(scope);
      request.onsuccess = () => {
        const record = request.result;
        if (!record?.snapshot?.end?.cursor || !record.savedAt
            || Date.now() - record.savedAt > MAX_SNAPSHOT_AGE_MS) {
          resolve(null);
          return;
        }
        resolve(record.snapshot);
      };
      request.onerror = () => resolve(null);
    });
  } catch { return null; }
}

export async function saveV2CachedSnapshot(scope = 'active', snapshot) {
  if (!snapshot?.start || !snapshot?.checkpoint || !snapshot?.end?.cursor) return;
  const { objectHandle: _expiredHandle, ...cacheableStart } = snapshot.start;
  const cacheable = {
    start: cacheableStart,
    checkpoint: snapshot.checkpoint,
    summaries: snapshot.summaries || [],
    end: snapshot.end,
  };
  try {
    const db = await openDb();
    if (!db) return;
    await new Promise((resolve) => {
      const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
      tx.objectStore(SNAPSHOT_STORE).put({ snapshot: cacheable, savedAt: Date.now() }, scope);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch { /* best effort: the network snapshot remains authoritative */ }
}

export function reconcileV2CachedSnapshot(cached, response) {
  if (!response?.start?.notModified) return response;
  const cachedCursor = cached?.end?.cursor;
  const responseCursor = response?.end?.cursor;
  const sameArchive = cachedCursor?.archive && responseCursor?.archive
    && cachedCursor.archive.projectId === responseCursor.archive.projectId
    && cachedCursor.archive.sessionId === responseCursor.archive.sessionId
    && cachedCursor.archive.generation === responseCursor.archive.generation;
  if (!cached?.checkpoint || !sameArchive
      || cachedCursor.throughSeq !== responseCursor.throughSeq
      || cachedCursor.timelineBytes !== responseCursor.timelineBytes
      || cachedCursor.fileId !== responseCursor.fileId
      || cachedCursor.tailHash !== responseCursor.tailHash) {
    const error = new Error('V2 cached snapshot failed server validation');
    error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
    throw error;
  }
  return {
    start: { ...cached.start, ...response.start, notModified: false },
    checkpoint: cached.checkpoint,
    summaries: cached.summaries || [],
    end: response.end,
  };
}
