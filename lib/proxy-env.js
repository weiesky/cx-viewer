import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';
import tls from 'node:tls';
import { execFileSync } from 'node:child_process';
import { existsSync, statSync, writeFileSync, appendFileSync, readFileSync } from 'node:fs';

// 纯函数，从 env 中解析代理配置（可独立测试）
export function resolveProxyConfig(env = process.env) {
  const allProxy = env.all_proxy || env.ALL_PROXY;
  return {
    httpProxy: env.http_proxy || env.HTTP_PROXY || allProxy || undefined,
    httpsProxy: env.https_proxy || env.HTTPS_PROXY || allProxy || undefined,
    noProxy: env.no_proxy || env.NO_PROXY || undefined,
  };
}

/** On macOS, export system CA certificates and monkey-patch
 *  `tls.createSecureContext` so ALL HTTPS connections (including undici's
 *  internal TLS upgrade after CONNECT) trust corporate/Clash MITM CAs.
 *
 *  `NODE_EXTRA_CA_CERTS` cannot be used here because Node.js reads it once
 *  at bootstrap — runtime `process.env` changes are ignored.  */
function _injectSystemCAs() {
  if (process.platform !== 'darwin') return;
  const caFile = '/tmp/cxv-system-ca.pem';
  // Use cache if fresh (< 24 hours)
  try {
    if (!existsSync(caFile) || statSync(caFile).size <= 100 || (Date.now() - statSync(caFile).mtimeMs) > 86400000) {
      writeFileSync(caFile, '', 'utf-8');
      const searches = [
        ['find-certificate', '-a', '-p'],
        ['find-certificate', '-c', 'StarPoint', '-p'],
        ['find-certificate', '-c', 'Clash', '-p'],
        ['find-certificate', '-c', 'mihomo', '-p'],
      ];
      for (const args of searches) {
        try {
          const out = execFileSync('security', args,
            { timeout: 8000, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
          );
          if (out && out.includes('BEGIN CERTIFICATE')) appendFileSync(caFile, out, 'utf-8');
        } catch {}
      }
    }
  } catch {}
  if (!existsSync(caFile) || statSync(caFile).size <= 100) return;

  const systemCerts = readFileSync(caFile);
  const _origCSC = tls.createSecureContext;
  tls.createSecureContext = function (options = {}) {
    if (!options.ca) return _origCSC({ ...options, ca: [...tls.rootCertificates, systemCerts] });
    return _origCSC(options);
  };
  if (process.env.CXV_DEBUG) console.error('[CX Viewer] Injected macOS system CA certs into tls.createSecureContext');
}

export function setupProxyEnv() {
  _injectSystemCAs();
  const { httpProxy, httpsProxy, noProxy } = resolveProxyConfig();
  if (!httpProxy && !httpsProxy) return;

  setGlobalDispatcher(new EnvHttpProxyAgent({ httpProxy, httpsProxy, noProxy }));
  if (process.env.CXV_DEBUG) {
    console.error(`[CX Viewer] HTTP proxy: http=${httpProxy || '(none)'}, https=${httpsProxy || '(none)'}${noProxy ? `, no_proxy=${noProxy}` : ''}`);
  }
}

setupProxyEnv();
