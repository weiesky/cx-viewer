
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_API_BASE } from './lib/constants.js';
import { homedir } from 'node:os';
import { extractApiErrorMessage } from './lib/proxy-errors.js';
import { isStaleLocalCodexBaseUrl } from './lib/codex-config.js';

let _interceptorReady = null;

async function ensureProxyInterceptor() {
  if (process.env.CXV_TEST === '1') return;
  if (!_interceptorReady) {
    _interceptorReady = import('./interceptor.js').then(mod => {
      mod.setupInterceptor();
    }).catch(err => {
      if (process.env.CXV_DEBUG) console.warn('[CX-Proxy] interceptor setup skipped:', err.message);
    });
  }
  await _interceptorReady;
}

function getBaseUrlFromSettings(settingsPath) {
  try {
    if (existsSync(settingsPath)) {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      if (settings.env && settings.env.OPENAI_BASE_URL) {
        return settings.env.OPENAI_BASE_URL;
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function getCodexConfigBaseUrl(configPath) {
  try {
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8');
      const match = content.match(/^openai_base_url\s*=\s*"([^"]*)"/m);
      if (match && match[1]) return match[1];
    }
  } catch {}
  return null;
}

function getOriginalBaseUrl() {
  // 1. CXV_ORIGINAL_BASE_URL: explicitly set by pty-manager/cli when overriding Codex config
  if (process.env.CXV_ORIGINAL_BASE_URL) {
    return process.env.CXV_ORIGINAL_BASE_URL;
  }

  let cwd;
  try { cwd = process.cwd(); } catch { cwd = null; }

  // 2. Codex config.toml (user-level only — skip project-level which may contain our proxy URL)
  const codexUserConfig = join(homedir(), '.codex', 'config.toml');
  const codexUrl = getCodexConfigBaseUrl(codexUserConfig);
  if (codexUrl && !isStaleLocalCodexBaseUrl(codexUrl)) return codexUrl;

  // 3. Codex settings.json
  const configPaths = [];
  if (cwd) {
    configPaths.push(join(cwd, '.codex', 'settings.local.json'));
    configPaths.push(join(cwd, '.codex', 'settings.json'));
  }
  configPaths.push(join(homedir(), '.codex', 'settings.json'));

  for (const configPath of configPaths) {
    const url = getBaseUrlFromSettings(configPath);
    if (url) return url;
  }

  // 4. Check env var
  if (process.env.OPENAI_BASE_URL) {
    return process.env.OPENAI_BASE_URL;
  }

  // 5. Default
  return DEFAULT_API_BASE;
}

function buildUpstreamUrl(reqUrl) {
  const originalBaseUrl = getOriginalBaseUrl();
  const cleanBase = originalBaseUrl.endsWith('/') ? originalBaseUrl.slice(0, -1) : originalBaseUrl;
  const cleanReq = reqUrl.startsWith('/') ? reqUrl.slice(1) : reqUrl;
  return { fullUrl: `${cleanBase}/${cleanReq}`, originalBaseUrl };
}

// ─── Auth-aware upstream routing (PTY / -c redirect mode) ───
// Codex is redirected to this proxy via `-c openai_base_url="http://127.0.0.1:PORT/v1"`,
// so BOTH ChatGPT-OAuth and API-key sessions arrive here at the SAME path
// (`/v1/responses`). The path therefore can't tell the modes apart — we route by
// the `ChatGPT-Account-Id` request header (present only in OAuth mode), falling
// back to ~/.codex/auth.json. Codex appended its suffix to our injected `/v1`
// base, so we strip that prefix and re-append the suffix to the REAL upstream
// base (which may itself carry a path, e.g. a custom gateway).

const INJECTED_BASE_PATH = '/v1';

// The proxy's own listen port, set in startProxy(); used to break self-forward loops.
let _proxyOwnPort = null;

// Test hook: set/reset the remembered own port without starting a server.
export function _setProxyOwnPortForTests(port) { _proxyOwnPort = port; }

function _defaultOpenAiBase() {
  return `${DEFAULT_API_BASE.replace(/\/+$/, '')}/v1`;
}
function _defaultChatgptBase() {
  return 'https://chatgpt.com/backend-api/codex';
}

// Lazily-read ChatGPT-OAuth status from ~/.codex/auth.json, cached for the life
// of the proxy (auth mode is stable within a session; the definitive signal is
// the per-request ChatGPT-Account-Id header, so this is only a fallback).
let _authJsonOAuth = null; // null = not yet read
function _authJsonIsOAuth() {
  if (_authJsonOAuth !== null) return _authJsonOAuth;
  _authJsonOAuth = false;
  try {
    const authPath = join(homedir(), '.codex', 'auth.json');
    if (existsSync(authPath)) {
      const a = JSON.parse(readFileSync(authPath, 'utf-8'));
      if (a && a.tokens && a.tokens.access_token) _authJsonOAuth = true;
    }
  } catch { }
  return _authJsonOAuth;
}

export function isOAuthRequest(headers = {}) {
  // Node lowercases incoming header names; the account-id header is definitive.
  if (headers['chatgpt-account-id']) return true;
  if (process.env.CXV_TEST === '1') return false; // deterministic routing in tests
  return _authJsonIsOAuth();
}

function _isSelfForward(fullUrl) {
  try {
    const u = new URL(fullUrl);
    const host = u.hostname.replace(/^\[|\]$/g, '');
    const loopback = host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '::ffff:127.0.0.1';
    if (!loopback) return false;
    const port = Number(u.port) || (u.protocol === 'https:' ? 443 : 80);
    return _proxyOwnPort != null && port === _proxyOwnPort;
  } catch {
    return false;
  }
}

// Strip our injected base path (`/v1`) prefix so we recover the suffix Codex
// appended (e.g. `/responses`). Tolerant: unmatched paths pass through verbatim.
// The caller re-adds a leading slash, so returning `/responses` or `?x=1` is fine.
function _stripInjectedPrefix(reqUrl) {
  if (reqUrl === INJECTED_BASE_PATH) return '/';
  if (reqUrl.startsWith(INJECTED_BASE_PATH + '/') || reqUrl.startsWith(INJECTED_BASE_PATH + '?')) {
    return reqUrl.slice(INJECTED_BASE_PATH.length);
  }
  return reqUrl;
}

export function resolveUpstream(reqUrl, headers = {}) {
  const isOAuth = isOAuthRequest(headers);
  const suffix = _stripInjectedPrefix(reqUrl);
  const cleanSuffix = suffix.startsWith('/') ? suffix : '/' + suffix;

  let cleanBase;
  let fallbackBase;
  if (isOAuth) {
    // ChatGPT-OAuth: model traffic must go to the chatgpt backend, not the
    // openai host. Strip our injected /v1 prefix and re-append the suffix.
    cleanBase = (process.env.CXV_ORIGINAL_CHATGPT_BASE_URL || _defaultChatgptBase()).replace(/\/+$/, '');
    fallbackBase = _defaultChatgptBase().replace(/\/+$/, '');
  } else if (process.env.CXV_ORIGINAL_BASE_URL) {
    // CLI PTY redirect mode: real upstream captured in CXV_ORIGINAL_BASE_URL.
    cleanBase = process.env.CXV_ORIGINAL_BASE_URL.replace(/\/+$/, '');
    fallbackBase = _defaultOpenAiBase();
  } else {
    // Backward-compat (Electron / SDK proxy callers, no redirect env): preserve
    // the original config/OPENAI_BASE_URL resolution so custom gateways still
    // route correctly. buildUpstreamUrl uses the raw reqUrl, not the stripped
    // suffix, matching that path's historical behavior.
    let { fullUrl } = buildUpstreamUrl(reqUrl);
    if (_isSelfForward(fullUrl)) {
      fullUrl = _defaultOpenAiBase().replace(/\/+$/, '') + cleanSuffix;
    }
    return { fullUrl, originalBaseUrl: getOriginalBaseUrl(), authMode: 'API Key' };
  }

  let fullUrl = cleanBase + cleanSuffix;
  // Never forward to ourselves (would loop): fall back to the public default.
  if (_isSelfForward(fullUrl)) {
    fullUrl = fallbackBase + cleanSuffix;
  }

  return { fullUrl, originalBaseUrl: cleanBase, authMode: isOAuth ? 'OAuth' : 'API Key' };
}

let _proxyServer = null;

export function stopProxy() {
  if (_proxyServer) {
    try { _proxyServer.close(); } catch { }
    _proxyServer = null;
  }
  _proxyOwnPort = null;
}

export function startProxy() {
  return ensureProxyInterceptor().then(() => new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      // Normalize the request target. When a client (or an upstream HTTP proxy
      // like Clash/mihomo) routes to us in absolute-form —
      // `POST http://127.0.0.1:PORT/v1/responses` — Node sets req.url to the full
      // URL. Reduce it to path+query so path routing works. (We also add loopback
      // to NO_PROXY when spawning Codex so it connects directly, origin-form.)
      let reqPath = req.url;
      if (/^https?:\/\//i.test(reqPath)) {
        try { const u = new URL(reqPath); reqPath = u.pathname + u.search; } catch { }
      }
      const { fullUrl, originalBaseUrl, authMode } = resolveUpstream(reqPath, req.headers);
      if (process.env.CXV_DEBUG) console.error(`[CX-Proxy] ${req.method} ${reqPath} [${authMode}] → ${fullUrl}`);

      // Use the patched fetch (which logs to cx-viewer)
      try {
        // Convert incoming headers, stripping hop-by-hop + length/encoding headers.
        // undici/fetch computes its own content-length for the Buffer body and
        // manages the connection; forwarding Codex's content-length /
        // transfer-encoding / connection headers makes undici reject the request
        // (→ 502). Host is dropped so fetch sets it from the upstream URL.
        const headers = { ...req.headers };
        for (const h of ['host', 'connection', 'keep-alive', 'proxy-authenticate',
          'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade',
          'content-length']) {
          delete headers[h];
        }
        // Force an uncompressed upstream response (like claude-tap). Forwarding
        // Codex's Accept-Encoding (gzip/br/zstd) risks the client and our
        // decompression disagreeing, corrupting the SSE stream; identity avoids it.
        headers['accept-encoding'] = 'identity';

        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const body = Buffer.concat(buffers);

        const fetchOptions = {
          method: req.method,
          headers: headers,
        };

        // 标记此请求为 CX-Viewer 代理转发的 Codex/OpenAI API 请求
        // 拦截器识别到此 Header 会强制记录，忽略 URL 匹配规则
        fetchOptions.headers['x-cx-viewer-trace'] = 'true';

        if (body.length > 0) {
          fetchOptions.body = body;
        }

        const response = await fetch(fullUrl, fetchOptions);

        // fetch 自动解压，需移除编码相关 header 避免客户端重复解压
        const responseHeaders = {};
        for (const [key, value] of response.headers.entries()) {
          // Skip Content-Encoding and Transfer-Encoding to let Node/Client handle it
          if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'transfer-encoding' && key.toLowerCase() !== 'content-length') {
            responseHeaders[key] = value;
          }
        }

        // 如果是错误响应，尝试解析并打印具体的错误信息
        if (!response.ok) {
          try {
            const errorText = await response.text();
            if (process.env.CXV_DEBUG) {
              console.error(`[CX-Viewer Proxy] ${extractApiErrorMessage(response.status, errorText)}`);
            }

            res.writeHead(response.status, responseHeaders);
            res.end(errorText);
            return;
          } catch (err) {
            // 读取 body 失败，回退到流式处理
            if (process.env.CXV_DEBUG) {
              console.error('[CX-Viewer Proxy] Failed to read error body:', err);
            }
          }
        }

        res.writeHead(response.status, responseHeaders);

        if (response.body) {
          const { Readable, pipeline } = await import('node:stream');
          // @ts-ignore
          const nodeStream = Readable.fromWeb(response.body);
          // 持久 error handler 兜底：防止 pipeline 清理后延迟到达的 error 事件导致进程崩溃
          nodeStream.on('error', () => {});
          // pipeline handles stream errors; without this, unhandled 'error' events crash the process.
          pipeline(nodeStream, res, (err) => {
            if (err && process.env.CXV_DEBUG) {
              console.error('[CX-Viewer Proxy] Stream pipeline error:', err.message);
            }
          });
        } else {
          res.end();
        }
      } catch (err) {
        // Surface the real reason: log it and include it in the 502 body so it
        // shows up directly in Codex's error message (aids diagnosis without
        // needing CXV_DEBUG). Only the upstream host is revealed, not credentials.
        const detail = err && err.message ? err.message : String(err);
        console.error(`[CX-Viewer Proxy] Forward to ${fullUrl} failed: ${detail}`);
        res.statusCode = 502;
        res.end(`Proxy Error: ${detail} (upstream: ${fullUrl})`);
      }
    });

    // ─── WebSocket upgrade handling: REFUSE to force HTTP/SSE fallback ───
    // Codex's built-in openai provider prefers a Responses-over-WebSocket
    // transport and only falls back to HTTP/SSE when the WS attempt fails. A
    // cleartext logging proxy can only observe the HTTP path, so we deliberately
    // refuse the upgrade with a well-formed non-101 response (not a bare socket
    // reset, which can read as a transient network error and trigger a retry
    // loop). Codex then downgrades to HTTP/SSE, which we log normally.
    server.on('upgrade', (clientReq, clientSocket) => {
      if (process.env.CXV_DEBUG) console.error(`[CX-Proxy WS] refusing upgrade ${clientReq.url} → forcing HTTP/SSE fallback`);
      try {
        clientSocket.write('HTTP/1.1 426 Upgrade Required\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
        clientSocket.end();
      } catch {
        try { clientSocket.destroy(); } catch { }
      }
    });

    // Store server reference for stopProxy()
    _proxyServer = server;

    // Start on random port
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      _proxyOwnPort = address.port;
      resolve(address.port);
    });

    server.on('error', (err) => {
      _proxyServer = null;
      reject(err);
    });

    server.on('close', () => {
      _proxyServer = null;
    });
  }));
}
