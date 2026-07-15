import { materializeWireDescriptor } from '../../lib/log-v2/reducer.js';
import { assembleEntryParts } from '../../lib/log-v2/entry-codec.js';
import { LOG_V2_WIRE_LIMITS } from '../../lib/log-v2/wire-schema.js';
import { apiUrl } from './apiUrl.js';
import { readNdjsonResponse } from './logV2Transport.js';
import { loadV2CachedObject, saveV2CachedObject } from './logV2Cache.js';

const DEFAULT_DECODED_BUDGET = 64 * 1024 * 1024;

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
  constructor({ handle, archive, fetchImpl = fetch, maxDecodedBytes = DEFAULT_DECODED_BUDGET }) {
    this.handle = handle;
    this.archive = archive;
    this.fetchImpl = fetchImpl;
    this.values = new Map();
    this.inflight = new Map();
    this.sizes = new Map();
    this.decodedBytes = 0;
    this.maxDecodedBytes = maxDecodedBytes;
  }

  async hydrateRefs(refs, { signal } = {}) {
    let missing = [...new Map((refs || []).filter(ref => !this.values.has(ref.hash)).map(ref => [ref.hash, ref])).values()];
    for (const ref of missing) {
      const cached = await loadV2CachedObject(this.archive.generation, ref.hash);
      if (cached?.hit && cached.bytes === ref.bytes) this._remember(ref.hash, ref.bytes, cached.value);
    }
    missing = missing.filter(ref => !this.values.has(ref.hash));
    for (const batch of batchRefs(missing)) {
      const key = batch.map(ref => ref.hash).sort().join(',');
      let promise = this.inflight.get(key);
      if (!promise) {
        promise = this._fetchBatch(batch, signal).finally(() => this.inflight.delete(key));
        this.inflight.set(key, promise);
      }
      await promise;
    }
  }

  async _fetchBatch(refs, signal) {
    const response = await this.fetchImpl(apiUrl('/api/log-v2/objects'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: this.handle, archive: this.archive, hashes: refs.map(ref => ref.hash) }),
      signal,
    });
    const expected = new Map(refs.map(ref => [ref.hash, ref]));
    await readNdjsonResponse(response, (frame) => {
      if (frame.kind !== 'cx-viewer.log-v2-wire.object' || typeof frame.hash !== 'string') return;
      const ref = expected.get(frame.hash);
      if (!ref || frame.bytes !== ref.bytes) throw new Error(`Invalid V2 object frame for ${frame.hash}`);
      const bytes = Number.isSafeInteger(frame.bytes)
        ? frame.bytes
        : new TextEncoder().encode(JSON.stringify(frame.value)).length;
      this._remember(frame.hash, bytes, frame.value);
      saveV2CachedObject(this.archive.generation, frame.hash, bytes, frame.value);
    }, { collect: false });
    for (const ref of refs) {
      if (!this.values.has(ref.hash)) throw new Error(`V2 object response omitted ${ref.hash}`);
    }
  }

  async materialize(descriptor, options = {}) {
    const inputRefs = options.inputRefs || [];
    await this.hydrateRefs(descriptorRefs(descriptor, inputRefs), options);
    const entry = materializeWireDescriptor(descriptor, ref => {
      if (!this.values.has(ref.hash)) throw new Error(`V2 object ${ref.hash} is not hydrated`);
      return this.values.get(ref.hash);
    }, { inputRefs });
    this._evict();
    return entry;
  }

  async materializeParts(descriptor, partNames, { includeInput = false, inputRefs = [], signal } = {}) {
    const names = new Set(partNames || []);
    const selectedParts = new Map([...descriptor.parts].filter(([part]) => names.has(part)));
    const refs = [...selectedParts.values()];
    if (includeInput && descriptor.input) refs.push(...inputRefs);
    await this.hydrateRefs(refs, { signal });
    const values = new Map([...selectedParts].map(([part, ref]) => [part, this.values.get(ref.hash)]));
    const input = includeInput && descriptor.input
      ? { path: descriptor.input.path, items: inputRefs.map(ref => this.values.get(ref.hash)) }
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
      this.values.delete(hash);
      this.values.set(hash, value);
      return;
    }
    this.values.set(hash, value);
    this.sizes.set(hash, bytes);
    this.decodedBytes += bytes;
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
