import { materializeWireDescriptor } from '../../lib/log-v2/reducer.js';
import { assembleEntryParts } from '../../lib/log-v2/entry-codec.js';
import { LOG_V2_WIRE_LIMITS } from '../../lib/log-v2/wire-schema.js';
import { apiUrl } from './apiUrl.js';
import { readNdjsonResponse } from './logV2Transport.js';
import { loadV2CachedObjects, saveV2CachedObjects } from './logV2Cache.js';

const DEFAULT_DECODED_BUDGET = 64 * 1024 * 1024;
const DEFAULT_FETCH_CONCURRENCY = 3;
const MAX_429_RETRIES = 2;
const MAX_RETRY_DELAY_MS = 2000;

function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  if (typeof signal.throwIfAborted === 'function') signal.throwIfAborted();
  const error = new Error('V2 object hydration aborted');
  error.name = 'AbortError';
  throw error;
}

function retryAfterMs(response, attempt) {
  const value = response.headers?.get?.('retry-after');
  if (value != null && value.trim() !== '') {
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(MAX_RETRY_DELAY_MS, Math.round(seconds * 1000));
    }
    const at = Date.parse(value);
    if (Number.isFinite(at)) return Math.min(MAX_RETRY_DELAY_MS, Math.max(0, at - Date.now()));
  }
  return Math.min(MAX_RETRY_DELAY_MS, 100 * (2 ** attempt));
}

function waitForRetry(ms, signal) {
  throwIfAborted(signal);
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(finish, ms);
    function finish() {
      signal?.removeEventListener('abort', abort);
      resolve();
    }
    function abort() {
      clearTimeout(timeout);
      try { throwIfAborted(signal); }
      catch (error) { reject(error); }
    }
    signal?.addEventListener('abort', abort, { once: true });
  });
}

function descriptorRefs(descriptor, inputRefs = []) {
  const refs = [...descriptor.parts.values()];
  if (descriptor.input) refs.push(...inputRefs);
  return refs;
}

function batchRefs(refs) {
  const batches = [];
  let batch = [];
  let bytes = 0;
  for (const ref of refs) {
    const nextBytes = Number.isSafeInteger(ref.bytes) ? ref.bytes : 0;
    if (batch.length > 0 && (batch.length >= LOG_V2_WIRE_LIMITS.maxObjectBatch
        || bytes + nextBytes > LOG_V2_WIRE_LIMITS.maxObjectBatchBytes)) {
      batches.push(batch);
      batch = [];
      bytes = 0;
    }
    batch.push(ref);
    bytes += nextBytes;
    // A single oversized object is intentionally streamed alone by the server.
    if (nextBytes > LOG_V2_WIRE_LIMITS.maxObjectBatchBytes) {
      batches.push(batch);
      batch = [];
      bytes = 0;
    }
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
}

export class LogV2ObjectStore {
  constructor({
    handle,
    archive,
    fetchImpl = fetch,
    maxDecodedBytes = DEFAULT_DECODED_BUDGET,
    fetchConcurrency = DEFAULT_FETCH_CONCURRENCY,
    loadCachedObjects = loadV2CachedObjects,
    saveCachedObjects = saveV2CachedObjects,
  }) {
    this.handle = handle;
    this.archive = archive;
    this.fetchImpl = fetchImpl;
    this.values = new Map();
    this.inflightByHash = new Map();
    this.sizes = new Map();
    this.decodedBytes = 0;
    this.maxDecodedBytes = maxDecodedBytes;
    this.fetchConcurrency = Math.max(1, Math.floor(fetchConcurrency) || DEFAULT_FETCH_CONCURRENCY);
    this.loadCachedObjects = loadCachedObjects;
    this.saveCachedObjects = saveCachedObjects;
    this.fetchQueue = [];
    this.activeFetches = 0;
  }

  async hydrateRefs(refs, { signal } = {}) {
    throwIfAborted(signal);
    const requestedByHash = new Map();
    for (const ref of refs || []) {
      const declared = requestedByHash.get(ref.hash);
      if (declared && declared.bytes !== ref.bytes) {
        throw new Error(`Conflicting V2 object byte count for ${ref.hash}`);
      }
      requestedByHash.set(ref.hash, ref);
    }
    const requested = [...requestedByHash.values()];
    for (const ref of requested) this._assertRefSize(ref);
    let missing = requested.filter(ref => !this.values.has(ref.hash));
    const cachedValues = await this.loadCachedObjects(this.archive.generation, missing);
    throwIfAborted(signal);
    for (const ref of missing) {
      const cached = cachedValues.get(ref.hash);
      if (cached?.hit && cached.bytes === ref.bytes) this._remember(ref.hash, ref.bytes, cached.value);
    }
    missing = missing.filter(ref => !this.values.has(ref.hash));
    if (missing.length === 0) return this._snapshotValues(requested);

    const shared = new Set();
    const unclaimed = [];
    for (const ref of missing) {
      const current = this.inflightByHash.get(ref.hash);
      if (current && !current.settled && !current.controller.signal.aborted) {
        if (current.refBytes.get(ref.hash) !== ref.bytes) {
          throw new Error(`Conflicting V2 object byte count for ${ref.hash}`);
        }
        shared.add(current);
      } else unclaimed.push(ref);
    }

    const consumer = this._createConsumer(signal);
    try {
      for (const batch of shared) this._attachConsumer(batch, consumer);
      for (const refsBatch of batchRefs(unclaimed)) {
        const batch = this._createSharedBatch(refsBatch);
        shared.add(batch);
        this._attachConsumer(batch, consumer);
      }
      await Promise.race([
        Promise.all([...shared].map(batch => batch.promise)),
        consumer.stopped,
      ]);
      throwIfAborted(signal);
      return this._snapshotValues(requested);
    } finally {
      this._detachConsumer(consumer);
    }
  }

  _createConsumer(signal) {
    let rejectStopped;
    const consumer = {
      batches: new Set(),
      done: false,
      signal,
      onAbort: null,
      stopped: new Promise((_, reject) => { rejectStopped = reject; }),
      stop: (error) => {
        if (consumer.done) return;
        consumer.done = true;
        rejectStopped(error);
        this._detachConsumer(consumer);
      },
    };
    // The rejection is consumed by the Promise.race installed synchronously by
    // hydrateRefs. Avoid a process-level unhandled rejection in the tiny window
    // between construction and that race.
    consumer.stopped.catch(() => {});
    if (signal) {
      consumer.onAbort = () => {
        try { throwIfAborted(signal); }
        catch (error) { consumer.stop(error); }
      };
      signal.addEventListener('abort', consumer.onAbort, { once: true });
    }
    return consumer;
  }

  _createSharedBatch(refs) {
    const batch = {
      refs,
      refBytes: new Map(refs.map(ref => [ref.hash, ref.bytes])),
      consumers: new Set(),
      controller: new AbortController(),
      settled: false,
      promise: null,
    };
    for (const ref of refs) this.inflightByHash.set(ref.hash, batch);
    batch.promise = this._scheduleFetch(batch).catch((error) => {
      for (const consumer of [...batch.consumers]) consumer.stop(error);
      throw error;
    }).finally(() => {
      batch.settled = true;
      for (const ref of refs) {
        if (this.inflightByHash.get(ref.hash) === batch) this.inflightByHash.delete(ref.hash);
      }
    });
    // A batch can be cancelled before hydrateRefs reaches Promise.race.
    batch.promise.catch(() => {});
    return batch;
  }

  _attachConsumer(batch, consumer) {
    if (consumer.done) return;
    batch.consumers.add(consumer);
    consumer.batches.add(batch);
  }

  _detachConsumer(consumer) {
    if (consumer.onAbort) {
      consumer.signal.removeEventListener('abort', consumer.onAbort);
      consumer.onAbort = null;
    }
    for (const batch of consumer.batches) {
      batch.consumers.delete(consumer);
      if (!batch.settled && batch.consumers.size === 0) batch.controller.abort();
    }
    consumer.batches.clear();
    consumer.done = true;
  }

  _scheduleFetch(batch) {
    return new Promise((resolve, reject) => {
      const signal = batch.controller.signal;
      const task = { batch, signal, resolve, reject, onAbort: null };
      if (signal) {
        task.onAbort = () => {
          const index = this.fetchQueue.indexOf(task);
          if (index < 0) return;
          this.fetchQueue.splice(index, 1);
          try { throwIfAborted(signal); }
          catch (error) { reject(error); }
        };
        signal.addEventListener('abort', task.onAbort, { once: true });
      }
      this.fetchQueue.push(task);
      this._drainFetchQueue();
    });
  }

  _drainFetchQueue() {
    while (this.activeFetches < this.fetchConcurrency && this.fetchQueue.length > 0) {
      const task = this.fetchQueue.shift();
      if (task.onAbort) task.signal.removeEventListener('abort', task.onAbort);
      try { throwIfAborted(task.signal); }
      catch (error) { task.reject(error); continue; }
      this.activeFetches++;
      this._fetchBatch(task.batch.refs, task.signal).then(task.resolve, task.reject).finally(() => {
        this.activeFetches--;
        this._drainFetchQueue();
      });
    }
  }

  async _fetchBatch(refs, signal) {
    let response;
    for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
      throwIfAborted(signal);
      response = await this.fetchImpl(apiUrl('/api/log-v2/objects'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: this.handle, archive: this.archive, hashes: refs.map(ref => ref.hash) }),
        signal,
      });
      if (response.status !== 429 || attempt === MAX_429_RETRIES) break;
      const delay = retryAfterMs(response, attempt);
      try { await response.body?.cancel?.(); } catch {}
      await waitForRetry(delay, signal);
    }
    const expected = new Map(refs.map(ref => [ref.hash, ref]));
    const cacheable = [];
    await readNdjsonResponse(response, (frame) => {
      if (frame.kind !== 'cx-viewer.log-v2-wire.object' || typeof frame.hash !== 'string') return;
      const ref = expected.get(frame.hash);
      if (!ref || frame.bytes !== ref.bytes) throw new Error(`Invalid V2 object frame for ${frame.hash}`);
      const bytes = Number.isSafeInteger(frame.bytes)
        ? frame.bytes
        : new TextEncoder().encode(JSON.stringify(frame.value)).length;
      this._remember(frame.hash, bytes, frame.value);
      cacheable.push({ hash: frame.hash, bytes, value: frame.value });
    }, { collect: false });
    for (const ref of refs) {
      if (!this.values.has(ref.hash)) throw new Error(`V2 object response omitted ${ref.hash}`);
    }
    try {
      Promise.resolve(this.saveCachedObjects(this.archive.generation, cacheable)).catch(() => {});
    } catch {}
  }

  async materialize(descriptor, options = {}) {
    const inputRefs = options.inputRefs || [];
    const hydrated = await this.hydrateRefs(descriptorRefs(descriptor, inputRefs), options);
    const entry = materializeWireDescriptor(descriptor, ref => {
      if (!hydrated.has(ref.hash)) throw new Error(`V2 object ${ref.hash} is not hydrated`);
      return hydrated.get(ref.hash);
    }, { inputRefs });
    this._evict();
    return entry;
  }

  async materializeParts(descriptor, partNames, { includeInput = false, inputRefs = [], signal } = {}) {
    const names = new Set(partNames || []);
    const selectedParts = new Map([...descriptor.parts].filter(([part]) => names.has(part)));
    const refs = [...selectedParts.values()];
    if (includeInput && descriptor.input) refs.push(...inputRefs);
    const hydrated = await this.hydrateRefs(refs, { signal });
    const values = new Map([...selectedParts].map(([part, ref]) => [part, hydrated.get(ref.hash)]));
    const input = includeInput && descriptor.input
      ? { path: descriptor.input.path, items: inputRefs.map(ref => hydrated.get(ref.hash)) }
      : null;
    // The conversation pipeline immediately interns/slims immutable CAS
    // values. Sharing decoded items avoids deep-cloning cumulative input for
    // every revision while exact network detail keeps cloneValues=true.
    const entry = assembleEntryParts(values, input, { cloneValues: false });
    this._evict();
    return entry;
  }

  _remember(hash, bytes, value) {
    if (this.values.has(hash)) {
      if (this.sizes.get(hash) !== bytes) throw new Error(`Conflicting V2 object byte count for ${hash}`);
      this.values.delete(hash);
      this.values.set(hash, value);
      return;
    }
    this.values.set(hash, value);
    this.sizes.set(hash, bytes);
    this.decodedBytes += bytes;
  }

  _assertRefSize(ref) {
    if (this.values.has(ref.hash) && this.sizes.get(ref.hash) !== ref.bytes) {
      throw new Error(`Conflicting V2 object byte count for ${ref.hash}`);
    }
  }

  _snapshotValues(refs) {
    const snapshot = new Map();
    for (const ref of refs) {
      this._assertRefSize(ref);
      if (!this.values.has(ref.hash)) throw new Error(`V2 object response omitted ${ref.hash}`);
      snapshot.set(ref.hash, this.values.get(ref.hash));
    }
    return snapshot;
  }

  _evict() {
    while (this.decodedBytes > this.maxDecodedBytes && this.values.size > 1) {
      const hash = this.values.keys().next().value;
      this.values.delete(hash);
      this.decodedBytes -= this.sizes.get(hash) || 0;
      this.sizes.delete(hash);
    }
  }
}

export function collectDescriptorRefs(descriptor, inputRefs = []) {
  return descriptorRefs(descriptor, inputRefs);
}

export { batchRefs as batchLogV2ObjectRefs };
