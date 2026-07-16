import { execSync } from 'node:child_process';
import { chmodSync, statSync } from 'node:fs';
import { arch, platform } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BINARY_NAME, resolveNativePath } from './findcx.js';
import { parseCodexInvocation, stripResumeInvocation } from './lib/cli-args.js';
import { TerminalStateModel } from './lib/terminal-state-model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LIVE_FRAME_CHARS = 64 * 1024;
const BATCH_FLUSH_CHARS = 256 * 1024;
const MAX_SNAPSHOT_SUFFIX_BYTES = 32 * 1024;
const MIN_MAX_SNAPSHOT_BYTES = 256 * 1024;
const MAX_SNAPSHOT_BYTES = 1536 * 1024;
const MAX_SNAPSHOT_ATTEMPTS = 2;
const MAX_DEGRADED_SNAPSHOT_BYTES = 128 * 1024;
const MAX_SEQUENTIAL_JOBS = 64;
const NO_CONVERSATION_MESSAGE = 'No conversation found';
const DEFAULT_RESUME_GATE_TIMINGS = Object.freeze({
  quietMs: 50,
  absoluteTimeoutMs: 5000,
});

let ptyProcess = null;
let terminalState = null;
let dataListeners = [];
let rawDataListeners = [];
let geometryListeners = [];
let stateListeners = [];
let exitListeners = [];
let lastExitCode = null;
let currentWorkspacePath = null;
let lastWorkspacePath = null;
let lastPtyCols = 120;
let lastPtyRows = 30;
let batchChunks = [];
let batchChars = 0;
let batchImmediate = null;
let terminalStreamId = 0;
let lifecycleGeneration = 0;
let spawnQueue = Promise.resolve();
let resumeGate = null;
let sequentialJobs = [];
let sequentialActive = null;
let resumeGateTimings = { ...DEFAULT_RESUME_GATE_TIMINGS };
let _ptyImportForTests = null;
let _terminalStateFactoryForTests = null;

function withSpawnLock(task) {
  const run = spawnQueue.catch(() => {}).then(task);
  spawnQueue = run.catch(() => {});
  return run;
}

function isCurrentState(state) {
  return terminalState === state && state?.streamId === terminalStreamId && !state.disposed;
}

function isCurrentProcess(proc, state) {
  return ptyProcess === proc && isCurrentState(state);
}

function finishSequentialJob(job, ok) {
  if (!job || job.finished) return;
  job.finished = true;
  if (job.timer) clearTimeout(job.timer);
  job.timer = null;
  if (sequentialActive === job) sequentialActive = null;
  const index = sequentialJobs.indexOf(job);
  if (index >= 0) sequentialJobs.splice(index, 1);
  try { job.onComplete?.(ok); } catch { }
  if (!sequentialActive && sequentialJobs.length > 0) setImmediate(pumpSequentialJobs);
}

function cancelSequentialJobs() {
  const jobs = [...sequentialJobs];
  if (sequentialActive && !jobs.includes(sequentialActive)) jobs.unshift(sequentialActive);
  sequentialJobs = [];
  sequentialActive = null;
  for (const job of jobs) {
    if (job.timer) clearTimeout(job.timer);
    job.timer = null;
    if (job.finished) continue;
    job.finished = true;
    try { job.onComplete?.(false); } catch { }
  }
}

function pumpSequentialJobs() {
  if (sequentialActive) return;
  while (sequentialJobs.length > 0) {
    const job = sequentialJobs[0];
    if (job.finished) {
      sequentialJobs.shift();
      continue;
    }
    if (!isCurrentProcess(job.proc, job.state)) {
      finishSequentialJob(job, false);
      continue;
    }
    sequentialActive = job;
    break;
  }
  const job = sequentialActive;
  if (!job) return;

  const sendNext = () => {
    job.timer = null;
    if (job.finished || sequentialActive !== job) return;
    if (!isCurrentProcess(job.proc, job.state)) {
      finishSequentialJob(job, false);
      return;
    }
    if (job.index >= job.chunks.length) {
      finishSequentialJob(job, true);
      return;
    }
    const chunk = job.chunks[job.index++];
    try {
      requestResumeGateRelease(job.proc, job.state);
      job.proc.write(chunk);
    } catch {
      finishSequentialJob(job, false);
      return;
    }
    const semanticBoundary = chunk === ' ' || chunk === '\r'
      || chunk === '\x1b[C' || chunk === '\x1b[A' || chunk === '\x1b[B'
      || chunk.endsWith('\x1b[201~');
    const delay = semanticBoundary ? job.settleMs : Math.min(80, job.settleMs);
    job.timer = setTimeout(sendNext, delay);
  };
  sendNext();
}

function createStateModel(options) {
  if (typeof _terminalStateFactoryForTests === 'function') {
    return _terminalStateFactoryForTests(options);
  }
  return new TerminalStateModel(options);
}

function safeFailureMessage(error) {
  return String(error?.message || error || 'unknown Worker failure')
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .slice(0, 240);
}

function resetDegradedSnapshot(state, reason = state.modelError) {
  if (!state) return;
  const message = safeFailureMessage(reason);
  const data = `\x1bc\r\n\x1b[31m[CX Viewer] terminal recovery unavailable: ${message}\x1b[0m\r\n`;
  installDegradedSnapshot(state, data);
}

function installDegradedSnapshot(state, data) {
  state.degradedSnapshot = {
    streamId: state.streamId,
    throughSeq: state.outputSeq,
    resizeGeneration: state.resizeGeneration,
    cols: state.cols,
    rows: state.rows,
    data: String(data || ''),
    bytes: Buffer.byteLength(String(data || ''), 'utf8'),
    truncated: false,
    fallback: true,
  };
}

function markStateModelFailed(state, error) {
  if (!state || state.modelError) return;
  state.modelError = error instanceof Error ? error : new Error(String(error));
  resetDegradedSnapshot(state);
}

function appendDegradedFrame(state, seq, data) {
  let fallback = state.degradedSnapshot;
  if (!fallback) return;
  let text = data;
  let bytes = Buffer.byteLength(text, 'utf8');
  if (fallback.bytes + bytes > MAX_DEGRADED_SNAPSHOT_BYTES) {
    resetDegradedSnapshot(state, 'degraded output window restarted after 128 KiB');
    fallback = state.degradedSnapshot;
  }
  const remaining = MAX_DEGRADED_SNAPSHOT_BYTES - fallback.bytes;
  if (bytes > remaining) {
    const encoded = Buffer.from(text, 'utf8');
    let start = encoded.length - remaining;
    while (start < encoded.length && (encoded[start] & 0xc0) === 0x80) start++;
    text = encoded.subarray(start).toString('utf8');
    bytes = Buffer.byteLength(text, 'utf8');
    fallback.truncated = true;
  }
  fallback.data += text;
  fallback.bytes += bytes;
  fallback.throughSeq = seq;
}

function disposeState(state) {
  if (!state || state.disposed) return;
  state.disposed = true;
  state.snapshotCapture = null;
  state.cachedSnapshot = null;
  try {
    const result = state.model?.dispose?.();
    if (result?.catch) void result.catch(() => {});
  } catch { }
}

function beginTerminalStream() {
  cancelSequentialJobs();
  cancelResumeGate();
  flushBatch();
  disposeState(terminalState);
  terminalStreamId++;
  clearBatch();

  const model = createStateModel({
    cols: lastPtyCols,
    rows: lastPtyRows,
    scrollback: 1000,
    // Conversation history belongs to ChatView. A reconnect snapshot contains
    // the canonical visible terminal only, which keeps renderer work bounded.
    snapshotScrollback: 0,
    generation: `terminal-stream-${terminalStreamId}`,
  });
  const state = {
    streamId: terminalStreamId,
    model,
    outputSeq: 0,
    resizeGeneration: 0,
    cols: lastPtyCols,
    rows: lastPtyRows,
    cachedSnapshot: null,
    degradedSnapshot: null,
    snapshotRefresh: null,
    snapshotCapture: null,
    modelError: null,
    disposed: false,
  };
  terminalState = state;

  if (model?.ready?.catch) {
    void model.ready.catch(error => {
      if (isCurrentState(state)) markStateModelFailed(state, error);
    });
  }
  return state;
}

function clearBatch() {
  batchChunks = [];
  batchChars = 0;
  if (batchImmediate) clearImmediate(batchImmediate);
  batchImmediate = null;
}

function splitLiveFrames(data) {
  if (data.length <= LIVE_FRAME_CHARS) return [data];
  const frames = [];
  for (let offset = 0; offset < data.length; offset += LIVE_FRAME_CHARS) {
    frames.push(data.slice(offset, offset + LIVE_FRAME_CHARS));
  }
  return frames;
}

function appendSnapshotSuffix(state, seq, data) {
  const capture = state.snapshotCapture;
  if (!capture || seq <= capture.targetSeq) return;
  if (capture.overflow) return;
  const bytes = Buffer.byteLength(data, 'utf8');
  if (capture.suffixBytes + bytes > MAX_SNAPSHOT_SUFFIX_BYTES) {
    capture.overflow = true;
    capture.suffix = [];
    capture.suffixBytes = 0;
    return;
  }
  capture.suffix.push({ seq, data });
  capture.suffixBytes += bytes;
}

function publishLiveFrame(data, meta) {
  for (const cb of dataListeners) {
    try { cb(data, meta); } catch { }
  }
}

function commitTerminalFrame(state, data) {
  if (!data || !isCurrentState(state)) return;
  const seq = ++state.outputSeq;
  if (!state.modelError) {
    try {
      state.model.enqueue(data);
    } catch (error) {
      markStateModelFailed(state, error);
    }
  }
  appendSnapshotSuffix(state, seq, data);

  const gate = resumeGate;
  if (gate && gate.state === state && gate.proc === ptyProcess) return;
  appendDegradedFrame(state, seq, data);
  publishLiveFrame(data, {
    streamId: state.streamId,
    seq,
    snapshot: false,
    reason: null,
  });
}

function flushBatch() {
  if (batchImmediate) clearImmediate(batchImmediate);
  batchImmediate = null;
  if (batchChunks.length === 0) return;
  const state = terminalState;
  const data = batchChunks.length === 1 ? batchChunks[0] : batchChunks.join('');
  batchChunks = [];
  batchChars = 0;
  if (!isCurrentState(state)) return;
  for (const frame of splitLiveFrames(data)) commitTerminalFrame(state, frame);
}

function queueTerminalData(state, data) {
  if (!isCurrentState(state) || !data) return;
  batchChunks.push(data);
  batchChars += data.length;
  if (batchChars >= BATCH_FLUSH_CHARS) {
    flushBatch();
  } else if (!batchImmediate) {
    batchImmediate = setImmediate(flushBatch);
  }
}

function snapshotIsCurrent(state, snapshot = state?.cachedSnapshot) {
  return Boolean(snapshot
    && isCurrentState(state)
    && snapshot.streamId === state.streamId
    && snapshot.throughSeq === state.outputSeq
    && snapshot.resizeGeneration === state.resizeGeneration
    && snapshot.cols === state.cols
    && snapshot.rows === state.rows);
}

function degradedSnapshotIsCurrent(state, snapshot = state?.degradedSnapshot) {
  return Boolean(snapshot
    && isCurrentState(state)
    && snapshot.streamId === state.streamId
    && snapshot.throughSeq === state.outputSeq
    && snapshot.resizeGeneration === state.resizeGeneration
    && snapshot.cols === state.cols
    && snapshot.rows === state.rows);
}

function captureSuffixIsContiguous(capture, throughSeq) {
  let expected = capture.targetSeq + 1;
  for (const frame of capture.suffix) {
    if (frame.seq !== expected) return false;
    expected++;
  }
  return expected - 1 === throughSeq;
}

function snapshotByteLimit(cols, rows) {
  // Large but valid grids need more than the historical fixed 256 KiB cap.
  // Keep the browser/server envelope bounded while scaling for multibyte cells
  // and the VT attributes needed to reproduce the visible screen.
  return Math.min(
    MAX_SNAPSHOT_BYTES,
    Math.max(MIN_MAX_SNAPSHOT_BYTES, cols * rows * 12),
  );
}

async function refreshCanonicalSnapshot(state) {
  for (let attempt = 0; attempt < MAX_SNAPSHOT_ATTEMPTS; attempt++) {
    if (!isCurrentState(state) || state.modelError) return false;
    flushBatch();

    const capture = {
      targetSeq: state.outputSeq,
      modelSeq: state.model.seq,
      resizeGeneration: state.resizeGeneration,
      cols: state.cols,
      rows: state.rows,
      suffix: [],
      suffixBytes: 0,
      overflow: false,
    };
    state.snapshotCapture = capture;

    let base;
    try {
      base = await state.model.requestSnapshot();
    } catch (error) {
      if (state.snapshotCapture === capture) state.snapshotCapture = null;
      markStateModelFailed(state, error);
      return false;
    }

    // PTY output can reach Node while the Worker serializes. Commit that
    // pending batch into both the model and this exact raw suffix before the
    // snapshot cut is published.
    flushBatch();
    if (state.snapshotCapture === capture) state.snapshotCapture = null;
    if (!isCurrentState(state)) return false;

    if (!base?.safe) {
      // A write that arrived during serialization may have completed a split
      // CSI/OSC/Unicode sequence. Retry at the newer parser-ground boundary;
      // otherwise wait for the next output event instead of timer polling.
      if (state.outputSeq > capture.targetSeq) continue;
      return false;
    }

    if (base.generation != null && base.generation !== state.model.generation) return false;
    if (base.seq !== capture.modelSeq) continue;
    if (base.cols !== capture.cols || base.rows !== capture.rows) continue;

    if (capture.resizeGeneration !== state.resizeGeneration
      || capture.cols !== state.cols || capture.rows !== state.rows
      || capture.overflow) {
      continue;
    }
    if (!captureSuffixIsContiguous(capture, state.outputSeq)) continue;

    const suffix = capture.suffix.map(frame => frame.data).join('');
    const data = (base.data || '') + suffix;
    const bytes = Buffer.byteLength(data, 'utf8');
    if (bytes > snapshotByteLimit(state.cols, state.rows)) return false;

    state.cachedSnapshot = {
      streamId: state.streamId,
      throughSeq: state.outputSeq,
      resizeGeneration: state.resizeGeneration,
      cols: state.cols,
      rows: state.rows,
      data,
      bytes,
      truncated: false,
      authoritative: true,
      history: base.history,
    };
    state.degradedSnapshot = null;
    return true;
  }
  return false;
}

/**
 * Build one canonical reconnect snapshot in the headless terminal Worker.
 * Concurrent callers share the same barrier and serialization. This function
 * never resizes the PTY and never participates in the input path.
 */
export function requestPtySnapshot() {
  const state = terminalState;
  if (!isCurrentState(state)) return Promise.resolve(false);
  flushBatch();
  if (snapshotIsCurrent(state)) return Promise.resolve(true);
  if (state.snapshotRefresh) return state.snapshotRefresh;

  const promise = refreshCanonicalSnapshot(state).finally(() => {
    if (state.snapshotRefresh === promise) state.snapshotRefresh = null;
  });
  state.snapshotRefresh = promise;
  return promise;
}

function clearResumeGateTimers(gate) {
  for (const name of ['quietTimer', 'absoluteTimer']) {
    if (gate?.[name]) clearTimeout(gate[name]);
    if (gate) gate[name] = null;
  }
}

function cancelResumeGate() {
  const gate = resumeGate;
  resumeGate = null;
  clearResumeGateTimers(gate);
}

function resumeGateIsCurrent(gate) {
  return resumeGate === gate
    && (ptyProcess === gate.proc || ptyProcess === null)
    && isCurrentState(gate.state);
}

function normalizeResumeDiagnosticText(data) {
  return String(data || '')
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\x09\x0a\x20-\x7e]/g, '');
}

function observeResumeFailure(gate, data) {
  const value = gate.noConversationCarry + normalizeResumeDiagnosticText(data);
  const lines = value.split('\n');
  gate.noConversationCarry = lines.pop().slice(-512);
  if (lines.some(line => line.trim() === NO_CONVERSATION_MESSAGE)) {
    gate.noConversationDetected = true;
  }
}

function resumeTargetMissing(gate) {
  return Boolean(gate?.noConversationDetected
    || gate?.noConversationCarry?.trim() === NO_CONVERSATION_MESSAGE);
}

function publishCachedSnapshot(state, reason) {
  const snapshot = state.cachedSnapshot;
  if (!snapshotIsCurrent(state, snapshot)) return false;
  publishLiveFrame(snapshot.data, {
    streamId: snapshot.streamId,
    snapshot: true,
    reason,
    throughSeq: snapshot.throughSeq,
    resizeGeneration: snapshot.resizeGeneration,
    cols: snapshot.cols,
    rows: snapshot.rows,
    authoritative: true,
  });
  return true;
}

function publishDegradedSnapshot(state, reason) {
  const snapshot = state.degradedSnapshot;
  if (!degradedSnapshotIsCurrent(state, snapshot)) return false;
  publishLiveFrame(snapshot.data, {
    streamId: snapshot.streamId,
    snapshot: true,
    reason,
    throughSeq: snapshot.throughSeq,
    resizeGeneration: snapshot.resizeGeneration,
    cols: snapshot.cols,
    rows: snapshot.rows,
    authoritative: false,
    fallback: true,
  });
  return true;
}

function completeResumeGate(gate, reason) {
  if (!resumeGateIsCurrent(gate)) return false;
  const snapshot = gate.state.cachedSnapshot;
  const alreadyPublished = snapshotIsCurrent(gate.state, snapshot)
    && gate.lastPublishedThroughSeq === snapshot.throughSeq
    && gate.lastPublishedResizeGeneration === snapshot.resizeGeneration;
  resumeGate = null;
  clearResumeGateTimers(gate);
  return alreadyPublished || publishCachedSnapshot(gate.state, reason);
}

function publishResumeSnapshot(gate, reason) {
  if (!resumeGateIsCurrent(gate)) return false;
  const published = publishCachedSnapshot(gate.state, reason);
  if (published) {
    // Keep the exact payload that crossed the resume privacy boundary. A
    // reconnecting client may replay this object while the gate remains active;
    // it must never substitute a newer merely-cached snapshot.
    gate.approvedReconnectSnapshot = gate.state.cachedSnapshot;
    gate.lastPublishedThroughSeq = gate.state.cachedSnapshot.throughSeq;
    gate.lastPublishedResizeGeneration = gate.state.cachedSnapshot.resizeGeneration;
  }
  return published;
}

function settleResumeGate(
  gate,
  reason,
  activityVersion,
  force = false,
  publishWhileActive = false,
) {
  if (!resumeGateIsCurrent(gate)) return;
  if (gate.snapshotInFlight) {
    const sameActivity = gate.pendingFinal?.activityVersion === activityVersion;
    gate.pendingFinal = {
      reason,
      activityVersion,
      // An absolute/quiet decision belongs to one activity version. Never
      // carry it across newer output, or fresh bytes could inherit permission
      // to release the privacy gate without reaching their own boundary.
      force: force || (sameActivity && gate.pendingFinal?.force === true),
      publishWhileActive: publishWhileActive
        || (sameActivity && gate.pendingFinal?.publishWhileActive === true),
    };
    return;
  }
  gate.snapshotInFlight = true;

  const drainPendingDecision = () => {
    const pendingFinal = gate.pendingFinal;
    gate.pendingFinal = null;
    if (!pendingFinal || !resumeGateIsCurrent(gate)) return;
    settleResumeGate(
      gate,
      pendingFinal.reason,
      pendingFinal.activityVersion,
      pendingFinal.force,
      pendingFinal.publishWhileActive,
    );
  };

  void requestPtySnapshot().then(success => {
    gate.snapshotInFlight = false;
    if (!resumeGateIsCurrent(gate)) return;
    const activityStable = activityVersion === gate.activityVersion;
    const stillQuiet = force || (activityStable
      && gate.quietTimer === null);
    if (success) {
      // Explicit input is the recovery boundary the user asked for. Once one
      // canonical cut has absorbed the first post-input output, release the
      // gate immediately: subsequent keyboard echo must use ordinary deltas,
      // not repeated full-screen snapshots or another quiet-period wait.
      const releaseAfterInput = publishWhileActive
        && gate.releaseRequested
        && gate.activityVersion > gate.releaseAfterVersion;
      if (stillQuiet || releaseAfterInput) {
        // A successful quiet/absolute canonical cut is the recovery boundary.
        // Keeping the gate alive after that point turns ordinary Codex output
        // into periodic full-screen replays and destroys streaming smoothness.
        // Input may establish the same boundary earlier, but neither path may
        // keep normal rendering on the snapshot transport afterwards.
        const release = stillQuiet || releaseAfterInput;
        if (release ? completeResumeGate(gate, reason) : publishResumeSnapshot(gate, reason)) {
          if (release) return;
        }
      }
    } else if (stillQuiet) {
      publishResumeDiagnosticFallback(gate, {
        reason: gate.state.modelError ? 'resume-worker-failure' : 'resume-unsafe',
      });
    }
    drainPendingDecision();
  }, () => {
    gate.snapshotInFlight = false;
    if (!resumeGateIsCurrent(gate)) return;
    if (force || (activityVersion === gate.activityVersion && gate.quietTimer === null)) {
      publishResumeDiagnosticFallback(gate, { reason: 'resume-worker-failure' });
    }
    // A quiet/absolute/input decision may have arrived while this request was
    // in flight. Rejection must not consume its only wake-up edge.
    drainPendingDecision();
  });
}

function noteResumeOutput(gate, data) {
  if (!resumeGateIsCurrent(gate)) return;
  gate.sawOutput = true;
  gate.activityVersion++;
  observeResumeFailure(gate, data);
  if (gate.quietTimer) clearTimeout(gate.quietTimer);
  gate.quietTimer = setTimeout(
    () => {
      gate.quietTimer = null;
      settleResumeGate(gate, 'resume-quiet', gate.activityVersion);
    },
    resumeGateTimings.quietMs,
  );
  // The first canonical post-input cut establishes one safe stream boundary.
  // settleResumeGate then releases the gate immediately so all later keyboard
  // echo follows the normal low-latency delta path.
  if (gate.releaseRequested && gate.activityVersion > gate.releaseAfterVersion) {
    settleResumeGate(
      gate,
      'resume-input-progress',
      gate.activityVersion,
      false,
      true,
    );
  }
}

function startResumeGate(proc, state) {
  const gate = {
    proc,
    state,
    sawOutput: false,
    activityVersion: 0,
    snapshotInFlight: false,
    pendingFinal: null,
    noConversationCarry: '',
    noConversationDetected: false,
    releaseRequested: false,
    releaseAfterVersion: Number.POSITIVE_INFINITY,
    approvedReconnectSnapshot: null,
    lastPublishedThroughSeq: null,
    lastPublishedResizeGeneration: null,
    quietTimer: null,
    absoluteTimer: null,
  };
  resumeGate = gate;
  gate.absoluteTimer = setTimeout(() => {
    gate.absoluteTimer = null;
    settleResumeGate(gate, 'resume-absolute', gate.activityVersion, true);
  }, resumeGateTimings.absoluteTimeoutMs);
  return gate;
}

function publishResumeDiagnosticFallback(gate, { exitCode = null, reason = 'resume-unsafe' } = {}) {
  if (!resumeGateIsCurrent(gate)) return false;
  const state = gate.state;
  const status = exitCode == null
    ? (reason === 'resume-worker-failure'
      ? '[CX Viewer] terminal recovery unavailable; restart the session to restore terminal output'
      : '[CX Viewer] waiting for a safe terminal recovery boundary')
    : `[process exited with code ${exitCode}]`;
  const data = `\x1bc\r\n${status}\r\n`;
  installDegradedSnapshot(state, data);
  const published = publishDegradedSnapshot(state, reason);
  if (published) gate.approvedReconnectSnapshot = state.degradedSnapshot;
  return published;
}

async function finalizeResumeExit(gate, exitCode, notifyExit) {
  const success = await requestPtySnapshot();
  // A quiet/max settle can share this same snapshot Promise and clear the gate
  // in its earlier .then callback. Exit delivery belongs to the process/state,
  // not to ownership of that gate, so it must still run exactly once.
  if (resumeGateIsCurrent(gate)) {
    if (success) completeResumeGate(gate, 'resume-process-exit');
    else {
      publishResumeDiagnosticFallback(gate, { exitCode, reason: 'resume-exit-diagnostic' });
      resumeGate = null;
      clearResumeGateTimers(gate);
    }
  }
  notifyExit();
}

function emitPtyExit(exitCode, meta) {
  for (const cb of exitListeners) {
    try { cb(exitCode, meta); } catch { }
  }
}

function emitPtyState(reason) {
  const state = { ...getPtyState(), reason };
  for (const cb of stateListeners) {
    try { cb(state); } catch { }
  }
}

function emitGeometry(state) {
  const geometry = {
    streamId: state.streamId,
    resizeGeneration: state.resizeGeneration,
    cols: state.cols,
    rows: state.rows,
  };
  for (const cb of geometryListeners) {
    try { cb(geometry); } catch { }
  }
}

function attachPtyData(proc, state) {
  proc.onData(data => {
    if (!isCurrentProcess(proc, state)) return;
    const text = String(data ?? '');
    // Establish model/resize order before invoking extension listeners. A raw
    // listener is allowed to synchronously resize or replace the PTY; the bytes
    // that arrived first must remain on the old side of that boundary.
    queueTerminalData(state, text);
    if (!isCurrentProcess(proc, state)) return;
    const rawEvent = {
      streamId: state.streamId,
      data: text,
      timestamp: Date.now(),
    };
    for (const cb of rawDataListeners) {
      try { cb(rawEvent); } catch { }
    }
    if (!isCurrentState(state)) return;
    if (resumeGate?.proc === proc && resumeGate.state === state) {
      noteResumeOutput(resumeGate, text);
    }
  });
}

export function _setPtyImportForTests(fn) {
  _ptyImportForTests = fn;
}

export function _setTerminalStateFactoryForTests(fn) {
  _terminalStateFactoryForTests = fn;
}

export function _setResumeGateTimingsForTests(options = {}) {
  const next = { ...resumeGateTimings };
  for (const key of Object.keys(DEFAULT_RESUME_GATE_TIMINGS)) {
    if (Number.isFinite(options[key])) next[key] = Math.max(0, options[key]);
  }
  resumeGateTimings = next;
}

export function _resetPtyManagerForTests() {
  killPty();
  dataListeners = [];
  rawDataListeners = [];
  geometryListeners = [];
  stateListeners = [];
  exitListeners = [];
  lastExitCode = null;
  currentWorkspacePath = null;
  lastWorkspacePath = null;
  lastPtyCols = 120;
  lastPtyRows = 30;
  clearBatch();
  terminalStreamId = 0;
  lifecycleGeneration = 0;
  spawnQueue = Promise.resolve();
  cancelSequentialJobs();
  resumeGateTimings = { ...DEFAULT_RESUME_GATE_TIMINGS };
  _ptyImportForTests = null;
  _terminalStateFactoryForTests = null;
}

async function getPty() {
  if (typeof _ptyImportForTests === 'function') return _ptyImportForTests();
  const ptyMod = await import('node-pty');
  return ptyMod.default || ptyMod;
}

function fixSpawnHelperPermissions() {
  try {
    const helperPath = join(
      __dirname,
      'node_modules',
      'node-pty',
      'prebuilds',
      `${platform()}-${arch()}`,
      'spawn-helper',
    );
    const stat = statSync(helperPath);
    if (!(stat.mode & 0o111)) chmodSync(helperPath, stat.mode | 0o755);
  } catch { }
}

function extractShellProxyEnv() {
  const shell = process.env.SHELL || '/bin/zsh';
  try {
    const funcBody = execSync(
      `${shell} -ic 'declare -f ${BINARY_NAME} 2>/dev/null || type ${BINARY_NAME} 2>/dev/null'`,
      { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const proxyVars = {};
    const proxyRe = /\b(HTTPS?_PROXY|https?_proxy|ALL_PROXY|all_proxy|NO_PROXY|no_proxy)=(\S+)/g;
    let match;
    while ((match = proxyRe.exec(funcBody)) !== null) proxyVars[match[1]] = match[2];
    return proxyVars;
  } catch {
    return {};
  }
}

async function spawnCodexUnlocked(requestId, {
  proxyPort = null,
  cwd,
  args: extraArgs = [],
  codexPath = null,
  isNpmVersion = false,
  serverPort = null,
  invocation = parseCodexInvocation(extraArgs),
  noResumeFallback = false,
} = {}) {
  if (requestId !== lifecycleGeneration) return null;
  if (ptyProcess) killPty({ invalidatePending: false, reason: 'replaced' });

  const pty = await getPty();
  if (requestId !== lifecycleGeneration) return null;
  fixSpawnHelperPermissions();

  if (!codexPath) {
    codexPath = resolveNativePath();
    if (!codexPath) throw new Error('codex not found');
  }

  const env = { ...process.env };
  if (!env.HTTPS_PROXY && !env.HTTP_PROXY && !env.https_proxy && !env.http_proxy) {
    Object.assign(env, extractShellProxyEnv());
  }
  if (proxyPort) env.OPENAI_BASE_URL = `http://127.0.0.1:${proxyPort}`;

  let nodePath = process.execPath;
  if (process.versions.electron) {
    try {
      nodePath = execSync(process.platform === 'win32' ? 'where node' : 'which node', {
        encoding: 'utf-8',
      }).trim();
      if (process.platform === 'win32') nodePath = nodePath.split('\n')[0].trim();
    } catch {
      nodePath = process.platform === 'win32' ? 'node' : '/usr/local/bin/node';
    }
  }

  if (serverPort) {
    const editorScript = join(__dirname, 'lib', 'cxv-editor.js');
    env.EDITOR = `${nodePath} ${editorScript}`;
    env.VISUAL = env.EDITOR;
    env.CXV_EDITOR_PORT = String(serverPort);
    env.CXVIEWER_PORT = String(serverPort);
  }

  let command = codexPath;
  let args = [...extraArgs];
  if (isNpmVersion && codexPath.endsWith('.js')) {
    command = nodePath;
    args = [codexPath, ...extraArgs];
  }

  lastExitCode = null;
  const state = beginTerminalStream();
  currentWorkspacePath = cwd || process.cwd();
  lastWorkspacePath = currentWorkspacePath;

  let proc;
  try {
    proc = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols: state.cols,
      rows: state.rows,
      cwd: currentWorkspacePath,
      env,
    });
  } catch (error) {
    disposeState(state);
    if (terminalState === state) terminalState = null;
    currentWorkspacePath = null;
    lastExitCode = -1;
    throw error;
  }

  ptyProcess = proc;
  const resumeInvocation = invocation?.kind === 'resume';
  const historyLoadingInvocation = resumeInvocation || invocation?.kind === 'fork';
  if (historyLoadingInvocation) startResumeGate(proc, state);
  attachPtyData(proc, state);
  emitPtyState('spawn');

  proc.onExit(({ exitCode }) => {
    if (!isCurrentProcess(proc, state)) return;
    flushBatch();
    const gate = resumeGate?.proc === proc && resumeGate.state === state ? resumeGate : null;
    const shouldRetryFresh = !noResumeFallback
      && resumeInvocation
      && exitCode !== 0
      && resumeTargetMissing(gate);

    lastExitCode = exitCode;
    ptyProcess = null;
    currentWorkspacePath = null;
    cancelSequentialJobs();

    if (shouldRetryFresh) {
      cancelResumeGate();
      console.error('[CX Viewer] resume failed (no conversation), retrying with a fresh session');
      const retryArgs = stripResumeInvocation(extraArgs, parseCodexInvocation(extraArgs));
      const fallback = spawnCodexRequest({
        proxyPort,
        cwd,
        args: retryArgs,
        codexPath,
        isNpmVersion,
        serverPort,
        invocation: { kind: 'new', subcommandIndex: null },
        noResumeFallback: true,
      });
      const fallbackLifecycle = lifecycleGeneration;
      void fallback.catch(error => {
        console.error('[CX Viewer] fresh-session fallback failed:', error.message);
        if (lifecycleGeneration !== fallbackLifecycle || ptyProcess) return;
        const failedState = terminalState;
        if (failedState) disposeState(failedState);
        terminalState = null;
        currentWorkspacePath = null;
        lastExitCode = exitCode;
        emitPtyState('resume-fallback-failed');
        emitPtyExit(exitCode, {
          streamId: failedState?.streamId ?? state.streamId,
          reason: 'resume-fallback-failed',
        });
      });
      return;
    }

    const notifyExit = () => {
      if (!isCurrentState(state)) return;
      emitPtyExit(exitCode, { streamId: state.streamId, reason: 'process-exit' });
    };
    if (gate) void finalizeResumeExit(gate, exitCode, notifyExit);
    else notifyExit();
  });

  return proc;
}

export function spawnCodexRequest(request) {
  const requestId = ++lifecycleGeneration;
  return withSpawnLock(() => spawnCodexUnlocked(requestId, request));
}

/** @deprecated Prefer spawnCodexRequest({ ... }) so launch intent is explicit. */
export function spawnCodex(
  proxyPort,
  cwd,
  extraArgs = [],
  codexPath = null,
  isNpmVersion = false,
  serverPort = null,
  launchOptions = {},
) {
  return spawnCodexRequest({
    proxyPort,
    cwd,
    args: extraArgs,
    codexPath,
    isNpmVersion,
    serverPort,
    invocation: launchOptions.invocation || parseCodexInvocation(extraArgs),
    noResumeFallback: launchOptions.noResumeFallback === true,
  });
}

export function writeToPty(data) {
  const proc = ptyProcess;
  if (!proc) return false;
  // Input is latency critical: write synchronously and let the canonical model
  // consume response bytes later. No snapshot or Worker promise is awaited,
  // and input must not cut a resume snapshot ahead of a still-arriving history
  // burst (that would turn megabytes of raw suffix into renderer work).
  requestResumeGateRelease(proc, terminalState);
  proc.write(data);
  return true;
}

function requestResumeGateRelease(proc, state) {
  const gate = resumeGate;
  if (!gate || gate.proc !== proc || gate.state !== state || !resumeGateIsCurrent(gate)) return;
  if (!gate.releaseRequested) {
    gate.releaseRequested = true;
    gate.releaseAfterVersion = gate.activityVersion;
  }
}

export function writeToPtySequential(chunks, onComplete, opts = {}) {
  if (!ptyProcess || !isCurrentState(terminalState)
    || !Array.isArray(chunks) || chunks.length === 0
    || chunks.some(chunk => typeof chunk !== 'string')) {
    onComplete?.(false);
    return null;
  }
  if (sequentialJobs.length >= MAX_SEQUENTIAL_JOBS) {
    onComplete?.(false);
    return null;
  }
  const requestedSettle = Number(opts.settleMs ?? 150);
  const settleMs = Number.isFinite(requestedSettle)
    ? Math.max(0, Math.min(2000, requestedSettle))
    : 150;
  const job = {
    proc: ptyProcess,
    state: terminalState,
    chunks: [...chunks],
    index: 0,
    settleMs,
    onComplete,
    timer: null,
    finished: false,
  };
  sequentialJobs.push(job);
  pumpSequentialJobs();
  return () => finishSequentialJob(job, false);
}

async function spawnShellUnlocked(requestId) {
  if (requestId !== lifecycleGeneration || ptyProcess) return false;
  const cwd = lastWorkspacePath || process.cwd();
  const pty = await getPty();
  if (requestId !== lifecycleGeneration || ptyProcess) return false;
  fixSpawnHelperPermissions();

  const state = beginTerminalStream();
  const shellEnv = { ...process.env };
  delete shellEnv.CXVIEWER_PORT;
  delete shellEnv.CXV_EDITOR_PORT;
  lastExitCode = null;
  currentWorkspacePath = cwd;

  let proc;
  try {
    proc = pty.spawn(process.env.SHELL || '/bin/sh', [], {
      name: 'xterm-256color',
      cols: state.cols,
      rows: state.rows,
      cwd,
      env: shellEnv,
    });
  } catch (error) {
    disposeState(state);
    if (terminalState === state) terminalState = null;
    currentWorkspacePath = null;
    throw error;
  }

  ptyProcess = proc;
  attachPtyData(proc, state);
  emitPtyState('spawn-shell');
  proc.onExit(({ exitCode }) => {
    if (!isCurrentProcess(proc, state)) return;
    flushBatch();
    lastExitCode = exitCode;
    ptyProcess = null;
    currentWorkspacePath = null;
    cancelSequentialJobs();
    emitPtyExit(exitCode, { streamId: state.streamId, reason: 'process-exit' });
  });
  return true;
}

export function spawnShell() {
  const requestId = lifecycleGeneration;
  return withSpawnLock(() => spawnShellUnlocked(requestId));
}

export function resizePty(cols, rows) {
  if (!Number.isSafeInteger(cols) || cols < 2
    || !Number.isSafeInteger(rows) || rows < 1) return false;
  lastPtyCols = cols;
  lastPtyRows = rows;
  const proc = ptyProcess;
  const state = terminalState;
  if (!proc || !isCurrentState(state)) return false;
  if (cols === state.cols && rows === state.rows) return true;

  const gate = resumeGate?.proc === proc && resumeGate.state === state
    && resumeGateIsCurrent(resumeGate) ? resumeGate : null;
  flushBatch();
  if (!isCurrentProcess(proc, state)) return false;
  try {
    proc.resize(cols, rows);
  } catch {
    return false;
  }
  if (!isCurrentProcess(proc, state)) return false;
  // Preserve a synchronous onData callback fired from inside native resize as
  // old-geometry output. Anything arriving later follows the resize event.
  flushBatch();
  if (!isCurrentProcess(proc, state)) return false;
  const canReapproveAfterResize = Boolean(gate?.approvedReconnectSnapshot
    && gate.approvedReconnectSnapshot.streamId === state.streamId
    && gate.approvedReconnectSnapshot.throughSeq === state.outputSeq
    && gate.approvedReconnectSnapshot.resizeGeneration === state.resizeGeneration);
  state.cols = cols;
  state.rows = rows;
  state.resizeGeneration++;
  if (!state.modelError) {
    try {
      state.model.resize(cols, rows);
    } catch (error) {
      markStateModelFailed(state, error);
    }
  }
  if (state.degradedSnapshot) {
    resetDegradedSnapshot(state, state.modelError || 'terminal geometry changed during degraded recovery');
  }
  emitGeometry(state);
  // A browser bootstrap resize invalidates an old-grid approved baseline. If
  // no hidden output followed that baseline, rebuild it for the new geometry
  // immediately; otherwise the existing quiet boundary remains responsible.
  // This prevents a silent PTY from leaving reconnect intents pending forever.
  if (canReapproveAfterResize && resumeGateIsCurrent(gate)) {
    settleResumeGate(gate, 'resume-resize', gate.activityVersion, true);
  }
  return true;
}

export function killPty({ invalidatePending = true, reason = 'killed' } = {}) {
  if (invalidatePending) lifecycleGeneration++;
  flushBatch();
  cancelSequentialJobs();
  cancelResumeGate();
  const proc = ptyProcess;
  const state = terminalState;
  ptyProcess = null;
  terminalState = null;
  currentWorkspacePath = null;
  clearBatch();
  disposeState(state);
  if (!proc) return;
  try { proc.kill(); } catch { }
  emitPtyState(reason);
  emitPtyExit(null, { streamId: state?.streamId ?? terminalStreamId, reason });
}

export function onPtyData(cb) {
  dataListeners.push(cb);
  return () => { dataListeners = dataListeners.filter(listener => listener !== cb); };
}

export function onPtyRawData(cb) {
  rawDataListeners.push(cb);
  return () => { rawDataListeners = rawDataListeners.filter(listener => listener !== cb); };
}

export function onPtyGeometry(cb) {
  geometryListeners.push(cb);
  return () => { geometryListeners = geometryListeners.filter(listener => listener !== cb); };
}

export function onPtyState(cb) {
  stateListeners.push(cb);
  return () => { stateListeners = stateListeners.filter(listener => listener !== cb); };
}

export function onPtyExit(cb) {
  exitListeners.push(cb);
  return () => { exitListeners = exitListeners.filter(listener => listener !== cb); };
}

export function getPtyState() {
  return {
    running: Boolean(ptyProcess),
    exitCode: lastExitCode,
    streamId: terminalState?.streamId ?? terminalStreamId,
    recovering: resumeGate !== null,
    resizeGeneration: terminalState?.resizeGeneration ?? 0,
    cols: terminalState?.cols ?? lastPtyCols,
    rows: terminalState?.rows ?? lastPtyRows,
  };
}

export function getCurrentWorkspace() {
  return {
    running: Boolean(ptyProcess),
    exitCode: lastExitCode,
    cwd: currentWorkspacePath,
  };
}

export function getOutputSnapshot() {
  const state = terminalState;
  const snapshot = state?.cachedSnapshot;
  const authoritative = snapshotIsCurrent(state, snapshot);
  const fallback = !authoritative && degradedSnapshotIsCurrent(state);
  const selected = authoritative ? snapshot : (fallback ? state.degradedSnapshot : null);
  return {
    streamId: state?.streamId ?? terminalStreamId,
    throughSeq: selected?.throughSeq ?? state?.outputSeq ?? 0,
    resizeGeneration: state?.resizeGeneration ?? 0,
    cols: state?.cols ?? lastPtyCols,
    rows: state?.rows ?? lastPtyRows,
    recovering: resumeGate !== null,
    authoritative,
    fallback,
    data: selected?.data ?? '',
    bytes: selected?.bytes ?? 0,
    truncated: false,
    modelHealthy: Boolean(state && !state.modelError),
  };
}

/**
 * Return only a baseline that is safe to replay to a newly connected renderer.
 *
 * During resume/fork recovery, requestPtySnapshot() may populate cachedSnapshot
 * before the quiet/privacy boundary approves it. The websocket path therefore
 * cannot use getOutputSnapshot() directly. It may replay only the exact object
 * previously published by the active gate. An older approved sequence remains
 * useful while later private output is suppressed, but geometry must still
 * match so the browser never restores a snapshot for another grid.
 */
export function getReconnectSnapshot() {
  const state = terminalState;
  const gate = resumeGate;
  if (!gate || gate.state !== state || !resumeGateIsCurrent(gate)) {
    const snapshot = getOutputSnapshot();
    return {
      ...snapshot,
      reconnectSafe: snapshot.authoritative || snapshot.fallback,
    };
  }

  const approved = gate.approvedReconnectSnapshot;
  const geometryMatches = Boolean(approved
    && isCurrentState(state)
    && approved.streamId === state.streamId
    && approved.resizeGeneration === state.resizeGeneration
    && approved.cols === state.cols
    && approved.rows === state.rows);
  const selected = geometryMatches ? approved : null;
  return {
    streamId: state?.streamId ?? terminalStreamId,
    // With no approved payload there is no snapshot watermark. Exposing the
    // hidden current outputSeq beside empty data can make legacy consumers skip
    // bytes they never received.
    throughSeq: selected?.throughSeq ?? 0,
    resizeGeneration: state?.resizeGeneration ?? 0,
    cols: state?.cols ?? lastPtyCols,
    rows: state?.rows ?? lastPtyRows,
    recovering: true,
    authoritative: selected?.authoritative === true,
    fallback: selected?.fallback === true,
    reconnectSafe: Boolean(selected),
    data: selected?.data ?? '',
    bytes: selected?.bytes ?? 0,
    truncated: false,
    modelHealthy: Boolean(state && !state.modelError),
  };
}
