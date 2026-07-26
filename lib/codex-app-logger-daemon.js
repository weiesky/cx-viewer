#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { execFile } from 'node:child_process';

const stateIndex = process.argv.indexOf('--state');
const statePath = stateIndex >= 0 ? process.argv[stateIndex + 1] : null;
if (!statePath) {
  console.error('[CX Viewer] Codex App logger daemon requires --state');
  process.exit(64);
}

let state;
try {
  state = JSON.parse(readFileSync(statePath, 'utf8'));
} catch (error) {
  console.error(`[CX Viewer] Cannot read Codex App logger state: ${error.message}`);
  process.exit(78);
}
if (state?.schemaVersion !== 1 || !Number.isSafeInteger(state.port) || state.port < 1 || state.port > 65535
    || typeof state.healthToken !== 'string' || !/^[a-f0-9]{64}$/.test(state.healthToken)) {
  console.error('[CX Viewer] Invalid Codex App logger state');
  process.exit(78);
}

const allowedProxyEnv = new Set(['HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY']);
const invalidProxyUrl = ([key, value]) => {
  if (key === 'NO_PROXY') return false;
  try {
    return !['http:', 'https:', 'socks:', 'socks5:'].includes(new URL(value).protocol);
  } catch {
    return true;
  }
};
if (state.proxyEnv != null && (
  !state.proxyEnv
  || typeof state.proxyEnv !== 'object'
  || Array.isArray(state.proxyEnv)
  || Object.entries(state.proxyEnv).some(([key, value]) =>
    !allowedProxyEnv.has(key)
    || typeof value !== 'string'
    || value.length > 8192
    || invalidProxyUrl([key, value]))
)) {
  console.error('[CX Viewer] Invalid Codex App logger proxy environment');
  process.exit(78);
}
for (const [key, value] of Object.entries(state.proxyEnv || {})) process.env[key] = value;
process.env.CXV_PROXY_CA_DIR = dirname(statePath);

process.env.CXV_CAPTURE_ONLY = '1';
process.env.CXV_WORKSPACE_MODE = '1';
process.env.CXV_ORIGINAL_BASE_URL = state.upstreamBaseUrl || 'https://api.openai.com/v1';
process.env.CXV_ORIGINAL_CHATGPT_BASE_URL = state.chatgptBaseUrl || 'https://chatgpt.com/backend-api/codex';
const loopback = '127.0.0.1,localhost,::1';
const noProxy = process.env.NO_PROXY || process.env.no_proxy || '';
process.env.NO_PROXY = process.env.no_proxy = noProxy ? `${noProxy},${loopback}` : loopback;

const { startProxy, stopProxy } = await import('../proxy.js');
const { setupProxyEnv } = await import('./proxy-env.js');
const { planCodexAppLoggerProxyRefresh, restoreCodexAppLoggerRedirect } = await import('./codex-app-logger.js');
let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  stopProxy();
  try {
    const interceptor = await import('../interceptor.js');
    await interceptor.closeLogV2Writes();
  } catch {}
};
process.once('SIGTERM', () => { void stop().finally(() => process.exit(0)); });
process.once('SIGINT', () => { void stop().finally(() => process.exit(0)); });

try {
  await startProxy({
    port: state.port,
    health: {
      token: state.healthToken,
      body: {
        service: 'cxv-codex-app-logger',
        protocol: 1,
        pid: process.pid,
      },
    },
    readiness: {
      token: state.healthToken,
      url: `${String(state.chatgptBaseUrl || 'https://chatgpt.com/backend-api/codex').replace(/\/+$/, '')}/models`,
      timeoutMs: 5000,
    },
  });
  console.log(`[CX Viewer] Codex App logger listening on 127.0.0.1:${state.port}`);
  let systemProxyFingerprint = JSON.stringify(state.systemProxyEnv || {});
  let proxyRefreshInFlight = false;
  const refreshSystemProxy = () => {
    if (proxyRefreshInFlight) return;
    proxyRefreshInFlight = true;
    execFile('/usr/sbin/scutil', ['--proxy'], { encoding: 'utf8', timeout: 3000 }, (error, stdout) => {
      proxyRefreshInFlight = false;
      if (error) return;
      const refresh = planCodexAppLoggerProxyRefresh(systemProxyFingerprint, stdout);
      if (!refresh.changed) return;
      systemProxyFingerprint = refresh.fingerprint;
      for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']) {
        delete process.env[key];
      }
      for (const [key, value] of Object.entries(refresh.proxyEnv)) process.env[key] = value;
      setupProxyEnv();
      console.log('[CX Viewer] Refreshed system proxy settings');
    });
  };
  refreshSystemProxy();
  setInterval(refreshSystemProxy, 15000).unref();
} catch (error) {
  console.error(`[CX Viewer] Codex App logger failed: ${error.message}`);
  if (state.installing === false && typeof state.configPath === 'string') {
    try {
      if (restoreCodexAppLoggerRedirect(state.configPath) === 'removed') {
        console.error('[CX Viewer] Restored config.toml because the logger could not own its loopback port');
      }
    } catch (restoreError) {
      console.error(`[CX Viewer] Could not restore config.toml: ${restoreError.message}`);
    }
  }
  process.exit(1);
}
