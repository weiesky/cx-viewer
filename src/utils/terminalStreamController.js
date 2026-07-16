/**
 * Minimal ordering for the main PTY byte stream.
 *
 * WebSocket already preserves message order. The controller only rejects stale
 * streams and moves to the server's current cursor after a real gap. It does
 * not retain, parse, model, serialize, or reconstruct terminal history.
 */

export function sendTerminalSocketMessage(socket, message, openState = 1) {
  if (!socket || socket.readyState !== openState) return false;
  try {
    return socket.send(JSON.stringify(message)) !== false;
  } catch {
    return false;
  }
}

const validStreamId = value => Number.isSafeInteger(value) && value >= 1;
const validSeq = value => Number.isSafeInteger(value) && value >= 0;
const validDimension = value => Number.isSafeInteger(value) && value > 0;

export class TerminalStreamController {
  constructor({ onData, onSync, onGeometry, onResync } = {}) {
    this._onData = typeof onData === 'function' ? onData : () => {};
    this._onSync = typeof onSync === 'function' ? onSync : () => {};
    this._onGeometry = typeof onGeometry === 'function' ? onGeometry : () => {};
    this._onResync = typeof onResync === 'function' ? onResync : () => true;
    this.resetConnection();
  }

  resetConnection() {
    this.streamId = null;
    this.throughSeq = null;
    this.resizeGeneration = null;
    this.cols = null;
    this.rows = null;
    this._resyncRequested = false;
  }

  getState() {
    return {
      streamId: this.streamId,
      throughSeq: this.throughSeq,
      resizeGeneration: this.resizeGeneration,
      cols: this.cols,
      rows: this.rows,
      phase: this.throughSeq == null ? 'awaiting-sync' : 'live',
      resyncRequested: this._resyncRequested,
    };
  }

  observeStream(streamId) {
    if (!validStreamId(streamId)) return 'invalid';
    if (this.streamId == null || streamId > this.streamId) {
      this.streamId = streamId;
      this.throughSeq = null;
      this.resizeGeneration = null;
      this._resyncRequested = false;
      return 'new';
    }
    return streamId === this.streamId ? 'current' : 'stale';
  }

  requestSync(reason = 'resync') {
    if (this._resyncRequested) return false;
    const request = { reason };
    if (this.streamId != null) request.streamId = this.streamId;
    if (this.throughSeq != null) request.throughSeq = this.throughSeq;
    let accepted = false;
    try { accepted = this._onResync(request); } catch { return false; }
    if (accepted === false) return false;
    this._resyncRequested = true;
    return true;
  }

  expectSync() {
    this._resyncRequested = true;
  }

  acceptData(message) {
    if (!validStreamId(message?.streamId)
      || !Number.isSafeInteger(message?.seq) || message.seq < 1
      || typeof message?.data !== 'string') {
      this.requestSync('invalid-data-envelope');
      return 'invalid';
    }
    const relation = this.observeStream(message.streamId);
    if (relation === 'stale') return 'stale';
    if (this.throughSeq == null) {
      this.requestSync('new-stream');
      return 'awaiting-sync';
    }
    if (message.seq <= this.throughSeq) return 'duplicate';
    if (message.seq !== this.throughSeq + 1) {
      this._resyncRequested = false;
      this.requestSync('sequence-gap');
      return 'gap';
    }
    this.throughSeq = message.seq;
    this._onData({ streamId: this.streamId, seq: message.seq, data: message.data });
    return 'applied';
  }

  acceptGeometry(message) {
    if (!validStreamId(message?.streamId)
      || !validSeq(message?.resizeGeneration)
      || !validDimension(message?.cols) || !validDimension(message?.rows)) return 'invalid';
    const relation = this.observeStream(message.streamId);
    if (relation === 'stale') return 'stale';
    if (this.resizeGeneration != null && message.resizeGeneration < this.resizeGeneration) return 'stale';
    this.resizeGeneration = message.resizeGeneration;
    this.cols = message.cols;
    this.rows = message.rows;
    this._onGeometry(message);
    return 'applied';
  }

  acceptSync(message) {
    if (!validStreamId(message?.streamId) || !validSeq(message?.throughSeq)
      || !validSeq(message?.resizeGeneration)
      || !validDimension(message?.cols) || !validDimension(message?.rows)) {
      this._resyncRequested = false;
      this.requestSync('invalid-sync-envelope');
      return 'invalid';
    }
    const relation = this.observeStream(message.streamId);
    if (relation === 'stale') return 'stale';
    if (this.throughSeq != null && message.throughSeq < this.throughSeq) return 'stale';
    if (this.resizeGeneration != null) {
      if (message.resizeGeneration < this.resizeGeneration) return 'stale';
      if (message.resizeGeneration === this.resizeGeneration
        && this.cols != null
        && (message.cols !== this.cols || message.rows !== this.rows)) {
        this._resyncRequested = false;
        this.requestSync('geometry-conflict');
        return 'invalid';
      }
    }
    this.streamId = message.streamId;
    this.throughSeq = message.throughSeq;
    this.resizeGeneration = message.resizeGeneration;
    this.cols = message.cols;
    this.rows = message.rows;
    this._resyncRequested = false;
    this._onGeometry(message);
    return this._onSync(message) === false ? 'sync-failed' : 'applied';
  }
}
