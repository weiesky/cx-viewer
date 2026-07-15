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
  sdkItemToAssistantBlock,
  sdkItemToToolUseBlock,
  sdkToJSONLEntry,
  sdkToolName,
  sdkToolOutput,
} from './sdk-adapter.js';
import { startProxy, stopProxy } from '../proxy.js';
import { readCodexGlobalConfig } from './codex-config.js';

let _Codex = null;
let _sdkImportError = null;
try {
  const sdk = await import('@openai/codex-sdk');
  _Codex = sdk.Codex;
} catch (err) {
  _sdkImportError = err;
  console.warn('[SDK] Codex SDK not available:', err.message);
}

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
let _messageQueue = [];
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

let _onEntry = null;
let _onStreamingStatus = null;
let _onStreamProgress = null;
let _broadcastWs = null;
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

export function isSdkAvailable() {
  return typeof _Codex === 'function';
}

async function waitForSdkProxyStartup() {
  const pending = _sdkProxyPromise;
  if (!pending) return;
  let timer = null;
  try {
    const started = await Promise.race([
      pending.then(() => true),
      new Promise(resolve => { timer = setTimeout(() => resolve(false), SDK_PROXY_START_TIMEOUT_MS); }),
    ]);
    if (!started && _sdkProxyPromise === pending) {
      // Mark the late result stale; init's identity guard will close it rather
      // than leaving an unused capture server beside a direct SDK client.
      _sdkProxyPromise = null;
      pending.then(() => stopProxy()).catch(() => {});
    }
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function getSdkUnavailableReason() {
  return _sdkImportError?.message || null;
}

export function getInitialPrompt() {
  return _initialPrompt;
}

export function initSdkSession(cwd, projectName, {
  onEntry,
  onStreamingStatus,
  onStreamProgress,
  broadcastWs,
  permissionMode,
  codexPath,
  codexArgs = [],
} = {}) {
  _cwd = cwd;
  _projectName = projectName;
  _onEntry = onEntry;
  _onStreamingStatus = onStreamingStatus;
  _onStreamProgress = onStreamProgress;
  _broadcastWs = broadcastWs;
  _codexPath = codexPath || null;

  const parsed = parseSdkCodexArgs(codexArgs);
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
    workingDirectory: cwd,
    skipGitRepoCheck: true,
    ...parsed.threadOptions,
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
    const proxyPromise = startProxy({ onResponseModel: observeSdkModel }).then(port => {
      if (_sdkProxyPromise !== proxyPromise) {
        stopProxy();
        return null;
      }
      _sdkProxyPort = port;
      return port;
    }).catch(err => {
      console.warn('[SDK] Failed to start proxy:', err.message);
    }).finally(() => {
      if (_sdkProxyPromise === proxyPromise) _sdkProxyPromise = null;
    });
    _sdkProxyPromise = proxyPromise;
  }
}

export async function sendUserMessage(text) {
  if (!_Codex) throw new Error(`Codex SDK not available${_sdkImportError ? `: ${_sdkImportError.message}` : ''}`);
  if (!text || !String(text).trim()) return;

  if (_queryBusy) {
    _messageQueue.push(String(text));
    return;
  }

  _queryBusy = true;
  try {
    await _executeTurn(String(text));
    while (_messageQueue.length > 0) {
      const next = _messageQueue.shift();
      await _executeTurn(next);
    }
  } finally {
    _queryBusy = false;
  }
}

async function _executeTurn(text) {
  _resetTurnState();
  _turnTimestamp = new Date().toISOString();
  _turnStartTime = Date.now();
  _streamingRequestId = `sdk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  _accumulatedMessages.push({ role: 'user', content: text });

  if (!_codex) {
    // Proxy startup is async, but the SDK client captures its environment only
    // once. Wait for that startup before constructing the singleton client so
    // an immediate initial prompt cannot permanently bypass capture/model
    // observation. Failure resolves through the startup catch and falls back.
    await waitForSdkProxyStartup();
    _codex = new _Codex({
      ..._codexOptions,
      ...(_codexPath ? { codexPathOverride: _codexPath } : {}),
      env: {
        ...process.env,
        CXV_SDK_MODE: '1',
        CXV_PROJECT_DIR: _cwd,
        ...(_sdkProxyPort ? { OPENAI_BASE_URL: `http://127.0.0.1:${_sdkProxyPort}` } : {}),
      },
    });
  }
  if (!_thread) {
    _thread = _sessionId
      ? _codex.resumeThread(_sessionId, _threadOptions)
      : _codex.startThread(_threadOptions);
  }

  _abortController = new AbortController();
  _sendStreamingStatus(true);

  try {
    const streamed = await _thread.runStreamed(text, { signal: _abortController.signal });
    for await (const event of streamed.events) {
      _processEvent(event);
    }
  } catch (err) {
    if (err?.name === 'AbortError') {
      _emitErrorEntry('Turn interrupted');
    } else {
      console.error('[SDK] runStreamed error:', err.message);
      _emitErrorEntry(err.message || String(err));
    }
  } finally {
    _flushStreamProgress();
    _clearStreamThrottle();
    _abortController = null;
    _sendStreamingStatus(false);
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
      _emitErrorEntry(event.message || 'Codex SDK error');
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
    _accumulatedMessages.push({ role: 'assistant', content });
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
    metadata: { source: 'codex-sdk' },
  });

  if (_onEntry) _onEntry(entry);
  if (finalContent.length > 0) {
    _accumulatedMessages.push({ role: 'assistant', content: finalContent });
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
    metadata: { source: 'codex-sdk' },
  });
  _onEntry(entry);
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

function _sendStreamingStatus(active) {
  if (_onStreamingStatus) {
    _onStreamingStatus(buildStreamingStatus(active, {
      model: _model,
      startTime: _turnStartTime,
      chunksReceived: _streamingChunkCount,
    }));
  }
}

function _clearStreamThrottle() {
  if (_streamThrottleTimer) {
    clearTimeout(_streamThrottleTimer);
    _streamThrottleTimer = null;
  }
}

export function interruptTurn() {
  _messageQueue = [];
  if (_abortController) {
    try { _abortController.abort(); } catch {}
    return true;
  }
  return false;
}

export function resolveApproval(id, value) {
  const pending = _pendingApprovals.get(id);
  if (pending) {
    pending.resolve(value);
    return true;
  }
  return false;
}

export function stopSession() {
  interruptTurn();
  if (_sdkProxyPort !== null || _sdkProxyPromise) {
    const pendingProxy = _sdkProxyPromise;
    _sdkProxyPromise = null;
    stopProxy();
    _sdkProxyPort = null;
    if (pendingProxy) {
      pendingProxy.then(() => stopProxy()).catch(() => {});
    }
  }
  _resetFullState({ keepConfig: false });
}

export function getSessionId() {
  return _sessionId;
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
  _clearStreamThrottle();
}

function _resetFullState({ keepConfig } = {}) {
  interruptTurn();
  _codex = null;
  _thread = null;
  _sessionId = null;
  _model = keepConfig ? (_threadOptions.model || null) : null;
  _queryBusy = false;
  _messageQueue = [];
  _accumulatedMessages = [];
  _resetTurnState();
  for (const [, pending] of _pendingApprovals) {
    pending.resolve(null);
  }
  _pendingApprovals.clear();
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

function parseSdkCodexArgs(args = []) {
  const threadOptions = {};
  const codexOptions = {};
  const config = {};
  const additionalDirectories = [];
  const promptParts = [];
  let resumeThreadId = null;

  const setConfig = (path, value) => {
    const keys = String(path || '').split('.').filter(Boolean);
    if (keys.length === 0) return;
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

    if (arg === 'resume') {
      const maybeId = args[i + 1];
      if (maybeId && maybeId !== '--last' && !maybeId.startsWith('-')) {
        resumeThreadId = maybeId;
        i += 1;
      }
      continue;
    }

    if (arg === '--last') {
      continue;
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
