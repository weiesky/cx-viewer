import { Worker } from 'node:worker_threads';

const DEFAULT_MAX_PENDING = 4096;

function deserializeError(value) {
  const error = new Error(value?.message || 'Log V2 writer worker failed');
  if (value?.code) error.code = value.code;
  if (value?.stack) error.stack = value.stack;
  return error;
}

export class LogV2WriteQueue {
  constructor(options, { maxPending = DEFAULT_MAX_PENDING } = {}) {
    this.maxPending = maxPending;
    this.nextId = 1;
    this.pending = new Map();
    this.pendingWriteCount = 0;
    this.accepting = true;
    this.closed = false;
    this.terminating = false;
    this.closePromise = null;
    this.readyState = false;
    this.lastError = null;
    this.lastAdmissionError = null;
    this.fatalError = null;
    this.overflowedWrites = 0;
    this.lastSnapshot = {
      attempted: 0, written: 0, failed: 0, skipped: 0, sources: {},
      activeWriters: 0, consecutiveFailures: 0, circuitOpen: false,
      lastError: null, lastFailure: null, lastLocator: null,
    };
    this.worker = new Worker(new URL('./write-worker.js', import.meta.url), {
      workerData: { options },
      execArgv: [],
    });
    this.worker.unref();
    this.worker.on('message', message => this.onMessage(message));
    this.worker.on('error', error => this.failAll(error));
    this.worker.on('exit', code => {
      if (this.terminating) return;
      const error = new Error(`Log V2 writer worker exited unexpectedly with code ${code}`);
      error.code = 'CXV_LOG_V2_WRITE_WORKER_EXITED';
      this.failAll(error);
    });
  }

  onMessage(message) {
    if (message?.snapshot) this.lastSnapshot = message.snapshot;
    if (message?.type === 'ready') {
      if (this.fatalError || this.closed) return;
      this.readyState = true;
      return;
    }
    if (message?.type === 'degraded') {
      console.warn(`[CX Viewer] ${message.message}`);
      return;
    }
    if (message?.type !== 'write-result' && message?.type !== 'flush-result') return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (pending.type === 'write') this.pendingWriteCount--;
    if (this.pending.size === 0) this.worker.unref();
    if (message.error) {
      const error = deserializeError(message.error);
      this.lastError = error;
      pending.reject(error);
    } else {
      this.lastError = null;
      pending.resolve(message.result ?? message.snapshot);
    }
  }

  failAll(error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    this.lastError = failure;
    this.fatalError ||= failure;
    this.readyState = false;
    for (const pending of this.pending.values()) pending.reject(failure);
    this.pending.clear();
    this.pendingWriteCount = 0;
    this.worker.unref();
  }

  assertUsable() {
    if (this.fatalError) throw this.fatalError;
    if (this.closed) {
      const error = new Error('Log V2 writer queue is closed');
      error.code = 'CXV_LOG_V2_WRITE_QUEUE_CLOSED';
      throw error;
    }
  }

  post(type, payload = {}, { admission = false } = {}) {
    this.assertUsable();
    if (admission && !this.accepting) {
      const error = new Error('Log V2 writer queue is closing');
      error.code = 'CXV_LOG_V2_WRITE_QUEUE_CLOSING';
      this.lastError = error;
      this.lastAdmissionError = error;
      throw error;
    }
    // Control barriers must remain admissible when every write slot is full;
    // otherwise flush/close could never drain an overloaded queue.
    if (admission && this.pendingWriteCount >= this.maxPending) {
      const error = new Error('Log V2 writer queue overflow');
      error.code = 'CXV_LOG_V2_WRITE_QUEUE_OVERFLOW';
      this.lastError = error;
      this.lastAdmissionError = error;
      this.overflowedWrites++;
      throw error;
    }
    const id = this.nextId++;
    this.worker.ref();
    return new Promise((resolve, reject) => {
      this.pending.set(id, { type, resolve, reject });
      if (type === 'write') this.pendingWriteCount++;
      try {
        this.worker.postMessage({ type, id, ...payload });
      } catch (error) {
        this.pending.delete(id);
        if (type === 'write') this.pendingWriteCount--;
        this.lastError = error;
        if (this.pending.size === 0) this.worker.unref();
        reject(error);
      }
    });
  }

  enqueue(entry, context = {}) {
    const promise = this.post('write', { entry, context }, { admission: true });
    // Most ingestion paths are observational and intentionally do not await
    // disk latency. Keep failures observed so rejected writes never become
    // unhandled promise rejections; status exposes the last failure.
    promise.catch(() => {});
    return promise;
  }

  flush() {
    return this.post('flush');
  }

  snapshot() {
    return Object.freeze({
      ...this.lastSnapshot,
      sources: Object.freeze({ ...(this.lastSnapshot.sources || {}) }),
      worker: true,
      ready: this.readyState,
      accepting: this.accepting,
      closed: this.closed,
      fatal: Boolean(this.fatalError),
      pendingWrites: this.pendingWriteCount,
      queueLimit: this.maxPending,
      overflowedWrites: this.overflowedWrites,
      lastQueueError: this.lastError?.message || null,
      lastQueueErrorCode: this.lastError?.code || null,
      lastAdmissionError: this.lastAdmissionError?.message || null,
      lastAdmissionErrorCode: this.lastAdmissionError?.code || null,
    });
  }

  close() {
    if (this.closePromise) return this.closePromise;
    if (this.closed) return Promise.resolve(this.snapshot());

    // Seal admission synchronously. Every write accepted before this point is
    // already ahead of the flush message in the MessagePort FIFO.
    this.accepting = false;
    this.closePromise = (async () => {
      let result;
      try {
        result = await this.flush();
        return result;
      } finally {
        this.terminating = true;
        this.closed = true;
        this.readyState = false;
        await this.worker.terminate();
      }
    })();
    return this.closePromise;
  }
}
