import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = mkdtempSync(join(tmpdir(), 'cxv-native-private-'));
const project = join(root, 'project'), native = join(root, 'custom-codex');
mkdirSync(project); mkdirSync(native);
Object.assign(process.env, { HOME: root, CODEX_HOME: native, CXV_LOG_DIR: join(project, 'viewer-state'), CXV_PROXY_PROFILE_PATH: join(project, 'viewer-profile.json') });
const { readFileContent, writeFileContent } = await import('../lib/file-api.js');
const { isPublicFilePath, assertPublicMutationPath } = await import('../lib/credential-file-policy.js');
const { searchCode } = await import('../lib/code-search.js');
after(() => rmSync(root, { recursive: true, force: true }));
const marker = 'SYNTHETIC_NATIVE_SECRET';

test('native auth/config and backup variants are refused by file tools even with explicit editorSession', () => {
  for (const dir of [native, join(root, '.codex')]) {
    mkdirSync(dir, { recursive: true });
    for (const name of ['auth.json', 'auth.json.bak', '.credentials.json', 'config.toml', 'config.toml.cxv-backup', 'config.toml.bak']) {
      const path = join(dir, name); writeFileSync(path, marker);
      assert.equal(isPublicFilePath(path), false, path);
      assert.throws(() => readFileContent(project, path, true), { code: 'ACCESS_DENIED' });
      assert.throws(() => writeFileContent(project, path, 'overwrite', true), { code: 'ACCESS_DENIED' });
      assert.equal(readFileSync(path, 'utf8'), marker);
    }
    assert.throws(() => assertPublicMutationPath(dir), { code: 'ACCESS_DENIED' }, 'ancestor rename/delete must not move the protected native files');
  }
});

test('same-named project fixtures, native AGENTS and skills remain available', () => {
  for (const path of [join(project, 'auth.json'), join(project, 'config.toml'), join(native, 'AGENTS.md'), join(native, 'skills/SKILL.md')]) {
    mkdirSync(join(path, '..'), { recursive: true }); writeFileSync(path, 'public fixture');
    assert.equal(readFileContent(project, path, true).content, 'public fixture');
  }
});

test('symbolic and hard-link aliases cannot bypass native credential protection or search worker policy', { skip: process.platform === 'win32' }, async () => {
  const path = join(native, 'auth.json'); writeFileSync(path, marker);
  const hard = join(project, 'public-looking.txt'), link = join(project, 'linked-native.json');
  linkSync(path, hard); symlinkSync(path, link);
  for (const alias of [hard, link]) {
    assert.equal(isPublicFilePath(alias), false);
    assert.throws(() => readFileContent(project, alias, true), { code: 'ACCESS_DENIED' });
  }
  assert.deepEqual((await searchCode({ root: project, query: marker, engine: 'node' })).results, []);
});

test('changing CODEX_HOME keeps the startup owner protected and adds the new owner', () => {
  const next = join(root, 'next-codex'); mkdirSync(next); process.env.CODEX_HOME = next;
  const path = join(next, 'auth.json'); writeFileSync(path, marker);
  assert.equal(isPublicFilePath(path), false);
  assert.equal(isPublicFilePath(join(native, 'auth.json')), false);
});

test('real HTTP content/raw/download/list/search paths enforce native credential protection without touching dedicated config APIs', async () => {
  Object.assign(process.env, { CXV_SDK_MODE: '1', CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1', CXV_CAPTURE_ONLY: '1',
    CXV_START_PORT: '20420', CXV_MAX_PORT: '20429', CXV_PROJECT_DIR: project });
  const server = await import('../server.js'), sdk = await import('../lib/sdk-manager.js');
  (await import('../interceptor.js')).initForWorkspace(project);
  sdk.initSdkSession(project, 'synthetic', { codexPath: process.execPath });
  const { request } = await import('node:http');
  await server.startViewer();
  const call = (path, body) => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: server.getPort(), path, method: body ? 'POST' : 'GET',
      headers: { 'content-type': 'application/json' } }, res => {
      let text = ''; res.setEncoding('utf8'); res.on('data', part => text += part);
      res.on('end', () => resolve({ status: res.statusCode, text, json: () => JSON.parse(text) }));
    }); req.on('error', reject); req.end(body ? JSON.stringify(body) : undefined);
  });
  try {
    for (const path of [join(native, 'auth.json'), join(native, 'config.toml.cxv-backup'), join(process.env.CODEX_HOME, 'auth.json')]) {
      for (const endpoint of ['file-content', 'file-raw']) {
        const result = await call(`/api/${endpoint}?` + new URLSearchParams({ path, editorSession: 'true' }));
        assert.equal(result.status, 403); assert.ok(!result.text.includes(marker));
      }
      assert.equal((await call('/api/file-content', { path, content: 'overwrite', editorSession: true })).status, 403);
      assert.equal(readFileSync(path, 'utf8'), marker);
    }
    assert.equal((await call('/api/download-file?path=public-looking.txt')).status, 403);
    const listing = await call('/api/files');
    assert.equal(listing.status, 200);
    assert.equal(listing.json().some(entry => entry.name === 'public-looking.txt' || entry.name === 'linked-native.json'), false);
    const search = await call('/api/search', { query: marker, engine: 'node' });
    assert.equal(search.status, 200); assert.deepEqual(search.json().results, []);
    assert.equal((await call('/api/auth/state')).status, 200);
  } finally { sdk.stopSession(); await server.stopViewer(); }
});
