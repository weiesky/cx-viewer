import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  CODEX_APP_LOGGER_END,
  CODEX_APP_LOGGER_HEALTH,
  CODEX_APP_LOGGER_START,
  installCodexAppLogger,
  installCodexAppLoggerConfig,
  parseMacOsProxySettings,
  planCodexAppLoggerProxyRefresh,
  renderCodexAppLoggerLaunchAgent,
  resolveCodexAppLoggerProxyEnv,
  uninstallCodexAppLogger,
  uninstallCodexAppLoggerConfig,
} from '../lib/codex-app-logger.js';
import { startProxy, stopProxy } from '../proxy.js';

test('managed Codex App logger config preserves and restores an existing upstream', () => {
  const original = [
    'model = "gpt-test"',
    'openai_base_url = "https://gateway.example/openai/v1" # keep me',
    'chatgpt_base_url = "https://chat.example/backend-api/codex"',
    '',
    '[features]',
    'web_search_request = true',
    '',
  ].join('\n');
  const installed = installCodexAppLoggerConfig(original, 'http://127.0.0.1:57891/v1');
  assert.equal(installed.originalBaseUrl, 'https://gateway.example/openai/v1');
  assert.equal(installed.originalChatgptBaseUrl, 'https://chat.example/backend-api/codex');
  assert.match(installed.content, new RegExp(CODEX_APP_LOGGER_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(installed.content, /openai_base_url = "http:\/\/127\.0\.0\.1:57891\/v1"/);
  assert.equal(installed.content.match(/^openai_base_url\s*=/gm)?.length, 1);

  const removed = uninstallCodexAppLoggerConfig(installed.content);
  assert.equal(removed.status, 'removed');
  assert.equal(removed.content, original);
});

test('managed Codex App logger config is idempotent and removable when no upstream existed', () => {
  const original = 'model = "gpt-test"\n\n[features]\nweb_search_request = true\n';
  const first = installCodexAppLoggerConfig(original, 'http://127.0.0.1:57891/v1');
  const second = installCodexAppLoggerConfig(first.content, 'http://127.0.0.1:57891/v1');
  assert.equal(second.status, 'updated');
  assert.equal(second.content, first.content);
  assert.equal(second.content.match(new RegExp(CODEX_APP_LOGGER_END, 'g'))?.length, 1);
  assert.equal(uninstallCodexAppLoggerConfig(second.content).content, original);
});

test('managed Codex App logger can install into and clean an empty config', () => {
  const installed = installCodexAppLoggerConfig('', 'http://127.0.0.1:57891/v1');
  assert.equal(installed.originalBaseUrl, null);
  assert.equal(uninstallCodexAppLoggerConfig(installed.content).content, '');
});

test('managed Codex App logger refuses to replace an unrelated local proxy', () => {
  assert.throws(
    () => installCodexAppLoggerConfig(
      'openai_base_url = "http://127.0.0.1:9000/v1"\n',
      'http://127.0.0.1:57891/v1',
    ),
    error => error?.code === 'CXV_CODEX_APP_LOGGER_LOCAL_PROXY_CONFLICT',
  );
});

test('managed Codex App logger refuses corrupt restore metadata', () => {
  assert.throws(
    () => uninstallCodexAppLoggerConfig([
      CODEX_APP_LOGGER_START,
      'openai_base_url = "http://127.0.0.1:57891/v1"',
      CODEX_APP_LOGGER_END,
      '',
    ].join('\n')),
    error => error?.code === 'CXV_CODEX_APP_LOGGER_CONFIG_CORRUPT',
  );
});

test('managed Codex App logger refuses duplicate top-level URL assignments', () => {
  assert.throws(
    () => installCodexAppLoggerConfig(
      'openai_base_url = "https://one.example/v1"\nopenai_base_url = "https://two.example/v1"\n',
      'http://127.0.0.1:57891/v1',
    ),
    error => error?.code === 'CXV_CODEX_APP_LOGGER_DUPLICATE_CONFIG',
  );
});

test('launch agent plist escapes paths and keeps the daemon alive', () => {
  const plist = renderCodexAppLoggerLaunchAgent({
    nodePath: '/opt/Node & Tools/node',
    daemonPath: '/tmp/cxv<daemon>.js',
    statePath: '/tmp/state.json',
    stdoutPath: '/tmp/stdout.log',
    stderrPath: '/tmp/stderr.log',
  });
  assert.match(plist, /<key>KeepAlive<\/key>\s*<true\/>/);
  assert.match(plist, /\/opt\/Node &amp; Tools\/node/);
  assert.match(plist, /\/tmp\/cxv&lt;daemon&gt;\.js/);
});

test('Codex App logger keeps the installing CLI proxy environment', () => {
  assert.deepEqual(resolveCodexAppLoggerProxyEnv({
    HTTP_PROXY: 'http://127.0.0.1:13659',
    HTTPS_PROXY: 'http://127.0.0.1:13659',
    ALL_PROXY: 'socks5://ignored.example:1080',
    NO_PROXY: 'localhost,127.0.0.1',
  }, `
    SOCKSEnable : 1
    SOCKSPort : 7890
    SOCKSProxy : system.example
  `), {
    HTTP_PROXY: 'http://127.0.0.1:13659',
    HTTPS_PROXY: 'http://127.0.0.1:13659',
    NO_PROXY: 'localhost,127.0.0.1',
  });
});

test('Codex App logger falls back to macOS SOCKS settings', () => {
  const output = `
<dictionary> {
  HTTPEnable : 0
  HTTPSEnable : 0
  SOCKSEnable : 1
  SOCKSPort : 13659
  SOCKSProxy : 127.0.0.1
}
`;
  assert.deepEqual(parseMacOsProxySettings(output), {
    HTTP_PROXY: 'socks5://127.0.0.1:13659',
    HTTPS_PROXY: 'socks5://127.0.0.1:13659',
  });
  assert.deepEqual(resolveCodexAppLoggerProxyEnv({}, output), {
    HTTP_PROXY: 'socks5://127.0.0.1:13659',
    HTTPS_PROXY: 'socks5://127.0.0.1:13659',
  });
});

test('Codex App logger refresh detects proxy changes including disablement', () => {
  const enabled = 'SOCKSEnable : 1\nSOCKSProxy : 127.0.0.1\nSOCKSPort : 7890\n';
  const first = planCodexAppLoggerProxyRefresh('{}', enabled);
  assert.equal(first.changed, true);
  assert.equal(first.proxyEnv.HTTPS_PROXY, 'socks5://127.0.0.1:7890');
  assert.equal(planCodexAppLoggerProxyRefresh(first.fingerprint, enabled).changed, false);
  const disabled = planCodexAppLoggerProxyRefresh(first.fingerprint, 'SOCKSEnable : 0\n');
  assert.equal(disabled.changed, true);
  assert.deepEqual(disabled.proxyEnv, {});
});

test('proxy can bind a requested port and answer the private health endpoint', async () => {
  process.env.CXV_TEST = '1';
  const port = await startProxy({
    port: 0,
    health: { token: 'test-health-token', body: CODEX_APP_LOGGER_HEALTH },
    readiness: { token: 'test-health-token', url: 'data:application/json,{}' },
  });
  try {
    const denied = await fetch(`http://127.0.0.1:${port}/__cxv/health`);
    assert.equal(denied.status, 404);
    const response = await fetch(`http://127.0.0.1:${port}/__cxv/health`, {
      headers: { 'x-cxv-health-token': 'test-health-token' },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), CODEX_APP_LOGGER_HEALTH);
    const ready = await fetch(`http://127.0.0.1:${port}/__cxv/ready`, {
      headers: { 'x-cxv-health-token': 'test-health-token' },
    });
    assert.equal(ready.status, 200);
  } finally {
    stopProxy();
  }
});

test('proxy rejects oversized request bodies before upstream fetch', async () => {
  process.env.CXV_TEST = '1';
  const port = await startProxy({ port: 0, maxRequestBodyBytes: 4 });
  try {
    const response = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '12345',
    });
    assert.equal(response.status, 413);
    assert.equal(await response.text(), 'Request body too large');
  } finally {
    stopProxy();
  }
});

function lifecycleFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-app-logger-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const codexHome = join(root, 'codex');
  const homeDir = join(root, 'home');
  const appPath = join(root, 'ChatGPT-codex');
  mkdirSync(codexHome, { recursive: true });
  writeFileSync(appPath, 'stub');
  const configPath = join(codexHome, 'config.toml');
  return { root, codexHome, homeDir, appPath, configPath, env: { CODEX_HOME: codexHome } };
}

test('install commits config only after upstream readiness succeeds', async t => {
  const fixture = lifecycleFixture(t);
  const original = 'model = "gpt-test"\n';
  writeFileSync(fixture.configPath, original);
  await assert.rejects(
    installCodexAppLogger({
      env: fixture.env,
      homeDir: fixture.homeDir,
      platform: 'darwin',
      appCandidates: [fixture.appPath],
      launchctlRunner: () => ({ status: 0, stderr: '' }),
      systemProxyRunner: () => ({ status: 0, stdout: '' }),
      probeHealth: async () => true,
      probeReadiness: async () => false,
    }),
    error => error?.code === 'CXV_CODEX_APP_LOGGER_UPSTREAM_UNREADY',
  );
  assert.equal(readFileSync(fixture.configPath, 'utf8'), original);
});

test('install detects concurrent config changes without overwriting them', async t => {
  const fixture = lifecycleFixture(t);
  writeFileSync(fixture.configPath, 'model = "before"\n');
  await assert.rejects(
    installCodexAppLogger({
      env: fixture.env,
      homeDir: fixture.homeDir,
      platform: 'darwin',
      appCandidates: [fixture.appPath],
      launchctlRunner: () => ({ status: 0, stderr: '' }),
      systemProxyRunner: () => ({ status: 0, stdout: '' }),
      probeHealth: async () => true,
      probeReadiness: async () => {
        writeFileSync(fixture.configPath, 'model = "changed-elsewhere"\n');
        return true;
      },
    }),
    error => error?.code === 'CXV_CODEX_APP_LOGGER_CONFIG_CHANGED',
  );
  assert.equal(readFileSync(fixture.configPath, 'utf8'), 'model = "changed-elsewhere"\n');
});

test('failed update restores the prior daemon files and keeps its managed config', async t => {
  const fixture = lifecycleFixture(t);
  const original = 'model = "test"\n';
  const managed = installCodexAppLoggerConfig(original, 'http://127.0.0.1:57891/v1').content;
  writeFileSync(fixture.configPath, managed);
  const stateDir = join(fixture.codexHome, 'cx-viewer', 'app-logger');
  const launchDir = join(fixture.homeDir, 'Library', 'LaunchAgents');
  mkdirSync(stateDir, { recursive: true });
  mkdirSync(launchDir, { recursive: true });
  const oldState = `${JSON.stringify({ schemaVersion: 1, port: 57891, healthToken: 'a'.repeat(64), proxyEnv: {} })}\n`;
  const oldPlist = '<plist>old daemon</plist>\n';
  const statePath = join(stateDir, 'state.json');
  const plistPath = join(launchDir, 'com.cxviewer.codex-app-logger.plist');
  writeFileSync(statePath, oldState);
  writeFileSync(plistPath, oldPlist);
  const launchctlCalls = [];
  await assert.rejects(installCodexAppLogger({
    env: fixture.env,
    homeDir: fixture.homeDir,
    platform: 'darwin',
    appCandidates: [fixture.appPath],
    launchctlRunner: (_file, args) => { launchctlCalls.push(args[0]); return { status: 0, stderr: '' }; },
    systemProxyRunner: () => ({ status: 0, stdout: '' }),
    probeHealth: async () => true,
    probeReadiness: async () => false,
  }), error => error?.code === 'CXV_CODEX_APP_LOGGER_UPSTREAM_UNREADY');
  assert.equal(readFileSync(statePath, 'utf8'), oldState);
  assert.equal(readFileSync(plistPath, 'utf8'), oldPlist);
  assert.equal(readFileSync(fixture.configPath, 'utf8'), managed);
  assert.equal(launchctlCalls.filter(call => call === 'bootstrap').length, 2);
});

test('install rejects a symlinked config file', async t => {
  const fixture = lifecycleFixture(t);
  const target = join(fixture.root, 'real-config.toml');
  writeFileSync(target, 'model = "test"\n');
  symlinkSync(target, fixture.configPath);
  await assert.rejects(
    installCodexAppLogger({
      env: fixture.env,
      homeDir: fixture.homeDir,
      platform: 'darwin',
      appCandidates: [fixture.appPath],
    }),
    error => error?.code === 'CXV_CODEX_APP_LOGGER_CONFIG_SYMLINK',
  );
});

test('uninstall reports launchctl cleanup failure after restoring config', async t => {
  const fixture = lifecycleFixture(t);
  writeFileSync(fixture.configPath, 'model = "test"\n');
  await installCodexAppLogger({
    env: fixture.env,
    homeDir: fixture.homeDir,
    platform: 'darwin',
    appCandidates: [fixture.appPath],
    launchctlRunner: () => ({ status: 0, stderr: '' }),
    systemProxyRunner: () => ({ status: 0, stdout: '' }),
    probeHealth: async () => true,
    probeReadiness: async () => true,
  });
  await assert.rejects(
    uninstallCodexAppLogger({
      env: fixture.env,
      homeDir: fixture.homeDir,
      platform: 'darwin',
      launchctlRunner: () => ({ status: 5, stderr: 'not permitted' }),
    }),
    /uninstall was incomplete/,
  );
  assert.equal(readFileSync(fixture.configPath, 'utf8'), 'model = "test"\n');
});
