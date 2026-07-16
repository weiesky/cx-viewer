import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { Worker } from 'node:worker_threads';

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const DEFAULT_SCROLLBACK = 1000;
const DEFAULT_SNAPSHOT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_QUEUED_BYTES = 16 * 1024 * 1024;
const DEFAULT_MAX_QUEUED_COMMANDS = 65_536;
const DEFAULT_MAX_PENDING_SNAPSHOTS = 256;

function positiveInteger(value, fallback, name) {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved <= 0) {
    throw new TypeError(`${name} must be a positive integer`);
  }
  return resolved;
}

function nonNegativeInteger(value, fallback, name) {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 0) {
    throw new TypeError(`${name} must be a non-negative integer`);
  }
  return resolved;
}

function serializeWorkerError(value, fallback = 'terminal state worker failed') {
  const error = new Error(value?.message || fallback);
  if (value?.code) error.code = value.code;
  if (value?.stack) error.stack = value.stack;
  return error;
}

/**
 * Main-thread facade for the headless terminal state worker.
 *
 * enqueue() and resize() never wait for the worker. Each state-changing command
 * receives a monotonically increasing sequence number. requestSnapshot() posts
 * the current generation/sequence barrier to the same MessagePort, so FIFO
 * delivery plus the worker's serial parser queue makes the returned snapshot a
 * precise prefix of the PTY stream.
 */
export class TerminalStateModel {
  constructor(options = {}) {
    const cols = positiveInteger(options.cols, DEFAULT_COLS, 'cols');
    const rows = positiveInteger(options.rows, DEFAULT_ROWS, 'rows');
    const scrollback = nonNegativeInteger(
      options.scrollback,
      DEFAULT_SCROLLBACK,
      'scrollback',
    );
    const snapshotScrollback = nonNegativeInteger(
      options.snapshotScrollback,
      scrollback,
      'snapshotScrollback',
    );
    if (snapshotScrollback > scrollback) {
      throw new RangeError('snapshotScrollback cannot exceed scrollback');
    }

    this.generation = options.generation ?? randomUUID();
    if (typeof this.generation !== 'string' || !this.generation) {
      throw new TypeError('generation must be a non-empty string');
    }

    this.cols = cols;
    this.rows = rows;
    this.scrollback = scrollback;
    this.snapshotScrollback = snapshotScrollback;
    this._snapshotTimeoutMs = positiveInteger(
      options.snapshotTimeoutMs,
      DEFAULT_SNAPSHOT_TIMEOUT_MS,
      'snapshotTimeoutMs',
    );
    this.maxQueuedBytes = positiveInteger(
      options.maxQueuedBytes,
      DEFAULT_MAX_QUEUED_BYTES,
      'maxQueuedBytes',
    );
    this.maxQueuedCommands = positiveInteger(
      options.maxQueuedCommands,
      DEFAULT_MAX_QUEUED_COMMANDS,
      'maxQueuedCommands',
    );
    this.maxPendingSnapshots = positiveInteger(
      options.maxPendingSnapshots,
      DEFAULT_MAX_PENDING_SNAPSHOTS,
      'maxPendingSnapshots',
    );
    this._seq = 0;
    this._requestId = 0;
    this._closed = false;
    this._fatalError = null;
    this._queuedBytes = 0;
    this._queuedCommands = 0;
    this._lastAcknowledgedSeq = 0;
    this._pendingWrites = new Map();
    this._pendingResizes = new Set();
    this._pendingSnapshots = new Map();

    this._worker = new Worker(new URL('./terminal-state-worker.js', import.meta.url), {
      workerData: {
        generation: this.generation,
        cols,
        rows,
        scrollback,
        snapshotScrollback,
      },
    });

    this.ready = new Promise((resolve, reject) => {
      this._resolveReady = resolve;
      this._rejectReady = reject;
    });

    this._worker.on('message', (message) => this._handleMessage(message));
    this._worker.once('error', (error) => this._fail(error, true));
    this._worker.once('exit', (code) => {
      if (!this._closed && !this._fatalError) {
        const error = new Error(`terminal state worker exited unexpectedly with code ${code}`);
        error.code = 'TERMINAL_STATE_WORKER_EXIT';
        this._fail(error, false);
      }
    });
  }

  get seq() {
    return this._seq;
  }

  /** UTF-8 bytes posted to the Worker but not yet acknowledged as parsed. */
  get queuedBytes() {
    return this._queuedBytes;
  }

  /** State-changing commands posted but not yet acknowledged as applied. */
  get queuedCommands() {
    return this._queuedCommands;
  }

  /** False means this instance must never be used as an authoritative source. */
  get healthy() {
    return !this._closed && !this._fatalError;
  }

  /**
   * Queue one PTY output chunk. Strings are structured-cloned by Node. Binary
   * chunks are copied once into an exact-size Uint8Array and transferred, so a
   * pooled Buffer cannot accidentally retain or clone its whole backing slab.
   */
  enqueue(data) {
    this._assertOpen();

    let byteLength;
    let payload;
    if (typeof data === 'string') {
      byteLength = Buffer.byteLength(data, 'utf8');
      payload = data;
    } else if (ArrayBuffer.isView(data)) {
      byteLength = data.byteLength;
      payload = Uint8Array.from(
        new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
      );
    } else {
      throw new TypeError('terminal data must be a string or an ArrayBuffer view');
    }

    if (this._queuedBytes + byteLength > this.maxQueuedBytes) {
      const error = new Error(
        `terminal state worker backlog would exceed ${this.maxQueuedBytes} bytes`,
      );
      error.code = 'TERMINAL_STATE_BACKLOG_OVERFLOW';
      this._fail(error, true);
      throw error;
    }
    this._reserveCommand();

    const seq = ++this._seq;
    this._queuedBytes += byteLength;
    this._queuedCommands++;
    this._pendingWrites.set(seq, byteLength);
    try {
      const message = {
        type: 'write',
        generation: this.generation,
        seq,
        byteLength,
        data: payload,
      };
      if (typeof payload === 'string') {
        this._worker.postMessage(message);
      } else {
        this._worker.postMessage(message, [payload.buffer]);
      }
    } catch (error) {
      this._pendingWrites.delete(seq);
      this._queuedBytes -= byteLength;
      this._queuedCommands--;
      this._fail(error, true);
      throw this._fatalError;
    }
    return seq;
  }

  resize(cols, rows) {
    this._assertOpen();
    const nextCols = positiveInteger(cols, undefined, 'cols');
    const nextRows = positiveInteger(rows, undefined, 'rows');
    this._reserveCommand();
    const seq = ++this._seq;
    this._queuedCommands++;
    this._pendingResizes.add(seq);
    this.cols = nextCols;
    this.rows = nextRows;
    try {
      this._worker.postMessage({
        type: 'resize',
        generation: this.generation,
        seq,
        cols: nextCols,
        rows: nextRows,
      });
    } catch (error) {
      this._pendingResizes.delete(seq);
      this._queuedCommands--;
      this._fail(error, true);
      throw this._fatalError;
    }
    return seq;
  }

  requestSnapshot(options = {}) {
    this._assertOpen();
    if (this._pendingSnapshots.size >= this.maxPendingSnapshots) {
      const error = new Error(
        `terminal state model has ${this.maxPendingSnapshots} pending snapshots`,
      );
      error.code = 'TERMINAL_SNAPSHOT_QUEUE_OVERFLOW';
      throw error;
    }
    const timeoutMs = positiveInteger(
      options.timeoutMs,
      this._snapshotTimeoutMs,
      'timeoutMs',
    );
    const requestId = ++this._requestId;
    const seq = this._seq;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = new Error(
          `terminal snapshot ${this.generation}:${seq} timed out after ${timeoutMs}ms`,
        );
        error.code = 'TERMINAL_SNAPSHOT_TIMEOUT';
        // A timed-out parser/serializer has an unknown barrier. Continuing to
        // feed it or stacking more snapshots could only create stale state.
        this._fail(error, true);
      }, timeoutMs);

      this._pendingSnapshots.set(requestId, { resolve, reject, timer });
      try {
        this._worker.postMessage({
          type: 'snapshot',
          generation: this.generation,
          requestId,
          seq,
        });
      } catch (error) {
        this._fail(error, true);
      }
    });
  }

  async dispose() {
    if (this._closed) return;
    this._closed = true;
    const error = new Error('terminal state model disposed');
    error.code = 'TERMINAL_STATE_DISPOSED';
    this._rejectReady?.(error);
    this._resolveReady = null;
    this._rejectReady = null;
    this._rejectAll(error);
    await this._worker.terminate();
  }

  _assertOpen() {
    if (this._fatalError) throw this._fatalError;
    if (this._closed) {
      const error = new Error('terminal state model is closed');
      error.code = 'TERMINAL_STATE_CLOSED';
      throw error;
    }
  }

  _handleMessage(message) {
    if (!message || message.generation !== this.generation) return;
    if (this._closed || this._fatalError) return;

    if (message.type === 'ready') {
      this._resolveReady?.(message);
      this._resolveReady = null;
      this._rejectReady = null;
      return;
    }

    if (message.type === 'applied') {
      this._handleApplied(message);
      return;
    }

    if (message.type === 'applied-command') {
      this._handleAppliedCommand(message);
      return;
    }

    if (message.type === 'snapshot') {
      const pending = this._pendingSnapshots.get(message.requestId);
      if (!pending) return;
      this._pendingSnapshots.delete(message.requestId);
      clearTimeout(pending.timer);
      pending.resolve(message.snapshot);
      return;
    }

    if (message.type === 'request-error') {
      const pending = this._pendingSnapshots.get(message.requestId);
      if (!pending) return;
      this._pendingSnapshots.delete(message.requestId);
      clearTimeout(pending.timer);
      pending.reject(serializeWorkerError(message.error));
      return;
    }

    if (message.type === 'fatal') {
      this._fail(serializeWorkerError(message.error), true);
    }
  }

  _handleApplied(message) {
    const { firstSeq, seq, bytes } = message;
    const validEnvelope = Number.isSafeInteger(firstSeq)
      && Number.isSafeInteger(seq)
      && Number.isSafeInteger(bytes)
      && firstSeq === this._lastAcknowledgedSeq + 1
      && firstSeq > 0
      && seq >= firstSeq
      && seq <= this._seq
      && bytes >= 0;
    let expectedBytes = 0;
    if (validEnvelope) {
      for (let current = firstSeq; current <= seq; current++) {
        const size = this._pendingWrites.get(current);
        if (size === undefined) {
          expectedBytes = -1;
          break;
        }
        expectedBytes += size;
      }
    }

    if (!validEnvelope || expectedBytes !== bytes || bytes > this._queuedBytes) {
      const error = new Error('terminal state worker sent an invalid write acknowledgement');
      error.code = 'TERMINAL_STATE_ACK_INVALID';
      this._fail(error, true);
      return;
    }

    for (let current = firstSeq; current <= seq; current++) {
      this._pendingWrites.delete(current);
    }
    this._queuedBytes -= bytes;
    this._queuedCommands -= seq - firstSeq + 1;
    this._lastAcknowledgedSeq = seq;
  }

  _handleAppliedCommand(message) {
    const valid = message.command === 'resize'
      && Number.isSafeInteger(message.seq)
      && message.seq === this._lastAcknowledgedSeq + 1
      && this._pendingResizes.has(message.seq)
      && this._queuedCommands > 0;
    if (!valid) {
      const error = new Error('terminal state worker sent an invalid command acknowledgement');
      error.code = 'TERMINAL_STATE_ACK_INVALID';
      this._fail(error, true);
      return;
    }
    this._pendingResizes.delete(message.seq);
    this._queuedCommands--;
    this._lastAcknowledgedSeq = message.seq;
  }

  _reserveCommand() {
    if (this._queuedCommands >= this.maxQueuedCommands) {
      const error = new Error(
        `terminal state worker backlog would exceed ${this.maxQueuedCommands} commands`,
      );
      error.code = 'TERMINAL_STATE_COMMAND_OVERFLOW';
      this._fail(error, true);
      throw error;
    }
  }

  _fail(error, terminateWorker = false) {
    if (this._fatalError || this._closed) return;
    this._fatalError = error instanceof Error ? error : new Error(String(error));
    this._rejectReady?.(this._fatalError);
    this._resolveReady = null;
    this._rejectReady = null;
    this._rejectAll(this._fatalError);
    if (terminateWorker) {
      try {
        const termination = this._worker.terminate();
        if (termination?.catch) void termination.catch(() => {});
      } catch { }
    }
  }

  _rejectAll(error) {
    for (const pending of this._pendingSnapshots.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this._pendingSnapshots.clear();
    this._pendingWrites.clear();
    this._pendingResizes.clear();
    this._queuedBytes = 0;
    this._queuedCommands = 0;
  }
}
