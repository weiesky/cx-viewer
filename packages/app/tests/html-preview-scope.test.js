import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const root = mkdtempSync(join(tmpdir(), 'cxv-html-preview-')), a = join(root, 'one/same'), b = join(root, 'two/same');
for (const dir of [a, b]) mkdirSync(join(dir, 'sub'), { recursive: true });
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'state'),
  CXV_PROXY_PROFILE_PATH: join(root, 'profiles.json'), CXV_PROJECT_DIR: a, CXV_TEST: '1', CXV_SDK_MODE: '1',
  CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1', CXV_START_PORT: '20440', CXV_MAX_PORT: '20449' });
const server = await import('../server.js'), sdk = await import('../lib/sdk-manager.js');
const { CREDENTIAL_PATHS } = await import('../lib/credential-file-policy.js');
let port, infoA, infoB;
before(async () => {
  (await import('../interceptor.js')).initForWorkspace(a); sdk.setSdkLaunchConfig({ codexPath: process.execPath });
  infoA = sdk.initSdkSession(a, 'same', { codexPath: process.execPath }); infoB = sdk.launchSdkSession(b, 'same');
  await server.startViewer(); port = server.getPort();
});
after(async () => { sdk.stopSession(); await server.stopViewer(); rmSync(root, { recursive: true, force: true }); });
const scoped = (file, instance = infoB.instanceKey, project = 'same') => `/api/file-raw/view/${encodeURIComponent(project)}/${encodeURIComponent(instance)}/${file.split('/').map(encodeURIComponent).join('/')}`;
const get = (path, options) => fetch(`http://127.0.0.1:${port}` + path, options);

test('path-scoped HTML and HEAD retain exact instance and sandboxed-script contract', async () => {
  for (const [dir, label] of [[a, 'A'], [b, 'B']]) {
    mkdirSync(join(dir, 'report'));
    writeFileSync(join(dir, 'report/index.html'), `<h1>${label}</h1><script src="app.js"></script><link rel="stylesheet" href="style.css">`);
    writeFileSync(join(dir, 'report/app.js'), `window.fixture='${label}';`);
    writeFileSync(join(dir, 'report/style.css'), `body{color:${label === 'A' ? 'red' : 'blue'}}`);
  }
  const res = await get(scoped('report/index.html'));
  assert.equal(res.status, 200); assert.match(await res.text(), /<h1>B<\/h1>/);
  assert.equal(res.headers.get('content-security-policy'), "sandbox allow-scripts; connect-src 'none'; form-action 'none'");
  const head = await get(scoped('report/index.html'), { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(await head.text(), '');
  assert.equal(Number(head.headers.get('content-length')), readFileSync(join(b, 'report/index.html')).length);
});

test('browser-relative styles and scripts stay in the path-pinned workspace with correct MIME', async () => {
  const base = `http://127.0.0.1:${port}` + scoped('report/index.html');
  for (const [name, mime, text] of [['app.js', 'text/javascript', "window.fixture='B';"], ['style.css', 'text/css', 'body{color:blue}']]) {
    const url = new URL(name, base); assert.equal(url.search, '');
    const res = await fetch(url); assert.equal(res.status, 200); assert.equal(res.headers.get('content-type'), mime); assert.equal(await res.text(), text);
  }
  assert.equal((await get('/api/file-raw/report/index.html?' + new URLSearchParams({ instance: infoA.instanceKey }))).status, 200);
  assert.match(await (await get('/api/file-raw?'+new URLSearchParams({ instance: infoA.instanceKey, path: 'report/index.html' }))).text(), /<h1>A/);
});

test('scope mismatch/stale, malformed paths, hostile origins and symbolic/private aliases cannot bypass file policy', async () => {
  assert.equal((await get(scoped('report/index.html') + '?' + new URLSearchParams({ instance: infoA.instanceKey }))).status, 400);
  assert.equal((await get(scoped('report/index.html', 'stale'))).status, 404);
  assert.equal((await get(scoped('report/index.html', infoA.instanceKey, 'different'))).status, 400);
  assert.equal((await get(scoped('report/index.html'), { headers: { Origin: 'null' } })).status, 403);
  assert.equal((await get(scoped('report/index.html'), { headers: { Origin: 'https://hostile.example' } })).status, 403);
  for (const name of ['%ZZ', '%00']) assert.equal((await get(scoped('report/index.html').replace('report/index.html', name))).status, 400);
  symlinkSync(a, join(b, 'escape'));
  assert.equal((await get(scoped('escape/report/index.html'))).status, 400);
  mkdirSync(CREDENTIAL_PATHS.root, { recursive: true }); writeFileSync(CREDENTIAL_PATHS.keyPath, 'private'); linkSync(CREDENTIAL_PATHS.keyPath, join(b, 'alias'));
  assert.equal((await get(scoped('alias'))).status, 403);
  assert.equal((await get(scoped('report/index.html').replace('report/index.html', '%2e%2e%2f%2e%2e%2fone/same/report/index.html') + '?editorSession=true')).status, 400);
});
