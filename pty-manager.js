import { execSync } from 'node:child_process';
import { chmodSync, statSync } from 'node:fs';
import { arch, platform } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BINARY_NAME, resolveNativePath } from './findcx.js';
import { parseCodexInvocation, stripResumeInvocation } from './lib/cli-args.js';
import { TerminalScreenModel } from './lib/terminal-screen-model.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LIVE_FRAME_CHARS = 64 * 1024;
const MAX_SEQUENTIAL_JOBS = 64;
const NO_CONVERSATION_MESSAGE = 'No conversation found';
const RESUME_QUIET_MS = 60;
const RESUME_ABSOLUTE_MS = 5000;

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
let terminalStreamId = 0;
let lifecycleGeneration = 0;
let spawnQueue = Promise.resolve();
let sequentialJobs = [];
let sequentialActive = null;
let _ptyImportForTests = null;

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

function disposeState(state) {
  if (!state || state.disposed) return;
  state.disposed = true;
  if (state.resumeQuietTimer) clearTimeout(state.resumeQuietTimer);
  if (state.resumeAbsoluteTimer) clearTimeout(state.resumeAbsoluteTimer);
  try { state.screenModel?.dispose(); } catch { }
  state.screenModel = null;
}

function beginTerminalStream(recovering = false) {
  cancelSequentialJobs();
  disposeState(terminalState);
  terminalStreamId++;
  const state = {
    streamId: terminalStreamId,
    outputSeq: 0,
    resizeGeneration: 0,
    cols: lastPtyCols,
    rows: lastPtyRows,
    screenModel: new TerminalScreenModel({ cols: lastPtyCols, rows: lastPtyRows }),
    noConversationCarry: '',
    noConversationDetected: false,
    recovering,
    resumeQuietTimer: null,
    resumeAbsoluteTimer: null,
    disposed: false,
  };
  terminalState = state;
  return state;
}

function releaseResumeGate(state, reason = 'resume-ready') {
  if (!isCurrentState(state) || !state.recovering) return false;
  state.recovering = false;
  if (state.resumeQuietTimer) clearTimeout(state.resumeQuietTimer);
  if (state.resumeAbsoluteTimer) clearTimeout(state.resumeAbsoluteTimer);
  state.resumeQuietTimer = null;
  state.resumeAbsoluteTimer = null;
  emitPtyState(reason);
  return true;
}

function noteResumeActivity(state) {
  if (!state.recovering) return;
  if (state.resumeQuietTimer) clearTimeout(state.resumeQuietTimer);
  state.resumeQuietTimer = setTimeout(() => releaseResumeGate(state), RESUME_QUIET_MS);
  state.resumeQuietTimer.unref?.();
}

function startResumeGate(state) {
  if (!state.recovering) return;
  state.resumeAbsoluteTimer = setTimeout(
    () => releaseResumeGate(state, 'resume-timeout'),
    RESUME_ABSOLUTE_MS,
  );
  state.resumeAbsoluteTimer.unref?.();
}

function splitLiveFrames(data) {
  if (data.length <= LIVE_FRAME_CHARS) return [data];
  const frames = [];
  for (let offset = 0; offset < data.length; offset += LIVE_FRAME_CHARS) {
    frames.push(data.slice(offset, offset + LIVE_FRAME_CHARS));
  }
  return frames;
}

function publishLiveFrame(data, meta) {
  for (const cb of dataListeners) {
    try { cb(data, meta); } catch { }
  }
}

function normalizeResumeDiagnosticText(data) {
  return String(data || '')
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\x09\x0a\x20-\x7e]/g, '');
}

function observeResumeFailure(state, data) {
  const value = state.noConversationCarry + normalizeResumeDiagnosticText(data);
  const lines = value.split('\n');
  state.noConversationCarry = lines.pop().slice(-512);
  if (lines.some(line => line.trim() === NO_CONVERSATION_MESSAGE)) {
    state.noConversationDetected = true;
  }
}

function resumeTargetMissing(state) {
  return Boolean(state?.noConversationDetected
    || state?.noConversationCarry?.trim() === NO_CONVERSATION_MESSAGE);
}

function commitTerminalData(state, data) {
  if (!data || !isCurrentState(state)) return;
  observeResumeFailure(state, data);
  for (const frame of splitLiveFrames(data)) {
    const seq = ++state.outputSeq;
    state.screenModel?.enqueue(frame, { seq });
    if (!state.recovering) publishLiveFrame(frame, {
      streamId: state.streamId,
      seq,
    });
  }
  noteResumeActivity(state);
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
    commitTerminalData(state, text);
    if (!isCurrentProcess(proc, state)) return;
    const rawEvent = {
      streamId: state.streamId,
      data: text,
      timestamp: Date.now(),
    };
    for (const cb of rawDataListeners) {
      try { cb(rawEvent); } catch { }
    }
  });
}

export function _setPtyImportForTests(fn) {
  _ptyImportForTests = fn;
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
  terminalStreamId = 0;
  lifecycleGeneration = 0;
  spawnQueue = Promise.resolve();
  cancelSequentialJobs();
  _ptyImportForTests = null;
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
  const resumeInvocation = invocation?.kind === 'resume';
  const state = beginTerminalStream(resumeInvocation);
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
  attachPtyData(proc, state);
  startResumeGate(state);
  emitPtyState('spawn');

  proc.onExit(({ exitCode }) => {
    if (!isCurrentProcess(proc, state)) return;
    const shouldRetryFresh = !noResumeFallback
      && resumeInvocation
      && exitCode !== 0
      && resumeTargetMissing(state);

    lastExitCode = exitCode;
    ptyProcess = null;
    currentWorkspacePath = null;
    cancelSequentialJobs();

    if (shouldRetryFresh) {
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

    if (isCurrentState(state)) {
      emitPtyExit(exitCode, { streamId: state.streamId, reason: 'process-exit' });
    }
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
  releaseResumeGate(terminalState, 'resume-input');
  proc.write(data);
  return true;
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

  try {
    proc.resize(cols, rows);
  } catch {
    return false;
  }
  if (!isCurrentProcess(proc, state)) return false;
  state.cols = cols;
  state.rows = rows;
  state.resizeGeneration++;
  state.screenModel?.resize(cols, rows, state.resizeGeneration);
  emitGeometry(state);
  return true;
}

export function killPty({ invalidatePending = true, reason = 'killed' } = {}) {
  if (invalidatePending) lifecycleGeneration++;
  cancelSequentialJobs();
  const proc = ptyProcess;
  const state = terminalState;
  ptyProcess = null;
  terminalState = null;
  currentWorkspacePath = null;
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
    throughSeq: terminalState?.outputSeq ?? 0,
    recovering: Boolean(terminalState?.recovering),
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

export function getTerminalSync() {
  const state = terminalState;
  return {
    streamId: state?.streamId ?? terminalStreamId,
    throughSeq: state?.outputSeq ?? 0,
    resizeGeneration: state?.resizeGeneration ?? 0,
    cols: state?.cols ?? lastPtyCols,
    rows: state?.rows ?? lastPtyRows,
  };
}

export async function getTerminalScreen() {
  const state = terminalState;
  if (!isCurrentState(state)) return { ...getTerminalSync(), data: '' };
  const snapshot = await state.screenModel.snapshot();
  if (!isCurrentState(state)) throw new Error('terminal stream changed during snapshot');
  return { streamId: state.streamId, ...snapshot };
}
