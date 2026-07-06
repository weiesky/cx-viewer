
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { DEFAULT_API_BASE } from './lib/constants.js';
import { homedir } from 'node:os';
import { setupInterceptor } from './interceptor.js';
import { extractApiErrorMessage, formatProxyRequestError } from './lib/proxy-errors.js';
import { LOG_FILE } from './interceptor.js';
import { isStaleLocalCodexBaseUrl } from './lib/codex-config.js';

// Setup interceptor to patch fetch
setupInterceptor();

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

// ─── WebSocket frame parser (for logging) ───
// Minimal parser to extract text messages from WebSocket frames.
// Only handles unfragmented text frames (opcode 0x01) for simplicity.

function parseWsFrames(buf) {
  const messages = [];
  let offset = 0;
  while (offset < buf.length) {
    if (offset + 2 > buf.length) break;
    const firstByte = buf[offset];
    const secondByte = buf[offset + 1];
    const fin = (firstByte & 0x80) !== 0;
    const opcode = firstByte & 0x0f;
    const masked = (secondByte & 0x80) !== 0;
    let payloadLen = secondByte & 0x7f;
    let headerLen = 2;

    if (payloadLen === 126) {
      if (offset + 4 > buf.length) break;
      payloadLen = buf.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buf.length) break;
      // Read as BigUInt64BE, but limit to safe integer
      payloadLen = Number(buf.readBigUInt64BE(offset + 2));
      headerLen = 10;
    }

    if (masked) headerLen += 4;
    const totalLen = headerLen + payloadLen;
    if (offset + totalLen > buf.length) break;

    // Only parse text frames (opcode 1) with FIN bit
    if (fin && opcode === 1) {
      let payload = buf.slice(offset + headerLen, offset + headerLen + payloadLen);
      if (masked) {
        const maskKey = buf.slice(offset + headerLen - 4, offset + headerLen);
        payload = Buffer.from(payload);
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= maskKey[i & 3];
        }
      }
      try {
        messages.push(payload.toString('utf-8'));
      } catch {}
    }
    offset += totalLen;
  }
  return messages;
}

// Log a WebSocket session (connect + messages) to the interceptor JSONL file
function logWsEntry(url, direction, messages, startTime) {
  if (!LOG_FILE) return;
  try {
    for (const msg of messages) {
      let parsed = null;
      try { parsed = JSON.parse(msg); } catch {}
      const entry = {
        timestamp: new Date().toISOString(),
        project: (() => { try { return basename(process.cwd()); } catch { return 'unknown'; } })(),
        url,
        method: 'WS',
        isWebSocket: true,
        wsDirection: direction, // 'send' (client→upstream) or 'recv' (upstream→client)
        body: parsed || msg,
        response: direction === 'recv' ? { status: 200, body: parsed || msg } : null,
        duration: Date.now() - startTime,
        isStream: false,
        mainAgent: false,
      };
      appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n---\n');
    }
  } catch (err) {
    if (process.env.CXV_DEBUG) console.warn('[CX-Viewer Proxy] logWsEntry error:', err.message);
  }
}

export function startProxy() {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const { fullUrl, originalBaseUrl } = buildUpstreamUrl(req.url);
      if (process.env.CXV_DEBUG) console.error(`[CX-Proxy] ${req.method} ${req.url} → ${originalBaseUrl}`);

      // Use the patched fetch (which logs to cx-viewer)
      try {
        // Convert incoming headers
        const headers = { ...req.headers };
        delete headers.host; // Let fetch set the host

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
        // Log proxy errors only when debugging
        if (process.env.CXV_DEBUG) {
          console.error('[CX-Viewer Proxy] Error:', err);
        }

        res.statusCode = 502;
        res.end('Proxy Error');
      }
    });

    // ─── WebSocket upgrade handling ───
    // Codex uses WebSocket for its /responses endpoint.
    // We proxy the WebSocket connection to the upstream and intercept messages for logging.
    server.on('upgrade', (clientReq, clientSocket, clientHead) => {
      const { fullUrl: httpUrl, originalBaseUrl } = buildUpstreamUrl(clientReq.url);
      const startTime = Date.now();

      if (process.env.CXV_DEBUG) console.error(`[CX-Proxy WS] UPGRADE ${clientReq.url} → ${originalBaseUrl}`);

      // Build upstream URL
      let upstreamUrl;
      try {
        upstreamUrl = new URL(httpUrl);
      } catch (err) {
        if (process.env.CXV_DEBUG) console.error('[CX-Proxy WS] Invalid upstream URL:', httpUrl);
        clientSocket.destroy();
        return;
      }

      const isHttps = upstreamUrl.protocol === 'https:';
      const requestFn = isHttps ? httpsRequest : httpRequest;

      // Forward all headers except host
      const headers = { ...clientReq.headers };
      headers.host = upstreamUrl.host;

      const proxyReq = requestFn({
        hostname: upstreamUrl.hostname,
        port: upstreamUrl.port || (isHttps ? 443 : 80),
        path: upstreamUrl.pathname + upstreamUrl.search,
        method: 'GET',
        headers,
      });

      proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
        if (process.env.CXV_DEBUG) console.error(`[CX-Proxy WS] Connected to upstream ${upstreamUrl.host}`);

        // Send 101 response back to client
        let response = `HTTP/1.1 101 ${proxyRes.statusMessage || 'Switching Protocols'}\r\n`;
        const rawHeaders = proxyRes.rawHeaders;
        for (let i = 0; i < rawHeaders.length; i += 2) {
          response += `${rawHeaders[i]}: ${rawHeaders[i + 1]}\r\n`;
        }
        response += '\r\n';

        clientSocket.write(response);
        if (proxyHead.length > 0) clientSocket.write(proxyHead);
        if (clientHead.length > 0) proxySocket.write(clientHead);

        const wsUrl = httpUrl.replace(/^http/, 'ws');

        // Intercept data for logging (non-blocking, best-effort)
        clientSocket.on('data', (data) => {
          try {
            const msgs = parseWsFrames(data);
            if (msgs.length > 0) logWsEntry(wsUrl, 'send', msgs, startTime);
          } catch {}
          // Forward to upstream (socket.pipe handles this, but we log before pipe)
        });

        proxySocket.on('data', (data) => {
          try {
            const msgs = parseWsFrames(data);
            if (msgs.length > 0) logWsEntry(wsUrl, 'recv', msgs, startTime);
          } catch {}
        });

        // Pipe bidirectionally
        proxySocket.pipe(clientSocket);
        clientSocket.pipe(proxySocket);

        // Handle errors and close
        proxySocket.on('error', (err) => {
          if (process.env.CXV_DEBUG) console.error('[CX-Proxy WS] Upstream socket error:', err.message);
          clientSocket.destroy();
        });
        clientSocket.on('error', (err) => {
          if (process.env.CXV_DEBUG) console.error('[CX-Proxy WS] Client socket error:', err.message);
          proxySocket.destroy();
        });
        proxySocket.on('close', () => clientSocket.destroy());
        clientSocket.on('close', () => proxySocket.destroy());
      });

      // Handle non-upgrade response (e.g. 401, 403)
      proxyReq.on('response', (proxyRes) => {
        if (process.env.CXV_DEBUG) {
          console.error(`[CX-Proxy WS] Non-upgrade response: ${proxyRes.statusCode}`);
        }
        // Forward the HTTP response to the client socket
        let responseHead = `HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n`;
        const rawHeaders = proxyRes.rawHeaders;
        for (let i = 0; i < rawHeaders.length; i += 2) {
          responseHead += `${rawHeaders[i]}: ${rawHeaders[i + 1]}\r\n`;
        }
        responseHead += '\r\n';
        clientSocket.write(responseHead);
        proxyRes.pipe(clientSocket);
      });

      proxyReq.on('error', (err) => {
        if (process.env.CXV_DEBUG) console.error('[CX-Proxy WS] Proxy request error:', err.message);
        clientSocket.destroy();
      });

      proxyReq.end();
    });

    // Start on random port
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(address.port);
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}
