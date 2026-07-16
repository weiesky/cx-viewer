import { createServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { createConnection } from 'node:net';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { constants as fsConstants, readFileSync, writeFileSync, existsSync, watchFile, unwatchFile, statSync, fstatSync, readdirSync, renameSync, unlinkSync, rmSync, openSync, readSync, closeSync, realpathSync, mkdirSync, createReadStream, cpSync, copyFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, resolve, basename, relative, sep } from 'node:path';
import { homedir, platform, networkInterfaces } from 'node:os';
import { execFile, exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { Worker } from 'node:worker_threads';
import { isPathContained, readFileContent, writeFileContent, resolveFilePath, ERROR_STATUS_MAP } from './lib/file-api.js';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

// execFile with stdin input support (for git check-ignore --stdin)
function execWithStdin(cmd, args, input, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...options, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('error', reject);
    child.on('close', code => {
      // git check-ignore exits 1 when no files are ignored — treat as success
      resolve(stdout);
    });
    if (options?.timeout) {
      setTimeout(() => { try { child.kill(); } catch {} reject(new Error('timeout')); }, options.timeout);
    }
    child.stdin.write(input);
    child.stdin.end();
  });
}
import { LOG_FILE, _initPromise, _resumeState, resolveResumeChoice, _projectName, _logDir, _cachedApiKey, _cachedAuthHeader, initForWorkspace, resetWorkspace, streamingState, resetStreamingState, _loadProxyProfile, PROFILE_PATH, _defaultConfig, appendLogEntry, getLogV2RuntimeStatus } from './interceptor.js';
import { parseOtlpTraces } from './lib/otel-receiver.js';
import { LOG_DIR, setLogDir } from './findcx.js';
import { t, detectLanguage } from './i18n.js';
import { DEFAULT_START_PORT, DEFAULT_MAX_PORT, MAX_POST_BODY as _MAX_POST_BODY, MAX_UPLOAD_SIZE, SSE_HEARTBEAT_MS, HOOK_TIMEOUT_MS, EDITOR_SESSION_CLEANUP_MS, UPLOAD_DIR } from './lib/constants.js';
import { checkAndUpdate } from './lib/updater.js';
import { loadPlugins, runWaterfallHook, runParallelHook, getPluginsInfo, getPluginsDir } from './lib/plugin-loader.js';
import { uploadPlugins, installPluginFromUrl } from './lib/plugin-manager.js';
import { getUserProfile } from './lib/user-profile.js';
import { getGitDiffs } from './lib/git-diff.js';
import { getGitWorkingTreeLineStats } from './lib/git-change-stats.js';
import { parseCodexInvocation } from './lib/cli-args.js';
import { CONTEXT_WINDOW_FILE, buildContextWindowEvent } from './lib/context-watcher.js';
import { CODEX_CONTEXT_WINDOW_TOKENS, sumUsageContextTokens } from './server/lib/context-rules.js';
import { watchLogFile, startWatching, getWatchedFiles, sendEventToClients, sendToClients } from './lib/log-watcher.js';
import { isMainAgentEntry } from './lib/main-agent-entry.js';
import {
  listLocalLogs,
  deleteLogFiles,
  clearRawSidecarsForLog,
  validateLogPath,
} from './lib/log-management.js';
import { countLogEntries, streamRawEntriesAsync, readPagedEntries } from './lib/log-stream.js';
import {
  countV2LogEntries,
  findActiveV2SessionFile,
  isV2SessionFile,
  listV2LocalLogs,
  readV2PagedEntriesAsync,
  readV2WirePageAsync,
  readV2WireSnapshotAsync,
  resolveV2SessionFile,
  streamV2LogEntries,
} from './lib/log-v2/materializer.js';
import {
  createV2SessionEntryStream,
  createV2SessionZip,
  LOG_ARCHIVE_LIMITS,
} from './lib/log-v2/archive-zip.js';
import { listSkills, toggleSkill, deleteSkill, importSkillUpload, imSkillRoots, imSkillImportRoot } from './lib/skills-api.js';
import { readCodexGlobalConfig, updateCodexGlobalConfig } from './lib/codex-config.js';
import {
  CodexMemoryError,
  getCodexMemoryDir,
  isCodexMemoryRequestAllowed,
  readCodexMemoryFile,
  readCodexMemoryOverview,
} from './lib/codex-memory.js';
import { APPROVALS_REVIEWER_DEFAULT, isSupportedApprovalsReviewer, normalizeApprovalsReviewer, shouldDeferPermissionHookToCodex } from './lib/approval-reviewer.js';
import { searchCode } from './lib/code-search.js';
import { searchReplace } from './lib/code-replace.js';
import { OTEL_AUTH_HEADER } from './lib/otel-config.js';
import {
  clearProjectAuthOverride,
  decideAuth,
  enableGlobalAuthAndClearProjectOverride,
  loadAuthConfig,
  loadAuthState,
  isLoopbackHost,
  isSameOriginRequest,
  localeFromAcceptLanguage,
  parseCookies,
  renderLoginPage,
  saveAuthConfig,
} from './lib/auth.js';
import { handleAuthRoute } from './lib/auth-routes.js';
import { readPreferences, updatePreferences } from './lib/preferences.js';
import { resetRawCaptureBoundary } from './lib/appserver-bridge.js';
import {
  buildCodexAutoResolutionAnswers,
  projectCodexAnswersForConversation,
} from './lib/codex-request-user-input.js';
import { serveLogV2Live, serveLogV2Objects, serveLogV2Page, serveLogV2Snapshot } from './server/lib/log-v2-routes.js';
import { openScratchPty, killScratchPty, shutdownScratchPtys } from './scratch-pty-manager.js';


let _codexApprovalsReviewerUpdater = null;
let _runtimeApprovalsReviewer = null;
let _codexNativeReviewerAvailable = false;
let _codexRequestUserInputBridge = null;
const pendingCodexAsks = new Map();
const _logV2ReadMode = getLogV2RuntimeStatus().config.readMode;

function activeV2SessionFile() {
  if (_logV2ReadMode !== 'v2' || !LOG_FILE) return null;
  const runtime = getLogV2RuntimeStatus();
  const canonicalCwd = process.env.CXV_PROJECT_DIR || process.cwd();
  const legacyFile = relative(LOG_DIR, LOG_FILE).split(sep).join('/');
  return findActiveV2SessionFile(LOG_DIR, {
    runtime,
    projectId: _projectName || null,
    canonicalCwd,
    legacyLogFile: legacyFile,
  });
}

function countCurrentLogEntries() {
  const v2File = activeV2SessionFile();
  return v2File ? countV2LogEntries(LOG_DIR, v2File) : countLogEntries(LOG_FILE);
}

function streamCurrentLogEntries(onRawEntry, opts = {}) {
  const v2File = activeV2SessionFile();
  return v2File
    ? streamV2LogEntries(LOG_DIR, v2File, onRawEntry, opts)
    : streamRawEntriesAsync(LOG_FILE, onRawEntry, opts);
}

async function readCurrentPagedEntries(options) {
  const v2File = activeV2SessionFile();
  return v2File
    ? readV2PagedEntriesAsync(LOG_DIR, v2File, options)
    : readPagedEntries(LOG_FILE, options);
}

export function getApprovalsReviewerPreference() {
  const value = readPreferences().approvalsReviewer;
  return isSupportedApprovalsReviewer(value) ? normalizeApprovalsReviewer(value) : null;
}

export function setCodexApprovalsReviewerUpdater(fn) {
  _codexApprovalsReviewerUpdater = typeof fn === 'function' ? fn : null;
  if (_codexApprovalsReviewerUpdater) {
    const saved = getApprovalsReviewerPreference();
    _codexApprovalsReviewerUpdater(saved || APPROVALS_REVIEWER_DEFAULT);
  }
}

export function setActiveCodexApprovalsReviewer(value, nativeAvailable = true) {
  _runtimeApprovalsReviewer = value == null ? null : normalizeApprovalsReviewer(value);
  _codexNativeReviewerAvailable = !!nativeAvailable;
}

function applyRuntimeApprovalsReviewer(value) {
  const reviewer = normalizeApprovalsReviewer(value);
  const result = _codexApprovalsReviewerUpdater?.(reviewer);
  return {
    approvalsReviewer: reviewer,
    appliedToRuntime: !!_codexApprovalsReviewerUpdater,
    appliesOnNextTurn: !!_codexApprovalsReviewerUpdater,
    ...(result && typeof result === 'object' ? result : {}),
  };
}

function broadcastApprovalsReviewer(value) {
  if (!terminalWss) return;
  const payload = JSON.stringify({
    type: 'approval-reviewer-changed',
    approvalsReviewer: normalizeApprovalsReviewer(value),
  });
  terminalWss.clients.forEach((client) => {
    if (client.readyState === 1) try { client.send(payload); } catch {}
  });
}

function openTerminalClients() {
  if (!terminalWss) return [];
  return [...terminalWss.clients].filter(client => client.readyState === 1);
}

function broadcastCodexAskMessage(message, exclude = null) {
  const payload = JSON.stringify(message);
  for (const client of openTerminalClients()) {
    if (client === exclude) continue;
    try { client.send(payload); } catch {}
  }
}

function removePendingCodexAsk(id) {
  const key = String(id);
  const pending = pendingCodexAsks.get(key);
  if (!pending) return null;
  pendingCodexAsks.delete(key);
  if (pending.timer) clearTimeout(pending.timer);
  return pending;
}

/** Claim an app-server request_user_input request only when a GUI is online. */
export function offerCodexRequestUserInput(request) {
  if (!request?.uiId || !Array.isArray(request.questions) || request.questions.length === 0) return false;
  if (!_codexRequestUserInputBridge || openTerminalClients().length === 0) return false;

  const id = String(request.uiId);
  const timeoutMs = Number.isFinite(request.autoResolutionMs) && request.autoResolutionMs > 0
    ? request.autoResolutionMs
    : null;
  const pending = {
    id,
    questions: request.questions,
    threadId: request.threadId || null,
    turnId: request.turnId || null,
    itemId: request.itemId || null,
    createdAt: request.createdAt || Date.now(),
    timeoutMs,
    timer: null,
  };
  if (timeoutMs) {
    pending.timer = setTimeout(() => {
      const current = pendingCodexAsks.get(id);
      if (!current) return;
      const codexAnswers = buildCodexAutoResolutionAnswers(current.questions);
      const answers = projectCodexAnswersForConversation(current.questions, codexAnswers);
      const resolved = _codexRequestUserInputBridge?.resolve(id, codexAnswers);
      if (!resolved) return;
      removePendingCodexAsk(id);
      broadcastCodexAskMessage({
        type: 'ask-hook-timeout',
        id,
        itemId: current.itemId,
        questions: current.questions,
        answers,
        codexAnswers,
      });
    }, timeoutMs);
    pending.timer.unref?.();
  }
  pendingCodexAsks.set(id, pending);
  broadcastCodexAskMessage({
    type: 'ask-hook-pending',
    source: 'codex-app-server',
    id,
    questions: pending.questions,
    threadId: pending.threadId,
    turnId: pending.turnId,
    itemId: pending.itemId,
    startedAt: pending.createdAt,
    timeoutMs,
  });
  return true;
}

/** App-server cleared a request because the turn ended/interrupted elsewhere. */
export function clearCodexRequestUserInput(request) {
  const id = request?.uiId != null ? String(request.uiId) : '';
  if (!id || !removePendingCodexAsk(id)) return false;
  broadcastCodexAskMessage({
    type: 'ask-hook-resolved',
    id,
    reason: request.reason || 'server-resolved',
  });
  return true;
}

export function setCodexRequestUserInputBridge(bridge) {
  _codexRequestUserInputBridge = bridge && typeof bridge === 'object'
    ? {
        resolve: typeof bridge.resolve === 'function' ? bridge.resolve : null,
        cancel: typeof bridge.cancel === 'function' ? bridge.cancel : null,
        releaseToTui: typeof bridge.releaseToTui === 'function' ? bridge.releaseToTui : null,
      }
    : null;
}

function releaseCodexAsksToTuiWhenGuiDisconnects() {
  if (openTerminalClients().length > 0 || !_codexRequestUserInputBridge?.releaseToTui) return;
  for (const id of [...pendingCodexAsks.keys()]) {
    if (_codexRequestUserInputBridge.releaseToTui(id)) removePendingCodexAsk(id);
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

let activeLogArchiveJobs = 0;
function acquireLogArchiveJob() {
  if (activeLogArchiveJobs >= 1) {
    throw Object.assign(new Error('Another log archive operation is already running'), {
      status: 429,
      code: 'CXV_LOG_ARCHIVE_BUSY',
    });
  }
  activeLogArchiveJobs++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLogArchiveJobs--;
  };
}

function writeResponseChunk(res, chunk) {
  if (res.destroyed) return Promise.reject(new Error('Response closed'));
  if (res.write(chunk)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      res.off('drain', onDrain);
      res.off('close', onClose);
      res.off('error', onError);
    };
    const onDrain = () => { cleanup(); resolve(); };
    const onClose = () => { cleanup(); reject(new Error('Response closed')); };
    const onError = (error) => { cleanup(); reject(error); };
    res.once('drain', onDrain);
    res.once('close', onClose);
    res.once('error', onError);
  });
}

function sendApiError(res, err, fallback = 'Request failed') {
  const status = Number.isInteger(err?.status) ? err.status : 500;
  sendJson(res, status, {
    ok: false,
    error: err?.message || fallback,
    ...(err?.code ? { code: err.code } : {}),
  });
}

function readJsonBody(req, maxSize = MAX_POST_BODY) {
  return new Promise((resolve, reject) => {
    let body = '';
    let done = false;
    const fail = (err) => {
      if (done) return;
      done = true;
      reject(err);
    };
    req.on('data', chunk => {
      body += chunk;
      if (body.length > maxSize) {
        fail(Object.assign(new Error('Request body too large'), { status: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); }
    });
    req.on('error', err => fail(err));
  });
}

function runRawSidecarWorker(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./server/raw-sidecar-worker.js', import.meta.url), { workerData });
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(result);
    };
    const timer = setTimeout(() => {
      worker.terminate().catch(() => {});
      finish(Object.assign(new Error('Raw sidecar scan timed out'), { status: 408 }));
    }, 15_000);
    timer.unref?.();
    worker.once('message', message => {
      if (message?.ok) finish(null, message.result);
      else finish(Object.assign(new Error(message?.error || 'Raw sidecar request failed'), {
        code: message?.code || undefined,
        status: message?.status || undefined,
      }));
    });
    worker.once('error', error => finish(error));
    worker.once('exit', code => {
      if (code !== 0) finish(new Error(`Raw sidecar worker exited with code ${code}`));
    });
  });
}

function multipartBoundary(contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  return match ? (match[1] || match[2] || '').trim() : '';
}

function readMultipartUpload(req, maxSize = MAX_UPLOAD_SIZE) {
  const boundary = multipartBoundary(req.headers['content-type'] || '');
  if (!boundary) throw Object.assign(new Error('Missing boundary'), { status: 400 });
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > maxSize) throw Object.assign(new Error('File too large'), { status: 413 });

  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;
    let done = false;
    const fail = (err) => {
      if (done) return;
      done = true;
      reject(err);
    };
    req.on('data', chunk => {
      totalSize += chunk.length;
      if (totalSize > maxSize) {
        fail(Object.assign(new Error('File too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      try {
        const buf = Buffer.concat(chunks);
        const headerEnd = buf.indexOf('\r\n\r\n');
        if (headerEnd === -1) throw Object.assign(new Error('Malformed multipart'), { status: 400 });
        const headerStr = buf.slice(0, headerEnd).toString();
        const nameMatch = headerStr.match(/filename="([^"]+)"/);
        if (!nameMatch) throw Object.assign(new Error('No file'), { status: 400 });
        const filename = nameMatch[1].replace(/[/\\]/g, '_');
        const bodyStart = headerEnd + 4;
        const closingBoundary = Buffer.from('\r\n--' + boundary);
        const bodyEnd = buf.indexOf(closingBoundary, bodyStart);
        if (bodyEnd === -1) throw Object.assign(new Error('Malformed multipart'), { status: 400 });
        const data = buf.slice(bodyStart, bodyEnd);
        resolve({ filename, data });
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', err => fail(err));
  });
}

function encodeStableId(value) {
  return Buffer.from(String(value), 'utf8').toString('base64url');
}

function currentProjectDir() {
  return process.env.CXV_PROJECT_DIR || process.cwd();
}

const SEARCH_ENGINES = new Set(['auto', 'ripgrep', 'node']);
const SEARCH_REPLACE_SCOPES = new Set(['all', 'file', 'match']);

function normalizeSearchGlobs(value) {
  return (Array.isArray(value)
    ? value.map((item) => String(item).trim())
    : String(value || '').split(',').map((item) => item.trim()))
    .filter((item) => item && item.length <= 200)
    .slice(0, 20);
}

async function handleCodeSearch(req, res) {
  const parsed = await readJsonBody(req);
  const query = typeof parsed.query === 'string' ? parsed.query : '';
  if (!query) {
    sendJson(res, 200, { results: [], truncated: false, engine: 'none', filesScanned: 0 });
    return;
  }

  const abortController = new AbortController();
  const onClose = () => {
    if (!res.writableFinished) abortController.abort();
  };
  res.on('close', onClose);
  try {
    const result = await searchCode({
      query,
      root: currentProjectDir(),
      caseSensitive: !!parsed.caseSensitive,
      wholeWord: !!parsed.wholeWord,
      regex: !!parsed.regex,
      includeGlobs: normalizeSearchGlobs(parsed.includeGlobs),
      excludeGlobs: normalizeSearchGlobs(parsed.excludeGlobs),
      engine: SEARCH_ENGINES.has(parsed.engine) ? parsed.engine : 'auto',
      signal: abortController.signal,
    });
    if (res.writableEnded || abortController.signal.aborted) return;
    sendJson(res, result.error === 'invalid_regex' ? 400 : 200, result);
  } catch (error) {
    if (res.writableEnded || abortController.signal.aborted) return;
    sendJson(res, 500, { error: 'search_failed' });
  } finally {
    res.off('close', onClose);
  }
}

async function handleCodeSearchReplace(req, res) {
  const parsed = await readJsonBody(req);
  const query = typeof parsed.query === 'string' ? parsed.query : '';
  const scope = SEARCH_REPLACE_SCOPES.has(parsed.scope) ? parsed.scope : null;
  if (!query || !scope || typeof parsed.replacement !== 'string') {
    sendJson(res, 400, { error: 'Invalid request' });
    return;
  }

  const result = await searchReplace({
    query,
    root: currentProjectDir(),
    caseSensitive: !!parsed.caseSensitive,
    wholeWord: !!parsed.wholeWord,
    regex: !!parsed.regex,
    includeGlobs: normalizeSearchGlobs(parsed.includeGlobs),
    excludeGlobs: normalizeSearchGlobs(parsed.excludeGlobs),
    replacement: parsed.replacement,
    scope,
    file: typeof parsed.file === 'string' ? parsed.file : undefined,
    line: Number.isInteger(parsed.line) ? parsed.line : undefined,
    col: Number.isInteger(parsed.col) ? parsed.col : undefined,
    expectText: typeof parsed.expectText === 'string' ? parsed.expectText : undefined,
    skipPaths: Array.isArray(parsed.skipPaths) ? parsed.skipPaths.map(String) : [],
    dryRun: !!parsed.dryRun,
  });
  sendJson(res, result.error === 'invalid_regex' ? 400 : 200, result);
}

function displayTail(filePath) {
  const home = homedir();
  return filePath.startsWith(home) ? `~${filePath.slice(home.length)}` : filePath;
}

function discoverCodexMdEntries() {
  const entries = [];
  const seen = new Set();
  const add = (filePath, scope) => {
    try {
      const real = realpathSync(filePath);
      if (seen.has(real) || !existsSync(real) || !statSync(real).isFile()) return;
      seen.add(real);
      entries.push({
        id: encodeStableId(real),
        scope,
        path: real,
        tail: displayTail(real),
      });
    } catch {}
  };

  let dir = resolve(currentProjectDir());
  while (dir && dir !== dirname(dir)) {
    add(join(dir, 'AGENTS.md'), 'project');
    dir = dirname(dir);
  }
  add(join(homedir(), '.codex', 'AGENTS.md'), 'global');
  return entries;
}

function normalizePluginFilename(name) {
  return String(name || '').replace(/.*[/\\]/, '');
}
function removeDisabledPluginNames(names) {
  const targetNames = Array.from(new Set((names || []).filter(Boolean)));
  if (targetNames.length === 0) return false;
  let changed = false;
  updatePreferences(prefs => {
    const disabledPlugins = Array.isArray(prefs.disabledPlugins) ? prefs.disabledPlugins : [];
    const next = disabledPlugins.filter(name => !targetNames.includes(name));
    changed = next.length !== disabledPlugins.length;
    if (changed) prefs.disabledPlugins = next;
    return prefs;
  });
  return changed;
}

const isCliMode = process.env.CXV_CLI_MODE === '1';
const isSdkMode = process.env.CXV_SDK_MODE === '1';
const isWorkspaceMode = process.env.CXV_WORKSPACE_MODE === '1';
const _defaultProxyProfiles = { active: 'max', profiles: [{ id: 'max', name: 'Default' }] };
const _maskApiKey = (k) => k && typeof k === 'string' && k.length > 4 ? '****' + k.slice(-4) : k ? '****' : '';
const _maskProfiles = (data) => {
  if (!data?.profiles) return data;
  return { ...data, profiles: data.profiles.map(p => p.apiKey ? { ...p, apiKey: _maskApiKey(p.apiKey) } : p) };
};
const _isMasked = (k) => typeof k === 'string' && /^\*{4}.{0,4}$/.test(k);

// 统一的文件/目录忽略规则（仅隐藏系统和版本控制目录）
const IGNORED_PATTERNS = new Set([
  '.git', '.svn', '.hg', '.DS_Store',
  '.idea', '.vscode'
]);

// 工作区模式：保存 Codex 额外参数，供 launch API 使用
let _workspaceCodexArgs = [];
let _workspaceCodexPath = null;
let _workspaceIsNpmVersion = false;
let _workspaceLaunched = false; // 工作区是否已经启动了会话

// Ask hook bridge state (for request_user_input hook)
// At most one pending request at a time (Codex Code is single-threaded)
let pendingAskHook = null; // { questions, res, timer, createdAt }

// Permission hook bridge state (for Codex PermissionRequest approval)
const pendingPermHooks = new Map(); // id -> { toolName, input, res, timer, createdAt }

// Editor session state (for $EDITOR intercept)
const editorSessions = new Map(); // sessionId → { filePath, done, createdAt }
// Periodically clean up abandoned editor sessions (older than 1 hour)
const _editorCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, session] of editorSessions) {
    if (now - (session.createdAt || 0) > EDITOR_SESSION_CLEANUP_MS) editorSessions.delete(id);
  }
}, 60000);
_editorCleanupTimer.unref(); // Don't keep process alive for cleanup
let terminalWss = null; // WebSocketServer reference for broadcasting
let scratchTerminalWss = null;
let _writeToPty = null; // PTY write function reference (set by setupTerminalWebSocket)
let _onPtyData = null;  // PTY data listener registration (set by setupTerminalWebSocket)
export function setWorkspaceCodexArgs(args) {
  _workspaceCodexArgs = args;
}
export function setWorkspaceCodexPath(path, isNpm) {
  _workspaceCodexPath = path;
  _workspaceIsNpmVersion = isNpm;
}
let _launchCallback = null;
export function setLaunchCallback(fn) { _launchCallback = fn; }
export function setWorkspaceLaunched(v) { _workspaceLaunched = v; }
export function initPostLaunch() {
  watchLogFile(_logWatcherOpts(LOG_FILE));
  if (!statsWorker) startStatsWorker();
  startStreamingStatusTimer();
}

// Global POST body size limit
const MAX_POST_BODY = _MAX_POST_BODY;



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const START_PORT = parseInt(process.env.CXV_START_PORT) || DEFAULT_START_PORT;
const MAX_PORT = parseInt(process.env.CXV_MAX_PORT) || DEFAULT_MAX_PORT;
const HOST = '0.0.0.0';

// 局域网访问 token（本地 127.0.0.1 免验证）
const ACCESS_TOKEN = randomBytes(16).toString('hex');
// OTLP is a log-writing endpoint, so it must remain authenticated even on
// loopback. The token is injected only into Codex child processes.
const OTEL_ACCESS_TOKEN = randomBytes(32).toString('hex');

let authProject = process.env.CXV_PROJECT_DIR || null;
let authLogDir = LOG_DIR;
let authConfig = loadAuthConfig(authProject);
let authSessionGeneration = 0;
const AUTH_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const AUTH_SESSION_MAX = 2048;
const authSessions = new Map();

function invalidateAuthSessions() {
  authSessionGeneration++;
  authSessions.clear();
}

function syncAuthProject() {
  const nextProject = process.env.CXV_PROJECT_DIR || null;
  const nextLogDir = LOG_DIR;
  if (nextProject !== authProject || nextLogDir !== authLogDir) {
    authProject = nextProject;
    authLogDir = nextLogDir;
    authConfig = loadAuthConfig(authProject);
    invalidateAuthSessions();
  }
  return authProject;
}

function getAuthConfig() {
  syncAuthProject();
  // Another viewer process may update the shared preferences file. Reload on
  // every auth decision so an old password cannot remain valid in this process.
  authConfig = loadAuthConfig(authProject);
  return authConfig;
}

function getAuthState() {
  return loadAuthState(syncAuthProject());
}

function getAuthSessionContext() {
  const state = getAuthState();
  const context = [
    authLogDir,
    authProject || '',
    state.scope,
    state.effective.revision,
    state.effective.enabled ? '1' : '0',
    authSessionGeneration,
  ].join('\0');
  return createHmac('sha256', ACCESS_TOKEN).update(context).digest('base64url');
}

function pruneAuthSessions(now = Date.now()) {
  for (const [token, session] of authSessions) {
    if (session.expiresAt <= now || session.generation !== authSessionGeneration) authSessions.delete(token);
  }
  while (authSessions.size >= AUTH_SESSION_MAX) authSessions.delete(authSessions.keys().next().value);
}

function issueAuthSessionToken() {
  const now = Date.now();
  pruneAuthSessions(now);
  const token = randomBytes(32).toString('base64url');
  authSessions.set(token, {
    context: getAuthSessionContext(),
    generation: authSessionGeneration,
    expiresAt: now + AUTH_SESSION_TTL_MS,
  });
  return token;
}

function isAuthSessionValid(token) {
  if (typeof token !== 'string' || !token) return false;
  const session = authSessions.get(token);
  if (!session || session.expiresAt <= Date.now() || session.generation !== authSessionGeneration
      || !timingSafeEqual(Buffer.from(session.context), Buffer.from(getAuthSessionContext()))) {
    authSessions.delete(token);
    return false;
  }
  return true;
}

function revokeAuthSession(cookieHeader) {
  const token = parseCookies(cookieHeader).cxv_auth;
  if (token) authSessions.delete(token);
}

function setAuthConfig(config, scope) {
  const projectDir = syncAuthProject();
  saveAuthConfig(config, {
    scope: scope === 'global' ? 'global' : (projectDir ? 'project' : 'global'),
    projectDir,
  });
  authConfig = loadAuthConfig(projectDir);
  invalidateAuthSessions();
  return authConfig;
}

function clearAuthOverride() {
  const projectDir = syncAuthProject();
  clearProjectAuthOverride(projectDir);
  authConfig = loadAuthConfig(projectDir);
  invalidateAuthSessions();
  return authConfig;
}

function enableGlobalAndInherit() {
  const projectDir = syncAuthProject();
  enableGlobalAuthAndClearProjectOverride(projectDir);
  authConfig = loadAuthConfig(projectDir);
  invalidateAuthSessions();
  return authConfig;
}

export const OTEL_PAYLOAD_LIMITS = Object.freeze({
  bodyBytes: MAX_POST_BODY,
  maxDepth: 32,
  maxNodes: 100_000,
  maxStringChars: 2 * 1024 * 1024,
  maxTotalStringChars: 8 * 1024 * 1024,
  maxResourceSpans: 64,
  maxScopeSpans: 256,
  maxSpans: 4096,
  maxEvents: 16_384,
  maxAttributes: 65_536,
});

function safeTokenEquals(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string') return false;
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function authorizeOtelRequest(req) {
  const value = req.headers[OTEL_AUTH_HEADER];
  return !Array.isArray(value) && safeTokenEquals(value, OTEL_ACCESS_TOKEN);
}

function rejectUnauthorizedOtelRequest(req, res) {
  // Never leave an untrusted request body attached to a reusable socket.
  // Resume without buffering and close after the small error response.
  req.resume();
  res.setHeader('Connection', 'close');
  sendJson(res, 403, { error: 'Forbidden', code: 'otel_access_forbidden' });
}

function otelLimitError(message) {
  return Object.assign(new Error(message), { status: 413, code: 'otel_payload_too_large' });
}

function createOtelJsonBudgetScanner(limits) {
  let depth = 0;
  let nodes = 1;
  let inString = false;
  let escaped = false;
  let stringBytes = 0;
  let totalStringBytes = 0;
  return {
    scan(chunk) {
      for (const byte of chunk) {
        if (inString) {
          if (escaped) {
            escaped = false;
            stringBytes++;
          } else if (byte === 0x5c) {
            escaped = true;
            stringBytes++;
          } else if (byte === 0x22) {
            inString = false;
            totalStringBytes += stringBytes;
            if (totalStringBytes > limits.maxTotalStringChars) {
              throw otelLimitError('OTLP total string budget exceeded');
            }
          } else {
            stringBytes++;
            if (stringBytes > limits.maxStringChars) {
              throw otelLimitError('OTLP string budget exceeded');
            }
          }
          continue;
        }
        if (byte === 0x22) {
          inString = true;
          escaped = false;
          stringBytes = 0;
        } else if (byte === 0x5b || byte === 0x7b) {
          depth++;
          nodes++;
          if (depth > limits.maxDepth) throw otelLimitError('OTLP JSON depth budget exceeded');
          if (nodes > limits.maxNodes) throw otelLimitError('OTLP JSON node budget exceeded');
        } else if (byte === 0x5d || byte === 0x7d) {
          depth--;
        } else if (byte === 0x2c || byte === 0x3a) {
          nodes++;
          if (nodes > limits.maxNodes) throw otelLimitError('OTLP JSON node budget exceeded');
        }
      }
    },
  };
}

/** Preflight JSON complexity before V8 allocates the parsed object graph. */
export function validateOtlpJsonTextBudget(value, limits = OTEL_PAYLOAD_LIMITS) {
  const scanner = createOtelJsonBudgetScanner(limits);
  scanner.scan(Buffer.from(String(value || ''), 'utf8'));
  return true;
}

/** Validate both generic JSON complexity and OTLP-specific collection budgets. */
export function validateOtlpTracePayload(payload, limits = OTEL_PAYLOAD_LIMITS) {
  let nodes = 0;
  let totalStringChars = 0;
  const stack = [{ value: payload, depth: 0 }];
  while (stack.length > 0) {
    const { value, depth } = stack.pop();
    if (++nodes > limits.maxNodes) throw otelLimitError('OTLP JSON node budget exceeded');
    if (depth > limits.maxDepth) throw otelLimitError('OTLP JSON depth budget exceeded');
    if (typeof value === 'string') {
      if (value.length > limits.maxStringChars) throw otelLimitError('OTLP string budget exceeded');
      totalStringChars += value.length;
      if (totalStringChars > limits.maxTotalStringChars) throw otelLimitError('OTLP total string budget exceeded');
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) stack.push({ value: value[i], depth: depth + 1 });
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (key.length > limits.maxStringChars) throw otelLimitError('OTLP string budget exceeded');
        totalStringChars += key.length;
        if (totalStringChars > limits.maxTotalStringChars) throw otelLimitError('OTLP total string budget exceeded');
        stack.push({ value: child, depth: depth + 1 });
      }
    }
  }

  const resourceSpans = Array.isArray(payload?.resourceSpans) ? payload.resourceSpans : [];
  if (resourceSpans.length > limits.maxResourceSpans) throw otelLimitError('OTLP resource span budget exceeded');
  let scopeCount = 0;
  let spanCount = 0;
  let eventCount = 0;
  let attributeCount = 0;
  const addAttributes = (attrs) => {
    if (!Array.isArray(attrs)) return;
    attributeCount += attrs.length;
    if (attributeCount > limits.maxAttributes) throw otelLimitError('OTLP attribute budget exceeded');
  };
  for (const resource of resourceSpans) {
    addAttributes(resource?.resource?.attributes);
    const scopes = Array.isArray(resource?.scopeSpans) ? resource.scopeSpans : [];
    scopeCount += scopes.length;
    if (scopeCount > limits.maxScopeSpans) throw otelLimitError('OTLP scope span budget exceeded');
    for (const scope of scopes) {
      addAttributes(scope?.scope?.attributes);
      const spans = Array.isArray(scope?.spans) ? scope.spans : [];
      spanCount += spans.length;
      if (spanCount > limits.maxSpans) throw otelLimitError('OTLP span budget exceeded');
      for (const span of spans) {
        addAttributes(span?.attributes);
        const events = Array.isArray(span?.events) ? span.events : [];
        eventCount += events.length;
        if (eventCount > limits.maxEvents) throw otelLimitError('OTLP event budget exceeded');
        for (const event of events) addAttributes(event?.attributes);
        const links = Array.isArray(span?.links) ? span.links : [];
        for (const link of links) addAttributes(link?.attributes);
      }
    }
  }
  return payload;
}

function readOtelBody(req, maxSize = OTEL_PAYLOAD_LIMITS.bodyBytes, parseJson = false) {
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > maxSize) {
    req.resume();
    return Promise.reject(otelLimitError('OTLP request body too large'));
  }
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    const jsonBudgetScanner = parseJson ? createOtelJsonBudgetScanner(OTEL_PAYLOAD_LIMITS) : null;
    let total = 0;
    let done = false;
    const finishError = (error) => {
      if (done) return;
      done = true;
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      req.removeListener('error', onError);
      req.resume();
      rejectBody(error);
    };
    const onData = (chunk) => {
      total += chunk.length;
      if (total > maxSize) {
        chunks.length = 0;
        finishError(otelLimitError('OTLP request body too large'));
        return;
      }
      if (parseJson) {
        try {
          jsonBudgetScanner.scan(chunk);
        } catch (error) {
          chunks.length = 0;
          finishError(error);
          return;
        }
        chunks.push(chunk);
      }
    };
    const onEnd = () => {
      if (done) return;
      done = true;
      if (!parseJson) {
        resolveBody(undefined);
        return;
      }
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks, total).toString('utf8')));
      } catch {
        rejectBody(Object.assign(new Error('Invalid OTLP JSON'), { status: 400, code: 'invalid_otel_json' }));
      }
    };
    const onError = (error) => finishError(error);
    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
  });
}

function readOtelJsonBody(req, maxSize = OTEL_PAYLOAD_LIMITS.bodyBytes) {
  return readOtelBody(req, maxSize, true);
}

let clients = [];
let server;
let actualPort = 0;
let serverProtocol = 'http';
let pluginRoutes = [];
// Stats Worker 实例
let statsWorker = null;

function registerPluginRoute(method, path, handler) {
  const normalizedMethod = String(method || 'GET').toUpperCase();
  const normalizedPath = String(path || '').trim();
  if (!normalizedPath.startsWith('/')) {
    throw new Error('Plugin route path must start with "/"');
  }
  if (typeof handler !== 'function') {
    throw new Error('Plugin route handler must be a function');
  }
  const nextRoute = { method: normalizedMethod, path: normalizedPath, handler };
  const idx = pluginRoutes.findIndex(route => route.method === normalizedMethod && route.path === normalizedPath);
  if (idx >= 0) pluginRoutes[idx] = nextRoute;
  else pluginRoutes.push(nextRoute);
}

async function refreshPluginRuntime() {
  pluginRoutes = [];
  if (!server || !actualPort) return;
  await runParallelHook('serverStarted', {
    port: actualPort,
    host: HOST,
    url: `${serverProtocol}://127.0.0.1:${actualPort}`,
    ip: getLocalIp(),
    token: ACCESS_TOKEN,
    protocol: serverProtocol,
    httpServer: server,
    registerRoute: registerPluginRoute,
  });
}

function getPublicAccessUrl(ip = getLocalIp()) {
  return `${serverProtocol}://${ip}:${actualPort}?token=${ACCESS_TOKEN}`;
}

function startStatsWorker() {
  try {
    statsWorker = new Worker(new URL('./lib/stats-worker.js', import.meta.url));
    statsWorker.on('error', (err) => {
      console.error('[CX Viewer] Stats worker error:', err.message);
      statsWorker = null;
    });
    statsWorker.on('exit', (code) => {
      if (code !== 0) {
        console.error('[CX Viewer] Stats worker exited with code', code);
      }
      statsWorker = null;
    });
    // 初始化：全量扫描当前项目
    if (_projectName && _logDir) {
      statsWorker.postMessage({ type: 'init', logDir: LOG_DIR, projectName: _projectName });
    }
  } catch (err) {
    console.error('[CX Viewer] Failed to start stats worker:', err.message);
  }
}

function notifyStatsWorker(logFile) {
  if (statsWorker && _projectName) {
    statsWorker.postMessage({ type: 'update', logDir: LOG_DIR, projectName: _projectName, logFile });
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Helper to build log-watcher options object
function _logWatcherOpts(logFile) {
  return {
    logFile: logFile || LOG_FILE,
    clients,
    runParallelHook,
    notifyStatsWorker,
    getLogFile: () => LOG_FILE,
  };
}

function getLocalIp() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

function getAllLocalIps() {
  const ips = [];
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

// Codex memories are global, cross-project user data. Unlike ordinary viewer
// telemetry APIs, do not expose them to arbitrary browser origins merely
// because the TCP peer is loopback (DNS rebinding can also reach loopback).
function authorizeCodexMemoryRequest(req, res, parsedUrl) {
  const allowed = isCodexMemoryRequestAllowed({
    host: req.headers.host || '',
    origin: req.headers.origin || '',
    token: parsedUrl.searchParams.get('token'),
    expectedToken: ACCESS_TOKEN,
    localIps: getAllLocalIps(),
  });
  if (!allowed) {
    sendJson(res, 403, { error: 'Forbidden', code: 'memory_access_forbidden' });
    return false;
  }
  if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  else res.removeHeader('Access-Control-Allow-Origin');
  return true;
}

function sendCodexMemoryError(res, err) {
  if (err instanceof CodexMemoryError) {
    sendJson(res, err.status, { error: err.code, code: err.code });
    return;
  }
  console.error('[CX Viewer] Codex memory error:', err?.message || err);
  sendJson(res, 500, { error: 'memory_error', code: 'memory_error' });
}

async function handleRequest(req, res) {
  const parsedUrl = new URL(req.url, `${serverProtocol}://${req.headers.host}`);
  const url = parsedUrl.pathname;
  const method = req.method;

  // Optional diagnostics only; never create an unbounded shared /tmp log by default.
  if (process.env.CXV_DEBUG && url.startsWith('/v1/')) {
    try { appendFileSync('/tmp/cxv-otel.log', `${new Date().toISOString()} ${method} ${url} ct=${req.headers['content-type']||'-'}\n`); } catch {}
  }

  // WebSocket 路径不处理，交给 upgrade 事件
  if (url === '/ws/terminal') {
    return;
  }

  const requestOrigin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  const requestHost = typeof req.headers.host === 'string' ? req.headers.host : '';
  const originAllowed = isSameOriginRequest(requestOrigin, requestHost, serverProtocol);

  // Browser API access is same-origin. Header-less CLI/native clients remain
  // compatible; a hostile Origin never gains CORS permission to localhost.
  if (requestOrigin && originAllowed) res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(originAllowed ? 200 : 403);
    res.end();
    return;
  }
  if (requestOrigin && !originAllowed) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden: cross-origin request' }));
    return;
  }

  // 局域网访问验证：本机、分享 token、密码登录 Cookie 三种方式均可放行。
  const remoteIp = req.socket.remoteAddress;
  const isLoopbackPeer = remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp === '::ffff:127.0.0.1';
  const isLocal = isLoopbackPeer && isLoopbackHost(requestHost) && originAllowed;
  const isStaticAsset = url.startsWith('/assets/') || url === '/favicon.ico';
  const currentAuthConfig = getAuthConfig();
  const remotePasswordLogin = serverProtocol === 'https';
  const cookieToken = parseCookies(req.headers.cookie).cxv_auth;
  const authDecision = decideAuth({
    isStaticAsset,
    pathname: url,
    isLocal,
    urlToken: parsedUrl.searchParams.get('token'),
    cookieToken,
    accessToken: ACCESS_TOKEN,
    sessionToken: isAuthSessionValid(cookieToken) ? cookieToken : '',
    enabled: currentAuthConfig.enabled,
    password: currentAuthConfig.password,
    wantsHtml: method === 'GET' && ((req.headers.accept || '').includes('text/html') || url === '/'),
    passwordLoginAvailable: isLocal || remotePasswordLogin,
  });
  if (authDecision.action === 'login-page') {
    const lang = localeFromAcceptLanguage(req.headers['accept-language']);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(renderLoginPage({ lang }));
    return;
  }
  if (authDecision.action === 'unauthorized') {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }
  if (authDecision.action === 'forbidden') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden: invalid token' }));
    return;
  }
  if (authDecision.action === 'insecure-password') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Secure transport required for password login', code: 'secure_transport_required' }));
    return;
  }

  if (await handleAuthRoute(req, res, {
    pathname: url,
    method,
    isLocal,
    deps: {
      getSessionToken: issueAuthSessionToken,
      revokeSession: revokeAuthSession,
      authBodyLimit: 4096,
      secureCookies: serverProtocol === 'https',
      remotePasswordLogin,
      getAuthConfig,
      getAuthState,
      setAuthConfig,
      clearAuthOverride,
      enableGlobalAndInherit,
    },
  })) return;

  const pluginRoute = pluginRoutes.find(route => route.method === method && route.path === url);
  if (pluginRoute) {
    try {
      await pluginRoute.handler(req, res, parsedUrl);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      } else {
        try { res.end(); } catch {}
      }
    }
    return;
  }

  if (url === '/api/search' && method === 'POST') {
    try {
      await handleCodeSearch(req, res);
    } catch (error) {
      if (!res.writableEnded) sendApiError(res, error, 'Search failed');
    }
    return;
  }

  if (url === '/api/search-replace' && method === 'POST') {
    try {
      await handleCodeSearchReplace(req, res);
    } catch (error) {
      if (!res.writableEnded) sendApiError(res, error, 'Replace failed');
    }
    return;
  }

  // OTLP HTTP 接收端点 — 接收 Codex 原生 OTel trace 数据
  if (url === '/v1/traces' && method === 'POST') {
    if (!authorizeOtelRequest(req)) {
      rejectUnauthorizedOtelRequest(req, res);
      return;
    }
    try {
      const otlpData = validateOtlpTracePayload(await readOtelJsonBody(req));
      const entries = parseOtlpTraces(otlpData);
      if (entries.length > 0 && LOG_FILE) {
        for (const entry of entries.flat().filter(Boolean)) appendLogEntry(entry, {
          source: 'otel',
          cwd: process.env.CXV_PROJECT_DIR || process.cwd(),
          projectId: entry.project,
          sessionId: entry._otelSessionId || null,
          threadId: entry._otelTraceId || null,
        });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 400;
      // Do not keep a connection alive after rejecting an oversized declared
      // body: the HTTP parser may still be waiting for bytes the client never
      // intends to send, which can poison the next request on that socket.
      if (status === 413) res.setHeader('Connection', 'close');
      sendJson(res, status, {
        error: error?.message || 'Invalid OTLP payload',
        code: error?.code || 'invalid_otel_payload',
      });
    }
    return;
  }

  // OTLP logs/metrics endpoints (Codex may also send these)
  if ((url === '/v1/logs' || url === '/v1/metrics') && method === 'POST') {
    if (!authorizeOtelRequest(req)) {
      rejectUnauthorizedOtelRequest(req, res);
      return;
    }
    try {
      await readOtelBody(req);
      if (process.env.CXV_DEBUG) {
        console.error(`[OTel] Received ${method} ${url} (${req.headers['content-type'] || 'no-ct'})`);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 400;
      if (status === 413) res.setHeader('Connection', 'close');
      sendJson(res, status, {
        error: error?.message || 'Invalid OTLP payload',
        code: error?.code || 'invalid_otel_payload',
      });
    }
    return;
  }

  // User preferences API
  // File upload API — save to /tmp/cx-viewer-uploads/
  if (url === '/api/upload' && method === 'POST') {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing boundary' }));
      return;
    }
    const MAX_UPLOAD = MAX_UPLOAD_SIZE;
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > MAX_UPLOAD) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File too large (max 100MB)' }));
      return;
    }
    const boundary = boundaryMatch[1];
    const chunks = [];
    let totalSize = 0;
    let aborted = false;
    req.on('data', chunk => {
      totalSize += chunk.length;
      if (totalSize > MAX_UPLOAD) {
        aborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File too large (max 50MB)' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (aborted) return;
      try {
        const buf = Buffer.concat(chunks);
        // Find the first part's headers and body
        const headerEnd = buf.indexOf('\r\n\r\n');
        if (headerEnd === -1) throw new Error('Malformed multipart');
        const headerStr = buf.slice(0, headerEnd).toString();
        const nameMatch = headerStr.match(/filename="([^"]+)"/);
        if (!nameMatch) throw new Error('No filename');
        const originalName = nameMatch[1].replace(/[/\\]/g, '_'); // sanitize
        const bodyStart = headerEnd + 4;
        // Find the closing boundary
        const closingBoundary = Buffer.from('\r\n--' + boundary);
        const bodyEnd = buf.indexOf(closingBoundary, bodyStart);
        const fileData = bodyEnd !== -1 ? buf.slice(bodyStart, bodyEnd) : buf.slice(bodyStart);
        const uploadDir = UPLOAD_DIR;
        mkdirSync(uploadDir, { recursive: true });
        // Unique filename: prepend timestamp to avoid silent overwrite
        const ts = Date.now();
        const dotIdx = originalName.lastIndexOf('.');
        const uniqueName = dotIdx > 0
          ? `${originalName.slice(0, dotIdx)}-${ts}${originalName.slice(dotIdx)}`
          : `${originalName}-${ts}`;
        const savePath = join(uploadDir, uniqueName);
        writeFileSync(savePath, fileData);
        // 持久化副本到 ~/.codex/cx-viewer/${project}/images/，避免 /tmp 清理后丢失
        let persistPath = null;
        try {
          const pName = _projectName || 'default';
          const persistDir = join(homedir(), '.codex', 'cx-viewer', pName, 'images');
          mkdirSync(persistDir, { recursive: true });
          persistPath = join(persistDir, uniqueName);
          writeFileSync(persistPath, fileData);
        } catch { }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: savePath, persistPath }));
      } catch (err) {
        console.error('upload error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Upload failed' }));
      }
    });
    return;
  }

  // Import file directly into project directory
  if (url.startsWith('/api/import-file') && method === 'POST') {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing boundary' }));
      return;
    }
    const importUrl = new URL(req.url, `${serverProtocol}://${req.headers.host}`);
    const dir = importUrl.searchParams.get('dir') || '';
    // Security: reject absolute paths and path traversal
    if (dir.startsWith('/') || dir.includes('..')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid dir parameter' }));
      return;
    }
    const MAX_UPLOAD = MAX_UPLOAD_SIZE;
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > MAX_UPLOAD) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File too large (max 100MB)' }));
      return;
    }
    const boundary = boundaryMatch[1];
    const chunks = [];
    let totalSize = 0;
    let aborted = false;
    req.on('data', chunk => {
      totalSize += chunk.length;
      if (totalSize > MAX_UPLOAD) {
        aborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File too large (max 100MB)' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (aborted) return;
      try {
        const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
        const targetDir = join(cwd, dir);
        mkdirSync(targetDir, { recursive: true });
        const realDir = realpathSync(targetDir);
        const realCwd = realpathSync(cwd);
        if (realDir !== realCwd && !realDir.startsWith(realCwd + '/')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Path traversal not allowed' }));
          return;
        }
        const buf = Buffer.concat(chunks);
        const headerEnd = buf.indexOf('\r\n\r\n');
        if (headerEnd === -1) throw new Error('Malformed multipart');
        const headerStr = buf.slice(0, headerEnd).toString();
        const nameMatch = headerStr.match(/filename="([^"]+)"/);
        if (!nameMatch) throw new Error('No filename');
        const originalName = nameMatch[1].replace(/[/\\]/g, '_');
        const bodyStart = headerEnd + 4;
        const closingBoundary = Buffer.from('\r\n--' + boundary);
        const bodyEnd = buf.indexOf(closingBoundary, bodyStart);
        const fileData = bodyEnd !== -1 ? buf.slice(bodyStart, bodyEnd) : buf.slice(bodyStart);
        // Resolve unique filename: append -1, -2, ... if conflict
        const dotIdx = originalName.lastIndexOf('.');
        const stem = dotIdx > 0 ? originalName.slice(0, dotIdx) : originalName;
        const ext = dotIdx > 0 ? originalName.slice(dotIdx) : '';
        let finalName = originalName;
        let savePath = join(realDir, finalName);
        let counter = 1;
        while (existsSync(savePath)) {
          finalName = `${stem}-${counter}${ext}`;
          savePath = join(realDir, finalName);
          counter++;
        }
        writeFileSync(savePath, fileData);
        const relPath = dir ? `${dir}/${finalName}` : finalName;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, name: finalName, relPath }));
      } catch (err) {
        console.error('import-file error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Import failed' }));
      }
    });
    return;
  }

  if (url === '/api/preferences' && method === 'GET') {
    let prefs = readPreferences();
    if (!isLocal) {
      prefs = { ...prefs };
      delete prefs.auth;
      delete prefs.authByProject;
    }
    prefs.logDir = LOG_DIR; // 始终返回当前运行时的日志目录
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(prefs));
    return;
  }

  if (url === '/api/preferences' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        // 认证配置只能通过本机专用的 /api/auth/config 修改。
        delete incoming.auth;
        delete incoming.authByProject;
        if (Object.prototype.hasOwnProperty.call(incoming, 'approvalsReviewer')) {
          if (!isSupportedApprovalsReviewer(incoming.approvalsReviewer)) {
            sendJson(res, 400, { error: 'Unsupported approvalsReviewer' });
            return;
          }
          incoming.approvalsReviewer = normalizeApprovalsReviewer(incoming.approvalsReviewer);
        }
        // 如果修改了日志目录，先切换再保存到新位置（新目录下生成 preferences.json）
        if (incoming.logDir && typeof incoming.logDir === 'string') {
          setLogDir(incoming.logDir);
          // LOG_DIR is part of the authentication/session context. Refresh now
          // so this response cannot leave the old directory's config cached.
          syncAuthProject();
        }
        const prefs = updatePreferences(current => Object.assign(current, incoming));
        const reviewerState = Object.prototype.hasOwnProperty.call(incoming, 'approvalsReviewer')
          ? applyRuntimeApprovalsReviewer(incoming.approvalsReviewer)
          : null;
        if (reviewerState) broadcastApprovalsReviewer(reviewerState.approvalsReviewer);
        // 主题切换时同步到 Codex Code CLI：发 /theme，监听输出验证结果，不对就再发一次
        if (incoming.themeColor && _writeToPty && _onPtyData) {
          const target = incoming.themeColor === 'light' ? 'light' : 'dark';
          let buf = '';
          let retried = false;
          const removeListener = _onPtyData((data) => {
            buf += data;
            if (buf.length > 4096) buf = buf.slice(-2048); // 限制 buf 大小
            // 解析 PTY 输出中的 "Theme set to light" 或 "Theme set to dark"
            const match = buf.match(/Theme set to (light|dark)/);
            if (match) {
              removeListener();
              clearTimeout(timeout);
              if (match[1] !== target && !retried) {
                // 结果与目标不一致，再 toggle 一次
                retried = true;
                try { _writeToPty('/theme\r'); } catch {}
              }
            }
          });
          // 5 秒超时，避免监听器泄漏
          const timeout = setTimeout(() => { removeListener(); }, 5000);
          try { _writeToPty('/theme\r'); } catch {}
        }
        prefs.logDir = LOG_DIR;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(reviewerState ? { ...prefs, ...reviewerState } : prefs));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (url === '/api/approval-reviewer' && method === 'GET') {
    const saved = getApprovalsReviewerPreference();
    sendJson(res, 200, {
      approvalsReviewer: _runtimeApprovalsReviewer || saved || APPROVALS_REVIEWER_DEFAULT,
      explicitlyConfigured: !!saved,
      appliedToRuntime: !!_codexApprovalsReviewerUpdater,
    });
    return;
  }

  if (url === '/api/approval-reviewer' && method === 'POST') {
    readJsonBody(req).then((incoming) => {
      if (!isSupportedApprovalsReviewer(incoming?.approvalsReviewer)) {
        sendJson(res, 400, { error: 'Unsupported approvalsReviewer' });
        return;
      }
      const approvalsReviewer = normalizeApprovalsReviewer(incoming.approvalsReviewer);
      updatePreferences(prefs => Object.assign(prefs, { approvalsReviewer }));
      const runtime = applyRuntimeApprovalsReviewer(approvalsReviewer);
      broadcastApprovalsReviewer(runtime.approvalsReviewer);
      sendJson(res, 200, { ok: true, ...runtime });
    }).catch((err) => sendApiError(res, err, 'Invalid request body'));
    return;
  }

  if (url === '/api/codex-md' && method === 'GET') {
    const entries = discoverCodexMdEntries();
    const id = parsedUrl.searchParams.get('id');
    if (!id) {
      sendJson(res, 200, { entries: entries.map(({ path, ...rest }) => rest) });
      return;
    }
    const hit = entries.find(entry => entry.id === id);
    if (!hit) {
      sendJson(res, 404, { error: 'AGENTS.md entry not found' });
      return;
    }
    try {
      sendJson(res, 200, { content: readFileSync(hit.path, 'utf8') });
    } catch (err) {
      sendJson(res, 500, { error: err.message || 'Failed to read AGENTS.md' });
    }
    return;
  }

  if (url === '/api/codex-memories' && method === 'GET') {
    if (!authorizeCodexMemoryRequest(req, res, parsedUrl)) return;
    try {
      const file = parsedUrl.searchParams.get('file');
      if (file) {
        sendJson(res, 200, readCodexMemoryFile(file));
      } else {
        sendJson(res, 200, await readCodexMemoryOverview({
          cwd: currentProjectDir(),
          executable: _workspaceCodexPath || process.env.CXV_CODEX_BIN || 'codex',
          featureArgs: _workspaceCodexArgs,
        }));
      }
    } catch (err) {
      sendCodexMemoryError(res, err);
    }
    return;
  }

  if (url === '/api/skills' && method === 'GET') {
    try {
      sendJson(res, 200, { ok: true, skills: listSkills({ cwd: currentProjectDir() }) });
    } catch (err) {
      sendApiError(res, err, 'Failed to list skills');
    }
    return;
  }

  if (url === '/api/skills/toggle' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const result = toggleSkill(body, { cwd: currentProjectDir() });
      sendJson(res, 200, result);
    } catch (err) {
      sendApiError(res, err, 'Failed to toggle skill');
    }
    return;
  }

  if (url === '/api/skills/delete' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const result = deleteSkill(body, { cwd: currentProjectDir() });
      sendJson(res, 200, result);
    } catch (err) {
      sendApiError(res, err, 'Failed to delete skill');
    }
    return;
  }

  if (url === '/api/skills/import' && method === 'POST') {
    try {
      const upload = await readMultipartUpload(req);
      const result = await importSkillUpload({
        ...upload,
        targetRoot: join(homedir(), '.codex', 'skills'),
      });
      sendJson(res, 200, result);
    } catch (err) {
      sendApiError(res, err, 'Failed to import skill');
    }
    return;
  }

  const imSkillsMatch = url.match(/^\/api\/im\/([^/]+)\/skills(?:\/(toggle|delete|import))?$/);
  if (imSkillsMatch) {
    const platformId = decodeURIComponent(imSkillsMatch[1]);
    const action = imSkillsMatch[2] || '';
    try {
      if (!action && method === 'GET') {
        sendJson(res, 200, {
          ok: true,
          skills: listSkills({ roots: imSkillRoots(platformId), includeReadonly: false }),
        });
        return;
      }
      if (action === 'toggle' && method === 'POST') {
        const body = await readJsonBody(req);
        sendJson(res, 200, toggleSkill(body, { roots: imSkillRoots(platformId) }));
        return;
      }
      if (action === 'delete' && method === 'POST') {
        const body = await readJsonBody(req);
        sendJson(res, 200, deleteSkill(body, { roots: imSkillRoots(platformId) }));
        return;
      }
      if (action === 'import' && method === 'POST') {
        const upload = await readMultipartUpload(req);
        const result = await importSkillUpload({ ...upload, targetRoot: imSkillImportRoot(platformId) });
        sendJson(res, 200, result);
        return;
      }
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    } catch (err) {
      sendApiError(res, err, 'Failed to manage IM skills');
    }
    return;
  }

  // 注册新的日志文件进行 watch（供新进程复用旧服务时调用）
  if (url === '/api/register-log' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      try {
        const { logFile } = JSON.parse(body);
        if (logFile && typeof logFile === 'string' && logFile.startsWith(LOG_DIR) && existsSync(logFile)) {
          watchLogFile(_logWatcherOpts(logFile));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid log file path' }));
        }
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
    return;
  }

  // 用户选择继续/新开日志
  if (url === '/api/resume-choice' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', async () => {
      try {
        const { choice } = JSON.parse(body);
        if (choice !== 'continue' && choice !== 'new') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid choice' }));
          return;
        }
        const result = resolveResumeChoice(choice);
        if (!result) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Already resolved' }));
          return;
        }
        // 重新 watch 最终的日志文件
        watchLogFile(_logWatcherOpts(result.logFile));
        // 广播 resume_resolved + full_reload
        const resolvedData = JSON.stringify({ logFile: result.logFile });
        clients.forEach(client => {
          try {
            client.write(`event: resume_resolved\ndata: ${resolvedData}\n\n`);
          } catch { }
        });
        // 流式分段广播 full_reload，避免全量加载 OOM
        const legacyReloadClients = clients.filter(client => !client.cxvControlOnly);
        const reloadTotal = countCurrentLogEntries();
        legacyReloadClients.forEach(client => {
          try { client.write(`event: load_start\ndata: ${JSON.stringify({ total: reloadTotal, incremental: false })}\n\n`); } catch { }
        });
        await streamCurrentLogEntries((raw) => {
          legacyReloadClients.forEach(client => {
            try { client.write('event: load_chunk\ndata: ['); client.write(raw.replace(/\n/g, '')); client.write(']\n\n'); } catch { }
          });
        });
        legacyReloadClients.forEach(client => {
          try { client.write(`event: load_end\ndata: {}\n\n`); } catch { }
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, logFile: result.logFile }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
    return;
  }

  // === Workspace API ===

  // 目录浏览器
  if (url.startsWith('/api/browse-dir') && method === 'GET') {
    try {
      const dirPath = parsedUrl.searchParams.get('path') || homedir();
      if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid directory' }));
        return;
      }
      const entries = readdirSync(dirPath, { withFileTypes: true });
      const dirs = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.') && entry.name !== '.') continue;
        const fullPath = join(dirPath, entry.name);
        let hasGit = false;
        try { hasGit = existsSync(join(fullPath, '.git')); } catch {}
        dirs.push({ name: entry.name, path: fullPath, hasGit });
      }
      dirs.sort((a, b) => {
        if (a.hasGit !== b.hasGit) return a.hasGit ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      const parent = join(dirPath, '..');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ current: dirPath, parent: parent !== dirPath ? parent : null, dirs }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url === '/api/workspaces' && method === 'GET') {
    import('./workspace-registry.js').then(({ getWorkspaces }) => {
      const workspaces = getWorkspaces();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ workspaces, workspaceMode: isWorkspaceMode && !_workspaceLaunched }));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  if (url === '/api/workspaces/launch' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', async () => {
      try {
        const { path: wsPath, extraArgs: launchExtraArgs } = JSON.parse(body);
        if (!wsPath || !existsSync(wsPath) || !statSync(wsPath).isDirectory()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid directory path' }));
          return;
        }

        const { registerWorkspace } = await import('./workspace-registry.js');
        registerWorkspace(wsPath);

        // Electron multi-tab 模式：管理 server 只触发 callback，不做日志初始化
        // 所有日志相关操作（initForWorkspace、watchLogFile、spawnCodex）由 tab-worker 子进程负责
        if (process.env.CXV_ELECTRON_MULTITAB === '1') {
          if (_launchCallback) {
            _launchCallback(wsPath, Array.isArray(launchExtraArgs) ? launchExtraArgs : []);
          }
          _workspaceLaunched = true;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, projectName: basename(wsPath) }));
          return;
        }

        // 非 Electron 模式（web / CLI）：完整逻辑
        const result = initForWorkspace(wsPath);
        process.env.CXV_PROJECT_DIR = wsPath;

        // 启动日志监听
        watchLogFile(_logWatcherOpts(LOG_FILE));

        // 启动 stats worker（如果尚未启动）
        if (!statsWorker) startStatsWorker();
        startStreamingStatusTimer();

        // 启动 PTY
        const proxyPort = process.env.CXV_PROXY_PORT;
        if (proxyPort) {
          const { spawnCodexRequest } = await import('./pty-manager.js');
          const mergedArgs = [..._workspaceCodexArgs, ...(Array.isArray(launchExtraArgs) ? launchExtraArgs : [])];
          await spawnCodexRequest({
            proxyPort: parseInt(proxyPort), cwd: wsPath, args: mergedArgs,
            codexPath: _workspaceCodexPath, isNpmVersion: _workspaceIsNpmVersion,
            serverPort: actualPort, invocation: parseCodexInvocation(mergedArgs),
          });
        }

        _workspaceLaunched = true;

        // 通知所有 SSE 客户端
        clients.forEach(client => {
          try {
            client.write(`event: workspace_started\ndata: ${JSON.stringify({ projectName: result.projectName, path: wsPath })}\n\n`);
          } catch {}
        });

        // 流式分段广播以刷新会话区域，避免全量加载 OOM
        const legacyReloadClients = clients.filter(client => !client.cxvControlOnly);
        const wsReloadTotal = countCurrentLogEntries();
        legacyReloadClients.forEach(client => {
          try { client.write(`event: load_start\ndata: ${JSON.stringify({ total: wsReloadTotal, incremental: false })}\n\n`); } catch {}
        });
        await streamCurrentLogEntries((raw) => {
          legacyReloadClients.forEach(client => {
            try { client.write('event: load_chunk\ndata: ['); client.write(raw.replace(/\n/g, '')); client.write(']\n\n'); } catch {}
          });
        });
        legacyReloadClients.forEach(client => {
          try { client.write(`event: load_end\ndata: {}\n\n`); } catch {}
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, projectName: result.projectName }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url === '/api/workspaces/add' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', async () => {
      try {
        const { path: wsPath } = JSON.parse(body);
        if (!wsPath || !existsSync(wsPath) || !statSync(wsPath).isDirectory()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid directory path' }));
          return;
        }
        const { registerWorkspace } = await import('./workspace-registry.js');
        const entry = registerWorkspace(wsPath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, workspace: entry }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url.startsWith('/api/workspaces/') && method === 'DELETE') {
    const id = url.split('/').pop();
    import('./workspace-registry.js').then(({ removeWorkspace }) => {
      const removed = removeWorkspace(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: removed }));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  if (url === '/api/workspaces/stop' && method === 'POST') {
    import('./pty-manager.js').then(({ killPty }) => {
      killPty();

      // 停止日志监听
      for (const logFile of getWatchedFiles().keys()) {
        unwatchFile(logFile);
      }
      getWatchedFiles().clear();

      // 重置 interceptor 状态
      resetWorkspace();
      _workspaceLaunched = false;

      // 通知所有 SSE 客户端
      clients.forEach(client => {
        try {
          client.write(`event: workspace_stopped\ndata: {}\n\n`);
        } catch {}
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // SSE endpoint
  if (url === '/api/log-v2/snapshot' && method === 'GET') {
    const limit = Math.min(Math.max(parseInt(parsedUrl.searchParams.get('limit'), 10) || 0, 0), 5000);
    const requestedFile = parsedUrl.searchParams.get('file');
    const file = requestedFile || activeV2SessionFile();
    const readOnly = !!requestedFile || parsedUrl.searchParams.get('mode') === 'readonly';
    const knownThroughSeq = Number(parsedUrl.searchParams.get('knownThroughSeq'));
    const knownTimelineBytes = Number(parsedUrl.searchParams.get('knownTimelineBytes'));
    const knownGeneration = parsedUrl.searchParams.get('knownGeneration');
    const knownCursor = knownGeneration
      && Number.isSafeInteger(knownThroughSeq) && knownThroughSeq >= 0
      && Number.isSafeInteger(knownTimelineBytes) && knownTimelineBytes >= 0
      ? {
          archive: {
            projectId: parsedUrl.searchParams.get('knownProjectId') || '',
            sessionId: parsedUrl.searchParams.get('knownSessionId') || '',
            generation: knownGeneration,
          },
          throughSeq: knownThroughSeq,
          timelineBytes: knownTimelineBytes,
          fileId: parsedUrl.searchParams.get('knownFileId') || '',
          tailHash: parsedUrl.searchParams.get('knownTailHash') || '',
        }
      : null;
    await serveLogV2Snapshot(req, res, {
      logDir: LOG_DIR,
      file,
      limit,
      readSnapshot: readV2WireSnapshotAsync,
      readOnly,
      knownCursor,
    });
    return;
  }

  if (url === '/api/log-v2/page' && method === 'POST') {
    try {
      const body = await readJsonBody(req, 64 * 1024);
      await serveLogV2Page(req, res, { logDir: LOG_DIR, body, readPage: readV2WirePageAsync });
    } catch (error) {
      if (!res.headersSent) {
        res.writeHead(error.status || 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    }
    return;
  }

  if (url === '/api/log-v2/objects' && method === 'POST') {
    try {
      const body = await readJsonBody(req, 64 * 1024);
      await serveLogV2Objects(req, res, { logDir: LOG_DIR, body });
    } catch (error) {
      if (!res.headersSent) {
        res.writeHead(error.status || 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    }
    return;
  }

  if (url === '/api/log-v2/live' && method === 'GET') {
    const generation = parsedUrl.searchParams.get('generation') || '';
    let afterSeq = Math.max(parseInt(parsedUrl.searchParams.get('afterSeq'), 10) || 0, 0);
    const lastEventId = typeof req.headers['last-event-id'] === 'string' ? req.headers['last-event-id'] : '';
    const lastEventMatch = lastEventId.match(/^([a-f0-9]{64}):(\d+)$/);
    if (lastEventMatch?.[1] === generation) afterSeq = Math.max(afterSeq, Number(lastEventMatch[2]));
    await serveLogV2Live(req, res, {
      logDir: LOG_DIR,
      file: activeV2SessionFile(),
      getActiveFile: activeV2SessionFile,
      afterSeq,
      generation,
      objectHandle: parsedUrl.searchParams.get('handle') || '',
    });
    return;
  }

  if (url === '/events' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // 注意：不要在此处 clients.push(res)！
    // 必须等 load_end + context_window 全部发送完毕后再加入广播列表，
    // 否则 streamRawEntriesAsync 的 setImmediate yield 间隙会让 watcher 的
    // sendToClients 向该客户端推送 live entry，而 load_end 的 setState 会覆盖这些
    // 已处理的 live entry，导致 对话条目"显示→消失→重现"闪烁。

    // SSE 心跳保活：防止连接被 OS/代理/浏览器静默断开
    const pingTimer = setInterval(() => {
      try { res.write('event: ping\ndata: {}\n\n'); } catch {}
    }, SSE_HEARTBEAT_MS);

    // 如果有待决的 resume 选择，发送 resume_prompt 事件
    if (_resumeState) {
      res.write(`event: resume_prompt\ndata: ${JSON.stringify({ recentFileName: _resumeState.recentFileName })}\n\n`);
    }

    // The V2 client has already consumed a frozen reference snapshot. Keep
    // this EventSource for control/live events without rebuilding and sending
    // the same historical full entries again.
    if (parsedUrl.searchParams.get('controlOnly') === '1') {
      res.cxvControlOnly = true;
      clients.push(res);
      req.on('close', () => {
        clearInterval(pingTimer);
        const idx = clients.indexOf(res);
        if (idx !== -1) clients.splice(idx, 1);
      });
      return;
    }

    // 增量加载参数：移动端带 since/cc/project 请求增量数据
    const sinceParam = parsedUrl.searchParams.get('since');
    const ccParam = parseInt(parsedUrl.searchParams.get('cc'), 10) || 0;
    const projectParam = parsedUrl.searchParams.get('project');
    const projectMatch = !projectParam || projectParam === (_projectName || '');
    const useIncremental = !!(sinceParam && ccParam > 0 && projectMatch && !isNaN(new Date(sinceParam).getTime()));

    // 分页参数：移动端首次加载传 limit=200，与 since 互斥
    const limitParam = parseInt(parsedUrl.searchParams.get('limit'), 10) || 0;
    const useLimit = !useIncremental && limitParam > 0;

    // context_window 追踪（扫描全量条目，不受 since 过滤影响）
    let latestContextWindow = null;
    let pushedContextWindow = false;

    await streamCurrentLogEntries((raw) => {
      // 直接发送原始 JSON 字符串，不做 parse/reconstruct/stringify
      // SSE data 字段不允许裸换行，去除 pretty-printed JSON 的换行
      res.write('event: load_chunk\ndata: [');
      res.write(raw.includes('\n') ? raw.replace(/\n/g, '') : raw);
      res.write(']\n\n');
    }, {
      since: useIncremental ? sinceParam : undefined,
      limit: useLimit ? limitParam : undefined,
      onScan: (raw) => {
        // 轻量追踪最新 MainAgent 的 context_window。
        // 新 Codex 日志可能缺失 mainAgent:true，只能通过 Codex instructions
        // 与当前 snake_case 工具名回退识别。
        if (
          raw.includes('"mainAgent":true') ||
          raw.includes('"mainAgent": true') ||
          raw.includes('You are Codex') ||
          raw.includes('"shell_command"') ||
          raw.includes('"tool_search"')
        ) {
          try {
            const entry = JSON.parse(raw);
            if (isMainAgentEntry(entry)) {
              const usage = entry.response?.body?.usage;
              if (usage) {
                const cw = buildContextWindowEvent(usage);
                if (cw) latestContextWindow = cw;
              }
            }
          } catch { }
        }
      },
      onReady: ({ totalCount, hasMore, oldestTs }) => {
        // Pass 1 完成、Pass 2 开始前：发送 load_start
        // 增量模式下不显示 loading 遮罩，非增量模式显示进度
        const loadStartData = { total: totalCount, incremental: !!useIncremental };
        // 分页模式下附加 hasMore/oldestTs（增量模式由客户端从缓存自行判断）
        if (useLimit) {
          loadStartData.hasMore = !!hasMore;
          loadStartData.oldestTs = oldestTs || '';
        }
        res.write(`event: load_start\ndata: ${JSON.stringify(loadStartData)}\n\n`);
      },
    });

    res.write(`event: load_end\ndata: {}\n\n`);

    // 发送最新 MainAgent 的 context_window
    if (latestContextWindow) {
      res.write(`event: context_window\ndata: ${JSON.stringify(latestContextWindow)}\n\n`);
      pushedContextWindow = true;
    }
    // Fallback: no MainAgent in log (e.g. fresh session after -c), read context-window.json
    if (!pushedContextWindow) {
      try {
        const cwRaw = readFileSync(CONTEXT_WINDOW_FILE, 'utf-8');
        const cwFile = JSON.parse(cwRaw);
        if (cwFile?.context_window) {
          // Recalculate with the fixed Codex context size used by the blood bar.
          const cw = cwFile.context_window;
          const totalTokens = sumUsageContextTokens(cw.current_usage) || ((cw.total_input_tokens || 0) + (cw.total_output_tokens || 0));
          const contextSize = CODEX_CONTEXT_WINDOW_TOKENS;
          const usedPct = contextSize > 0 ? Math.round((totalTokens / contextSize) * 100) : 0;
          const data = { ...cw, context_window_size: contextSize, used_percentage: usedPct, remaining_percentage: 100 - usedPct };
          res.write(`event: context_window\ndata: ${JSON.stringify(data)}\n\n`);
        }
      } catch { }
    }

    // 历史数据 + context_window 全部发送完毕后，才将客户端加入广播列表。
    // 这样 watcher 的 sendToClients 不会在 load 阶段向该客户端推送 live entry。
    clients.push(res);

    req.on('close', () => {
      clearInterval(pingTimer);
      const idx = clients.indexOf(res);
      if (idx !== -1) clients.splice(idx, 1);
    });
    return;
  }

  // API endpoint
  if (url === '/api/requests' && method === 'GET') {
    // 异步流式 JSON 数组输出，不做 reconstruct，发原始条目
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write('[');
    let first = true;
    await streamCurrentLogEntries((raw) => {
      if (!first) res.write(',');
      res.write(raw);
      first = false;
    });
    res.write(']');
    res.end();
    return;
  }

  // 分页历史条目端点：移动端"加载更多"按需拉取
  if (url === '/api/entries/page' && method === 'GET') {
    const before = parsedUrl.searchParams.get('before');
    const limitVal = Math.min(parseInt(parsedUrl.searchParams.get('limit'), 10) || 100, 500);
    if (!before || isNaN(new Date(before).getTime())) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing or invalid "before" parameter' }));
      return;
    }
    try {
      const result = await readCurrentPagedEntries({ before, limit: limitVal });
      // entries 是原始 JSON 字符串数组，parse 后返回给客户端
      const entries = result.entries.map(raw => {
        try { return JSON.parse(raw); } catch { return null; }
      }).filter(Boolean);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        entries,
        hasMore: result.hasMore,
        oldestTimestamp: result.oldestTimestamp,
        count: entries.length,
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 当前监控的项目名称
  if (url === '/api/project-name' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ projectName: _projectName || '' }));
    return;
  }

  // 返回项目目录绝对路径（前端用于将绝对路径转为相对路径）
  if (url === '/api/project-dir' && method === 'GET') {
    const dir = process.env.CXV_PROJECT_DIR || process.cwd();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ dir }));
    return;
  }

  if (url === '/api/terminal-recovery' && method === 'GET') {
    const { getPtyState, getReconnectSnapshot, requestPtySnapshot } = await import('./pty-manager.js');
    // Do not let the diagnostic endpoint bypass the resume privacy boundary.
    // Outside recovery it still refreshes to a current canonical cut; during
    // recovery it returns only the exact baseline already approved for a new
    // renderer connection.
    if (!getPtyState().recovering) await requestPtySnapshot();
    const state = getPtyState();
    const snapshot = getReconnectSnapshot();
    const available = snapshot.reconnectSafe === true;
    res.writeHead(available ? 200 : 409, {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(JSON.stringify({
      ...state,
      ...snapshot,
      available,
      ...(available ? {} : { error: 'terminal-recovery-not-ready' }),
    }));
    return;
  }

  // 当前版本号
  if (url === '/api/version-info' && method === 'GET') {
    try {
      const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ version: pkg.version }));
    } catch {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read version' }));
    }
    return;
  }

  // 项目统计数据
  if (url === '/api/project-stats' && method === 'GET') {
    try {
      if (!_projectName) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No project name' }));
        return;
      }
      const statsFile = join(LOG_DIR, _projectName, `${_projectName}.json`);
      if (!existsSync(statsFile)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Stats file not found' }));
        return;
      }
      const stats = readFileSync(statsFile, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(stats);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 所有项目统计数据
  if (url === '/api/all-project-stats' && method === 'GET') {
    try {
      const allStats = {};
      if (existsSync(LOG_DIR)) {
        const entries = readdirSync(LOG_DIR, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const project = entry.name;
          const statsFile = join(LOG_DIR, project, `${project}.json`);
          if (existsSync(statsFile)) {
            try {
              allStats[project] = JSON.parse(readFileSync(statsFile, 'utf-8'));
            } catch { }
          }
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(allStats));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 刷新统计：强制重新扫描所有项目日志，等待完成后再响应
  if (url === '/api/refresh-stats' && method === 'POST') {
    try {
      if (!statsWorker) startStatsWorker();
      if (statsWorker) {
        const timeout = setTimeout(() => {
          statsWorker?.removeListener('message', onDone);
          res.writeHead(504, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Stats refresh timed out' }));
        }, 30000);
        const onDone = (m) => {
          if (m.type === 'scan-all-done') {
            clearTimeout(timeout);
            statsWorker?.removeListener('message', onDone);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
          }
        };
        statsWorker.on('message', onDone);
        statsWorker.postMessage({ type: 'scan-all', logDir: LOG_DIR });
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Stats worker not available' }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Codex config.toml
  if (url === '/api/codex-settings' && method === 'GET') {
    const cfg = readCodexGlobalConfig();
    sendJson(res, 200, {
      model: typeof cfg.model === 'string' ? cfg.model : null,
      showThinkingSummaries: cfg.show_raw_agent_reasoning === true,
      codexAvailable: process.env.CXV_CODEX_MISSING !== '1',
      codexConfigDir: cfg.configDir,
    });
    return;
  }

  if (url === '/api/codex-settings' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        const cfg = updateCodexGlobalConfig(incoming);
        sendJson(res, 200, {
          ok: true,
          model: typeof cfg.model === 'string' ? cfg.model : null,
          showThinkingSummaries: cfg.show_raw_agent_reasoning === true,
          codexAvailable: process.env.CXV_CODEX_MISSING !== '1',
          codexConfigDir: cfg.configDir,
        });
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  // Proxy profile 热切换
  if (url === '/api/proxy-profiles' && method === 'GET') {
    try {
      const data = existsSync(PROFILE_PATH) ? JSON.parse(readFileSync(PROFILE_PATH, 'utf-8')) : _defaultProxyProfiles;
      const masked = _maskProfiles(data);
      if (_defaultConfig) masked.defaultConfig = { ..._defaultConfig, apiKey: _defaultConfig.apiKey ? _maskApiKey(_defaultConfig.apiKey) : null };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(masked));
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(_defaultProxyProfiles));
    }
    return;
  }

  if (url === '/api/proxy-profiles' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        if (!incoming || typeof incoming !== 'object' || !Array.isArray(incoming.profiles)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid profile data: profiles must be an array' }));
          return;
        }
        // 确保 max profile 始终存在
        if (!incoming.profiles.some(p => p.id === 'max')) {
          incoming.profiles = [{ id: 'max', name: 'Default' }, ...(incoming.profiles || [])];
        }
        // 如果 apiKey 是 mask 值（未修改），从磁盘读取原始值保留
        let existing = {};
        try { if (existsSync(PROFILE_PATH)) existing = JSON.parse(readFileSync(PROFILE_PATH, 'utf-8')); } catch { }
        const existingMap = {};
        if (existing.profiles) existing.profiles.forEach(p => { if (p.apiKey) existingMap[p.id] = p.apiKey; });
        for (const p of incoming.profiles) {
          if (p.apiKey && _isMasked(p.apiKey) && existingMap[p.id]) {
            p.apiKey = existingMap[p.id];
          }
        }
        const dir = dirname(PROFILE_PATH);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(PROFILE_PATH, JSON.stringify(incoming, null, 2), { mode: 0o600 });
        _loadProxyProfile();
        // SSE 广播给所有 viewer 客户端（mask apiKey）
        const activeProfile = incoming.profiles?.find(p => p.id === incoming.active) || null;
        const maskedProfile = activeProfile?.apiKey ? { ...activeProfile, apiKey: _maskApiKey(activeProfile.apiKey) } : activeProfile;
        sendEventToClients(clients, 'proxy_profile', { active: incoming.active, profile: maskedProfile });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // macOS 用户头像和显示名
  if (url === '/api/user-profile' && method === 'GET') {
    const profile = await getUserProfile();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(profile));
    return;
  }

  // 文件浏览器 API（CLI 模式下项目目录浏览）
  if (url === '/api/files' && method === 'GET') {
    const reqPath = parsedUrl.searchParams.get('path') || '.';
    // 安全校验：拒绝绝对路径和 .. 路径穿越
    if (reqPath.startsWith('/') || reqPath.includes('..')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid path' }));
      return;
    }
    const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
    const targetDir = join(cwd, reqPath);
    try {
      const entries = readdirSync(targetDir, { withFileTypes: true });
      const items = entries
        .filter(e => !IGNORED_PATTERNS.has(e.name))
        .map(e => ({ name: e.name, type: e.isDirectory() ? 'directory' : 'file' }))
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      // 使用 git check-ignore 批量检测被 .gitignore 忽略的文件
      let gitIgnoredSet = new Set();
      try {
        const names = items.map(i => {
          const rel = reqPath === '.' ? i.name : `${reqPath}/${i.name}`;
          return i.type === 'directory' ? `${rel}/` : rel;
        });
        if (names.length > 0) {
          const result = await execWithStdin('git', ['check-ignore', '--stdin'], names.join('\n'), {
            cwd,
            timeout: 3000,
          });
          result.split('\n').filter(Boolean).forEach(line => {
            const name = line.endsWith('/') ? line.slice(0, -1) : line;
            const baseName = name.includes('/') ? name.split('/').pop() : name;
            gitIgnoredSet.add(baseName);
          });
        }
      } catch { /* git 未安装或非 git 仓库，忽略 */ }
      const result = items.map(i => gitIgnoredSet.has(i.name) ? { ...i, gitIgnored: true } : i);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Directory not found' }));
    }
    return;
  }

  // 文件重命名 API
  if (url === '/api/rename-file' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      try {
        const { oldPath, newName } = parsed;
        if (!oldPath || !newName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing oldPath or newName' }));
          return;
        }
        // 安全校验
        if (oldPath.startsWith('/') || oldPath.includes('..') || newName.includes('/') || newName.includes('\\') || newName.includes('..')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid path' }));
          return;
        }
        const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
        const oldFullPath = join(cwd, oldPath);
        const parentDir = dirname(oldFullPath);
        const newFullPath = join(parentDir, newName);
        // 检查源文件存在
        if (!existsSync(oldFullPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File not found' }));
          return;
        }
        // 检查目标是否已存在
        if (existsSync(newFullPath)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Target already exists' }));
          return;
        }
        renameSync(oldFullPath, newFullPath);
        const newRelPath = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName : newName;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, newPath: newRelPath }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 文件移动 API
  if (url === '/api/move-file' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      try {
        const { fromPath, toDir } = parsed;
        if (!fromPath || !toDir) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing fromPath or toDir' }));
          return;
        }
        // 安全校验
        if (fromPath.startsWith('/') || fromPath.includes('..') || toDir.startsWith('/') || toDir.includes('..')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid path' }));
          return;
        }
        const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
        const oldFullPath = join(cwd, fromPath);
        const toDirFull = join(cwd, toDir);
        // 检查源文件/目录存在
        if (!existsSync(oldFullPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Source not found' }));
          return;
        }
        // 检查目标目录存在且是目录
        if (!existsSync(toDirFull) || !statSync(toDirFull).isDirectory()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Target directory not found' }));
          return;
        }
        // 不能把目录移到自身或其子目录下
        if (statSync(oldFullPath).isDirectory()) {
          const srcResolved = resolve(oldFullPath);
          const destResolved = resolve(toDirFull);
          if (destResolved === srcResolved || destResolved.startsWith(srcResolved + '/')) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Cannot move directory into itself' }));
            return;
          }
        }
        const name = basename(fromPath);
        const newFullPath = join(toDirFull, name);
        // 检查目标位置不存在同名文件
        if (existsSync(newFullPath)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Target already exists' }));
          return;
        }
        try {
          renameSync(oldFullPath, newFullPath);
        } catch (mvErr) {
          if (mvErr.code === 'EXDEV') {
            // 跨文件系统：fallback to copy + delete
            if (statSync(oldFullPath).isDirectory()) {
              cpSync(oldFullPath, newFullPath, { recursive: true });
              rmSync(oldFullPath, { recursive: true, force: true });
            } else {
              copyFileSync(oldFullPath, newFullPath);
              unlinkSync(oldFullPath);
            }
          } else if (mvErr.code === 'EEXIST') {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Target already exists' }));
            return;
          } else {
            throw mvErr;
          }
        }
        const newRelPath = toDir.endsWith('/') ? toDir + name : toDir + '/' + name;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, newPath: newRelPath }));
      } catch (err) {
        console.error('move-file error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
    return;
  }

  // 删除文件 API
  if (url === '/api/delete-file' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      try {
        const { path: filePath } = parsed;
        if (!filePath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing path' }));
          return;
        }
        if (filePath.startsWith('/') || filePath.includes('..')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid path' }));
          return;
        }
        const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
        const fullPath = join(cwd, filePath);
        if (!existsSync(fullPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File not found' }));
          return;
        }
        const realFull = realpathSync(fullPath);
        const realCwd = realpathSync(cwd);
        if (!realFull.startsWith(realCwd + '/')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Path traversal not allowed' }));
          return;
        }
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          const protectedDirs = new Set(['node_modules', '.git', '.svn', '.hg']);
          if (filePath.split('/').some(part => protectedDirs.has(part))) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Cannot delete protected directory' }));
            return;
          }
          rmSync(fullPath, { recursive: true, force: true });
        } else if (stat.isFile()) {
          unlinkSync(fullPath);
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unsupported path type' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 在系统文件管理器中显示文件
  if (url === '/api/reveal-file' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      try {
        const { path: filePath } = parsed;
        if (!filePath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing path' }));
          return;
        }
        if (filePath.startsWith('/') || filePath.includes('..')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid path' }));
          return;
        }
        const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
        const fullPath = join(cwd, filePath);
        if (!existsSync(fullPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File not found' }));
          return;
        }
        const realFull = realpathSync(fullPath);
        const realCwd = realpathSync(cwd);
        if (!realFull.startsWith(realCwd + '/')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Path traversal not allowed' }));
          return;
        }
        const plat = process.platform;
        if (plat === 'darwin') {
          execFile('open', ['-R', fullPath], () => {});
        } else if (plat === 'win32') {
          spawn('explorer', ['/select,', fullPath], { shell: false });
        } else {
          execFile('xdg-open', [dirname(fullPath)], () => {});
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, fullPath }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 用系统默认应用打开文件
  if (url === '/api/open-file' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      try {
        const { path: filePath } = parsed;
        if (!filePath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing path' }));
          return;
        }
        if (filePath.startsWith('/') || filePath.includes('..')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid path' }));
          return;
        }
        const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
        const fullPath = join(cwd, filePath);
        if (!existsSync(fullPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File not found' }));
          return;
        }
        const realFull = realpathSync(fullPath);
        const realCwd = realpathSync(cwd);
        if (!realFull.startsWith(realCwd + '/')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Path traversal not allowed' }));
          return;
        }
        const plat = process.platform;
        if (plat === 'darwin') {
          execFile('open', [fullPath], () => {});
        } else if (plat === 'win32') {
          execFile('cmd.exe', ['/c', 'start', '', fullPath], () => {});
        } else {
          execFile('xdg-open', [fullPath], () => {});
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 解析相对路径为绝对路径（不触发任何副作用）
  if (url === '/api/resolve-path' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      try {
        const relPath = parsed.path || '';
        if (relPath.startsWith('/') || relPath.includes('..')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid path' }));
          return;
        }
        const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
        const fullPath = relPath ? join(cwd, relPath) : cwd;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, fullPath }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 在指定目录下新建空文件
  if (url === '/api/create-file' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      try {
        const { dirPath, name } = parsed;
        if (!name) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing name' }));
          return;
        }
        if (name.includes('/') || name.includes('\\') || name.includes('..') || /[\x00-\x1f]/.test(name)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid file name' }));
          return;
        }
        const relDir = dirPath || '';
        if (relDir.startsWith('/') || relDir.includes('..')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid path' }));
          return;
        }
        const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
        const fullDirPath = relDir ? join(cwd, relDir) : cwd;
        if (!existsSync(fullDirPath) || !statSync(fullDirPath).isDirectory()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Directory not found' }));
          return;
        }
        const realDir = realpathSync(fullDirPath);
        const realCwd = realpathSync(cwd);
        if (realDir !== realCwd && !realDir.startsWith(realCwd + '/')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Path traversal not allowed' }));
          return;
        }
        const fullPath = join(fullDirPath, name);
        if (existsSync(fullPath)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File already exists' }));
          return;
        }
        writeFileSync(fullPath, '');
        const relPath = relDir ? `${relDir}/${name}` : name;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: relPath }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 在指定目录下打开系统终端
  if (url === '/api/open-terminal' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      try {
        const relDir = (parsed.path || '');
        if (relDir.startsWith('/') || relDir.includes('..')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid path' }));
          return;
        }
        const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
        const fullDir = relDir ? join(cwd, relDir) : cwd;
        if (!existsSync(fullDir) || !statSync(fullDir).isDirectory()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Directory not found' }));
          return;
        }
        const realDir = realpathSync(fullDir);
        const realCwd = realpathSync(cwd);
        if (realDir !== realCwd && !realDir.startsWith(realCwd + '/')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Path traversal not allowed' }));
          return;
        }
        const plat = process.platform;
        if (plat === 'darwin') {
          spawn('open', ['-a', 'Terminal', fullDir], { stdio: 'ignore', detached: true }).unref();
        } else if (plat === 'win32') {
          spawn('cmd.exe', ['/c', 'start', 'cmd.exe'], { cwd: fullDir, stdio: 'ignore', detached: true }).unref();
        } else {
          // Linux: try common terminal emulators
          const terminals = ['gnome-terminal', 'konsole', 'xfce4-terminal', 'xterm'];
          let launched = false;
          for (const term of terminals) {
            try {
              if (term === 'gnome-terminal') {
                spawn(term, ['--working-directory=' + fullDir], { stdio: 'ignore', detached: true }).unref();
              } else if (term === 'konsole') {
                spawn(term, ['--workdir', fullDir], { stdio: 'ignore', detached: true }).unref();
              } else {
                spawn(term, [], { cwd: fullDir, stdio: 'ignore', detached: true }).unref();
              }
              launched = true;
              break;
            } catch { continue; }
          }
          if (!launched) {
            spawn('xdg-open', [fullDir], { stdio: 'ignore', detached: true }).unref();
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 在指定目录下新建空文件夹
  if (url === '/api/create-dir' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      try {
        const { dirPath, name } = parsed;
        if (!name) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing name' }));
          return;
        }
        if (name.includes('/') || name.includes('\\') || name.includes('..') || /[\x00-\x1f]/.test(name)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid folder name' }));
          return;
        }
        const relDir = dirPath || '';
        if (relDir.startsWith('/') || relDir.includes('..')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid path' }));
          return;
        }
        const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
        const fullDirPath = relDir ? join(cwd, relDir) : cwd;
        if (!existsSync(fullDirPath) || !statSync(fullDirPath).isDirectory()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Directory not found' }));
          return;
        }
        const realDir = realpathSync(fullDirPath);
        const realCwd = realpathSync(cwd);
        if (realDir !== realCwd && !realDir.startsWith(realCwd + '/')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Path traversal not allowed' }));
          return;
        }
        const fullPath = join(fullDirPath, name);
        if (existsSync(fullPath)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Already exists' }));
          return;
        }
        mkdirSync(fullPath);
        const relPath = relDir ? `${relDir}/${name}` : name;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: relPath }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // === Editor session API (for $EDITOR intercept) ===

  if (url === '/api/open-log-dir' && method === 'POST') {
    // V2 projects now live directly under the log root beside legacy project
    // directories, so reveal that shallow common root.
    const dir = _logV2ReadMode === 'v2'
      ? LOG_DIR
      : (LOG_FILE ? dirname(LOG_FILE) : LOG_DIR);
    if (_logV2ReadMode === 'v2' && !existsSync(dir)) mkdirSync(dir, { recursive: true });
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    execFile(cmd, [dir], () => {});
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, dir }));
    return;
  }

  if (url === '/api/open-profile-dir' && method === 'POST') {
    const dir = dirname(PROFILE_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    execFile(cmd, [dir], () => {});
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, dir }));
    return;
  }

  if (url === '/api/open-project-dir' && method === 'POST') {
    const dir = process.env.CXV_PROJECT_DIR || process.cwd();
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    execFile(cmd, [dir], () => {});
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, dir }));
    return;
  }

  if (url === '/api/open-codex-memories-dir' && method === 'POST') {
    if (!authorizeCodexMemoryRequest(req, res, parsedUrl)) return;
    const dir = getCodexMemoryDir();
    let isDirectory = false;
    try { isDirectory = existsSync(dir) && statSync(dir).isDirectory(); } catch {}
    if (!isDirectory) {
      sendJson(res, 404, { error: 'memory_dir_missing', code: 'memory_dir_missing' });
      return;
    }
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    try {
      await execFileAsync(cmd, [dir], { timeout: 5000 });
      sendJson(res, 200, { ok: true });
    } catch {
      sendJson(res, 500, { error: 'memory_open_failed', code: 'memory_open_failed' });
    }
    return;
  }

  if (url === '/api/editor-open' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      try {
        const { sessionId, filePath } = JSON.parse(body);
        if (!sessionId || !filePath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing sessionId or filePath' }));
          return;
        }
        editorSessions.set(sessionId, { filePath, done: false, createdAt: Date.now() });
        // Broadcast to all terminal WebSocket clients
        if (terminalWss) {
          const msg = JSON.stringify({ type: 'editor-open', sessionId, filePath });
          terminalWss.clients.forEach(client => {
            if (client.readyState === 1) {
              try { client.send(msg); } catch {}
            }
          });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
    return;
  }

  if (url.startsWith('/api/editor-status') && method === 'GET') {
    const id = parsedUrl.searchParams.get('id');
    if (!id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing id' }));
      return;
    }
    const session = editorSessions.get(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ done: session ? session.done : true }));
    return;
  }

  if (url === '/api/editor-done' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      try {
        const { sessionId } = JSON.parse(body);
        if (!sessionId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing sessionId' }));
          return;
        }
        const session = editorSessions.get(sessionId);
        if (session) {
          session.done = true;
        }
        // Clean up after a short delay to allow the polling to pick it up
        setTimeout(() => editorSessions.delete(sessionId), 5000);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
    return;
  }

  // Rehydrate app-server asks after a browser WebSocket reconnect.
  if (url === '/api/pending-asks' && method === 'GET') {
    sendJson(res, 200, {
      pendingAsks: [...pendingCodexAsks.values()].map(pending => ({
        id: pending.id,
        questions: pending.questions,
        threadId: pending.threadId,
        turnId: pending.turnId,
        itemId: pending.itemId,
        createdAt: pending.createdAt,
        timeoutMs: pending.timeoutMs,
        source: 'codex-app-server',
      })),
    });
    return;
  }

  // Legacy ask hook bridge. Current Codex CLI integrations use the app-server
  // server-request path above; retain this endpoint only for older direct-mode
  // installations that may still invoke ask-bridge.js.
  if (url === '/api/ask-hook' && method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1000000) { // 1MB limit (questions may contain large previews)
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Request body too large' }));
        return;
      }
    });
    req.on('end', () => {
      try {
        const { questions } = JSON.parse(body);
        if (!Array.isArray(questions) || questions.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing questions' }));
          return;
        }

        // Cancel any previous pending hook request
        if (pendingAskHook) {
          try {
            if (!pendingAskHook.res.headersSent) {
              pendingAskHook.res.writeHead(409, { 'Content-Type': 'application/json' });
              pendingAskHook.res.end(JSON.stringify({ error: 'Superseded' }));
            }
          } catch {}
          clearTimeout(pendingAskHook.timer);
        }

        const HOOK_TIMEOUT = HOOK_TIMEOUT_MS;
        const timer = setTimeout(() => {
          if (pendingAskHook && pendingAskHook.res === res) {
            pendingAskHook = null;
            try {
              if (!res.headersSent) {
                res.writeHead(408, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Timeout' }));
              }
            } catch {}
            // Broadcast timeout to clients
            if (terminalWss) {
              const tmsg = JSON.stringify({ type: 'ask-hook-timeout' });
              terminalWss.clients.forEach((c) => {
                if (c.readyState === 1) try { c.send(tmsg); } catch {}
              });
            }
          }
        }, HOOK_TIMEOUT);

        pendingAskHook = { questions, res, timer, createdAt: Date.now() };

        // Broadcast to all terminal WS clients
        if (terminalWss) {
          const pmsg = JSON.stringify({ type: 'ask-hook-pending', questions });
          terminalWss.clients.forEach((client) => {
            if (client.readyState === 1) {
              try { client.send(pmsg); } catch {}
            }
          });
        }

        // Handle ask-bridge.js disconnection (use res instead of req — Node.js v24+ fires req 'close' immediately after body is read)
        res.on('close', () => {
          if (pendingAskHook && pendingAskHook.res === res) {
            clearTimeout(pendingAskHook.timer);
            pendingAskHook = null;
            if (terminalWss) {
              const tmsg = JSON.stringify({ type: 'ask-hook-timeout' });
              terminalWss.clients.forEach((c) => {
                if (c.readyState === 1) try { c.send(tmsg); } catch {}
              });
            }
          }
        });
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
    return;
  }

  // Permission hook bridge: receive tool permission request from perm-bridge.js, long-poll for user decision
  if (url === '/api/perm-hook' && method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1000000) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Request body too large' }));
        return;
      }
    });
    req.on('end', () => {
      try {
        const { toolName, input, forceManual = false } = JSON.parse(body);
        if (!toolName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing toolName' }));
          return;
        }


        // In Codex auto-review mode the native reviewer agent owns the decision.
        // A hook with no decision lets Codex continue its normal approval path.
        // Publish commands remain a deliberate human-only safety boundary in
        // every mode and opt out through forceManual.
        if (!forceManual && _codexNativeReviewerAvailable && shouldDeferPermissionHookToCodex(_runtimeApprovalsReviewer)) {
          sendJson(res, 200, { deferToCodex: true });
          return;
        }

        const HOOK_TIMEOUT = HOOK_TIMEOUT_MS;
        const id = `perm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const timer = setTimeout(() => {
          const pending = pendingPermHooks.get(id);
          if (pending) {
            pendingPermHooks.delete(id);
            try {
              if (!res.headersSent) {
                res.writeHead(408, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Timeout' }));
              }
            } catch {}
            if (terminalWss) {
              const tmsg = JSON.stringify({ type: 'perm-hook-timeout', id });
              terminalWss.clients.forEach((c) => {
                if (c.readyState === 1) try { c.send(tmsg); } catch {}
              });
            }
          }
        }, HOOK_TIMEOUT);

        pendingPermHooks.set(id, { id, toolName, input, res, timer, createdAt: Date.now() });

        // Broadcast to all terminal WS clients
        if (terminalWss) {
          const pmsg = JSON.stringify({ type: 'perm-hook-pending', id, toolName, input });
          terminalWss.clients.forEach((client) => {
            if (client.readyState === 1) {
              try { client.send(pmsg); } catch {}
            }
          });
        }

        // Handle perm-bridge.js disconnection
        res.on('close', () => {
          const pending = pendingPermHooks.get(id);
          if (pending) {
            clearTimeout(pending.timer);
            pendingPermHooks.delete(id);
            if (terminalWss) {
              const tmsg = JSON.stringify({ type: 'perm-hook-timeout', id });
              terminalWss.clients.forEach((c) => {
                if (c.readyState === 1) try { c.send(tmsg); } catch {}
              });
            }
          }
        });
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
    return;
  }

  // 读取文件内容 API
  if (url === '/api/file-content' && method === 'GET') {
    const reqPath = parsedUrl.searchParams.get('path');
    const isEditorSession = parsedUrl.searchParams.get('editorSession') === 'true';
    const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
    try {
      const result = readFileContent(cwd, reqPath, isEditorSession);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      const status = ERROR_STATUS_MAP[err.code] || 500;
      const message = status === 500 ? `Cannot read file: ${err.message}` : err.message;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
    }
    return;
  }

  // 返回文件原始二进制内容（用于图片预览等）
  if (url === '/api/file-raw' && (method === 'GET' || method === 'HEAD')) {
    const reqPath = parsedUrl.searchParams.get('path');
    const isEditorSession = parsedUrl.searchParams.get('editorSession') === 'true';
    const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
    let constrainedFd = null;
    try {
      // 上传图片路径（/tmp/cx-viewer-uploads/ 或持久化目录）直接使用，跳过项目目录安全检查
      const uploadPrefix = UPLOAD_DIR + '/';
      const pName = _projectName || 'default';
      const persistPrefix = join(homedir(), '.codex', 'cx-viewer', pName, 'images') + '/';
      let targetFile;
      let constrainedImageRoot = null;
      if (reqPath && reqPath.startsWith(uploadPrefix)) {
        targetFile = resolve(reqPath);
        // 路径穿越防护：resolve 后必须仍在 upload 目录内
        if (!targetFile.startsWith(uploadPrefix)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Path traversal denied' }));
          return;
        }
        // /tmp 原文件不存在时，回退到持久化副本
        if (!existsSync(targetFile)) {
          const fileName = targetFile.split('/').pop();
          const persistFile = join(persistPrefix, fileName);
          if (existsSync(persistFile)) {
            targetFile = persistFile;
            constrainedImageRoot = persistPrefix;
          }
        }
        if (!constrainedImageRoot) constrainedImageRoot = uploadPrefix;
      } else if (reqPath && reqPath.startsWith(persistPrefix)) {
        targetFile = resolve(reqPath);
        // 路径穿越防护：resolve 后必须仍在持久化目录内
        if (!targetFile.startsWith(persistPrefix)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Path traversal denied' }));
          return;
        }
        constrainedImageRoot = persistPrefix;
      } else {
        targetFile = resolveFilePath(cwd, reqPath, isEditorSession);
      }
      if (!existsSync(targetFile)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `File not found: ${targetFile}` }));
        return;
      }
      if (constrainedImageRoot) {
        const rootPath = constrainedImageRoot.endsWith(sep)
          ? constrainedImageRoot.slice(0, -1)
          : constrainedImageRoot;
        // Open the exact final entry without following a symlink, then verify
        // containment and path identity against that same descriptor. Reading
        // from the fd below removes the check-to-open race.
        try {
          constrainedFd = openSync(
            targetFile,
            fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0),
          );
        } catch (error) {
          if (error?.code === 'ELOOP' || error?.code === 'EMLINK') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Symlink escape denied' }));
            return;
          }
          throw error;
        }
        const descriptorStat = fstatSync(constrainedFd);
        const canonicalPath = realpathSync(targetFile);
        const currentPathStat = statSync(canonicalPath);
        if (!isPathContained(canonicalPath, rootPath)
            || descriptorStat.dev !== currentPathStat.dev
            || descriptorStat.ino !== currentPathStat.ino) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Symlink escape denied' }));
          return;
        }
        targetFile = canonicalPath;
      }
      const stat = constrainedFd === null ? statSync(targetFile) : fstatSync(constrainedFd);
      if (!stat.isFile()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not a file' }));
        return;
      }
      if (stat.size > 10 * 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File too large' }));
        return;
      }
      const extMime = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
        '.webp': 'image/webp', '.html': 'text/html', '.htm': 'text/html',
      };
      const ext = (targetFile.match(/\.[^.]+$/) || [''])[0].toLowerCase();
      const mime = extMime[ext] || 'application/octet-stream';
      const data = method === 'HEAD' ? null : readFileSync(constrainedFd === null ? targetFile : constrainedFd);
      const size = method === 'HEAD' ? stat.size : data.length;
      const headers = { 'Content-Type': mime, 'Content-Length': size };
      // 防止用户项目中的恶意 HTML 在同源下执行脚本（XSS 防护）
      if (mime === 'text/html') headers['Content-Security-Policy'] = 'sandbox';
      res.writeHead(200, headers);
      res.end(data);
    } catch (err) {
      const status = ERROR_STATUS_MAP[err.code] || 500;
      const message = status === 500 ? `Cannot read file: ${err.message}` : err.message;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
    } finally {
      if (constrainedFd !== null) {
        try { closeSync(constrainedFd); } catch {}
      }
    }
    return;
  }

  // 保存文件内容 API
  if (url === '/api/file-content' && method === 'POST') {
    const MAX_BODY = 5 * 1024 * 1024; // 5MB，与 GET 路由限制对齐
    let body = '';
    let overflow = false;
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BODY) { overflow = true; req.destroy(); }
    });
    req.on('end', () => {
      if (overflow) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Request body too large' }));
        return;
      }
      try {
        const { path: reqPath, content, editorSession } = JSON.parse(body);
        const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
        const result = writeFileContent(cwd, reqPath, content, editorSession);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, size: result.size }));
      } catch (err) {
        const status = ERROR_STATUS_MAP[err.code] || 500;
        const message = status === 500 ? `Cannot save file: ${err.message}` : err.message;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message }));
      }
    });
    return;
  }

  // CLI 模式检测
  if (url === '/api/cli-mode' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ cliMode: isCliMode, sdkMode: isSdkMode, workspaceMode: isWorkspaceMode && !_workspaceLaunched }));
    return;
  }

  // Git 状态
  // 撤销单个文件的 git 变更
  if (url === '/api/git-restore' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', async () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      try {
        const { path: filePath } = parsed;
        if (!filePath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing path' }));
          return;
        }
        if (filePath.startsWith('/') || filePath.includes('..')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid path' }));
          return;
        }
        const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
        const fullPath = join(cwd, filePath);
        if (existsSync(fullPath)) {
          const realFull = realpathSync(fullPath);
          const realCwd = realpathSync(cwd);
          if (!realFull.startsWith(realCwd + '/')) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Path traversal not allowed' }));
            return;
          }
        }
        // Check if file is untracked
        const { stdout: statusOut } = await execFileAsync('git', ['status', '--porcelain', '--', filePath], { cwd, encoding: 'utf-8', timeout: 5000 });
        const isUntracked = statusOut.trim().startsWith('??');
        if (isUntracked) {
          await execFileAsync('git', ['clean', '-fd', '--', filePath], { cwd, timeout: 10000 });
        } else {
          await execFileAsync('git', ['checkout', '--', filePath], { cwd, timeout: 10000 });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url === '/api/git-status' && method === 'GET') {
    try {
      const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
      const { stdout: output } = await execFileAsync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd, encoding: 'utf-8', timeout: 5000 });
      const lines = output.split('\n').filter(line => line.trim());
      const changes = lines.map(line => {
        const status = line.substring(0, 2).trim();
        let file = line.substring(3).trim();
        // git status --porcelain quotes paths with non-ASCII chars using octal escapes
        if (file.startsWith('"') && file.endsWith('"')) {
          file = file.slice(1, -1)
            .replace(/\\([0-7]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
            .replace(/\\t/g, '\t').replace(/\\n/g, '\n')
            .replace(/\\\\/g, '\\').replace(/\\"/g, '"');
          file = Buffer.from(file, 'latin1').toString('utf8');
        }
        return { status, file };
      });
      const lineStats = await getGitWorkingTreeLineStats(
        cwd,
        changes.filter(change => change.status === '??').map(change => change.file),
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ changes, ...lineStats }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, changes: [] }));
    }
    return;
  }

  // Git diff 数据获取
  if (url.startsWith('/api/git-diff') && method === 'GET') {
    try {
      const cwd = process.env.CXV_PROJECT_DIR || process.cwd();
      const filesParam = parsedUrl.searchParams.get('files');

      if (!filesParam) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing files parameter' }));
        return;
      }

      const files = filesParam.split(',').map(f => f.trim()).filter(Boolean);
      const diffs = await getGitDiffs(cwd, files);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ diffs }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, diffs: [] }));
    }
    return;
  }

  // 插件管理 API
  if (url === '/api/plugins' && method === 'GET') {
    const plugins = getPluginsInfo();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ plugins, pluginsDir: getPluginsDir() }));
    return;
  }

  if (url === '/api/plugins/module' && method === 'GET') {
    try {
      const file = normalizePluginFilename(parsedUrl.searchParams.get('file'));
      if (!file || (extname(file) !== '.js' && extname(file) !== '.mjs')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid plugin filename' }));
        return;
      }
      const filePath = join(getPluginsDir(), file);
      if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Plugin file not found' }));
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(readFileSync(filePath, 'utf-8'));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url === '/api/plugins' && method === 'DELETE') {
    const file = parsedUrl.searchParams.get('file');
    if (!file || file.includes('..') || file.includes('/') || file.includes('\\')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid file name' }));
      return;
    }
    const filePath = join(getPluginsDir(), file);
    try {
      if (!existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File not found' }));
        return;
      }
      const targetPlugin = getPluginsInfo().find(p => p.file === file);
      unlinkSync(filePath);
      if (targetPlugin?.name) removeDisabledPluginNames([targetPlugin.name]);
      await loadPlugins();
      await refreshPluginRuntime();
      const plugins = getPluginsInfo();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, plugins, pluginsDir: getPluginsDir() }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url === '/api/plugins/reload' && method === 'POST') {
    try {
      await loadPlugins();
      await refreshPluginRuntime();
      const plugins = getPluginsInfo();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, plugins, pluginsDir: getPluginsDir() }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url === '/api/plugins/upload' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', async () => {
      try {
        const { files: fileList } = JSON.parse(body);
        uploadPlugins(getPluginsDir(), fileList);
        await loadPlugins();
        await refreshPluginRuntime();
        let plugins = getPluginsInfo();
        const uploadedFiles = new Set((fileList || []).map(file => normalizePluginFilename(file?.name)));
        const uploadedNames = plugins.filter(plugin => uploadedFiles.has(plugin.file)).map(plugin => plugin.name);
        if (removeDisabledPluginNames(uploadedNames)) {
          await loadPlugins();
          await refreshPluginRuntime();
          plugins = getPluginsInfo();
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, plugins, pluginsDir: getPluginsDir() }));
      } catch (err) {
        const status = err.statusCode || 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url === '/api/plugins/install-from-url' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', async () => {
      try {
        const { url: fileUrl } = JSON.parse(body);
        const extractScript = join(__dirname, 'lib', 'extract-plugin-name.mjs');
        const { filename } = await installPluginFromUrl(getPluginsDir(), fileUrl, extractScript);
        await loadPlugins();
        await refreshPluginRuntime();
        let plugins = getPluginsInfo();
        const installedNames = plugins.filter(plugin => plugin.file === filename).map(plugin => plugin.name);
        if (removeDisabledPluginNames(installedNames)) {
          await loadPlugins();
          await refreshPluginRuntime();
          plugins = getPluginsInfo();
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, plugins, pluginsDir: getPluginsDir() }));
      } catch (err) {
        const status = err.statusCode || 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 返回局域网访问地址
  if (url === '/api/local-url' && method === 'GET') {
    const localIp = getLocalIp();
    const defaultUrl = getPublicAccessUrl(localIp);
    const hookResult = await runWaterfallHook('localUrl', {
      url: defaultUrl,
      ip: localIp,
      port: actualPort,
      token: ACCESS_TOKEN,
      protocol: serverProtocol,
      httpUrl: serverProtocol === 'http' ? defaultUrl : null,
      httpsUrl: serverProtocol === 'https' ? defaultUrl : null,
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      url: hookResult.url,
      httpUrl: serverProtocol === 'http' ? defaultUrl : null,
      httpsUrl: serverProtocol === 'https' ? defaultUrl : null,
    }));
    return;
  }

  // 列出本地日志文件（按项目分组，遍历项目子目录）
  if (url === '/api/log-v2/status' && method === 'GET') {
    sendJson(res, 200, getLogV2RuntimeStatus());
    return;
  }

  if (url === '/api/local-logs' && method === 'GET') {
    try {
      const result = _logV2ReadMode === 'v2'
        ? listV2LocalLogs(LOG_DIR, _projectName)
        : listLocalLogs(LOG_DIR, _projectName);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Raw app-server protocol frames are stored separately from the compact business log.
  // Access is granted only through a reference that is present in the selected log.
  if (url === '/api/raw-sidecars' && method === 'GET') {
    const requestedFile = parsedUrl.searchParams.get('file');
    const file = requestedFile || (LOG_FILE ? relative(LOG_DIR, LOG_FILE).split(sep).join('/') : '');
    if (!file || !file.endsWith('.jsonl')) {
      sendJson(res, 400, { error: 'Invalid or unavailable log file' });
      return;
    }
    try {
      sendJson(res, 200, await runRawSidecarWorker({ action: 'list', logDir: LOG_DIR, file }));
    } catch (err) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'ACCESS_DENIED' ? 403 : 500;
      sendJson(res, status, { error: err.message });
    }
    return;
  }

  if (url === '/api/raw-sidecar/frames' && method === 'POST') {
    try {
      const { file: requestedFile, ref, limit } = await readJsonBody(req, 16 * 1024);
      const file = requestedFile || (LOG_FILE ? relative(LOG_DIR, LOG_FILE).split(sep).join('/') : '');
      if (!file || !file.endsWith('.jsonl') || !ref || typeof ref !== 'object'
          || typeof ref.streamId !== 'string' || typeof ref.sidecar !== 'string'
          || !Number.isSafeInteger(ref.fromSeq) || !Number.isSafeInteger(ref.toSeq)) {
        sendJson(res, 400, { error: 'Invalid raw sidecar request' });
        return;
      }
      const page = await runRawSidecarWorker({ action: 'frames', logDir: LOG_DIR, file, ref, limit });
      sendJson(res, 200, page);
    } catch (err) {
      const status = err.status || (err.code === 'NOT_FOUND' ? 404 : err.code === 'ACCESS_DENIED' ? 403 : 500);
      sendJson(res, status, { error: err.message });
    }
    return;
  }

  // 解析上传的 V2 session ZIP，仅用于当前浏览器查看，不写入 LOG_DIR。
  if (url === '/api/parse-log-archive' && method === 'POST') {
    let releaseJob = null;
    let parsed = null;
    try {
      releaseJob = acquireLogArchiveJob();
      // Allow multipart framing beyond the logical ZIP payload limit.
      const upload = await readMultipartUpload(req, LOG_ARCHIVE_LIMITS.compressedBytes + 1024 * 1024);
      parsed = await createV2SessionEntryStream(upload.data, { filename: upload.filename });
      res.writeHead(200, {
        'Content-Type': 'application/x-cxv-log-entries; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Length': parsed.size,
      });
      for await (const chunk of parsed.stream) {
        await writeResponseChunk(res, chunk);
      }
      res.end();
    } catch (err) {
      if (res.headersSent) res.destroy(err);
      else sendApiError(res, err, 'Failed to parse log archive');
    } finally {
      parsed?.dispose();
      releaseJob?.();
    }
    return;
  }

  // 下载指定本地日志。V2 的交换边界是完整 .cxvsession 目录；V1 保持 JSONL。
  if (url === '/api/download-log' && method === 'GET') {
    const file = parsedUrl.searchParams.get('file');
    const v2File = isV2SessionFile(file);
    if (!file || (!v2File && file.includes('..'))) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid file name' }));
      return;
    }
    if (!file.endsWith('.jsonl')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid file type' }));
      return;
    }
    let releaseJob = null;
    try {
      if (v2File) {
        releaseJob = acquireLogArchiveJob();
        const archive = await createV2SessionZip(LOG_DIR, file);
        if (req.aborted || res.destroyed) {
          archive.dispose();
          releaseJob();
          return;
        }
        const encodedName = encodeURIComponent(archive.fileName);
        let cleaned = false;
        const cleanup = () => {
          if (cleaned) return;
          cleaned = true;
          archive.dispose();
          releaseJob();
        };
        archive.stream.once('error', (error) => {
          cleanup();
          if (res.headersSent) res.destroy(error);
          else sendApiError(res, error, 'Failed to create log archive');
        });
        req.once('aborted', () => {
          archive.stream.destroy();
          cleanup();
        });
        archive.stream.once('end', cleanup);
        res.once('close', () => {
          if (!res.writableEnded) archive.stream.destroy();
          cleanup();
        });
        res.writeHead(200, {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${archive.fileName}"; filename*=UTF-8''${encodedName}`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
          'Content-Length': archive.size,
        });
        archive.stream.pipe(res);
        return;
      }
      const realPath = validateLogPath(LOG_DIR, file);
      const fileName = file.split('/').pop();
      const format = parsedUrl.searchParams.get('format');
      // Delta storage: format=raw 下载原始文件；默认下载重建后的全量格式
      if (format === 'raw') {
        const stat = statSync(realPath);
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
          'Content-Length': stat.size,
        });
        const stream = createReadStream(realPath);
        stream.pipe(res);
      } else {
        // 流式下载原始条目（不重建，保持 delta 格式），避免 OOM
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
          'Transfer-Encoding': 'chunked',
        });
        await streamRawEntriesAsync(realPath, (raw) => {
          res.write(raw);
          res.write('\n---\n');
        });
        res.end();
      }
    } catch (err) {
      releaseJob?.();
      if (res.headersSent) res.destroy(err);
      else {
        const status = err?.status
          || (err?.code === 'NOT_FOUND' ? 404 : err?.code === 'ACCESS_DENIED' ? 403 : 500);
        sendApiError(res, Object.assign(err, { status }), 'Failed to download log');
      }
    }
    return;
  }

  // 读取指定本地日志文件（支持 project/file 路径）
  if (url === '/api/local-log' && method === 'GET') {
    const file = parsedUrl.searchParams.get('file');
    if (!file || file.includes('..')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid file name' }));
      return;
    }

    // 验证文件类型：只允许 .jsonl 文件
    if (!file.endsWith('.jsonl')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid file type. Only .jsonl files are allowed.' }));
      return;
    }

    try {
      // 独立 SSE 流：直接向请求方返回 event-stream，不走 /events 广播
      const v2 = isV2SessionFile(file);
      if (v2) {
        res.writeHead(409, {
          'Content-Type': 'application/json',
          'X-CX-Log-Protocol': 'log-v2-wire/2',
        });
        res.end(JSON.stringify({
          error: 'V2 history requires the reference transport',
          code: 'CXV_LOG_V2_PROTOCOL_REQUIRED',
        }));
        return;
      }
      const filePath = validateLogPath(LOG_DIR, file);
      const total = countLogEntries(filePath);

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      res.write(`event: load_start\ndata: ${JSON.stringify({ total, incremental: false })}\n\n`);
      const stream = (callback) => streamRawEntriesAsync(filePath, callback);
      await stream((raw) => {
        res.write('event: load_chunk\ndata: [');
        res.write(raw.includes('\n') ? raw.replace(/\n/g, '') : raw);
        res.write(']\n\n');
      });
      res.write(`event: load_end\ndata: {}\n\n`);
      res.end();
    } catch (err) {
      // 如果 headers 未发送，返回 JSON 错误；否则关闭连接
      if (!res.headersSent) {
        const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'ACCESS_DENIED' ? 403 : 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      } else {
        res.end();
      }
    }
    return;
  }

  // 删除日志文件
  // 清除当前日志文件内容
  if (url === '/api/clear-current-log' && method === 'POST') {
    try {
      if (LOG_FILE && existsSync(LOG_FILE)) {
        const file = relative(LOG_DIR, LOG_FILE).split(sep).join('/');
        const { previousStreamId } = resetRawCaptureBoundary();
        clearRawSidecarsForLog(LOG_DIR, file, { additionalStreamIds: [previousStreamId] });
        writeFileSync(LOG_FILE, '');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, file: LOG_FILE }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, file: null }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url === '/api/delete-logs' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      try {
        const { files } = JSON.parse(body);
        if (!Array.isArray(files) || files.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No files specified' }));
          return;
        }
        const results = deleteLogFiles(LOG_DIR, files);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ results }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // GET /api/concept?lang=zh&doc=Tool-shell_command
  if (method === 'GET' && url === '/api/concept') {
    const lang = parsedUrl.searchParams.get('lang') || 'zh';
    const doc = parsedUrl.searchParams.get('doc') || '';
    // 安全校验：工具名允许下划线；仍禁止路径分隔符和其他特殊字符
    if (!/^[a-zA-Z0-9_-]+$/.test(doc) || !/^[a-z]{2}(-[a-zA-Z]{2,})?$/.test(lang)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid parameters' }));
      return;
    }
    let mdPath = join(__dirname, 'concepts', lang, `${doc}.md`);
    if (!existsSync(mdPath)) {
      const fallbackLangs = (doc === 'Tools' || doc.startsWith('Tool-'))
        ? (lang === 'zh-TW' ? ['zh', 'en'] : ['en', 'zh'])
        : ['zh'];
      for (const fallbackLang of fallbackLangs) {
        if (fallbackLang === lang) continue;
        const fallbackPath = join(__dirname, 'concepts', fallbackLang, `${doc}.md`);
        if (existsSync(fallbackPath)) {
          mdPath = fallbackPath;
          break;
        }
      }
    }
    if (existsSync(mdPath)) {
      const content = readFileSync(mdPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
      res.end(content);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
    return;
  }

  // CXV 进程列表
  if (url === '/api/cxv-processes' && method === 'GET') {
    if (platform() === 'win32') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ processes: [] }));
      return;
    }
    try {
      const { stdout } = await execAsync('lsof -iTCP:7008-7099 -sTCP:LISTEN -P -n', { timeout: 5000 }).catch(() => ({ stdout: '' }));
      const lines = stdout.trim().split('\n').filter(Boolean);
      // Parse lsof output: skip header, filter node processes, dedupe by PID:port
      const seen = new Map(); // pid -> port
      for (const line of lines.slice(1)) {
        const parts = line.trim().split(/\s+/);
        const cmd = parts[0];
        if (cmd !== 'node') continue;
        const pid = parseInt(parts[1], 10);
        if (!pid) continue;
        // lsof 输出: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME (STATE)
        // 端口在 NAME 列（倒数第二列），如 *:7008，最后一列是 (LISTEN)
        const nameField = parts[parts.length - 2] || '';
        const portMatch = nameField.match(/:(\d+)$/);
        if (!portMatch) continue;
        const port = portMatch[1];
        if (!seen.has(pid)) seen.set(pid, port);
      }
      // 获取所有候选进程的 PPID，过滤掉 PPID 也在 CXV 进程集合中的子进程（即 cxv -c/-d 启动的 codex 子进程）
      const cxvPids = new Set(seen.keys());
      const filteredPids = [];
      for (const [pid] of seen) {
        try {
          const { stdout: ppidOut } = await execAsync(`ps -o ppid= -p ${pid}`, { timeout: 2000 }).catch(() => ({ stdout: '' }));
          const ppid = parseInt(ppidOut.trim(), 10);
          if (ppid && cxvPids.has(ppid)) continue; // 是某个 CXV 进程的子进程，跳过
        } catch {}
        filteredPids.push(pid);
      }
      const processes = [];
      for (const pid of filteredPids) {
        const port = seen.get(pid);
        let startTime = '';
        let command = '';
        try {
          const { stdout: psOut } = await execAsync(`ps -p ${pid} -o lstart=,command=`, { timeout: 3000 }).catch(() => ({ stdout: '' }));
          const psLine = psOut.trim();
          // lstart format: "Day Mon DD HH:MM:SS YYYY rest..."
          const lsMatch = psLine.match(/^\w+\s+(\w+)\s+(\d+)\s+([\d:]+)\s+(\d{4})\s+(.*)/);
          if (lsMatch) {
            const months = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
            const mon = String(months[lsMatch[1]] || 1).padStart(2, '0');
            const day = String(lsMatch[2]).padStart(2, '0');
            const time = lsMatch[3];
            const year = lsMatch[4];
            startTime = `${year}年${mon}月${day}日 ${time}`;
            const rawCmd = lsMatch[5];
            // Extract path after lib/ (e.g. node_modules/cx-viewer/cli.js -d → cx-viewer/cli.js -d)
            const libMatch = rawCmd.match(/lib\/(.+)/);
            command = libMatch ? libMatch[1] : rawCmd;
          }
        } catch {}
        const isCurrent = pid === process.pid;
        processes.push({ port, pid, command, startTime, isCurrent });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ processes }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // CXV 进程关闭
  if (url === '/api/cxv-processes/kill' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', async () => {
      try {
        const { pid } = JSON.parse(body);
        if (!Number.isInteger(pid) || pid <= 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid PID' }));
          return;
        }
        if (pid === process.pid) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Cannot kill current process' }));
          return;
        }
        // 安全检查：确认是监听 CXV 端口范围 (7008-7099) 的 node 进程
        const { stdout: lsofOut } = await execAsync(`lsof -iTCP:7008-7099 -sTCP:LISTEN -P -n -p ${pid}`, { timeout: 5000 }).catch(() => ({ stdout: '' }));
        const lsofLines = lsofOut.trim().split('\n').filter(Boolean).slice(1);
        const isNodeOnCxvPort = lsofLines.some(line => line.trim().split(/\s+/)[0] === 'node');
        if (!isNodeOnCxvPort) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not a CXV process' }));
          return;
        }
        process.kill(pid, 'SIGTERM');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 静态文件服务
  if (method === 'GET') {
    let filePath = url === '/' ? '/index.html' : url;
    // 去掉 query string
    filePath = filePath.split('?')[0];

    const fullPath = join(__dirname, 'dist', filePath);

    try {
      if (existsSync(fullPath) && statSync(fullPath).isFile()) {
        const content = readFileSync(fullPath);
        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
        return;
      }
    } catch (err) {
      // fall through to SPA fallback
    }

    // SPA fallback: 非 API/非静态文件请求返回 index.html
    try {
      const indexPath = join(__dirname, 'dist', 'index.html');
      const html = readFileSync(indexPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      res.writeHead(404);
      res.end('Not Found');
    }
    return;
  }

  // 非 GET 请求的 API 404
  if (url.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
}

export async function startViewer() {
  pluginRoutes = [];
  // 加载插件（需要在创建服务器之前，以便通过 hook 获取 HTTPS 证书）
  await loadPlugins();

  // 通过插件 hook 获取 HTTPS 证书选项
  let httpsOptions = null;
  let httpsFromPlugin = false;
  try {
    const httpsResult = await runWaterfallHook('httpsOptions', {});
    httpsOptions = (httpsResult.pfx || httpsResult.cert) ? httpsResult : null;
    httpsFromPlugin = !!httpsOptions;
  } catch (err) {
    console.error('[CX Viewer] httpsOptions hook error:', err.message);
  }

  // 非 CLI 服务可在同一个主端口上使用 HTTPS；CLI 始终只保留 HTTP 主端口。
  if (!httpsOptions && !isCliMode) {
    try {
      const { generateKeyPairSync, createSign, X509Certificate } = await import('node:crypto');
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      // 用 node:tls 的 createSecureContext 验证 key 可用性
      // 生成自签名证书（简化版：直接用 key + cert）
      const { execSync: _execSync } = await import('node:child_process');
      const certDir = join(homedir(), '.codex', 'cx-viewer');
      const keyPath = join(certDir, 'selfsigned.key');
      const certPath = join(certDir, 'selfsigned.crt');
      // 检查已有证书是否过期或不存在
      let needGen = !existsSync(keyPath) || !existsSync(certPath);
      if (!needGen) {
        try {
          const certPem = readFileSync(certPath, 'utf-8');
          const x509 = new X509Certificate(certPem);
          needGen = new Date(x509.validTo) < new Date();
        } catch { needGen = true; }
      }
      if (needGen) {
        mkdirSync(certDir, { recursive: true });
        _execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=localhost"`, { stdio: 'ignore', timeout: 10000 });
      }
      if (existsSync(keyPath) && existsSync(certPath)) {
        httpsOptions = { key: readFileSync(keyPath), cert: readFileSync(certPath) };
      }
    } catch (err) {
      // openssl 不可用或生成失败，继续用 HTTP
      if (process.env.CXV_DEBUG) console.error('[CX Viewer] Self-signed cert generation failed:', err.message);
    }
  }

  const useHttps = !!httpsOptions && !isCliMode;
  const protocol = useHttps ? 'https' : 'http';
  serverProtocol = protocol;
  if (useHttps) console.error(httpsFromPlugin ? '[CX Viewer] HTTPS mode enabled via plugin hook' : '[CX Viewer] HTTPS mode enabled via self-signed certificate');

  return new Promise((resolve, reject) => {
    function tryListen(port) {
      if (port > MAX_PORT) {
        console.error(t('server.portsBusy', { start: START_PORT, end: MAX_PORT }));
        resolve(null);
        return;
      }

      // 先检测 127.0.0.1:port 是否已被占用（避免 0.0.0.0 和 127.0.0.1 绑定不冲突的问题）
      const probe = createConnection({ host: '127.0.0.1', port });
      probe.on('connect', () => {
        probe.destroy();
        tryListen(port + 1); // 端口已被占用，尝试下一个
      });
      probe.on('error', () => {
        probe.destroy();
        // 端口空闲，绑定
        let currentServer;
        if (useHttps) {
          try {
            currentServer = createHttpsServer(httpsOptions, handleRequest);
          } catch (err) {
            console.error('[CX Viewer] HTTPS server creation failed, falling back to HTTP:', err.message);
            currentServer = createServer(handleRequest);
            serverProtocol = 'http';
          }
        } else {
          currentServer = createServer(handleRequest);
        }

        currentServer.listen(port, HOST, async () => {
          server = currentServer;
          actualPort = port;
          const url = `${serverProtocol}://127.0.0.1:${port}`;
          if (!isCliMode) {
            console.error(t('server.started'));
            console.error(t('server.startedLocal', { protocol: serverProtocol, port }));
            const _ips = getAllLocalIps();
            for (const _ip of _ips) {
              console.error(t('server.startedNetwork', { protocol: serverProtocol, ip: _ip, port, token: ACCESS_TOKEN }));
            }
          }
          // v2.0.69 之前的版本会清空控制台，自动打开浏览器确保用户能看到界面
          if (!isCliMode) {
            try {
              const ccPkgPath = join(__dirname, '..', '@openai', 'codex', 'package.json');
              const ccVer = JSON.parse(readFileSync(ccPkgPath, 'utf-8')).version;
              const [maj, min, pat] = ccVer.split('.').map(Number);
              if (maj < 2 || (maj === 2 && min === 0 && pat < 69)) {
                const cmd = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'start' : 'xdg-open';
                execAsync(`${cmd} ${url}`, { timeout: 5000 }).catch(() => {});
              }
            } catch { }
          }
          // 工作区模式下延迟到选择工作区后再启动监听
          if (!isWorkspaceMode) {
            startWatching(_logWatcherOpts(LOG_FILE));
            startStatsWorker();
            startStreamingStatusTimer();
          }
          // CLI 模式下启动 WebSocket 服务 (必须 await，否则插件 hook 拿不到 upgrade listeners)
          if (isCliMode) {
            await setupTerminalWebSocket(currentServer);
          }
          // 通知插件服务器已启动
          refreshPluginRuntime()
            .catch(err => console.error('[CX Viewer] Plugin serverStarted hook error:', err.message));
          resolve(server);
        });

        currentServer.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            tryListen(port + 1);
          } else {
            reject(err);
          }
        });
      });
    }

    tryListen(START_PORT);
  });
}

async function setupTerminalWebSocket(httpServer) {
  try {
    const { WebSocketServer } = await import('ws');
    const { writeToPty, writeToPtySequential, resizePty, onPtyData, onPtyRawData, onPtyGeometry, onPtyState, onPtyExit, getPtyState, getReconnectSnapshot, getCurrentWorkspace, requestPtySnapshot, spawnShell } = await import('./pty-manager.js');
    _onPtyData = (cb) => onPtyRawData(event => cb(event.data, event));
    const wss = new WebSocketServer({ noServer: true, maxPayload: 2 * 1024 * 1024 });
    const scratchWss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });
    terminalWss = wss;
    scratchTerminalWss = scratchWss;
    const DATA_HIGH_WATER = 2 * 1024 * 1024;
    const DATA_LOW_WATER = 512 * 1024;
    const BEHIND_RETRY_MIN_MS = 50;
    const BEHIND_RETRY_MAX_MS = 1000;
    const MAX_TERMINAL_CONNECTIONS = 32;
    const MAX_TERMINAL_CONNECTIONS_PER_IP = 8;
    const TERMINAL_RATE_WINDOW_MS = 1000;
    const terminalConnectionsByIp = new Map();
    const RESYNC_REASONS = new Set([
      'initial', 'requested', 'mount', 'congestion', 'parse-error', 'behind',
      'process-exit', 'resume-quiet', 'resume-absolute', 'resume-process-exit',
      'resume-input-progress',
      'resume-exit-diagnostic', 'resume-worker-failure', 'resume-unsafe',
    ]);
    const publishedWireCache = new WeakMap();
    _writeToPty = writeToPty;

    const normalizeResyncReason = (reason) => (
      typeof reason === 'string' && RESYNC_REASONS.has(reason) ? reason : 'requested'
    );

    // pty-manager already commits bounded frames and owns their sequence.
    // Encode each immutable commit once, then fan it out without introducing
    // a second split/sequence layer in the WebSocket server.
    const encodePublishedFrame = (data, meta) => {
      const cached = publishedWireCache.get(meta);
      if (cached) return cached;
      const payload = JSON.stringify({
        type: 'data', streamId: meta.streamId, seq: meta.seq, data,
      });
      const frame = { payload, bytes: Buffer.byteLength(payload) };
      publishedWireCache.set(meta, frame);
      return frame;
    };

    // 多客户端共享 PTY 的尺寸冲突解决：
    // 移动端优先——只要有移动端在线，PTY 始终使用移动端尺寸，
    // PC 端的 resize 仅存储不生效，避免宽屏尺寸导致移动端乱码。
    // PC 端显示窄输出但完全可读，移动端永远不会乱码。
    let activeWs = null;              // 当前活跃的 WebSocket 连接
    const clientSizes = new Map();    // ws → { cols, rows }
    const mobileClients = new Set();  // 移动端连接集合

    // 找到一个在线的移动端并返回其尺寸
    const getMobileSize = () => {
      for (const mws of mobileClients) {
        if (mws.readyState === 1) {
          const size = clientSizes.get(mws);
          if (size) return size;
        }
      }
      return null;
    };

    httpServer.on('upgrade', (req, socket, head) => {
      const wsUrl = new URL(req.url, `${serverProtocol}://${req.headers.host}`);
      const pathname = wsUrl.pathname;
      const remoteIp = req.socket.remoteAddress;
      const isLoopbackPeer = remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp === '::ffff:127.0.0.1';
      const wsOrigin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
      const wsHost = typeof req.headers.host === 'string' ? req.headers.host : '';
      const wsSameOrigin = !!wsOrigin && isSameOriginRequest(wsOrigin, wsHost, serverProtocol);
      if (wsOrigin && !wsSameOrigin) {
        socket.destroy();
        return;
      }
      // Browser WebSockets must be same-origin even over loopback. Header-less
      // native clients use an explicit token/session instead of ambient trust.
      const isLocal = isLoopbackPeer && isLoopbackHost(wsHost) && wsSameOrigin;
      const currentAuthConfig = getAuthConfig();
      const cookieToken = parseCookies(req.headers.cookie).cxv_auth;
      const authDecision = decideAuth({
        isStaticAsset: false,
        pathname,
        isLocal,
        urlToken: wsUrl.searchParams.get('token'),
        cookieToken,
        accessToken: ACCESS_TOKEN,
        sessionToken: isAuthSessionValid(cookieToken) ? cookieToken : '',
        enabled: currentAuthConfig.enabled,
        password: currentAuthConfig.password,
        wantsHtml: false,
        passwordLoginAvailable: serverProtocol === 'https',
        allowPasswordless: false,
      });
      if (authDecision.action !== 'allow') {
        socket.destroy();
        return;
      }
      if (pathname === '/ws/terminal') {
        if (wss.clients.size + scratchWss.clients.size >= MAX_TERMINAL_CONNECTIONS) {
          socket.destroy();
          return;
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      } else if (pathname === '/ws/terminal-scratch') {
        const scratchId = wsUrl.searchParams.get('id') || '';
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(scratchId)
          || wss.clients.size + scratchWss.clients.size >= MAX_TERMINAL_CONNECTIONS) {
          socket.destroy();
          return;
        }
        scratchWss.handleUpgrade(req, socket, head, (ws) => {
          scratchWss.emit('connection', ws, req);
        });
      } else {
        socket.destroy();
      }
    });

    scratchWss.on('connection', async (ws, req) => {
      const connectionIp = req.socket.remoteAddress || 'unknown';
      const ipConnections = (terminalConnectionsByIp.get(connectionIp) || 0) + 1;
      terminalConnectionsByIp.set(connectionIp, ipConnections);
      if (ipConnections > MAX_TERMINAL_CONNECTIONS_PER_IP) {
        terminalConnectionsByIp.set(connectionIp, ipConnections - 1);
        ws.close(1013, 'too many terminal connections');
        return;
      }

      let cleaned = false;
      let session = null;
      let removeData = null;
      let removeExit = null;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        try { removeData?.(); } catch {}
        try { removeExit?.(); } catch {}
        session?.detach();
        const remaining = (terminalConnectionsByIp.get(connectionIp) || 1) - 1;
        if (remaining > 0) terminalConnectionsByIp.set(connectionIp, remaining);
        else terminalConnectionsByIp.delete(connectionIp);
      };
      const safeSend = message => {
        if (ws.readyState !== 1) return false;
        try { ws.send(JSON.stringify(message)); return true; } catch { return false; }
      };
      ws.once('close', cleanup);
      ws.on('error', () => {});

      const scratchUrl = new URL(req.url, `${serverProtocol}://${req.headers.host}`);
      const scratchId = scratchUrl.searchParams.get('id') || '';
      try {
        session = await openScratchPty(scratchId, {
          cwd: getCurrentWorkspace().cwd || process.cwd(),
        });
      } catch (error) {
        if (process.env.CXV_DEBUG) console.warn('[CX Viewer] scratch PTY spawn failed:', error.message);
        if (ws.readyState === 1) ws.close(1011, 'scratch shell unavailable');
        cleanup();
        return;
      }
      if (!session) {
        if (ws.readyState === 1) ws.close(1008, 'invalid scratch id');
        cleanup();
        return;
      }
      session.attach();
      if (cleaned || ws.readyState !== 1) {
        session.detach();
        return;
      }

      removeData = session.onData(data => safeSend({ type: 'data', data }));
      removeExit = session.onExit(exitCode => safeSend({ type: 'exit', exitCode }));
      safeSend({ type: 'state', running: !session.exited, shellBasename: session.shellBasename });
      safeSend({ type: 'data-resync', data: session.replay });

      let rateWindowStartedAt = Date.now();
      let messageCount = 0;
      let inputBytes = 0;
      ws.on('message', raw => {
        try {
          const now = Date.now();
          if (now - rateWindowStartedAt >= TERMINAL_RATE_WINDOW_MS) {
            rateWindowStartedAt = now;
            messageCount = 0;
            inputBytes = 0;
          }
          if (++messageCount > 240) {
            ws.close(1008, 'scratch message rate exceeded');
            return;
          }
          const msg = JSON.parse(raw.toString());
          if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return;
          if (msg.type === 'input') {
            if (typeof msg.data !== 'string') return;
            const bytes = Buffer.byteLength(msg.data, 'utf8');
            inputBytes += bytes;
            if (bytes > 1024 * 1024 || inputBytes > 2 * 1024 * 1024) {
              ws.close(1008, 'scratch input rate exceeded');
              return;
            }
            session.write(msg.data);
          } else if (msg.type === 'resize') {
            if (!Number.isSafeInteger(msg.cols) || msg.cols < 2 || msg.cols > 500
              || !Number.isSafeInteger(msg.rows) || msg.rows < 1 || msg.rows > 300) return;
            session.resize(msg.cols, msg.rows);
          } else if (msg.type === 'resync-request') {
            safeSend({ type: 'data-resync', data: session.replay });
          } else if (msg.type === 'kill') {
            killScratchPty(scratchId);
          }
        } catch {}
      });
    });

    wss.on('connection', (ws, req) => {
      const connectionIp = req.socket.remoteAddress || 'unknown';
      const ipConnections = (terminalConnectionsByIp.get(connectionIp) || 0) + 1;
      terminalConnectionsByIp.set(connectionIp, ipConnections);
      if (ipConnections > MAX_TERMINAL_CONNECTIONS_PER_IP) {
        terminalConnectionsByIp.set(connectionIp, ipConnections - 1);
        ws.close(1013, 'too many terminal connections');
        return;
      }
      let behind = false;
      let behindTimer = null;
      let behindRetryDelayMs = BEHIND_RETRY_MIN_MS;
      // Resync is connection-owned state. While it is pending this connection
      // receives no incremental data; the shared canonical snapshot advances
      // through every suppressed sequence before live delivery resumes.
      let pendingResyncReason = null;
      let snapshotInFlight = false;
      let resyncGeneration = 0;
      let initialSnapshotTimer = null;
      const sequentialCancels = new Set();
      let rateWindowStartedAt = Date.now();
      const rateCounters = { messages: 0, wireBytes: 0, inputBytes: 0, resize: 0, resync: 0 };

      const consumeRate = (name, amount, limit) => {
        const now = Date.now();
        if (now - rateWindowStartedAt >= TERMINAL_RATE_WINDOW_MS) {
          rateWindowStartedAt = now;
          for (const key of Object.keys(rateCounters)) rateCounters[key] = 0;
        }
        rateCounters[name] += amount;
        if (rateCounters[name] <= limit) return true;
        try { ws.close(1008, `terminal ${name} rate exceeded`); } catch { }
        return false;
      };

      const safeSend = (frame) => {
        if (ws.readyState !== 1) return false;
        try {
          const payload = typeof frame === 'string' ? frame : JSON.stringify(frame);
          ws.send(payload, (error) => {
            if (error && process.env.CXV_DEBUG) console.warn('[CX Viewer] terminal ws send failed:', error.message);
            if (!error && behind && ws.bufferedAmount <= DATA_LOW_WATER) {
              wakeBehindRecovery();
            }
          });
          return true;
        } catch {
          return false;
        }
      };

      function terminateResyncIntent() {
        pendingResyncReason = null;
        snapshotInFlight = false;
        resyncGeneration++;
      }

      function completeResyncIntent() {
        // This is called only after safeSend accepted the one authoritative
        // data-resync frame for the pending intent.
        terminateResyncIntent();
      }

      function scheduleBehindRecovery(delayOverride = null) {
        if (behindTimer || ws.readyState !== 1) return;
        const delay = delayOverride == null ? behindRetryDelayMs : delayOverride;
        if (delayOverride == null) {
          behindRetryDelayMs = Math.min(BEHIND_RETRY_MAX_MS, behindRetryDelayMs * 2);
        }
        behindTimer = setTimeout(() => {
          behindTimer = null;
          if (ws.readyState !== 1) return;
          if (ws.bufferedAmount > DATA_LOW_WATER) {
            scheduleBehindRecovery();
            return;
          }
          behind = false;
          behindRetryDelayMs = BEHIND_RETRY_MIN_MS;
          driveResyncIntent();
        }, delay);
        behindTimer.unref?.();
      }

      function wakeBehindRecovery() {
        if (!behind || ws.readyState !== 1 || ws.bufferedAmount > DATA_LOW_WATER) return;
        if (behindTimer) clearTimeout(behindTimer);
        behindTimer = null;
        scheduleBehindRecovery(0);
      }

      const snapshotFrame = (snapshot, reason) => ({
        type: 'data-resync',
        reason: normalizeResyncReason(reason),
        streamId: snapshot.streamId,
        throughSeq: snapshot.throughSeq,
        resizeGeneration: snapshot.resizeGeneration,
        cols: snapshot.cols,
        rows: snapshot.rows,
        data: snapshot.data || '',
        ...(snapshot.fallback ? { degraded: true } : {}),
      });

      const encodeSnapshotFrame = (snapshot, reason) => {
        const payload = JSON.stringify(snapshotFrame(snapshot, reason));
        return { payload, bytes: Buffer.byteLength(payload) };
      };

      const snapshotCanResync = snapshot => Boolean(
        snapshot?.reconnectSafe && (snapshot.authoritative || snapshot.fallback),
      );

      const degradedResyncSnapshot = snapshot => ({
        ...snapshot,
        authoritative: false,
        fallback: true,
        reconnectSafe: true,
        data: '\x1bc\r\n[CX Viewer] terminal state could not be replayed exactly; live output continues\r\n',
      });

      function sendPendingSnapshot(snapshot) {
        if (!pendingResyncReason || !snapshotCanResync(snapshot)) return false;
        const frame = encodeSnapshotFrame(snapshot, pendingResyncReason);
        if (behind || ws.bufferedAmount + frame.bytes > DATA_HIGH_WATER) {
          behind = true;
          scheduleBehindRecovery();
          return false;
        }
        const sent = safeSend(frame.payload);
        if (sent) completeResyncIntent();
        else if (ws.readyState !== 1) terminateResyncIntent();
        return sent;
      }

      function beginSnapshotAttempt() {
        if (!pendingResyncReason || snapshotInFlight) return;
        snapshotInFlight = true;
        const generation = resyncGeneration;
        let snapshotPromise;
        try {
          snapshotPromise = requestPtySnapshot();
        } catch {
          snapshotInFlight = false;
          return;
        }
        const settle = (success) => {
          if (generation !== resyncGeneration) return;
          snapshotInFlight = false;
          if (!pendingResyncReason || ws.readyState !== 1) return;
          const snapshot = getReconnectSnapshot();
          if ((success || snapshot.fallback) && sendPendingSnapshot(snapshot)) return;
          if (!success && getPtyState().running) {
            sendPendingSnapshot(degradedResyncSnapshot(snapshot));
            return;
          }
          if (!getPtyState().running && !snapshotCanResync(snapshot)) {
            terminateResyncIntent();
            return;
          }
          // No immediate retry loop: a failed/unsafe cut sleeps until a later
          // PTY output or geometry event provides a genuinely newer boundary.
        };
        void Promise.resolve(snapshotPromise).then(
          success => settle(success === true),
          () => settle(false),
        );
      }

      function driveResyncIntent() {
        if (!pendingResyncReason) return false;
        if (ws.readyState !== 1) {
          terminateResyncIntent();
          return false;
        }
        const snapshot = getReconnectSnapshot();
        if (snapshotCanResync(snapshot)) {
          return sendPendingSnapshot(snapshot);
        }
        if (!getPtyState().running) {
          terminateResyncIntent();
          return false;
        }
        if (behind || ws.bufferedAmount > DATA_HIGH_WATER) {
          behind = true;
          scheduleBehindRecovery();
          return false;
        }
        // Resume owns its privacy gate. Until that gate has explicitly
        // published a reconnect-safe baseline, never serialize or expose a
        // merely cached snapshot of the suppressed history.
        if (snapshot.recovering) return false;
        beginSnapshotAttempt();
        return false;
      }

      function wakeResyncIntent() {
        if (pendingResyncReason) driveResyncIntent();
      }

      function queueResyncIntent(reason) {
        if (initialSnapshotTimer) {
          clearTimeout(initialSnapshotTimer);
          initialSnapshotTimer = null;
        }
        // Coalesce duplicate requests into one reset. The first reason belongs
        // to the unresolved intent and cannot be overwritten by congestion or
        // a later retry from another source.
        if (!pendingResyncReason) {
          pendingResyncReason = normalizeResyncReason(reason);
        }
        return driveResyncIntent();
      }

      const sendTerminalSnapshot = reason => (
        ws.readyState === 1 ? queueResyncIntent(reason) : false
      );

      // 发送当前 PTY 状态
      const state = getPtyState();
      let connectionStreamId = state.streamId;
      safeSend({ type: 'state', ...state });
      // Give modern clients one short handshake window to send their measured
      // grid and explicit resync. Legacy/native clients still receive one
      // initial snapshot, but the browser no longer deterministically replays
      // a throwaway 120x30 baseline before its first resize.
      initialSnapshotTimer = setTimeout(() => {
        initialSnapshotTimer = null;
        sendTerminalSnapshot('initial');
      }, 25);
      initialSnapshotTimer.unref?.();

      // PTY 输出 → WebSocket
      const removeDataListener = onPtyData((data, meta = {}) => {
        if (ws.readyState !== 1) return;
        if (meta.snapshot) {
          // Resume may remain privacy-gated after publishing a bounded visible
          // screen. Forward that exact snapshot directly; do not fetch another
          // snapshot through getOutputSnapshot(), whose recovering flag remains
          // true until an explicit input/output boundary or process exit.
          const reason = pendingResyncReason || meta.reason;
          const frame = encodeSnapshotFrame({ ...meta, data }, reason);
          if (behind || ws.bufferedAmount + frame.bytes > DATA_HIGH_WATER) {
            behind = true;
            queueResyncIntent('behind');
            scheduleBehindRecovery();
            return;
          }
          const sent = safeSend(frame.payload);
          if (sent && pendingResyncReason) completeResyncIntent();
          return;
        }

        // Never mix deltas into a connection that is waiting for a baseline.
        // The pty-manager snapshot capture appends these exact sequences and
        // publishes throughSeq at the current cut.
        if (pendingResyncReason) {
          wakeResyncIntent();
          return;
        }

        const frame = encodePublishedFrame(data, meta);
        if (behind || ws.bufferedAmount + frame.bytes > DATA_HIGH_WATER) {
          behind = true;
          queueResyncIntent('behind');
          scheduleBehindRecovery();
          return;
        }
        safeSend(frame.payload);
      });

      // A real client-driven PTY resize advances the canonical model's
      // generation. Broadcast geometry immediately and wake dormant unsafe
      // resync intents; recovery itself never calls proc.resize().
      const removeGeometryListener = onPtyGeometry((geometry) => {
        if (ws.readyState !== 1) return;
        safeSend({ type: 'geometry', ...geometry });
        wakeResyncIntent();
      });

      // Process replacement is a protocol boundary even when the new PTY is
      // initially silent. Cancel any old-stream intent, publish state first,
      // then request an empty/current canonical snapshot for the new stream so
      // the browser cannot retain the previous screen indefinitely.
      const removeStateListener = onPtyState((nextState) => {
        if (ws.readyState !== 1) return;
        const isNewRunningStream = nextState.running
          && nextState.streamId !== connectionStreamId;
        connectionStreamId = nextState.streamId;
        terminateResyncIntent();
        safeSend({
          type: 'state',
          ...nextState,
        });
        if (isNewRunningStream) queueResyncIntent('initial');
      });

      // PTY 退出 → WebSocket
      const removeExitListener = onPtyExit((exitCode, meta = {}) => {
        terminateResyncIntent();
        if (behindTimer) clearTimeout(behindTimer);
        behindTimer = null;
        behind = false;
        if (ws.readyState === 1) {
          safeSend({ type: 'exit', exitCode, ...meta });
        }
      });

      // WebSocket → PTY
      ws.on('message', async (raw) => {
        try {
          const rawBytes = Buffer.isBuffer(raw) ? raw.byteLength : Buffer.byteLength(String(raw));
          if (!consumeRate('messages', 1, 240)
            || !consumeRate('wireBytes', rawBytes, 4 * 1024 * 1024)) return;
          const msg = JSON.parse(raw.toString());
          if (!msg || typeof msg !== 'object' || Array.isArray(msg) || typeof msg.type !== 'string') return;
          if (msg.type === 'input') {
            if (typeof msg.data !== 'string' || Buffer.byteLength(msg.data, 'utf8') > 1024 * 1024) return;
            if (!consumeRate('inputBytes', Buffer.byteLength(msg.data, 'utf8'), 2 * 1024 * 1024)) return;
            // PTY 已退出时，自动 spawn 交互式 shell
            const state = getPtyState();
            if (!state.running) {
              try {
                await spawnShell();
              } catch {}
            }
            // 发送 input 的客户端成为活跃客户端
            if (activeWs !== ws) {
              activeWs = ws;
              // 切换活跃客户端时，如果有移动端在线则保持移动端尺寸，
              // 否则切换到新活跃客户端的尺寸
              const mSize = getMobileSize();
              if (mSize) {
                resizePty(mSize.cols, mSize.rows);
              } else {
                const size = clientSizes.get(ws);
                if (size) {
                  resizePty(size.cols, size.rows);
                }
              }
            }
            // 拦截连续 Ctrl+C：2秒内连按2次则阻止并提醒，避免误退出 CLI
            if (msg.data === '\x03') {
              const now = Date.now();
              if (!ws._ctrlCLastTime) ws._ctrlCLastTime = 0;
              if (now - ws._ctrlCLastTime < 2000) {
                ws._ctrlCLastTime = 0;
                try { ws.send(JSON.stringify({ type: 'toast', message: t('ui.terminal.ctrlCBlocked') })); } catch {}
                // 不发送第二次 Ctrl+C 到 PTY
              } else {
                ws._ctrlCLastTime = now;
                writeToPty(msg.data);
              }
            } else {
              writeToPty(msg.data);
            }
          } else if (msg.type === 'input-sequential') {
            // Programmatic navigation is globally serialized by pty-manager.
            // Ordinary keyboard input intentionally remains real-time and may
            // preempt automation; it is never queued behind these jobs.
            const seq = typeof msg.seq === 'string'
              && Buffer.byteLength(msg.seq, 'utf8') <= 256
              ? msg.seq
              : null;
            const finishInvalid = error => safeSend({
              type: 'input-sequential-done', seq, ok: false, error,
            });
            if (!seq) {
              finishInvalid('invalid-seq');
              return;
            }
            const state = getPtyState();
            if (!state.running) {
              try { await spawnShell(); } catch {}
            }
            const chunks = msg.chunks;
            const chunksValid = Array.isArray(chunks) && chunks.length > 0 && chunks.length <= 512
              && chunks.every(chunk => typeof chunk === 'string')
              && chunks.reduce((sum, chunk) => sum + Buffer.byteLength(chunk, 'utf8'), 0) <= 1024 * 1024;
            const settleMs = Number(msg.settleMs ?? 150);
            if (!chunksValid || !Number.isFinite(settleMs) || settleMs < 0 || settleMs > 2000) {
              finishInvalid(!chunksValid ? 'invalid-chunks' : 'invalid-settle');
              return;
            }
            const sequentialBytes = chunks.reduce(
              (sum, chunk) => sum + Buffer.byteLength(chunk, 'utf8'),
              0,
            );
            if (!consumeRate('inputBytes', sequentialBytes, 2 * 1024 * 1024)) return;
            let sequenceFinished = false;
            let cancelSequence = null;
            const finishSequence = (ok) => {
              if (sequenceFinished) return;
              sequenceFinished = true;
              if (cancelSequence) sequentialCancels.delete(cancelSequence);
              safeSend({
                type: 'input-sequential-done', seq, ok: ok === true,
                ...(ok === true ? {} : { error: 'sequence-cancelled' }),
              });
            };
            try {
              cancelSequence = writeToPtySequential(
                chunks,
                finishSequence,
                { settleMs },
              );
              if (cancelSequence) sequentialCancels.add(cancelSequence);
            } catch {
              finishSequence(false);
            }
          } else if (msg.type === 'ask-cancel') {
            const askId = msg.id != null ? String(msg.id) : '';
            let cancelled = false;
            if (askId && pendingCodexAsks.has(askId)) {
              cancelled = _codexRequestUserInputBridge?.cancel?.(askId) === true;
              if (cancelled) removePendingCodexAsk(askId);
            } else if (pendingAskHook) {
              const { res: hookRes, timer } = pendingAskHook;
              clearTimeout(timer);
              pendingAskHook = null;
              cancelled = true;
              try {
                if (!hookRes.headersSent) {
                  hookRes.writeHead(200, { 'Content-Type': 'application/json' });
                  hookRes.end(JSON.stringify({ answers: {} }));
                }
              } catch {}
            }
            if (cancelled) {
              broadcastCodexAskMessage({
                type: 'ask-hook-cancelled',
                id: askId,
                reason: msg.reason || 'User aborted',
              });
            } else if (askId && ws.readyState === 1) {
              try { ws.send(JSON.stringify({ type: 'ask-hook-already-answered', id: askId })); } catch {}
            }
          } else if (msg.type === 'ask-hook-answer') {
            // Current path: respond directly to Codex app-server JSON-RPC.
            let askAnswered = false;
            const askId = msg.id != null ? String(msg.id) : '';
            const pendingCodexAsk = askId ? pendingCodexAsks.get(askId) : null;
            if (askId && pendingCodexAsks.has(askId)) {
              askAnswered = _codexRequestUserInputBridge?.resolve?.(
                askId,
                msg.codexAnswers || msg.answers || {},
              ) === true;
              if (askAnswered) removePendingCodexAsk(askId);
            } else if (pendingAskHook) {
              // Legacy fallback for Codex versions that once exposed the tool
              // through PreToolUse hooks.
              const { res: hookRes, timer } = pendingAskHook;
              clearTimeout(timer);
              pendingAskHook = null;
              askAnswered = true;
              try {
                if (!hookRes.headersSent) {
                  hookRes.writeHead(200, { 'Content-Type': 'application/json' });
                  hookRes.end(JSON.stringify({ answers: msg.answers }));
                }
              } catch {}
            }
            // Broadcast resolved to other clients so they clear their ask panel
            if (askAnswered && terminalWss) {
              const rmsg = JSON.stringify({
                type: 'ask-hook-resolved',
                ...(askId ? { id: askId } : {}),
                ...(pendingCodexAsk?.itemId ? { itemId: pendingCodexAsk.itemId } : {}),
                ...(pendingCodexAsk?.questions ? { questions: pendingCodexAsk.questions } : {}),
                answers: msg.answers || {},
                codexAnswers: msg.codexAnswers || {},
              });
              terminalWss.clients.forEach((c) => {
                if (c.readyState === 1) try { c.send(rmsg); } catch {}
              });
            } else if (!askAnswered && askId && ws.readyState === 1) {
              try { ws.send(JSON.stringify({ type: 'ask-hook-already-answered', id: askId })); } catch {}
            }
          } else if (msg.type === 'perm-hook-answer') {
            // Permission approval — SDK mode (canUseTool) or PTY mode (hook bridge)
            let permAnswered = false;
            if (isSdkMode && _sdkResolveApproval && msg.id) {
              _sdkResolveApproval(msg.id, msg.allowSession ? { decision: msg.decision || 'allow', allowSession: true } : (msg.decision || 'deny'));
              permAnswered = true;
            } else if (msg.id && pendingPermHooks.has(msg.id)) {
              const { res: hookRes, timer } = pendingPermHooks.get(msg.id);
              clearTimeout(timer);
              pendingPermHooks.delete(msg.id);
              permAnswered = true;
              try {
                if (!hookRes.headersSent) {
                  hookRes.writeHead(200, { 'Content-Type': 'application/json' });
                  hookRes.end(JSON.stringify({ decision: msg.decision || 'deny' }));
                }
              } catch {}
            }
            // Broadcast resolved only when an answer was actually processed
            if (permAnswered && terminalWss) {
              const rmsg = JSON.stringify({ type: 'perm-hook-resolved', id: msg.id });
              terminalWss.clients.forEach((c) => {
                if (c !== ws && c.readyState === 1) try { c.send(rmsg); } catch {}
              });
            }
          } else if (msg.type === 'sdk-ask-answer') {
            // AskUserQuestion answer in SDK mode — resolve canUseTool Promise
            if (_sdkResolveApproval && msg.id) {
              _sdkResolveApproval(msg.id, msg.answers);
            }
            // Broadcast resolved to other clients
            if (msg.id && terminalWss) {
              const rmsg = JSON.stringify({ type: 'sdk-ask-resolved', id: msg.id });
              terminalWss.clients.forEach((c) => {
                if (c !== ws && c.readyState === 1) try { c.send(rmsg); } catch {}
              });
            }
          } else if (msg.type === 'sdk-plan-answer') {
            // Plan approval in SDK mode
            if (_sdkResolveApproval) {
              _sdkResolveApproval(msg.id, { approve: msg.approve !== false, feedback: msg.feedback || '' });
            }
            // Broadcast resolved to other clients
            if (terminalWss) {
              const rmsg = JSON.stringify({ type: 'sdk-plan-resolved', id: msg.id });
              terminalWss.clients.forEach((c) => {
                if (c !== ws && c.readyState === 1) try { c.send(rmsg); } catch {}
              });
            }
          } else if (msg.type === 'sdk-user-message') {
            // User message in SDK mode — relay to sdk-manager
            if (_sdkSendUserMessage && msg.text) {
              _sdkSendUserMessage(msg.text).catch(err => {
                console.error('[SDK] sendUserMessage error:', err.message);
              });
            }
          } else if (msg.type === 'sdk-interrupt') {
            if (_sdkInterruptTurn) {
              try { _sdkInterruptTurn(); } catch {}
            }
          } else if (msg.type === 'image-remove-notify' || msg.type === 'image-upload-notify') {
            // Security: only allow paths within upload directories, reject traversal
            const p = msg.path;
            if (terminalWss && p && !p.includes('..') && (
              p.startsWith('/tmp/cx-viewer-uploads/') || (p.includes('/cx-viewer/') && p.includes('/images/'))
            )) {
              const rmsg = msg.type === 'image-upload-notify'
                ? JSON.stringify({ type: 'image-upload-notify', path: p, source: msg.source || 'unknown' })
                : JSON.stringify({ type: 'image-remove-notify', path: p });
              terminalWss.clients.forEach((c) => {
                if (c !== ws && c.readyState === 1) try { c.send(rmsg); } catch {}
              });
            }
          } else if (msg.type === 'resize') {
            if (!consumeRate('resize', 1, 30)) return;
            if (!Number.isSafeInteger(msg.cols) || msg.cols < 2 || msg.cols > 500
              || !Number.isSafeInteger(msg.rows) || msg.rows < 1 || msg.rows > 300) return;
            // 存储该客户端的尺寸
            clientSizes.set(ws, { cols: msg.cols, rows: msg.rows });
            if (msg.mobile) mobileClients.add(ws);
            // 移动端 resize 始终生效；PC 端仅在无移动端时生效
            if (msg.mobile) {
              resizePty(msg.cols, msg.rows);
            } else if (mobileClients.size === 0 && (activeWs === ws || activeWs === null)) {
              activeWs = ws;
              resizePty(msg.cols, msg.rows);
            }
          } else if (msg.type === 'resync-request') {
            if (!consumeRate('resync', 1, 12)) return;
            // Never time-drop a protocol recovery request. The retained
            // per-connection intent already coalesces duplicates while a
            // snapshot is in flight; after completion a rejected/stale
            // snapshot must be allowed to trigger another one immediately.
            sendTerminalSnapshot(normalizeResyncReason(msg.reason));
          }
        } catch {}
      });

      // Protocol errors such as maxPayload overflow are connection-local.
      // Without an error listener `ws` promotes them to uncaught exceptions.
      ws.on('error', (error) => {
        if (process.env.CXV_DEBUG) console.warn('[CX Viewer] terminal ws protocol error:', error.message);
      });

      ws.on('close', () => {
        const remainingForIp = (terminalConnectionsByIp.get(connectionIp) || 1) - 1;
        if (remainingForIp > 0) terminalConnectionsByIp.set(connectionIp, remainingForIp);
        else terminalConnectionsByIp.delete(connectionIp);
        if (initialSnapshotTimer) clearTimeout(initialSnapshotTimer);
        initialSnapshotTimer = null;
        if (behindTimer) clearTimeout(behindTimer);
        behindTimer = null;
        terminateResyncIntent();
        for (const cancel of sequentialCancels) {
          try { cancel(); } catch {}
        }
        sequentialCancels.clear();
        removeDataListener();
        removeGeometryListener();
        removeStateListener();
        removeExitListener();
        clientSizes.delete(ws);
        mobileClients.delete(ws);
        if (activeWs === ws) {
          // 活跃客户端断开，将控制权交给剩余的某个客户端
          activeWs = null;
          // 优先使用移动端尺寸，无移动端则用剩余客户端尺寸
          const mSize = getMobileSize();
          if (mSize) {
            resizePty(mSize.cols, mSize.rows);
          } else {
            for (const [remainWs, size] of clientSizes) {
              if (remainWs.readyState === 1) {
                activeWs = remainWs;
                resizePty(size.cols, size.rows);
                break;
              }
            }
          }
        }
        // If every browser GUI disconnected while Codex is waiting for an
        // answer, hand the original JSON-RPC request back to the TUI instead of
        // leaving the turn stranded behind an unreachable web form.
        setImmediate(releaseCodexAsksToTuiWhenGuiDisconnects);
      });
    });
  } catch (err) {
    console.error('[CX Viewer] Failed to setup terminal WebSocket:', err.message);
  }
}

export function getPort() {
  return actualPort;
}

export function getProtocol() {
  return serverProtocol;
}

export { getAllLocalIps };

export function getAccessToken() {
  return ACCESS_TOKEN;
}

export function getOtelAccessToken() {
  return OTEL_ACCESS_TOKEN;
}

// 流式状态 SSE 推送定时器：检测 streamingState 变化并广播给所有客户端
let _streamingStatusTimer = null;
let _lastStreamingActive = false;
function startStreamingStatusTimer() {
  if (_streamingStatusTimer) return;
  _streamingStatusTimer = setInterval(() => {
    // SDK mode uses its own streaming state (pushed directly via setSdkStreamingState)
    if (isSdkMode) return;
    const changed = streamingState.active !== _lastStreamingActive;
    if (changed || streamingState.active) {
      const data = streamingState.active
        ? { ...streamingState, elapsed: Date.now() - streamingState.startTime }
        : { active: false };
      if (clients.length > 0 && sendEventToClients) sendEventToClients(clients, 'streaming_status', data);
      _lastStreamingActive = streamingState.active;
    }
  }, 500);
  _streamingStatusTimer.unref();
}

let _stoppingPromise = null;
export function stopViewer() {
  if (_stoppingPromise) return _stoppingPromise;
  _stoppingPromise = _doStop();
  return _stoppingPromise;
}
async function _doStop() {
  try { await Promise.race([runParallelHook('serverStopping'), new Promise(r => setTimeout(r, 3000))]); } catch { }
  pluginRoutes = [];
  for (const pending of pendingCodexAsks.values()) {
    if (pending.timer) clearTimeout(pending.timer);
  }
  pendingCodexAsks.clear();
  shutdownScratchPtys();
  if (scratchTerminalWss) {
    for (const client of scratchTerminalWss.clients) {
      try { client.close(1001, 'server stopping'); } catch {}
    }
    scratchTerminalWss = null;
  }
  _codexRequestUserInputBridge = null;
  // 如果用户未做选择，将临时文件转为正式文件
  if (_resumeState && _resumeState.tempFile) {
    try {
      const { tempFile } = _resumeState;
      if (existsSync(tempFile)) {
        // 只有非空 temp 文件才 rename 为正式文件，空文件直接删除
        const sz = statSync(tempFile).size;
        if (sz > 0) {
          const newPath = tempFile.replace('_temp.jsonl', '.jsonl');
          renameSync(tempFile, newPath);
        } else {
          unlinkSync(tempFile);
        }
      }
    } catch { }
  }
  for (const logFile of getWatchedFiles().keys()) {
    unwatchFile(logFile);
  }
  unwatchFile(CONTEXT_WINDOW_FILE);
  getWatchedFiles().clear();
  clients.forEach(client => client.end());
  clients = [];
  if (server) {
    // 销毁所有活跃连接，防止 keep-alive 阻止进程退出
    server.closeAllConnections();
    server.close();
  }
  if (statsWorker) {
    statsWorker.terminate();
    statsWorker = null;
  }
  if (_streamingStatusTimer) {
    clearInterval(_streamingStatusTimer);
    _streamingStatusTimer = null;
  }
  resetStreamingState();
  try { unwatchFile(PROFILE_PATH); } catch {} // 清理 interceptor 的 StatWatcher
}

// ─── SDK Mode Exports ──────────────────────────────────────────

/** Push a JSONL entry to the active log and all SSE clients (for SDK mode). */
export function pushSdkEntry(entry) {
  if (entry && LOG_FILE) {
    try {
      appendLogEntry(entry, {
        source: 'sdk',
        cwd: entry.body?.metadata?.cwd || entry.body?._cwd || process.env.CXV_PROJECT_DIR || process.cwd(),
        projectId: entry.project,
        sessionId: entry.body?.metadata?.thread_id || entry.body?._threadId || null,
        threadId: entry.body?.metadata?.thread_id || entry.body?._threadId || null,
      });
      notifyStatsWorker(LOG_FILE);
    } catch {}
  }
  if (sendToClients) sendToClients(clients, entry);
}

/** Update streaming status (for SDK mode). */
export function setSdkStreamingState(data) {
  if (clients.length > 0 && sendEventToClients) {
    sendEventToClients(clients, 'streaming_status', data);
  }
}

/** Push live SDK text/thinking blocks without polluting the JSONL request list. */
export function sendSdkStreamProgress(data) {
  if (clients.length > 0 && sendEventToClients) {
    sendEventToClients(clients, 'stream-progress', data);
  }
}

/** Broadcast a message to all terminal WS clients (for SDK canUseTool). */
export function broadcastWsMessage(msg) {
  if (terminalWss) {
    const str = typeof msg === 'string' ? msg : JSON.stringify(msg);
    terminalWss.clients.forEach((c) => {
      if (c.readyState === 1) try { c.send(str); } catch {}
    });
  }
}

/** Reference to sdk-manager's resolveApproval (set by cli.js after import). */
let _sdkResolveApproval = null;
export function setSdkResolveApproval(fn) { _sdkResolveApproval = fn; }

/** Reference to sdk-manager's sendUserMessage (set by cli.js after import). */
let _sdkSendUserMessage = null;
export function setSdkSendUserMessage(fn) { _sdkSendUserMessage = fn; }

/** Reference to sdk-manager's interruptTurn (set by cli.js after import). */
let _sdkInterruptTurn = null;
export function setSdkInterruptTurn(fn) { _sdkInterruptTurn = fn; }

// Auto-start the viewer after log file init completes
// 工作区模式下由 cli.js 直接 import server.js 触发启动，跳过 _initPromise 自动启动
if (!isWorkspaceMode) {
  _initPromise.then(() => {
    startViewer().then((srv) => {
      if (!srv) return;
      // 延迟 3 秒异步检查更新
      setTimeout(() => {
        checkAndUpdate().then(result => {
          if (result.status === 'updated') {
            clients.forEach(client => {
              try { client.write(`event: update_completed\ndata: ${JSON.stringify({ version: result.remoteVersion })}\n\n`); } catch { }
            });
          } else if (result.status === 'major_available') {
            clients.forEach(client => {
              try { client.write(`event: update_major_available\ndata: ${JSON.stringify({ version: result.remoteVersion })}\n\n`); } catch { }
            });
          }
        }).catch(() => { });
      }, 3000);
    }).catch(err => {
      console.error('Failed to start CX Viewer:', err);
    });
  });
}

// 进程退出时，将未决的临时文件转为正式文件
function handleExit() {
  if (_resumeState && _resumeState.tempFile) {
    try {
      if (existsSync(_resumeState.tempFile)) {
        const newPath = _resumeState.tempFile.replace('_temp.jsonl', '.jsonl');
        renameSync(_resumeState.tempFile, newPath);
      }
    } catch { }
  }
}
process.on('exit', handleExit);
process.on('SIGINT', () => { stopViewer().finally(() => process.exit()); });
process.on('SIGTERM', () => { stopViewer().finally(() => process.exit()); });
