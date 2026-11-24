/**
 * sdk-manager.js - Codex SDK session lifecycle manager.
 *
 * Uses the official @openai/codex-sdk event stream:
 *   Codex -> Thread -> runStreamed() -> thread/item/turn events.
 */

import {
  DEFAULT_CODEX_TOOLS,
  buildStreamingStatus,
  isSdkToolItem,
  isSdkResumeThreadId,
  sdkItemToAssistantBlock,
  sdkItemToToolUseBlock,
  sdkToJSONLEntry,
  sdkToolName,
  sdkToolOutput,
  sdkToolResultContent,
} from './sdk-adapter.js';
import { createProxy } from '../proxy.js';
import { readCodexGlobalConfig } from './codex-config.js';
import { buildContextWindowEvent } from './context-watcher.js';
import { parseCodexInvocation, stripResumeInvocation } from "@cxv/core/cli-args";
import { createHash, randomUUID } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { createSdkExecTransport } from './sdk-exec-transport.js';
import { createSdkAppServerTransport } from './sdk-appserver-transport.js';
import { createSdkAppServerApprovals } from './sdk-appserver-approvals.js';
import { createSdkAppServerAgents } from './sdk-appserver-agents.js';
import { readSdkModelCatalog } from './sdk-model-catalog.js';
import { readSdkPlanUsage } from './sdk-plan-usage.js';

let _Codex = null;
let _sdkImportError = null;
try {
  const sdk = await import('@openai/codex-sdk');
  _Codex = sdk.Codex;
} catch (err) {
  _sdkImportError = err;
  console.warn('[SDK] Codex SDK not available:', err.message);
}

export function isSdkAvailable() {
  return typeof _Codex === 'function';
}

export function getSdkUnavailableReason() {
  return _sdkImportError?.message || null;
}

export function getSdkWorkingDirectory(cwd, codexArgs = [], transport = 'exec') {
  return resolve(cwd, parseSdkCodexArgs(codexArgs, {}, transport).threadOptions.workingDirectory || '.');
}

// Resolve paths without realpath: symlink spellings follow the existing workspace
// convention. One resident session per normalized cwd, independently owned.
const sessions = new Map();
const ephemeralSessions = new Set();
let activeKey = null;
let launchConfig = null;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504, 529]);
const RETRY_CONTINUE_PROMPT =
  '[cc-viewer:retry] The previous response was interrupted by an API error. ' +
  'Continue the same task from where it stopped. Do not repeat completed work; ' +
  'finish the remaining steps and reply concisely.';

export function setSdkLaunchConfig(options) {
  if (options == null) { launchConfig = null; return; }
  const { codexArgs = [], ...config } = options;
  const parsed = parseSdkCodexArgs(codexArgs, {}, config.transport);
  delete parsed.threadOptions.workingDirectory;
  // Resume targets and prompts belong to the boot workspace only.
  launchConfig = { options: config, defaults: {
    threadOptions: parsed.threadOptions, codexOptions: parsed.codexOptions, configOverrides: parsed.configOverrides,
  } };
}

export function launchSdkSession(cwd, projectName, codexArgs = []) {
  if (!launchConfig) {
    const error = new Error('SDK workspace launch is not configured');
    error.status = 503;
    throw error;
  }
  const parsed = parseSdkCodexArgs(codexArgs, launchConfig.defaults, launchConfig.options.transport);
  if (parsed.threadOptions.workingDirectory
      && resolve(cwd, parsed.threadOptions.workingDirectory) !== resolve(cwd)) {
    const error = new Error('Workspace path and --cd must identify the same directory');
    error.status = 400;
    throw error;
  }
  const existing = sessions.get(resolve(cwd));
  if (existing) return { ...attachSdkSession({ cwd }), reused: true };
  return { ...registerSdkSession(cwd, projectName, launchConfig.options, parsed), reused: false };
}

function sessionInfo(session) {
  return {
    cwd: session.cwd,
    projectName: session.projectName,
    instanceKey: session.instanceKey,
    sessionId: session.getSessionId(),
    busy: session.getStreamingState().active,
    active: session.cwd === activeKey,
    transport: session.transportKind,
  };
}

function sessionForAnchor(anchor) {
  if (anchor == null) return sessions.get(activeKey) || null;
  const fields = ['instanceKey', 'cwd', 'project'];
  if (typeof anchor !== 'object' || Array.isArray(anchor)
      || !fields.some(field => Object.hasOwn(anchor, field))
      || fields.some(field => Object.hasOwn(anchor, field)
        && (typeof anchor[field] !== 'string' || !anchor[field].trim()))) {
    const error = new Error('Invalid SDK workspace anchor');
    error.status = 400;
    error.code = 'SDK_SESSION_INVALID_ANCHOR';
    throw error;
  }
  const matches = [...sessions.values()].filter(session => {
    if (anchor.instanceKey) return session.instanceKey === anchor.instanceKey
      && (!anchor.cwd || session.cwd === resolve(anchor.cwd));
    if (anchor.cwd) return session.cwd === resolve(anchor.cwd);
    if (anchor.project) {
      const name = basename(session.cwd);
      return anchor.project === name || anchor.project === name.replace(/[^a-zA-Z0-9_\-.]/g, '_');
    }
    return false;
  });
  if (matches.length === 1) return matches[0];
  const error = new Error(matches.length > 1 ? 'Ambiguous SDK workspace' : 'SDK workspace is no longer available');
  error.code = matches.length > 1 ? 'SDK_SESSION_AMBIGUOUS' : 'SDK_SESSION_NOT_FOUND';
  error.status = matches.length > 1 ? 409 : 404;
  error.candidates = matches.map(sessionInfo);
  throw error;
}

export function listSdkSessions() {
  return [...sessions.values()].map(sessionInfo);
}

export function getSdkSessionInfo(anchor) {
  const session = sessionForAnchor(anchor);
  return session ? sessionInfo(session) : null;
}

export function getSdkStreamingState(anchor) {
  return sessionForAnchor(anchor)?.getStreamingState() || null;
}

export function getSdkStreamProgress(anchor) {
  return sessionForAnchor(anchor)?.getStreamProgress() || null;
}

export function listSdkModels(anchor) {
  return sessionForAnchor(anchor)?.listModels();
}

export function getSdkPlanUsage(anchor) {
  return sessionForAnchor(anchor)?.getPlanUsage();
}

export function setSdkModel(selection, anchor) {
  return sessionForAnchor(anchor)?.setModel(selection);
}

export function getSdkQueueState(anchor) {
  return sessionForAnchor(anchor)?.getQueueState() || null;
}

export function getSdkTaskState(anchor) {
  return sessionForAnchor(anchor)?.getTaskState() || null;
}

function ephemeralForAnchor(anchor) {
  return [...ephemeralSessions].filter(record => anchor && anchor.instanceKey === record.ownerKey
    && (!anchor.cwd || resolve(anchor.cwd) === record.session.cwd));
}

export function getSdkPendingApprovals(anchor) {
  const resident = sessionForAnchor(anchor)?.getPendingApprovals() || [];
  const children = anchor ? ephemeralForAnchor(anchor) : [...ephemeralSessions];
  return [...resident, ...children.flatMap(record => record.session.getPendingApprovals().map(record.projectFrame))];
}

export function getSdkSlowUpstreams(anchor) {
  return sessionForAnchor(anchor)?.getSlowUpstreams() || [];
}

export function getSdkAgentState(anchor) {
  return sessionForAnchor(anchor)?.getAgentState() || null;
}

// Explicit initialization resets this cwd only. Workspace switches use attach so
// background turns, queued messages and resume IDs survive.
export function initSdkSession(cwd, projectName, options = {}) {
  return registerSdkSession(cwd, projectName, options, parseSdkCodexArgs(options.codexArgs, {}, options.transport));
}

function registerSdkSession(cwd, projectName, options, parsed) {
  if (typeof cwd !== 'string' || !cwd.trim()) throw new TypeError('SDK cwd is required');
  const transport = options.transport ?? 'exec';
  if (!['exec', 'appserver'].includes(transport)) throw new TypeError('Unsupported SDK transport');
  const key = resolve(cwd, parsed.threadOptions.workingDirectory || '.');
  let session = sessions.get(key);
  if (session && session.transportKind !== transport
      && (session.getStreamingState().active || session.getQueueState().items.length)) {
    throw Object.assign(new Error('Cannot change the transport of a busy workspace'), { code: 'SDK_TRANSPORT_BUSY', status: 409 });
  }
  if (!session) {
    const instanceKey = `cxv-${createHash('sha256').update(key).digest('hex').slice(0, 32)}`;
    session = createSdkSession(instanceKey);
    sessions.set(key, session);
  }
  session.initSdkSession(key, projectName, options, parsed);
  activeKey = key;
  return sessionInfo(session);
}

export function attachSdkSession(anchor) {
  const session = sessionForAnchor(anchor);
  if (!session) return null;
  activeKey = session.cwd;
  return sessionInfo(session);
}

export function closeSdkSession(anchor) {
  // Closing always requires an explicit anchor; an empty/stale one cannot kill
  // whichever workspace another browser most recently selected.
  if (anchor == null) return { ok: false, reason: 'not-found' };
  const session = sessionForAnchor(anchor);
  sessions.delete(session.cwd);
  if (activeKey === session.cwd) activeKey = sessions.keys().next().value || null;
  session.stopSession();
  return { ok: true, ...sessionInfo(session), reattachedTo: sessions.get(activeKey)?.instanceKey || null };
}

export async function sendUserMessage(text, anchor, options) {
  return sessionForAnchor(anchor)?.sendUserMessage(text, options);
}

export function retryInterruptedTurn(turnId, anchor) {
  return sessionForAnchor(anchor)?.retryInterruptedTurn(turnId) || { ok: false, reason: 'unavailable' };
}

export function removeSdkQueuedMessage(id, anchor) {
  return sessionForAnchor(anchor)?.removeQueuedMessage(id);
}

export async function sendSdkQueuedNow(id, anchor) {
  return sessionForAnchor(anchor)?.sendQueuedNow(id);
}

export function interruptTurn(anchor) {
  return sessionForAnchor(anchor)?.interruptTurn() || false;
}

export function resolveApproval(id, value, anchor) {
  const resident = sessionForAnchor(anchor);
  if (resident?.resolveApproval(id, value)) return true;
  return ephemeralForAnchor(anchor).some(record => record.session.resolveApproval(id, value));
}

export function cancelAskHosting(id, anchor) {
  const resident = sessionForAnchor(anchor);
  if (resident?.cancelAskHosting(id)) return true;
  return ephemeralForAnchor(anchor).some(record => record.session.cancelAskHosting(id));
}

export function getSessionId(anchor) {
  return sessionForAnchor(anchor)?.getSessionId() || null;
}

export async function fetchMcpStatus(anchor) {
  return sessionForAnchor(anchor)?.fetchMcpStatus() || { ok: false, reason: 'session-inactive' };
}

export async function fetchSkills(anchor) {
  return sessionForAnchor(anchor)?.fetchSkills() || { ok: false, reason: 'session-inactive' };
}

export function getMcpStatusSnapshot(anchor) {
  return sessionForAnchor(anchor)?.getMcpStatusSnapshot() || null;
}

export function getSdkContextUsageSnapshot(anchor) {
  return sessionForAnchor(anchor)?.getContextUsageSnapshot() || null;
}

export function getInitialPrompt(anchor) {
  return sessionForAnchor(anchor)?.getInitialPrompt() || null;
}

// Loading is asynchronous. A new turn, reset or close/reopen invalidates this
// operation even when the replacement has the same cwd-stable instance key.
export async function resumeSdkSession(anchor, loadHistory) {
  const session = sessionForAnchor(anchor);
  if (!session) throw Object.assign(new Error('SDK workspace is not available'), { code: 'SDK_SESSION_NOT_FOUND', status: 404 });
  if (session.getStreamingState().active || session.getQueueState().items.length) {
    throw Object.assign(new Error('SDK workspace is busy'), { code: 'SDK_SESSION_BUSY', status: 409 });
  }
  const revision = session.revision;
  const history = await loadHistory(sessionInfo(session));
  if (sessions.get(session.cwd) !== session || session.revision !== revision) {
    throw Object.assign(new Error('SDK workspace changed while loading history; retry'), { code: 'SDK_RESUME_STALE', status: 409 });
  }
  session.resume(history);
  return sessionInfo(session);
}

export async function stopEphemeralSessions() {
  const records = [...ephemeralSessions];
  for (const record of records) record.abort();
  await Promise.allSettled(records.map(record => record.done));
}

export function stopSession() {
  const previous = [...sessions.values()];
  sessions.clear();
  activeKey = null;
  const cleanup = previous.map(session => session.stopSession());
  for (const record of ephemeralSessions) { record.abort(); cleanup.push(record.done); }
  return Promise.allSettled(cleanup);
}

export function getSdkSpawnConfig() {
  return { available: isSdkAvailable() && !!launchConfig, transport: launchConfig?.options.transport || 'exec' };
}

// A scheduled run reuses the normal native transport, proxy, prompts and archive
// path in an UNREGISTERED session. It cannot replace the resident thread or queue.
export async function spawnEphemeralSession(prompt, { cwd, project, instanceKey: ownerKey,
  transport, timeoutMs = 30 * 60 * 1000, signal, permissionMode = 'default' } = {}) {
  if (!isSdkAvailable()) return { ok: false, reason: 'sdk_unavailable' };
  if (!launchConfig || !cwd || !ownerKey) return { ok: false, reason: 'not_initialized' };
  if (signal?.aborted) return { ok: false, reason: 'aborted' };
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 30 * 60 * 1000) return { ok: false, reason: 'invalid_timeout' };
  const cfg = { options: { ...launchConfig.options }, defaults: cloneJson(launchConfig.defaults) };
  transport ||= cfg.options.transport || 'exec';
  if (!['exec', 'appserver'].includes(transport)) return { ok: false, reason: 'not_initialized' };
  // Native codex exec forces approval_policy=never. Independent tasks use
  // App Server so on-request approvals remain real; the resident is untouched.
  transport = 'appserver';
  const key = `cxv-${randomUUID().replaceAll('-', '')}`;
  const session = createSdkSession(key);
  const projectFrame = frame => ({ ...frame, executionInstanceKey: key, instanceKey: ownerKey, origin: 'scheduled-task' });
  // Only approvals share the host's UI route; child queue/stream/lifecycle state
  // never paints over the resident conversation. The child keeps its own SID.
  const broadcast = frame => {
    if (/^(?:sdk-ask-|perm-hook-)/.test(frame.type) || frame.type === 'ask-auto-cancel') cfg.options.broadcastWs?.(projectFrame(frame));
  };
  const parsed = parseSdkCodexArgs([], cfg.defaults, transport);
  if (permissionMode !== 'inherit') {
    parsed.threadOptions = { ...parsed.threadOptions, approvalPolicy: 'on-request', sandboxMode: 'workspace-write',
      networkAccessEnabled: false, additionalDirectories: [] };
    parsed.codexOptions.config = { ...parsed.codexOptions.config,
      approval_policy: 'on-request', sandbox_mode: 'workspace-write',
      sandbox_workspace_write: { writable_roots: [], network_access: false } };
  }
  let aborted = false, timedOut = false;
  const abort = () => { aborted = true; session.interruptTurn(); };
  const record = { session, ownerKey, projectFrame, abort, done: null };
  let complete;
  record.done = new Promise(resolve => { complete = resolve; });
  ephemeralSessions.add(record);
  const startedAt = Date.now();
  let timer;
  try {
    session.initSdkSession(resolve(cwd), project, { ...cfg.options, transport,
      permissionMode: permissionMode === 'inherit' ? cfg.options.permissionMode : 'default',
      broadcastWs: broadcast, onStreamingStatus: null, onStreamProgress: null,
      onAgentLoopStart: null, onAgentLoopEnd: null }, parsed);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) return { ok: false, reason: 'aborted' };
    timer = setTimeout(() => { timedOut = true; abort(); }, timeoutMs);
    timer.unref?.();
    await session.sendUserMessage(String(prompt || ''));
    const sessionId = session.getSessionId();
    const result = session.getTurnResult();
    return { ok: !aborted && result.completed && !!sessionId,
      ...((aborted || !result.completed || !sessionId) ? { reason: timedOut ? 'timeout' : aborted ? 'aborted' : 'turn-error' } : {}),
      sessionId, durationMs: Date.now() - startedAt };
  } catch (error) {
    return { ok: false, reason: timedOut ? 'timeout' : aborted ? 'aborted' : 'internal',
      sessionId: session.getSessionId(), error: String(error?.message || error) };
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', abort);
    await session.stopSession();
    ephemeralSessions.delete(record); complete();
  }
}

function createSdkSession(instanceKey) {
  let _transport = null;
  let _transportKind = 'exec';
  let _nativeApprovals = null;
  let _nativeAgents = null;
  let _configOverrides = [];
  let _sessionId = null;
  let _model = null;
  let _cwd = null;
  let _projectName = null;
  let _codexPath = null;
  let _codexOptions = {};
  let _threadOptions = {};
  let _modelCatalog = null, _modelCatalogPending = null, _modelCatalogAbort = null;
  let _planUsage = null, _planUsagePending = null, _planUsageAbort = null;
  let _modelSelectionRevision = 0, _reasoningEffort = null;
  let _initialPrompt = null;

  let _accumulatedMessages = [];
  let _queryBusy = false;
  let _sessionGeneration = 0;
  let _activityRevision = 0;
  let _messageQueue = [];
  let _dispatchingQueueItem = null;
  let _dispatchingStarting = false;
  let _suppressDrain = false;
  let _queueEpoch = null;
  let _activeInput = null;
  let _abortController = null;
  let _turnTimestamp = null;
  let _turnStartTime = null;
  let _streamingRequestId = null;
  let _streamingChunkCount = 0;
  let _streamThrottleTimer = null;
  let _pendingAssistantContent = [];
  let _currentItems = new Map();
  let _itemOrder = [];
  let _completedToolIds = new Set();
  let _completedAssistantIds = new Set();
  let _finalEntryEmittedThisTurn = false;
  let _turnStreamError = null;
  let _nativeTurnId = null;
  let _nativeRetrySeen = false;
  const _slowUpstreams = new Map();
  let _lastMcpStatus = null;
  let _lastFailedTurn = null;
  let _retryOf = null;
  let _taskTurnFailed = false;
  let _taskItemId = null;
  let _turnContextUsage = null, _contextSnapshot = null;

  let _onEntry = null;
  let _onStreamingStatus = null;
  let _onStreamProgress = null;
  let _onContextUsage = null;
  let _broadcastWs = null;
  let _onAgentLoopStart = null, _onAgentLoopEnd = null, _agentLoop = null;
  let _sdkProxy = createProxy();
  let _sdkProxyPort = null;
  let _sdkProxyPromise = null;

  const _pendingApprovals = new Map();
  const SDK_PROXY_START_TIMEOUT_MS = 3000;

  function observeSdkModel(value) {
    if (typeof value !== 'string') return null;
    const model = value.trim();
    if (!model || model.length > 256) return null;
    _model = model;
    return model;
  }

  async function waitForSdkProxyStartup(signal) {
    signal.throwIfAborted();
    const pending = _sdkProxyPromise;
    if (!pending) return;
    let timer = null;
    let onAbort;
    const aborted = new Promise((_, reject) => {
      onAbort = () => reject(signal.reason);
      signal.addEventListener('abort', onAbort, { once: true });
    });
    try {
      const started = await Promise.race([
        aborted,
        pending.then(() => true),
        new Promise(resolve => { timer = setTimeout(() => resolve(false), SDK_PROXY_START_TIMEOUT_MS); }),
      ]);
      if (!started && _sdkProxyPromise === pending) {
        // Mark the late result stale; init's identity guard will close it rather
        // than leaving an unused capture server beside a direct SDK client.
        _sdkProxyPromise = null;
        _sdkProxy.stop();
      }
    } finally {
      if (timer) clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
    }
  }

  function getInitialPrompt() {
    return _initialPrompt;
  }

  function modelState() {
    const model = _model || _modelCatalog?.configuredModel || _modelCatalog?.models.find(m => m.isDefault)?.model || null;
    const entry = _modelCatalog?.models.find(m => m.model === model);
    return { instanceKey, model, reasoningEffort: _reasoningEffort
      || _modelCatalog?.configuredReasoningEffort || entry?.defaultReasoningEffort || null,
    busy: _queryBusy || !!_dispatchingQueueItem || _messageQueue.length > 0,
    revision: `${_sessionGeneration}:${_modelSelectionRevision}` };
  }

  async function getPlanUsage() {
    const generation = _sessionGeneration;
    if (!_planUsage || Date.now() - _planUsage.loadedAt > 30000) {
      if (!_planUsagePending) {
        const controller = new AbortController();
        _planUsageAbort = controller;
        const pending = readSdkPlanUsage({
          codexPath: _codexPath || new _Codex(_codexOptions).exec.executablePath,
          cwd: _cwd, codexOptions: _codexOptions, threadOptions: _threadOptions,
          configOverrides: _configOverrides, signal: controller.signal,
        }).then(planUsage => {
          if (generation !== _sessionGeneration) throw Object.assign(new Error('SDK session changed'), { status: 409 });
          _planUsage = { planUsage, loadedAt: Date.now() };
        }).finally(() => {
          if (_planUsagePending === pending) { _planUsagePending = null; _planUsageAbort = null; }
        });
        _planUsagePending = pending;
      }
      await _planUsagePending;
    }
    if (generation !== _sessionGeneration) throw Object.assign(new Error('SDK session changed'), { status: 409 });
    return { instanceKey, planUsage: cloneJson(_planUsage.planUsage) };
  }

  async function listModels() {
    const generation = _sessionGeneration;
    if (!_modelCatalog || Date.now() - _modelCatalog.loadedAt > 60000) {
      if (!_modelCatalogPending) {
        const controller = new AbortController();
        _modelCatalogAbort = controller;
        const pending = readSdkModelCatalog({
          codexPath: _codexPath || new _Codex(_codexOptions).exec.executablePath,
          cwd: _cwd, codexOptions: _codexOptions, threadOptions: _threadOptions,
          configOverrides: _configOverrides, signal: controller.signal,
        }).then(result => {
          if (generation !== _sessionGeneration) throw Object.assign(new Error('SDK session changed'), { status: 409 });
          _modelCatalog = { ...result, loadedAt: Date.now() };
          if (!_accumulatedMessages.length && !_threadOptions.model && result.configuredModel) {
            observeSdkModel(result.configuredModel);
          }
        }).finally(() => {
          if (_modelCatalogPending === pending) { _modelCatalogPending = null; _modelCatalogAbort = null; }
        });
        _modelCatalogPending = pending;
      }
      await _modelCatalogPending;
    }
    if (generation !== _sessionGeneration) throw Object.assign(new Error('SDK session changed'), { status: 409 });
    return { ...modelState(), models: cloneJson(_modelCatalog.models) };
  }

  async function setModel(selection) {
    if (!selection || typeof selection !== 'object' || Array.isArray(selection)
        || typeof selection.model !== 'string' || !selection.model || selection.model.length > 256
        || (selection.reasoningEffort != null && typeof selection.reasoningEffort !== 'string')
        || typeof selection.revision !== 'string') throw Object.assign(new TypeError('Invalid SDK model selection'), { status: 400 });
    if (modelState().busy) throw Object.assign(new Error('Wait for the current reply and queued messages to finish'), { status: 409, code: 'SDK_SESSION_BUSY' });
    const catalog = await listModels();
    // Reads can yield to input, close, resume or another browser's switch.
    if (selection.revision !== modelState().revision) throw Object.assign(new Error('SDK model selection changed; reopen the model list'), { status: 409, code: 'SDK_MODEL_STALE' });
    if (modelState().busy) throw Object.assign(new Error('Wait for the current reply and queued messages to finish'), { status: 409, code: 'SDK_SESSION_BUSY' });
    const entry = catalog.models.find(m => m.model === selection.model);
    if (!entry) throw Object.assign(new Error('Model is not available in the current Codex model list'), { status: 400, code: 'SDK_MODEL_UNAVAILABLE' });
    const supported = value => entry.supportedReasoningEfforts.some(e => e.reasoningEffort === value);
    if (selection.reasoningEffort != null && !supported(selection.reasoningEffort)) {
      throw Object.assign(new Error('Reasoning effort is not supported by this model'), { status: 400, code: 'SDK_EFFORT_UNAVAILABLE' });
    }
    const effort = selection.reasoningEffort ?? (supported(catalog.reasoningEffort) ? catalog.reasoningEffort : entry.defaultReasoningEffort);
    _transport?.setModel(entry.model, effort);
    _threadOptions = { ..._threadOptions, model: entry.model, modelReasoningEffort: effort };
    _model = entry.model; _reasoningEffort = effort;
    _modelSelectionRevision++;
    _activityRevision++;
    _sendStreamingStatus(false);
    return { ...modelState(), models: catalog.models };
  }

  function initSdkSession(cwd, projectName, {
    onEntry,
    onStreamingStatus,
    onStreamProgress,
    onContextUsage,
    onAgentLoopStart, onAgentLoopEnd,
    broadcastWs,
    permissionMode,
    codexPath,
    codexArgs = [],
    transport = 'exec',
  } = {}, parsed = parseSdkCodexArgs(codexArgs, {}, transport)) {
    _sdkProxy.stop();
    _sdkProxy = createProxy();
    _sdkProxyPort = null;
    _sdkProxyPromise = null;
    _cwd = cwd;
    _projectName = projectName;
    _onEntry = onEntry;
    _onStreamingStatus = onStreamingStatus;
    _onStreamProgress = onStreamProgress;
    _onContextUsage = onContextUsage;
    _onAgentLoopStart = onAgentLoopStart;
    _onAgentLoopEnd = onAgentLoopEnd;
    _broadcastWs = broadcastWs;
    _codexPath = codexPath || null;
    _transportKind = transport;

    _codexOptions = parsed.codexOptions;
    _configOverrides = [...(parsed.configOverrides || [])];
    // The pinned exec SDK has no request_user_input callback. Native stdio
    // owns and services those requests without changing exec's existing guard.
    if (_transportKind === 'exec') _codexOptions.config = {
      ...(_codexOptions.config || {}),
      features: {
        ...(_codexOptions.config?.features || {}),
        default_mode_request_user_input: false,
      },
    };
    _threadOptions = {
      skipGitRepoCheck: true,
      ...parsed.threadOptions,
      workingDirectory: cwd,
    };
    if (permissionMode === 'bypassPermissions') {
      _threadOptions.approvalPolicy = 'never';
      _threadOptions.sandboxMode = 'danger-full-access';
    }
    _initialPrompt = parsed.initialPrompt || null;

    _resetFullState({ keepConfig: true });
    _model = observeSdkModel(_threadOptions.model)
      || observeSdkModel(readCodexGlobalConfig().model)
      || null;
    _reasoningEffort = _threadOptions.modelReasoningEffort || _codexOptions.config?.model_reasoning_effort || null;
    _sessionId = parsed.resumeThreadId || null;

    // 启动本地代理以拦截 SDK 模式下的真实 API 调用
    if (_sdkProxyPort === null && !_sdkProxyPromise) {
      const proxy = _sdkProxy;
      const generation = _sessionGeneration;
      const proxyPromise = proxy.start({
        // Raw transport remains inspectable in Network; SDK events own chat.
        captureContext: { cwd: _cwd, instanceKey, sdkTransport: true },
        resolveNativeRole: async threadId => {
          const native = _transport;
          if (_transportKind !== 'appserver' || !native || !await native.ownsThread(threadId)
              || native !== _transport || generation !== _sessionGeneration) return null;
          return threadId === native.threadId ? 'main' : 'subagent';
        },
        onSlowUpstream: info => {
          if (generation !== _sessionGeneration) return;
          const resolved = info.type === 'resolved';
          const frame = { type: resolved ? 'sdk-slow-upstream-resolved' : 'sdk-slow-upstream',
            requestId: info.requestId, cwd: _cwd, instanceKey, ts: Date.now(),
            ...(!resolved ? { waitingMs: info.waitingMs, model: info.model,
              startedAt: Date.now() - Math.max(0, Number(info.waitingMs) || 0) } : {}),
          };
          if (resolved) _slowUpstreams.delete(frame.requestId);
          else _slowUpstreams.set(frame.requestId, frame);
          try { _broadcastWs?.(frame); } catch {}
        },
        onResponseModel: (model, source) => {
          if (generation !== _sessionGeneration) return;
          if (_transportKind === 'appserver' && source?.proxyRole !== 'main') return;
          const root = _sessionId || _transport?.threadId;
          if (root && source?.threadId && source.threadId !== root) return;
          observeSdkModel(model);
        },
      }).then(port => {
        if (_sdkProxyPromise !== proxyPromise) {
          proxy.stop();
          return null;
        }
        _sdkProxyPort = port;
        return port;
      }).catch(err => {
        if (generation === _sessionGeneration) console.warn('[SDK] Failed to start proxy:', err.message);
      }).finally(() => {
        if (_sdkProxyPromise === proxyPromise) _sdkProxyPromise = null;
      });
      _sdkProxyPromise = proxyPromise;
    }
  }

  async function sendUserMessage(text, { onAccepted, requestId } = {}) {
    if (!_Codex) throw new Error(`Codex SDK not available${_sdkImportError ? `: ${_sdkImportError.message}` : ''}`);
    if (!text || !String(text).trim()) return;
    _activityRevision++;

    if (_queryBusy) {
      if (_messageQueue.length + (_dispatchingQueueItem ? 1 : 0) >= 50) {
        throw Object.assign(new Error('SDK message queue is full'), { code: 'SDK_QUEUE_FULL', status: 429 });
      }
      const item = { id: randomUUID(), text: String(text), ts: Date.now() };
      if (requestId) item.requestId = requestId;
      _messageQueue.push(item);
      _suppressDrain = false;
      onAccepted?.({ queued: true, id: item.id });
      _broadcastQueueState();
      return { queued: true, id: item.id };
    }

    _suppressDrain = false;
    onAccepted?.({ queued: false });
    return _runTurns(String(text), requestId);
  }

  function retryInterruptedTurn(turnId) {
    if (_transportKind !== 'appserver') return { ok: false, reason: 'unavailable' };
    if (_queryBusy || _dispatchingQueueItem || _messageQueue.length) return { ok: false, reason: 'busy' };
    const failed = _lastFailedTurn;
    if (!failed) return { ok: false, reason: 'nothing-to-retry' };
    if (typeof turnId !== 'string' || turnId !== failed.turnId) return { ok: false, reason: 'stale' };
    if (!failed.retryable) return { ok: false, reason: 'not-retryable' };
    if (!_sessionId || failed.sessionId !== _sessionId || failed.generation !== _sessionGeneration) {
      return { ok: false, reason: 'stale' };
    }
    _lastFailedTurn = null;
    _activityRevision++;
    _suppressDrain = false;
    // Claim busy synchronously before returning: duplicate clicks cannot enqueue
    // another continue instruction, and a retry never replays the original input.
    void _runTurns(RETRY_CONTINUE_PROMPT, null, turnId).catch(error => console.warn('[SDK] Retry failed:', error.message));
    return { ok: true };
  }

  function _broadcastRetryState(phase, extra = {}) {
    try { _broadcastWs?.({ type: 'sdk-retry-state', phase, turnId: _nativeTurnId, retryOf: _retryOf,
      cwd: _cwd, sessionId: _sessionId, instanceKey, ts: Date.now(), ...extra }); }
    catch (error) { console.warn('[SDK] Retry status callback failed:', error.message); }
  }

  async function _runTurns(text = null, requestId = null, retryOf = null) {
    const generation = _sessionGeneration;
    _queryBusy = true;
    try {
      if (text !== null) await _executeTurn(text, generation, null, requestId, retryOf);
      while (generation === _sessionGeneration && !_suppressDrain && (_dispatchingQueueItem || _messageQueue.length)) {
        if (!_dispatchingQueueItem) _dispatchingQueueItem = _messageQueue.shift();
        const next = _dispatchingQueueItem;
        _broadcastQueueState();
        if (_suppressDrain || _dispatchingQueueItem !== next) continue;
        await _executeTurn(next.text, generation, next);
      }
    } finally {
      if (generation === _sessionGeneration) _queryBusy = false;
    }
  }

  function getQueueState() {
    return {
      type: 'queue-state', cwd: _cwd, instanceKey, sessionId: _sessionId, paused: _suppressDrain,
      epoch: _queueEpoch, activeInput: _activeInput ? { ..._activeInput } : null,
      items: [
        ...(_dispatchingQueueItem ? [{ ..._dispatchingQueueItem, status: 'dispatching' }] : []),
        ..._messageQueue.map(item => ({ ...item, status: 'queued' })),
      ],
    };
  }

  function queuedMessageIndex(id) {
    if (typeof id !== 'string' || !id || id.length > 128) {
      throw Object.assign(new Error('Invalid queued message id'), { code: 'SDK_QUEUE_INVALID_ID', status: 400 });
    }
    if (_dispatchingQueueItem?.id === id) {
      throw Object.assign(new Error('Message is already dispatching'), { code: 'SDK_QUEUE_DISPATCHING', status: 409 });
    }
    const index = _messageQueue.findIndex(item => item.id === id);
    if (index < 0) throw Object.assign(new Error('Queued message was not found'), { code: 'SDK_QUEUE_NOT_FOUND', status: 404 });
    return index;
  }

  function removeQueuedMessage(id) {
    const index = queuedMessageIndex(id);
    _messageQueue.splice(index, 1);
    _activityRevision++;
    _broadcastQueueState();
    return true;
  }

  function sendQueuedNow(id) {
    const index = queuedMessageIndex(id);
    if (_dispatchingQueueItem) {
      throw Object.assign(new Error('Another queued message is dispatching'), { code: 'SDK_QUEUE_DISPATCHING', status: 409 });
    }
    _activityRevision++;
    [_dispatchingQueueItem] = _messageQueue.splice(index, 1);
    _dispatchingStarting = false;
    _suppressDrain = false;
    _broadcastQueueState();
    if (_queryBusy) {
      if (_transportKind === 'appserver') _nativeApprovals?.clearThread(_transport?.threadId);
      _abortController?.abort();
      return { dispatching: true };
    }
    return _runTurns();
  }

  function _broadcastQueueState() {
    try { _broadcastWs?.(getQueueState()); }
    catch (error) { console.warn('[SDK] Queue status callback failed:', error.message); }
  }

  // Emit boundaries only for an accepted executor stream. Capture the end
  // callback and scope so a reset cannot report an old turn through new wiring.
  function _startAgentLoop() {
    const rec = { cwd: _cwd, instanceKey, turnId: _streamingRequestId, turnStartedAt: _turnStartTime,
      onEnd: _onAgentLoopEnd };
    _agentLoop = rec;
    try { _onAgentLoopStart?.({ cwd: rec.cwd, instanceKey, turnId: rec.turnId,
      turnStartedAt: rec.turnStartedAt, sessionId: _sessionId || _transport?.threadId || null, ts: Date.now() }); }
    catch (error) { console.warn('[SDK] Loop start callback failed:', error.message); }
  }

  function _finishAgentLoop(reason) {
    const rec = _agentLoop;
    if (!rec) return;
    _agentLoop = null; // before calling the host: re-entry cannot end it twice
    try { rec.onEnd?.({ cwd: rec.cwd, instanceKey, turnId: rec.turnId,
      turnStartedAt: rec.turnStartedAt, sessionId: _sessionId || _transport?.threadId || null,
      ts: Date.now(), reason }); }
    catch (error) { console.warn('[SDK] Loop end callback failed:', error.message); }
  }

  async function _executeTurn(text, generation, queuedItem = null, requestId = null, retryOf = null) {
    if (queuedItem) _dispatchingStarting = true;
    _resetTurnState();
    _lastFailedTurn = null;
    _retryOf = retryOf;
    _turnTimestamp = new Date().toISOString();
    _turnStartTime = Date.now();
    _streamingRequestId = `sdk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    _accumulatedMessages.push({ role: 'user', content: text, _sdkTimestamp: _turnTimestamp,
      ...(retryOf ? { _sdkRetryOf: retryOf } : {}) });

    const controller = new AbortController();
    _abortController = controller;
    _activeInput = { id: queuedItem?.id || _streamingRequestId, text,
      timestamp: _turnTimestamp, requestId: queuedItem?.requestId || requestId || null,
      ...(retryOf ? { retryOf } : {}) };
    _broadcastQueueState();
    _broadcastTaskState();
    _sendStreamingStatus(true);
    let endReason = 'session-ended';
    try {
      if (!_transport) {
        // Proxy startup is async, but the SDK client captures its environment only
        // once. Wait for that startup before constructing the singleton client so
        // an immediate initial prompt cannot permanently bypass capture/model
        // observation. Failure resolves through the startup catch and falls back.
        await waitForSdkProxyStartup(controller.signal);
        if (generation !== _sessionGeneration) return;
        controller.signal.throwIfAborted();
        const options = { Codex: _Codex, cwd: _cwd, instanceKey,
          codexPath: _codexPath, codexOptions: _codexOptions, threadOptions: _threadOptions, proxyPort: _sdkProxyPort };
        if (_transportKind === 'appserver') {
          const native = createSdkAppServerTransport({ ...options,
            configOverrides: _configOverrides,
            codexPath: _codexPath || new _Codex().exec?.executablePath,
            onSessionReady: () => {
              if (generation !== _sessionGeneration) return;
              _nativeApprovals?.close();
              _nativeAgents?.close();
              _nativeAgents = createSdkAppServerAgents({ scope: { cwd: _cwd, instanceKey }, rootThreadId: native.threadId,
                readThread: id => native.readThread(id), ownsThread: id => native.ownsThread(id),
                broadcast: _broadcastWs || (() => {}) });
              _nativeApprovals = createSdkAppServerApprovals({
                scope: { cwd: _cwd, instanceKey, sessionId: native.threadId },
                broadcast: _broadcastWs || (() => {}), ownsThread: id => native.ownsThread(id),
                onPending: (frame, message) => {
                  if (generation !== _sessionGeneration || message.type !== 'sdk-ask-pending' || frame.params.threadId !== native.threadId) return;
                  const item = { id: message.itemId, type: 'codex_tool', toolName: 'request_user_input',
                    input: { questions: message.questions, codexRequestUserInput: true, cxvSdkAskId: message.id } };
                  _upsertItem(item);
                  // The pending tool belongs in the transcript too, including
                  // when a browser first connects while Codex awaits an answer.
                  _onEntry?.(sdkToJSONLEntry(null, [...cloneJson(_accumulatedMessages),
                    { role: 'assistant', _sdkTimestamp: _turnTimestamp,
                      content: [..._stripInternalFields(_pendingAssistantContent), sdkItemToToolUseBlock(item)] }],
                  _model, _projectName, { timestamp: _turnTimestamp, requestId: _streamingRequestId,
                    threadId: native.threadId, cwd: _cwd, inProgress: true,
                    metadata: { source: 'codex-sdk', instance_key: instanceKey, transport: _transportKind } }));
                  _scheduleStreamProgress();
                },
                onResolved: (frame, result, message) => {
                  if (generation !== _sessionGeneration || message?.type !== 'sdk-ask-pending' || frame.params.threadId !== native.threadId) return;
                  const item = _currentItems.get(message.itemId);
                  if (!item || item.input?.cxvSdkAskId !== message.id) return;
                  const completed = { ...item, output: result, status: 'completed' };
                  _upsertItem(completed); _completeToolItem(completed); _scheduleStreamProgress();
                },
              });
            },
            onServerRequest: (frame, reply) => {
              if (generation !== _sessionGeneration || !_nativeApprovals) {
                reply(null, { code: -32000, message: 'Workspace is not available' }); return;
              }
              void _nativeApprovals.handle(frame, reply).catch(() => reply(null, { code: -32000, message: 'Approval bridge failed' }));
            },
            onNotification: frame => {
              if (generation !== _sessionGeneration) return;
              void _nativeAgents?.handle(frame);
              if (frame.method === 'serverRequest/resolved') _nativeApprovals?.resolvedNative(frame.params?.requestId);
              if (frame.method === 'turn/completed') _nativeApprovals?.clearTurn(frame.params?.threadId, frame.params?.turn?.id);
            },
            onDisconnected: () => {
              if (generation !== _sessionGeneration) return;
              _nativeApprovals?.close(); _nativeAgents?.close();
            },
          });
          _transport = native;
        } else _transport = createSdkExecTransport(options);
      }
      controller.signal.throwIfAborted();
      const streamed = await _transport.runStreamed(text, { signal: controller.signal, threadId: _sessionId });
      if (generation !== _sessionGeneration) return;
      _startAgentLoop();
      for await (const event of streamed.events) {
        if (generation !== _sessionGeneration) break;
        if (queuedItem && _dispatchingQueueItem === queuedItem) {
          _dispatchingQueueItem = null;
          _dispatchingStarting = false;
          _broadcastQueueState();
        }
        _processEvent(event);
      }
      if (generation === _sessionGeneration && !_finalEntryEmittedThisTurn) {
        // An exhausted iterator with no terminal is an ended session, even when
        // the supervised child exited zero. Park other inputs; never guess that
        // this accepted prompt succeeded or automatically replay it.
        if (!controller.signal.aborted) _suppressDrain = true;
        _emitErrorEntry(_turnStreamError || (controller.signal.aborted ? 'Turn interrupted'
          : 'Agent SDK session ended before the turn completed'));
      }
    } catch (err) {
      if (generation !== _sessionGeneration) return;
      if (!_finalEntryEmittedThisTurn && !controller.signal.aborted) _suppressDrain = true;
      endReason = controller.signal.aborted ? 'interrupted' : 'error';
      if (err?.name === 'AbortError') {
        _emitErrorEntry('Turn interrupted');
      } else {
        console.error('[SDK] runStreamed error:', err.message);
        _emitErrorEntry(_turnStreamError || err.message || String(err));
      }
    } finally {
      if (generation === _sessionGeneration) {
        _finishAgentLoop(controller.signal.aborted ? 'interrupted' : endReason);
        if (queuedItem && _dispatchingQueueItem === queuedItem) {
          _dispatchingQueueItem = null;
          _dispatchingStarting = false;
          _broadcastQueueState();
        }
        _flushStreamProgress();
        _clearStreamThrottle();
        if ((_retryOf || _nativeRetrySeen) && controller.signal.aborted) _broadcastRetryState('rejected', { reason: 'interrupted' });
        _abortController = null;
        _activeInput = null;
        _broadcastQueueState();
        _sendStreamingStatus(false);
      }
    }
  }

  function _processEvent(event) {
    if (!event || typeof event !== 'object') return;
    // Item-level model fields may belong to a tool/subagent. Only root lifecycle
    // metadata is allowed to update the synthetic MainAgent identity.
    observeSdkModel(event.model || event.thread?.model);

    switch (event.type) {
      case 'thread.started':
        _sessionId = event.thread_id || _sessionId;
        _broadcastTaskState();
        break;

      case 'turn.started':
        if (_transportKind === 'appserver') _nativeTurnId = event.turn_id || null;
        if (_retryOf) _broadcastRetryState('recovering');
        _sendStreamingStatus(true);
        break;

      case 'item.started':
      case 'item.updated':
        _upsertItem(event.item);
        _scheduleStreamProgress();
        break;

      case 'item.completed':
        _handleCompletedItem(_upsertItem(event.item));
        _scheduleStreamProgress();
        break;

      case 'turn.completed':
        try {
          _turnContextUsage = _transportKind === 'exec' ? event.context_usage || null : null;
          _emitCompletedEntry(event.usage, event.context_window);
        } finally { _finishAgentLoop('success'); }
        break;

      case 'context.updated':
        if (_transportKind !== 'exec' || event.thread_id !== _sessionId) break;
        _turnContextUsage = event.usage;
        _contextSnapshot = { ...buildContextWindowEvent(event.usage, event.context_window),
          source: 'codex-rollout', cwd: _cwd, instanceKey, sessionId: _sessionId,
          turnId: event.turn_id, turn_timestamp: _turnTimestamp, timestamp: event.timestamp };
        try { _onContextUsage?.(cloneJson(_contextSnapshot)); }
        catch (error) { console.warn('[SDK] Context callback failed:', error.message); }
        break;

      case 'turn.failed':
        try { _emitErrorEntry(event.error?.message || 'Codex turn failed', event); }
        finally { _finishAgentLoop(_abortController?.signal.aborted || event.status === 'interrupted' ? 'interrupted'
          : event.recovery === 'control-unresponsive' ? 'turn-stuck' : 'error'); }
        break;

      case 'error':
        // Codex 0.169 also uses error frames for retry notices. A later
        // turn.completed must win; persist failures only at terminal settlement.
        _turnStreamError = event.message || 'Codex SDK error';
        if (_transportKind === 'appserver' && event.willRetry === true
          && event.turn_id === _nativeTurnId && event.thread_id === _sessionId) {
          _nativeRetrySeen = true;
          _broadcastRetryState('retrying', { error: String(event.error?.message || event.message || '') });
        }
        break;
    }
  }

  function _upsertItem(item) {
    if (!item || typeof item !== 'object') return;
    const id = item.id || `${item.type || 'item'}_${_itemOrder.length}`;
    // Native exec can repeat startup warnings under different item IDs.
    // Keep the first diagnostic in both the live stream and durable transcript.
    if (item.type === 'error') {
      for (const previous of _currentItems.values()) {
        if (previous.type === 'error' && previous.id !== id && previous.message === item.message) return;
      }
    }
    if (!_currentItems.has(id)) _itemOrder.push(id);
    _currentItems.set(id, { ...item, id });
    if (item.type === 'todo_list' || item.type === 'todoList') {
      _taskItemId = id;
      _broadcastTaskState();
    }
    return _currentItems.get(id);
  }

  // Reuse the SDK's authoritative item table. todo_list is a replacement list,
  // not a delta; its boolean completion field cannot identify a running step.
  function getTaskState() {
    const item = _currentItems.get(_taskItemId);
    const tasks = [];
    for (const [index, todo] of (Array.isArray(item?.items) ? item.items : []).entries()) {
      if (!todo || typeof todo.text !== 'string' || typeof todo.completed !== 'boolean') continue;
      const nativeStatus = _transportKind === 'appserver' && item._appServerPlan
        && ['pending', 'in_progress'].includes(todo.status) ? todo.status : 'pending';
      tasks.push({ taskId: `${item.id}:${index}`, subject: todo.text,
        status: todo.completed ? 'completed' : (_taskTurnFailed ? 'failed' : nativeStatus) });
    }
    return { type: 'sdk-task-snapshot', sessionId: _sessionId,
      cwd: _cwd, instanceKey, tasks };
  }

  function _broadcastTaskState() {
    try { _broadcastWs?.(getTaskState()); }
    catch (error) { console.warn('[SDK] Task status callback failed:', error.message); }
  }

  function _handleCompletedItem(item) {
    if (!item || typeof item !== 'object') return;
    if (isSdkToolItem(item)) {
      _completeToolItem(item);
      return;
    }

    const block = sdkItemToAssistantBlock(item);
    if (!block) return;

    // Replace older block for the same item if an item.completed arrives after
    // repeated item.updated events. Only completed items enter durable history.
    const id = item.id || '';
    _completedAssistantIds.add(id);
    _pendingAssistantContent = _pendingAssistantContent.filter(b => b._sdkItemId !== id);
    _pendingAssistantContent.push({ ...block, _sdkItemId: id });
  }

  function _completeToolItem(item) {
    const id = item.id || `${item.type || 'tool'}_${Date.now()}`;
    if (_completedToolIds.has(id)) return;
    _completedToolIds.add(id);

    // Native contextCompaction has only an id; do not infer token counts from usage.
    if (_transportKind === 'appserver' && item.type === 'codex_tool'
        && item.toolName === 'contextCompaction' && item.input?.type === 'contextCompaction') {
      try { _broadcastWs?.({ type: 'sdk-compact', sessionId: _sessionId,
        cwd: _cwd, instanceKey, turnId: _nativeTurnId }); }
      catch (error) { console.warn('[SDK] Compact notice callback failed:', error.message); }
    }

    const toolUse = sdkItemToToolUseBlock({ ...item, id });
    if (!toolUse) return;

    _pendingAssistantContent.push(toolUse);
    _flushPendingAssistantContent();

    const output = sdkToolOutput(item);
    _accumulatedMessages.push({
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: sdkToolResultContent(output),
        is_error: item.status === 'failed' || !!item.error,
      }],
    });

    _emitToolEntry(item, toolUse, output);
  }

  function _flushPendingAssistantContent() {
    const content = _stripInternalFields(_pendingAssistantContent);
    if (content.length > 0) {
      _accumulatedMessages.push({ role: 'assistant', content, _sdkTimestamp: _turnTimestamp });
    }
    _pendingAssistantContent = [];
  }

  function _emitCompletedEntry(usage, contextWindow) {
    if (_finalEntryEmittedThisTurn) return;
    const finalContent = _stripInternalFields(_pendingAssistantContent);
    const messagesSnapshot = cloneJson(_accumulatedMessages);

    const assistantMsg = {
      message: {
        id: _streamingRequestId,
        type: 'message',
        role: 'assistant',
        model: _model,
        content: finalContent,
        usage,
        ...(_transportKind === 'exec' ? { context_usage: _turnContextUsage } : {}),
        ...(Number.isSafeInteger(contextWindow) && contextWindow > 0 ? { context_window: contextWindow } : {}),
      },
    };

    const entry = sdkToJSONLEntry(assistantMsg, messagesSnapshot, _model, _projectName, {
      timestamp: _turnTimestamp,
      requestId: _streamingRequestId,
      threadId: _sessionId || _transport?.threadId || null,
      cwd: _cwd,
      tools: DEFAULT_CODEX_TOOLS,
      duration: _turnStartTime ? Date.now() - _turnStartTime : 0,
      metadata: { source: 'codex-sdk', instance_key: instanceKey, transport: _transportKind },
    });

    if (_onEntry) _onEntry(entry);
    if (finalContent.length > 0) {
      _accumulatedMessages.push({ role: 'assistant', content: finalContent, _sdkTimestamp: _turnTimestamp });
    }
    _pendingAssistantContent = [];
    _finalEntryEmittedThisTurn = true;
    if (_retryOf || _nativeRetrySeen) _broadcastRetryState('recovered');
  }

  function _emitErrorEntry(message, failure = null) {
    if (_finalEntryEmittedThisTurn) return;
    _taskTurnFailed = true;
    _broadcastTaskState();
    // The upstream wire path already persists assistant frames before a death.
    // Our synthesized request must retain them too, including partial text and
    // thinking received before the result/transport was lost.
    for (const id of _itemOrder) {
      const item = _currentItems.get(id);
      if (_completedAssistantIds.has(id) || !['agent_message', 'agentMessage', 'reasoning'].includes(item?.type)) continue;
      const block = sdkItemToAssistantBlock(item);
      if (block) _pendingAssistantContent.push({ ...block, _sdkItemId: id });
    }
    _flushPendingAssistantContent();
    // Failures belong to this resident session, even before a thread was created.
    // Retry notices and intentional Stop actions must not become failure alerts.
    const ownedNativeFailure = _transportKind === 'appserver' && _nativeTurnId
      && failure?.turn_id === _nativeTurnId && failure?.thread_id === _sessionId;
    let failureMeta = {};
    if (ownedNativeFailure) {
      const info = failure.error?.codexErrorInfo;
      const network = ['httpConnectionFailed', 'responseStreamConnectionFailed',
        'responseStreamDisconnected', 'responseTooManyFailedAttempts'].find(key => info && typeof info === 'object'
          && Object.hasOwn(info, key) && info[key] && typeof info[key] === 'object');
      const status = network ? info[network].httpStatusCode : undefined;
      const validStatus = status == null || (Number.isInteger(status) && status >= 100 && status <= 599);
      failureMeta = { turnId: _nativeTurnId, codexErrorInfo: cloneJson(info ?? null),
        apiStatus: validStatus && Number.isInteger(status) ? status : null,
        ...(failure.recovery === 'control-unresponsive' ? { code: 'turn-stuck' } : {}),
        retryable: failure.status === 'failed' && (failure.recovery === 'control-unresponsive'
          || (_nativeRetrySeen && !!network && validStatus && (status == null || RETRYABLE_STATUS.has(status)))) };
      _lastFailedTurn = { ...failureMeta, sessionId: _sessionId, generation: _sessionGeneration };
    }
    if (!_abortController?.signal.aborted && !(ownedNativeFailure && failure.status === 'interrupted')) {
      try { _broadcastWs?.({ type: 'sdk-error', message: String(message || ''),
        cwd: _cwd, sessionId: _sessionId || _transport?.threadId || null, instanceKey, ...failureMeta }); }
      catch (error) { console.warn('[SDK] Error status callback failed:', error.message); }
    }
    if (!_onEntry) { _finalEntryEmittedThisTurn = true; return; }
    const content = message ? [{ type: 'text', text: `Error: ${message}` }] : [];
    const assistantMsg = {
      message: {
        id: _streamingRequestId || `sdk_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        model: _model,
        content,
        error: { ...(ownedNativeFailure ? cloneJson(failure.error) : {}), message },
        usage: null,
      },
    };
    const entry = sdkToJSONLEntry(assistantMsg, cloneJson(_accumulatedMessages), _model, _projectName, {
      timestamp: _turnTimestamp || new Date().toISOString(),
      threadId: _sessionId || _transport?.threadId || null,
      cwd: _cwd,
      status: 500,
      statusText: 'Error',
      stopReason: 'error',
      duration: _turnStartTime ? Date.now() - _turnStartTime : 0,
      metadata: { source: 'codex-sdk', instance_key: instanceKey, transport: _transportKind },
    });
    _onEntry(entry);
    // The next synthetic request must retain the same prefix the transcript
    // already rendered, including this terminal error assistant message.
    if (content.length) _accumulatedMessages.push({ role: 'assistant', content,
      _sdkTimestamp: _turnTimestamp, _sdkFeedback: true });
    _finalEntryEmittedThisTurn = true;
  }

  function _emitToolEntry(item, toolUse, output) {
    if (!_onEntry) return;
    const name = sdkToolName(item);
    _onEntry({
      timestamp: new Date().toISOString(),
      project: _projectName || 'sdk',
      url: `codex://sdk/tool/${encodeURIComponent(name)}`,
      method: 'TOOL',
      headers: {},
      body: {
        tool_name: name,
        tool_input: toolUse.input || {},
        _callId: toolUse.id,
        _threadId: _sessionId || _transport?.threadId || null,
        _cwd,
        _itemType: item.type,
        status: item.status,
        raw_item: cloneJson(item),
      },
      response: {
        status: item.status === 'failed' || item.error ? 500 : 200,
        statusText: item.status === 'failed' || item.error ? 'Error' : 'OK',
        headers: {},
        body: {
          output,
          status: item.status,
        },
      },
      duration: 0,
      isStream: false,
      mainAgent: false,
      subAgent: false,
      _sdkSource: true,
      _instanceKey: instanceKey,
    });
  }

  function _scheduleStreamProgress() {
    if (_streamThrottleTimer) return;
    _streamThrottleTimer = setTimeout(() => {
      _streamThrottleTimer = null;
      _flushStreamProgress();
    }, 80);
  }

  function _flushStreamProgress() {
    if (!_onStreamProgress || !_turnTimestamp) return;
    _streamingChunkCount += 1;
    const progress = _buildStreamProgress();
    if (progress) _onStreamProgress(progress);
  }

  function _buildStreamProgress() {
    if (!_turnTimestamp) return null;
    const content = _streamContentFromItems();
    if (!content.length) return null;
    // Reuse the authoritative current-turn item table. Only shell text enters
    // this transient preview; raw results remain intact on TOOL/final entries.
    // Bound output across the whole snapshot so a noisy command cannot make
    // every 80ms progress frame resend an unbounded transcript.
    let remaining = 128 * 1024;
    const toolProgress = [];
    for (let index = _itemOrder.length - 1; index >= 0; index--) {
      const id = _itemOrder[index], item = _currentItems.get(id);
      if (!['command_execution', 'commandExecution'].includes(item?.type)) continue;
      const complete = _completedToolIds.has(id);
      const failed = item.status === 'failed' || !!item.error
        || (complete && Number.isInteger(item.exit_code ?? item.exitCode) && (item.exit_code ?? item.exitCode) !== 0);
      const full = item.aggregated_output ?? item.aggregatedOutput ?? '';
      const text = typeof full === 'string' ? full : '';
      const limit = Math.min(16 * 1024, remaining);
      const output = limit ? text.slice(-limit) : '';
      remaining -= output.length;
      toolProgress.push({ id, status: complete ? (failed ? 'failed' : 'completed') : 'in_progress',
        output, outputTruncated: output.length < text.length,
        ...(complete && Number.isInteger(item.exit_code ?? item.exitCode) ? { exitCode: item.exit_code ?? item.exitCode } : {}) });
    }
    return {
      timestamp: _turnTimestamp,
      url: `codex://sdk/${encodeURIComponent(_sessionId || _transport?.threadId || _model || 'thread')}`,
      content,
      toolProgress: toolProgress.reverse(),
      requestId: _streamingRequestId,
      turnStartedAt: _turnStartTime,
      sessionId: _sessionId || _transport?.threadId || null,
      sequence: _streamingChunkCount,
      model: _model,
      cwd: _cwd,
      instanceKey,
    };
  }

  function getStreamProgress() {
    return _queryBusy && !_finalEntryEmittedThisTurn ? _buildStreamProgress() : null;
  }

  function _streamContentFromItems() {
    const blocks = [];
    for (const id of _itemOrder) {
      const item = _currentItems.get(id);
      const block = sdkItemToAssistantBlock(item);
      if (!block) continue;
      if (block.type === 'text' && !block.text?.trim()) continue;
      if (block.type === 'thinking' && !block.thinking?.trim()) continue;
      blocks.push(block);
    }
    return _stripInternalFields(blocks);
  }

  function getStreamingState(active = _queryBusy) {
    return {
      ...buildStreamingStatus(active, {
        model: _model,
        startTime: _turnStartTime,
        chunksReceived: _streamingChunkCount,
      }),
      cwd: _cwd,
      instanceKey,
      model: _model,
      reasoningEffort: modelState().reasoningEffort,
    };
  }

  function _sendStreamingStatus(active) {
    _onStreamingStatus?.(getStreamingState(active));
  }

  function _clearStreamThrottle() {
    if (_streamThrottleTimer) {
      clearTimeout(_streamThrottleTimer);
      _streamThrottleTimer = null;
    }
  }

  function interruptTurn({ discardQueue = false } = {}) {
    _activityRevision++;
    _suppressDrain = true;
    if (discardQueue) {
      _messageQueue = [];
      _dispatchingQueueItem = null;
      _dispatchingStarting = false;
    } else if (_dispatchingQueueItem && !_dispatchingStarting) {
      _messageQueue.unshift(_dispatchingQueueItem);
      _dispatchingQueueItem = null;
    }
    _broadcastQueueState();
    if (_transportKind === 'appserver') _nativeApprovals?.clearThread(_transport?.threadId);
    if (_abortController) {
      try { _abortController.abort(); } catch {}
      return true;
    }
    return false;
  }

  async function fetchMcpStatus() {
    if (_transportKind !== 'appserver') return { ok: false, reason: 'unsupported' };
    const owned = _transport, generation = _sessionGeneration;
    if (!owned) return { ok: false, reason: 'session-inactive' };
    try {
      const servers = await owned.getMcpServerStatus();
      if (generation !== _sessionGeneration || _transport !== owned || servers === null) return { ok: false, reason: 'session-inactive' };
      _lastMcpStatus = { type: 'sdk-mcp-status', sessionId: _sessionId, ts: Date.now(), trigger: 'request',
        cwd: _cwd, instanceKey, servers };
      try { _broadcastWs?.(cloneJson(_lastMcpStatus)); }
      catch (error) { console.warn('[SDK] MCP status broadcast failed:', error.message); }
      return { ok: true, snapshot: cloneJson(_lastMcpStatus) };
    } catch (error) {
      console.warn('[SDK] MCP status read failed:', error.message);
      return { ok: false, reason: 'control-failed' };
    }
  }

  async function fetchSkills() {
    if (_transportKind !== 'appserver') return { ok: false, reason: 'unsupported' };
    const owned = _transport, generation = _sessionGeneration;
    if (!owned) return { ok: false, reason: 'session-inactive' };
    try {
      const skills = await owned.getSkills();
      if (generation !== _sessionGeneration || _transport !== owned || skills === null) return { ok: false, reason: 'session-inactive' };
      return { ok: true, instanceKey, skills };
    } catch {
      return { ok: false, reason: 'control-failed' };
    }
  }

  function resolveApproval(id, value) {
    if (_nativeApprovals?.resolve(id, value)) return true;
    const pending = _pendingApprovals.get(id);
    if (pending) {
      pending.resolve(value);
      return true;
    }
    return false;
  }

  function stopSession() {
    interruptTurn({ discardQueue: true });
    _sdkProxy.stop();
    _sdkProxyPromise = null;
    _sdkProxyPort = null;
    return _resetFullState({ keepConfig: false });
  }

  function getSessionId() {
    return _sessionId;
  }

  function resume(history) {
    if (_queryBusy || _messageQueue.length || _dispatchingQueueItem) throw Object.assign(new Error('SDK workspace is busy'), { code: 'SDK_SESSION_BUSY', status: 409 });
    if (!isSdkResumeThreadId(history?.threadId)
        || !Array.isArray(history.messages) || !history.messages.length) {
      throw Object.assign(new Error('Invalid SDK resume history'), { code: 'SDK_RESUME_UNAVAILABLE', status: 422 });
    }
    const messages = cloneJson(history.messages);
    // Reuse initialization to renew proxy/generation ownership and preserve
    // this workspace's model, permissions, executable and callbacks.
    initSdkSession(_cwd, _projectName, {
      onEntry: _onEntry, onStreamingStatus: _onStreamingStatus,
      onStreamProgress: _onStreamProgress, onContextUsage: _onContextUsage, onAgentLoopStart: _onAgentLoopStart, onAgentLoopEnd: _onAgentLoopEnd, broadcastWs: _broadcastWs, codexPath: _codexPath,
      transport: _transportKind,
    }, { codexOptions: _codexOptions, threadOptions: _threadOptions, configOverrides: _configOverrides, resumeThreadId: history.threadId });
    _accumulatedMessages = messages;
  }

  function _resetTurnState() {
    _turnTimestamp = null;
    _turnStartTime = null;
    _streamingRequestId = null;
    _streamingChunkCount = 0;
    _pendingAssistantContent = [];
    _currentItems = new Map();
    _itemOrder = [];
    _completedToolIds = new Set();
    _completedAssistantIds = new Set();
    _finalEntryEmittedThisTurn = false;
    _turnStreamError = null;
    _nativeTurnId = null;
    _nativeRetrySeen = false;
    _retryOf = null;
    _taskTurnFailed = false;
    _taskItemId = null;
    _turnContextUsage = null;
    _clearStreamThrottle();
  }

  function _resetFullState({ keepConfig } = {}) {
    _finishAgentLoop('session-ended');
    // Invalidate continuations before aborting: proxy startup and SDK events may
    // settle after init/stop has installed another session's state and callbacks.
    _sessionGeneration += 1;
    _modelCatalogAbort?.abort(new Error('SDK session changed'));
    _modelCatalog = null; _modelCatalogPending = null; _modelCatalogAbort = null;
    _planUsageAbort?.abort(new Error('SDK session changed'));
    _planUsage = null; _planUsagePending = null; _planUsageAbort = null;
    _modelSelectionRevision = 0; _reasoningEffort = keepConfig ? _threadOptions.modelReasoningEffort || null : null;
    if (_lastMcpStatus) {
      const clear = { ..._lastMcpStatus, servers: null, ts: Date.now(), trigger: 'session-switched' };
      _lastMcpStatus = null;
      try { _broadcastWs?.(clear); } catch {}
    }
    _slowUpstreams.clear();
    _lastFailedTurn = null;
    _nativeAgents?.close(); _nativeAgents = null;
    _nativeApprovals?.close(); _nativeApprovals = null;
    _queueEpoch = randomUUID();
    _activeInput = null;
    interruptTurn({ discardQueue: true });
    const retiringTransport = _transport; _transport = null;
    const cleanup = Promise.resolve(retiringTransport?.stop?.()).catch(error => console.warn('[SDK] Transport cleanup failed:', error.message));
    _sessionId = null;
    _contextSnapshot = null;
    _model = keepConfig ? (_threadOptions.model || null) : null;
    _queryBusy = false;
    _messageQueue = [];
    _suppressDrain = false;
    _accumulatedMessages = [];
    _resetTurnState();
    _broadcastTaskState();
    for (const [, pending] of _pendingApprovals) {
      pending.resolve(null);
    }
    _pendingApprovals.clear();
    return cleanup;
  }

  return {
    instanceKey,
    get cwd() { return _cwd; },
    get projectName() { return _projectName; },
    get transportKind() { return _transportKind; },
    getSlowUpstreams: () => [..._slowUpstreams.values()].map(frame => ({ ...frame,
      waitingMs: Math.max(0, Date.now() - frame.startedAt), ts: Date.now() })),
    getPendingApprovals: () => _nativeApprovals?.replay() || [],
    cancelAskHosting: id => _nativeApprovals?.cancelAskHosting(id) || false,
    getMcpStatusSnapshot: () => cloneJson(_lastMcpStatus),
    getContextUsageSnapshot: () => cloneJson(_contextSnapshot),
    getAgentState: () => _nativeAgents?.snapshot() || { type: 'sdk-agent-snapshot', sessionId: _sessionId,
      cwd: _cwd, instanceKey, available: true, agents: [] },
    get revision() { return `${_sessionGeneration}:${_activityRevision}`; },
    resume,
    initSdkSession, sendUserMessage, retryInterruptedTurn, interruptTurn, resolveApproval, stopSession, listModels, setModel, getPlanUsage,
    getTurnResult: () => ({ completed: _finalEntryEmittedThisTurn && !_taskTurnFailed, failed: _taskTurnFailed }),
    getSessionId, getInitialPrompt, getStreamingState, getStreamProgress, getQueueState, getTaskState, removeQueuedMessage, sendQueuedNow, fetchMcpStatus, fetchSkills,
  };
}

function cloneJson(value) {
  if (value == null) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function _stripInternalFields(blocks) {
  return (blocks || []).map(block => {
    if (!block || typeof block !== 'object') return block;
    const { _sdkItemId, ...rest } = block;
    return rest;
  });
}

function parseSdkCodexArgs(args = [], defaults = {}, transport = 'exec') {
  if (!Array.isArray(args) || args.length > 512
      || args.some(arg => typeof arg !== 'string')
      || args.reduce((bytes, arg) => bytes + Buffer.byteLength(arg), 0) > 1024 * 1024) {
    const error = new TypeError('Invalid SDK arguments');
    error.status = 400;
    throw error;
  }
  const threadOptions = cloneJson(defaults.threadOptions || {});
  const codexOptions = cloneJson(defaults.codexOptions || {});
  const config = codexOptions.config || {};
  const native = transport === 'appserver';
  const configOverrides = [...(defaults.configOverrides || [])];
  const additionalDirectories = [...(threadOptions.additionalDirectories || [])];
  const promptParts = [];
  const invocation = parseCodexInvocation(args);
  const resumeThreadId = invocation.kind === 'resume' ? invocation.threadId : null;
  args = stripResumeInvocation(args, invocation);

  const setConfig = (path, value) => {
    const keys = String(path || '').split('.').filter(Boolean);
    if (keys.length === 0) {
      if (native) throw Object.assign(new TypeError('Native config requires a key'), { status: 400, code: 'SDK_INVALID_OPTION' });
      return;
    }
    if (keys.some(key => ['__proto__', 'prototype', 'constructor'].includes(key))) {
      const error = new TypeError('Invalid SDK config key');
      error.status = 400;
      throw error;
    }
    const parsedValue = parseConfigValue(value);
    if (native) {
      // Codex owns TOML parsing (arrays, inline tables, escapes and literal
      // fallback). Do not round-trip a native override through the pinned SDK.
      configOverrides.push(`${path}=${value}`);
      if (path === 'model') delete threadOptions.model;
      return;
    }
    if (keys.length === 1 && keys[0] === 'model' && typeof parsedValue === 'string') {
      threadOptions.model = parsedValue;
    }
    let target = config;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      target = target[key];
    }
    target[keys[keys.length - 1]] = parsedValue;
  };

  const takeValue = (argv, index, inline) => {
    if (!(inline ?? argv[index + 1]) || (inline === undefined && argv[index + 1].startsWith('-'))) {
      throw Object.assign(new TypeError(`Missing value for ${argv[index]}`), { status: 400, code: 'SDK_INVALID_OPTION' });
    }
    if (inline !== undefined) return { value: inline, nextIndex: index };
    return { value: argv[index + 1], nextIndex: index + 1 };
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (invocation.kind === 'new' && invocation.subcommandIndex === i && (arg === 'exec' || arg === 'e')) continue;
    if (invocation.kind === 'new' && invocation.subcommandIndex === i && arg === 'review') {
      throw Object.assign(new TypeError(`Unsupported ${native ? 'App Server' : 'SDK exec'} option: ${arg}`), { status: 400, code: 'SDK_UNSUPPORTED_OPTION' });
    }

    if (arg === '--') {
      promptParts.push(...args.slice(i + 1));
      break;
    }

    const [flag, inline] = arg.includes('=') ? arg.split(/=(.*)/s, 2) : [arg, undefined];

    if (flag === '-m' || flag === '--model') {
      const taken = takeValue(args, i, inline);
      if (taken.value) threadOptions.model = taken.value;
      i = taken.nextIndex;
      continue;
    }
    if (flag === '-C' || flag === '--cd') {
      const taken = takeValue(args, i, inline);
      if (taken.value) threadOptions.workingDirectory = taken.value;
      i = taken.nextIndex;
      continue;
    }
    if (flag === '-s' || flag === '--sandbox') {
      const taken = takeValue(args, i, inline);
      if (native && !['read-only', 'workspace-write', 'danger-full-access'].includes(taken.value)) {
        throw Object.assign(new TypeError('Unsupported App Server sandbox mode'), { status: 400, code: 'SDK_UNSUPPORTED_OPTION' });
      }
      if (taken.value) threadOptions.sandboxMode = taken.value;
      i = taken.nextIndex;
      continue;
    }
    if (flag === '-a' || flag === '--ask-for-approval') {
      const taken = takeValue(args, i, inline);
      if (native && !['untrusted', 'on-request', 'never'].includes(normalizeApprovalPolicy(taken.value))) {
        throw Object.assign(new TypeError('Unsupported App Server approval policy'), { status: 400, code: 'SDK_UNSUPPORTED_OPTION' });
      }
      if (taken.value) threadOptions.approvalPolicy = normalizeApprovalPolicy(taken.value);
      i = taken.nextIndex;
      continue;
    }
    if (flag === '--add-dir') {
      if (native) throw Object.assign(new TypeError('App Server --add-dir is not supported; configure writable roots in Codex'), { status: 400, code: 'SDK_UNSUPPORTED_OPTION' });
      const taken = takeValue(args, i, inline);
      if (taken.value) additionalDirectories.push(taken.value);
      i = taken.nextIndex;
      continue;
    }
    if (flag === '-c' || flag === '--config') {
      const taken = takeValue(args, i, inline);
      if (taken.value && String(taken.value).includes('=')) {
        const [key, value] = String(taken.value).split(/=(.*)/s, 2);
        setConfig(key, value);
      } else throw Object.assign(new TypeError(`${native ? 'Native' : 'SDK exec'} config requires key=value`), { status: 400, code: 'SDK_INVALID_OPTION' });
      i = taken.nextIndex;
      continue;
    }
    if (arg === '--search') {
      threadOptions.webSearchMode = 'live';
      continue;
    }
    if (arg === '--skip-git-repo-check') {
      threadOptions.skipGitRepoCheck = true;
      continue;
    }
    if (arg === '--dangerously-bypass-approvals-and-sandbox') {
      threadOptions.approvalPolicy = 'never';
      threadOptions.sandboxMode = 'danger-full-access';
      continue;
    }
    if (arg === '--full-auto') {
      threadOptions.approvalPolicy = native ? 'on-request' : 'on-failure';
      threadOptions.sandboxMode = 'workspace-write';
      continue;
    }
    if (native && (flag === '--enable' || flag === '--disable')) {
      const taken = takeValue(args, i, inline);
      if (!/^[A-Za-z0-9_-]+$/.test(taken.value)) throw Object.assign(new TypeError('Invalid feature name'), { status: 400, code: 'SDK_INVALID_OPTION' });
      configOverrides.push(`features.${taken.value}=${flag === '--enable'}`);
      i = taken.nextIndex; continue;
    }
    if (arg.startsWith('-')) {
      throw Object.assign(new TypeError(`Unsupported ${native ? 'App Server' : 'SDK exec'} option: ${arg}`), { status: 400, code: 'SDK_UNSUPPORTED_OPTION' });
    }
    promptParts.push(arg);
  }

  if (additionalDirectories.length > 0) {
    threadOptions.additionalDirectories = additionalDirectories;
  }
  if (Object.keys(config).length > 0) {
    codexOptions.config = config;
  }

  return {
    threadOptions,
    codexOptions,
    configOverrides,
    resumeThreadId,
    initialPrompt: promptParts.join(' ').trim(),
  };
}

function normalizeApprovalPolicy(value) {
  if (value === 'on_request') return 'on-request';
  if (value === 'on_failure') return 'on-failure';
  return value;
}

function parseConfigValue(raw) {
  const value = String(raw ?? '').trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}
