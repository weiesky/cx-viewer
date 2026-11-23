import { createServer } from 'node:http';
import { EventEmitter } from 'node:events';
import { pipeline } from 'node:stream';
import { reportSwallowed } from './server/lib/error-report.js';
import { computeAskAutoAnswer, createAskAutoAnswerState, cancelAskAutoAnswerState, replayAskAutoAnswerFields } from './lib/ask-auto-answer.js';
import { createStreamMuxServer } from './server/lib/ws-mux.js';
import { createServer as createHttpsServer } from 'node:https';
import { createConnection } from 'node:net';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { constants as fsConstants, promises as fsPromises, readFileSync, writeFileSync, existsSync, watchFile, unwatchFile, statSync, lstatSync, fstatSync, readdirSync, renameSync, unlinkSync, rmSync, openSync, readSync, closeSync, realpathSync, mkdirSync, createReadStream, cpSync, copyFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, resolve, basename, relative, sep, isAbsolute } from 'node:path';
import { homedir, platform, networkInterfaces } from 'node:os';
import { execFile, exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { Worker } from 'node:worker_threads';
import { isPathContained, readFileContent, writeFileContent, resolveFilePath, renameSyncWithRetry, ERROR_STATUS_MAP } from './lib/file-api.js';
import { assertPublicFilePath, isPublicFilePath } from './lib/credential-file-policy.js';
import { execWithStdin } from './lib/exec-with-stdin.js';
import { readPublicFileSync } from './lib/public-file-read.js';
import { attachTerminalWsPing } from './lib/terminal-ws-ping.js';
import { createProxyProfileCredentials, PROXY_CREDENTIAL_VERSION_FIELD, withProxyProfilesLock } from './lib/proxy-profile-credentials.js';
import { readWorkspaceProxy, withWorkspaceProxyUpdate, workspaceProxyFile, watchWorkspaceProxy } from './lib/workspace-proxy.js';
import { getWorkspaceProxyProfile } from './interceptor.js';
import { readOriginalOpenAiBaseUrl } from './lib/codex-config.js';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

import { _initPromise, _projectName, _logDir, _cachedApiKey, _cachedAuthHeader, initForWorkspace, resetWorkspace, getActiveProjectContext, setLogV2CommitListener, streamingState, resetStreamingState, _loadProxyProfile, onProxyProfileChange, PROFILE_PATH, _defaultConfig, _proxyProfileLoadError, appendLogEntry, flushLogV2Writes, closeLogV2Writes, getLogV2RuntimeStatus } from './interceptor.js';
import { FORCE_KILL_GRACE_MS, registerSignalShutdown, SHUTDOWN_DEADLINE_MS, terminateWithEscalation, waitWithTimeout } from './lib/shutdown.js';
import { atomicWriteFile } from './lib/logger-install.js';
import { createDefaultProxyProfiles, validateProxyProfilesDocument } from './lib/proxy-profile.js';
import { createProcessAdapter, decodeProcessRef, encodeProcessRef, isCxvProcess, killVerifiedTree, sameProcessIdentity } from './lib/cxv-processes.js';
import { parseOtlpTraces } from './lib/otel-receiver.js';
import { LOG_DIR } from './findcx.js';
import { targetFilesFsRoutes } from './lib/target-files-fs.js';
import { revealInOs, openTerminalAt } from './lib/os-open.js';
import { assertNativeFilePath, isNativeFilePathPublic, isWriteAllowed } from './lib/file-access-policy.js';
import { readTargetFiles } from './lib/target-files.js';
import { AUDIO_EXTENSIONS, audioExtOf, serveAudioStream } from './server/lib/audio-stream.js';
import { fileBrowserAccess } from './lib/file-browser-access.js';
import { probeFilesExist } from './lib/files-exists.js';
import { ensureProjectIdForCwd, resolveProjectIdForCwd } from './lib/log-v2/project-id.js';
import { t, detectLanguage } from './i18n.js';
import { DEFAULT_START_PORT, DEFAULT_MAX_PORT, MAX_POST_BODY as _MAX_POST_BODY, MAX_UPLOAD_SIZE, SSE_HEARTBEAT_MS, HOOK_TIMEOUT_MS, EDITOR_SESSION_CLEANUP_MS, UPLOAD_DIR } from './lib/constants.js';
import { checkAndUpdate, detectHomebrewInstall, detectPnpmGlobalInstall } from './lib/updater.js';
import { UpdateJob } from './lib/update-job.js';
import { updateRoutes } from './lib/update-routes.js';
import { loadPlugins, runWaterfallHook, runParallelHook, getPluginsInfo, getPluginsDir, getPluginEntries } from './lib/plugin-loader.js';
import { uploadPlugins, installPluginFromUrl, deletePluginDir } from './lib/plugin-manager.js';
import * as pluginRuntime from './lib/plugin-runtime.js';
import { pluginServicesRoutes } from './lib/plugin-service-routes.js';
import { buildPanelDescriptor } from './lib/plugin-panels.js';
import { baseUrlAllowedHost, resolveBaseConfig, externalUrlFromConfig, resolveExternalScheme } from './lib/base-url.js';
import { stripBasePath, validateBasePath } from './lib/base-path.js';
import { getUserProfile } from './lib/user-profile.js';
import { getGitDiffs, getUnpushedCommits, isValidCommitHash, isSafeRelativePath, PATH_TRAVERSAL, execFileAsync as gitExecFileAsync } from './lib/git-diff.js';
import { getGitWorkingTreeLineStats } from './lib/git-change-stats.js';
import { parseCodexInvocation } from './lib/cli-args.js';
import { createPtyChatQueue } from './server/lib/pty-chat-queue.js';
import { createPtyWorkspaceRegistry } from './lib/pty-workspaces.js';
import { CONTEXT_WINDOW_FILE, buildContextWindowEvent } from './lib/context-watcher.js';
import { nativeContextWindow, sumUsageContextTokens } from './server/lib/context-rules.js';
import { isMainAgentEntry } from './lib/main-agent-entry.js';
import { handleDingTalkImRoute } from './lib/dingtalk-im-routes.js';
import {
  deleteLogFiles,
  validateImLogPath,
} from './lib/log-management.js';
import { countImLogEntries, streamImLogEntries } from './lib/im-log-stream.js';
import {
  findActiveV2SessionFile,
  findActiveV2SessionFileAsync,
  isV2SessionFile,
  listV2LocalLogs,
  listV2LocalLogsPage,
  readV2WirePageAsync,
  readV2WireSnapshotAsync,
  readV2WireSummariesAsync,
  resolveV2SessionFile,
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
  safeTokenMatches,
} from './lib/auth.js';
import { handleAuthRoute } from './lib/auth-routes.js';
import { readPreferences, updatePreferences } from './lib/preferences.js';
import { initScheduledTaskScheduler, startScheduledTaskScheduler, stopScheduledTaskScheduler, waitScheduledTaskRuns } from './lib/scheduled-task-scheduler.js';
import { executeScheduledTask } from './lib/scheduled-task-executor.js';
import { workspaceUploadPaths } from './lib/workspace-upload-paths.js';
import { handleScheduledTaskRoute } from './lib/scheduled-task-routes.js';
import { handleVoicePackRoute } from './lib/voice-pack-routes.js';
import { getAppServerAgentLoopSnapshot } from './lib/appserver-bridge.js';
import { reconcileVoicePackPrefs } from './server/lib/voice-pack-manager.js';
import { mergeApprovalModalPrefs } from './server/lib/approval-modal-prefs.js';
import {
  getDefaultSystemPrompt,
  getModelSystemPrompts,
  saveDefaultSystemPrompt,
  saveModelSystemPrompt,
  SYSTEM_PROMPT_MAX_BYTES,
  SystemPromptStoreError,
  setBuiltinModelPromptDisabled,
  selectSystemPrompt,
} from './lib/model-system-prompts.js';
import { listSystemPromptPresets } from './lib/builtin-model-prompts.js';
import { SYSTEM_PROMPT_VARIABLES_DOC } from './lib/system-prompt-render.js';
import {
  buildCodexAutoResolutionAnswers,
  pickCodexAutoAnswers,
  projectCodexAnswersForConversation,
} from './lib/codex-request-user-input.js';
import {
  createActiveV2RecoveryState,
  serveLogV2Live,
  serveLogV2Objects,
  serveLogV2Page,
  serveLogV2Snapshot,
} from './server/lib/log-v2-routes.js';
import { handleUltraAgentsRoute } from './server/lib/ultra-agents-api.js';
import { openScratchPty, shutdownScratchPtys } from './scratch-pty-manager.js';
import { listSdkResumeSessions, readSdkResumeHistory } from './lib/sdk-resume-history.js';


let _codexApprovalsReviewerUpdater = null;
let _runtimeApprovalsReviewer = null;
let _codexNativeReviewerAvailable = false;
let _codexRequestUserInputBridge = null;
let _systemPromptRuntimeCapability = null;
const pendingCodexAsks = new Map();
const cxvProcessAdapter = createProcessAdapter();
const PROCESS_REF_SECRET = randomBytes(32);
const processTerminationOperations = new Map();
const PROCESS_OPERATION_TTL_MS = 15 * 60 * 1000;
const PROCESS_OPERATION_LIMIT = 100;
const PROCESS_FORCE_KILL_GRACE_MS = process.env.CXV_TEST === '1' ? 200 : FORCE_KILL_GRACE_MS;

function pruneProcessTerminationOperations() {
  const cutoff = Date.now() - PROCESS_OPERATION_TTL_MS;
  for (const [id, operation] of processTerminationOperations) {
    if ((operation.completedAt || operation.requestedAt) < cutoff) processTerminationOperations.delete(id);
  }
  while (processTerminationOperations.size > PROCESS_OPERATION_LIMIT) {
    processTerminationOperations.delete(processTerminationOperations.keys().next().value);
  }
}

function completeProcessTermination(operation, status, error = null) {
  if (operation.status !== 'terminating') return false;
  operation.status = status;
  operation.completedAt = Date.now();
  operation.error = error?.message || error || null;
  return true;
}
function activeV2TimelineIdentity(file) {
  const { timelinePath } = resolveV2SessionFile(LOG_DIR, file);
  const stat = statSync(timelinePath, { bigint: true });
  return `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}`;
}

const _activeV2Recovery = createActiveV2RecoveryState({
  identityForFile: activeV2TimelineIdentity,
});

const sdkV2Recovery = new Map();
const sdkResumedFiles = new Map();
function recoveryForSdkView(view) {
  if (!view) return _activeV2Recovery;
  if (!sdkV2Recovery.has(view.instanceKey)) sdkV2Recovery.set(view.instanceKey,
    createActiveV2RecoveryState({ identityForFile: activeV2TimelineIdentity }));
  return sdkV2Recovery.get(view.instanceKey);
}

function projectContextForSdkView(view) {
  const cwd = view?.cwd || sdkBootCwd;
  const name = view?.projectName || basename(cwd);
  return { canonicalCwd: cwd, projectName: name,
    projectId: resolveProjectIdForCwd(LOG_DIR, cwd, name) };
}

export async function restoreSdkSessionFromHistory(anchor, file) {
  const restored = await sdkManager.resumeSdkSession(anchor, async selected => {
    await flushLogV2Writes();
    return readSdkResumeHistory(LOG_DIR, file, { ...projectContextForSdkView(selected), cwd: selected.cwd });
  });
  sdkResumedFiles.set(restored.instanceKey, { file, sessionId: restored.sessionId });
  sdkV2Recovery.delete(restored.instanceKey);
  const event = { ...restored, resumeId: randomBytes(16).toString('hex') };
  sendSdkEvent('sdk_session_resumed', event);
  return event;
}

function activeV2LookupOptions({ forceHealthyScan = false, sdkView = null } = {}) {
  const runtime = getLogV2RuntimeStatus();
  const context = sdkView ? projectContextForSdkView(sdkView) : getActiveProjectContext();
  const canonicalCwd = context.canonicalCwd || process.env.CXV_PROJECT_DIR || process.cwd();
  return {
    runtime,
    projectId: context.projectId,
    canonicalCwd,
    forceHealthyScan,
    ...(sdkView?.transport === 'pty' ? { exactSessionId: ptyWorkspaces.info(sdkView.instanceKey).sessionId } : {}),
  };
}

function applyActiveV2Recovery(file) {
  return _activeV2Recovery.apply(file);
}

function activeV2SessionFile() {
  return applyActiveV2Recovery(findActiveV2SessionFile(LOG_DIR, activeV2LookupOptions()));
}

async function activeV2SessionFileAsync(sdkView = null) {
  if (sdkView?.transport === 'pty') {
    let current;
    try { current = ptyWorkspaces.info(sdkView.instanceKey); } catch { return null; }
    return recoveryForSdkView(sdkView).apply(await findActiveV2SessionFileAsync(LOG_DIR, {
      ...activeV2LookupOptions({ sdkView }), exactSessionId: current.sessionId,
    }));
  }
  if (sdkView && !sdkManager.listSdkSessions().some(session => session.instanceKey === sdkView.instanceKey)) return null;
  if (sdkView) {
    const pin = sdkResumedFiles.get(sdkView.instanceKey);
    if (pin) {
      const current = sdkManager.getSdkSessionInfo({ instanceKey: sdkView.instanceKey });
      if (pin.sessionId === current.sessionId) return recoveryForSdkView(sdkView).apply(pin.file);
      sdkResumedFiles.delete(sdkView.instanceKey);
    }
  }
  return recoveryForSdkView(sdkView).apply(await findActiveV2SessionFileAsync(LOG_DIR, activeV2LookupOptions({ sdkView })));
}

async function recoverActiveV2SessionFile(rejectedFile, error, sdkView = null) {
  const recovery = recoveryForSdkView(sdkView).prepare(rejectedFile, error);
  if (!recovery) return null;
  const fallbackFile = await findActiveV2SessionFileAsync(LOG_DIR, activeV2LookupOptions({ forceHealthyScan: true, sdkView }));
  if (!fallbackFile || fallbackFile === rejectedFile) return null;
  return Object.freeze({
    file: fallbackFile,
    accept() { recovery.accept(fallbackFile); },
  });
}

function sendEventToClients(targets, eventName, data) {
  for (const client of targets) {
    try { client.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
  }
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

export function setSystemPromptRuntimeCapability(capability) {
  _systemPromptRuntimeCapability = capability?.verified
    ? {
        status: 'supported',
        append: capability.append === true,
        override: capability.override === true,
        transport: capability.transport || 'app-server-bridge',
        version: capability.version || null,
      }
    : null;
}

export function getSystemPromptRuntimeCapability(view = null) {
  if (view?.transport === 'pty' && !view.active) {
    const capability = ptyWorkspaces.runtime(view.instanceKey)?.systemPromptCapability;
    return { status: capability?.verified ? 'supported' : 'unsupported',
      append: capability?.verified === true && capability.append === true,
      override: capability?.verified === true && capability.override === true,
      transport: capability?.verified ? 'app-server-bridge' : 'direct', version: capability?.version || null };
  }
  if (_systemPromptRuntimeCapability) return { ..._systemPromptRuntimeCapability };
  return {
    status: 'unsupported',
    append: false,
    override: false,
    transport: isSdkMode ? 'sdk' : 'direct',
    version: null,
  };
}

function reviewerStateFor(view) {
  if (view?.transport === 'pty' && !view.active) {
    return ptyWorkspaces.runtime(view.instanceKey)?.getApprovalsReviewerState?.()
      || { approvalsReviewer: APPROVALS_REVIEWER_DEFAULT, nativeAvailable: false, appliedToRuntime: false };
  }
  return { approvalsReviewer: _runtimeApprovalsReviewer, nativeAvailable: _codexNativeReviewerAvailable,
    appliedToRuntime: !!_codexApprovalsReviewerUpdater };
}

function applyRuntimeApprovalsReviewer(value, view = null) {
  const reviewer = normalizeApprovalsReviewer(value);
  if (view?.transport === 'pty' && !view.active) {
    const result = ptyWorkspaces.runtime(view.instanceKey)?.setApprovalsReviewer?.(reviewer);
    return { approvalsReviewer: reviewer, appliedToRuntime: false, appliesOnNextTurn: false, ...result };
  }
  const result = _codexApprovalsReviewerUpdater?.(reviewer);
  return {
    approvalsReviewer: reviewer,
    appliedToRuntime: !!_codexApprovalsReviewerUpdater,
    appliesOnNextTurn: !!_codexApprovalsReviewerUpdater,
    ...(result && typeof result === 'object' ? result : {}),
  };
}

function broadcastApprovalsReviewer(value, scope = null) {
  if (!terminalWss) return;
  const payload = JSON.stringify({
    type: 'approval-reviewer-changed',
    approvalsReviewer: normalizeApprovalsReviewer(value),
  });
  terminalWss.clients.forEach((client) => {
    if (client.readyState === 1 && (isSdkMode || ptyScopeMatches(client, scope))) try { client.send(payload); } catch {}
  });
}

function ptyScope(data = null) {
  if (!ptyWorkspaces) return null;
  try {
    const view = ptyWorkspaces.info(data?.instanceKey || undefined);
    return data?.cwd && data.cwd !== view.cwd ? null : view;
  } catch { return null; }
}

function ptyScopeMatches(client, scope = null) {
  if (!ptyWorkspaces) return !client.cxvSdkSession;
  const owner = scope || ptyScope();
  return !!owner && client.cxvPtySession?.instanceKey === owner.instanceKey;
}

function ptyEventClients(data) {
  const scope = ptyScope(data);
  if (ptyWorkspaces && !scope) return [];
  return clients.filter(client => ptyScopeMatches(client, scope));
}

function openTerminalClients(scope = null) {
  if (!terminalWss) return [];
  return [...terminalWss.clients].filter(client => client.readyState === 1 && ptyScopeMatches(client, scope));
}

function requestInputBridge(scope) {
  if (scope && ptyWorkspaces) {
    const runtime = ptyWorkspaces.runtime(scope.instanceKey);
    if (runtime?.resolveRequestUserInput) return {
      resolve: runtime.resolveRequestUserInput, cancel: runtime.cancelRequestUserInput,
      releaseToTui: runtime.releaseRequestUserInputToTui,
    };
    if (scope.instanceKey !== ptyScope()?.instanceKey) return null;
  }
  return _codexRequestUserInputBridge;
}

function broadcastCodexAskMessage(message, exclude = null, scope = null) {
  const payload = JSON.stringify(message);
  for (const client of openTerminalClients(scope)) {
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
  if (pending.auto?.timer) clearTimeout(pending.auto.timer);
  return pending;
}

/** Claim native questions for an online GUI or explicitly enabled server hosting. */
export function offerCodexRequestUserInput(request) {
  if (!request?.uiId || !Array.isArray(request.questions) || request.questions.length === 0) return false;
  const scope = ptyScope(request);
  if (ptyWorkspaces && !scope) return false;
  const bridge = requestInputBridge(scope);
  const computed = computeAskAutoAnswer(scope?.cwd);
  const autoAnswers = computed.enabled ? pickCodexAutoAnswers(request.questions) : null;
  const hosting = computed.enabled && !!autoAnswers;
  if (!bridge || (!hosting && openTerminalClients(scope).length === 0)) return false;

  const id = String(request.uiId);
  const timeoutMs = Number.isFinite(request.autoResolutionMs) && request.autoResolutionMs > 0
    ? request.autoResolutionMs
    : hosting ? 24 * 60 * 60_000 : null;
  const pending = {
    id, scope, bridge,
    questions: request.questions,
    threadId: request.threadId || null,
    turnId: request.turnId || null,
    itemId: request.itemId || null,
    createdAt: request.createdAt || Date.now(),
    timeoutMs,
    timer: null,
    auto: null, autoCancelled: false,
  };
  if (timeoutMs) {
    pending.timer = setTimeout(() => {
      const current = pendingCodexAsks.get(id);
      if (current !== pending) return;
      const codexAnswers = buildCodexAutoResolutionAnswers(current.questions);
      const answers = projectCodexAnswersForConversation(current.questions, codexAnswers);
      const resolved = current.bridge?.resolve?.(id, codexAnswers);
      if (!resolved) return;
      removePendingCodexAsk(id);
      broadcastCodexAskMessage({
        type: 'ask-hook-timeout',
        id,
        itemId: current.itemId,
        questions: current.questions,
        answers,
        codexAnswers,
      }, null, current.scope);
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
    ...replayAskAutoAnswerFields(hosting ? computed : null, false),
  }, null, scope);
  if (hosting) pending.auto = createAskAutoAnswerState(computed, () => {
    if (pendingCodexAsks.get(id) !== pending || pending.autoCancelled) return;
    if (pending.bridge?.resolve?.(id, autoAnswers) !== true) return;
    removePendingCodexAsk(id);
    broadcastCodexAskMessage({ type: 'ask-hook-resolved', id, reason: 'auto-answered',
      itemId: pending.itemId, questions: pending.questions, codexAnswers: autoAnswers,
      answers: projectCodexAnswersForConversation(pending.questions, autoAnswers), ...(scope || {}) }, null, scope);
  });
  return true;
}

/** App-server cleared a request because the turn ended/interrupted elsewhere. */
export function clearCodexRequestUserInput(request) {
  const id = request?.uiId != null ? String(request.uiId) : '';
  const pending = id && removePendingCodexAsk(id);
  if (!pending) return false;
  broadcastCodexAskMessage({
    type: 'ask-hook-resolved',
    id,
    reason: request.reason || 'server-resolved',
  }, null, pending.scope);
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
  for (const [id, pending] of pendingCodexAsks) {
    if (openTerminalClients(pending.scope).length > 0) continue;
    if (pending.auto && !pending.autoCancelled) continue;
    if (pending.bridge?.releaseToTui?.(id)) removePendingCodexAsk(id);
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
    req.on('end', async () => {
      if (done) return;
      done = true;
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); }
    });
    req.on('error', err => fail(err));
  });
}

function readStrictUtf8JsonBody(req, maxSize) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    let done = false;
    const fail = (error) => {
      if (done) return;
      done = true;
      reject(error);
    };
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > maxSize) {
      fail(Object.assign(new Error('Request body too large'), { status: 413 }));
      req.resume();
      return;
    }
    req.on('data', chunk => {
      if (done) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > maxSize) {
        fail(Object.assign(new Error('Request body too large'), { status: 413 }));
        req.resume();
        return;
      }
      chunks.push(buffer);
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(Object.assign(new Error('Invalid UTF-8 JSON'), { status: 400 }));
      }
    });
    req.on('error', fail);
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

function currentProjectDir(req) {
  return req?.cxvPtySession?.cwd || req?.cxvSdkSession?.cwd || (isSdkMode ? sdkBootCwd : (process.env.CXV_PROJECT_DIR || process.cwd()));
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
      root: currentProjectDir(req),
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
    root: currentProjectDir(req),
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

function assertFileToolMutationPath(path, cwd) {
  const verdict = isWriteAllowed(path, { cwd });
  if (!verdict.ok) throw Object.assign(new Error('Path not allowed'), { code: 'ACCESS_DENIED', status: 403 });
  return verdict.real;
}

function displayTail(filePath) {
  const home = homedir();
  return filePath.startsWith(home) ? `~${filePath.slice(home.length)}` : filePath;
}

function discoverCodexMdEntries(req) {
  const entries = [];
  const seen = new Set();
  const add = (filePath, scope) => {
    try {
      const real = realpathSync(filePath);
      if (seen.has(real) || !existsSync(real) || !statSync(real).isFile() || !isPublicFilePath(real) || !isNativeFilePathPublic(real)) return;
      seen.add(real);
      entries.push({
        id: encodeStableId(real),
        scope,
        path: real,
        tail: displayTail(real),
      });
    } catch {}
  };

  let dir = resolve(currentProjectDir(req));
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
const sdkManager = isSdkMode ? await import('./lib/sdk-manager.js') : null;
const sdkBootCwd = resolve(process.env.CXV_PROJECT_DIR || process.cwd());

let ptyWorkspaces = null;
const ptyQueues = new Map();
function stopPtyQueue(key) {
  const record = ptyQueues.get(key);
  if (!record) return;
  ptyQueues.delete(key); record.removeExit?.(); record.queue.stop();
}
function stopPtyQueues() { for (const key of [...ptyQueues.keys()]) stopPtyQueue(key); }
function ptyQueueFor(scope) {
  if (!scope || !ptyWorkspaces) return null;
  const key = scope.instanceKey;
  const pty = ptyWorkspaces.session(key);
  const context = () => { try { return ptyWorkspaces.runtime(key)?.getContext?.() || {}; } catch { return {}; } };
  const inputState = () => { try { return ptyWorkspaces.runtime(key)?.getInputState?.() || {}; } catch { return {}; } };
  const currentSession = () => context().sessionId || context().threadId || null;
  const anchor = () => ({ project: scope.projectName, sessionId: currentSession(), instanceKey: key });
  let record = ptyQueues.get(key);
  if (!record) {
    const live = target => {
      try {
        ptyWorkspaces.info(key);
        if (!pty.getPtyState().running || (target?.instanceKey && target.instanceKey !== key)
          || (target?.sessionId && target.sessionId !== currentSession())) return false;
        return true;
      } catch { return false; }
    };
    const write = (data, target) => live(target) && pty.writeToPty(data);
    const writeSequential = (chunks, done, options, target) => {
      if (!live(target)) { done?.(false); return null; }
      return pty.writeToPtySequential(chunks, done, options);
    };
    const queue = createPtyChatQueue({
      getPtyKind: () => inputState().connected === true && currentSession() && !pty.getPtyState().recovering
        ? pty.getPtyState().kind : null,
      isStreaming: () => inputState().active !== false || ptyLoopActive(scope),
      hasPendingApproval: () => inputState().pendingRequests > 0
        || [...pendingCodexAsks.values(), ...pendingPermHooks.values()].some(pending => ptyScopeMatches({ cxvPtySession: scope }, pending.scope)),
      hasExternalInjection: () => scope.active && !!_dingtalkImBridge?.getStatus().pending,
      hasLivePtyFor: live,
      writeToPty: data => write(data, anchor()), writeToPtyFor: write,
      writeToPtySequential: (chunks, done, options) => writeSequential(chunks, done, options, anchor()),
      writeToPtySequentialFor: writeSequential,
      broadcastWs: (message, item) => broadcastWsMessage({ ...message, ...scope, sessionId: currentSession(),
        ...(message.type === 'queue-rejected' && item ? { text: item.text } : {}) }),
    });
    record = { queue, lastSession: currentSession(), removeExit: pty.onPtyExit(() => { stopPtyQueue(key); clearEditorSessions(key); }) };
    ptyQueues.set(key, record);
  }
  const sid = currentSession();
  if (record.lastSession && sid !== record.lastSession) record.queue.clear();
  record.lastSession = sid;
  return { queue: record.queue, anchor: anchor(), ready: inputState().connected === true && !!sid };
}


// Trusted bootstrap only; executable/environment/runtime never come from HTTP.
export function configurePtyWorkspaces({ boot, launch = null }) {
  if (isSdkMode || ptyWorkspaces) throw new Error('PTY workspaces already configured or unavailable');
  const registry = createPtyWorkspaceRegistry({ launch });
  registry.adopt({ ...boot, boot: true });
  ptyWorkspaces = registry;
  return registry;
}

function ptyViewForUrl(parsedUrl) {
  if (!ptyWorkspaces) throw Object.assign(new Error('PTY workspaces are not configured'),
    { status: 404, code: 'PTY_WORKSPACE_UNAVAILABLE' });
  return ptyWorkspaces.info(parsedUrl.searchParams.has('instance')
    ? parsedUrl.searchParams.get('instance') : undefined);
}

function scheduledTaskScope(task) {
  if (isWorkspaceMode && !_workspaceLaunched) return null;
  try {
    if (isSdkMode) {
      if (task.engine !== 'sdk') return null;
      if (task.mode === 'spawn' && task.cwd === sdkBootCwd && sdkManager.getSdkSpawnConfig().available) return { cwd: task.cwd };
      const scope = sdkManager.getSdkSessionInfo({ instanceKey: task.instanceKey });
      return scope?.cwd === task.cwd ? scope : null;
    }
    if (task.engine !== 'pty' || task.mode !== 'inject') return null;
    const scope = ptyWorkspaces?.info(task.instanceKey);
    return scope?.running && scope.cwd === task.cwd ? scope : null;
  } catch { return null; }
}

function initScheduledTasks() {
  if (!isCliMode || process.env.CXV_IM_WORKER === '1' || process.env.CXV_IM_PLATFORM) return;
  initScheduledTaskScheduler({
    getRoot: () => LOG_DIR, getMode: () => ({ sdk: isSdkMode }),
    getSpawnConfig: () => sdkManager?.getSdkSpawnConfig() || { available: false },
    canExecute: task => !!scheduledTaskScope(task),
    isReady: () => isSdkMode ? sdkManager.listSdkSessions().length > 0 : !!ptyWorkspaces?.list().some(scope => scope.running),
    execute: (task, claim) => executeScheduledTask(task, claim, {
      isSdkMode, samePath: (a, b) => a === b,
      sdk: sdkManager && { ...sdkManager, getQueueSnapshot: sdkManager.getSdkQueueState },
      pty: {
        listLivePtys: () => (ptyWorkspaces?.list() || []).map(scope => ({ ...scope,
          ptyKind: ptyWorkspaces.session(scope.instanceKey).getPtyState().kind })),
        getPtyKindFor: anchor => { try { return ptyWorkspaces.session(anchor.instanceKey).getPtyState().kind; } catch { return null; } },
      },
      chatQueue: { enqueue: (text, anchor) => {
        try {
          const scope = ptyWorkspaces.info(anchor.instanceKey);
          const owned = ptyQueueFor(scope);
          return owned?.ready ? owned.queue.enqueue(text, { ...anchor, ...owned.anchor, strictAnchor: true }) : null;
        } catch { return null; }
      } },
    }),
    broadcast: (_project, data) => isSdkMode ? sendSdkEvent('scheduled_tasks', data)
      : sendEventToClients(clients.filter(client => ptyScopeMatches(client, data)), 'scheduled_tasks', data),
    report: reportSwallowed,
  });
  startScheduledTaskScheduler();
}

function sdkViewForUrl(parsedUrl) {
  if (!sdkManager) return null;
  // Unanchored legacy pages remain bound to the boot directory, never to a
  // process-wide active pointer changed by another browser.
  return sdkManager.getSdkSessionInfo(parsedUrl.searchParams.has('instance')
    ? { instanceKey: parsedUrl.searchParams.get('instance') }
    : { cwd: sdkBootCwd });
}

function sdkScopeMatches(client, data) {
  const scope = client.cxvSdkSession;
  if (!scope) return false;
  return data?.instanceKey
    ? data.instanceKey === scope.instanceKey && (!data.cwd || data.cwd === scope.cwd)
    : data?.cwd === scope.cwd;
}

function sendSdkEvent(eventName, data) {
  sendEventToClients(clients.filter(client => sdkScopeMatches(client, data)), eventName, data);
}

function sdkActionAnchor(ws, msg) {
  const scope = ws.cxvSdkSession;
  if (!scope) throw Object.assign(new Error('SDK workspace is not bound'), { code: 'SDK_SESSION_NOT_FOUND' });
  if ((msg.instanceKey != null && msg.instanceKey !== scope.instanceKey)
      || (msg.viewInstance != null && msg.viewInstance !== scope.instanceKey)
      || (msg.cwd != null && msg.cwd !== scope.cwd)) {
    throw Object.assign(new Error('SDK action belongs to a different workspace'), { code: 'SDK_SCOPE_MISMATCH' });
  }
  sdkManager.getSdkSessionInfo({ instanceKey: scope.instanceKey });
  return { instanceKey: scope.instanceKey };
}
const _defaultProxyProfiles = createDefaultProxyProfiles();
const _proxyProfilesRevision = raw => createHash('sha256').update(raw).digest('hex');
const _defaultProxyProfilesRaw = `${JSON.stringify(_defaultProxyProfiles, null, 2)}\n`;
const _proxyCredentials = createProxyProfileCredentials(PROFILE_PATH);
function _readProxyProfileState() {
  try { return _proxyCredentials.read(); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { raw: _defaultProxyProfilesRaw, document: _defaultProxyProfiles, data: _defaultProxyProfiles, missing: true };
  }
}
function _withProxyProfilesLock(callback) {
  return withProxyProfilesLock(PROFILE_PATH, callback);
}
const _maskApiKey = (k) => k && typeof k === 'string' && k.length > 4 ? '****' + k.slice(-4) : k ? '****' : '';
const _maskProfiles = (data) => {
  if (!data?.profiles) return data;
  return { ...data, profiles: data.profiles.map(p => p.apiKey ? { ...p, apiKey: _maskApiKey(p.apiKey) } : p) };
};
const _isMasked = (k) => typeof k === 'string' && /^\*{4}.{0,4}$/.test(k);
const _workspaceProxyWatchers = new Map();
function nativeRoleRouting(view) {
  const supported = view?.transport === 'appserver'
    || (view?.transport === 'pty' && ptyWorkspaces?.runtime(view.instanceKey)?.nativeProxyRoles === true);
  return { supported, roles: ['subagent'], reason: supported ? null : 'native-thread-identity-unavailable' };
}
function scopedProxyPayload(data, cwd, view) {
  const workspace = readWorkspaceProxy(LOG_DIR, cwd);
  const active = workspace.activeId || data.active;
  if (!data.profiles.some(p => p.id === active)) throw Object.assign(new Error('Assigned main proxy profile no longer exists'), { status: 409 });
  let officialDefault = true;
  try {
    const origin = new URL(process.env.CXV_ORIGINAL_BASE_URL || readOriginalOpenAiBaseUrl() || 'https://api.openai.com/v1').origin;
    officialDefault = origin === 'https://api.openai.com' || origin === 'https://chatgpt.com';
  } catch {}
  return { ...data, active, roles: workspace.roles, workspaceRevision: workspace.revision,
    workspaceAssigned: workspace.activeId !== undefined, officialDefault, roleRouting: nativeRoleRouting(view) };
}
function ensureWorkspaceProxyWatch(cwd) {
  const file = workspaceProxyFile(LOG_DIR, cwd);
  if (_workspaceProxyWatchers.get(cwd)?.file === file) return;
  _workspaceProxyWatchers.get(cwd)?.stop();
  if (_workspaceProxyWatchers.size >= 256) {
    const key = _workspaceProxyWatchers.keys().next().value;
    _workspaceProxyWatchers.get(key).stop(); _workspaceProxyWatchers.delete(key);
  }
  const stop = watchWorkspaceProxy(file, () => {
    if (_stoppingPromise) return;
    if (isSdkMode) sendSdkEvent('proxy_profile', { cwd, profile: 'refresh' });
    else sendEventToClients(ptyEventClients({ cwd }), 'proxy_profile', { profile: 'refresh' });
  });
  _workspaceProxyWatchers.set(cwd, { file, stop });
}

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
let _dingtalkImBridge = null;
let _dingtalkImLock = null;
let _dingtalkRuntimeContextProvider = null;
let _dingtalkPtyStateProvider = null;

// Ask hook bridge state (for request_user_input hook)
// At most one pending request at a time (Codex Code is single-threaded)
let pendingAskHook = null; // { questions, res, timer, createdAt }

// Permission hook bridge state (for Codex PermissionRequest approval)
const pendingPermHooks = new Map(); // id -> { toolName, input, res, timer, createdAt }

// Editor session state (for $EDITOR intercept)
const editorSessions = new Map(); // [instanceKey, sessionId] → owned editor metadata
function clearEditorSessions(instanceKey) {
  for (const [key, session] of editorSessions) if (instanceKey === undefined || session.scope?.instanceKey === instanceKey) editorSessions.delete(key);
}
const editorFrame = session => ({ type: 'editor-open', ...session.scope, sessionId: session.sessionId, filePath: session.filePath });
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
let dialogueMux = null;
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
let _restartHandler = null;
export function setRestartHandler(fn) { _restartHandler = fn; }
const PROCESS_ID = `${process.pid}-${Date.now()}`;
export function setLaunchCallback(fn) { _launchCallback = fn; }
export function setWorkspaceLaunched(v) { _workspaceLaunched = v; }
export async function initPostLaunch() {
  if (process.env.CXV_IM_WORKER !== '1') {
    notifyStatsWorker();
    startStreamingStatusTimer();
    try {
      const { reconcileDingTalkImProcess } = await import('./lib/dingtalk-im-process-manager.js');
      await reconcileDingTalkImProcess();
    } catch (error) {
      console.warn('[CX Viewer] DingTalk IM worker reconciliation failed:', error?.message || error);
    }
    return;
  }
  if (process.env.CXV_IM_PLATFORM !== 'dingtalk') return;

  const [{ createDingTalkImBridge }, { loadDingTalkImConfig }, lockMod, ptyMod, appServerMod] = await Promise.all([
    import('./lib/dingtalk-im-bridge.js'),
    import('./lib/dingtalk-im-config.js'),
    import('./lib/dingtalk-im-lock.js'),
    import('./pty-manager.js'),
    import('./lib/appserver-bridge.js'),
  ]);
  _dingtalkImLock = lockMod.readDingTalkImLock();
  if (!_dingtalkImLock || _dingtalkImLock.pid !== process.pid) {
    throw new Error('DingTalk IM worker lock identity is missing');
  }
  _dingtalkImBridge = createDingTalkImBridge({
    getConfig: loadDingTalkImConfig,
    getPtyState: ptyMod.getPtyState,
    writeToPtySequential: ptyMod.writeToPtySequential,
    canInject: () => {
      const state = appServerMod.getAppServerInputState();
      const boot = ptyScope();
      return state.connected && !state.active && state.pendingRequests === 0
        && !(boot && ptyQueues.get(boot.instanceKey)?.queue.isDispatching());
    },
    getActiveContext: () => ({
      ...getActiveProjectContext(),
      ...appServerMod.getAppServerRuntimeContext(),
    }),
  });
  _dingtalkRuntimeContextProvider = appServerMod.getAppServerRuntimeContext;
  _dingtalkPtyStateProvider = ptyMod.getPtyState;
  appServerMod.setAppServerTurnTerminalListener((event) => _dingtalkImBridge?.notifyTurnTerminal(event));
  appServerMod.setAppServerAgentMessageDeltaListener((event) => _dingtalkImBridge?.notifyAgentMessageDelta(event));
  const connected = await _dingtalkImBridge.start();
  if (!connected) {
    lockMod.updateDingTalkImLock(_dingtalkImLock, {
      ready: false, connected: false, connectionState: 'failed', lastError: 'DingTalk bridge failed to start',
    });
    throw new Error('DingTalk bridge failed to start');
  }
  lockMod.updateDingTalkImLock(_dingtalkImLock, {
    port: actualPort,
    ready: true,
    connected: true,
    connectionState: _dingtalkImBridge.getStatus().connectionState,
    lastError: null,
  });
}

export function getDingTalkImWorkerStatus() {
  const status = _dingtalkImBridge?.getStatus?.() || {};
  const runtime = _dingtalkRuntimeContextProvider?.() || {};
  const pty = _dingtalkPtyStateProvider?.() || {};
  const ready = status.running === true && pty.running === true && !!runtime.threadId;
  return {
    platform: 'dingtalk',
    pid: process.pid,
    bootId: _dingtalkImLock?.bootId || null,
    ready,
    connected: ready && status.connectionState === 'connected',
    connectionState: status.connectionState || (_dingtalkImBridge ? 'starting' : 'disconnected'),
    lastError: status.lastError || null,
  };
}

// Global POST body size limit
const MAX_POST_BODY = _MAX_POST_BODY;



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const START_PORT = parseInt(process.env.CXV_START_PORT) || DEFAULT_START_PORT;
const MAX_PORT = parseInt(process.env.CXV_MAX_PORT) || DEFAULT_MAX_PORT;
const HOST = process.env.CXV_IM_WORKER === '1' ? '127.0.0.1' : '0.0.0.0';

// 局域网访问 token（本地 127.0.0.1 免验证）
const ACCESS_TOKEN = randomBytes(16).toString('hex');
// OTLP is a log-writing endpoint, so it must remain authenticated even on
// loopback. The token is injected only into Codex child processes.
const OTEL_ACCESS_TOKEN = randomBytes(32).toString('hex');

// SDK workspaces share one Viewer login. Its configuration owner is the boot
// workspace, while credentials/revisions are still reloaded on every decision.
const sdkAuthProject = process.env.CXV_PROJECT_DIR || null;
let authProject = sdkAuthProject;
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
  const nextProject = isSdkMode ? sdkAuthProject : (process.env.CXV_PROJECT_DIR || null);
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
    state.effective.passwordUnreadable ? 'unreadable' : 'readable',
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
const updateJob = new UpdateJob({ get currentPort() { return actualPort; } });
updateJob.subscribe(state => sendEventToClients(clients, 'update_progress', state));
onProxyProfileChange((data) => {
  const profile = data.profiles.find(item => item.id === data.active) || { id: 'max', name: 'Default' };
  const maskedProfile = profile.apiKey ? { ...profile, apiKey: _maskApiKey(profile.apiKey) } : profile;
  sendEventToClients(clients, 'proxy_profile', {
    active: data.active,
    profile: maskedProfile,
    ...(data.loadError ? { loadError: data.loadError } : {}),
  });
});
setLogV2CommitListener((entry, _result, context) => {
  void runParallelHook('onNewEntry', entry).catch(() => {});
  notifyStatsWorker(context?.projectId);
  void _dingtalkImBridge?.notifyLogV2Commit(entry, _result, context);
  if (!isMainAgentEntry(entry)) return;
  const usage = entry.response?.body?.usage;
  const contextEvent = usage ? buildContextWindowEvent(usage, nativeContextWindow(entry)) : null;
  if (contextEvent) {
    if (isSdkMode) sendSdkEvent('context_window', { ...contextEvent, cwd: context.cwd,
      instanceKey: entry._captureContext?.instanceKey || entry._instanceKey || entry.body?.metadata?.instance_key });
    else sendEventToClients(ptyEventClients({ cwd: context?.cwd, instanceKey: context?.instanceKey || entry._instanceKey }), 'context_window', contextEvent);
  }
});
let server;
let actualPort = 0;
let serverProtocol = 'http';
let pluginRoutes = [];
// Stats Worker 实例
let statsWorker = null;
let statsUpdateTimer = null;
const pendingStatsProjects = new Set();

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
    url: `${serverProtocol}://127.0.0.1:${actualPort}${resolveBaseConfig().basePath}`,
    basePath: resolveBaseConfig().basePath,
    ip: getLocalIp(),
    token: ACCESS_TOKEN,
    protocol: serverProtocol,
    httpServer: server,
    registerRoute: registerPluginRoute,
  });
}

function pluginsWithRuntime() {
  return getPluginsInfo().map(plugin => plugin.type === 'service'
    ? { ...plugin, serviceStatus: pluginRuntime.getRuntimePluginStatus(plugin.name) } : plugin);
}

async function reloadServicePlugins(options = {}) {
  const result = await pluginRuntime.reloadRuntime(options);
  if (!result.ok) throw Object.assign(new Error(result.error), { status: 503 });
  await refreshPluginRuntime();
  return result;
}

function getPublicAccessUrl(ip = getLocalIp(), req = null) {
  const cfg = resolveBaseConfig();
  return externalUrlFromConfig(cfg, { token: ACCESS_TOKEN, req })
    || `${serverProtocol}://${ip}:${actualPort}${cfg.basePath}?token=${ACCESS_TOKEN}`;
}

function startStatsWorker() {
  try {
    const worker = new Worker(new URL('./lib/stats-worker.js', import.meta.url));
    statsWorker = worker;
    worker.on('error', (err) => {
      console.error('[CX Viewer] Stats worker error:', err.message);
      if (statsWorker === worker) statsWorker = null;
    });
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error('[CX Viewer] Stats worker exited with code', code);
      }
      if (statsWorker === worker) statsWorker = null;
    });
  } catch (err) {
    console.error('[CX Viewer] Failed to start stats worker:', err.message);
  }
}

function notifyStatsWorker(projectName = getActiveProjectContext().projectId) {
  if (!projectName) return;
  if (!statsWorker) startStatsWorker();
  if (!statsWorker) return;
  pendingStatsProjects.add(projectName);
  if (statsUpdateTimer) return;
  statsUpdateTimer = setTimeout(() => {
    statsUpdateTimer = null;
    const projects = [...pendingStatsProjects];
    pendingStatsProjects.clear();
    if (!statsWorker) startStatsWorker();
    for (const pendingProject of projects) {
      statsWorker?.postMessage({ type: 'update', logDir: LOG_DIR, projectName: pendingProject });
    }
  }, 250);
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

// 多 git 仓库支持：解析 repo 参数为安全的 cwd 路径
function resolveRepoCwd(repoParam, projectDir = currentProjectDir()) {
  if (!repoParam || repoParam === '.') {
    // 快速路径：验证 projectDir 确实是 git 仓库，避免非 repo 目录返回 500 泄漏路径
    if (!existsSync(join(projectDir, '.git'))) return null;
    return projectDir;
  }
  if (repoParam.includes('/') || repoParam.includes('\\') || PATH_TRAVERSAL.test(repoParam)) return null;
  const candidate = join(projectDir, repoParam);
  try {
    if (!existsSync(candidate) || !statSync(candidate).isDirectory()) return null;
    if (!existsSync(join(candidate, '.git'))) return null;
    if (!isPathContained(candidate, projectDir)) return null;
    // 返回 realpath 规整后的路径，避免校验后仍使用可被符号链接替换的原始路径（TOCTOU）
    return realpathSync(candidate);
  } catch { return null; }
}

// Per-file mutex 序列化「git status + checkout/clean」子命令对。多 tab 并发同文件
// revert 时不再有 race 让两个 checkout 交错执行（最终状态不可预测）。
const GIT_RESTORE_LOCK_CLEANUP_MS = 30000;
const gitRestoreLocks = new Map();

async function handleRequest(req, res) {
  try { await handleViewerRequest(req, res); }
  catch (error) {
    if (!res.headersSent) sendJson(res, error.status || 500, { error: error.message, code: error.code });
    else res.destroy();
  }
}

// A sandboxed target HTML document has an opaque origin: its relative resources
// lose ambient login cookies and appear cross-site. Give only this raw GET/HEAD
// route a target/view-bound read proof, never the server's general access token.
function targetPreviewToken(target, project, instance) {
  const identity = target?.kind === 'codex-md'
    ? [target.kind, target.id] : [target?.kind, target?.source, target?.path];
  return createHmac('sha256', ACCESS_TOKEN).update(JSON.stringify([
    'target-preview', identity, project, instance, target?.previewSession || '', getAuthSessionContext(),
  ])).digest('base64url');
}

function safeParseRequestUrl(req) {
  try {
    if (typeof req.headers.host !== 'string' || !req.headers.host) return null;
    new URL(`http://${req.headers.host}/`);
    const parsed = new URL(req.url, `${serverProtocol}://${req.headers.host}`);
    parsed.pathname = stripBasePath(parsed.pathname, resolveBaseConfig().basePath);
    return parsed;
  } catch { return null; }
}

function isViewerOriginAllowed(req) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  const host = typeof req.headers.host === 'string' ? req.headers.host : '';
  if (isSameOriginRequest(origin, host, serverProtocol)) return true;
  // An explicitly configured public host may terminate TLS at its reverse proxy.
  // This only validates browser origin; password login/cookies still use backend TLS.
  const cfg = resolveBaseConfig();
  try {
    return !!cfg.host && new URL(`http://${host}`).hostname.toLowerCase() === cfg.host
      && isSameOriginRequest(origin, host, resolveExternalScheme({ scheme: cfg.scheme, req }));
  } catch { return false; }
}

function injectViewerBase(html, basePath) {
  const href = basePath || '/';
  const escaped = href.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let injected = `<base href="${escaped}">`;
  if (basePath) injected += `<script>window.__CXV_BASE_PATH__=${JSON.stringify(basePath).replace(/</g, '\\u003c')}</script>`;
  return html.replace(/<head[^>]*>/i, match => match + injected);
}

function isHostAllowed(hostHeader) {
  const allowed = process.env.CXV_ALLOWED_HOSTS
    ? process.env.CXV_ALLOWED_HOSTS.split(',').map(host => host.trim()).filter(Boolean)
    : ['localhost', '127.0.0.1', '::1', '[::1]', ...getAllLocalIps()];
  const publicHost = baseUrlAllowedHost();
  if (publicHost) allowed.push(publicHost);
  if (allowed.includes('*')) return true;
  const host = String(hostHeader || '').toLowerCase();
  const bare = host.includes('::') && !host.includes(']') ? host : host.replace(/:\d+$/, '');
  const unbracketed = bare.replace(/^\[|\]$/g, '');
  return allowed.some(value => [bare, unbracketed, `[${unbracketed}]`].includes(value.toLowerCase()));
}

async function handleViewerRequest(req, res) {
  const parsedUrl = safeParseRequestUrl(req);
  if (!parsedUrl) { sendJson(res, 400, { error: 'Bad Request: invalid Host header' }); return; }
  const url = parsedUrl.pathname;
  if (!url.startsWith('/assets/') && url !== '/favicon.ico' && req.method !== 'OPTIONS' && !isHostAllowed(req.headers.host)) {
    sendJson(res, 403, { error: 'host-not-allowed' }); return;
  }
  const method = req.method;
  let isTargetPreviewResource = false;
  if ((method === 'GET' || method === 'HEAD') && url.startsWith('/api/file-raw/target/')) {
    try {
      const parts = url.slice('/api/file-raw/target/'.length).split('/');
      const target = JSON.parse(decodeURIComponent(parts[0]));
      if (['codex-md', 'skill'].includes(target?.kind)) isTargetPreviewResource = safeTokenMatches(
        target.previewToken, targetPreviewToken(target, decodeURIComponent(parts[1]), decodeURIComponent(parts[2])));
      if (isTargetPreviewResource && target.previewSession) {
        const grant = [...authSessions.keys()].find(token => safeTokenMatches(
          createHash('sha256').update(token).digest('base64url'), target.previewSession));
        isTargetPreviewResource = isAuthSessionValid(grant);
      }
    } catch { /* Malformed scopes are rejected by the normal parser below. */ }
  }

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
  const originAllowed = isViewerOriginAllowed(req);

  // Browser API access is same-origin. Header-less CLI/native clients remain
  // compatible; a hostile Origin never gains CORS permission to localhost.
  if (requestOrigin && (originAllowed || (isTargetPreviewResource && requestOrigin === 'null'))) res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(originAllowed ? 200 : 403);
    res.end();
    return;
  }
  if (requestOrigin && !originAllowed && !(isTargetPreviewResource && requestOrigin === 'null')) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden: cross-origin request' }));
    return;
  }

  // 局域网访问验证：本机、分享 token、密码登录 Cookie 三种方式均可放行。
  const remoteIp = req.socket.remoteAddress;
  const isLoopbackPeer = remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp === '::ffff:127.0.0.1';
  const isLocal = isLoopbackPeer && isLoopbackHost(requestHost) && originAllowed;
  const isStaticAsset = url.startsWith('/assets/') || url === '/favicon.ico' || url.startsWith('/plugin-panels/');
  const currentAuthConfig = getAuthConfig();
  const remotePasswordLogin = serverProtocol === 'https';
  const cookieToken = parseCookies(req.headers.cookie).cxv_auth;
  const validatedSessionToken = isAuthSessionValid(cookieToken) ? cookieToken : '';
  // Target files only: static/passwordless allow is not administrator proof.
  const isTargetFileAdmin = req.headers['sec-fetch-site'] !== 'cross-site' && (isLocal
    || safeTokenMatches(parsedUrl.searchParams.get('token'), ACCESS_TOKEN)
    || safeTokenMatches(cookieToken, validatedSessionToken));
  const authDecision = decideAuth({
    isStaticAsset,
    pathname: url,
    isLocal,
    urlToken: isTargetPreviewResource ? ACCESS_TOKEN : parsedUrl.searchParams.get('token'),
    cookieToken,
    accessToken: ACCESS_TOKEN,
    sessionToken: validatedSessionToken,
    enabled: currentAuthConfig.enabled,
    password: currentAuthConfig.password,
    passwordUnreadable: currentAuthConfig.passwordUnreadable,
    wantsHtml: method === 'GET' && ((req.headers.accept || '').includes('text/html') || url === '/'),
    passwordLoginAvailable: isLocal || remotePasswordLogin,
  });
  if (authDecision.action === 'login-page') {
    const lang = localeFromAcceptLanguage(req.headers['accept-language']);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(renderLoginPage({ lang, basePath: resolveBaseConfig().basePath }));
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

  const pluginSurface = url === '/plugins' || url.startsWith('/plugins/');
  const pluginWrite = (url === '/api/plugins' || url.startsWith('/api/plugins/'))
    && method !== 'GET' && method !== 'HEAD';
  if ((pluginSurface || pluginWrite || url === '/api/local-url') && !isTargetFileAdmin) {
    sendJson(res, 403, { error: 'Forbidden: admin and same-origin required' });
    return;
  }
  if ((pluginSurface || pluginWrite) && _viewerStopping) {
    sendJson(res, 503, { error: 'server is stopping' });
    return;
  }
  const updateRoute = updateRoutes.find(route => route.path === url && route.method === method);
  if (updateRoute) {
    await updateRoute.handler(req, res, parsedUrl, isTargetFileAdmin && originAllowed, {
      updateJob, restartProcess: version => _restartHandler(version),
      canRestartProcess: typeof _restartHandler === 'function', isRuntimeStopping: _viewerStopping,
    });
    return;
  }
  const serviceRoute = pluginServicesRoutes.find(route => route.predicate(url));
  if (serviceRoute) { await serviceRoute.handler(req, res, parsedUrl); return; }

  if (await handleDingTalkImRoute(req, res, parsedUrl, {
    isLocal,
    bridge: _dingtalkImBridge,
    workerReady: getDingTalkImWorkerStatus().ready,
    readUpload: readMultipartUpload,
  })) return;

  if (process.env.CXV_IM_WORKER === '1' && !url.startsWith('/v1/')) {
    sendJson(res, 404, { error: 'Not Found' });
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

  // The original HTML preview carries scope in the path so relative resources
  // retain the same workspace. Reuse the existing exact SDK view resolver.
  let rawPath = null;
  let rawProject = '';
  if ((method === 'GET' || method === 'HEAD') && url.startsWith('/api/file-raw/')) {
    try {
      const tail = url.slice('/api/file-raw/'.length);
      if (tail.startsWith('target/')) {
        const parts = tail.slice(7).split('/');
        if (parts.length < 4) throw new Error('Invalid target view scope');
        const target = JSON.parse(decodeURIComponent(parts[0]));
        if (!target || !['codex-md', 'skill'].includes(target.kind)) throw new Error('Invalid target kind');
        const targetParams = target.kind === 'codex-md'
          ? { kind: target.kind, id: target.id } : { kind: target.kind, source: target.source, targetPath: target.path };
        for (const [key, value] of Object.entries(targetParams)) {
          if (typeof value !== 'string' || (parsedUrl.searchParams.has(key) && parsedUrl.searchParams.get(key) !== value)) throw new Error('Target scope mismatch');
          parsedUrl.searchParams.set(key, value);
        }
        rawProject = decodeURIComponent(parts[1]);
        const instance = decodeURIComponent(parts[2]);
        if (isSdkMode && !instance) throw new Error('Missing view instance');
        if (instance) {
          if (parsedUrl.searchParams.has('instance') && parsedUrl.searchParams.get('instance') !== instance) throw new Error('View scope mismatch');
          parsedUrl.searchParams.set('instance', instance);
        }
        rawPath = decodeURIComponent(parts.slice(3).join('/'));
      } else if (tail.startsWith('view/')) {
        const parts = tail.slice(5).split('/');
        rawProject = decodeURIComponent(parts[0] || '');
        const instance = decodeURIComponent(parts[1] || '');
        if (parts.length < 3 || !instance || (!isSdkMode && !ptyWorkspaces)) throw new Error('Invalid view scope');
        if (parsedUrl.searchParams.has('instance') && parsedUrl.searchParams.get('instance') !== instance) throw new Error('View scope mismatch');
        parsedUrl.searchParams.set('instance', instance);
        rawPath = decodeURIComponent(parts.slice(2).join('/'));
      } else rawPath = decodeURIComponent(tail);
      if (!rawPath || rawPath.includes('\0')) throw new Error('Invalid path');
    } catch (error) { sendJson(res, 400, { error: error.message }); return; }
  }

  if ((url.startsWith('/api/') || url === '/events') && !url.startsWith('/api/workspaces') && url !== '/api/cli-mode') {
    try {
      if (isSdkMode && parsedUrl.searchParams.has('instance')) req.cxvSdkSession = sdkViewForUrl(parsedUrl);
      else if (ptyWorkspaces || parsedUrl.searchParams.has('instance')) req.cxvPtySession = ptyViewForUrl(parsedUrl);
    } catch (error) { sendJson(res, error.status || 400, { error: error.message, code: error.code }); return; }
  }
  const requestProjectDir = currentProjectDir(req);
  const requestSdkView = req.cxvPtySession || (isSdkMode ? (req.cxvSdkSession
    || sdkManager.listSdkSessions().find(session => session.cwd === sdkBootCwd)
    || { cwd: sdkBootCwd, projectName: basename(sdkBootCwd) }) : null);
  const requestProjectName = requestSdkView ? requestSdkView.projectName : _projectName;
  if (rawProject && rawProject !== requestProjectName) { sendJson(res, 400, { error: 'Project scope mismatch' }); return; }

  try {
    const hookResult = await runWaterfallHook('beforeRequest', { req, res, url, method, parsedUrl, handled: false });
    if (hookResult.handled) return;
  } catch (err) {
    if (!res.headersSent) sendJson(res, 500, { error: 'Plugin error' });
    return;
  }
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

  if (await handleScheduledTaskRoute(req, res, parsedUrl, {
    root: LOG_DIR, scope: requestSdkView,
    resolveInstance: instanceKey => isSdkMode ? sdkManager.getSdkSessionInfo({ instanceKey }) : ptyWorkspaces?.info(instanceKey),
    admin: isTargetFileAdmin, readBody: readStrictUtf8JsonBody, sendJson,
    engine: isSdkMode ? 'sdk' : 'pty',
    broadcast: data => isSdkMode ? sendSdkEvent('scheduled_tasks', data)
      : sendEventToClients(clients.filter(client => ptyScopeMatches(client, data)), 'scheduled_tasks', data),
  })) return;

  if (handleUltraAgentsRoute(req, res, parsedUrl)) return;
  if (await handleVoicePackRoute(req, res, parsedUrl, { isLocal, readUpload: readMultipartUpload })) return;

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
      if (entries.length > 0) {
        for (const entry of entries.flat().filter(Boolean)) appendLogEntry(entry, {
          source: 'otel',
          cwd: requestProjectDir,
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
    req.on('end', async () => {
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
        const uploadPaths = workspaceUploadPaths(requestProjectDir, requestProjectName);
        const uploadDir = uploadPaths.temporary;
        await fsPromises.mkdir(uploadDir, { recursive: true });
        // Unique filename: prepend timestamp to avoid silent overwrite
        const ts = Date.now();
        const dotIdx = originalName.lastIndexOf('.');
        const uniqueName = dotIdx > 0
          ? `${originalName.slice(0, dotIdx)}-${ts}-${randomBytes(8).toString('hex')}${originalName.slice(dotIdx)}`
          : `${originalName}-${ts}-${randomBytes(8).toString('hex')}`;
        const savePath = join(uploadDir, uniqueName);
        await fsPromises.writeFile(savePath, fileData, { mode: 0o600, flag: 'wx' });
        // 持久化副本到 ~/.codex/cx-viewer/${project}/images/，避免 /tmp 清理后丢失
        let persistPath = null;
        try {
          const persistDir = uploadPaths.persistent;
          await fsPromises.mkdir(persistDir, { recursive: true });
          persistPath = join(persistDir, uniqueName);
          await fsPromises.copyFile(savePath, persistPath, fsConstants.COPYFILE_EXCL);
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
        const cwd = requestProjectDir;
        // Check existing ancestors before mkdir, including a not-yet-created dir.
        const targetDir = resolveFilePath(cwd, dir || '.', false);
        assertNativeFilePath(targetDir);
        mkdirSync(targetDir, { recursive: true });
        const realDir = realpathSync(targetDir);
        const realCwd = realpathSync(cwd);
        if (realDir !== realCwd && !realDir.startsWith(realCwd + sep)) {
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
        assertFileToolMutationPath(savePath, cwd);
        while (existsSync(savePath)) {
          finalName = `${stem}-${counter}${ext}`;
          savePath = join(realDir, finalName);
          assertFileToolMutationPath(savePath, cwd);
          counter++;
        }
        // A raced-in file/link must not be overwritten after the existence check.
        writeFileSync(savePath, fileData, { flag: 'wx' });
        const relPath = dir ? `${dir}/${finalName}` : finalName;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, name: finalName, relPath }));
      } catch (err) {
        console.error('import-file error:', err);
        const status = ERROR_STATUS_MAP[err.code] || (err.code === 'EEXIST' ? 409 : 500);
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: status === 500 ? 'Import failed' : err.message }));
      }
    });
    return;
  }

  if (url === '/api/preferences' && method === 'GET') {
    let prefs = readPreferences();
    delete prefs.scheduledTasks;
    if (!isLocal) {
      prefs = { ...prefs };
      delete prefs.auth;
      delete prefs.authByProject;
    }
    if (prefs.approvalModal?.voicePack) {
      prefs.approvalModal.voicePack = reconcileVoicePackPrefs(LOG_DIR, prefs.approvalModal.voicePack);
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
        delete incoming.scheduledTasks;
        if (Object.prototype.hasOwnProperty.call(incoming, 'approvalsReviewer')) {
          if (!isSupportedApprovalsReviewer(incoming.approvalsReviewer)) {
            sendJson(res, 400, { error: 'Unsupported approvalsReviewer' });
            return;
          }
          incoming.approvalsReviewer = normalizeApprovalsReviewer(incoming.approvalsReviewer);
        }
        // Writers bind their root at startup; changing only the reader root would split the log store.
        if (incoming.logDir && typeof incoming.logDir === 'string') {
          const requested = resolve(incoming.logDir.startsWith('~/')
            ? join(homedir(), incoming.logDir.slice(2))
            : incoming.logDir);
          if (requested !== LOG_DIR) {
            sendJson(res, 409, { error: 'Changing the log directory requires a CX Viewer restart' });
            return;
          }
        }
        const prefs = updatePreferences(current => {
          const { approvalModal, ...rest } = incoming;
          Object.assign(current, rest);
          if (approvalModal && typeof approvalModal === 'object') {
            current.approvalModal = mergeApprovalModalPrefs(current.approvalModal, approvalModal, {
              reconcile: vp => reconcileVoicePackPrefs(LOG_DIR, vp),
            });
          }
          return current;
        });
        const reviewerState = Object.prototype.hasOwnProperty.call(incoming, 'approvalsReviewer')
          ? applyRuntimeApprovalsReviewer(incoming.approvalsReviewer, requestSdkView)
          : null;
        if (reviewerState) broadcastApprovalsReviewer(reviewerState.approvalsReviewer, requestSdkView);
        const themePty = req.cxvPtySession && ptyWorkspaces.session(req.cxvPtySession.instanceKey);
        const themeWrite = themePty?.writeToPty || _writeToPty;
        const themeOnData = themePty ? cb => themePty.onPtyRawData(event => cb(event.data, event)) : _onPtyData;
        // 主题切换时同步到 Codex Code CLI：发 /theme，监听输出验证结果，不对就再发一次
        if (incoming.themeColor && themeWrite && themeOnData) {
          const target = incoming.themeColor === 'light' ? 'light' : 'dark';
          let buf = '';
          let retried = false;
          const removeListener = themeOnData((data) => {
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
                try { themeWrite('/theme\r'); } catch {}
              }
            }
          });
          // 5 秒超时，避免监听器泄漏
          const timeout = setTimeout(() => { removeListener(); }, 5000);
          try { themeWrite('/theme\r'); } catch {}
        }
        delete prefs.scheduledTasks;
        prefs.logDir = LOG_DIR;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(reviewerState ? { ...prefs, ...reviewerState } : prefs));
      } catch (error) {
        if (error.code === 'PREFERENCES_UNREADABLE') {
          sendApiError(res, error);
          return;
        }
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (url === '/api/approval-reviewer' && method === 'GET') {
    const saved = getApprovalsReviewerPreference();
    const runtime = reviewerStateFor(requestSdkView);
    sendJson(res, 200, {
      approvalsReviewer: runtime.approvalsReviewer || saved || APPROVALS_REVIEWER_DEFAULT,
      explicitlyConfigured: !!saved,
      appliedToRuntime: runtime.appliedToRuntime,
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
      const runtime = applyRuntimeApprovalsReviewer(approvalsReviewer, requestSdkView);
      broadcastApprovalsReviewer(runtime.approvalsReviewer, requestSdkView);
      sendJson(res, 200, { ok: true, ...runtime });
    }).catch((err) => sendApiError(res, err, 'Invalid request body'));
    return;
  }

  if (url === '/api/expert/system-prompt-presets' && method === 'GET') {
    if (!authorizeCodexMemoryRequest(req, res, parsedUrl)) return;
    res.setHeader('Cache-Control', 'private, no-store');
    sendJson(res, 200, { presets: listSystemPromptPresets(), variablesDoc:SYSTEM_PROMPT_VARIABLES_DOC });
    return;
  }

  if ((url === '/api/expert/system-text' || url === '/api/expert/model-prompts')
      && (method === 'GET' || method === 'POST')) {
    if (!authorizeCodexMemoryRequest(req, res, parsedUrl)) return;
    res.setHeader('Cache-Control', 'private, no-store');
    const capability = getSystemPromptRuntimeCapability(requestSdkView);
    const cwd = currentProjectDir(req);
    const active = !(isWorkspaceMode && !_workspaceLaunched);
    try {
      if (url === '/api/expert/system-text' && method === 'GET') {
        const entry = getDefaultSystemPrompt({ logDir: LOG_DIR, cwd });
        sendJson(res, 200, { ...entry, active, capability });
        return;
      }
      if (url === '/api/expert/model-prompts' && method === 'GET') {
        const modelId = getWorkspaceProxyProfile(cwd)?.activeModel || _defaultConfig?.model || readCodexGlobalConfig().model || null;
        const selected = selectSystemPrompt({logDir:LOG_DIR,cwd,model:modelId});
        const matched = selected && selected.name !== 'DEFAULT' ? {name:selected.name,scope:selected.scope,mode:selected.mode} : null;
        sendJson(res, 200, {
          ...getModelSystemPrompts({ logDir: LOG_DIR, cwd }),
          modelId,matched,
          active,
          capability,
        });
        return;
      }

      if (capability.status !== 'supported') {
        sendJson(res, 409, {
          ok: false,
          error: 'system_prompt_unsupported',
          code: 'system_prompt_unsupported',
          capability,
        });
        return;
      }
      // JSON escaping can expand one UTF-8 text byte to six ASCII bytes
      // (for example control characters encoded as \u00XX).
      const body = await readStrictUtf8JsonBody(req, SYSTEM_PROMPT_MAX_BYTES * 6 + 4096);
      if (typeof body.revision !== 'string' || !/^(?:0|[a-f0-9]{64})$/.test(body.revision)) {
        sendJson(res, 400, {
          ok: false,
          error: 'invalid_revision',
          code: 'invalid_revision',
        });
        return;
      }
      if (url === '/api/expert/model-prompts' && body.action !== undefined) {
        if (body.action !== 'disable-builtin' && body.action !== 'enable-builtin') throw new SystemPromptStoreError('bad_action', 400);
        const result = setBuiltinModelPromptDisabled({ logDir: LOG_DIR, cwd, scope: body.scope, name: body.name,
          disabled: body.action === 'disable-builtin', expectedRevision: body.revision });
        sendJson(res, 200, { ok: true, ...result, capability });
        return;
      }
      const mode = body.mode === 'override' ? 'override' : body.mode === 'append' ? 'append' : null;
      if (!mode || capability[mode] !== true) {
        sendJson(res, 409, {
          ok: false,
          error: 'system_prompt_mode_unsupported',
          code: 'system_prompt_mode_unsupported',
          capability,
        });
        return;
      }
      const result = url === '/api/expert/system-text'
        ? saveDefaultSystemPrompt({
            logDir: LOG_DIR,
            cwd,
            text: body.text,
            mode,
            expectedRevision: body.revision,
          })
        : saveModelSystemPrompt({
            logDir: LOG_DIR,
            cwd,
            scope: body.scope,
            name: body.name,
            text: body.text,
            mode,
            expectedRevision: body.revision,
          });
      sendJson(res, 200, { ok: true, ...result, capability });
    } catch (error) {
      if (error instanceof SystemPromptStoreError || Number.isInteger(error?.status)) {
        sendApiError(res, error, 'System prompt request failed');
      } else {
        console.error('[CX Viewer] Managed system prompt error:', error?.code || error?.message || error);
        sendJson(res, 500, {
          ok: false,
          error: 'system_prompt_store_failed',
          code: 'system_prompt_store_failed',
        });
      }
    }
    return;
  }

  if (url === '/api/codex-md' && method === 'GET') {
    const entries = discoverCodexMdEntries(req);
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
      sendJson(res, 200, { content: readPublicFileSync(hit.path, 'utf8', assertNativeFilePath) });
    } catch (err) {
      sendJson(res, err.status || 500, { error: err.message || 'Failed to read AGENTS.md' });
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
          cwd: currentProjectDir(req),
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
      sendJson(res, 200, { ok: true, skills: listSkills({ cwd: currentProjectDir(req) }) });
    } catch (err) {
      sendApiError(res, err, 'Failed to list skills');
    }
    return;
  }

  if (url === '/api/skills/toggle' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const result = toggleSkill(body, { cwd: currentProjectDir(req) });
      sendJson(res, 200, result);
    } catch (err) {
      sendApiError(res, err, 'Failed to toggle skill');
    }
    return;
  }

  if (url === '/api/skills/delete' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const result = deleteSkill(body, { cwd: currentProjectDir(req) });
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

  // === Workspace API ===

  // 目录浏览器
  if (url.startsWith('/api/browse-dir') && method === 'GET') {
    try {
      const dirPath = assertPublicFilePath(parsedUrl.searchParams.get('path') || homedir());
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
        if (!isPublicFilePath(fullPath)) continue;
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
      res.writeHead(err.status || 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url === '/api/workspaces' && method === 'GET') {
    import('./workspace-registry.js').then(({ getWorkspaces }) => {
      const workspaces = getWorkspaces();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ workspaces, workspaceMode: isWorkspaceMode && !_workspaceLaunched,
        ...(ptyWorkspaces ? { ptyMode: true, sessions: ptyWorkspaces.list(),
          currentInstanceKey: ptyWorkspaces.list().find(session => parsedUrl.searchParams.has('instance')
            ? session.instanceKey === parsedUrl.searchParams.get('instance') : session.active)?.instanceKey || null } : {}),
        ...(isSdkMode ? { sdkMode: true, sessions: sdkManager.listSdkSessions(),
          currentInstanceKey: sdkManager.listSdkSessions().find(session => parsedUrl.searchParams.has('instance')
            ? session.instanceKey === parsedUrl.searchParams.get('instance') : session.cwd === sdkBootCwd)?.instanceKey || null } : {}) }));
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
        if (typeof wsPath !== 'string' || !wsPath.trim() || !existsSync(wsPath) || !statSync(wsPath).isDirectory()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid directory path' }));
          return;
        }

        const { registerWorkspace } = await import('./workspace-registry.js');

        // Electron multi-tab 模式：管理 server 只触发 callback，不做日志初始化
        // 所有日志相关操作（initForWorkspace、watchLogFile、spawnCodex）由 tab-worker 子进程负责
        if (process.env.CXV_ELECTRON_MULTITAB === '1') {
          registerWorkspace(wsPath);
          if (_launchCallback) {
            _launchCallback(wsPath, Array.isArray(launchExtraArgs) ? launchExtraArgs : []);
          }
          _workspaceLaunched = true;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, projectName: basename(wsPath) }));
          return;
        }

        if (isSdkMode) {
          const result = sdkManager.launchSdkSession(wsPath, basename(resolve(wsPath)), launchExtraArgs);
          try {
            ensureProjectIdForCwd(LOG_DIR, result.cwd, result.projectName);
            registerWorkspace(result.cwd);
          } catch (error) {
            if (!result.reused) sdkManager.closeSdkSession({ instanceKey: result.instanceKey });
            throw error;
          }
          _workspaceLaunched = true;
          sendJson(res, 200, { ok: true, sdkMode: true, projectName: result.projectName,
            path: result.cwd, instanceKey: result.instanceKey, reused: result.reused });
          const prompt = !result.reused && sdkManager.getInitialPrompt({ instanceKey: result.instanceKey });
          if (prompt) void sdkManager.sendUserMessage(prompt, { instanceKey: result.instanceKey }).catch(error => {
            broadcastWsMessage({ type: 'sdk-error', message: error.message, cwd: result.cwd, instanceKey: result.instanceKey });
          });
          return;
        }

        if (ptyWorkspaces) {
          const result = await ptyWorkspaces.ensure(wsPath, launchExtraArgs === undefined ? [] : launchExtraArgs);
          try { registerWorkspace(result.cwd); } catch (error) {
            if (!result.reused) await ptyWorkspaces.close(result.instanceKey);
            throw error;
          }
          _workspaceLaunched = true;
          sendJson(res, 200, { ok: true, ptyMode: true, projectName: result.projectName,
            path: result.cwd, instanceKey: result.instanceKey, reused: result.reused });
          return;
        }

        // 非 Electron 模式（web / CLI）：完整逻辑
        registerWorkspace(wsPath);
        const result = initForWorkspace(wsPath);
        process.env.CXV_PROJECT_DIR = wsPath;

        // 启动日志监听
        // 工作区切换后始终排队当前项目；若 worker 已退出，通知链路会自动重启。
        notifyStatsWorker();
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

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, projectName: result.projectName }));
      } catch (err) {
        res.writeHead(err.status || 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (ptyWorkspaces && url === '/api/workspaces/close' && method === 'POST') {
    try {
      const body = await readJsonBody(req, 4096);
      const registry = ptyWorkspaces;
      const scope = registry.info(body.instanceKey);
      stopPtyQueue(scope.instanceKey);
      clearEditorSessions(scope.instanceKey);
      const result = await registry.close(body.instanceKey);
      for (const pending of [...pendingCodexAsks.values()]) if (pending.scope?.instanceKey === scope.instanceKey) {
        removePendingCodexAsk(pending.id);
      }
      for (const [id, pending] of pendingPermHooks) if (pending.scope?.instanceKey === scope.instanceKey) {
        clearTimeout(pending.timer); pendingPermHooks.delete(id);
        if (!pending.res.headersSent) sendJson(pending.res, 409, { error: 'PTY workspace closed' });
      }
      for (const [key, data] of _ptyAgentLoops) if (data.instanceKey === scope.instanceKey) _ptyAgentLoops.delete(key);
      for (const [key, timer] of _ptyLoopEndTimers) if (key.startsWith(`${scope.instanceKey}\0`)) {
        clearTimeout(timer); _ptyLoopEndTimers.delete(key);
      }
      sendEventToClients(clients.filter(client => client.cxvPtySession?.instanceKey === scope.instanceKey), 'workspace_stopped', scope);
      for (const client of clients) if (client.cxvPtySession?.instanceKey === scope.instanceKey) client.end();
      for (const wss of [terminalWss, scratchTerminalWss]) for (const ws of wss?.clients || []) {
        if (ws.cxvPtySession?.instanceKey === scope.instanceKey) ws.close(1000, 'PTY workspace closed');
      }
      await shutdownScratchPtys(scope.instanceKey);
      sdkV2Recovery.delete(scope.instanceKey);
      _workspaceLaunched = registry.list().length > 0;
      sendJson(res, 200, result);
    } catch (error) { sendJson(res, error.status || 400, { error: error.message, code: error.code }); }
    return;
  }

  if (isSdkMode && url === '/api/workspaces/close' && method === 'POST') {
    try {
      const body = await readJsonBody(req, 4096);
      const result = sdkManager.closeSdkSession({ instanceKey: body.instanceKey });
      clearEditorSessions(body.instanceKey);
      const data = { cwd: result.cwd, instanceKey: result.instanceKey, reattachedTo: result.reattachedTo };
      sendSdkEvent('workspace_stopped', data);
      broadcastWsMessage({ type: 'sdk-workspace-closed', ...data });
      for (const client of clients.filter(client => sdkScopeMatches(client, data))) client.end();
      for (const ws of terminalWss?.clients || []) if (sdkScopeMatches(ws, data)) ws.close(1000, 'SDK workspace closed');
      await shutdownScratchPtys(result.instanceKey);
      for (const ws of scratchTerminalWss?.clients || []) if (sdkScopeMatches(ws, data)) ws.close(1000, 'SDK workspace closed');
      sdkV2Recovery.delete(result.instanceKey);
      sdkResumedFiles.delete(result.instanceKey);
      _workspaceLaunched = sdkManager.listSdkSessions().length > 0;
      sendJson(res, 200, result);
    } catch (error) { sendJson(res, error.status || 400, { error: error.message, code: error.code, candidates: error.candidates }); }
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

  if (ptyWorkspaces && url === '/api/workspaces/stop' && method === 'POST') {
    try {
      stopPtyQueues();
      clearEditorSessions();
      await ptyWorkspaces.closeAll();
      for (const wss of [terminalWss, scratchTerminalWss]) for (const ws of wss?.clients || []) {
        if (ws.cxvPtySession) ws.close(1000, 'PTY workspaces stopped');
      }
      for (const client of clients) if (client.cxvPtySession) client.end();
      for (const pending of [...pendingCodexAsks.values()]) removePendingCodexAsk(pending.id);
      for (const [id, pending] of pendingPermHooks) {
        clearTimeout(pending.timer); pendingPermHooks.delete(id);
        if (!pending.res.headersSent) sendJson(pending.res, 409, { error: 'PTY workspaces stopped' });
      }
      for (const timer of _ptyLoopEndTimers.values()) clearTimeout(timer);
      _ptyLoopEndTimers.clear(); _ptyAgentLoops.clear(); sdkV2Recovery.clear();
      await shutdownScratchPtys(); _workspaceLaunched = false;
      sendJson(res, 200, { ok: true });
    } catch (error) { sendJson(res, error.status || 500, { error: error.message, code: error.code }); }
    return;
  }

  if (url === '/api/workspaces/stop' && method === 'POST') {
    clearEditorSessions();
    if (isSdkMode) {
      sdkManager.stopSession();
      sdkV2Recovery.clear();
      sdkResumedFiles.clear();
      _workspaceLaunched = false;
      for (const client of clients) if (client.cxvSdkSession) {
        sendEventToClients([client], 'workspace_stopped', client.cxvSdkSession);
        client.end();
      }
      for (const ws of terminalWss?.clients || []) if (ws.cxvSdkSession) ws.close(1000, 'SDK workspaces stopped');
      await shutdownScratchPtys();
      for (const ws of scratchTerminalWss?.clients || []) ws.close(1000, 'SDK workspaces stopped');
      sendJson(res, 200, { ok: true });
      return;
    }
    import('./pty-manager.js').then(({ killPty }) => {
      killPty();

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

  if (isSdkMode && (url === '/api/resume-sessions' && method === 'GET'
      || url === '/api/resume-session' && method === 'POST')) {
    try {
      const anchor = requestSdkView.instanceKey ? { instanceKey: requestSdkView.instanceKey } : { cwd: sdkBootCwd };
      const view = sdkManager.getSdkSessionInfo(anchor);
      if (method === 'GET') {
        const requested = Number(parsedUrl.searchParams.get('limit'));
        const limit = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 50) : 10;
        await flushLogV2Writes();
        sendJson(res, 200, { items: listSdkResumeSessions(LOG_DIR, { ...projectContextForSdkView(view), cwd: view.cwd }, limit,
          { sessionId: parsedUrl.searchParams.get('sessionId') }),
          instanceKey: view.instanceKey, currentSessionId: view.sessionId, busy: view.busy });
      } else {
        const body = await readJsonBody(req, 4096);
        if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.file !== 'string') {
          throw new TypeError('A history file is required');
        }
        if (body.instanceKey != null && body.instanceKey !== view.instanceKey) {
          throw Object.assign(new Error('Resume belongs to a different workspace'), { code: 'SDK_SCOPE_MISMATCH', status: 409 });
        }
        const event = await restoreSdkSessionFromHistory(anchor, body.file);
        sendJson(res, 200, { ok: true, ...event });
      }
    } catch (error) {
      const status = error.status || ({ NOT_FOUND: 404, ENOENT: 404, ACCESS_DENIED: 403,
        CXV_LOG_V2_INCOMPLETE: 409, CXV_LOG_V2_CORRUPT: 422 })[error.code]
        || (error instanceof TypeError ? 400 : 500);
      sendJson(res, status, { error: error.message, code: error.code });
    }
    return;
  }

  if (url === '/api/sdk-mcp-server-status' && method === 'GET') {
    const result = isSdkMode && requestSdkView
      ? await sdkManager.fetchMcpStatus({ instanceKey: requestSdkView.instanceKey })
      : { ok: false, reason: 'session-inactive' };
    sendJson(res, 200, result);
    return;
  }

  if (url === '/api/skill-commands' && method === 'GET') {
    const result = isSdkMode && requestSdkView
      ? await sdkManager.fetchSkills({ instanceKey: requestSdkView.instanceKey })
      : { ok: false, reason: 'unsupported' };
    sendJson(res, 200, result);
    return;
  }

  // SSE endpoint
  if (url === '/api/log-v2/snapshot' && method === 'GET') {
    const limit = Math.min(Math.max(parseInt(parsedUrl.searchParams.get('limit'), 10) || 0, 0), 5000);
    const requestedFile = parsedUrl.searchParams.get('file');
    const file = requestedFile || await activeV2SessionFileAsync(requestSdkView);
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
      recoverActiveFile: readOnly ? null : (file, error) => recoverActiveV2SessionFile(file, error, requestSdkView),
    });
    return;
  }

  if (url === '/api/log-v2/page' && method === 'POST') {
    try {
      const body = await readJsonBody(req, 64 * 1024);
      await serveLogV2Page(req, res, {
        logDir: LOG_DIR,
        body,
        readPage: readV2WirePageAsync,
        readSummaries: readV2WireSummariesAsync,
      });
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
    const liveFile = await activeV2SessionFileAsync(requestSdkView);
    await serveLogV2Live(req, res, {
      logDir: LOG_DIR,
      file: liveFile,
      getActiveFile: () => activeV2SessionFileAsync(requestSdkView),
      afterSeq,
      generation,
      objectHandle: parsedUrl.searchParams.get('handle') || '',
    });
    return;
  }

  if (url === '/events' && method === 'GET') {
    if (isSdkMode) {
      try { res.cxvSdkSession = sdkViewForUrl(parsedUrl); }
      catch (error) { sendJson(res, error.status || 400, { error: error.message, code: error.code }); return; }
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const pingTimer = setInterval(() => {
      try { res.write("event: ping\ndata: {}\n\n"); } catch {}
    }, SSE_HEARTBEAT_MS);
    res.cxvControlOnly = true;
    clients.push(res);
    res.cxvPtySession = req.cxvPtySession || null;
    if (res.cxvSdkSession) {
      sendEventToClients([res], 'sdk_workspace', res.cxvSdkSession);
      sendEventToClients([res], 'streaming_status', sdkManager.getSdkStreamingState({ instanceKey: res.cxvSdkSession.instanceKey }));
    } else {
      sendEventToClients([res], 'turn_active', { active: [..._ptyAgentLoops.values()].some(data => ptyScopeMatches(res, ptyScope(data))), project: requestProjectName });
    }
    sendEventToClients([res], 'server_config', { turnEndDebounceMs: TURN_END_DEBOUNCE_MS });
    req.on("close", () => {
      clearInterval(pingTimer);
      const idx = clients.indexOf(res);
      if (idx !== -1) clients.splice(idx, 1);
    });
    return;
  }

  // 当前监控的项目名称
  if (url === '/api/project-name' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ projectName: requestProjectName || '',
      ...(requestSdkView?.instanceKey ? { instanceKey: requestSdkView.instanceKey, path: requestProjectDir } : {}) }));
    return;
  }

  // 返回项目目录绝对路径（前端用于将绝对路径转为相对路径）
  if (url === '/api/project-dir' && method === 'GET') {
    const dir = requestProjectDir;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ dir }));
    return;
  }

  if (url === '/api/terminal-recovery' && method === 'GET') {
    const { getPtyState, getTerminalSync } = req.cxvPtySession
      ? ptyWorkspaces.session(req.cxvPtySession.instanceKey) : await import('./pty-manager.js');
    const state = getPtyState();
    const sync = getTerminalSync();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(JSON.stringify({
      ...state,
      ...sync,
      available: true,
    }));
    return;
  }

  // 当前版本号
  if (url === '/api/version-info' && method === 'GET') {
    try {
      const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ version: pkg.version,
        installMethod: process.versions.electron || process.env.CXV_ELECTRON_TAB === '1' ? 'electron' : detectHomebrewInstall() ? 'brew' : detectPnpmGlobalInstall() ? 'pnpm' : 'npm',
        processId: PROCESS_ID, canRestart: typeof _restartHandler === 'function',
        instanceKind: process.env.CXV_IM_PLATFORM ? 'im' : isWorkspaceMode && !_workspaceLaunched ? 'workspace' : 'normal', instancePort: actualPort || null }));
    } catch {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read version' }));
    }
    return;
  }

  // 项目统计数据
  if (url === '/api/project-stats' && method === 'GET') {
    try {
      if (!requestProjectName) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No project name' }));
        return;
      }
      const statsFile = join(LOG_DIR, 'v2-stats', `${encodeURIComponent((requestSdkView ? projectContextForSdkView(requestSdkView) : getActiveProjectContext()).projectId)}.json`);
      if (!existsSync(statsFile)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Stats file not found' }));
        return;
      }
      const stats = readPublicFileSync(statsFile, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(stats);
    } catch (err) {
      res.writeHead(err.status || 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 所有项目统计数据
  if (url === '/api/all-project-stats' && method === 'GET') {
    try {
      const allStats = {};
      const statsDir = join(LOG_DIR, 'v2-stats');
      if (existsSync(statsDir)) {
        const entries = readdirSync(statsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
          const project = decodeURIComponent(entry.name.slice(0, -5));
          const statsFile = join(statsDir, entry.name);
          if (existsSync(statsFile)) {
            try {
              allStats[project] = JSON.parse(readPublicFileSync(statsFile, 'utf-8'));
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
      const cwd = currentProjectDir(req);
      ensureWorkspaceProxyWatch(cwd);
      const { raw, data } = _readProxyProfileState();
      const masked = _maskProfiles(scopedProxyPayload(data, cwd, requestSdkView));
      masked.revision = _proxyProfilesRevision(raw);
      // 文件被删除/损坏且运行时已 fail-closed 时，GET 也要如实呈现，避免 UI 显示正常
      if (masked.loadError == null && _proxyProfileLoadError) masked.loadError = _proxyProfileLoadError;
      if (_defaultConfig) masked.defaultConfig = { ..._defaultConfig, apiKey: _defaultConfig.apiKey ? _maskApiKey(_defaultConfig.apiKey) : null };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(masked));
    } catch (error) {
      let raw = _defaultProxyProfilesRaw;
      try { raw = readFileSync(PROFILE_PATH, 'utf-8'); } catch {}
      sendJson(res, 200, { ..._defaultProxyProfiles, revision: _proxyProfilesRevision(raw), loadError: error.message || 'Invalid proxy profile configuration' });
    }
    return;
  }

  if (url === '/api/proxy-profiles' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        // 确保 max profile 始终存在
        if (Array.isArray(incoming?.profiles) && !incoming.profiles.some(p => p?.id === 'max')) {
          incoming.profiles = [{ id: 'max', name: 'Default' }, ...(incoming.profiles || [])];
        }
        const dir = dirname(PROFILE_PATH);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        _withProxyProfilesLock(() => {
        // 如果 apiKey 是 mask 值（未修改），从磁盘读取原始值保留
        const state = _readProxyProfileState();
        const { raw: existingRaw, data: existing } = state;
        const expectedRevision = incoming.revision;
        const currentRevision = _proxyProfilesRevision(existingRaw);
        if (typeof expectedRevision !== 'string' || expectedRevision !== currentRevision) {
          sendJson(res, 409, { ok: false, error: 'Proxy profiles changed in another window or process', revision: currentRevision });
          return;
        }
        const existingMap = new Map();
        if (existing.profiles) existing.profiles.forEach(p => { if (p.apiKey) existingMap.set(p.id, p.apiKey); });
        for (const p of incoming.profiles) {
          if (p.apiKey && _isMasked(p.apiKey) && existingMap.has(p.id)) {
            p.apiKey = existingMap.get(p.id);
          }
        }
        const modern = Object.hasOwn(incoming, 'workspaceRevision');
        let roles = incoming.roles;
        if (roles && typeof roles === 'object' && !Array.isArray(roles)) {
          const stored = readWorkspaceProxy(LOG_DIR, currentProjectDir(req)).roles;
          if (Object.entries(roles).every(([key, value]) => key === 'subagent' && value === stored.subagent)) roles = undefined;
        }
        if (roles !== undefined && (!modern || !nativeRoleRouting(requestSdkView).supported)) {
          throw Object.assign(new Error('Native thread identity is required for role assignments'), { status: 409 });
        }
        const globalActive = incoming.profiles.some(p => p.id === existing.active) ? existing.active : 'max';
        const validated = validateProxyProfilesDocument({ ...incoming, active: modern ? globalActive : incoming.active }, { migrateLegacy: false });
        let backup = null;
        if (state.document[PROXY_CREDENTIAL_VERSION_FIELD] === 1) {
          try { backup = _proxyCredentials.readBackup().document; }
          catch (error) { if (error.code !== 'ENOENT') throw error; }
        }
        let nextRaw = existingRaw;
        const saveCatalogue = () => {
        if (modern && JSON.stringify(validated) === JSON.stringify(existing) && !state.missing) return;
        _proxyCredentials.save(validated, state.document, backup, stored => {
          if (!state.missing) atomicWriteFile(`${PROFILE_PATH}.bak`, existingRaw, { mode: 0o600 });
          nextRaw = `${JSON.stringify(stored, null, 2)}\n`;
          atomicWriteFile(PROFILE_PATH, nextRaw, { mode: 0o600 });
        });
        };
        if (modern) {
          withWorkspaceProxyUpdate({ logDir: LOG_DIR, cwd: currentProjectDir(req), expectedRevision: incoming.workspaceRevision,
            activeId: incoming.active, roles, profiles: validated.profiles }, saveCatalogue);
          ensureWorkspaceProxyWatch(currentProjectDir(req));
        } else saveCatalogue(); // Existing API clients retain the global fallback contract.
        _loadProxyProfile();
        sendJson(res, 200, { ok: true, ..._maskProfiles(scopedProxyPayload(validated, currentProjectDir(req), requestSdkView)), revision: _proxyProfilesRevision(nextRaw) });
        });
      } catch (error) {
        const invalid = error instanceof SyntaxError || error instanceof TypeError;
        sendJson(res, error.statusCode || error.status || (invalid ? 400 : 500), { ok: false, error: error.message || (invalid ? 'Invalid profile data' : 'Failed to save profiles') });
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
    const cwd = requestProjectDir;
    try {
      const targetDir = resolveFilePath(cwd, reqPath, false);
      assertNativeFilePath(targetDir);
      const entries = await fsPromises.readdir(targetDir, { withFileTypes: true });
      const items = entries
        .filter(e => !IGNORED_PATTERNS.has(e.name) && isPublicFilePath(join(targetDir, e.name)) && isNativeFilePathPublic(join(targetDir, e.name)))
        .map(e => {
          // Dirent does not dereference directory symlinks. Match the original
          // expandable type without changing native path/private filtering.
          let type = e.isDirectory() ? 'directory' : 'file';
          if (e.isSymbolicLink()) {
            try { type = statSync(join(targetDir, e.name)).isDirectory() ? 'directory' : 'file'; }
            catch { type = 'file'; }
          }
          return { name: e.name, type };
        })
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
      res.writeHead(ERROR_STATUS_MAP[err.code] || 404, { 'Content-Type': 'application/json' });
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
        const cwd = requestProjectDir;
        const oldFullPath = join(cwd, oldPath);
        const parentDir = dirname(oldFullPath);
        const newFullPath = join(parentDir, newName);
        // Validate real targets, but rename the original entry (a link stays a link).
        for (const path of [oldFullPath, newFullPath]) {
          resolveFilePath(cwd, path, false);
          assertFileToolMutationPath(path, cwd);
        }
        // 检查源文件存在
        if (!existsSync(oldFullPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File not found' }));
          return;
        }
        // A differently-cased destination can be the source itself on APFS/NTFS.
        // Preserve the upstream temporary hop and rollback for that case.
        const oldName = basename(oldPath);
        if (oldName !== newName && oldName.toLowerCase() === newName.toLowerCase()) {
          try {
            if (realpathSync.native(newFullPath) === realpathSync.native(oldFullPath)) {
              const tempPath = join(parentDir, `.cxv-rename-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
              renameSyncWithRetry(oldFullPath, tempPath);
              try { renameSyncWithRetry(tempPath, newFullPath); }
              catch (err) {
                try { renameSyncWithRetry(tempPath, oldFullPath); }
                catch (rollbackErr) { reportSwallowed('filesFs.renameRollback', rollbackErr, { tempPath }); }
                throw err;
              }
              const newRelPath = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName : newName;
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true, newPath: newRelPath }));
              return;
            }
          } catch (err) {
            // A missing differently-cased destination is normal on case-sensitive filesystems.
            if (err.code !== 'ENOENT') {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          }
        }
        // 检查目标是否已存在
        if (existsSync(newFullPath)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Target already exists' }));
          return;
        }
        renameSyncWithRetry(oldFullPath, newFullPath);
        const newRelPath = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName : newName;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, newPath: newRelPath }));
      } catch (err) {
        res.writeHead(ERROR_STATUS_MAP[err.code] || 500, { 'Content-Type': 'application/json' });
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
        if (typeof fromPath !== 'string' || !fromPath || typeof toDir !== 'string') {
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
        const cwd = requestProjectDir;
        const oldFullPath = join(cwd, fromPath);
        const toDirFull = join(cwd, toDir);
        const sourceTarget = resolveFilePath(cwd, oldFullPath, false);
        const destinationTarget = resolveFilePath(cwd, toDirFull, false);
        assertFileToolMutationPath(oldFullPath, cwd);
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
          const srcResolved = sourceTarget;
          const destResolved = destinationTarget;
          if (destResolved === srcResolved || destResolved.startsWith(srcResolved + sep)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Cannot move directory into itself' }));
            return;
          }
        }
        const name = basename(fromPath);
        const newFullPath = join(toDirFull, name);
        resolveFilePath(cwd, newFullPath, false);
        assertFileToolMutationPath(newFullPath, cwd);
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
            // Original EXDEV fallback refuses a symbolic mutation target.
            const oldStat = lstatSync(oldFullPath);
            if (oldStat.isSymbolicLink()) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Cannot move symbolic links via this endpoint' }));
              return;
            }
            if (oldStat.isDirectory()) {
              cpSync(oldFullPath, newFullPath, {
                recursive: true, dereference: false, force: false, errorOnExist: true,
                filter(source, destination) {
                  resolveFilePath(cwd, source, false);
                  resolveFilePath(cwd, destination, false);
                  assertFileToolMutationPath(source, cwd);
                  assertFileToolMutationPath(destination, cwd);
                  return true;
                },
              });
              rmSync(oldFullPath, { recursive: true, force: true });
            } else {
              copyFileSync(oldFullPath, newFullPath, fsConstants.COPYFILE_EXCL);
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
        const newRelPath = join(toDir, name).replace(/\\/g, '/');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, newPath: newRelPath }));
      } catch (err) {
        console.error('move-file error:', err);
        const status = ERROR_STATUS_MAP[err.code] || 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: status === 500 ? 'Internal server error' : err.message }));
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
        const cwd = requestProjectDir;
        const fullPath = join(cwd, filePath);
        resolveFilePath(cwd, fullPath, false);
        assertFileToolMutationPath(fullPath, cwd);
        if (!existsSync(fullPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File not found' }));
          return;
        }
        const realFull = realpathSync(fullPath);
        const realCwd = realpathSync(cwd);
        if (!realFull.startsWith(realCwd + sep)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Path traversal not allowed' }));
          return;
        }
        // Match the upstream endpoint: symbolic mutation targets are refused.
        const stat = lstatSync(fullPath);
        if (stat.isSymbolicLink()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Cannot delete symbolic links via this endpoint' }));
          return;
        }
        if (stat.isDirectory()) {
          const protectedDirs = new Set(['node_modules', '.git', '.svn', '.hg']);
          const normalizedSegs = filePath.split(/[\\/]/).map(s => s.toLowerCase());
          if (normalizedSegs.some(part => protectedDirs.has(part))) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Cannot delete protected directory' }));
            return;
          }
          const realFull2 = realpathSync(fullPath);
          if (!realFull2.startsWith(realCwd + sep)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Path escaped cwd after validation' }));
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
        res.writeHead(ERROR_STATUS_MAP[err.code] || 500, { 'Content-Type': 'application/json' });
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
        const cwd = requestProjectDir;
        const fullPath = join(cwd, filePath);
        if (!existsSync(fullPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File not found' }));
          return;
        }
        resolveFilePath(cwd, filePath, false);
        assertNativeFilePath(fullPath);
        const realFull = realpathSync(fullPath);
        const realCwd = realpathSync(cwd);
        if (!realFull.startsWith(realCwd + sep)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Path traversal not allowed' }));
          return;
        }
        revealInOs(fullPath, { isDir: statSync(realFull).isDirectory() });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, fullPath }));
      } catch (err) {
        res.writeHead(err.status || ERROR_STATUS_MAP[err.code] || 500, { 'Content-Type': 'application/json' });
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
        const cwd = requestProjectDir;
        const fullPath = join(cwd, filePath);
        if (!existsSync(fullPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File not found' }));
          return;
        }
        resolveFilePath(cwd, filePath, false);
        assertNativeFilePath(fullPath);
        const realFull = realpathSync(fullPath);
        const realCwd = realpathSync(cwd);
        if (!realFull.startsWith(realCwd + sep)) {
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
        res.writeHead(err.status || ERROR_STATUS_MAP[err.code] || 500, { 'Content-Type': 'application/json' });
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
        const cwd = requestProjectDir;
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
        const cwd = requestProjectDir;
        const fullDirPath = relDir ? join(cwd, relDir) : cwd;
        if (!existsSync(fullDirPath) || !statSync(fullDirPath).isDirectory()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Directory not found' }));
          return;
        }
        const realDir = realpathSync(fullDirPath);
        const realCwd = realpathSync(cwd);
        if (realDir !== realCwd && !realDir.startsWith(realCwd + sep)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Path traversal not allowed' }));
          return;
        }
        const fullPath = join(fullDirPath, name);
        resolveFilePath(cwd, fullPath, false);
        assertFileToolMutationPath(fullPath, cwd);
        if (existsSync(fullPath)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File already exists' }));
          return;
        }
        writeFileSync(fullPath, '', { flag: 'wx' });
        const relPath = relDir ? `${relDir}/${name}` : name;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: relPath }));
      } catch (err) {
        res.writeHead(ERROR_STATUS_MAP[err.code] || (err.code === 'EEXIST' ? 409 : 500), { 'Content-Type': 'application/json' });
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
        const cwd = requestProjectDir;
        const fullDir = relDir ? join(cwd, relDir) : cwd;
        if (!existsSync(fullDir) || !statSync(fullDir).isDirectory()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Directory not found' }));
          return;
        }
        const realDir = realpathSync(fullDir);
        const realCwd = realpathSync(cwd);
        if (realDir !== realCwd && !realDir.startsWith(realCwd + sep)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Path traversal not allowed' }));
          return;
        }
        openTerminalAt(fullDir);
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
        const cwd = requestProjectDir;
        const fullDirPath = relDir ? join(cwd, relDir) : cwd;
        if (!existsSync(fullDirPath) || !statSync(fullDirPath).isDirectory()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Directory not found' }));
          return;
        }
        const realDir = realpathSync(fullDirPath);
        const realCwd = realpathSync(cwd);
        if (realDir !== realCwd && !realDir.startsWith(realCwd + sep)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Path traversal not allowed' }));
          return;
        }
        const fullPath = join(fullDirPath, name);
        resolveFilePath(cwd, fullPath, false);
        assertFileToolMutationPath(fullPath, cwd);
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
        res.writeHead(ERROR_STATUS_MAP[err.code] || 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // === Editor session API (for $EDITOR intercept) ===

  if (url === '/api/open-log-dir' && method === 'POST') {
    const dir = LOG_DIR;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
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
    const dir = requestProjectDir;
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

  if ((url === '/api/editor-status' && method === 'GET')
    || (['/api/editor-open', '/api/editor-done'].includes(url) && method === 'POST')) {
    if (!isTargetFileAdmin) { sendJson(res, 403, { error: 'forbidden' }); return; }
    try {
      const body = method === 'POST' ? await readStrictUtf8JsonBody(req, MAX_POST_BODY) : null;
      const sessionId = method === 'POST' ? body?.sessionId : parsedUrl.searchParams.get('id');
      if (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) {
        sendJson(res, 400, { error: 'Invalid editor session id' }); return;
      }
      const scope = requestSdkView ? { instanceKey: requestSdkView.instanceKey || null,
        cwd: requestProjectDir, project: requestProjectName } : null;
      const key = JSON.stringify([scope?.instanceKey || null, sessionId]);
      if (url === '/api/editor-open') {
        const { filePath } = body;
        if (typeof filePath !== 'string' || filePath.includes('\0') || !isAbsolute(filePath)) {
          sendJson(res, 400, { error: 'Invalid editor file path' }); return;
        }
        const access = fileBrowserAccess(new URL('/', parsedUrl), requestProjectDir,
          { isAdmin: isTargetFileAdmin, editorSession: true });
        const real = access.assertPath(filePath);
        if (!statSync(real).isFile()) { sendJson(res, 400, { error: 'Editor path is not a file' }); return; }
        if (editorSessions.has(key)) { sendJson(res, 409, { error: 'Editor session already exists' }); return; }
        const session = { sessionId, scope, filePath: real, done: false, createdAt: Date.now() };
        editorSessions.set(key, session);
        broadcastWsMessage(editorFrame(session));
        sendJson(res, 200, { ok: true });
      } else {
        const session = editorSessions.get(key);
        if (!session) { sendJson(res, 404, { error: 'Editor session not found' }); return; }
        if (url === '/api/editor-done') {
          session.done = true;
          setTimeout(() => { if (editorSessions.get(key) === session) editorSessions.delete(key); }, 5000).unref();
          sendJson(res, 200, { ok: true });
        } else sendJson(res, 200, { done: session.done });
      }
    } catch (error) { sendJson(res, error.status || 400, { error: error.status ? error.message : 'Invalid editor request' }); }
    return;
  }

  // Rehydrate app-server asks after a browser WebSocket reconnect.
  if (url === '/api/pending-asks' && method === 'GET') {
    sendJson(res, 200, {
      pendingAsks: [...pendingCodexAsks.values()]
        .filter(pending => ptyScopeMatches(req, pending.scope)).map(pending => ({
        id: pending.id,
        questions: pending.questions,
        threadId: pending.threadId,
        turnId: pending.turnId,
        itemId: pending.itemId,
        createdAt: pending.createdAt,
        timeoutMs: pending.timeoutMs,
        ...replayAskAutoAnswerFields(pending.auto, pending.autoCancelled),
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
    try {
      const { toolName, input, forceManual = false } = await readStrictUtf8JsonBody(req, 1_000_000);
      if (!toolName) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing toolName' }));
        return;
      }


      // In Codex auto-review mode the native reviewer agent owns the decision.
      // A hook with no decision lets Codex continue its normal approval path.
      // Publish commands remain a deliberate human-only safety boundary in
      // every mode and opt out through forceManual.
      const reviewer = reviewerStateFor(req.cxvPtySession);
      if (!forceManual && reviewer.nativeAvailable && shouldDeferPermissionHookToCodex(reviewer.approvalsReviewer)) {
        sendJson(res, 200, { deferToCodex: true });
        return;
      }

      const scope = req.cxvPtySession || null;
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
              if (c.readyState === 1 && ptyScopeMatches(c, scope)) try { c.send(tmsg); } catch {}
            });
          }
        }
      }, HOOK_TIMEOUT);

      pendingPermHooks.set(id, { id, scope, toolName, input, res, timer, createdAt: Date.now() });

      // Broadcast to all terminal WS clients
      if (terminalWss) {
        const pmsg = JSON.stringify({ type: 'perm-hook-pending', id, toolName, input });
        terminalWss.clients.forEach((client) => {
          if (client.readyState === 1 && ptyScopeMatches(client, scope)) {
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
              if (c.readyState === 1 && ptyScopeMatches(c, scope)) try { c.send(tmsg); } catch {}
            });
          }
        }
      });
    } catch (error) {
      if (!res.headersSent) sendJson(res, error.status || 400, {
        error: error.status === 413 ? 'Request body too large' : 'Invalid request body',
      });
    }
    return;
  }

  const targetFsRoute = targetFilesFsRoutes.find(route => route.path === url && route.method === method);
  if (targetFsRoute) {
    await targetFsRoute.handler(req, res, parsedUrl, isLocal, {
      authorized: isTargetFileAdmin, cwd: requestProjectDir,
      codexMdEntries: isTargetFileAdmin ? discoverCodexMdEntries(req) : [],
      readBody: readStrictUtf8JsonBody, MAX_POST_BODY,
    });
    return;
  }

  if (url === '/api/target-files' && method === 'GET') {
    if (!isTargetFileAdmin) { sendJson(res, 403, { error: 'forbidden' }); return; }
    try {
      const result = readTargetFiles(parsedUrl, requestProjectDir, {
        codexMdEntries: discoverCodexMdEntries(req), ignored: IGNORED_PATTERNS,
      });
      const target = { kind: parsedUrl.searchParams.get('kind'), id: parsedUrl.searchParams.get('id'),
        source: parsedUrl.searchParams.get('source'), path: parsedUrl.searchParams.get('targetPath') };
      target.previewSession = isLocal || safeTokenMatches(parsedUrl.searchParams.get('token'), ACCESS_TOKEN)
        ? '' : createHash('sha256').update(cookieToken).digest('base64url');
      result.previewSession = target.previewSession;
      result.previewToken = targetPreviewToken(target, requestProjectName || '', parsedUrl.searchParams.get('instance') || '');
      sendJson(res, 200, result);
    } catch (error) { sendJson(res, error.status || 500, { error: error.status ? error.message : 'Internal error' }); }
    return;
  }

  if (url === '/api/files-exists' && method === 'POST') {
    try {
      const body = await readStrictUtf8JsonBody(req, 256 * 1024);
      sendJson(res, 200, { results: probeFilesExist(body?.paths, requestProjectDir) });
    } catch (error) { sendJson(res, error.status || 500, { error: error.status ? error.message : 'File probe failed' }); }
    return;
  }

  // 读取文件内容 API
  if (url === '/api/file-content' && method === 'GET') {
    const reqPath = parsedUrl.searchParams.get('path');
    const isEditorSession = parsedUrl.searchParams.get('editorSession') === 'true';
    const cwd = requestProjectDir;
    try {
      const access = fileBrowserAccess(parsedUrl, cwd, { isAdmin: isTargetFileAdmin,
        codexMdEntries: discoverCodexMdEntries(req), editorSession: isEditorSession });
      const result = readFileContent(access.root, reqPath, access.external, access.assertPath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      const status = err.status || ERROR_STATUS_MAP[err.code] || 500;
      const message = status === 500 ? `Cannot read file: ${err.message}` : err.message;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message, ...(err.reason ? { reason: err.reason, size: err.size } : {}) }));
    }
    return;
  }

  // Original attachment download contract, using the viewed Codex workspace's
  // existing realpath/credential policy and the validated descriptor throughout.
  if (url === '/api/download-file' && (method === 'GET' || method === 'HEAD')) {
    const reqPath = parsedUrl.searchParams.get('path');
    let fd = null;
    try {
      if (!reqPath || (!isAbsolute(reqPath) && reqPath.includes('..'))) {
        throw Object.assign(new Error('Invalid path'), { code: 'INVALID_PATH' });
      }
      const access = fileBrowserAccess(parsedUrl, requestProjectDir, { isAdmin: isTargetFileAdmin,
        codexMdEntries: discoverCodexMdEntries(req) });
      const targetFile = resolveFilePath(access.root, reqPath, access.external);
      access.assertPath(targetFile);
      fd = openSync(targetFile, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0) | (fsConstants.O_NONBLOCK || 0));
      const stat = fstatSync(fd);
      assertPublicFilePath(targetFile, stat);
      access.assertPath(targetFile, stat);
      if (!stat.isFile()) throw Object.assign(new Error('Not a file'), { code: 'NOT_FILE' });
      const canonical = realpathSync(targetFile), current = statSync(canonical);
      if (!isPathContained(canonical, access.root) || stat.dev !== current.dev || stat.ino !== current.ino) {
        throw Object.assign(new Error('Invalid path'), { code: 'INVALID_PATH' });
      }
      const name = encodeURIComponent(basename(targetFile)).replace(/['()*]/g, ch => '%' + ch.charCodeAt(0).toString(16).toUpperCase());
      const headers = { 'Content-Type': 'application/octet-stream', 'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename*=UTF-8''${name}` };
      if (method === 'HEAD') { res.writeHead(200, headers); res.end(); return; }
      const stream = createReadStream(targetFile, { fd, autoClose: true });
      fd = null; // stream/pipeline owns it, including client disconnect and read errors
      res.writeHead(200, headers);
      pipeline(stream, res, error => { if (error) reportSwallowed('fileDownload.stream', error); });
    } catch (error) {
      if (res.headersSent) res.destroy(error);
      else sendJson(res, error.status || ERROR_STATUS_MAP[error.code] || (error.code === 'ENOENT' ? 404 : 500), { error: error.message });
    } finally {
      if (fd !== null) closeSync(fd);
    }
    return;
  }

  // Same exact-instance/target/native policy as the file browser, without buffering audio.
  if (url === '/api/audio-stream' && (method === 'GET' || method === 'HEAD')) {
    let fd = null;
    try {
      const access = fileBrowserAccess(parsedUrl, requestProjectDir, { isAdmin: isTargetFileAdmin,
        codexMdEntries: discoverCodexMdEntries(req) });
      const filePath = resolveFilePath(access.root, parsedUrl.searchParams.get('path'), access.external);
      access.assertPath(filePath);
      fd = openSync(filePath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0) | (fsConstants.O_NONBLOCK || 0));
      const stat = fstatSync(fd);
      assertPublicFilePath(filePath, stat);
      access.assertPath(filePath, stat);
      if (!stat.isFile()) { sendJson(res, 400, { error: 'Not a file' }); return; }
      const ext = audioExtOf(filePath);
      if (!AUDIO_EXTENSIONS.has(ext)) { sendJson(res, 400, { error: 'Unsupported audio path' }); return; }
      // Sniff and stream the SAME validated descriptor. The stream owns it only
      // when a body is sent; all HEAD/304/416/empty/error exits close it below.
      if (serveAudioStream(req, res, { filePath, stat, ext, fd })) fd = null;
    } catch (err) {
      if (res.headersSent) res.destroy();
      else sendJson(res, err.status || ERROR_STATUS_MAP[err.code] || 500, { error: err.message });
    } finally {
      if (fd !== null) { try { closeSync(fd); } catch {} }
    }
    return;
  }

  // 返回文件原始二进制内容（用于图片预览等）
  if ((url === '/api/archive-raw' || url === '/api/file-raw' || url.startsWith('/api/file-raw/')) && (method === 'GET' || method === 'HEAD')) {
    const archive = url === '/api/archive-raw';
    const reqPath = rawPath ?? parsedUrl.searchParams.get('path');
    const isEditorSession = rawPath === null && parsedUrl.searchParams.get('editorSession') === 'true';
    const cwd = requestProjectDir;
    if (archive && (!reqPath || !/\.(zip|tar|gz|tgz)$/i.test(reqPath))) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unsupported archive path' }));
      return;
    }
    let constrainedFd = null;
    try {
      const access = fileBrowserAccess(parsedUrl, cwd, { isAdmin: isTargetFileAdmin || isTargetPreviewResource,
        codexMdEntries: discoverCodexMdEntries(req), editorSession: isEditorSession });
      const uploadPaths = workspaceUploadPaths(cwd, requestProjectName);
      const resolvedUpload = reqPath ? resolve(reqPath) : null;
      const uploadParent = resolvedUpload ? dirname(resolvedUpload) : null;
      if (!archive && !access.external && resolvedUpload && (
        resolvedUpload.startsWith(uploadPaths.legacyTemporary + sep)
          && ![uploadPaths.temporary, uploadPaths.legacyTemporary].includes(uploadParent)
        || resolvedUpload.startsWith(uploadPaths.legacyPersistent + sep)
          && ![uploadPaths.persistent, uploadPaths.legacyPersistent].includes(uploadParent))) {
        sendJson(res, 403, { error: 'Attachment belongs to a different workspace' });
        return;
      }
      let targetFile;
      let constrainedImageRoot = null;
      // Only direct legacy leaves retain read compatibility. New scoped trees
      // must match THIS exact cwd; no basename or sibling-hash search fallback.
      if (!archive && !access.external && resolvedUpload
          && [uploadPaths.temporary, uploadPaths.legacyTemporary].includes(uploadParent)) {
        targetFile = resolvedUpload;
        constrainedImageRoot = uploadParent;
        if (!existsSync(targetFile)) {
          const candidates = [join(uploadPaths.persistent, basename(targetFile))];
          if (uploadParent === uploadPaths.legacyTemporary) candidates.push(join(uploadPaths.legacyPersistent, basename(targetFile)));
          const fallback = candidates.find(path => existsSync(path));
          if (fallback) { targetFile = fallback; constrainedImageRoot = dirname(fallback); }
        }
      } else if (!archive && !access.external && resolvedUpload
          && [uploadPaths.persistent, uploadPaths.legacyPersistent].includes(uploadParent)) {
        targetFile = resolvedUpload;
        constrainedImageRoot = uploadParent;
      } else {
        targetFile = resolveFilePath(access.root, reqPath, access.external);
        access.assertPath(targetFile);
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
            fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0) | (fsConstants.O_NONBLOCK || 0),
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
      if (constrainedFd === null) {
        constrainedFd = openSync(targetFile, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0) | (fsConstants.O_NONBLOCK || 0));
      }
      const stat = fstatSync(constrainedFd);
      assertPublicFilePath(targetFile, stat);
      if (!constrainedImageRoot) access.assertPath(targetFile, stat);
      if (!stat.isFile()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not a file' }));
        return;
      }
      const maxBytes = (archive ? 32 : 10) * 1024 * 1024;
      if (stat.size > maxBytes) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File too large', ...(archive ? { maxBytes, size: stat.size } : {}) }));
        return;
      }
      const extMime = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
        '.webp': 'image/webp', '.bmp': 'image/bmp', '.avif': 'image/avif',
        '.apng': 'image/apng', '.jfif': 'image/jpeg',
        '.tif': 'image/tiff', '.tiff': 'image/tiff', '.heic': 'image/heic', '.heif': 'image/heif',
        '.html': 'text/html', '.htm': 'text/html',
        '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
        '.json': 'application/json', '.map': 'application/json', '.txt': 'text/plain',
        '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
      };
      const ext = (targetFile.match(/\.[^.]+$/) || [''])[0].toLowerCase();
      const mime = archive ? 'application/octet-stream' : extMime[ext] || 'application/octet-stream';
      let data = null;
      if (method !== 'HEAD') {
        if (archive) {
          // Bound the descriptor read even if the archive grows after fstat.
          data = Buffer.alloc(stat.size);
          let offset = 0;
          while (offset < data.length) {
            const count = readSync(constrainedFd, data, offset, data.length - offset, offset);
            if (!count) break;
            offset += count;
          }
          data = data.subarray(0, offset);
        } else data = readFileSync(constrainedFd);
      }
      const size = method === 'HEAD' ? stat.size : data.length;
      const headers = { 'Content-Type': mime, 'Content-Length': size };
      // 防止用户项目中的恶意 HTML 在同源下执行脚本（XSS 防护）
      if (mime === 'text/html') headers['Content-Security-Policy'] = "sandbox allow-scripts; connect-src 'none'; form-action 'none'";
      res.writeHead(200, headers);
      res.end(data);
    } catch (err) {
      const status = err.status || ERROR_STATUS_MAP[err.code] || 500;
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

  // 保存文件内容 API: freeze discovery/cwd before consuming an asynchronous body.
  if (url === '/api/file-content' && method === 'POST') {
    try {
      const codexMdEntries = discoverCodexMdEntries(req);
      if (parsedUrl.searchParams.has('kind')) fileBrowserAccess(parsedUrl, requestProjectDir,
        { isAdmin: isTargetFileAdmin, codexMdEntries, write: true });
      const { path: reqPath, content, editorSession } = await readStrictUtf8JsonBody(req, 5 * 1024 * 1024);
      const access = fileBrowserAccess(parsedUrl, requestProjectDir, { isAdmin: isTargetFileAdmin,
        codexMdEntries, editorSession: editorSession === true, write: true });
      const result = writeFileContent(access.root, reqPath, content, access.external, access.assertPath, access.external);
      sendJson(res, 200, { ok: true, size: result.size });
    } catch (error) {
      const status = error.status || ERROR_STATUS_MAP[error.code] || (error instanceof SyntaxError ? 400 : 500);
      sendJson(res, status, { error: status === 500 ? `Cannot save file: ${error.message}` : error.message });
    }
    return;
  }

  // CLI 模式检测
  if (url === '/api/cli-mode' && method === 'GET') {
    const selectedSdk = isSdkMode && sdkManager.listSdkSessions().find(session => parsedUrl.searchParams.has('instance')
      ? session.instanceKey === parsedUrl.searchParams.get('instance') : session.cwd === sdkBootCwd);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const selectedPty = ptyWorkspaces && ptyWorkspaces.list().find(session => parsedUrl.searchParams.has('instance')
      ? session.instanceKey === parsedUrl.searchParams.get('instance') : session.active);
    res.end(JSON.stringify({ cliMode: isCliMode, sdkMode: isSdkMode, ptyMode: !!ptyWorkspaces, ptyQueueAvailable: !!ptyWorkspaces,
      workspaceMode: isSdkMode ? !selectedSdk : ptyWorkspaces ? !selectedPty : isWorkspaceMode && !_workspaceLaunched }));
    return;
  }

  // Git 状态
  // 列出项目根及其子目录中的 git 仓库（含 .git 的一级子目录）
  if (url === '/api/git-repos' && method === 'GET') {
    try {
      const projectDir = requestProjectDir;
      const repos = [];
      if (existsSync(join(projectDir, '.git'))) {
        repos.push({ name: basename(projectDir), path: '.', isRoot: true });
      }
      const entries = readdirSync(projectDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        try {
          if (existsSync(join(projectDir, entry.name, '.git'))) {
            repos.push({ name: entry.name, path: entry.name, isRoot: false });
          }
        } catch {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ repos }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, repos: [] }));
    }
    return;
  }

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
      // Reject null/array/non-object bodies (JSON.parse(null) → null, destructure → TypeError)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      try {
        const { path: filePath, repo: repoParam } = parsed;
        if (!filePath || typeof filePath !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing path' }));
          return;
        }
        if (!isSafeRelativePath(filePath)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid path' }));
          return;
        }
        if (repoParam !== undefined && typeof repoParam !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid repo parameter' }));
          return;
        }
        const cwd = resolveRepoCwd(repoParam, requestProjectDir);
        if (!cwd) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid repo parameter' }));
          return;
        }
        const fullPath = join(cwd, filePath);
        if (existsSync(fullPath)) {
          // 只允许还原单个文件；目录会被 git clean -fd 递归删除，风险过高
          if (statSync(fullPath).isDirectory()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Path is a directory' }));
            return;
          }
          const realFull = realpathSync(fullPath);
          const realCwd = realpathSync(cwd);
          if (!realFull.startsWith(realCwd + sep)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Path traversal not allowed' }));
            return;
          }
        }
        // Per-file mutex 序列化「git status + checkout/clean」子命令对。多 tab 并发同文件
        // revert 时不再有 race 让两个 checkout 交错执行（最终状态不可预测）。
        // resolve() 规整 ./foo.js / foo.js / .//foo.js 为同一 lockKey，防形变绕过。
        const lockKey = resolve(join(cwd, filePath));
        const prev = gitRestoreLocks.get(lockKey) || Promise.resolve();
        // .catch(() => {}) isolates each queued op — one failure doesn't skip the rest
        const current = prev.catch(() => {}).then(async () => {
          // Use -z for NUL-terminated output: a glob/wildcard path never equals its own
          // literal name in the status list, so this exact-match gates out glob injection.
          const { stdout: statusOut } = await gitExecFileAsync('git', ['status', '--porcelain', '-z', '--', filePath], { cwd, encoding: 'utf-8', timeout: 5000 });
          // -z output: <XY> <path>\0 …; match the exact filename after the NUL split
          const entries = statusOut.split('\0').filter(Boolean);
          const match = entries.find(e => e.length > 3 && e.substring(3) === filePath);
          // File not in git status output (unchanged, nonexistent, or glob mismatch) → nothing to restore
          if (!match) {
            if (!existsSync(fullPath)) return;
            // File exists on disk but not in git status (e.g. ignored, or glob didn't match) — skip
            return;
          }
          const isUntracked = match.startsWith('??');
          if (isUntracked) {
            await gitExecFileAsync('git', ['clean', '-fd', '--', filePath], { cwd, timeout: 10000 });
          } else {
            await gitExecFileAsync('git', ['checkout', '--', filePath], { cwd, timeout: 10000 });
          }
        }).finally(() => {
          if (gitRestoreLocks.get(lockKey) === current) gitRestoreLocks.delete(lockKey);
        });
        gitRestoreLocks.set(lockKey, current);
        // setTimeout 兜底——防 finally 异常吞 entry 累积内存。
        setTimeout(() => {
          if (gitRestoreLocks.get(lockKey) === current) gitRestoreLocks.delete(lockKey);
        }, GIT_RESTORE_LOCK_CLEANUP_MS).unref();
        await current;
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
      const repoParam = parsedUrl.searchParams.get('repo');
      const cwd = resolveRepoCwd(repoParam, requestProjectDir);
      if (!cwd) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid repo parameter', changes: [] }));
        return;
      }
      const { stdout: output } = await gitExecFileAsync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd, encoding: 'utf-8', timeout: 5000, maxBuffer: 10 * 1024 * 1024 });
      const lines = output.split(/\r?\n/).filter(line => line.trim());
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
      const repoParam = parsedUrl.searchParams.get('repo');
      const cwd = resolveRepoCwd(repoParam, requestProjectDir);
      if (!cwd) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid repo parameter', diffs: [] }));
        return;
      }
      const filesParam = parsedUrl.searchParams.get('files');

      if (!filesParam) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing files parameter', diffs: [] }));
        return;
      }

      const files = filesParam.split(',').map(f => f.trim()).filter(Boolean);

      // Cap file count to prevent resource-exhaustion DoS (thousands of git subprocesses)
      const MAX_DIFF_FILES = 200;
      if (files.length > MAX_DIFF_FILES) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Too many files (max ${MAX_DIFF_FILES})`, diffs: [] }));
        return;
      }

      const commitParam = parsedUrl.searchParams.get('commit');
      // Reject malformed commit hashes; falsy = working-tree mode
      if (commitParam && !isValidCommitHash(commitParam)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid commit parameter', diffs: [] }));
        return;
      }
      const commitHash = commitParam || undefined;

      // Verify the commit exists before attempting to diff (avoid silent 200-empty for nonexistent hashes)
      let isMerge = false;
      if (commitHash) {
        try {
          await gitExecFileAsync('git', ['rev-parse', '--verify', '-q', `${commitHash}^{commit}`], { cwd, encoding: 'utf-8', timeout: 3000 });
          // Check if this is a merge commit (git diff-tree without -m shows nothing for merges)
          const { stdout: parentOut } = await gitExecFileAsync('git', ['rev-list', '--parents', '-n', '1', commitHash], { cwd, encoding: 'utf-8', timeout: 3000 });
          isMerge = parentOut.trim().split(/\s+/).length > 2; // <hash> <p1> [<p2>...]
        } catch {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Commit not found', diffs: [] }));
          return;
        }
      }

      const diffs = await getGitDiffs(cwd, files, commitHash, isMerge);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ diffs }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, diffs: [] }));
    }
    return;
  }

  // 未推送的本地提交（upstream..HEAD）
  if (url === '/api/git-log-unpushed' && method === 'GET') {
    try {
      const repoParam = parsedUrl.searchParams.get('repo');
      const cwd = resolveRepoCwd(repoParam, requestProjectDir);
      if (!cwd) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid repo parameter', commits: [], hasUpstream: false }));
        return;
      }
      const result = await getUnpushedCommits(cwd);
      // logError = true means git log failed (timeout/maxBuffer); signal the degraded state
      // explicitly so the UI can show "unavailable" instead of silently displaying "0 commits"
      if (result.logError) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...result, error: 'git log timed out or exceeded buffer' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, commits: [], hasUpstream: false }));
    }
    return;
  }

  // 插件管理 API
  if (url === '/api/plugins' && method === 'GET') {
    const plugins = pluginsWithRuntime();
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
      const content = readPublicFileSync(filePath, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(content);
    } catch (err) {
      res.writeHead(err.status || 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url === '/api/plugins' && method === 'DELETE') {
    const dir = parsedUrl.searchParams.get('dir');
    if (dir) {
      const entry = getPluginEntries().find(item => item.source === 'user' && item.dir === dir);
      const result = await pluginRuntime.unloadPlugin(entry?.name || dir, 'delete');
      if (!result.ok) { sendJson(res, 503, { error: result.error }); return; }
      try { deletePluginDir(getPluginsDir(), dir); }
      catch (error) { sendJson(res, error.statusCode || 500, { error: error.message }); return; }
      if (entry?.name) removeDisabledPluginNames([entry.name]);
      await reloadServicePlugins();
      sendJson(res, 200, { ok: true, plugins: pluginsWithRuntime(), pluginsDir: getPluginsDir() });
      return;
    }
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
      const targetPlugin = pluginsWithRuntime().find(p => p.file === file);
      unlinkSync(filePath);
      if (targetPlugin?.name) removeDisabledPluginNames([targetPlugin.name]);
      await reloadServicePlugins();
      const plugins = pluginsWithRuntime();
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
      await reloadServicePlugins({ reason: parsedUrl.searchParams.get('reason') });
      const plugins = pluginsWithRuntime();
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
        await reloadServicePlugins();
        let plugins = pluginsWithRuntime();
        const uploadedFiles = new Set((fileList || []).map(file => normalizePluginFilename(file?.name)));
        const uploadedNames = plugins.filter(plugin => uploadedFiles.has(plugin.file)).map(plugin => plugin.name);
        if (removeDisabledPluginNames(uploadedNames)) {
          await reloadServicePlugins();
          plugins = pluginsWithRuntime();
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
        await reloadServicePlugins();
        let plugins = pluginsWithRuntime();
        const installedNames = plugins.filter(plugin => plugin.file === filename).map(plugin => plugin.name);
        if (removeDisabledPluginNames(installedNames)) {
          await reloadServicePlugins();
          plugins = pluginsWithRuntime();
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

  if (url === '/api/plugins/restart' && method === 'POST') {
    const name = parsedUrl.searchParams.get('name');
    if (!name) { sendJson(res, 400, { error: 'name is required' }); return; }
    const result = await pluginRuntime.restartPlugin(name);
    sendJson(res, result.ok ? 200 : 400, result);
    return;
  }
  if (url === '/api/plugin-panels' && method === 'GET') {
    const panels = getPluginEntries().filter(entry => entry.shape === 'dir' && entry.enabled && !entry.loadError && entry.panel)
      .map(entry => buildPanelDescriptor(entry, { serviceStatus: pluginRuntime.getRuntimePluginStatus(entry.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.setHeader('Cache-Control', 'no-store');
    sendJson(res, 200, { ok: true, panels });
    return;
  }

  // 返回局域网访问地址
  if (url === '/api/local-url' && method === 'GET') {
    const localIp = getLocalIp();
    const defaultUrl = getPublicAccessUrl(localIp, req);
    const hookResult = await runWaterfallHook('localUrl', {
      url: defaultUrl,
      ip: localIp,
      port: actualPort,
      token: ACCESS_TOKEN,
      protocol: serverProtocol,
      httpUrl: defaultUrl.startsWith('http:') ? defaultUrl : null,
      httpsUrl: defaultUrl.startsWith('https:') ? defaultUrl : null,
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      url: hookResult.url,
      httpUrl: defaultUrl.startsWith('http:') ? defaultUrl : null,
      httpsUrl: defaultUrl.startsWith('https:') ? defaultUrl : null,
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
      const projectId = (requestSdkView ? projectContextForSdkView(requestSdkView) : getActiveProjectContext()).projectId;
      const pageParam = parsedUrl.searchParams.get('page');
      let result;
      if (pageParam != null) {
        const project = parsedUrl.searchParams.get('project') || projectId;
        if (project === '.' || project === '..' || /[/\\\0]/.test(project)) {
          sendJson(res, 400, { error: 'Invalid project name' });
          return;
        }
        const page = Math.max(1, parseInt(pageParam, 10) || 1);
        const pageSize = Math.min(200, Math.max(1, parseInt(parsedUrl.searchParams.get('pageSize'), 10) || 50));
        result = listV2LocalLogsPage(LOG_DIR, projectId, { project, page, pageSize });
      } else result = listV2LocalLogs(LOG_DIR, projectId);
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
    const file = requestedFile || await activeV2SessionFileAsync(requestSdkView) || '';
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
      const file = requestedFile || await activeV2SessionFileAsync(requestSdkView) || '';
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
      // The global job limit protects archive materialization, not delivery of
      // the already-materialized private response stream. With Content-Length,
      // a client can observe its final byte before the server-side iterator
      // reaches its cleanup turn; holding the lock through streaming therefore
      // makes a sequential request spuriously see CXV_LOG_ARCHIVE_BUSY.
      releaseJob();
      releaseJob = null;
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

  // Download one portable V2 session archive.
  if (url === '/api/download-log' && method === 'GET') {
    const file = parsedUrl.searchParams.get('file');
    const v2File = isV2SessionFile(file);
    if (!v2File) {
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
      releaseJob = acquireLogArchiveJob();
        const archive = await createV2SessionZip(LOG_DIR, file);
        // ZIP construction is complete. The returned stream owns an isolated
        // temp artifact, so response delivery need not hold the global builder
        // slot and block the client's next sequential archive operation.
        releaseJob();
        releaseJob = null;
        if (req.aborted || res.destroyed) {
          archive.dispose();
          return;
        }
        const encodedName = encodeURIComponent(archive.fileName);
        let cleaned = false;
        const cleanup = () => {
          if (cleaned) return;
          cleaned = true;
          archive.dispose();
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

  // Read the independent IM worker log; main CX Viewer history is V2-only.
  if (url === '/api/im-log' && method === 'GET') {
    const file = parsedUrl.searchParams.get('file');
    const platform = parsedUrl.searchParams.get('platform');
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
      const filePath = validateImLogPath(LOG_DIR, platform, file);
      const total = countImLogEntries(filePath);

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      res.write(`event: load_start\ndata: ${JSON.stringify({ total, incremental: false })}\n\n`);
      await streamImLogEntries(filePath, (raw) => {
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

  if (url === '/api/delete-logs' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', async () => {
      try {
        const { files } = JSON.parse(body);
        if (!Array.isArray(files) || files.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No files specified' }));
          return;
        }
        const affectedProjects = new Set();
        for (const file of files) {
          try {
            const { sessionDir } = resolveV2SessionFile(LOG_DIR, file);
            const manifest = JSON.parse(readFileSync(join(sessionDir, 'manifest.json'), 'utf8'));
            if (manifest.projectId) affectedProjects.add(manifest.projectId);
          } catch {}
        }
        const activeFile = await activeV2SessionFileAsync(requestSdkView);
        const protectedFiles = isSdkMode
          ? await Promise.all(sdkManager.listSdkSessions().map(view => activeV2SessionFileAsync(view)))
          : [activeFile];
        const results = deleteLogFiles(LOG_DIR, files, { protectedFiles });
        for (const projectId of affectedProjects) notifyStatsWorker(projectId);
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
      try {
        const content = readPublicFileSync(mdPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
        res.end(content);
      } catch (err) { sendJson(res, err.status || 500, { error: err.message }); }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
    return;
  }

  // CXV 进程列表
  if (url === '/api/cxv-processes' && method === 'GET') {
    try {
      const identities = await cxvProcessAdapter.listCxvProcesses();
      const processes = identities.map(identity => ({
        port: String(identity.port),
        pid: identity.pid,
        command: identity.command,
        startTime: identity.startTime,
        processRef: encodeProcessRef(identity, PROCESS_REF_SECRET),
        isCurrent: identity.pid === process.pid,
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ processes }));
    } catch (err) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, code: err.code || 'CXV_PROCESS_DISCOVERY_FAILED' }));
    }
    return;
  }

  if (url === '/api/cxv-processes/kill-status' && method === 'GET') {
    pruneProcessTerminationOperations();
    const operation = processTerminationOperations.get(parsedUrl.searchParams.get('id'));
    if (!operation) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unknown termination operation' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(operation));
    return;
  }

  // CXV 进程关闭
  if (url === '/api/cxv-processes/kill' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
    req.on('end', async () => {
      try {
        const { processRef } = JSON.parse(body);
        const expected = decodeProcessRef(processRef, PROCESS_REF_SECRET);
        if (!expected) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid process reference' }));
          return;
        }
        if (expected.pid === process.pid) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Cannot kill current process' }));
          return;
        }
        const actual = await cxvProcessAdapter.inspect(expected.pid);
        if (!sameProcessIdentity(expected, actual) || !isCxvProcess(actual)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Process identity changed' }));
          return;
        }
        if (platform() === 'darwin' && process.env.CXV_TEST !== '1') {
          const startedAt = Date.parse(actual.startId);
          if (Number.isFinite(startedAt) && Date.now() - startedAt < 2000) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Process is too new to terminate safely; retry shortly' }));
            return;
          }
        }
        const descendants = await cxvProcessAdapter.descendants(actual);
        const rechecked = await cxvProcessAdapter.inspect(expected.pid);
        if (!sameProcessIdentity(expected, rechecked)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Process identity changed' }));
          return;
        }
        pruneProcessTerminationOperations();
        const operationId = randomBytes(18).toString('base64url');
        const operation = {
          id: operationId,
          pid: expected.pid,
          status: 'terminating',
          requestedAt: Date.now(),
          completedAt: null,
          error: null,
        };
        processTerminationOperations.set(operationId, operation);
        const termination = terminateWithEscalation(expected.pid, {
          graceMs: PROCESS_FORCE_KILL_GRACE_MS,
          kill: (_pid, signal) => cxvProcessAdapter.signal(actual, signal),
          stillTarget: async () => sameProcessIdentity(expected, await cxvProcessAdapter.inspect(expected.pid)),
          forceKill: () => killVerifiedTree(cxvProcessAdapter, actual, descendants),
          onError: error => console.warn(`[CX Viewer] Failed to stop PID ${expected.pid}:`, error.message),
        });
        (async () => {
          while (operation.status === 'terminating') {
            await new Promise(resolve => {
              const timer = setTimeout(resolve, 250);
              timer.unref?.();
            });
            if (operation.status !== 'terminating') break;
            const current = await cxvProcessAdapter.inspect(expected.pid);
            if (!current) {
              // Once the escalation grace has elapsed, the escalation promise
              // owns the final classification. Its SIGKILL can make the process
              // disappear just before this poll and must still report `forced`.
              if (Date.now() - operation.requestedAt >= PROCESS_FORCE_KILL_GRACE_MS) continue;
              await killVerifiedTree(cxvProcessAdapter, actual, descendants);
              completeProcessTermination(operation, 'exited');
            } else if (!sameProcessIdentity(expected, current)) {
              completeProcessTermination(operation, 'replaced');
            }
          }
        })().catch(error => {
          completeProcessTermination(operation, 'failed', error);
        });
        termination.completion.then(async result => {
          if (operation.status !== 'terminating') return;
          if (result.status === 'forced') {
            for (let attempt = 0; attempt < 20; attempt++) {
              const current = await cxvProcessAdapter.inspect(expected.pid);
              if (!current) {
                completeProcessTermination(operation, 'forced');
                return;
              }
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            completeProcessTermination(operation, 'failed', 'Process survived SIGKILL');
            return;
          }
          completeProcessTermination(operation, result.status, result.error);
        }).catch(error => {
          completeProcessTermination(operation, 'failed', error);
        });
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, accepted: true, operationId, pid: expected.pid, status: operation.status }));
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
        const content = filePath === '/index.html'
          ? injectViewerBase(readPublicFileSync(fullPath, 'utf-8'), resolveBaseConfig().basePath)
          : readPublicFileSync(fullPath);
        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
        return;
      }
    } catch (err) {
      if (err.code === 'ACCESS_DENIED') {
        sendJson(res, 403, { error: err.message });
        return;
      }
      // fall through to SPA fallback
    }

    // SPA fallback: 非 API/非静态文件请求返回 index.html
    try {
      const indexPath = join(__dirname, 'dist', 'index.html');
      const html = injectViewerBase(readPublicFileSync(indexPath, 'utf-8'), resolveBaseConfig().basePath);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      res.writeHead(err.status || 404);
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

let _startingPromise = null;
let _viewerStopping = false;
export async function startViewer() {
  if (_startingPromise) return _startingPromise;
  _startingPromise = startViewerOnce();
  try { return await _startingPromise; }
  finally { _startingPromise = null; }
}

async function startViewerOnce() {
  if (_stoppingPromise) { await _stoppingPromise; _stoppingPromise = null; }
  if (server?.listening) return server;
  _viewerStopping = false;
  if (!isSdkMode) {
    _ptyAgentLoops.clear();
    for (const data of getAppServerAgentLoopSnapshot()) {
      if (ownedPtyLoopData(data)) _ptyAgentLoops.set(ptyLoopKey(data), data);
    }
  }
  pluginRoutes = [];
  // 加载插件（需要在创建服务器之前，以便通过 hook 获取 HTTPS 证书）
  if (process.env.CXV_IM_WORKER !== '1') await loadPlugins();

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
          const baseCfg = resolveBaseConfig();
          const baseCheck = validateBasePath(process.env.CXV_BASE_PATH);
          if (baseCfg.source !== 'baseUrl' && baseCheck.warning) console.warn(t(baseCheck.warning, { value: process.env.CXV_BASE_PATH }));
          if (baseCfg.warning) console.warn(t(baseCfg.warning, { value: baseCfg.warningValue }));
          const url = `${serverProtocol}://127.0.0.1:${port}${baseCfg.basePath}`;
          const externalUrl = externalUrlFromConfig(baseCfg, { token: ACCESS_TOKEN });
          if (!isCliMode) {
            console.error(t('server.started'));
            console.error(t('server.startedLocal', { protocol: serverProtocol, port, basePath: baseCfg.basePath }));
            if (externalUrl) console.error(t('server.startedExternal', { url: externalUrl }));
            const _ips = getAllLocalIps();
            for (const _ip of _ips) {
              console.error(t('server.startedNetwork', { protocol: serverProtocol, ip: _ip, port, basePath: baseCfg.basePath, token: ACCESS_TOKEN }));
            }
          }
          // v2.0.69 之前的版本会清空控制台，自动打开浏览器确保用户能看到界面
          if (!isCliMode && process.env.CXV_TEST !== '1') {
            try {
              const ccPkgPath = join(__dirname, '..', '@openai', 'codex', 'package.json');
              const ccVer = JSON.parse(readFileSync(ccPkgPath, 'utf-8')).version;
              const [maj, min, pat] = ccVer.split('.').map(Number);
              if (maj < 2 || (maj === 2 && min === 0 && pat < 69)) {
                const openUrl = externalUrl || url;
                const child = platform() === 'win32'
                  ? spawn('cmd.exe', ['/c', 'start', '""', openUrl], { stdio: 'ignore', detached: true, windowsHide: true })
                  : spawn(platform() === 'darwin' ? 'open' : 'xdg-open', [openUrl], { stdio: 'ignore', detached: true });
                child.on('error', () => {}); child.unref();
              }
            } catch { }
          }
          // 工作区模式下延迟到选择工作区后再启动监听
          if (!isWorkspaceMode) {
            notifyStatsWorker();
            startStreamingStatusTimer();
          }
          if (process.env.CXV_IM_WORKER !== '1') await setupDialogueWebSocket(currentServer);
          // CLI 模式下启动 WebSocket 服务 (必须 await，否则插件 hook 拿不到 upgrade listeners)
          if (isCliMode && process.env.CXV_IM_WORKER !== '1') {
            await setupTerminalWebSocket(currentServer);
          }
          if (process.env.CXV_IM_WORKER !== '1') {
            setupPluginWebSocket(currentServer);
            try {
              await pluginRuntime.onServerStarted({ logDir: LOG_DIR, port, host: HOST,
                protocol: serverProtocol, basePath: baseCfg.basePath, token: ACCESS_TOKEN, httpServer: currentServer,
                isStopping: () => _viewerStopping });
            } catch (error) { reportSwallowed('plugins.startup', error); }
          }
          initScheduledTasks();
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

function authorizeViewerWebSocket(req, socket) {
  const wsUrl = safeParseRequestUrl(req);
  if (!wsUrl || !isHostAllowed(req.headers.host)) { socket.destroy(); return null; }
  const pathname = wsUrl.pathname;
  const remoteIp = req.socket.remoteAddress;
  const isLoopbackPeer = remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp === '::ffff:127.0.0.1';
  const wsOrigin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  const wsHost = typeof req.headers.host === 'string' ? req.headers.host : '';
  const wsSameOrigin = !!wsOrigin && isViewerOriginAllowed(req);
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
    passwordUnreadable: currentAuthConfig.passwordUnreadable,
    wantsHtml: false,
    passwordLoginAvailable: serverProtocol === 'https',
    allowPasswordless: false,
  });
  if (authDecision.action !== 'allow') {
    socket.destroy();
    return;
  }
  return { wsUrl, pathname };
}

function setupPluginWebSocket(httpServer) {
  httpServer.on('upgrade', (req, socket, head) => {
    let pathname;
    try { pathname = safeParseRequestUrl(req)?.pathname; if (!pathname) throw new Error('invalid URL'); }
    catch { socket.destroy(); return; }
    if (pathname !== '/plugins' && !pathname.startsWith('/plugins/')) {
      if (!['/ws/mux', '/ws/terminal', '/ws/terminal-scratch'].includes(pathname)) socket.destroy();
      return;
    }
    const authorized = authorizeViewerWebSocket(req, socket);
    if (!authorized || req.headers['sec-fetch-site'] === 'cross-site') { socket.destroy(); return; }
    if (!pluginRuntime.tryProxyUpgrade(req, socket, head, authorized.wsUrl)) socket.destroy();
  });
}

async function setupDialogueWebSocket(httpServer) {
  const { WebSocketServer } = await import('ws');
  const mux = createStreamMuxServer({
    WebSocketServer,
    serveStream: async (sink, qs, handshake, path) => {
      // Reuse the actual HTTP authorization and scoped handlers for both streams.
      const request = new EventEmitter();
      Object.assign(request, { method: 'GET', url: `${path}?${qs}`,
        headers: { ...handshake.headers, accept: 'text/event-stream' }, socket: handshake.socket });
      sink.headersSent = false;
      sink.setHeader = () => {}; // HTTP headers are irrelevant after the authenticated upgrade.
      sink.writeHead = (status) => {
        if (sink.destroyed || status !== 200) throw new Error(`Mux stream unavailable (${status})`);
        sink.headersSent = true;
        return sink;
      };
      sink.destroy = () => sink.end();
      sink.once('close', () => request.emit('close'));
      await handleRequest(request, sink);
      return { dispose: () => sink.end() };
    },
  });
  dialogueMux = mux;
  httpServer.on('upgrade', (req, socket, head) => {
    let pathname;
    try { pathname = safeParseRequestUrl(req)?.pathname; if (!pathname) throw new Error('invalid URL'); }
    catch { socket.destroy(); return; }
    if (pathname !== '/ws/mux') {
      if (httpServer.listenerCount('upgrade') === 1) socket.destroy();
      return;
    }
    if (!authorizeViewerWebSocket(req, socket)) return;
    const ip = req.socket.remoteAddress;
    if (mux._sockets.size >= 32 || [...mux._sockets].filter(state => state.request?.socket?.remoteAddress === ip).length >= 8) {
      socket.destroy();
      return;
    }
    mux.handleUpgrade(req, socket, head);
  });
}

async function setupTerminalWebSocket(httpServer) {
  try {
    const { WebSocketServer } = await import('ws');
    const legacyPty = await import('./pty-manager.js');
    const { writeToPty, onPtyRawData, getCurrentWorkspace } = legacyPty;
    _onPtyData = (cb) => onPtyRawData(event => cb(event.data, event));
    const wss = new WebSocketServer({ noServer: true, maxPayload: 2 * 1024 * 1024 });
    const scratchWss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });
    terminalWss = wss;
    scratchTerminalWss = scratchWss;
    const DATA_HIGH_WATER = 2 * 1024 * 1024;
    const DATA_LOW_WATER = 512 * 1024;
    const MAX_SCREEN_SUFFIX_BYTES = 1024 * 1024;
    const BEHIND_RETRY_MIN_MS = 50;
    const BEHIND_RETRY_MAX_MS = 1000;
    const MAX_TERMINAL_CONNECTIONS = 32;
    const MAX_TERMINAL_CONNECTIONS_PER_IP = 8;
    const TERMINAL_RATE_WINDOW_MS = 1000;
    const terminalConnectionsByIp = new Map();
    const RESYNC_REASONS = new Set([
      'initial', 'requested', 'mount', 'congestion', 'parse-error', 'behind',
      'process-exit',
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
    const sizeGroups = new Map();
    function sizeGroup(key) {
      if (!sizeGroups.has(key)) sizeGroups.set(key, {
        activeWs: null, clientSizes: new Map(), mobileClients: new Set(),
      });
      return sizeGroups.get(key);
    }

    httpServer.on('upgrade', (req, socket, head) => {
      const authorized = authorizeViewerWebSocket(req, socket);
      if (!authorized) return;
      const { wsUrl, pathname } = authorized;
      if (pathname === '/ws/mux' || pathname.startsWith('/plugins/')) return; // handled by authenticated sibling listeners
      if (isSdkMode && (pathname === '/ws/terminal' || pathname === '/ws/terminal-scratch')) {
        try { req.cxvSdkSession = sdkViewForUrl(wsUrl); }
        catch { socket.destroy(); return; }
      }
      if (!isSdkMode && (pathname === '/ws/terminal' || pathname === '/ws/terminal-scratch')
          && (ptyWorkspaces || wsUrl.searchParams.has('instance'))) {
        try { req.cxvPtySession = ptyViewForUrl(wsUrl); }
        catch { socket.destroy(); return; }
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
      ws.cxvSdkSession = req.cxvSdkSession || null;
      ws.cxvPtySession = req.cxvPtySession || null;
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
          cwd: ws.cxvPtySession?.cwd || ws.cxvSdkSession?.cwd || getCurrentWorkspace().cwd || process.cwd(),
          instanceKey: ws.cxvPtySession?.instanceKey || ws.cxvSdkSession?.instanceKey,
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
      safeSend({ type: 'data-replay', data: session.replay });

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
            safeSend({ type: 'data-replay', data: session.replay });
          } else if (msg.type === 'kill') {
            session.kill();
          }
        } catch {}
      });
    });

    wss.on('connection', (ws, req) => {
      ws.cxvSdkSession = req.cxvSdkSession || null;
      ws.cxvPtySession = req.cxvPtySession || null;
      const ownerKey = ws.cxvPtySession?.instanceKey || 'boot';
      const ownedPty = ws.cxvPtySession ? ptyWorkspaces.session(ownerKey) : null;
      const { writeToPty, writeToPtySequential, resizePty, onPtyData, onPtyGeometry,
        onPtyState, onPtyExit, getPtyState, getTerminalSync, getTerminalScreen, spawnShell } = ownedPty || legacyPty;
      const group = sizeGroup(ownerKey);
      const { clientSizes, mobileClients } = group;
      const getMobileSize = () => {
        for (const mws of mobileClients) {
          if (mws.readyState === 1 && clientSizes.has(mws)) return clientSizes.get(mws);
        }
        return null;
      };
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
      let screenInFlight = false;
      let screenBuffer = [];
      let screenBufferBytes = 0;
      let screenBufferOverflow = false;
      let screenGeometry = null;
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
          void sendTerminalScreen('behind');
        }, delay);
        behindTimer.unref?.();
      }

      function wakeBehindRecovery() {
        if (!behind || ws.readyState !== 1 || ws.bufferedAmount > DATA_LOW_WATER) return;
        if (behindTimer) clearTimeout(behindTimer);
        behindTimer = null;
        scheduleBehindRecovery(0);
      }

      const syncFrame = (sync, reason) => ({
        type: 'stream-sync',
        reason: normalizeResyncReason(reason),
        streamId: sync.streamId,
        throughSeq: sync.throughSeq,
        resizeGeneration: sync.resizeGeneration,
        cols: sync.cols,
        rows: sync.rows,
      });

      const encodeSyncFrame = (sync, reason) => {
        const payload = JSON.stringify(syncFrame(sync, reason));
        return { payload, bytes: Buffer.byteLength(payload) };
      };

      function sendTerminalSync(reason = 'requested') {
        if (ws.readyState !== 1) return false;
        const frame = encodeSyncFrame(getTerminalSync(), reason);
        if (behind || ws.bufferedAmount > DATA_LOW_WATER) {
          behind = true;
          scheduleBehindRecovery();
          return false;
        }
        return safeSend(frame.payload);
      }

      async function sendTerminalScreen(reason = 'requested') {
        if (ws.readyState !== 1 || screenInFlight) return false;
        if (getPtyState().recovering) return false;
        screenInFlight = true;
        try {
          screenBuffer = [];
          screenBufferBytes = 0;
          screenBufferOverflow = false;
          screenGeometry = null;
          let screen = await getTerminalScreen();
          // A resize is an ordered terminal-state mutation. Recut once at the
          // new geometry instead of publishing an older snapshot after the
          // client has already observed that geometry.
          if (screenGeometry
            && screenGeometry.resizeGeneration > screen.resizeGeneration
            && !screenBufferOverflow) {
            screenBuffer = [];
            screenBufferBytes = 0;
            screenGeometry = null;
            screen = await getTerminalScreen();
          }
          if (!screen?.safe || screenBufferOverflow) {
            const sent = safeSend({
              type: 'screen-unavailable',
              reason: screenBufferOverflow ? 'suffix-overflow' : 'unsafe-parser-state',
              details: Array.isArray(screen?.reasons) ? screen.reasons.slice(0, 8) : [],
            });
            behind = true;
            scheduleBehindRecovery();
            return sent;
          }
          if (!safeSend({
            type: 'screen-snapshot',
            reason: normalizeResyncReason(reason),
            ...screen,
          })) return false;

          if (screenGeometry && screenGeometry.resizeGeneration > screen.resizeGeneration) {
            safeSend({ type: 'geometry', ...screenGeometry });
          }
          let expected = screen.throughSeq + 1;
          for (const frame of screenBuffer) {
            if (frame.meta.streamId !== screen.streamId || frame.meta.seq <= screen.throughSeq) continue;
            if (frame.meta.seq !== expected) {
              safeSend({ type: 'screen-unavailable', reason: 'suffix-gap' });
              return false;
            }
            safeSend(encodePublishedFrame(frame.data, frame.meta).payload);
            expected++;
          }
          return true;
        } catch (error) {
          if (process.env.CXV_DEBUG) console.warn('[CX Viewer] terminal screen unavailable:', error.message);
          behind = true;
          scheduleBehindRecovery();
          return safeSend({ type: 'screen-unavailable', reason: 'renderer-failed' });
        } finally {
          screenBuffer = [];
          screenBufferBytes = 0;
          screenBufferOverflow = false;
          screenGeometry = null;
          screenInFlight = false;
        }
      }

      const replayEditors = () => {
        const owner = ws.cxvPtySession?.instanceKey || ws.cxvSdkSession?.instanceKey || null;
        for (const session of editorSessions.values()) if (!session.done && (session.scope?.instanceKey || null) === owner) safeSend(editorFrame(session));
      };
      replayEditors();

      // 发送当前 PTY 状态
      attachTerminalWsPing(ws);
      const state = getPtyState();
      safeSend({ type: 'state', ...state });
      if (ws.cxvSdkSession) {
        safeSend({ type: 'sdk-workspace', ...ws.cxvSdkSession });
        safeSend(sdkManager.getSdkQueueState({ instanceKey: ws.cxvSdkSession.instanceKey }));
        safeSend(sdkManager.getSdkTaskState({ instanceKey: ws.cxvSdkSession.instanceKey }));
        for (const approval of sdkManager.getSdkPendingApprovals({ instanceKey: ws.cxvSdkSession.instanceKey })) safeSend(approval);
        safeSend(sdkManager.getSdkAgentState({ instanceKey: ws.cxvSdkSession.instanceKey }));
        const mcpStatus = sdkManager.getMcpStatusSnapshot({ instanceKey: ws.cxvSdkSession.instanceKey });
        if (mcpStatus) safeSend(mcpStatus);
        for (const frame of sdkManager.getSdkSlowUpstreams({ instanceKey: ws.cxvSdkSession.instanceKey })) safeSend(frame);
      }

      if (!isSdkMode && ws.cxvPtySession) {
        const queue = ptyQueueFor(ws.cxvPtySession);
        if (queue) safeSend({ type: 'queue-state', ...ws.cxvPtySession, items: queue.queue.getSnapshot() });
        const tasks = ptyWorkspaces?.runtime(ws.cxvPtySession.instanceKey)?.getTaskState?.();
        if (tasks) safeSend({ ...tasks, instanceKey: ws.cxvPtySession.instanceKey, cwd: ws.cxvPtySession.cwd, transport: 'pty' });
      }

      // PTY 输出 → WebSocket
      const removeDataListener = onPtyData((data, meta = {}) => {
        if (ws.readyState !== 1) return;
        if (screenInFlight) {
          const bytes = Buffer.byteLength(data, 'utf8');
          if (screenBufferBytes + bytes > MAX_SCREEN_SUFFIX_BYTES) {
            screenBufferOverflow = true;
            screenBuffer = [];
            screenBufferBytes = 0;
          } else if (!screenBufferOverflow) {
            screenBuffer.push({ data, meta });
            screenBufferBytes += bytes;
          }
          return;
        }
        const frame = encodePublishedFrame(data, meta);
        if (behind || ws.bufferedAmount + frame.bytes > DATA_HIGH_WATER) {
          behind = true;
          scheduleBehindRecovery();
          return;
        }
        safeSend(frame.payload);
      });

      const removeGeometryListener = onPtyGeometry((geometry) => {
        if (ws.readyState !== 1) return;
        if (screenInFlight) {
          screenGeometry = geometry;
          return;
        }
        safeSend({ type: 'geometry', ...geometry });
      });

      // Process replacement is a protocol boundary even when the new PTY is
      // initially silent. State establishes the new live-stream cursor.
      const removeStateListener = onPtyState((nextState) => {
        if (ws.readyState !== 1) return;
        safeSend({
          type: 'state',
          ...nextState,
        });
        if (nextState.reason === 'resume-ready'
          || nextState.reason === 'resume-timeout'
          || nextState.reason === 'resume-input') {
          void sendTerminalScreen(nextState.reason);
        }
      });

      // PTY 退出 → WebSocket
      const removeExitListener = onPtyExit((exitCode, meta = {}) => {
        if (behindTimer) clearTimeout(behindTimer);
        behindTimer = null;
        behind = false;
        if (ws.readyState === 1) {
          safeSend({ type: 'exit', exitCode, ...meta });
        }
      });

      // WebSocket → PTY
      ws.on('message', async (raw) => {
        let requestId;
        try {
          const rawBytes = Buffer.isBuffer(raw) ? raw.byteLength : Buffer.byteLength(String(raw));
          if (!consumeRate('messages', 1, 240)
            || !consumeRate('wireBytes', rawBytes, 4 * 1024 * 1024)) return;
          const msg = JSON.parse(raw.toString());
          if (!msg || typeof msg !== 'object' || Array.isArray(msg) || typeof msg.type !== 'string') return;
          if (ws.cxvPtySession) {
            ptyWorkspaces.info(ownerKey);
            if ((msg.instanceKey != null && msg.instanceKey !== ownerKey)
              || (msg.viewInstance != null && msg.viewInstance !== ownerKey)
              || (msg.cwd != null && msg.cwd !== ws.cxvPtySession.cwd)) return;
          }
          // SDK sessions have no main PTY. Scratch terminals own a separate WS handler.
          if (isSdkMode && (msg.type === 'input' || msg.type === 'input-sequential'
            || msg.type === 'resync-request' || msg.type === 'resize')) return;
          if (msg.type === 'sdk-user-message' && msg.requestId !== undefined) {
            if (typeof msg.requestId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(msg.requestId)) {
              throw Object.assign(new Error('Invalid SDK message request id'), { code: 'SDK_INVALID_REQUEST_ID' });
            }
            requestId = msg.requestId;
          }
          if (isSdkMode && (msg.type.startsWith('sdk-') || msg.type === 'perm-hook-answer' || msg.type === 'ask-auto-cancel')) {
            const anchor = sdkActionAnchor(ws, msg);
            if (msg.type === 'ask-auto-cancel') {
              sdkManager.cancelAskHosting(msg.id, anchor);
            } else if (msg.type === 'sdk-user-message') {
              if (typeof msg.text !== 'string' || !msg.text.trim()) throw new Error('SDK message text is required');
              await (_sdkSendUserMessage || sdkManager.sendUserMessage)(msg.text, anchor, {
                requestId,
                onAccepted: result => {
                  if (requestId) safeSend({ type: 'sdk-message-accepted', requestId,
                    queued: result.queued, queueId: result.id || null,
                    instanceKey: ws.cxvSdkSession.instanceKey, cwd: ws.cxvSdkSession.cwd });
                },
              });
            } else if (msg.type === 'sdk-queue-remove') {
              sdkManager.removeSdkQueuedMessage(msg.id, anchor);
            } else if (msg.type === 'sdk-queue-send-now') {
              await sdkManager.sendSdkQueuedNow(msg.id, anchor);
            } else if (msg.type === 'sdk-interrupt') {
              (_sdkInterruptTurn || sdkManager.interruptTurn)(anchor);
            } else if (msg.type === 'sdk-retry-turn') {
              const result = sdkManager.retryInterruptedTurn(msg.turnId, anchor);
              if (!result.ok) safeSend({ type: 'sdk-retry-state', phase: 'rejected', reason: result.reason,
                turnId: typeof msg.turnId === 'string' ? msg.turnId : null,
                cwd: ws.cxvSdkSession.cwd, instanceKey: anchor.instanceKey, ts: Date.now() });
            } else if (msg.type === 'perm-hook-answer' || msg.type === 'sdk-ask-answer' || msg.type === 'sdk-plan-answer') {
              const value = msg.type === 'sdk-ask-answer' ? msg.answers
                : msg.type === 'sdk-plan-answer' ? { approve: msg.approve !== false, feedback: msg.feedback || '' }
                  : msg.allowSession ? { decision: msg.decision || 'allow', allowSession: true } : (msg.decision || 'deny');
              const resolved = (_sdkResolveApproval || sdkManager.resolveApproval)(msg.id, value, anchor);
              // Native requests publish their item/answer metadata through the
              // instance-owned bridge; do not send a second empty resolution.
              if (resolved && !String(msg.id).startsWith('native_')) broadcastWsMessage({
                type: msg.type === 'perm-hook-answer' ? 'perm-hook-resolved' : msg.type.replace('-answer', '-resolved'),
                id: msg.id, cwd: ws.cxvSdkSession.cwd, instanceKey: anchor.instanceKey,
              });
              else if (!resolved && typeof msg.id === 'string' && msg.id.startsWith('native_')) {
                throw Object.assign(new Error('Approval is no longer pending or the decision is not available'), { code: 'SDK_APPROVAL_NOT_PENDING' });
              }
            }
            return;
          }
          if (['queue-message', 'queue-send-now', 'queue-remove', 'queue-clear', 'queue-suppress'].includes(msg.type)) {
            const owned = !isSdkMode && ws.cxvPtySession ? ptyQueueFor(ws.cxvPtySession) : null;
            if (!owned) { safeSend({ type: 'queue-rejected', reason: 'unavailable', requestId: msg.requestId, ...ws.cxvPtySession }); return; }
            const { queue, anchor, ready } = owned;
            if (msg.sessionId != null && msg.sessionId !== anchor.sessionId) {
              safeSend({ type: 'queue-rejected', reason: 'stale-session', requestId: msg.requestId, ...ws.cxvPtySession }); return;
            }
            if (msg.type === 'queue-message') {
              if (typeof msg.text !== 'string' || !msg.text.trim() || Buffer.byteLength(msg.text) > 1024 * 1024
                || typeof msg.requestId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(msg.requestId)
                || !consumeRate('inputBytes', Buffer.byteLength(msg.text), 2 * 1024 * 1024)) return;
              if (!ready || !getPtyState().running || getPtyState().kind !== 'codex') {
                safeSend({ type: 'queue-rejected', reason: 'unavailable', requestId: msg.requestId, ...ws.cxvPtySession }); return;
              }
              const item = queue.enqueue(msg.text, anchor, msg.requestId);
              safeSend({ type: item ? 'queue-message-accepted' : 'queue-rejected', requestId: msg.requestId,
                ...(item ? { id: item.id } : { reason: 'full' }), ...ws.cxvPtySession });
            } else if (msg.type === 'queue-clear') queue.clear();
            else if (msg.type === 'queue-suppress') queue.suppressNextDrain();
            else if (typeof msg.id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(msg.id)) {
              if (msg.type === 'queue-remove') queue.remove(msg.id, anchor);
              else queue.sendNow(msg.id, anchor);
            }
            return;
          }
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
            if (group.activeWs !== ws) {
              group.activeWs = ws;
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
          } else if (msg.type === 'ask-auto-cancel') {
            const id = typeof msg.id === 'string' ? msg.id : '';
            const pending = pendingCodexAsks.get(id);
            if (pending?.auto && ptyScopeMatches(ws, pending.scope) && cancelAskAutoAnswerState(pending)) {
              broadcastCodexAskMessage({ type: 'ask-auto-cancel', id, ...(pending.scope || {}) }, null, pending.scope);
            }
          } else if (msg.type === 'ask-cancel') {
            const askId = msg.id != null ? String(msg.id) : '';
            let cancelled = false;
            const pending = askId && pendingCodexAsks.get(askId);
            if (pending && ptyScopeMatches(ws, pending.scope)) {
              cancelled = pending.bridge?.cancel?.(askId) === true;
              if (cancelled) removePendingCodexAsk(askId);
            } else if (!askId && pendingAskHook && ptyScopeMatches(ws)) {
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
              }, null, pending?.scope);
            } else if (askId && ws.readyState === 1) {
              try { ws.send(JSON.stringify({ type: 'ask-hook-already-answered', id: askId })); } catch {}
            }
          } else if (msg.type === 'ask-hook-answer') {
            // Current path: respond directly to Codex app-server JSON-RPC.
            let askAnswered = false;
            const askId = msg.id != null ? String(msg.id) : '';
            const pendingCodexAsk = askId ? pendingCodexAsks.get(askId) : null;
            if (pendingCodexAsk && ptyScopeMatches(ws, pendingCodexAsk.scope)) {
              askAnswered = pendingCodexAsk.bridge?.resolve?.(
                askId,
                msg.codexAnswers || msg.answers || {},
              ) === true;
              if (askAnswered) removePendingCodexAsk(askId);
            } else if (!askId && pendingAskHook && ptyScopeMatches(ws)) {
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
                if (c.readyState === 1 && ptyScopeMatches(c, pendingCodexAsk?.scope)) try { c.send(rmsg); } catch {}
              });
            } else if (!askAnswered && askId && ws.readyState === 1) {
              try { ws.send(JSON.stringify({ type: 'ask-hook-already-answered', id: askId })); } catch {}
            }
          } else if (msg.type === 'perm-hook-answer') {
            // Permission approval — SDK mode (canUseTool) or PTY mode (hook bridge)
            let permAnswered = false;
            let permScope = null;
            if (isSdkMode && _sdkResolveApproval && msg.id) {
              _sdkResolveApproval(msg.id, msg.allowSession ? { decision: msg.decision || 'allow', allowSession: true } : (msg.decision || 'deny'));
              permAnswered = true;
            } else if (msg.id && pendingPermHooks.has(msg.id) && ptyScopeMatches(ws, pendingPermHooks.get(msg.id).scope)) {
              const { res: hookRes, timer, scope } = pendingPermHooks.get(msg.id);
              permScope = scope;
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
                if (c !== ws && c.readyState === 1 && (isSdkMode || ptyScopeMatches(c, permScope))) try { c.send(rmsg); } catch {}
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
            const anchor = isSdkMode ? sdkActionAnchor(ws, msg) : null;
            // Security: only allow paths within upload directories, reject traversal
            const p = msg.path;
            if (terminalWss && typeof p === 'string' && !p.includes('..') && (
              p.startsWith('/tmp/cx-viewer-uploads/') || (p.includes('/cx-viewer/') && p.includes('/images/'))
            )) {
              const data = { type: msg.type, path: p,
                ...(msg.type === 'image-upload-notify' ? { source: msg.source || 'unknown' } : {}),
                ...(anchor ? { instanceKey: anchor.instanceKey, cwd: ws.cxvSdkSession.cwd }
                  : ws.cxvPtySession ? { instanceKey: ownerKey, cwd: ws.cxvPtySession.cwd } : {}) };
              const rmsg = JSON.stringify(data);
              terminalWss.clients.forEach((c) => {
                if (isSdkMode && !sdkScopeMatches(c, data)) return;
                if (!isSdkMode && !ptyScopeMatches(c, ptyScope(data))) return;
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
            } else if (mobileClients.size === 0 && (group.activeWs === ws || group.activeWs === null)) {
              group.activeWs = ws;
              resizePty(msg.cols, msg.rows);
            }
          } else if (msg.type === 'resync-request') {
            if (!consumeRate('resync', 1, 12)) return;
            replayEditors();
            void sendTerminalScreen(normalizeResyncReason(msg.reason));
          }
        } catch (error) {
          if (isSdkMode) safeSend({ type: 'sdk-error', message: error.message, code: error.code,
            ...(requestId ? { requestId } : {}),
            instanceKey: ws.cxvSdkSession?.instanceKey || null });
        }
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
        if (behindTimer) clearTimeout(behindTimer);
        behindTimer = null;
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
        if (group.activeWs === ws) {
          // 活跃客户端断开，将控制权交给剩余的某个客户端
          group.activeWs = null;
          // 优先使用移动端尺寸，无移动端则用剩余客户端尺寸
          const mSize = getMobileSize();
          if (mSize) {
            resizePty(mSize.cols, mSize.rows);
          } else {
            for (const [remainWs, size] of clientSizes) {
              if (remainWs.readyState === 1) {
                group.activeWs = remainWs;
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
    if (ptyWorkspaces) {
      for (const view of ptyWorkspaces.list()) {
        const loop = [..._ptyAgentLoops.values()].filter(data => data.instanceKey === view.instanceKey).at(-1);
        sendEventToClients(ptyEventClients(view), 'streaming_status', loop
          ? { ...loop, active: true, elapsed: Date.now() - (loop.turnStartedAt || Date.now()) }
          : { active: false });
      }
      return;
    }
    const loop = [..._ptyAgentLoops.values()].at(-1);
    const active = !!loop || streamingState.active;
    const changed = active !== _lastStreamingActive;
    if (changed || active) {
      const data = active
        ? { ...streamingState, active: true, elapsed: Date.now() - (loop?.turnStartedAt || streamingState.startTime) }
        : { active: false };
      if (clients.length > 0 && sendEventToClients) sendEventToClients(clients, 'streaming_status', data);
      _lastStreamingActive = active;
    }
  }, 500);
  _streamingStatusTimer.unref();
}

let _stoppingPromise = null;
export function stopViewer({ deadlineAt = Date.now() + SHUTDOWN_DEADLINE_MS } = {}) {
  if (_stoppingPromise) return _stoppingPromise;
  _stoppingPromise = _doStop(deadlineAt);
  return _stoppingPromise;
}
async function _doStop(deadlineAt) {
  _viewerStopping = true;
  try { await pluginRuntime.onServerStopping(); }
  catch (error) { reportSwallowed('plugins.shutdown', error); }
  stopScheduledTaskScheduler();
  if (sdkManager) {
    try { await waitWithTimeout(() => sdkManager.stopEphemeralSessions(), Math.max(0, deadlineAt - Date.now()), 'scheduled task shutdown'); }
    catch (error) { reportSwallowed('scheduled-tasks.shutdown', error); }
  }
  for (const timer of _ptyLoopEndTimers.values()) clearTimeout(timer);
  _ptyLoopEndTimers.clear(); _ptyAgentLoops.clear();
  const remaining = () => Math.max(0, deadlineAt - Date.now());
  try { await waitWithTimeout(() => waitScheduledTaskRuns(), remaining(), 'scheduled task results'); }
  catch (error) { reportSwallowed('scheduled-tasks.results-shutdown', error); }
  if (_dingtalkImBridge) {
    try { await _dingtalkImBridge.stop(); } catch {}
    _dingtalkImBridge = null;
  }
  _dingtalkRuntimeContextProvider = null;
  _dingtalkPtyStateProvider = null;
  try {
    const appServerMod = await import('./lib/appserver-bridge.js');
    appServerMod.setAppServerTurnTerminalListener(null);
  } catch {}
  try { await waitWithTimeout(() => runParallelHook('serverStopping'), Math.min(3000, remaining()), 'serverStopping hooks'); } catch { }
  pluginRoutes = [];
  for (const id of pendingCodexAsks.keys()) removePendingCodexAsk(id);
  stopPtyQueues();
  clearEditorSessions();
  const scratchShutdown = shutdownScratchPtys();
  // Keep its rejection observed while main workspaces shut down in parallel.
  scratchShutdown.catch(() => {});
  if (ptyWorkspaces) {
    const registry = ptyWorkspaces; ptyWorkspaces = null;
    try { await waitWithTimeout(() => registry.closeAll(), remaining(), 'PTY workspace shutdown'); } catch (error) {
      console.warn('[CX Viewer] PTY workspace shutdown:', error.message);
    }
  }
  try { await waitWithTimeout(() => scratchShutdown, remaining(), 'scratch shutdown'); } catch (error) {
    console.warn('[CX Viewer] scratch shutdown:', error.message);
  }
  dialogueMux?.close();
  dialogueMux = null;
  if (terminalWss) {
    for (const client of terminalWss.clients) client.terminate();
    terminalWss.close();
    terminalWss = null;
  }
  if (scratchTerminalWss) {
    for (const client of scratchTerminalWss.clients) {
      try { client.close(1001, 'server stopping'); } catch {}
    }
    scratchTerminalWss = null;
  }
  _codexRequestUserInputBridge = null;
  _systemPromptRuntimeCapability = null;
  for (const watcher of _workspaceProxyWatchers.values()) watcher.stop();
  _workspaceProxyWatchers.clear();
  unwatchFile(CONTEXT_WINDOW_FILE);
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
  if (statsUpdateTimer) {
    clearTimeout(statsUpdateTimer);
    statsUpdateTimer = null;
  }
  pendingStatsProjects.clear();
  if (_streamingStatusTimer) {
    clearInterval(_streamingStatusTimer);
    _streamingStatusTimer = null;
  }
  resetStreamingState();
  try { await waitWithTimeout(() => closeLogV2Writes(), remaining(), 'Log V2 shutdown'); } catch (error) {
    console.warn('[CX Viewer] Log V2 durable shutdown failed:', error.message);
  }
  try { unwatchFile(PROFILE_PATH); } catch {} // 清理 interceptor 的 StatWatcher
}

// ─── SDK Mode Exports ──────────────────────────────────────────

/** Persist one SDK entry through the canonical V2 writer. */
export function pushSdkEntry(entry) {
  if (entry) {
    try {
      appendLogEntry(entry, {
        source: 'sdk',
        cwd: entry.body?.metadata?.cwd || entry.body?._cwd || process.env.CXV_PROJECT_DIR || process.cwd(),
        projectId: entry.project,
        sessionId: entry.body?.metadata?.thread_id || entry.body?._threadId || null,
        threadId: entry.body?.metadata?.thread_id || entry.body?._threadId || null,
      });
    } catch {}
  }
}

/** Update streaming status (for SDK mode). */
export function setSdkStreamingState(data) {
  sendSdkEvent('streaming_status', data);
}

/** Push live SDK text/thinking blocks without polluting the JSONL request list. */
export function sendSdkStreamProgress(data) {
  sendSdkEvent('stream-progress', data);
}

// SDK boundaries are per accepted turn, independent of API request activity.
// Retain the baseline event/hook names; use the existing exact SDK scope route.
function emitSdkAgentLoopBoundary(phase, data) {
  if (_stoppingPromise || !data?.cwd || !data?.instanceKey || !data?.turnId) return;
  const payload = { ...data, mode: 'sdk', project: basename(data.cwd), instance: data.instanceKey };
  sendSdkEvent(phase === 'start' ? 'agent_loop_start' : 'agent_loop_end', payload);
  void runParallelHook(phase === 'start' ? 'onAgentLoopStart' : 'onAgentLoopEnd', payload).catch(() => {});
}
export function broadcastAgentLoopStart(data) { emitSdkAgentLoopBoundary('start', data); }
export function broadcastAgentLoopEnd(data) { emitSdkAgentLoopBoundary('end', data); }

// Ordinary TUI uses its owned App Server bridge instead of Claude's hooks. Keep
// the baseline PTY voice boundary: normal ends wait for ten seconds of quiet,
// while loading ends immediately and a new accepted turn cancels old tail cues.
const TURN_END_DEBOUNCE_MS = (() => {
  const raw = process.env.CXV_TURN_END_DEBOUNCE_MS;
  if (raw == null || !raw.trim()) return 10000;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 100 && n <= 60000) return n;
  console.warn('[turn-end] CXV_TURN_END_DEBOUNCE_MS out of [100,60000]; using 10000');
  return 10000;
})();
const _ptyAgentLoops = new Map(), _ptyLoopEndTimers = new Map();
const ptyLoopKey = data => `${data.instanceKey || ''}\0${data.sessionId}\0${data.turnId}`;
function ownedPtyLoopData(data) {
  if (isSdkMode || _stoppingPromise || typeof data?.sessionId !== 'string' || !data.sessionId
      || typeof data.turnId !== 'string' || !data.turnId) return null;
  const scope = ptyScope(data);
  if (ptyWorkspaces) return scope ? { ...data, instanceKey: scope.instanceKey, cwd: scope.cwd } : null;
  return data.cwd === currentProjectDir() ? data : null;
}
function ptyLoopActive(data) {
  return [..._ptyAgentLoops.values()].some(loop => loop.instanceKey === data.instanceKey);
}
function emitPtyAgentLoopBoundary(phase, data) {
  if (_stoppingPromise) return;
  const payload = { ...data, mode: 'pty', project: basename(data.cwd), instance: data.instanceKey || null };
  sendEventToClients(ptyEventClients(data), phase === 'start' ? 'agent_loop_start' : 'agent_loop_end', payload);
  void runParallelHook(phase === 'start' ? 'onAgentLoopStart' : 'onAgentLoopEnd', payload).catch(() => {});
}
export function broadcastPtyAgentLoopStart(input) {
  const data = ownedPtyLoopData(input);
  if (!data || _ptyAgentLoops.has(ptyLoopKey(data))) return;
  for (const [key, timer] of _ptyLoopEndTimers) {
    if (!key.startsWith(`${data.instanceKey || ''}\0`)) continue;
    clearTimeout(timer); _ptyLoopEndTimers.delete(key);
  }
  _ptyAgentLoops.set(ptyLoopKey(data), { ...data });
  ptyQueues.get(data.instanceKey)?.queue.onStreamingActivated();
  sendEventToClients(ptyEventClients(data), 'turn_active', { ...data, active: true, project: basename(data.cwd) });
  emitPtyAgentLoopBoundary('start', data);
}
export function broadcastPtyAgentLoopEnd(input) {
  const data = ownedPtyLoopData(input);
  if (!data) return;
  const key = ptyLoopKey(data), rec = _ptyAgentLoops.get(key);
  if (!rec) return;
  _ptyAgentLoops.delete(key);
  const ended = { ...rec, ts: data.ts || Date.now(), reason: data.reason || 'stop-hook' };
  sendEventToClients(ptyEventClients(data), 'turn_active', { ...ended, active: ptyLoopActive(data), project: basename(data.cwd) });
  if (['interrupted', 'session-ended'].includes(ended.reason)) {
    if (ended.reason === 'session-ended') ptyQueues.get(data.instanceKey)?.queue.suppressNextDrain();
    else ptyQueues.get(data.instanceKey)?.queue.onTurnEnd();
    emitPtyAgentLoopBoundary('end', ended); return;
  }
  const timer = setTimeout(() => {
    _ptyLoopEndTimers.delete(key);
    emitPtyAgentLoopBoundary('end', ended);
    ptyQueues.get(data.instanceKey)?.queue.onTurnEnd();
    sendEventToClients(ptyEventClients(ended), 'turn_end', { ...ended, project: basename(data.cwd), instance: data.instanceKey || null });
  }, TURN_END_DEBOUNCE_MS);
  timer.unref?.(); _ptyLoopEndTimers.set(key, timer);
}

export function broadcastPtyTaskSnapshot(input) {
  if (isSdkMode || _stoppingPromise) return;
  const scope = ptyScope(input);
  if (ptyWorkspaces && !scope) return;
  broadcastWsMessage({ ...input, ...(scope ? { instanceKey: scope.instanceKey, cwd: scope.cwd } : {}), transport: 'pty' });
}

/** Broadcast a message to all terminal WS clients (for SDK canUseTool). */
export function broadcastWsMessage(msg) {
  if (terminalWss) {
    const str = typeof msg === 'string' ? msg : JSON.stringify(msg);
    const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
    const scope = !isSdkMode && ptyScope(data);
    if (!isSdkMode && ptyWorkspaces && !scope) return;
    terminalWss.clients.forEach((c) => {
      if (isSdkMode && !sdkScopeMatches(c, data)) return;
      if (!isSdkMode && !ptyScopeMatches(c, scope)) return;
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
          if (result.status === 'available') {
            clients.forEach(client => {
              try { client.write(`event: update_available\ndata: ${JSON.stringify({ version: result.remoteVersion })}\n\n`); } catch { }
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

// cli.js owns signals in workspace/CLI mode. Standalone `node server.js` still
// needs a coordinator, but must not register a second pair of handlers.
if (!isWorkspaceMode) registerSignalShutdown(({ deadlineAt }) => stopViewer({ deadlineAt }));
