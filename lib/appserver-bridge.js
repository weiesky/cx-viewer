/**
 * appserver-bridge.js — Codex App-Server WebSocket 中间代理
 *
 * 架构：
 *   codex TUI (--remote ws://127.0.0.1:PROXY_PORT)
 *        ↕ WebSocket (JSON-RPC)
 *   cxv WS proxy (本模块) ← 记录所有双向消息 → LOG_FILE
 *        ↕ WebSocket (JSON-RPC)
 *   codex app-server (--listen ws://127.0.0.1:SERVER_PORT)
 *
 * cxv 作为中间代理转发所有消息，同时解析 server→client 的 notifications
 * 并转换为 cx-viewer entry 格式写入 LOG_FILE。
 *
 * 额外保留 session/turn 级别的原始 client/server 帧，
 * 供 DetailPanel 的 "Codex Raw" 调试视图直接检查原始协议载荷。
 */

import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { appendFileSync } from 'node:fs';
import { basename } from 'node:path';
import { BINARY_NAME } from '../findcx.js';
import WebSocket, { WebSocketServer } from 'ws';
import { getOriginalCodexBaseUrl } from './codex-config.js';
import { DEFAULT_API_BASE } from './constants.js';
import { isSupportedApprovalsReviewer, normalizeApprovalsReviewer } from './approval-reviewer.js';

let _appServerProcess = null;

const CODEX_PLAN_TOOL_NAME = 'update_plan';
const CODEX_ASK_TOOL_NAME = 'request_user_input';

/** Build the real OpenAI API URL from configured base URL */
function buildApiUrl() {
  const base = getOriginalCodexBaseUrl() || DEFAULT_API_BASE;
  const cleanBase = base.replace(/\/+$/, '');
  if (cleanBase.endsWith('/v1')) return `${cleanBase}/responses`;
  return `${cleanBase}/v1/responses`;
}
let _proxyServer = null;
let _upstreamWs = null;
let _logFile = null;
let _currentModel = null;
let _currentProject = null;
let _messages = [];       // 累积会话项，用于生成 MainAgent 的 Responses input
let _pendingContent = []; // 当前 turn 的 assistant content blocks
let _turnStartTime = null;
let _mainThreadId = null;
const _threadStates = new Map();
const _threadMetaById = new Map();
const _subAgentThreads = new Map();
const _pendingServerRequests = new Map();

// 丰富的上下文信息
let _threadId = null;
let _turnId = null;
let _cwd = null;
let _systemPrompt = null;
let _serverInfo = null;      // initialize 响应
let _turnContext = {};        // turn/start 的完整 params
let _threadMeta = {};         // thread/started 的完整信息
let _lastTokenUsage = null;   // 最近的 token usage
let _turnStatus = null;       // turn 完成状态
let _rawSessionClientFrames = [];
let _rawSessionServerFrames = [];
let _rawTurnClientFrames = [];
let _rawTurnServerFrames = [];
let _turnActive = false;
let _approvalsReviewerOverride = null;
let _onApprovalsReviewerActive = null;
let _writeLogEntry = null;

const REVIEWER_LIFECYCLE_METHODS = new Set([
  'thread/start',
  'thread/resume',
  'thread/fork',
  'turn/start',
]);

function injectApprovalsReviewer(msg) {
  if (!_approvalsReviewerOverride || !msg || !REVIEWER_LIFECYCLE_METHODS.has(msg.method)) return msg;
  return {
    ...msg,
    params: {
      ...(msg.params || {}),
      approvalsReviewer: _approvalsReviewerOverride,
    },
  };
}

export function setApprovalsReviewer(value) {
  _approvalsReviewerOverride = normalizeApprovalsReviewer(value);
  return {
    approvalsReviewer: _approvalsReviewerOverride,
    appliesOnNextTurn: true,
  };
}

function _pickSystemPrompt(...candidates) {
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function cloneJson(value) {
  if (value == null) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function stringifyValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function decodeBase64Text(value) {
  if (typeof value !== 'string' || !value) return '';
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function usageField(usage, camelName, snakeName) {
  return usage?.[camelName] ?? usage?.[snakeName] ?? 0;
}

function normalizeTokenUsage(usage) {
  if (!usage) return null;
  const input = usageField(usage, 'inputTokens', 'input_tokens');
  const output = usageField(usage, 'outputTokens', 'output_tokens');
  const reasoning = usageField(usage, 'reasoningOutputTokens', 'reasoning_output_tokens');
  const cached = usageField(usage, 'cachedInputTokens', 'cached_input_tokens');
  const total = usageField(usage, 'totalTokens', 'total_tokens') || (input + output);
  return {
    input_tokens: input,
    output_tokens: output,
    reasoning_output_tokens: reasoning,
    total_tokens: total,
    input_tokens_details: { cached_tokens: cached, cache_write_tokens: 0 },
  };
}

function formatTurnPlan(planUpdate) {
  if (!planUpdate) return '';
  const lines = [];
  if (planUpdate.explanation) lines.push(planUpdate.explanation);
  for (const item of planUpdate.plan || []) {
    if (!item?.step) continue;
    const status = item.status ? `[${item.status}] ` : '';
    lines.push(`- ${status}${item.step}`);
  }
  return lines.join('\n');
}

function textFromContent(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) {
    if (typeof content.text === 'string') return content.text;
    if (typeof content.input_text === 'string') return content.input_text;
    if (typeof content.output_text === 'string') return content.output_text;
    if (Array.isArray(content.content) || typeof content.content === 'string') {
      return textFromContent(content.content);
    }
    return '';
  }
  return content.map(block => {
    if (!block) return '';
    if (typeof block === 'string') return block;
    if (typeof block.text === 'string') return block.text;
    if (typeof block.input_text === 'string') return block.input_text;
    if (typeof block.output_text === 'string') return block.output_text;
    if (typeof block.content === 'string' || Array.isArray(block.content)) return textFromContent(block.content);
    return '';
  }).filter(Boolean).join('\n');
}

function normalizeUserContent(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return textFromContent(content);
  const text = textFromContent(content);
  const hasOnlyText = content.every(block => {
    if (typeof block === 'string') return true;
    return block && (block.type === 'text' || block.type === 'input_text');
  });
  return hasOnlyText ? text : cloneJson(content);
}

function sameUserContent(a, b) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function createThreadState(threadId) {
  return {
    threadId: threadId || 'root',
    messages: [],
    pendingContent: [],
    turnStartTime: null,
    turnId: null,
    cwd: _cwd,
    model: _currentModel,
    systemPrompt: null,
    turnContext: {},
    threadMeta: {},
    lastTokenUsage: null,
    turnStatus: null,
    seenUserMessageIds: new Set(),
    agentMessageDeltas: new Map(),
    reasoningDeltas: new Map(),
    planDeltas: new Map(),
    commandOutputDeltas: new Map(),
    commandExecOutputDeltas: new Map(),
    terminalInteractions: new Map(),
    fileChangeOutputDeltas: new Map(),
    fileChangePatches: new Map(),
    mcpProgressMessages: new Map(),
    processOutputDeltas: new Map(),
    itemSnapshots: new Map(),
    itemOrder: [],
    completedItemIds: new Set(),
    emittedTurnIds: new Set(),
    turnPlan: null,
    turnPlanToolId: null,
    turnDiff: null,
    turnModerationMetadata: null,
    modelReroutes: [],
    modelVerifications: [],
    safetyBuffering: null,
    warnings: [],
  };
}

function getThreadState(threadId) {
  const key = threadId || _threadId || _mainThreadId || 'root';
  let state = _threadStates.get(key);
  if (!state) {
    state = createThreadState(key);
    _threadStates.set(key, state);
  }
  return state;
}

function syncGlobalsFromState(state) {
  if (!state) return;
  _threadId = state.threadId;
  _turnId = state.turnId;
  _turnStartTime = state.turnStartTime;
  _turnContext = state.turnContext || {};
  _threadMeta = state.threadMeta || {};
  _lastTokenUsage = state.lastTokenUsage || null;
  _turnStatus = state.turnStatus || null;
  _messages = state.messages;
  _pendingContent = state.pendingContent;
}

function resetThreadRuntimeState() {
  _threadStates.clear();
  _threadMetaById.clear();
  _subAgentThreads.clear();
  _pendingServerRequests.clear();
  _mainThreadId = null;
}

function getSubAgentSourceInfo(source) {
  const subAgent = source?.subAgent;
  if (!subAgent) return null;
  if (typeof subAgent === 'string') {
    return { kind: subAgent };
  }
  const spawn = subAgent.thread_spawn || subAgent.threadSpawn;
  if (spawn) {
    return {
      kind: 'thread_spawn',
      parentThreadId: spawn.parent_thread_id || spawn.parentThreadId,
      agentPath: spawn.agent_path || spawn.agentPath,
      agentNickname: spawn.agent_nickname || spawn.agentNickname,
      agentRole: spawn.agent_role || spawn.agentRole || spawn.agent_type || spawn.agentType,
      depth: spawn.depth,
    };
  }
  return { kind: stringifyValue(subAgent) };
}

function rememberSubAgentThread(threadId, info = {}) {
  if (!threadId) return;
  const existing = _subAgentThreads.get(threadId) || {};
  const next = { ...existing, ...info };
  if (!next.parentThreadId && _mainThreadId && _mainThreadId !== threadId) {
    next.parentThreadId = _mainThreadId;
  }
  _subAgentThreads.set(threadId, next);
  getThreadState(threadId);
  if (!_mainThreadId && next.parentThreadId && next.parentThreadId !== threadId) {
    _mainThreadId = next.parentThreadId;
  }
}

function isSubAgentThreadMeta(thread) {
  if (!thread) return false;
  if (thread.parentThreadId) return true;
  if (thread.threadSource === 'subagent') return true;
  return !!getSubAgentSourceInfo(thread.source);
}

function rememberThread(thread) {
  if (!thread?.id) return getThreadState();
  _threadMetaById.set(thread.id, thread);
  const state = getThreadState(thread.id);
  state.threadMeta = thread;
  state.cwd = thread.cwd || state.cwd || _cwd;
  const sourceInfo = getSubAgentSourceInfo(thread.source) || {};
  const parentThreadId = thread.parentThreadId || sourceInfo.parentThreadId || null;

  if (isSubAgentThreadMeta(thread)) {
    rememberSubAgentThread(thread.id, {
      parentThreadId,
      agentPath: thread.agentPath || sourceInfo.agentPath,
      agentNickname: thread.agentNickname || sourceInfo.agentNickname,
      agentRole: thread.agentRole || sourceInfo.agentRole || sourceInfo.kind,
      source: thread.source,
    });
  } else if (!_mainThreadId) {
    _mainThreadId = thread.id;
  }

  syncGlobalsFromState(state);
  return state;
}

function rememberThreadResponse(result) {
  const thread = result?.thread;
  if (!thread?.id) return null;
  const state = rememberThread(thread);
  state.model = result.model || state.model || _currentModel;
  state.cwd = result.cwd || thread.cwd || state.cwd || _cwd;
  syncGlobalsFromState(state);
  hydrateThreadTurnsFromResponse(thread, result);
  return state;
}

function getAgentIdentity(threadId) {
  const thread = _threadMetaById.get(threadId) || getThreadState(threadId).threadMeta || {};
  const sourceInfo = getSubAgentSourceInfo(thread.source) || {};
  const registered = _subAgentThreads.get(threadId);
  if (registered || isSubAgentThreadMeta(thread)) {
    const info = registered || {};
    const label = info.agentNickname
      || thread.agentNickname
      || info.agentRole
      || thread.agentRole
      || info.agentPath
      || sourceInfo.agentNickname
      || sourceInfo.agentRole
      || sourceInfo.agentPath
      || sourceInfo.kind
      || 'subagent';
    const parentThreadId = info.parentThreadId || thread.parentThreadId || sourceInfo.parentThreadId || _mainThreadId || null;
    return {
      mainAgent: false,
      subAgent: true,
      subAgentName: label,
      teamName: parentThreadId || undefined,
      _agentThreadId: threadId,
      ...(parentThreadId ? { _parentThreadId: parentThreadId } : {}),
    };
  }
  return {
    mainAgent: true,
    subAgent: false,
    _agentThreadId: threadId,
  };
}

function pushContentBlock(blocks, block) {
  if (!block) return;
  if (block.type === 'text' && !block.text) return;
  if (block.type === 'thinking' && !block.thinking) return;
  const prev = blocks[blocks.length - 1];
  if (prev && prev.type === 'text' && block.type === 'text') {
    prev.text += block.text;
    return;
  }
  if (prev && prev.type === 'thinking' && block.type === 'thinking') {
    prev.thinking += block.thinking;
    return;
  }
  blocks.push(block);
}

function flushAssistantContent(state) {
  if (!state?.pendingContent?.length) return;
  state.messages.push({ role: 'assistant', content: state.pendingContent });
  state.pendingContent = [];
  if (state.threadId === _threadId) _pendingContent = state.pendingContent;
}

function appendUserMessage(state, content, clientId, options = {}) {
  if (!state) return;
  if (clientId && state.seenUserMessageIds.has(clientId)) return;
  const normalized = normalizeUserContent(content);
  const hasContent = Array.isArray(normalized) ? normalized.length > 0 : !!normalized;
  if (!hasContent) return;
  if (options.dedupeLastUser) {
    const last = state.messages[state.messages.length - 1];
    if (last?.role === 'user' && sameUserContent(last.content, normalized)) {
      if (clientId) state.seenUserMessageIds.add(clientId);
      return;
    }
  }
  state.messages.push({ role: 'user', content: normalized, ...(clientId ? { _clientId: clientId } : {}) });
  if (clientId) state.seenUserMessageIds.add(clientId);
}

function appendToolResultMessage(state, id, output) {
  state.messages.push({
    role: 'user',
    content: [{
      type: 'tool_result',
      tool_use_id: id,
      content: stringifyValue(output),
    }],
  });
}

function registerCollabAgentThreads(item, fallbackParentThreadId) {
  if (!item || typeof item !== 'object') return;
  const parentThreadId = item.senderThreadId || fallbackParentThreadId || _mainThreadId;
  const receiverThreadIds = [
    ...(Array.isArray(item.receiverThreadIds) ? item.receiverThreadIds : []),
    item.receiverThreadId,
    item.newThreadId,
  ].filter(Boolean);
  for (const threadId of receiverThreadIds) {
    rememberSubAgentThread(threadId, {
      parentThreadId,
      agentNickname: item.agentNickname,
      agentRole: item.agentRole || item.tool,
      agentPath: item.agentPath,
    });
  }
}

function itemKey(item) {
  return item?.id || item?.call_id || item?.callId || item?.processId || item?.type || null;
}

function rememberItemSnapshot(state, item) {
  const id = itemKey(item);
  if (!state || !id || !item || typeof item !== 'object') return item;
  if (!state.itemSnapshots.has(id)) state.itemOrder.push(id);
  const previous = state.itemSnapshots.get(id) || {};
  const next = { ...previous, ...item, id: item.id || previous.id || id };
  state.itemSnapshots.set(id, next);
  return next;
}

function isTerminalItem(item) {
  return item?.status === 'completed' || item?.status === 'failed' || item?.status === 'cancelled';
}

function canFlushSnapshotAtTurnEnd(item) {
  if (!item || typeof item !== 'object') return false;
  if (isTerminalItem(item)) return true;
  return item.type === 'message'
    || item.type === 'agentMessage'
    || item.type === 'agent_message'
    || item.type === 'reasoning'
    || item.type === 'todoList'
    || item.type === 'todo_list'
    || item.type === 'error'
    || item.type === 'plan';
}

function resetRawSessionFrames() {
  _rawSessionClientFrames = [];
  _rawSessionServerFrames = [];
}

function resetRawTurnFrames() {
  _rawTurnClientFrames = [];
  _rawTurnServerFrames = [];
}

function captureRawClientFrame(msg, { startNewSession = false, startNewTurn = false } = {}) {
  if (!msg) return;
  const frame = cloneJson(msg);
  if (startNewSession) {
    resetRawSessionFrames();
    resetRawTurnFrames();
    _turnActive = false;
  }
  if (startNewTurn) {
    resetRawTurnFrames();
    _turnActive = true;
    _rawTurnClientFrames.push(frame);
    return;
  }
  if (_turnActive || _rawTurnClientFrames.length > 0 || _rawTurnServerFrames.length > 0) {
    _rawTurnClientFrames.push(frame);
  } else {
    _rawSessionClientFrames.push(frame);
  }
}

function captureRawServerFrame(msg) {
  if (!msg) return;
  const frame = cloneJson(msg);
  if (_turnActive || _rawTurnClientFrames.length > 0 || _rawTurnServerFrames.length > 0) {
    _rawTurnServerFrames.push(frame);
  } else {
    _rawSessionServerFrames.push(frame);
  }
}

/**
 * 找一个空闲端口
 */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

/**
 * 等待 app-server 就绪
 */
async function waitForReady(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`App-server not ready after ${timeoutMs}ms`);
}

/**
 * 写入一条 entry 到 LOG_FILE
 */
function writeEntry(entry) {
  if (!entry || !_logFile) return;
  try {
    if (_writeLogEntry) _writeLogEntry(entry);
    else appendFileSync(_logFile, JSON.stringify(entry) + '\n---\n');
  } catch {}
}

/**
 * 构建完整的 Responses request body（包含所有可用上下文）
 */
function buildFullRequestBody(state = getThreadState(), threadId = state.threadId) {
  const identity = getAgentIdentity(threadId);
  const systemPrompt = state.systemPrompt
    || (identity.subAgent
      ? `You are Codex subagent (${identity.subAgentName || 'subagent'}), a general-purpose agent.`
      : (_systemPrompt || 'You are Codex'));
  return {
    model: state.model || _currentModel,
    instructions: systemPrompt,
    input: state.messages.map(m => cloneJson(m)),
    tools: [{ name: 'shell_command' }, { name: 'apply_patch' }, { name: 'tool_search' }],
    // turn/start 中的完整参数
    ...(state.turnContext?.approvalPolicy ? { approval_policy: state.turnContext.approvalPolicy } : {}),
    ...(state.turnContext?.effort ? { reasoning_effort: state.turnContext.effort } : {}),
    ...(state.turnContext?.summary ? { reasoning_summary: state.turnContext.summary } : {}),
    ...(state.turnContext?.sandboxPolicy ? { sandbox_policy: state.turnContext.sandboxPolicy } : {}),
    // 线程和 turn 元数据
    metadata: {
      thread_id: threadId,
      turn_id: state.turnId,
      cwd: state.cwd || _cwd || _currentProject,
      ...identity,
      ...(state.threadMeta?.preview ? { thread_preview: state.threadMeta.preview } : {}),
      ...(_serverInfo ? { server: _serverInfo } : {}),
    },
  };
}

function buildRawCodexRequest() {
  const raw = {};
  if (_rawSessionClientFrames.length > 0 || _rawSessionServerFrames.length > 0) {
    raw.session = {
      client: cloneJson(_rawSessionClientFrames),
      server: cloneJson(_rawSessionServerFrames),
    };
  }
  if (_rawTurnClientFrames.length > 0 || _rawTurnServerFrames.length > 0) {
    raw.turn = {
      client: cloneJson(_rawTurnClientFrames),
      server: cloneJson(_rawTurnServerFrames),
    };
  }
  return raw;
}

/**
 * 构建完整的 response body
 */
function buildFullResponseBody(responseContent, turnMeta, state = getThreadState()) {
  const usage = state.lastTokenUsage?.last;
  const totalUsage = state.lastTokenUsage?.total;
  return {
    content: responseContent,
    model: state.model || _currentModel,
    stop_reason: state.turnStatus || 'end_turn',
    ...(usage ? {
      usage: normalizeTokenUsage(usage),
    } : {}),
    ...(totalUsage ? {
      total_usage: normalizeTokenUsage(totalUsage),
    } : {}),
    ...(state.lastTokenUsage?.modelContextWindow ? { context_window: state.lastTokenUsage.modelContextWindow } : {}),
    ...(state.turnPlan ? { turn_plan: cloneJson(state.turnPlan) } : {}),
    ...(state.turnDiff ? { turn_diff: state.turnDiff } : {}),
    ...(state.turnModerationMetadata ? { moderation_metadata: cloneJson(state.turnModerationMetadata) } : {}),
    ...(state.modelReroutes?.length ? { model_reroutes: cloneJson(state.modelReroutes) } : {}),
    ...(state.modelVerifications?.length ? { model_verifications: cloneJson(state.modelVerifications) } : {}),
    ...(state.safetyBuffering ? { safety_buffering: cloneJson(state.safetyBuffering) } : {}),
    ...(state.warnings?.length ? { warnings: cloneJson(state.warnings) } : {}),
    ...(turnMeta ? {
      turn: {
        id: turnMeta.id,
        status: turnMeta.status,
        started_at: turnMeta.startedAt,
        completed_at: turnMeta.completedAt,
        duration_ms: turnMeta.durationMs,
      },
    } : {}),
  };
}

/**
 * 发出累积式 MainAgent entry
 */
function emitMainAgentEntry(timestamp, responseContent, turnMeta, state = getThreadState(), options = {}) {
  const identity = getAgentIdentity(state.threadId);
  const entry = {
    timestamp,
    project: _currentProject || 'codex',
    url: buildApiUrl(),
    method: 'POST',
    headers: {},
    body: buildFullRequestBody(state, state.threadId),
    response: {
      status: 200,
      statusText: 'OK',
      headers: {},
      body: buildFullResponseBody(responseContent, turnMeta, state),
    },
    duration: turnMeta?.durationMs || (state.turnStartTime ? Date.now() - state.turnStartTime : 0),
    isStream: options.isStream ?? true,
    ...identity,
    _appServerSource: true,
    _codexRawRequest: buildRawCodexRequest(),
    ...(options.extra || {}),
  };
  writeEntry(entry);
}

function writeEventEntry(base, state, name, input = {}, options = {}) {
  const identity = getAgentIdentity(state.threadId);
  writeEntry({
    ...base,
    url: options.url || `codex://event/${encodeURIComponent(name)}`,
    method: options.method || 'EVENT',
    body: {
      event_name: name,
      event_input: cloneJson(input),
      _threadId: state.threadId,
      _turnId: state.turnId,
    },
    response: {
      status: options.status || 200,
      statusText: options.statusText || 'OK',
      headers: {},
      body: Object.prototype.hasOwnProperty.call(options, 'output')
        ? cloneJson(options.output)
        : cloneJson(input),
    },
    duration: 0,
    mainAgent: false,
    subAgent: identity.subAgent,
    ...(identity.subAgent ? {
      subAgentName: identity.subAgentName,
      teamName: identity.teamName,
    } : {}),
    _agentThreadId: state.threadId,
    ...(identity._parentThreadId ? { _parentThreadId: identity._parentThreadId } : {}),
  });
}

function rememberProcessOutput(state, params) {
  const processHandle = params.processHandle;
  if (!processHandle) return;
  const stream = params.stream === 'stderr' ? 'stderr' : 'stdout';
  const current = state.processOutputDeltas.get(processHandle) || {
    stdout: '',
    stderr: '',
    stdoutCapReached: false,
    stderrCapReached: false,
  };
  current[stream] += decodeBase64Text(params.deltaBase64);
  if (params.capReached) {
    current[`${stream}CapReached`] = true;
  }
  state.processOutputDeltas.set(processHandle, current);
}

function writeToolEntry(base, state, item, options = {}) {
  const identity = getAgentIdentity(state.threadId);
  const name = options.name || item.tool || item.name || item.type || 'tool';
  const input = options.input ?? item.arguments ?? item.input ?? item.action ?? {};
  const hasOutput = Object.prototype.hasOwnProperty.call(options, 'output')
    || Object.prototype.hasOwnProperty.call(item, 'output')
    || Object.prototype.hasOwnProperty.call(item, 'result')
    || Object.prototype.hasOwnProperty.call(item, 'error')
    || Object.prototype.hasOwnProperty.call(item, 'aggregatedOutput')
    || Object.prototype.hasOwnProperty.call(item, 'status');
  const output = Object.prototype.hasOwnProperty.call(options, 'output')
    ? options.output
    : (item.output ?? item.result ?? item.error ?? item.aggregatedOutput ?? item.status);
  writeEntry({
    ...base,
    url: options.url || `codex://tool/${encodeURIComponent(name)}`,
    method: options.method || 'TOOL',
    body: {
      tool_name: name,
      tool_input: parseMaybeJson(input),
      _callId: item.call_id || item.callId || item.id,
      _threadId: state.threadId,
      _turnId: state.turnId,
      _itemType: item.type,
      status: item.status,
      raw_item: item,
    },
    response: hasOutput ? {
      status: item.error || item.status === 'failed' ? 500 : 200,
      statusText: item.error || item.status === 'failed' ? 'Error' : 'OK',
      headers: {},
      body: {
        output,
        status: item.status,
        exit_code: item.exitCode,
        duration_ms: item.durationMs,
      },
    } : null,
    duration: item.durationMs || 0,
    mainAgent: false,
    subAgent: identity.subAgent,
    ...(identity.subAgent ? {
      subAgentName: identity.subAgentName,
      teamName: identity.teamName,
    } : {}),
    _agentThreadId: state.threadId,
    ...(identity._parentThreadId ? { _parentThreadId: identity._parentThreadId } : {}),
  });
}

const APPROVAL_SERVER_REQUEST_METHODS = new Set([
  'item/commandExecution/requestApproval',
  'item/fileChange/requestApproval',
  'item/permissions/requestApproval',
  'applyPatchApproval',
  'execCommandApproval',
]);

function describeServerRequest(method, params = {}) {
  if (method === 'item/commandExecution/requestApproval') {
    return {
      kind: 'approval',
      name: 'shell_command',
      input: {
        command: params.command,
        cwd: params.cwd,
        reason: params.reason,
        environmentId: params.environmentId,
        approvalId: params.approvalId,
        commandActions: params.commandActions,
        networkApprovalContext: params.networkApprovalContext,
        proposedExecpolicyAmendment: params.proposedExecpolicyAmendment,
        proposedNetworkPolicyAmendments: params.proposedNetworkPolicyAmendments,
      },
    };
  }
  if (method === 'execCommandApproval') {
    return {
      kind: 'approval',
      name: 'shell_command',
      input: {
        command: Array.isArray(params.command) ? params.command.join(' ') : params.command,
        cwd: params.cwd,
        reason: params.reason,
        approvalId: params.approvalId,
        parsedCmd: params.parsedCmd,
      },
    };
  }
  if (method === 'item/fileChange/requestApproval') {
    return {
      kind: 'approval',
      name: 'apply_patch',
      input: {
        reason: params.reason,
        grantRoot: params.grantRoot,
      },
    };
  }
  if (method === 'applyPatchApproval') {
    return {
      kind: 'approval',
      name: 'apply_patch',
      input: {
        fileChanges: params.fileChanges,
        reason: params.reason,
        grantRoot: params.grantRoot,
      },
    };
  }
  if (method === 'item/permissions/requestApproval') {
    return {
      kind: 'approval',
      name: 'permissions',
      input: {
        cwd: params.cwd,
        reason: params.reason,
        permissions: params.permissions,
        environmentId: params.environmentId,
      },
    };
  }
  if (method === 'mcpServer/elicitation/request') {
    return {
      kind: 'elicitation',
      name: params.serverName ? `${params.serverName}.elicitation` : 'mcp.elicitation',
      input: {
        mode: params.mode,
        message: params.message,
        requestedSchema: params.requestedSchema,
        url: params.url,
        elicitationId: params.elicitationId,
        _meta: params._meta,
      },
    };
  }
  if (method === 'item/tool/call') {
    return {
      kind: 'dynamicToolCall',
      name: params.namespace ? `${params.namespace}.${params.tool || 'tool'}` : (params.tool || 'dynamic_tool'),
      input: params.arguments ?? {},
    };
  }
  return null;
}

function writeServerRequestEntry(base, state, requestId, method, params, descriptor) {
  const identity = getAgentIdentity(state.threadId);
  const kind = descriptor?.kind || 'serverRequest';
  const name = descriptor?.name || method;
  const input = descriptor?.input ?? params;
  writeEntry({
    ...base,
    url: `codex://server_request/${encodeURIComponent(method)}/${encodeURIComponent(String(requestId))}`,
    method: APPROVAL_SERVER_REQUEST_METHODS.has(method) ? 'APPROVAL_REQUEST' : 'SERVER_REQUEST',
    body: {
      server_request_method: method,
      server_request_id: requestId,
      server_request_kind: kind,
      tool_name: name,
      tool_input: parseMaybeJson(input) || {},
      _threadId: state.threadId,
      _turnId: params.turnId || state.turnId,
      _itemId: params.itemId || params.callId,
      raw_params: cloneJson(params),
    },
    response: null,
    duration: 0,
    mainAgent: false,
    subAgent: identity.subAgent,
    ...(identity.subAgent ? {
      subAgentName: identity.subAgentName,
      teamName: identity.teamName,
    } : {}),
    _agentThreadId: state.threadId,
    ...(identity._parentThreadId ? { _parentThreadId: identity._parentThreadId } : {}),
  });
}

function writeServerRequestResolutionEntry(pending, msg) {
  const state = getThreadState(pending.threadId);
  const identity = getAgentIdentity(state.threadId);
  const isError = !!msg.error;
  writeEntry({
    timestamp: new Date().toISOString(),
    project: _currentProject || 'codex',
    url: `codex://server_request_response/${encodeURIComponent(pending.method)}/${encodeURIComponent(String(pending.requestId))}`,
    method: 'SERVER_RESPONSE',
    headers: {},
    body: {
      server_request_method: pending.method,
      server_request_id: pending.requestId,
      server_request_kind: pending.kind,
      tool_name: pending.name,
      _threadId: state.threadId,
      _turnId: pending.turnId || state.turnId,
      _itemId: pending.itemId,
    },
    response: {
      status: isError ? 500 : 200,
      statusText: isError ? 'Error' : 'OK',
      headers: {},
      body: isError ? cloneJson(msg.error) : cloneJson(msg.result),
    },
    duration: 0,
    mainAgent: false,
    subAgent: identity.subAgent,
    ...(identity.subAgent ? {
      subAgentName: identity.subAgentName,
      teamName: identity.teamName,
    } : {}),
    _agentThreadId: state.threadId,
    ...(identity._parentThreadId ? { _parentThreadId: identity._parentThreadId } : {}),
  });
}

function appendToolUse(state, id, name, input) {
  pushContentBlock(state.pendingContent, {
    type: 'tool_use',
    id: id || name || 'tool',
    name: name || 'tool',
    input: parseMaybeJson(input) || {},
  });
}

function upsertToolUse(state, id, name, input) {
  if (!state || !id) return;
  const existing = state.pendingContent.find(block => block?.type === 'tool_use' && block.id === id);
  if (existing) {
    existing.name = name || existing.name;
    existing.input = parseMaybeJson(input) || {};
    return;
  }
  appendToolUse(state, id, name, input);
}

function normalizeRequestUserInputQuestions(questions = []) {
  if (!Array.isArray(questions)) return [];
  return questions
    .filter(q => q && typeof q === 'object')
    .map(q => ({
      ...(q.id ? { id: q.id } : {}),
      header: q.header || '',
      question: q.question || q.id || '',
      ...(q.isOther ? { isOther: true } : {}),
      ...(q.isSecret ? { isSecret: true } : {}),
      options: Array.isArray(q.options)
        ? q.options.map(opt => ({
          label: String(opt?.label ?? ''),
          description: opt?.description || '',
        }))
        : [],
    }));
}

function mcpElicitationOptions(schema = {}) {
  if (Array.isArray(schema.oneOf)) {
    return schema.oneOf.map(opt => ({
      label: String(opt?.title ?? opt?.const ?? ''),
      description: opt?.title && opt?.const != null && opt.title !== opt.const ? String(opt.const) : '',
      value: opt?.const,
    }));
  }
  if (Array.isArray(schema.enum)) {
    return schema.enum.map((value, index) => ({
      label: String(schema.enumNames?.[index] ?? value),
      description: schema.enumNames?.[index] ? String(value) : '',
      value,
    }));
  }
  return [];
}

function mcpElicitationArrayOptions(schema = {}) {
  const items = schema.items || {};
  if (Array.isArray(items.anyOf)) {
    return items.anyOf.map(opt => ({
      label: String(opt?.title ?? opt?.const ?? ''),
      description: opt?.title && opt?.const != null && opt.title !== opt.const ? String(opt.const) : '',
      value: opt?.const,
    }));
  }
  if (Array.isArray(items.enum)) {
    return items.enum.map(value => ({ label: String(value), description: '', value }));
  }
  return [];
}

function questionTextFromMcpField(params, key, schema = {}) {
  const label = schema.title || key;
  const description = schema.description ? `\n${schema.description}` : '';
  return [params.message, `${label}${description}`].filter(Boolean).join('\n\n');
}

function normalizeMcpElicitationQuestions(params = {}) {
  const header = params.serverName ? `${params.serverName} MCP` : 'MCP elicitation';
  if (params.mode === 'form' && params.requestedSchema?.properties) {
    return Object.entries(params.requestedSchema.properties)
      .filter(([, schema]) => schema && typeof schema === 'object')
      .map(([key, schema]) => {
        const isMulti = schema.type === 'array';
        const options = isMulti ? mcpElicitationArrayOptions(schema) : mcpElicitationOptions(schema);
        const booleanOptions = schema.type === 'boolean'
          ? [
            { label: 'true', description: '' },
            { label: 'false', description: '' },
          ]
          : [];
        return {
          id: key,
          header,
          question: questionTextFromMcpField(params, key, schema),
          ...(isMulti ? { multiSelect: true } : {}),
          options: options.length ? options : booleanOptions,
          mcpSchema: cloneJson(schema),
        };
      });
  }
  return [{
    id: params.elicitationId || 'mcp-elicitation',
    header,
    question: [params.message, params.url].filter(Boolean).join('\n\n'),
    options: [],
    mcpMode: params.mode,
    requestedSchema: cloneJson(params.requestedSchema),
  }];
}

function answerTextValue(answer) {
  if (Array.isArray(answer?.answers)) return answer.answers.join(', ');
  if (Array.isArray(answer)) return answer.join(', ');
  if (typeof answer === 'string') return answer;
  if (answer && typeof answer === 'object' && typeof answer.answer === 'string') return answer.answer;
  return stringifyValue(answer);
}

function quoteAskField(value) {
  return String(value ?? '').replace(/"/g, "'");
}

function formatAskUserInputResult(pending, result = {}) {
  const answers = result.answers || {};
  const questionById = new Map((pending.questions || []).map(q => [q.id || q.question, q]));
  return Object.entries(answers).map(([id, answer]) => {
    const q = questionById.get(id) || {};
    const question = q.question || id;
    return `"${quoteAskField(question)}"="${quoteAskField(answerTextValue(answer))}"`;
  }).join('\n');
}

function answerLabelForQuestion(question, answer) {
  if (!question?.options?.length) return answerTextValue(answer);
  const values = Array.isArray(answer) ? answer : [answer];
  return values.map(value => {
    const match = question.options.find(opt => opt.value === value || opt.label === value);
    return match?.label || answerTextValue(value);
  }).join(', ');
}

function formatMcpElicitationResult(pending, result = {}) {
  const action = result.action || null;
  if (action && action !== 'accept') return `[mcp:${action}]`;
  const content = result.content && typeof result.content === 'object' ? result.content : {};
  const questionById = new Map((pending.questions || []).map(q => [q.id || q.question, q]));
  const lines = Object.entries(content).map(([id, answer]) => {
    const q = questionById.get(id) || {};
    const question = q.question || id;
    return `"${quoteAskField(question)}"="${quoteAskField(answerLabelForQuestion(q, answer))}"`;
  });
  if (lines.length > 0) return lines.join('\n');
  return action ? `action=${action}` : stringifyValue(result);
}

function buildCodexTurnPlanInput(planUpdate) {
  return {
    plan: formatTurnPlan(planUpdate),
    allowedPrompts: [],
    codexTurnPlan: true,
    nonInteractive: true,
    turnPlan: cloneJson(planUpdate),
  };
}

function buildCodexPlanItemInput(item) {
  return {
    plan: item?.text || '',
    allowedPrompts: [],
    codexTurnPlan: true,
    nonInteractive: true,
    planItem: cloneJson(item),
  };
}

function completeToolLikeItem(base, state, item, options = {}) {
  const id = item.call_id || item.callId || item.id || options.id || options.name || item.type;
  const name = options.name || item.tool || item.name || item.type || 'tool';
  const input = options.input ?? item.arguments ?? item.input ?? item.action ?? {};
  const output = Object.prototype.hasOwnProperty.call(options, 'output')
    ? options.output
    : (item.output ?? item.result ?? item.error ?? item.aggregatedOutput ?? item.status ?? item);
  appendToolUse(state, id, name, input);
  writeToolEntry(base, state, item, { ...options, name, input, output });
  flushAssistantContent(state);
  appendToolResultMessage(state, id, output);
}

function handleCompletedItem(item, state, base) {
  if (!item || typeof item !== 'object') return;
  const type = item.type;
  const id = itemKey(item);
  if (id) state.completedItemIds.add(id);

  if (type === 'userMessage') {
    appendUserMessage(state, item.content || [], item.clientId || item.id, { dedupeLastUser: true });
    return;
  }

  if (type === 'message' || type === 'agentMessage' || type === 'agent_message') {
    const text = item.text || textFromContent(item.content) || state.agentMessageDeltas.get(item.id) || '';
    pushContentBlock(state.pendingContent, { type: 'text', text });
    return;
  }

  if (type === 'plan') {
    const text = item.text || state.planDeltas.get(item.id) || '';
    upsertToolUse(state, item.id || `codex-plan:${state.turnId || state.threadId || 'turn'}`, CODEX_PLAN_TOOL_NAME, buildCodexPlanItemInput({ ...item, text }));
    return;
  }

  if (type === 'reasoning') {
    const fromItem = textFromContent(item.summary || []) || textFromContent(item.content || []);
    const thinking = fromItem || state.reasoningDeltas.get(item.id) || '';
    pushContentBlock(state.pendingContent, { type: 'thinking', thinking, summary: item.summary });
    return;
  }

  if (type === 'function_call' || type === 'custom_tool_call' || type === 'local_shell_call' || type === 'tool_search_call') {
    const input = item.arguments ?? item.input ?? item.action ?? {};
    const name = item.name || item.tool || (type === 'local_shell_call' ? 'local_shell' : type);
    appendToolUse(state, item.call_id || item.id, name, input);
    writeToolEntry(base, state, item, { name, input });
    return;
  }

  if (type === 'function_call_output' || type === 'custom_tool_call_output') {
    const id = item.call_id || item.callId || item.id;
    flushAssistantContent(state);
    appendToolResultMessage(state, id, item.output);
    writeToolEntry(base, state, item, {
      method: 'TOOL_RESULT',
      url: `codex://tool_result/${encodeURIComponent(id || '')}`,
      name: type,
      input: { _callId: id },
      output: item.output,
    });
    return;
  }

  if (type === 'commandExecution' || type === 'command_execution') {
    const output = item.aggregatedOutput
      ?? item.aggregated_output
      ?? state.commandOutputDeltas.get(item.id)
      ?? (item.processId ? state.commandExecOutputDeltas.get(item.processId) : null)
      ?? item.status;
    const terminalInteractions = state.terminalInteractions.get(item.id) || [];
    const exitCode = item.exitCode ?? item.exit_code;
    completeToolLikeItem(base, state, item, {
      name: 'shell_command',
      input: {
        command: item.command,
        cwd: item.cwd,
        source: item.source,
        commandActions: item.commandActions,
      },
      output: {
        output,
        status: item.status,
        exitCode,
        ...(terminalInteractions.length ? { terminal_interactions: terminalInteractions } : {}),
      },
    });
    return;
  }

  if (type === 'fileChange' || type === 'file_change') {
    const deltaOutput = state.fileChangeOutputDeltas.get(item.id);
    const changes = (Array.isArray(item.changes) && item.changes.length > 0)
      ? item.changes
      : (state.fileChangePatches.get(item.id) || item.changes || []);
    completeToolLikeItem(base, state, item, {
      name: 'apply_patch',
      input: { changes },
      output: { status: item.status, changes, ...(deltaOutput ? { output: deltaOutput } : {}) },
    });
    return;
  }

  if (type === 'mcpToolCall' || type === 'mcp_tool_call') {
    const progress = state.mcpProgressMessages.get(item.id);
    const resultOutput = item.error || item.result || item.status;
    completeToolLikeItem(base, state, item, {
      name: item.server ? `${item.server}.${item.tool}` : item.tool,
      input: item.arguments,
      output: progress?.length ? {
        progress,
        result: item.result,
        error: item.error,
        status: item.status,
      } : resultOutput,
      url: `codex://mcp_tool/${encodeURIComponent(item.tool || item.id || '')}`,
    });
    return;
  }

  if (type === 'dynamicToolCall') {
    completeToolLikeItem(base, state, item, {
      name: item.namespace ? `${item.namespace}.${item.tool}` : item.tool,
      input: item.arguments,
      output: item.contentItems || item.success || item.status,
      url: `codex://dynamic_tool/${encodeURIComponent(item.tool || item.id || '')}`,
    });
    return;
  }

  if (type === 'webSearch' || type === 'web_search') {
    completeToolLikeItem(base, state, item, {
      name: 'web_search',
      input: { query: item.query, action: item.action },
      output: item.action || item.query,
      url: 'codex://tool/web_search',
    });
    return;
  }

  if (type === 'todoList' || type === 'todo_list') {
    const text = (Array.isArray(item.items) ? item.items : [])
      .map(todo => `${todo.completed ? '[x]' : '[ ]'} ${todo.text || ''}`.trim())
      .filter(Boolean)
      .join('\n');
    pushContentBlock(state.pendingContent, { type: 'text', text });
    return;
  }

  if (type === 'error') {
    const text = item.message ? `Error: ${item.message}` : '';
    pushContentBlock(state.pendingContent, { type: 'text', text });
    return;
  }

  if (type === 'imageView') {
    completeToolLikeItem(base, state, item, {
      name: 'view_image',
      input: { path: item.path },
      output: item.path,
      url: 'codex://tool/view_image',
    });
    return;
  }

  if (type === 'collabAgentToolCall' || type === 'collabToolCall') {
    registerCollabAgentThreads(item, state.threadId);
    completeToolLikeItem(base, state, item, {
      name: item.tool || 'spawn_agent',
      input: {
        prompt: item.prompt,
        model: item.model,
        receiverThreadIds: item.receiverThreadIds,
        receiverThreadId: item.receiverThreadId,
        newThreadId: item.newThreadId,
        reasoningEffort: item.reasoningEffort,
      },
      output: {
        status: item.status,
        agentsStates: item.agentsStates,
        receiverThreadIds: item.receiverThreadIds,
        receiverThreadId: item.receiverThreadId,
        newThreadId: item.newThreadId,
      },
      url: `codex://collab/${encodeURIComponent(item.tool || 'agent')}`,
    });
    return;
  }

  if (type === 'subAgentActivity') {
    rememberSubAgentThread(item.agentThreadId, {
      parentThreadId: state.threadId,
      agentPath: item.agentPath,
      agentRole: item.kind,
    });
    writeToolEntry(base, state, item, {
      method: 'SUBAGENT',
      url: `codex://subagent/${encodeURIComponent(item.kind || 'activity')}`,
      name: item.kind || 'subAgentActivity',
      input: { agentThreadId: item.agentThreadId, agentPath: item.agentPath },
      output: item.kind,
    });
    return;
  }

  if (type === 'sleep' || type === 'imageGeneration' || type === 'contextCompaction' || type === 'compacted' || type === 'enteredReviewMode' || type === 'exitedReviewMode') {
    writeToolEntry(base, state, item, {
      method: 'EVENT',
      url: `codex://event/${encodeURIComponent(type)}`,
      name: type,
      input: item,
      output: item.status || item.review || item,
    });
  }
}

function flushSnapshotItemsAtTurnEnd(state, base) {
  if (!state?.itemOrder?.length) return;
  for (const id of state.itemOrder) {
    if (state.completedItemIds.has(id)) continue;
    const item = state.itemSnapshots.get(id);
    if (!canFlushSnapshotAtTurnEnd(item)) continue;
    handleCompletedItem(item, state, base);
  }
}

function timestampFromTurn(turn) {
  const seconds = turn?.completedAt ?? turn?.startedAt;
  return typeof seconds === 'number' && Number.isFinite(seconds)
    ? new Date(seconds * 1000).toISOString()
    : new Date().toISOString();
}

function resetTurnItemState(state) {
  state.pendingContent = [];
  state.itemSnapshots = new Map();
  state.itemOrder = [];
  state.completedItemIds = new Set();
  state.turnPlan = null;
  state.turnPlanToolId = null;
  state.turnDiff = null;
  state.turnModerationMetadata = null;
  state.modelReroutes = [];
  state.modelVerifications = [];
  state.safetyBuffering = null;
  state.warnings = [];
}

function hydrateHistoryTurn(thread, turn, responseResult = {}) {
  if (!thread?.id || !turn?.id || !Array.isArray(turn.items)) return;
  if (turn.status === 'inProgress') return;
  const state = getThreadState(thread.id);
  if (state.emittedTurnIds.has(turn.id)) return;

  state.threadId = thread.id;
  state.threadMeta = thread;
  state.cwd = responseResult.cwd || thread.cwd || state.cwd || _cwd;
  state.model = responseResult.model || state.model || _currentModel;
  state.turnId = turn.id;
  state.turnStatus = turn.status;
  state.turnStartTime = typeof turn.startedAt === 'number' ? turn.startedAt * 1000 : null;
  resetTurnItemState(state);
  syncGlobalsFromState(state);

  const base = {
    timestamp: timestampFromTurn(turn),
    project: _currentProject || 'codex',
    headers: {},
    isStream: false,
    _appServerSource: true,
    _codexHistorySource: true,
  };

  for (const item of turn.items) {
    handleCompletedItem(item, state, base);
  }
  flushSnapshotItemsAtTurnEnd(state, base);

  if (state.pendingContent.length > 0 || state.turnPlan || state.turnDiff) {
    const responseContent = state.pendingContent.length > 0
      ? state.pendingContent
      : (state.turnPlan ? [{ type: 'text', text: formatTurnPlan(state.turnPlan) }] : []);
    state.messages.push({ role: 'assistant', content: responseContent });
    emitMainAgentEntry(base.timestamp, responseContent, turn, state, {
      isStream: false,
      extra: { _codexHistorySource: true },
    });
    state.pendingContent = [];
  } else if (turn.status === 'failed' || turn.error) {
    writeEntry({
      ...base,
      url: 'codex://error',
      method: 'POST',
      body: buildFullRequestBody(state, state.threadId),
      response: {
        status: 500, statusText: 'Error', headers: {},
        body: { error: turn.error || turn },
      },
      duration: turn.durationMs || 0,
      ...getAgentIdentity(state.threadId),
      _codexRawRequest: buildRawCodexRequest(),
    });
  }

  state.emittedTurnIds.add(turn.id);
  syncGlobalsFromState(state);
}

function hydrateThreadTurnsFromResponse(thread, responseResult = {}) {
  if (!Array.isArray(thread?.turns) || thread.turns.length === 0) return;
  for (const turn of thread.turns) {
    hydrateHistoryTurn(thread, turn, responseResult);
  }
}

/**
 * 解析 app-server → client 的 JSON-RPC notification
 */
function parseServerMessage(msg) {
  if (!msg) return;
  captureRawServerFrame(msg);

  // 捕获 initialize response 中的服务端信息
  if (msg.id !== undefined && msg.result && !_serverInfo) {
    if (msg.result.userAgent || msg.result.codexHome) {
      _serverInfo = {
        userAgent: msg.result.userAgent,
        codexHome: msg.result.codexHome,
        platform: msg.result.platformFamily,
        os: msg.result.platformOs,
      };
    }
  }

  if (msg.id !== undefined && msg.result) {
    rememberThreadResponse(msg.result);
  }

  if (!msg.method) return; // 只处理 notifications（有 method）

  const params = msg.params || {};
  const ts = new Date().toISOString();
  const method = msg.method;

  // thread/started — 捕获线程元数据；parentThreadId/source/threadSource 用于识别 subAgent
  if (method === 'thread/started') {
    rememberThread(params.thread || {});
    return;
  }

  const threadId = params.threadId
    || params.conversationId
    || params.thread?.id
    || params.turn?.threadId
    || params.item?.threadId
    || _threadId
    || _mainThreadId;
  const state = getThreadState(threadId);
  syncGlobalsFromState(state);

  const base = {
    timestamp: ts,
    project: _currentProject || 'codex',
    headers: {},
    isStream: false,
    _appServerSource: true,
  };

  // Server requests with an id are part of the app-server protocol as well.
  // For transcript purposes, preserve the question-card input shape consumed
  // by ChatView, but keep the Codex-native tool name in new app-server logs.
  if (msg.id !== undefined && msg.id !== null) {
    if (method === 'item/tool/requestUserInput') {
      const questions = normalizeRequestUserInputQuestions(params.questions || []);
      const toolId = params.itemId || `request-user-input-${msg.id}`;
      upsertToolUse(state, toolId, CODEX_ASK_TOOL_NAME, {
        questions,
        autoResolutionMs: params.autoResolutionMs ?? null,
        codexRequestUserInput: true,
      });
      _pendingServerRequests.set(String(msg.id), {
        kind: 'requestUserInput',
        threadId: state.threadId,
        turnId: params.turnId || state.turnId,
        itemId: toolId,
        questions,
      });
    }
    if (method === 'mcpServer/elicitation/request') {
      const questions = normalizeMcpElicitationQuestions(params);
      const toolId = params.elicitationId || `mcp-elicitation-${msg.id}`;
      upsertToolUse(state, toolId, CODEX_ASK_TOOL_NAME, {
        questions,
        codexMcpElicitation: true,
        mode: params.mode,
        serverName: params.serverName,
        requestedSchema: cloneJson(params.requestedSchema),
        url: params.url,
        elicitationId: params.elicitationId,
      });
      _pendingServerRequests.set(String(msg.id), {
        kind: 'mcpElicitation',
        threadId: state.threadId,
        turnId: params.turnId || state.turnId,
        itemId: toolId,
        questions,
      });
    }
    const descriptor = describeServerRequest(method, params);
    if (descriptor) {
      writeServerRequestEntry(base, state, msg.id, method, params, descriptor);
      const previous = _pendingServerRequests.get(String(msg.id)) || {};
      _pendingServerRequests.set(String(msg.id), {
        ...previous,
        kind: previous.kind || descriptor.kind,
        method,
        requestId: msg.id,
        threadId: previous.threadId || state.threadId,
        turnId: previous.turnId || params.turnId || state.turnId,
        itemId: previous.itemId || params.itemId || params.callId,
        name: descriptor.name,
      });
    }
    return;
  }

  // turn/started — 捕获 turn 元数据
  if (method === 'turn/started') {
    state.turnStartTime = Date.now();
    state.pendingContent = [];
    state.turnId = params.turn?.id || params.turnId || state.turnId;
    state.turnStatus = params.turn?.status || 'inProgress';
    state.turnPlan = null;
    state.turnPlanToolId = null;
    state.turnDiff = null;
    state.turnModerationMetadata = null;
    state.modelReroutes = [];
    state.modelVerifications = [];
    state.safetyBuffering = null;
    state.warnings = [];
    state.itemSnapshots = new Map();
    state.itemOrder = [];
    state.completedItemIds = new Set();
    if (params.threadId && params.threadId !== state.threadId) {
      state.threadId = params.threadId;
    }
    syncGlobalsFromState(state);
    return;
  }

  // turn/completed — 发出根线程或 subAgent 的完整 turn entry
  if (method === 'turn/completed') {
    const turn = params.turn || {};
    state.turnStatus = turn.status;
    if (turn.id && state.emittedTurnIds.has(turn.id)) {
      state.pendingContent = [];
      syncGlobalsFromState(state);
      resetRawTurnFrames();
      _turnActive = false;
      return;
    }
    flushSnapshotItemsAtTurnEnd(state, base);
    if (state.pendingContent.length > 0 || state.turnPlan || state.turnDiff) {
      const responseContent = state.pendingContent.length > 0
        ? state.pendingContent
        : (state.turnPlan ? [{ type: 'text', text: formatTurnPlan(state.turnPlan) }] : []);
      state.messages.push({ role: 'assistant', content: responseContent });
      emitMainAgentEntry(ts, responseContent, turn, state);
      state.pendingContent = [];
    } else if (turn.status === 'failed' || turn.error) {
      writeEntry({
        ...base,
        url: 'codex://error',
        method: 'POST',
        body: buildFullRequestBody(state, state.threadId),
        response: {
          status: 500, statusText: 'Error', headers: {},
          body: { error: turn.error || params.error || turn },
        },
        duration: turn.durationMs || (state.turnStartTime ? Date.now() - state.turnStartTime : 0),
        ...getAgentIdentity(state.threadId),
        _appServerSource: true,
        _codexRawRequest: buildRawCodexRequest(),
      });
    }
    if (turn.id) state.emittedTurnIds.add(turn.id);
    syncGlobalsFromState(state);
    resetRawTurnFrames();
    _turnActive = false;
    return;
  }

  // thread/tokenUsage/updated — 缓存 token usage（供 emitMainAgentEntry 使用）
  if (method === 'thread/tokenUsage/updated' || method === 'thread/tokenUsageUpdated') {
    state.lastTokenUsage = params.tokenUsage || null;
    syncGlobalsFromState(state);
    return;
  }

  if (method === 'item/started') {
    const item = params.item || {};
    rememberItemSnapshot(state, item);
    if (item.type === 'collabAgentToolCall' || item.type === 'collabToolCall') {
      registerCollabAgentThreads(item, state.threadId);
    }
    if (item.type === 'subAgentActivity') {
      rememberSubAgentThread(item.agentThreadId, {
        parentThreadId: state.threadId,
        agentPath: item.agentPath,
        agentRole: item.kind,
      });
    }
    return;
  }

  if (method === 'item/updated' || method === 'rawResponseItem/updated' || method === 'rawResponseItemUpdated' || method === 'itemUpdated') {
    rememberItemSnapshot(state, params.item || {});
    syncGlobalsFromState(state);
    return;
  }

  // item/completed — ResponseItem 完成（包含 message、function_call、function_call_output、reasoning 等）
  if (method === 'item/completed' || method === 'rawResponseItem/completed' || method === 'rawResponseItemCompleted') {
    const item = rememberItemSnapshot(state, params.item || {});
    handleCompletedItem(item, state, base);
    syncGlobalsFromState(state);
    return;
  }

  // item/* deltas — 用于 final item 缺失完整字段时兜底重建
  if (method === 'item/agentMessage/delta' || method === 'agentMessage/delta' || method === 'agentMessageDelta') {
    const itemId = params.itemId || params.item?.id || 'agentMessage';
    state.agentMessageDeltas.set(itemId, (state.agentMessageDeltas.get(itemId) || '') + (params.delta || ''));
    return;
  }

  if (method === 'item/plan/delta') {
    const itemId = params.itemId || 'plan';
    state.planDeltas.set(itemId, (state.planDeltas.get(itemId) || '') + (params.delta || ''));
    return;
  }

  if (method === 'item/reasoning/summaryTextDelta' || method === 'item/reasoning/textDelta') {
    const itemId = params.itemId || 'reasoning';
    state.reasoningDeltas.set(itemId, (state.reasoningDeltas.get(itemId) || '') + (params.delta || ''));
    return;
  }

  if (method === 'item/commandExecution/outputDelta') {
    const itemId = params.itemId || 'commandExecution';
    state.commandOutputDeltas.set(itemId, (state.commandOutputDeltas.get(itemId) || '') + (params.delta || ''));
    return;
  }

  if (method === 'item/commandExecution/terminalInteraction') {
    const itemId = params.itemId || 'commandExecution';
    const list = state.terminalInteractions.get(itemId) || [];
    list.push({
      processId: params.processId,
      stdin: params.stdin,
    });
    state.terminalInteractions.set(itemId, list);
    return;
  }

  if (method === 'command/exec/outputDelta') {
    const processId = params.processId;
    if (processId) {
      const delta = decodeBase64Text(params.deltaBase64);
      state.commandExecOutputDeltas.set(processId, (state.commandExecOutputDeltas.get(processId) || '') + delta);
    }
    return;
  }

  if (method === 'process/outputDelta') {
    rememberProcessOutput(state, params);
    return;
  }

  if (method === 'process/exited') {
    const processHandle = params.processHandle;
    const output = state.processOutputDeltas.get(processHandle) || {};
    const stdout = params.stdout || output.stdout || '';
    const stderr = params.stderr || output.stderr || '';
    writeEventEntry(base, state, 'process.exited', {
      processHandle,
    }, {
      method: 'PROCESS',
      url: `codex://process/${encodeURIComponent(processHandle || 'spawn')}`,
      output: {
        exitCode: params.exitCode,
        stdout,
        stderr,
        stdoutCapReached: !!(params.stdoutCapReached || output.stdoutCapReached),
        stderrCapReached: !!(params.stderrCapReached || output.stderrCapReached),
      },
      status: params.exitCode === 0 ? 200 : 500,
      statusText: params.exitCode === 0 ? 'OK' : 'Error',
    });
    if (processHandle) state.processOutputDeltas.delete(processHandle);
    return;
  }

  if (method === 'item/fileChange/outputDelta') {
    const itemId = params.itemId || 'fileChange';
    state.fileChangeOutputDeltas.set(itemId, (state.fileChangeOutputDeltas.get(itemId) || '') + (params.delta || ''));
    return;
  }

  if (method === 'item/fileChange/patchUpdated') {
    const itemId = params.itemId || 'fileChange';
    state.fileChangePatches.set(itemId, cloneJson(params.changes || []));
    return;
  }

  if (method === 'item/mcpToolCall/progress') {
    const itemId = params.itemId || 'mcpToolCall';
    const list = state.mcpProgressMessages.get(itemId) || [];
    if (params.message) list.push(params.message);
    state.mcpProgressMessages.set(itemId, list);
    return;
  }

  if (method === 'item/reasoning/summaryPartAdded') {
    return;
  }

  if (method === 'turn/plan/updated') {
    state.turnPlan = {
      plan: cloneJson(params.plan || []),
      explanation: params.explanation || null,
    };
    state.turnPlanToolId = `codex-turn-plan:${params.turnId || state.turnId || state.threadId || 'turn'}`;
    upsertToolUse(state, state.turnPlanToolId, CODEX_PLAN_TOOL_NAME, buildCodexTurnPlanInput(state.turnPlan));
    return;
  }

  if (method === 'turn/diff/updated') {
    state.turnDiff = params.diff || '';
    return;
  }

  if (method === 'turn/moderationMetadata') {
    state.turnModerationMetadata = cloneJson(params.metadata);
    writeEventEntry(base, state, 'turn.moderationMetadata', params, {
      url: 'codex://turn/moderationMetadata',
    });
    return;
  }

  if (method === 'model/rerouted') {
    state.modelReroutes.push(cloneJson(params));
    if (params.toModel) {
      state.model = params.toModel;
      _currentModel = params.toModel;
    }
    writeEventEntry(base, state, 'model.rerouted', params, {
      url: 'codex://model/rerouted',
    });
    return;
  }

  if (method === 'model/verification') {
    state.modelVerifications.push(cloneJson(params));
    writeEventEntry(base, state, 'model.verification', params, {
      url: 'codex://model/verification',
    });
    return;
  }

  if (method === 'model/safetyBuffering/updated') {
    state.safetyBuffering = cloneJson(params);
    writeEventEntry(base, state, 'model.safetyBuffering.updated', params, {
      url: 'codex://model/safetyBuffering',
    });
    return;
  }

  if (method === 'warning' || method === 'guardianWarning' || method === 'configWarning'
    || method === 'deprecationNotice' || method === 'windows/worldWritableWarning') {
    state.warnings.push({ method, ...cloneJson(params) });
    writeEventEntry(base, state, method.replace(/\//g, '.'), params, {
      url: `codex://warning/${encodeURIComponent(method)}`,
      status: 299,
      statusText: 'Warning',
    });
    return;
  }

  if (method === 'item/autoApprovalReview/started' || method === 'item/autoApprovalReview/completed') {
    writeEventEntry(base, state, method.replace(/\//g, '.'), params, {
      url: `codex://approval/${encodeURIComponent(params.reviewId || method)}`,
    });
    return;
  }

  if (method === 'serverRequest/resolved') {
    const pending = _pendingServerRequests.get(String(params.requestId));
    writeEventEntry(base, state, 'serverRequest.resolved', {
      ...params,
      ...(pending ? {
        pendingMethod: pending.method,
        pendingKind: pending.kind,
        pendingName: pending.name,
        pendingItemId: pending.itemId,
      } : {}),
    }, {
      url: `codex://server_request_resolved/${encodeURIComponent(String(params.requestId || 'unknown'))}`,
    });
    if (pending?.responded) {
      _pendingServerRequests.delete(String(params.requestId));
    }
    return;
  }

  if (method === 'hook/started' || method === 'hook/completed') {
    // Hook events are internal implementation details; suppressed from the log.
    return;
  }

  // error — 错误通知
  if (method === 'error') {
    writeEntry({
      ...base,
      url: 'codex://error',
      method: 'POST',
      body: buildFullRequestBody(state, state.threadId),
      response: {
        status: 500, statusText: 'Error', headers: {},
        body: { error: params.error || params },
      },
      duration: state.turnStartTime ? Date.now() - state.turnStartTime : 0,
      ...getAgentIdentity(state.threadId),
      _appServerSource: true,
      _codexRawRequest: buildRawCodexRequest(),
    });
    return;
  }
}

/**
 * 解析 client → server 的 JSON-RPC request（提取用户输入）
 */
function parseClientMessage(msg) {
  if (!msg) return;

  if (!msg.method) {
    captureRawClientFrame(msg);
    if (msg.id !== undefined && msg.id !== null) {
      const pending = _pendingServerRequests.get(String(msg.id));
      if (pending?.kind === 'requestUserInput' || pending?.kind === 'mcpElicitation') {
        if (!pending.responded) {
          const state = getThreadState(pending.threadId);
          appendToolResultMessage(
            state,
            pending.itemId,
            msg.error
              ? `[cx-viewer:cancel] ${msg.error.message || stringifyValue(msg.error)}`
              : (pending.kind === 'mcpElicitation'
                ? formatMcpElicitationResult(pending, msg.result || {})
                : formatAskUserInputResult(pending, msg.result || {}))
          );
          if (pending.kind === 'mcpElicitation' && pending.method) {
            writeServerRequestResolutionEntry(pending, msg);
          }
          pending.responded = true;
          pending.response = msg.error || msg.result || null;
          syncGlobalsFromState(state);
        }
      } else if (pending) {
        if (!pending.responded) {
          writeServerRequestResolutionEntry(pending, msg);
          pending.responded = true;
          pending.response = msg.error || msg.result || null;
          syncGlobalsFromState(getThreadState(pending.threadId));
        }
      }
    }
    return;
  }

  // turn/start — 用户发起新 turn（捕获完整上下文）
  if (msg.method === 'turn/start') {
    captureRawClientFrame(msg, { startNewTurn: true });
    const params = msg.params || {};
    _currentModel = params.model || _currentModel;
    const state = getThreadState(params.threadId || _threadId || _mainThreadId);
    state.model = params.model || state.model || _currentModel;
    state.turnStartTime = Date.now();
    state.pendingContent = [];
    state.threadId = params.threadId || state.threadId;
    state.cwd = params.cwd || state.cwd || _cwd;
    // 保存完整 turn 参数供 buildFullRequestBody 使用
    state.turnContext = {
      approvalPolicy: params.approvalPolicy,
      effort: params.effort,
      summary: params.summary,
      sandboxPolicy: params.sandboxPolicy,
      cwd: params.cwd,
      model: params.model,
      outputSchema: params.outputSchema,
      serviceTier: params.serviceTier,
      personality: params.personality,
      approvalsReviewer: params.approvalsReviewer,
    };
    appendUserMessage(state, params.input || [], params.clientUserMessageId);
    if (params.cwd) _cwd = params.cwd;
    syncGlobalsFromState(state);
    return;
  }

  // turn/steer — 同一 active turn 内追加用户输入，不开启新 turn
  if (msg.method === 'turn/steer') {
    captureRawClientFrame(msg);
    const params = msg.params || {};
    const state = getThreadState(params.threadId || _threadId || _mainThreadId);
    if (params.expectedTurnId) state.turnId = params.expectedTurnId;
    if (params.threadId && params.threadId !== state.threadId) {
      state.threadId = params.threadId;
    }
    flushAssistantContent(state);
    appendUserMessage(state, params.input || [], params.clientUserMessageId);
    syncGlobalsFromState(state);
    return;
  }

  // thread/start — 新会话
  if (msg.method === 'thread/start') {
    captureRawClientFrame(msg, { startNewSession: true });
    const params = msg.params || {};
    resetThreadRuntimeState();
    _cwd = params.cwd || _cwd;
    _currentProject = params.cwd ? basename(params.cwd) : _currentProject;
    _systemPrompt = _pickSystemPrompt(
      params.developerInstructions,
      params.baseInstructions,
      params.config?.developer_instructions,
      params.config?.instructions,
    );
    _messages = [];
    _pendingContent = [];
    _threadMeta = {};
    _turnContext = {};
    _threadId = null;
    _turnId = null;
    return;
  }

  captureRawClientFrame(msg);
}

export function _resetAppServerBridgeForTests({
  logFile = null,
  cwd = '/tmp/codex-project',
  project = 'codex-project',
  model = null,
  writeLogEntry = null,
} = {}) {
  _logFile = logFile;
  _writeLogEntry = typeof writeLogEntry === 'function' ? writeLogEntry : null;
  _currentModel = model;
  _currentProject = project;
  _cwd = cwd;
  _messages = [];
  _pendingContent = [];
  _threadId = null;
  _turnId = null;
  _serverInfo = null;
  _turnContext = {};
  _threadMeta = {};
  _systemPrompt = null;
  _lastTokenUsage = null;
  _turnStatus = null;
  resetThreadRuntimeState();
  resetRawSessionFrames();
  resetRawTurnFrames();
  _turnActive = false;
}

export function _parseAppServerClientMessageForTests(msg) {
  parseClientMessage(msg);
}

export function _injectApprovalsReviewerForTests(msg, value) {
  const previous = _approvalsReviewerOverride;
  if (value !== undefined) setApprovalsReviewer(value);
  const injected = injectApprovalsReviewer(msg);
  _approvalsReviewerOverride = previous;
  return injected;
}

export function _parseAppServerServerMessageForTests(msg) {
  parseServerMessage(msg);
}

export function _writeAppServerEntryForTests(entry) {
  writeEntry(entry);
}

/**
 * 启动 App-Server Bridge
 *
 * @param {object} options
 * @param {string} options.cwd - 工作目录
 * @param {string} options.codexPath - codex 二进制路径
 * @param {string} options.logFile - LOG_FILE 路径
 * @param {object} [options.env] - 环境变量
 * @returns {Promise<{ proxyPort: number, appServerPort: number, stop: Function }>}
 */
export async function startAppServerBridge(options) {
  const { cwd, codexPath, logFile, env = process.env, extraConfigArgs = [], onApprovalsReviewerActive = null, writeLogEntry = null } = options;
  _onApprovalsReviewerActive = typeof onApprovalsReviewerActive === 'function' ? onApprovalsReviewerActive : null;
  _writeLogEntry = typeof writeLogEntry === 'function' ? writeLogEntry : null;
  _logFile = logFile;
  _currentModel = null;
  _currentProject = cwd ? basename(cwd) : 'codex';
  _cwd = cwd;
  resetThreadRuntimeState();
  _messages = [];
  _pendingContent = [];
  _threadId = null;
  _turnId = null;
  _serverInfo = null;
  _turnContext = {};
  _threadMeta = {};
  _systemPrompt = null;
  _lastTokenUsage = null;
  _turnStatus = null;
  resetRawSessionFrames();
  resetRawTurnFrames();
  _turnActive = false;

  // 1. 找两个空闲端口
  const appServerPort = await findFreePort();
  const proxyPort = await findFreePort();

  // 2. 启动 codex app-server
  // The HTTP proxy is started by cli.js before calling us; the -c
  // openai_base_url=... flag in extraConfigArgs routes the app-server's model
  // traffic through it. Clear any stale OPENAI_BASE_URL from the environment
  // so it does not conflict with the -c override.
  const appEnv = { ...env };
  delete appEnv.OPENAI_BASE_URL;
  delete appEnv.CXV_ORIGINAL_BASE_URL;
  if (!appEnv.HTTPS_PROXY && !appEnv.HTTP_PROXY && !appEnv.https_proxy && !appEnv.http_proxy) {
    try {
      const shell = process.env.SHELL || '/bin/zsh';
      const funcBody = execSync(
        `${shell} -ic 'declare -f ${BINARY_NAME} 2>/dev/null || type ${BINARY_NAME} 2>/dev/null'`,
        { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
      );
      const proxyRe = /\b(HTTPS?_PROXY|https?_proxy|ALL_PROXY|all_proxy|NO_PROXY|no_proxy)=(\S+)/g;
      let m;
      while ((m = proxyRe.exec(funcBody)) !== null) {
        appEnv[m[1]] = m[2];
      }
    } catch {}
  }

  let command = codexPath;
  // extraConfigArgs (e.g. -c openai_base_url="...") redirect the app-server
  // child's model traffic through the cxv proxy. `-c` is a global Codex flag so
  // position relative to the `app-server` subcommand does not matter.
  let appServerArgs = [...extraConfigArgs, 'app-server', '--listen', `ws://127.0.0.1:${appServerPort}`];
  // npm 版 codex 是 .js 文件，需要 node 运行
  if (codexPath.endsWith('.js')) {
    command = process.execPath;
    appServerArgs = [codexPath, ...appServerArgs];
  }
  _appServerProcess = spawn(command, appServerArgs, {
    cwd,
    env: appEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  _appServerProcess.stdout.on('data', (data) => {
    if (process.env.CXV_DEBUG) process.stderr.write(`[app-server] ${data}`);
  });
  _appServerProcess.stderr.on('data', (data) => {
    if (process.env.CXV_DEBUG) process.stderr.write(`[app-server] ${data}`);
  });

  // 3. 等待就绪
  await waitForReady(`http://127.0.0.1:${appServerPort}/readyz`);

  // 4. 启动 WebSocket proxy server
  const httpServer = createServer((req, res) => {
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (clientWs) => {
    // 为每个 TUI 客户端连接创建到 app-server 的上游连接
    const upstream = new WebSocket(`ws://127.0.0.1:${appServerPort}`);
    _upstreamWs = upstream;
    const pendingQueue = []; // 上游未就绪时暂存的消息
    let upstreamReady = false;

    upstream.on('open', () => {
      upstreamReady = true;
      for (const m of pendingQueue) upstream.send(m);
      pendingQueue.length = 0;
    });

    // client → proxy → upstream
    clientWs.on('message', (data) => {
      const original = typeof data === 'string' ? data : data.toString();
      let str = original;
      try {
        const msg = injectApprovalsReviewer(JSON.parse(original));
        str = JSON.stringify(msg);
        parseClientMessage(msg);
        if (REVIEWER_LIFECYCLE_METHODS.has(msg.method)
            && isSupportedApprovalsReviewer(msg.params?.approvalsReviewer)) {
          _onApprovalsReviewerActive?.(normalizeApprovalsReviewer(msg.params.approvalsReviewer));
        }
      } catch {}

      if (upstreamReady) {
        upstream.send(str);
      } else {
        pendingQueue.push(str);
      }
    });

    // upstream → proxy → client（记录 server notifications）
    upstream.on('message', (data) => {
      const str = typeof data === 'string' ? data : data.toString();
      try {
        parseServerMessage(JSON.parse(str));
      } catch {}

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(str);
      }
    });

    // 清理
    clientWs.on('close', () => { upstream.close(); _upstreamWs = null; });
    upstream.on('close', () => clientWs.close());
    clientWs.on('error', () => upstream.close());
    upstream.on('error', () => clientWs.close());
  });

  await new Promise((resolve, reject) => {
    httpServer.listen(proxyPort, '127.0.0.1', () => resolve());
    httpServer.on('error', reject);
  });
  _proxyServer = httpServer;

  return {
    proxyPort,
    appServerPort,
    setApprovalsReviewer,
    stop() {
      _onApprovalsReviewerActive = null;
      _writeLogEntry = null;
      if (_proxyServer) { _proxyServer.close(); _proxyServer = null; }
      if (_upstreamWs) { _upstreamWs.close(); _upstreamWs = null; }
      if (_appServerProcess) { _appServerProcess.kill(); _appServerProcess = null; }
    },
  };
}
