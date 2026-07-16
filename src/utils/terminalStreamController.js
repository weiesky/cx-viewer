/**
 * Orders the main-terminal websocket byte stream around authoritative snapshots.
 *
 * The transport has two independent monotonic axes:
 *   - data:     { streamId, seq, data }, seq starts at 1 for each stream
 *   - geometry: { streamId, resizeGeneration, cols, rows }
 * A snapshot joins both axes:
 *   { streamId, throughSeq, resizeGeneration, cols, rows, data }
 *
 * This controller deliberately has no xterm or React dependency. Callbacks are
 * synchronous so a snapshot and its contiguous held suffix enter the renderer
 * queue atomically with respect to the next websocket message.
 */

export const DEFAULT_TERMINAL_HOLD_BYTES = 1024 * 1024;
export const DEFAULT_TERMINAL_HOLD_MESSAGES = 4096;

/**
 * Send one JSON terminal-protocol message without losing an adapter's explicit
 * failure result. Native WebSocket#send returns undefined on success, while the
 * shared React context adapter returns a boolean.
 */
export function sendTerminalSocketMessage(socket, message, openState = 1) {
  if (!socket || socket.readyState !== openState) return false;
  try {
    return socket.send(JSON.stringify(message)) !== false;
  } catch {
    return false;
  }
}

function isStreamId(value) {
  return Number.isSafeInteger(value) && value >= 1;
}

function isDataSeq(value) {
  return Number.isSafeInteger(value) && value >= 1;
}

function isThroughSeq(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isResizeGeneration(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isDimension(value) {
  return Number.isSafeInteger(value) && value > 0;
}

// TextEncoder allocates a second copy of every held PTY frame. Count UTF-8
// bytes directly instead; lone surrogates match TextEncoder's U+FFFD behavior.
export function terminalUtf8ByteLength(value) {
  let bytes = 0;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index++;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

export class TerminalStreamController {
  constructor({
    onData,
    onSnapshot,
    onGeometry,
    onResync,
    maxHeldBytes = DEFAULT_TERMINAL_HOLD_BYTES,
    maxHeldMessages = DEFAULT_TERMINAL_HOLD_MESSAGES,
  } = {}) {
    this._onData = typeof onData === 'function' ? onData : () => {};
    this._onSnapshot = typeof onSnapshot === 'function' ? onSnapshot : () => {};
    this._onGeometry = typeof onGeometry === 'function' ? onGeometry : () => {};
    this._onResync = typeof onResync === 'function' ? onResync : () => true;
    this._maxHeldBytes = Number.isSafeInteger(maxHeldBytes) && maxHeldBytes > 0
      ? maxHeldBytes
      : DEFAULT_TERMINAL_HOLD_BYTES;
    this._maxHeldMessages = Number.isSafeInteger(maxHeldMessages) && maxHeldMessages > 0
      ? maxHeldMessages
      : DEFAULT_TERMINAL_HOLD_MESSAGES;
    this.resetConnection();
  }

  resetConnection() {
    this.streamId = null;
    this.throughSeq = null;
    this.resizeGeneration = null;
    this.cols = null;
    this.rows = null;
    this.phase = 'awaiting-snapshot';
    this._held = new Map();
    this._heldBytes = 0;
    this._discardedThroughSeq = 0;
    this._resyncRequested = false;
  }

  getState() {
    return {
      streamId: this.streamId,
      throughSeq: this.throughSeq,
      resizeGeneration: this.resizeGeneration,
      cols: this.cols,
      rows: this.rows,
      phase: this.phase,
      heldMessages: this._held.size,
      heldBytes: this._heldBytes,
      discardedThroughSeq: this._discardedThroughSeq,
      resyncRequested: this._resyncRequested,
    };
  }

  /** Observe stream identity carried by state/exit without accepting PTY bytes. */
  observeStream(streamId) {
    if (!isStreamId(streamId)) return 'invalid';
    if (this.streamId == null || streamId > this.streamId) {
      this._beginStream(streamId);
      return 'new';
    }
    return streamId === this.streamId ? 'current' : 'stale';
  }

  requestSnapshot(reason = 'resync') {
    if (this.phase === 'live') this.phase = 'paused';
    return this._requestResync(reason);
  }

  /** Provider already sent a recovery request for a malformed websocket frame. */
  expectSnapshot() {
    if (this.phase === 'live') this.phase = 'paused';
    this._resyncRequested = true;
  }

  acceptData(message) {
    const streamId = message?.streamId;
    const seq = message?.seq;
    if (!isStreamId(streamId) || !isDataSeq(seq) || typeof message?.data !== 'string') {
      this.requestSnapshot('invalid-data-envelope');
      return 'invalid';
    }

    const relation = this.observeStream(streamId);
    if (relation === 'stale') return 'stale';
    if (relation === 'new') this._requestResync('new-stream');

    if (this.throughSeq != null && seq <= this.throughSeq) return 'duplicate';

    if (this.phase !== 'live') {
      const held = this._hold(seq, message.data);
      if (!this._resyncRequested) this._requestResync('awaiting-snapshot');
      return held;
    }

    if (seq === this.throughSeq + 1) {
      this._applyData(seq, message.data);
      return 'applied';
    }

    // WebSocket preserves order. A forward jump is therefore a real loss, not
    // reordering: stop before rendering the suffix and ask for one snapshot.
    this.phase = 'paused';
    const held = this._hold(seq, message.data);
    this._requestResync('sequence-gap');
    return held === 'held' ? 'gap' : held;
  }

  acceptGeometry(message) {
    const geometry = this._readGeometry(message);
    if (!geometry || !isStreamId(message?.streamId)) {
      this.requestSnapshot('invalid-geometry-envelope');
      return 'invalid';
    }

    const relation = this.observeStream(message.streamId);
    if (relation === 'stale') return 'stale';

    if (this.resizeGeneration != null) {
      if (geometry.resizeGeneration < this.resizeGeneration) return 'stale';
      if (geometry.resizeGeneration === this.resizeGeneration) {
        if (geometry.cols === this.cols && geometry.rows === this.rows) return 'duplicate';
        this.requestSnapshot('geometry-conflict');
        return 'invalid';
      }
    }

    const previousGeneration = this.resizeGeneration;
    this.resizeGeneration = geometry.resizeGeneration;
    this.cols = geometry.cols;
    this.rows = geometry.rows;
    const geometryApplied = this._onGeometry({ streamId: this.streamId, ...geometry });

    // Bytes held before the resize were produced for another grid. Never
    // append their tail to a snapshot serialized for the new grid.
    this._discardHeld();
    this.phase = 'awaiting-snapshot';
    // A resize invalidates any request made for the previous generation.
    if (previousGeneration != null && previousGeneration !== geometry.resizeGeneration) {
      this._resyncRequested = false;
    }
    this._requestResync(geometryApplied === false
      ? 'geometry-apply-failed'
      : (relation === 'new' ? 'new-stream-geometry' : 'geometry-change'));
    return 'applied';
  }

  acceptSnapshot(message) {
    const streamId = message?.streamId;
    const throughSeq = message?.throughSeq;
    const geometry = this._readGeometry(message);
    if (!isStreamId(streamId) || !isThroughSeq(throughSeq)
      || typeof message?.data !== 'string' || !geometry) {
      this.phase = 'paused';
      this._reissueResync('invalid-snapshot-envelope');
      return 'invalid';
    }

    const relation = this.observeStream(streamId);
    if (relation === 'stale') return 'stale';

    if (this.resizeGeneration != null) {
      if (geometry.resizeGeneration < this.resizeGeneration) {
        this._requestResync('stale-snapshot-geometry');
        return 'stale';
      }
      if (geometry.resizeGeneration === this.resizeGeneration
        && (geometry.cols !== this.cols || geometry.rows !== this.rows)) {
        this.phase = 'paused';
        this._reissueResync('snapshot-geometry-conflict');
        return 'invalid';
      }
    }

    // A snapshot older than bytes already rendered would roll the terminal
    // backwards; those bytes are no longer held and cannot be replayed safely.
    if (this.throughSeq != null && throughSeq < this.throughSeq) {
      if (geometry.resizeGeneration === this.resizeGeneration) {
        this.phase = 'paused';
        this._reissueResync('stale-snapshot-watermark');
      }
      return 'stale';
    }
    if (this.phase === 'live' && throughSeq === this.throughSeq
      && geometry.resizeGeneration === this.resizeGeneration) return 'duplicate';

    const geometryChanged = geometry.resizeGeneration !== this.resizeGeneration
      || geometry.cols !== this.cols || geometry.rows !== this.rows;
    if (geometryChanged) {
      const geometryApplied = this._onGeometry({ streamId, ...geometry });
      if (geometryApplied === false) {
        this.phase = 'paused';
        this._reissueResync('snapshot-geometry-apply-failed');
        return 'geometry-apply-failed';
      }
    }

    const discardedThroughSeq = this._discardedThroughSeq;
    this.resizeGeneration = geometry.resizeGeneration;
    this.cols = geometry.cols;
    this.rows = geometry.rows;
    this.throughSeq = throughSeq;
    this.phase = 'live';
    this._resyncRequested = false;
    this._discardedThroughSeq = 0;

    const snapshotApplied = this._onSnapshot({
      streamId,
      throughSeq,
      ...geometry,
      data: message.data,
      reason: message.reason,
    });

    if (snapshotApplied === false) {
      this.phase = 'paused';
      this._requestResync('snapshot-replay-failed');
      return 'replay-failed';
    }

    if (discardedThroughSeq > throughSeq) {
      // Hold overflow / geometry invalidation dropped bytes newer than this
      // snapshot. Keep the freshly rendered baseline, but do not resume on an
      // unknowable suffix.
      this.phase = 'paused';
      this._discardedThroughSeq = discardedThroughSeq;
      this._clearHeld();
      this._requestResync('snapshot-behind-discarded-data');
      return 'snapshot-behind';
    }

    const held = [...this._held.entries()].sort((left, right) => left[0] - right[0]);
    this._clearHeld();
    for (let index = 0; index < held.length; index++) {
      const [seq, data] = held[index];
      if (seq <= this.throughSeq) continue;
      if (seq !== this.throughSeq + 1) {
        this.phase = 'paused';
        for (let tail = index; tail < held.length; tail++) {
          this._hold(held[tail][0], held[tail][1]);
        }
        this._requestResync('sequence-gap-after-snapshot');
        return 'gap';
      }
      this._applyData(seq, data);
    }
    return 'applied';
  }

  _readGeometry(message) {
    if (!isResizeGeneration(message?.resizeGeneration)
      || !isDimension(message?.cols) || !isDimension(message?.rows)) return null;
    return {
      resizeGeneration: message.resizeGeneration,
      cols: message.cols,
      rows: message.rows,
    };
  }

  _beginStream(streamId) {
    const preserveWildcardRequest = this.streamId == null && this._resyncRequested;
    this.streamId = streamId;
    this.throughSeq = null;
    this.resizeGeneration = null;
    this.cols = null;
    this.rows = null;
    this.phase = 'awaiting-snapshot';
    this._clearHeld();
    this._discardedThroughSeq = 0;
    this._resyncRequested = preserveWildcardRequest;
  }

  _applyData(seq, data) {
    this.throughSeq = seq;
    this._onData({ streamId: this.streamId, seq, data });
  }

  _hold(seq, data) {
    if (this._discardedThroughSeq) {
      this._discardedThroughSeq = Math.max(this._discardedThroughSeq, seq);
      return 'discarded';
    }
    const existing = this._held.get(seq);
    if (existing != null) {
      if (existing !== data) this._requestResync('sequence-conflict');
      return existing === data ? 'duplicate' : 'invalid';
    }
    const bytes = terminalUtf8ByteLength(data);
    if (this._held.size + 1 > this._maxHeldMessages
      || this._heldBytes + bytes > this._maxHeldBytes) {
      this._discardedThroughSeq = seq;
      for (const heldSeq of this._held.keys()) {
        this._discardedThroughSeq = Math.max(this._discardedThroughSeq, heldSeq);
      }
      this._clearHeld();
      this._requestResync('hold-overflow');
      return 'overflow';
    }
    this._held.set(seq, data);
    this._heldBytes += bytes;
    return 'held';
  }

  _discardHeld() {
    for (const seq of this._held.keys()) {
      this._discardedThroughSeq = Math.max(this._discardedThroughSeq, seq);
    }
    this._clearHeld();
  }

  _clearHeld() {
    this._held.clear();
    this._heldBytes = 0;
  }

  _requestResync(reason) {
    if (this._resyncRequested) return false;
    const request = { reason };
    if (this.streamId != null) request.streamId = this.streamId;
    if (this.throughSeq != null) request.throughSeq = this.throughSeq;
    if (this.resizeGeneration != null) request.resizeGeneration = this.resizeGeneration;
    let accepted = false;
    try { accepted = this._onResync(request); } catch { return false; }
    if (accepted === false) return false;
    this._resyncRequested = true;
    return true;
  }

  _reissueResync(reason) {
    this._resyncRequested = false;
    return this._requestResync(reason);
  }
}
