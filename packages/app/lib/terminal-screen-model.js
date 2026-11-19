import { Buffer } from 'node:buffer';
import { Worker } from 'node:worker_threads';

const MAX_QUEUED_BYTES = 16 * 1024 * 1024;
const SNAPSHOT_TIMEOUT_MS = 5000;

export class TerminalScreenModel {
  constructor({ cols, rows }) {
    this.closed = false;
    this.failed = null;
    this.queuedBytes = 0;
    this.requestId = 0;
    this.pendingSnapshots = new Map();
    this.worker = new Worker(new URL('./terminal-screen-worker.js', import.meta.url), {
      workerData: { cols, rows },
    });
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    // Worker startup is best-effort; PTY live delivery must remain usable even
    // if the off-thread screen renderer cannot initialize.
    void this.ready.catch(() => {});
    this.worker.on('message', message => this.handleMessage(message));
    this.worker.once('error', error => this.fail(error));
    this.worker.once('exit', code => {
      if (!this.closed && !this.failed) {
        this.fail(new Error(`terminal screen worker exited with code ${code}`));
      }
    });
  }

  enqueue(data, { seq } = {}) {
    if (this.closed || this.failed) return false;
    const text = String(data ?? '');
    const bytes = Buffer.byteLength(text, 'utf8');
    if (this.queuedBytes + bytes > MAX_QUEUED_BYTES) {
      this.fail(new Error('terminal screen worker backlog exceeded 16 MiB'));
      return false;
    }
    this.queuedBytes += bytes;
    try {
      this.worker.postMessage({ type: 'write', data: text, bytes, seq });
      return true;
    } catch (error) {
      this.queuedBytes -= bytes;
      this.fail(error);
      return false;
    }
  }

  resize(cols, rows, resizeGeneration) {
    if (this.closed || this.failed) return false;
    try {
      this.worker.postMessage({ type: 'resize', cols, rows, resizeGeneration });
      return true;
    } catch (error) {
      this.fail(error);
      return false;
    }
  }

  async snapshot() {
    if (this.closed || this.failed) throw this.failed || new Error('terminal screen model closed');
    await this.ready;
    const requestId = ++this.requestId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingSnapshots.delete(requestId);
        reject(new Error('terminal screen snapshot timed out'));
      }, SNAPSHOT_TIMEOUT_MS);
      timer.unref?.();
      this.pendingSnapshots.set(requestId, { resolve, reject, timer });
      try {
        this.worker.postMessage({ type: 'snapshot', requestId });
      } catch (error) {
        clearTimeout(timer);
        this.pendingSnapshots.delete(requestId);
        reject(error);
      }
    });
  }

  handleMessage(message) {
    if (message?.type === 'ready') {
      this.resolveReady?.();
      this.resolveReady = null;
      this.rejectReady = null;
    } else if (message?.type === 'ack') {
      this.queuedBytes = Math.max(0, this.queuedBytes - (message.bytes || 0));
    } else if (message?.type === 'snapshot') {
      const pending = this.pendingSnapshots.get(message.requestId);
      if (!pending) return;
      this.pendingSnapshots.delete(message.requestId);
      clearTimeout(pending.timer);
      pending.resolve(message.snapshot);
    } else if (message?.type === 'fatal') {
      this.fail(new Error(message.error || 'terminal screen worker failed'));
    }
  }

  fail(error) {
    if (this.failed || this.closed) return;
    this.failed = error instanceof Error ? error : new Error(String(error));
    this.rejectReady?.(this.failed);
    this.resolveReady = null;
    this.rejectReady = null;
    for (const pending of this.pendingSnapshots.values()) {
      clearTimeout(pending.timer);
      pending.reject(this.failed);
    }
    this.pendingSnapshots.clear();
    try { void this.worker.terminate(); } catch { }
  }

  dispose() {
    if (this.closed) return;
    this.closed = true;
    this.rejectReady?.(new Error('terminal screen model disposed'));
    this.resolveReady = null;
    this.rejectReady = null;
    for (const pending of this.pendingSnapshots.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('terminal screen model disposed'));
    }
    this.pendingSnapshots.clear();
    try { this.worker.postMessage({ type: 'dispose' }); } catch { }
    try { void this.worker.terminate(); } catch { }
  }
}
