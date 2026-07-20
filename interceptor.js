// LLM Request Interceptor
// 拦截并记录所有Codex API请求

// 非交互命令（如 codex -v, codex --help）不需要启动 cxv
const _cxvSkipArgs = ['--version', '-v', '--v', '--help', '-h', 'doctor', 'install', 'update', 'upgrade', 'auth', 'setup-token', 'agents', 'plugin', 'plugins', 'mcp'];
const _cxvSkip = _cxvSkipArgs.includes(process.argv[2]);

import './lib/proxy-env.js';
import { readFileSync, watchFile } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, resolve } from 'node:path';
import { LOG_DIR } from './findcx.js';
import { assembleOpenAiResponseMessage, assembleStreamMessage, classifyAgentRequest, isOpenAiApiPath, parseRequestBodyForLog } from './lib/interceptor-core.js';
import { resolveLogV2Config } from './lib/log-v2/config.js';
import { LogV2WriteCoordinator } from './lib/log-v2/coordinator.js';
import { loadLogV2RuntimeConfig } from './lib/log-v2/runtime-config.js';
import { LogV2WriteQueue } from './lib/log-v2/write-queue.js';
import { projectIdForCwd } from './lib/log-v2/project-id.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 流式请求的实时状态（供 server.js SSE 推送）
export const streamingState = { active: false, requestId: null, startTime: null, model: null, bytesReceived: 0, chunksReceived: 0 };
export function resetStreamingState() {
  streamingState.active = false;
  streamingState.requestId = null;
  streamingState.startTime = null;
  streamingState.model = null;
  streamingState.bytesReceived = 0;
  streamingState.chunksReceived = 0;
}

// 缓存从请求 headers 中提取的 API Key 或 Authorization header
export let _cachedApiKey = null;
export let _cachedAuthHeader = null;
// 缓存从请求 body 中提取的模型名，供翻译接口使用
export let _cachedModel = null;
// 缓存 haiku 模型名（从实际请求中捕获），翻译接口优先使用
export let _cachedHaikuModel = null;

// Proxy profile hot-switch support
const PROFILE_PATH = join(homedir(), '.codex', 'cx-viewer', 'profile.json');
let _activeProfile = null; // { id, name, baseURL?, apiKey?, models?, activeModel? }

// 启动时捕获的原始配置（首次 API 请求时记录，不可变）
let _defaultConfig = null; // { origin, authType, model }

function _loadProxyProfile() {
  try {
    const data = JSON.parse(readFileSync(PROFILE_PATH, 'utf-8'));
    const active = data.profiles?.find(p => p.id === data.active);
    _activeProfile = (active && active.id !== 'max') ? active : null;
  } catch {
    _activeProfile = null;
  }
}

_loadProxyProfile();
try { watchFile(PROFILE_PATH, { interval: 1500 }, _loadProxyProfile); } catch { }

export { _activeProfile, _defaultConfig, _loadProxyProfile, PROFILE_PATH };

// Teammate 子进程检测：--parent-session-id（旧模式）或 --agent-name（原生 team 模式）
const _isTeammate = process.argv.includes('--parent-session-id') || process.argv.includes('--agent-name');
// 提取 teammate 元数据（--agent-name worker-1 --team-name fix-ts-errors）
let _teammateName = null;
let _teamName = null;
{
  const args = process.argv;
  const nameIdx = args.indexOf('--agent-name');
  if (nameIdx !== -1 && nameIdx + 1 < args.length) _teammateName = args[nameIdx + 1];
  const teamIdx = args.indexOf('--team-name');
  if (teamIdx !== -1 && teamIdx + 1 < args.length) _teamName = args[teamIdx + 1];
}

let _projectPath = process.env.CXV_WORKSPACE_MODE === '1'
  ? ''
  : resolve(process.env.CXV_PROJECT_DIR || process.cwd());
export let _projectName = _projectPath
  ? basename(_projectPath).replace(/[^a-zA-Z0-9_\-\.]/g, '_')
  : '';
let _projectId = _projectPath ? projectIdForCwd(_projectPath, _projectName) : '';
export let _logDir = _projectName ? join(LOG_DIR, _projectName) : '';
export const _initPromise = Promise.resolve();

export function initForWorkspace(projectPath) {
  const canonicalPath = resolve(projectPath);
  const projectName = basename(canonicalPath).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  _projectPath = canonicalPath;
  _projectName = projectName;
  _projectId = projectIdForCwd(canonicalPath, projectName);
  _logDir = join(LOG_DIR, projectName);
  return { dir: _logDir, projectName };
}

export function resetWorkspace() {
  _projectPath = '';
  _projectName = '';
  _projectId = '';
  _logDir = '';
}

export function getActiveProjectContext() {
  return Object.freeze({ projectId: _projectId || null, projectName: _projectName || null, canonicalCwd: _projectPath || null });
}
const _logV2Config = resolveLogV2Config(process.env, loadLogV2RuntimeConfig(LOG_DIR));
const _logV2Coordinator = new LogV2WriteCoordinator({
  rootDir: LOG_DIR,
  debug: !!process.env.CXV_DEBUG,
  minFreeBytes: _logV2Config.minFreeBytes,
  minFreePercent: _logV2Config.minFreePercent,
  failureLimit: _logV2Config.failureLimit,
  durability: 'durable',
});
// Durable V2 commits contain several fsync-backed files. In production they
// belong to one ordered worker so proxy/app-server/OTel traffic cannot stall
// the HTTP and terminal event loop. Tests that assert immediate on-disk state
// retain the direct coordinator and exercise the queue separately.
const _logV2WriteQueue = process.env.CXV_TEST !== '1'
  ? new LogV2WriteQueue({
      rootDir: LOG_DIR,
      debug: !!process.env.CXV_DEBUG,
      minFreeBytes: _logV2Config.minFreeBytes,
      minFreePercent: _logV2Config.minFreePercent,
      failureLimit: _logV2Config.failureLimit,
      durability: 'durable',
    })
  : null;
let _onLogV2Commit = null;

export function setLogV2CommitListener(listener) {
  _onLogV2Commit = typeof listener === 'function' ? listener : null;
}

function isBackgroundOnlyEntry(entry, source, context) {
  const url = typeof entry?.url === 'string' ? entry.url : '';
  if (source === 'app-server' && url.startsWith('codex://warning/')) {
    const thread = context?.thread;
    const threadId = thread?.id || thread?.threadId || thread?.thread_id;
    const sessionId = thread?.sessionId || thread?.session_id;
    return !(threadId && sessionId);
  }
  if (source !== 'proxy' || String(entry?.method || 'GET').toUpperCase() !== 'GET') return false;
  return [entry?.proxyUrl, url].some(value => {
    if (!value) return false;
    try {
      const pathname = new URL(value).pathname.replace(/\/+$/, '');
      return pathname === '/backend-api/codex/models'
        || pathname.endsWith('/codex/models')
        || pathname === '/v1/models';
    } catch {
      return /\/(?:backend-api\/)?codex\/models(?:[?#]|$)|\/v1\/models(?:[?#]|$)/.test(String(value));
    }
  });
}

/** Persist one original full entry through Log Store V2. */
export function appendLogEntry(entry, context = {}) {
  if (!entry) return { written: false, store: 'v2' };
  const source = context?.source
    || (entry._sdkSource || entry.body?.metadata?.sdk === 'openai-codex-sdk' ? 'sdk' : null)
    || (entry._otelSource ? 'otel' : 'proxy');
  if (isBackgroundOnlyEntry(entry, source, context)) {
    return { written: false, accepted: true, durable: true, skipped: true, store: 'v2' };
  }
  const cwd = resolve(context?.cwd
    || entry.body?.metadata?.cwd
    || entry.body?._cwd
    || _projectPath
    || process.env.CXV_PROJECT_DIR
    || process.cwd());
  const writeContext = {
    ...context,
    source,
    cwd,
    projectId: context?.projectId
      || (cwd === _projectPath ? _projectId : null)
      || projectIdForCwd(cwd, entry.project || basename(cwd) || 'codex'),
  };
  const committedEntry = structuredClone(entry);
  const committedContext = Object.freeze({ ...writeContext });
  try {
    if (_logV2WriteQueue) {
      const completion = _logV2WriteQueue.enqueue(entry, writeContext);
      void completion.then(result => _onLogV2Commit?.(committedEntry, result, committedContext), () => {});
      return {
        written: false,
        accepted: true,
        durable: false,
        completion,
        store: 'v2',
        queued: true,
        pendingWrites: _logV2WriteQueue.snapshot().pendingWrites,
      };
    }
    const result = _logV2Coordinator.writeEntry(entry, writeContext);
    _onLogV2Commit?.(committedEntry, result, committedContext);
    return result;
  } catch (error) {
    return { written: false, accepted: false, durable: false, store: 'v2', error };
  }
}

export function getLogV2RuntimeStatus() {
  return Object.freeze({
    config: _logV2Config,
    writer: _logV2WriteQueue ? _logV2WriteQueue.snapshot() : _logV2Coordinator.snapshot(),
  });
}

export async function flushLogV2Writes() {
  if (!_logV2WriteQueue) return _logV2Coordinator.snapshot();
  return _logV2WriteQueue.flush();
}

export async function closeLogV2Writes() {
  if (!_logV2WriteQueue) return _logV2Coordinator.snapshot();
  return _logV2WriteQueue.close();
}

// 匹配 OpenAI API 主机名（默认 api.openai.com 及 OPENAI_BASE_URL 自定义主机）
function isOpenAiHost(urlStr) {
  try {
    const hostname = new URL(urlStr).hostname;
    if (hostname === 'api.openai.com') return true;
    const baseUrl = process.env.OPENAI_BASE_URL;
    if (baseUrl) {
      const customHost = new URL(baseUrl).hostname;
      if (hostname === customHost) return true;
    }
  } catch { }
  return false;
}

// 保存 viewer 模块引用
let viewerModule = null;

export function setupInterceptor() {
  // 避免重复拦截
  if (globalThis._cxViewerInterceptorInstalled) {
    return;
  }
  globalThis._cxViewerInterceptorInstalled = true;

  // 启动 viewer 服务（优先根目录 server.js，fallback 到 lib/server.js）
  // Teammate 子进程跳过，避免端口冲突（leader 已启动 viewer）
  if (!_isTeammate) {
    const rootServerPath = join(__dirname, 'server.js');
    const libServerPath = join(__dirname, 'lib', 'server.js');
    import(rootServerPath).then(module => {
      viewerModule = module;
    }).catch(() => {
      import(libServerPath).then(module => {
        viewerModule = module;
      }).catch(() => {
        // Silently fail if viewer service cannot start
      });
    });
  }

  // 注册退出处理器
  const cleanupViewer = async () => {
    if (viewerModule && typeof viewerModule.stopViewer === 'function') {
      try {
        await viewerModule.stopViewer();
      } catch (err) {
        // Silently fail
      }
    }
  };

  process.on('SIGINT', () => {
    cleanupViewer().finally(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    cleanupViewer().finally(() => process.exit(0));
  });

  process.on('beforeExit', () => {
    cleanupViewer();
  });

  const _originalFetch = globalThis.fetch;

  globalThis.fetch = async function (url, options) {
    // cx-viewer 内部请求（翻译等）直接透传，不拦截
    const internalHeader = options?.headers?.['x-cx-viewer-internal']
      || (options?.headers instanceof Headers && options.headers.get('x-cx-viewer-internal'));
    if (internalHeader) {
      return _originalFetch.apply(this, arguments);
    }

    const startTime = Date.now();
    let requestEntry = null;

    try {
      const urlStr = typeof url === 'string' ? url : url?.url || String(url);
      // 检查 headers 中是否包含 x-cx-viewer-trace 标记
      const headers = options?.headers || {};
      const isProxyTrace = headers['x-cx-viewer-trace'] === 'true' || headers['x-cx-viewer-trace'] === true;

      // 如果是 proxy 转发的，或者符合 URL 规则
      if (isProxyTrace || isOpenAiHost(urlStr) || isOpenAiApiPath(urlStr)) {
        // 如果是 proxy 转发的，需要清理掉标记 header 避免发给上游
        if (isProxyTrace && options?.headers) {
          delete options.headers['x-cx-viewer-trace'];
        }

        // 转换 headers 为普通对象（支持 Request 对象、options.headers、Headers 实例）
        let headers = {};
        const rawHeaders = options?.headers || (url instanceof Request ? url.headers : null);
        if (rawHeaders) {
          if (rawHeaders instanceof Headers) {
            headers = Object.fromEntries(rawHeaders.entries());
          } else if (typeof rawHeaders === 'object') {
            headers = { ...rawHeaders };
          }
        }

        const timestamp = new Date().toISOString();
        const body = options?.body ? parseRequestBodyForLog(options.body, headers) : null;

        // 缓存 API Key / Authorization 供翻译接口使用（缓存原始值）
        if (headers['x-api-key'] && !_cachedApiKey) {
          _cachedApiKey = headers['x-api-key'];
        }
        if (headers['authorization'] && !_cachedAuthHeader) {
          _cachedAuthHeader = headers['authorization'];
        }

        // 首次 API 请求时捕获原始配置（仅一次，用于 Default profile 展示和自动匹配）
        if (!_defaultConfig) {
          try {
            const _u = new URL(urlStr);
            _defaultConfig = {
              origin: _u.origin,
              authType: headers['authorization'] ? 'OAuth' : headers['x-api-key'] ? 'API Key' : 'Unknown',
              apiKey: headers['x-api-key'] || null,
              model: body?.model || null,
            };
          } catch { }
        }

        // 缓存请求中的模型名（仅 mainAgent 请求，避免 SubAgent 覆盖）
        // 注意：写入移到 requestEntry 构建之后

        // 脱敏敏感 headers，避免写入日志泄漏凭证
        const safeHeaders = { ...headers };
        if (safeHeaders['x-api-key']) {
          const k = safeHeaders['x-api-key'];
          safeHeaders['x-api-key'] = k.length > 12 ? k.slice(0, 8) + '****' + k.slice(-4) : '****';
        }
        if (safeHeaders['authorization']) {
          const v = safeHeaders['authorization'];
          const spaceIdx = v.indexOf(' ');
          if (spaceIdx > 0) {
            const scheme = v.slice(0, spaceIdx);
            const token = v.slice(spaceIdx + 1);
            safeHeaders['authorization'] = scheme + ' ' + (token.length > 12 ? token.slice(0, 8) + '****' + token.slice(-4) : '****');
          } else {
            safeHeaders['authorization'] = '****';
          }
        }

        const agentClass = classifyAgentRequest(urlStr, body);

        requestEntry = {
          timestamp,
          project: (() => { try { return basename(process.cwd()); } catch { return 'unknown'; } })(),
          url: urlStr,
          method: options?.method || 'GET',
          headers: safeHeaders,
          body: body,
          response: null,
          duration: 0,
          isStream: body?.stream === true,
          isHeartbeat: /\/api\/eval\/sdk-/.test(urlStr),
          isCountTokens: /\/messages\/count_tokens/.test(urlStr),
          mainAgent: agentClass.mainAgent,
          subAgent: agentClass.subAgent,
          ...(agentClass.subAgentName ? { subAgentName: agentClass.subAgentName } : {}),
          ...(_isTeammate && { teammate: _teammateName, teamName: _teamName })
        };
      }
    } catch (err) {
      if (process.env.CXV_DEBUG) console.warn('[CX-Viewer] Request interception error:', err.message);
    }

    // MainAgent 元数据缓存；日志轮转由每次 appendLogEntry 统一处理，
    // app-server / SDK / OTel 等非 HTTP 写入也走同一入口。
    if (requestEntry?.mainAgent) {
      // 仅 mainAgent 请求时缓存模型名，避免 SubAgent 覆盖
      if (requestEntry.body?.model && typeof requestEntry.body.model === 'string') {
        _cachedModel = requestEntry.body.model;
        // 捕获 haiku 模型名供翻译接口使用
        if (/haiku/i.test(requestEntry.body.model)) {
          _cachedHaikuModel = requestEntry.body.model;
        }
      }
    }

    // 生成唯一请求 ID，用于关联在途请求和完成请求
    const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    if (requestEntry) {
      requestEntry.requestId = requestId;
      requestEntry.inProgress = true;  // 标记为在途请求
    }

    // 在发起请求前先写入一条未完成的条目，让前端可以检测在途请求
    if (requestEntry) {
      appendLogEntry(requestEntry);
    }

    // 流式请求状态追踪（仅对 Codex API 流式请求）
    if (requestEntry?.isStream) {
      streamingState.active = true;
      streamingState.requestId = requestId;
      streamingState.startTime = Date.now();
      streamingState.model = requestEntry.body?.model || '';
      streamingState.bytesReceived = 0;
      streamingState.chunksReceived = 0;
    }

    // Proxy profile request rewriting
    let _fetchUrl = url;
    let _fetchOpts = options;
    if (_activeProfile && _activeProfile.baseURL && requestEntry) {
      try {
        // 1. URL 重写: 用 baseURL 替换 origin，智能处理路径重叠
        //    baseURL="https://proxy.com/v1" + pathname="/v1/responses" → "https://proxy.com/v1/responses"（去重 /v1）
        //    baseURL="https://proxy.com"    + pathname="/v1/responses" → "https://proxy.com/v1/responses"（无重叠）
        if (typeof _fetchUrl === 'string') {
          const _origUrl = new URL(_fetchUrl);
          const _baseUrl = new URL(_activeProfile.baseURL);
          const _basePath = _baseUrl.pathname.replace(/\/+$/, '');
          const _origPath = _origUrl.pathname;
          // 如果原始路径以 baseURL 的路径开头（如都有 /v1/），去掉重叠部分
          // 使用 _basePath + '/' 避免 /api 误匹配 /api-v2
          const _finalPath = (!_basePath || _origPath === _basePath || _origPath.startsWith(_basePath + '/')) ? _origPath : _basePath + _origPath;
          _fetchUrl = _baseUrl.origin + _finalPath + _origUrl.search;
        }
        // 2. Auth 替换
        if (_activeProfile.apiKey && _fetchOpts?.headers) {
          const h = _fetchOpts.headers;
          if (typeof h === 'object' && !(h instanceof Headers)) {
            _fetchOpts = { ..._fetchOpts, headers: { ...h } };
            if (h['x-api-key']) _fetchOpts.headers['x-api-key'] = _activeProfile.apiKey;
            if (h['authorization']) _fetchOpts.headers['authorization'] = `Bearer ${_activeProfile.apiKey}`;
          }
        }
        // 3. Model 替换
        if (_activeProfile.activeModel && _fetchOpts?.body) {
          try {
            const _b = JSON.parse(_fetchOpts.body);
            if (_b.model) {
              _b.model = _activeProfile.activeModel;
              _fetchOpts = { ..._fetchOpts, body: JSON.stringify(_b) };
            }
          } catch { }
        }
        // 记录 proxy 信息到日志条目
        requestEntry.proxyProfile = _activeProfile.name;
        requestEntry.proxyUrl = _fetchUrl;
      } catch (err) {
        if (process.env.CXV_DEBUG) console.warn('[CX-Viewer] Proxy URL rewrite error:', err.message);
      }
    }

    let response;
    try {
      response = await _originalFetch.call(this, _fetchUrl, _fetchOpts);
    } catch (err) {
      if (requestEntry?.isStream) resetStreamingState();
      throw err;
    }

    if (requestEntry) {
      const duration = Date.now() - startTime;
      requestEntry.duration = duration;

      // 对于流式响应，拦截并捕获内容
      if (requestEntry.isStream) {
        try {
          requestEntry.response = {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: { events: [] }
          };

          const originalBody = response.body;
          const reader = originalBody.getReader();
          const decoder = new TextDecoder();
          let streamedContent = '';

          const stream = new ReadableStream({
            async start(controller) {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    // flush decoder 残留字节
                    streamedContent += decoder.decode();
                    // 流结束，组装完整的消息对象
                    try {
                      const events = streamedContent.split('\n\n')
                        .filter(block => block.trim())
                        .map(block => {
                          // SSE 块可能包含多行: event: xxx\ndata: {...}
                          const lines = block.split('\n');
                          const dataLine = lines.find(l => l.startsWith('data:'));
                          if (dataLine) {
                            // 处理 "data:" 或 "data: " 两种格式
                            const jsonStr = dataLine.startsWith('data: ')
                              ? dataLine.substring(6)
                              : dataLine.substring(5);
                            try {
                              return JSON.parse(jsonStr);
                            } catch {
                              return jsonStr;
                            }
                          }
                          return null;
                        })
                        .filter(Boolean);

                      const hasOpenAiResponsesEvents = events.some(event => event && typeof event === 'object' && typeof event.type === 'string' && event.type.startsWith('response.'));

                      // 组装完整的 message 对象（Codex uses OpenAI Responses events; legacy adapters may still emit Claude-style events）
                      const assembledMessage = hasOpenAiResponsesEvents
                        ? assembleOpenAiResponseMessage(events)
                        : assembleStreamMessage(events);

                      // 直接使用组装后的 message 对象作为 response.body
                      // 如果组装失败（例如非标准 SSE），则使用原始流内容
                      requestEntry.response.body = assembledMessage || streamedContent;


                      // 移除在途请求标记，保持原始报文
                      delete requestEntry.inProgress;
                      delete requestEntry.requestId;
                      appendLogEntry(requestEntry);
                      // Release memory: clear large objects after disk write
                      streamedContent = '';
                      requestEntry.response = null;
                      resetStreamingState();
                    } catch (err) {
                      requestEntry.response.body = streamedContent.slice(0, 1000);
                      delete requestEntry.inProgress;
                      delete requestEntry.requestId;
                      appendLogEntry(requestEntry);
                      streamedContent = '';
                      requestEntry.response = null;
                      resetStreamingState();
                    }
                    controller.close();
                    break;
                  }
                  streamingState.bytesReceived += value.byteLength;
                  streamingState.chunksReceived++;
                  const chunk = decoder.decode(value, { stream: true });
                  streamedContent += chunk;
                  controller.enqueue(value);
                }
              } catch (err) {
                resetStreamingState();
                controller.error(err);
              }
            }
          });

          // 返回带有代理流的新响应
          return new Response(stream, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        } catch (err) {
          requestEntry.response = {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: '[Streaming Response - Capture failed]'
          };
          delete requestEntry.inProgress;
          delete requestEntry.requestId;
          appendLogEntry(requestEntry);
          resetStreamingState();
        }
      } else {
        // 对于非流式响应，可以安全读取body
        try {
          const clonedResponse = response.clone();
          const responseText = await clonedResponse.text();
          let responseData = null;

          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = responseText.slice(0, 1000);
          }

          requestEntry.response = {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseData
          };


          delete requestEntry.inProgress;
          delete requestEntry.requestId;

          appendLogEntry(requestEntry);
        } catch (err) {
          delete requestEntry.inProgress;
          delete requestEntry.requestId;
          appendLogEntry(requestEntry);
        }
      }
    }

    return response;
  };
}
