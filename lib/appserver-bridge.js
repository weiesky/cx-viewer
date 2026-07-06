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

let _appServerProcess = null;
let _proxyServer = null;
let _upstreamWs = null;
let _logFile = null;
let _currentModel = null;
let _currentProject = null;
let _messages = [];       // 累积 messages 用于 MainAgent entry
let _pendingContent = []; // 当前 turn 的 assistant content blocks
let _turnStartTime = null;

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
    appendFileSync(_logFile, JSON.stringify(entry) + '\n---\n');
  } catch {}
}

/**
 * 构建完整的 request body（包含所有可用上下文）
 */
function buildFullRequestBody() {
  return {
    model: _currentModel,
    system: _systemPrompt || 'You are Codex',
    messages: _messages.map(m => ({ ...m })),
    tools: [{ name: 'Bash' }, { name: 'Edit' }, { name: 'Task' }],
    // turn/start 中的完整参数
    ...(_turnContext.approvalPolicy ? { approval_policy: _turnContext.approvalPolicy } : {}),
    ...(_turnContext.effort ? { reasoning_effort: _turnContext.effort } : {}),
    ...(_turnContext.summary ? { reasoning_summary: _turnContext.summary } : {}),
    ...(_turnContext.sandboxPolicy ? { sandbox_policy: _turnContext.sandboxPolicy } : {}),
    // 线程和 turn 元数据
    metadata: {
      thread_id: _threadId,
      turn_id: _turnId,
      cwd: _cwd || _currentProject,
      ...(_threadMeta.preview ? { thread_preview: _threadMeta.preview } : {}),
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
function buildFullResponseBody(responseContent, turnMeta) {
  const usage = _lastTokenUsage?.last;
  const totalUsage = _lastTokenUsage?.total;
  return {
    content: responseContent,
    model: _currentModel,
    stop_reason: _turnStatus || 'end_turn',
    ...(usage ? {
      usage: {
        input_tokens: usage.inputTokens || 0,
        output_tokens: usage.outputTokens || 0,
        cache_read_input_tokens: usage.cachedInputTokens || 0,
        reasoning_output_tokens: usage.reasoningOutputTokens || 0,
        total_tokens: usage.totalTokens || 0,
      },
    } : {}),
    ...(totalUsage ? {
      total_usage: {
        input_tokens: totalUsage.inputTokens || 0,
        output_tokens: totalUsage.outputTokens || 0,
        cache_read_input_tokens: totalUsage.cachedInputTokens || 0,
        reasoning_output_tokens: totalUsage.reasoningOutputTokens || 0,
        total_tokens: totalUsage.totalTokens || 0,
      },
    } : {}),
    ...(_lastTokenUsage?.modelContextWindow ? { context_window: _lastTokenUsage.modelContextWindow } : {}),
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
function emitMainAgentEntry(timestamp, responseContent, turnMeta) {
  const entry = {
    timestamp,
    project: _currentProject || 'codex',
    url: `codex://api/${_currentModel || 'codex'}`,
    method: 'POST',
    headers: {},
    body: buildFullRequestBody(),
    response: {
      status: 200,
      statusText: 'OK',
      headers: {},
      body: buildFullResponseBody(responseContent, turnMeta),
    },
    duration: turnMeta?.durationMs || (_turnStartTime ? Date.now() - _turnStartTime : 0),
    isStream: true,
    mainAgent: true,
    _appServerSource: true,
    _codexRawRequest: buildRawCodexRequest(),
  };
  writeEntry(entry);
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

  if (!msg.method) return; // 只处理 notifications（有 method）
  if (msg.id !== undefined && msg.id !== null) return; // 忽略 request responses

  const params = msg.params || {};
  const ts = new Date().toISOString();
  const base = {
    timestamp: ts,
    project: _currentProject || 'codex',
    headers: {},
    isStream: false,
    _appServerSource: true,
  };

  const method = msg.method;

  // thread/started — 捕获线程元数据
  if (method === 'thread/started') {
    const thread = params.thread || {};
    _threadId = thread.id;
    _threadMeta = thread;
    return;
  }

  // turn/started — 捕获 turn 元数据
  if (method === 'turn/started') {
    _turnStartTime = Date.now();
    _pendingContent = [];
    _turnId = params.turn?.id;
    _threadId = params.threadId || _threadId;
    return;
  }

  // turn/completed — 发出 MainAgent entry（带 turn 元数据和 token usage）
  if (method === 'turn/completed') {
    const turn = params.turn || {};
    _turnStatus = turn.status;
    if (_pendingContent.length > 0) {
      _messages.push({ role: 'assistant', content: _pendingContent });
      emitMainAgentEntry(ts, _pendingContent, turn);
      _pendingContent = [];
    }
    resetRawTurnFrames();
    _turnActive = false;
    return;
  }

  // thread/tokenUsageUpdated — 缓存 token usage（供 emitMainAgentEntry 使用）
  if (method === 'thread/tokenUsageUpdated') {
    _lastTokenUsage = params.tokenUsage || null;
    return;
  }

  // item/completed — ResponseItem 完成（包含 message、function_call、function_call_output、reasoning 等）
  if (method === 'item/completed' || method === 'rawResponseItem/completed' || method === 'rawResponseItemCompleted') {
    const item = params.item || {};
    const type = item.type;

    // userMessage — 用户输入（也通过 item/completed 到达）
    if (type === 'userMessage') {
      const content = item.content || [];
      for (const block of content) {
        if ((block.type === 'text' || block.type === 'input_text') && block.text) {
          _messages.push({ role: 'user', content: block.text });
        }
      }
      return;
    }

    // assistant text items: newer protocol uses `agentMessage`, older variants may use `message`
    if (type === 'message' || type === 'agentMessage') {
      if (typeof item.text === 'string' && item.text) {
        _pendingContent.push({ type: 'text', text: item.text });
      }
      const content = item.content || [];
      for (const block of content) {
        if (typeof block === 'string' && block) {
          _pendingContent.push({ type: 'text', text: block });
        } else if (block.type === 'output_text' || block.type === 'text') {
          _pendingContent.push({ type: 'text', text: block.text || '' });
        }
      }
      return;
    }

    // reasoning
    if (type === 'reasoning') {
      const text = (item.content || []).map(c => c.text || '').join('');
      if (text) {
        _pendingContent.push({ type: 'thinking', thinking: text, summary: item.summary });
      }
      return;
    }

    // function_call
    if (type === 'function_call') {
      let args = item.arguments;
      if (typeof args === 'string') {
        try { args = JSON.parse(args); } catch {}
      }
      _pendingContent.push({
        type: 'tool_use',
        id: item.call_id || item.id,
        name: item.name || 'unknown',
        input: args || {},
      });
      writeEntry({
        ...base,
        url: `codex://tool/${item.name || 'unknown'}`,
        method: 'TOOL',
        body: { tool_name: item.name, tool_input: args, _callId: item.call_id },
        response: null,
        duration: 0,
        mainAgent: false,
      });
      return;
    }

    // function_call_output
    if (type === 'function_call_output') {
      // Flush pending assistant content
      if (_pendingContent.length > 0) {
        _messages.push({ role: 'assistant', content: _pendingContent });
        _pendingContent = [];
      }
      _messages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: item.call_id,
          content: typeof item.output === 'string' ? item.output : JSON.stringify(item.output),
        }],
      });
      writeEntry({
        ...base,
        url: `codex://tool_result/${item.call_id || ''}`,
        method: 'TOOL_RESULT',
        body: { _callId: item.call_id },
        response: {
          status: 200, statusText: 'OK', headers: {},
          body: { output: item.output },
        },
        duration: 0,
        mainAgent: false,
      });
      return;
    }

    // custom_tool_call (MCP)
    if (type === 'custom_tool_call') {
      _pendingContent.push({
        type: 'tool_use',
        id: item.call_id || item.id,
        name: item.name || 'unknown',
        input: item.input || {},
      });
      writeEntry({
        ...base,
        url: `codex://mcp_tool/${item.name || 'unknown'}`,
        method: 'TOOL',
        body: { tool_name: item.name, tool_input: item.input, _callId: item.call_id, _source: 'mcp' },
        response: null,
        duration: 0,
        mainAgent: false,
      });
      return;
    }

    // custom_tool_call_output
    if (type === 'custom_tool_call_output') {
      if (_pendingContent.length > 0) {
        _messages.push({ role: 'assistant', content: _pendingContent });
        _pendingContent = [];
      }
      _messages.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: item.call_id, content: typeof item.output === 'string' ? item.output : JSON.stringify(item.output) }],
      });
      writeEntry({
        ...base,
        url: `codex://mcp_tool_result/${item.call_id || ''}`,
        method: 'TOOL_RESULT',
        body: { _callId: item.call_id },
        response: { status: 200, statusText: 'OK', headers: {}, body: { output: item.output } },
        duration: 0,
        mainAgent: false,
      });
      return;
    }
  }

  // agentMessage/delta or agentMessageDelta — 流式文本（可选记录）
  if (method === 'agentMessage/delta' || method === 'agentMessageDelta') {
    return;
  }

  // error — 错误通知
  if (method === 'error') {
    writeEntry({
      ...base,
      url: 'codex://error',
      method: 'POST',
      body: buildFullRequestBody(),
      response: {
        status: 500, statusText: 'Error', headers: {},
        body: { error: params.error || params },
      },
      duration: _turnStartTime ? Date.now() - _turnStartTime : 0,
      mainAgent: true,
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
  if (!msg || !msg.method) return;

  // turn/start — 用户发起新 turn（捕获完整上下文）
  if (msg.method === 'turn/start') {
    captureRawClientFrame(msg, { startNewTurn: true });
    const params = msg.params || {};
    _currentModel = params.model || _currentModel;
    _turnStartTime = Date.now();
    _pendingContent = [];
    _threadId = params.threadId || _threadId;
    // 保存完整 turn 参数供 buildFullRequestBody 使用
    _turnContext = {
      approvalPolicy: params.approvalPolicy,
      effort: params.effort,
      summary: params.summary,
      sandboxPolicy: params.sandboxPolicy,
      cwd: params.cwd,
      model: params.model,
      outputSchema: params.outputSchema,
    };
    if (params.cwd) _cwd = params.cwd;
    return;
  }

  // thread/start — 新会话
  if (msg.method === 'thread/start') {
    captureRawClientFrame(msg, { startNewSession: true });
    const params = msg.params || {};
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
    return;
  }

  captureRawClientFrame(msg);
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
  const { cwd, codexPath, logFile, env = process.env } = options;
  _logFile = logFile;
  _currentModel = null;
  _currentProject = cwd ? basename(cwd) : 'codex';
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
  resetRawSessionFrames();
  resetRawTurnFrames();
  _turnActive = false;

  // 1. 找两个空闲端口
  const appServerPort = await findFreePort();
  const proxyPort = await findFreePort();

  // 2. 启动 codex app-server（确保代理环境变量传递）
  const appEnv = { ...env };
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
  let appServerArgs = ['app-server', '--listen', `ws://127.0.0.1:${appServerPort}`];
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
      const str = typeof data === 'string' ? data : data.toString();
      try {
        parseClientMessage(JSON.parse(str));
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
    stop() {
      if (_proxyServer) { _proxyServer.close(); _proxyServer = null; }
      if (_upstreamWs) { _upstreamWs.close(); _upstreamWs = null; }
      if (_appServerProcess) { _appServerProcess.kill(); _appServerProcess = null; }
    },
  };
}
