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
} from './sdk-adapter.js';
import { createProxy } from '../proxy.js';
import { readCodexGlobalConfig } from './codex-config.js';
import { parseCodexInvocation, stripResumeInvocation } from './cli-args.js';
import { createHash, randomUUID } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SDK_EXEC_LAUNCHER = fileURLToPath(new URL('./sdk-exec-launcher.sh', import.meta.url));
const SDK_EXEC_RUNNER = fileURLToPath(new URL('./sdk-exec-runner.mjs', import.meta.url));

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

export function getSdkWorkingDirectory(cwd, codexArgs = []) {
  return resolve(cwd, parseSdkCodexArgs(codexArgs).threadOptions.workingDirectory || '.');
}

// Resolve paths without realpath: symlink spellings follow the existing workspace
// convention. One resident session per normalized cwd, independently owned.
const sessions = new Map();
let activeKey = null;
let launchConfig = null;

export function setSdkLaunchConfig(options) {
  if (options == null) { launchConfig = null; return; }
  const { codexArgs = [], ...config } = options;
  const parsed = parseSdkCodexArgs(codexArgs);
  delete parsed.threadOptions.workingDirectory;
  // Resume targets and prompts belong to the boot workspace only.
  launchConfig = { options: config, defaults: {
    threadOptions: parsed.threadOptions, codexOptions: parsed.codexOptions,
  } };
}

export function launchSdkSession(cwd, projectName, codexArgs = []) {
  if (!launchConfig) {
    const error = new Error('SDK workspace launch is not configured');
    error.status = 503;
    throw error;
  }
  const parsed = parseSdkCodexArgs(codexArgs, launchConfig.defaults);
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

export function getSdkQueueState(anchor) {
  return sessionForAnchor(anchor)?.getQueueState() || null;
}

// Explicit initialization resets this cwd only. Workspace switches use attach so
// background turns, queued messages and resume IDs survive.
export function initSdkSession(cwd, projectName, options = {}) {
  return registerSdkSession(cwd, projectName, options, parseSdkCodexArgs(options.codexArgs));
}

function registerSdkSession(cwd, projectName, options, parsed) {
  if (typeof cwd !== 'string' || !cwd.trim()) throw new TypeError('SDK cwd is required');
  const key = resolve(cwd, parsed.threadOptions.workingDirectory || '.');
  let session = sessions.get(key);
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
  return sessionForAnchor(anchor)?.resolveApproval(id, value) || false;
}

export function getSessionId(anchor) {
  return sessionForAnchor(anchor)?.getSessionId() || null;
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

export function stopSession() {
  const previous = [...sessions.values()];
  sessions.clear();
  activeKey = null;
  for (const session of previous) session.stopSession();
}

function createSdkSession(instanceKey) {
  let _codex = null;
  let _thread = null;
  let _sessionId = null;
  let _model = null;
  let _cwd = null;
  let _projectName = null;
  let _codexPath = null;
  let _codexOptions = {};
  let _threadOptions = {};
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
  let _finalEntryEmittedThisTurn = false;
  let _turnStreamError = null;

  let _onEntry = null;
  let _onStreamingStatus = null;
  let _onStreamProgress = null;
  let _broadcastWs = null;
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

  function initSdkSession(cwd, projectName, {
    onEntry,
    onStreamingStatus,
    onStreamProgress,
    broadcastWs,
    permissionMode,
    codexPath,
    codexArgs = [],
  } = {}, parsed = parseSdkCodexArgs(codexArgs)) {
    _sdkProxy.stop();
    _sdkProxy = createProxy();
    _sdkProxyPort = null;
    _sdkProxyPromise = null;
    _cwd = cwd;
    _projectName = projectName;
    _onEntry = onEntry;
    _onStreamingStatus = onStreamingStatus;
    _onStreamProgress = onStreamProgress;
    _broadcastWs = broadcastWs;
    _codexPath = codexPath || null;

    _codexOptions = parsed.codexOptions;
    // SDK 0.142.5 has no request_user_input callback. Override both persisted
    // config and user-provided -c flags until the SDK bridge can service it.
    _codexOptions.config = {
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
    _sessionId = parsed.resumeThreadId || null;

    // 启动本地代理以拦截 SDK 模式下的真实 API 调用
    if (_sdkProxyPort === null && !_sdkProxyPromise) {
      const proxy = _sdkProxy;
      const generation = _sessionGeneration;
      const proxyPromise = proxy.start({
        captureContext: { cwd: _cwd, instanceKey },
        onResponseModel: model => {
          if (generation === _sessionGeneration) observeSdkModel(model);
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

  async function _runTurns(text = null, requestId = null) {
    const generation = _sessionGeneration;
    _queryBusy = true;
    try {
      if (text !== null) await _executeTurn(text, generation, null, requestId);
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
      _abortController?.abort();
      return { dispatching: true };
    }
    return _runTurns();
  }

  function _broadcastQueueState() {
    try { _broadcastWs?.(getQueueState()); }
    catch (error) { console.warn('[SDK] Queue status callback failed:', error.message); }
  }

  async function _executeTurn(text, generation, queuedItem = null, requestId = null) {
    if (queuedItem) _dispatchingStarting = true;
    _resetTurnState();
    _turnTimestamp = new Date().toISOString();
    _turnStartTime = Date.now();
    _streamingRequestId = `sdk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    _accumulatedMessages.push({ role: 'user', content: text, _sdkTimestamp: _turnTimestamp });

    const controller = new AbortController();
    _abortController = controller;
    _activeInput = { id: queuedItem?.id || _streamingRequestId, text,
      timestamp: _turnTimestamp, requestId: queuedItem?.requestId || requestId || null };
    _broadcastQueueState();
    _sendStreamingStatus(true);
    try {
      if (!_codex) {
        // Proxy startup is async, but the SDK client captures its environment only
        // once. Wait for that startup before constructing the singleton client so
        // an immediate initial prompt cannot permanently bypass capture/model
        // observation. Failure resolves through the startup catch and falls back.
        await waitForSdkProxyStartup(controller.signal);
        if (generation !== _sessionGeneration) return;
        controller.signal.throwIfAborted();
        const options = {
          ..._codexOptions,
          ...(_codexPath ? { codexPathOverride: _codexPath } : {}),
          env: {
            ...process.env,
            CXV_SDK_MODE: '1',
            CXV_PROJECT_DIR: _cwd,
            CXV_INSTANCE_KEY: instanceKey,
            ...(_sdkProxyPort ? { OPENAI_BASE_URL: `http://127.0.0.1:${_sdkProxyPort}` } : {}),
          },
        };
        _codex = new _Codex(options);
        // CLI supplies the executable. For library callers, reuse the resolver
        // of our pinned SDK 0.142.5 rather than duplicating its platform lookup.
        const executable = _codexPath || _codex.exec?.executablePath;
        if (process.platform !== 'win32' && typeof executable === 'string') {
          _codex = new _Codex({ ...options, codexPathOverride: SDK_EXEC_LAUNCHER,
            env: { ...options.env, CXV_SDK_NODE: process.execPath,
              CXV_SDK_RUNNER: SDK_EXEC_RUNNER, CXV_SDK_EXECUTABLE: executable,
              ...(process.versions.electron ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
            },
          });
        }
      }
      if (!_thread) {
        _thread = _sessionId
          ? _codex.resumeThread(_sessionId, _threadOptions)
          : _codex.startThread(_threadOptions);
      }
      controller.signal.throwIfAborted();
      const streamed = await _thread.runStreamed(text, { signal: controller.signal });
      for await (const event of streamed.events) {
        if (generation !== _sessionGeneration) break;
        if (queuedItem && _dispatchingQueueItem === queuedItem) {
          _dispatchingQueueItem = null;
          _dispatchingStarting = false;
          _broadcastQueueState();
        }
        _processEvent(event);
      }
      if (generation === _sessionGeneration && _turnStreamError) _emitErrorEntry(_turnStreamError);
    } catch (err) {
      if (generation !== _sessionGeneration) return;
      if (err?.name === 'AbortError') {
        _emitErrorEntry('Turn interrupted');
      } else {
        console.error('[SDK] runStreamed error:', err.message);
        _emitErrorEntry(_turnStreamError || err.message || String(err));
      }
    } finally {
      if (generation === _sessionGeneration) {
        if (queuedItem && _dispatchingQueueItem === queuedItem) {
          _dispatchingQueueItem = null;
          _dispatchingStarting = false;
          _broadcastQueueState();
        }
        _flushStreamProgress();
        _clearStreamThrottle();
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
        break;

      case 'turn.started':
        _sendStreamingStatus(true);
        break;

      case 'item.started':
      case 'item.updated':
        _upsertItem(event.item);
        _scheduleStreamProgress();
        break;

      case 'item.completed':
        _upsertItem(event.item);
        _handleCompletedItem(event.item);
        _scheduleStreamProgress();
        break;

      case 'turn.completed':
        _emitCompletedEntry(event.usage);
        break;

      case 'turn.failed':
        _emitErrorEntry(event.error?.message || 'Codex turn failed');
        break;

      case 'error':
        // Codex 0.169 also uses error frames for retry notices. A later
        // turn.completed must win; persist failures only at terminal settlement.
        _turnStreamError = event.message || 'Codex SDK error';
        break;
    }
  }

  function _upsertItem(item) {
    if (!item || typeof item !== 'object') return;
    const id = item.id || `${item.type || 'item'}_${_itemOrder.length}`;
    if (!_currentItems.has(id)) _itemOrder.push(id);
    _currentItems.set(id, { ...item, id });
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
    _pendingAssistantContent = _pendingAssistantContent.filter(b => b._sdkItemId !== id);
    _pendingAssistantContent.push({ ...block, _sdkItemId: id });
  }

  function _completeToolItem(item) {
    const id = item.id || `${item.type || 'tool'}_${Date.now()}`;
    if (_completedToolIds.has(id)) return;
    _completedToolIds.add(id);

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
        content: typeof output === 'string' ? output : JSON.stringify(output, null, 2),
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

  function _emitCompletedEntry(usage) {
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
      },
    };

    const entry = sdkToJSONLEntry(assistantMsg, messagesSnapshot, _model, _projectName, {
      timestamp: _turnTimestamp,
      requestId: _streamingRequestId,
      threadId: _sessionId || _thread?.id || null,
      cwd: _cwd,
      tools: DEFAULT_CODEX_TOOLS,
      duration: _turnStartTime ? Date.now() - _turnStartTime : 0,
      metadata: { source: 'codex-sdk', instance_key: instanceKey },
    });

    if (_onEntry) _onEntry(entry);
    if (finalContent.length > 0) {
      _accumulatedMessages.push({ role: 'assistant', content: finalContent, _sdkTimestamp: _turnTimestamp });
    }
    _pendingAssistantContent = [];
    _finalEntryEmittedThisTurn = true;
  }

  function _emitErrorEntry(message) {
    if (_finalEntryEmittedThisTurn || !_onEntry) return;
    const content = message ? [{ type: 'text', text: `Error: ${message}` }] : [];
    const assistantMsg = {
      message: {
        id: _streamingRequestId || `sdk_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        model: _model,
        content,
        error: { message },
        usage: null,
      },
    };
    const entry = sdkToJSONLEntry(assistantMsg, cloneJson(_accumulatedMessages), _model, _projectName, {
      timestamp: _turnTimestamp || new Date().toISOString(),
      threadId: _sessionId || _thread?.id || null,
      cwd: _cwd,
      status: 500,
      statusText: 'Error',
      stopReason: 'error',
      duration: _turnStartTime ? Date.now() - _turnStartTime : 0,
      metadata: { source: 'codex-sdk', instance_key: instanceKey },
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
        _threadId: _sessionId || _thread?.id || null,
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
    const content = _streamContentFromItems();
    if (!content.length) return;
    _streamingChunkCount += 1;
    _onStreamProgress({
      timestamp: _turnTimestamp,
      url: `codex://sdk/${encodeURIComponent(_sessionId || _thread?.id || _model || 'thread')}`,
      content,
      model: _model,
      cwd: _cwd,
      instanceKey,
    });
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
    if (_abortController) {
      try { _abortController.abort(); } catch {}
      return true;
    }
    return false;
  }

  function resolveApproval(id, value) {
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
    _resetFullState({ keepConfig: false });
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
      onStreamProgress: _onStreamProgress, broadcastWs: _broadcastWs, codexPath: _codexPath,
    }, { codexOptions: _codexOptions, threadOptions: _threadOptions, resumeThreadId: history.threadId });
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
    _finalEntryEmittedThisTurn = false;
    _turnStreamError = null;
    _clearStreamThrottle();
  }

  function _resetFullState({ keepConfig } = {}) {
    // Invalidate continuations before aborting: proxy startup and SDK events may
    // settle after init/stop has installed another session's state and callbacks.
    _sessionGeneration += 1;
    _queueEpoch = randomUUID();
    _activeInput = null;
    interruptTurn({ discardQueue: true });
    _codex = null;
    _thread = null;
    _sessionId = null;
    _model = keepConfig ? (_threadOptions.model || null) : null;
    _queryBusy = false;
    _messageQueue = [];
    _suppressDrain = false;
    _accumulatedMessages = [];
    _resetTurnState();
    for (const [, pending] of _pendingApprovals) {
      pending.resolve(null);
    }
    _pendingApprovals.clear();
  }

  return {
    instanceKey,
    get cwd() { return _cwd; },
    get projectName() { return _projectName; },
    get revision() { return `${_sessionGeneration}:${_activityRevision}`; },
    resume,
    initSdkSession, sendUserMessage, interruptTurn, resolveApproval, stopSession,
    getSessionId, getInitialPrompt, getStreamingState, getQueueState, removeQueuedMessage, sendQueuedNow,
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

function parseSdkCodexArgs(args = [], defaults = {}) {
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
  const additionalDirectories = [...(threadOptions.additionalDirectories || [])];
  const promptParts = [];
  const invocation = parseCodexInvocation(args);
  const resumeThreadId = invocation.kind === 'resume' ? invocation.threadId : null;
  args = stripResumeInvocation(args, invocation);

  const setConfig = (path, value) => {
    const keys = String(path || '').split('.').filter(Boolean);
    if (keys.length === 0) return;
    if (keys.some(key => ['__proto__', 'prototype', 'constructor'].includes(key))) {
      const error = new TypeError('Invalid SDK config key');
      error.status = 400;
      throw error;
    }
    const parsedValue = parseConfigValue(value);
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
    if (inline !== undefined) return { value: inline, nextIndex: index };
    return { value: argv[index + 1], nextIndex: index + 1 };
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg === 'exec' || arg === 'review') {
      promptParts.push(...args.slice(i + 1));
      break;
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
      if (taken.value) threadOptions.sandboxMode = taken.value;
      i = taken.nextIndex;
      continue;
    }
    if (flag === '-a' || flag === '--ask-for-approval') {
      const taken = takeValue(args, i, inline);
      if (taken.value) threadOptions.approvalPolicy = normalizeApprovalPolicy(taken.value);
      i = taken.nextIndex;
      continue;
    }
    if (flag === '--add-dir') {
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
      }
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
      threadOptions.approvalPolicy = 'on-failure';
      threadOptions.sandboxMode = 'workspace-write';
      continue;
    }
    if (arg.startsWith('-')) {
      continue;
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
