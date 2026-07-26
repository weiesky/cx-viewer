import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
} from 'node:fs';
import { request as httpRequest } from 'node:http';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

import { getCodexConfigDir, getCodexConfigPath, isLoopbackBaseUrl } from './codex-config.js';
import { atomicWriteFile } from './logger-install.js';
import { resolveProxyConfig } from './proxy-env.js';

export const CODEX_APP_LOGGER_LABEL = 'com.cxviewer.codex-app-logger';
export const CODEX_APP_LOGGER_PORT = 57891;
export const CODEX_APP_LOGGER_HEALTH = Object.freeze({
  service: 'cxv-codex-app-logger',
  protocol: 1,
});
export const CODEX_APP_LOGGER_START = '# >>> CX-Viewer Codex App Logger >>>';
export const CODEX_APP_LOGGER_END = '# <<< CX-Viewer Codex App Logger <<<';

const ORIGINAL_LINE_PREFIX = '# original-openai-base-url-line-base64: ';
const APP_CANDIDATES = [
  '/Applications/ChatGPT.app/Contents/Resources/codex',
  '/Applications/Codex.app/Contents/Resources/codex',
];

function systemProxyUrl(protocol, host, port) {
  if (typeof host !== 'string' || !host.trim()) return null;
  const numericPort = Number(port);
  if (!Number.isSafeInteger(numericPort) || numericPort < 1 || numericPort > 65535) return null;
  const hostname = host.trim().includes(':') ? `[${host.trim().replace(/^\[|\]$/g, '')}]` : host.trim();
  return `${protocol}://${hostname}:${numericPort}`;
}

export function parseMacOsProxySettings(output) {
  const values = {};
  for (const line of String(output || '').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z]+)\s*:\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2];
  }
  const httpProxy = values.HTTPEnable === '1'
    ? systemProxyUrl('http', values.HTTPProxy, values.HTTPPort)
    : null;
  const httpsProxy = values.HTTPSEnable === '1'
    ? systemProxyUrl('http', values.HTTPSProxy, values.HTTPSPort)
    : null;
  const socksProxy = values.SOCKSEnable === '1'
    ? systemProxyUrl('socks5', values.SOCKSProxy, values.SOCKSPort)
    : null;
  return {
    ...(httpProxy || socksProxy ? { HTTP_PROXY: httpProxy || socksProxy } : {}),
    ...(httpsProxy || httpProxy || socksProxy ? { HTTPS_PROXY: httpsProxy || httpProxy || socksProxy } : {}),
  };
}

export function resolveCodexAppLoggerProxyEnv(env = process.env, macOsProxyOutput = '') {
  const { httpProxy, httpsProxy, noProxy } = resolveProxyConfig(env);
  if (!httpProxy && !httpsProxy) return {
    ...parseMacOsProxySettings(macOsProxyOutput),
    ...(noProxy ? { NO_PROXY: noProxy } : {}),
  };
  return {
    ...(httpProxy ? { HTTP_PROXY: httpProxy } : {}),
    ...(httpsProxy || httpProxy ? { HTTPS_PROXY: httpsProxy || httpProxy } : {}),
    ...(noProxy ? { NO_PROXY: noProxy } : {}),
  };
}

export function planCodexAppLoggerProxyRefresh(previousFingerprint, macOsProxyOutput) {
  const proxyEnv = parseMacOsProxySettings(macOsProxyOutput);
  const fingerprint = JSON.stringify(proxyEnv);
  return Object.freeze({
    changed: fingerprint !== previousFingerprint,
    fingerprint,
    proxyEnv: Object.freeze(proxyEnv),
  });
}

function encodeOriginalLine(line) {
  return line == null ? '-' : Buffer.from(line, 'utf8').toString('base64');
}

function decodeOriginalLine(value) {
  if (!value || value === '-') return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return undefined;
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    return Buffer.from(decoded, 'utf8').toString('base64') === value ? decoded : undefined;
  } catch {
    return undefined;
  }
}

function parseAssignmentString(line, key) {
  const match = String(line || '').match(new RegExp(`^\\s*${key}\\s*=\\s*("(?:[^"\\\\]|\\\\.)*"|'[^']*')`));
  if (!match) return null;
  try {
    return match[1].startsWith('"') ? JSON.parse(match[1]) : match[1].slice(1, -1);
  } catch {
    return null;
  }
}

function findTopLevelAssignment(lines, key) {
  for (let index = 0; index < lines.length; index++) {
    if (/^\s*\[/.test(lines[index])) break;
    if (new RegExp(`^\\s*${key}\\s*=`).test(lines[index])) {
      return { index, line: lines[index], value: parseAssignmentString(lines[index], key) };
    }
  }
  return null;
}

function assertSingleTopLevelAssignment(lines, key) {
  let count = 0;
  for (const line of lines) {
    if (/^\s*\[/.test(line)) break;
    if (new RegExp(`^\\s*${key}\\s*=`).test(line)) count++;
  }
  if (count > 1) {
    const error = new Error(`Multiple top-level ${key} assignments are unsafe to rewrite`);
    error.code = 'CXV_CODEX_APP_LOGGER_DUPLICATE_CONFIG';
    throw error;
  }
}

function findManagedBlock(lines) {
  const start = lines.indexOf(CODEX_APP_LOGGER_START);
  if (start < 0) return null;
  const end = lines.indexOf(CODEX_APP_LOGGER_END, start + 1);
  if (end < 0) {
    const error = new Error('CX Viewer Codex App logger config block is incomplete');
    error.code = 'CXV_CODEX_APP_LOGGER_CONFIG_CORRUPT';
    throw error;
  }
  const metadata = lines.slice(start + 1, end)
    .find(line => line.startsWith(ORIGINAL_LINE_PREFIX));
  if (!metadata) {
    const error = new Error('CX Viewer Codex App logger config block has no restore metadata');
    error.code = 'CXV_CODEX_APP_LOGGER_CONFIG_CORRUPT';
    throw error;
  }
  const originalLine = decodeOriginalLine(metadata.slice(ORIGINAL_LINE_PREFIX.length));
  if (originalLine === undefined
      || (originalLine !== null && parseAssignmentString(originalLine, 'openai_base_url') === null)) {
    const error = new Error('CX Viewer Codex App logger restore metadata is invalid');
    error.code = 'CXV_CODEX_APP_LOGGER_CONFIG_CORRUPT';
    throw error;
  }
  return {
    start,
    end,
    originalLine,
  };
}

function joinTomlLines(lines, hadTrailingNewline) {
  const joined = lines.join('\n').replace(/\n*$/, '');
  return joined ? `${joined}${hadTrailingNewline ? '\n' : ''}` : '';
}

export function installCodexAppLoggerConfig(content, proxyUrl) {
  const parsedProxy = new URL(proxyUrl);
  if (parsedProxy.protocol !== 'http:' || !isLoopbackBaseUrl(parsedProxy.href)) {
    throw new TypeError('Codex App logger proxy URL must use HTTP loopback');
  }

  const source = String(content || '');
  const hadTrailingNewline = source.endsWith('\n');
  const lines = source.split(/\r?\n/);
  if (hadTrailingNewline) lines.pop();
  assertSingleTopLevelAssignment(lines, 'openai_base_url');
  assertSingleTopLevelAssignment(lines, 'chatgpt_base_url');
  const originalChatgptBaseUrl = findTopLevelAssignment(lines, 'chatgpt_base_url')?.value || null;
  const managed = findManagedBlock(lines);
  if (managed) {
    const replacement = [
      CODEX_APP_LOGGER_START,
      `${ORIGINAL_LINE_PREFIX}${encodeOriginalLine(managed.originalLine)}`,
      `openai_base_url = ${JSON.stringify(proxyUrl)}`,
      CODEX_APP_LOGGER_END,
    ];
    lines.splice(managed.start, managed.end - managed.start + 1, ...replacement);
    return {
      content: joinTomlLines(lines, hadTrailingNewline || lines.length > 0),
      originalBaseUrl: parseAssignmentString(managed.originalLine, 'openai_base_url'),
      originalChatgptBaseUrl,
      status: 'updated',
    };
  }

  const original = findTopLevelAssignment(lines, 'openai_base_url');
  if (original?.value && isLoopbackBaseUrl(original.value)) {
    const error = new Error(`Existing openai_base_url already points at a local proxy: ${original.value}`);
    error.code = 'CXV_CODEX_APP_LOGGER_LOCAL_PROXY_CONFLICT';
    throw error;
  }
  if (original?.value) {
    const parsedOriginal = new URL(original.value);
    if (!['http:', 'https:'].includes(parsedOriginal.protocol)) {
      const error = new Error(`Unsupported openai_base_url protocol: ${parsedOriginal.protocol}`);
      error.code = 'CXV_CODEX_APP_LOGGER_UPSTREAM_INVALID';
      throw error;
    }
  }

  const block = [
    CODEX_APP_LOGGER_START,
    `${ORIGINAL_LINE_PREFIX}${encodeOriginalLine(original?.line ?? null)}`,
    `openai_base_url = ${JSON.stringify(proxyUrl)}`,
    CODEX_APP_LOGGER_END,
  ];
  if (original) {
    lines.splice(original.index, 1, ...block);
  } else {
    const firstSection = lines.findIndex(line => /^\s*\[/.test(line));
    const insertAt = firstSection < 0 ? lines.length : firstSection;
    if (insertAt > 0 && lines[insertAt - 1].trim() !== '') block.push('');
    lines.splice(insertAt, 0, ...block);
  }
  return {
    content: joinTomlLines(lines, true),
    originalBaseUrl: original?.value || null,
    originalChatgptBaseUrl,
    status: 'installed',
  };
}

export function uninstallCodexAppLoggerConfig(content) {
  const source = String(content || '');
  const hadTrailingNewline = source.endsWith('\n');
  const lines = source.split(/\r?\n/);
  if (hadTrailingNewline) lines.pop();
  const managed = findManagedBlock(lines);
  if (!managed) return { content: source, status: 'clean' };
  lines.splice(
    managed.start,
    managed.end - managed.start + 1,
    ...(managed.originalLine == null ? [] : [managed.originalLine]),
  );
  return {
    content: joinTomlLines(lines, hadTrailingNewline),
    status: 'removed',
  };
}

export function renderCodexAppLoggerLaunchAgent({
  nodePath,
  daemonPath,
  statePath,
  stdoutPath,
  stderrPath,
}) {
  const xml = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xml(CODEX_APP_LOGGER_LABEL)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xml(nodePath)}</string>
    <string>${xml(daemonPath)}</string>
    <string>--state</string>
    <string>${xml(statePath)}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>2</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>${xml(stdoutPath)}</string>
  <key>StandardErrorPath</key>
  <string>${xml(stderrPath)}</string>
</dict>
</plist>
`;
}

export function getCodexAppLoggerPaths({
  env = process.env,
  homeDir = homedir(),
  moduleDir = dirname(fileURLToPath(import.meta.url)),
} = {}) {
  const configDir = getCodexConfigDir(env);
  const stateDir = join(configDir, 'cx-viewer', 'app-logger');
  return Object.freeze({
    configPath: getCodexConfigPath(env),
    daemonPath: resolve(moduleDir, 'codex-app-logger-daemon.js'),
    launchAgentPath: join(homeDir, 'Library', 'LaunchAgents', `${CODEX_APP_LOGGER_LABEL}.plist`),
    stateDir,
    statePath: join(stateDir, 'state.json'),
    stdoutPath: join(stateDir, 'stdout.log'),
    stderrPath: join(stateDir, 'stderr.log'),
  });
}

export function findInstalledCodexApp(candidates = APP_CANDIDATES) {
  return candidates.find(candidate => existsSync(candidate)) || null;
}

export function probeCodexAppLogger(port, { timeoutMs = 800, healthToken = null } = {}) {
  return new Promise(resolveProbe => {
    const req = httpRequest({
      host: '127.0.0.1',
      port,
      path: '/__cxv/health',
      method: 'GET',
      timeout: timeoutMs,
      headers: healthToken ? { 'x-cxv-health-token': healthToken } : {},
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          resolveProbe(res.statusCode === 200
            && body?.service === CODEX_APP_LOGGER_HEALTH.service
            && body?.protocol === CODEX_APP_LOGGER_HEALTH.protocol);
        } catch {
          resolveProbe(false);
        }
      });
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolveProbe(false));
    req.end();
  });
}

export function probeCodexAppLoggerReadiness(port, { timeoutMs = 6000, healthToken = null } = {}) {
  return new Promise(resolveProbe => {
    const req = httpRequest({
      host: '127.0.0.1',
      port,
      path: '/__cxv/ready',
      method: 'GET',
      timeout: timeoutMs,
      headers: healthToken ? { 'x-cxv-health-token': healthToken } : {},
    }, res => {
      res.resume();
      res.on('end', () => resolveProbe(res.statusCode === 200));
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolveProbe(false));
    req.end();
  });
}

function runLaunchctl(args, runner = spawnSync) {
  const result = runner('/bin/launchctl', args, { encoding: 'utf8' });
  return {
    ok: result.status === 0,
    status: result.status,
    stderr: String(result.stderr || '').trim(),
  };
}

function snapshotFile(path) {
  if (!existsSync(path)) return null;
  return { content: readFileSync(path), mode: lstatSync(path).mode & 0o777 };
}

function restoreFile(path, snapshot) {
  if (!snapshot) {
    if (existsSync(path)) unlinkSync(path);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  atomicWriteFile(path, snapshot.content, { mode: snapshot.mode });
  chmodSync(path, snapshot.mode);
}

function assertSafeConfigPath(path) {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) {
    const error = new Error(`Refusing to replace symlinked Codex config: ${path}`);
    error.code = 'CXV_CODEX_APP_LOGGER_CONFIG_SYMLINK';
    throw error;
  }
}

function readConfig(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function writeConfigIfUnchanged(path, expected, content) {
  assertSafeConfigPath(path);
  if (readConfig(path) !== expected) {
    const error = new Error('Codex config changed while the App logger was starting; no changes were applied');
    error.code = 'CXV_CODEX_APP_LOGGER_CONFIG_CHANGED';
    throw error;
  }
  mkdirSync(dirname(path), { recursive: true });
  atomicWriteFile(path, content, { mode: 0o600 });
}

export async function installCodexAppLogger({
  env = process.env,
  homeDir = homedir(),
  platform = process.platform,
  nodePath = process.execPath,
  port = CODEX_APP_LOGGER_PORT,
  launchctlRunner = spawnSync,
  systemProxyRunner = spawnSync,
  appCandidates = APP_CANDIDATES,
  probeHealth = probeCodexAppLogger,
  probeReadiness = probeCodexAppLoggerReadiness,
} = {}) {
  if (platform !== 'darwin') return { status: 'unsupported-platform' };
  const appPath = findInstalledCodexApp(appCandidates);
  if (!appPath) return { status: 'app-not-found' };
  const paths = getCodexAppLoggerPaths({ env, homeDir });
  assertSafeConfigPath(paths.configPath);
  const proxyUrl = `http://127.0.0.1:${port}/v1`;
  const originalConfig = readConfig(paths.configPath);
  const configPlan = installCodexAppLoggerConfig(originalConfig, proxyUrl);

  mkdirSync(paths.stateDir, { recursive: true, mode: 0o700 });
  chmodSync(paths.stateDir, 0o700);
  mkdirSync(dirname(paths.launchAgentPath), { recursive: true });
  const stateSnapshot = snapshotFile(paths.statePath);
  const plistSnapshot = snapshotFile(paths.launchAgentPath);
  let previousState = null;
  try {
    if (existsSync(paths.statePath)) previousState = JSON.parse(readFileSync(paths.statePath, 'utf8'));
  } catch {}
  let macOsProxyOutput = '';
  try {
    const result = systemProxyRunner('/usr/sbin/scutil', ['--proxy'], { encoding: 'utf8' });
    if (result?.status === 0) macOsProxyOutput = String(result.stdout || '');
  } catch {}
  const proxyEnv = resolveCodexAppLoggerProxyEnv(env, macOsProxyOutput);
  const systemProxyEnv = parseMacOsProxySettings(macOsProxyOutput);
  const healthToken = typeof previousState?.healthToken === 'string'
    && /^[a-f0-9]{64}$/.test(previousState.healthToken)
    ? previousState.healthToken
    : randomBytes(32).toString('hex');
  const state = {
    schemaVersion: 1,
    port,
    healthToken,
    upstreamBaseUrl: configPlan.originalBaseUrl,
    chatgptBaseUrl: configPlan.originalChatgptBaseUrl || 'https://chatgpt.com/backend-api/codex',
    proxyEnv,
    systemProxyEnv,
    configPath: paths.configPath,
    installing: true,
    installedAt: new Date().toISOString(),
  };
  const domain = `gui/${process.getuid()}`;
  const oldHealthToken = previousState?.healthToken;
  const oldWasHealthy = typeof oldHealthToken === 'string'
    && await probeHealth(previousState?.port || port, { healthToken: oldHealthToken });
  try {
    atomicWriteFile(paths.statePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
    chmodSync(paths.statePath, 0o600);
    const plist = renderCodexAppLoggerLaunchAgent({
      nodePath,
      daemonPath: paths.daemonPath,
      statePath: paths.statePath,
      stdoutPath: paths.stdoutPath,
      stderrPath: paths.stderrPath,
    });
    atomicWriteFile(paths.launchAgentPath, plist, { mode: 0o600 });
    chmodSync(paths.launchAgentPath, 0o600);
    runLaunchctl(['bootout', domain, paths.launchAgentPath], launchctlRunner);
    const boot = runLaunchctl(['bootstrap', domain, paths.launchAgentPath], launchctlRunner);
    if (!boot.ok) {
      const error = new Error(`launchctl bootstrap failed: ${boot.stderr || `status ${boot.status}`}`);
      error.code = 'CXV_CODEX_APP_LOGGER_BOOTSTRAP_FAILED';
      throw error;
    }
    let healthy = false;
    for (let attempt = 0; attempt < 30 && !healthy; attempt++) {
      healthy = await probeHealth(port, { healthToken });
      if (!healthy) await new Promise(resolveWait => setTimeout(resolveWait, 100));
    }
    if (!healthy) {
      const error = new Error(`Codex App logger did not become healthy on 127.0.0.1:${port}`);
      error.code = 'CXV_CODEX_APP_LOGGER_UNHEALTHY';
      throw error;
    }
    let ready = false;
    for (let attempt = 0; attempt < 3 && !ready; attempt++) {
      ready = await probeReadiness(port, { healthToken });
      if (!ready) await new Promise(resolveWait => setTimeout(resolveWait, 250));
    }
    if (!ready) {
      const error = new Error('Codex App logger cannot reach the ChatGPT upstream');
      error.code = 'CXV_CODEX_APP_LOGGER_UPSTREAM_UNREADY';
      throw error;
    }
    const activeState = { ...state, installing: false };
    atomicWriteFile(paths.statePath, `${JSON.stringify(activeState, null, 2)}\n`, { mode: 0o600 });
    writeConfigIfUnchanged(paths.configPath, originalConfig, configPlan.content);
    return { status: configPlan.status, appPath, port, proxyUrl, ...paths };
  } catch (error) {
    runLaunchctl(['bootout', domain, paths.launchAgentPath], launchctlRunner);
    const rollbackErrors = [];
    try { restoreFile(paths.statePath, stateSnapshot); } catch (rollbackError) { rollbackErrors.push(rollbackError); }
    try { restoreFile(paths.launchAgentPath, plistSnapshot); } catch (rollbackError) { rollbackErrors.push(rollbackError); }
    if (oldWasHealthy && plistSnapshot && rollbackErrors.length === 0) {
      const boot = runLaunchctl(['bootstrap', domain, paths.launchAgentPath], launchctlRunner);
      if (!boot.ok) rollbackErrors.push(new Error(`old daemon bootstrap failed: ${boot.stderr || boot.status}`));
      let restoredHealthy = false;
      for (let attempt = 0; attempt < 20 && boot.ok && !restoredHealthy; attempt++) {
        restoredHealthy = await probeHealth(previousState.port || port, { healthToken: oldHealthToken });
        if (!restoredHealthy) await new Promise(resolveWait => setTimeout(resolveWait, 100));
      }
      if (boot.ok && !restoredHealthy) rollbackErrors.push(new Error('old daemon did not become healthy after rollback'));
    }
    if ((!oldWasHealthy || rollbackErrors.length > 0) && originalConfig.includes(CODEX_APP_LOGGER_START)) {
      try {
        const restoredConfig = uninstallCodexAppLoggerConfig(originalConfig).content;
        writeConfigIfUnchanged(paths.configPath, originalConfig, restoredConfig);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length > 0) error.rollbackErrors = rollbackErrors.map(item => item.message);
    throw error;
  }
}

export function restoreCodexAppLoggerRedirect(configPath) {
  assertSafeConfigPath(configPath);
  const current = readConfig(configPath);
  const restored = uninstallCodexAppLoggerConfig(current);
  if (restored.status === 'removed') writeConfigIfUnchanged(configPath, current, restored.content);
  return restored.status;
}

export async function uninstallCodexAppLogger({
  env = process.env,
  homeDir = homedir(),
  platform = process.platform,
  launchctlRunner = spawnSync,
} = {}) {
  if (platform !== 'darwin') return { status: 'unsupported-platform' };
  const paths = getCodexAppLoggerPaths({ env, homeDir });
  assertSafeConfigPath(paths.configPath);
  let configStatus = 'clean';
  if (existsSync(paths.configPath)) {
    const current = readFileSync(paths.configPath, 'utf8');
    const result = uninstallCodexAppLoggerConfig(current);
    configStatus = result.status;
    if (result.status === 'removed') atomicWriteFile(paths.configPath, result.content, { mode: 0o600 });
  }

  const domain = `gui/${process.getuid()}`;
  const errors = [];
  const bootout = runLaunchctl(['bootout', domain, paths.launchAgentPath], launchctlRunner);
  if (!bootout.ok && existsSync(paths.launchAgentPath)) errors.push(new Error(`launchctl bootout failed: ${bootout.stderr || bootout.status}`));
  for (const path of [paths.launchAgentPath, paths.statePath]) {
    try { if (existsSync(path)) unlinkSync(path); } catch (error) { errors.push(error); }
  }
  if (errors.length > 0) throw new AggregateError(errors, 'Codex App logger uninstall was incomplete');
  return { status: configStatus === 'removed' ? 'removed' : 'clean', ...paths };
}
