import { Agent, EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';
import tls from 'node:tls';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import { atomicWriteFile } from './logger-install.js';

let systemCAsInjected = false;
let activeDispatcher = null;
let activeProxyFingerprint = null;

// 纯函数，从 env 中解析代理配置（可独立测试）
export function resolveProxyConfig(env = process.env) {
  const allProxy = env.all_proxy || env.ALL_PROXY;
  return {
    httpProxy: env.http_proxy || env.HTTP_PROXY || allProxy || undefined,
    httpsProxy: env.https_proxy || env.HTTPS_PROXY || allProxy || undefined,
    noProxy: env.no_proxy || env.NO_PROXY || undefined,
  };
}

export function getSystemCaCachePath(env = process.env) {
  const cacheDir = env.CXV_PROXY_CA_DIR || join(homedir(), '.codex', 'cx-viewer', 'runtime');
  return join(cacheDir, 'system-ca.pem');
}

function isPrivateRegularFile(path) {
  try {
    const stat = lstatSync(path);
    return stat.isFile()
      && (!process.getuid || stat.uid === process.getuid())
      && (stat.mode & 0o077) === 0;
  } catch {
    return false;
  }
}

/** Export macOS system CAs into a per-user private cache, then make runtime
 * TLS contexts trust them. NODE_EXTRA_CA_CERTS is unavailable after startup. */
function injectSystemCAs() {
  if (process.platform !== 'darwin' || systemCAsInjected) return;
  const caFile = getSystemCaCachePath();
  const cacheDir = dirname(caFile);
  try {
    mkdirSync(cacheDir, { recursive: true, mode: 0o700 });
    chmodSync(cacheDir, 0o700);
    const stat = isPrivateRegularFile(caFile) ? lstatSync(caFile) : null;
    if (!stat || stat.size <= 100 || (Date.now() - stat.mtimeMs) > 86400000) {
      const pem = execFileSync('/usr/bin/security', ['find-certificate', '-a', '-p'], {
        timeout: 8000,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      if (pem?.includes('BEGIN CERTIFICATE')) atomicWriteFile(caFile, pem, { mode: 0o600 });
    }
  } catch {}
  if (!existsSync(caFile) || !isPrivateRegularFile(caFile)) return;
  let systemCerts;
  try {
    systemCerts = readFileSync(caFile);
    if (systemCerts.length <= 100 || systemCerts.length > 16 * 1024 * 1024) return;
  } catch {
    return;
  }

  const originalCreateSecureContext = tls.createSecureContext;
  tls.createSecureContext = function (options = {}) {
    if (!options.ca) return originalCreateSecureContext({ ...options, ca: [...tls.rootCertificates, systemCerts] });
    return originalCreateSecureContext(options);
  };
  systemCAsInjected = true;
  if (process.env.CXV_DEBUG) console.error('[CX Viewer] Injected macOS system CA certs into tls.createSecureContext');
}

export function setupProxyEnv(env = process.env) {
  injectSystemCAs();
  const { httpProxy, httpsProxy, noProxy } = resolveProxyConfig(env);
  const fingerprint = JSON.stringify({ httpProxy, httpsProxy, noProxy });
  if (activeDispatcher && fingerprint === activeProxyFingerprint) {
    return Object.freeze({ httpProxy, httpsProxy, noProxy });
  }
  const nextDispatcher = httpProxy || httpsProxy
    ? new EnvHttpProxyAgent({ httpProxy, httpsProxy, noProxy })
    : new Agent();
  const previousDispatcher = activeDispatcher;
  activeDispatcher = nextDispatcher;
  activeProxyFingerprint = fingerprint;
  setGlobalDispatcher(nextDispatcher);
  if (previousDispatcher) void previousDispatcher.close().catch(() => {});
  if (process.env.CXV_DEBUG) {
    console.error(`[CX Viewer] HTTP proxy: http=${httpProxy || '(none)'}, https=${httpsProxy || '(none)'}${noProxy ? `, no_proxy=${noProxy}` : ''}`);
  }
  return Object.freeze({ httpProxy, httpsProxy, noProxy });
}
