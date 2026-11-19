// Isolated production-payload probe: no real Codex/DingTalk/model requests.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = realpathSync(resolve(process.argv[2]));
const home = mkdtempSync(join(tmpdir(), 'cxv-payload-smoke-'));
Object.assign(process.env, {
  CODEX_HOME: join(home, 'codex'), CXV_LOG_DIR: join(home, 'logs'),
  CXV_PROXY_PROFILE_PATH: join(home, 'profile.json'), CXV_CLI_MODE: '1',
  CXV_WORKSPACE_MODE: '1', CXV_TEST: '1', CXV_HOST: '127.0.0.1', SHELL: '/bin/sh',
});
delete process.env.CXV_BYPASS_PERMISSIONS;
process.chdir(home);
let server, interceptor, scratch, timer;
try {
  const require = createRequire(join(root, 'package.json'));
  for (const [specifier, file] of [['cx-viewer', 'server.js'], ['cx-viewer/server.js', 'server.js'], ['cx-viewer/interceptor.js', 'interceptor.js']]) {
    assert.equal(require.resolve(specifier), join(root, file));
  }
  const dependencyRoot = basename(dirname(root)) === 'node_modules' ? dirname(root) : root;
  for (const name of ['node-pty', 'ws', '@xterm/addon-unicode11']) {
    const path = realpathSync(require.resolve(`${name}/package.json`));
    assert.ok(!relative(dependencyRoot, path).startsWith('..'), `${name} must resolve inside the production installation`);
  }
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  Object.assign(process.env, { CXV_START_PORT: String(port), CXV_MAX_PORT: String(port + 1) });
  const load = file => import(pathToFileURL(join(root, file)).href);
  server = await load('server.js');
  interceptor = await load('interceptor.js');
  const auth = await load('lib/auth.js');
  assert.equal(auth.getAuthPrefsPath(), join(home, 'logs', 'preferences.json'));
  const desktop = await load('electron/runtime-paths.js');
  assert.equal(desktop.resolveElectronRuntimeRoot({ electronDir: join(root, 'electron'), resourcesPath: null, explicitRoot: null }), root);
  await server.startViewer();
  const base = `http://127.0.0.1:${server.getPort()}/`;
  assert.equal((await fetch(`${base}api/auth/state`)).status, 200);
  const page = await fetch(base);
  assert.equal(page.status, 200);
  const html = await page.text();
  const entry = html.match(/src="([^"]+\.js)"/);
  assert.ok(entry, 'built page has a JavaScript entry');
  assert.equal((await fetch(new URL(entry[1], base))).status, 200);
  scratch = await load('scratch-pty-manager.js');
  const session = await scratch.openScratchPty('payload-native', { cwd: home });
  const code = await new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Native PTY timed out')), 5000);
    session.onExit(resolve);
    session.write("printf 'CXV_PAYLOAD_%s' 'NATIVE_OK'; exit 0\r");
  });
  assert.equal(code, 0);
  assert.ok(session.replay.includes('CXV_PAYLOAD_NATIVE_OK'));
  console.log('Production payload: public exports, internal dependencies, data owner, Electron paths, HTTP/UI entry and native PTY OK');
} finally {
  clearTimeout(timer);
  scratch?.shutdownScratchPtys();
  await server?.stopViewer();
  await interceptor?.closeLogV2Writes();
  interceptor?._stopProxyProfileWatchForTests();
  rmSync(home, { recursive: true, force: true });
}
process.exit(0);
