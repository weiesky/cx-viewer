import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs, { mkdirSync, mkdtempSync, writeFileSync, readFileSync, linkSync, existsSync, rmSync, realpathSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = mkdtempSync(join(tmpdir(), 'cxv-native-state-tools-')), project = join(root, 'project');
const native = join(project, 'native'), state = join(project, 'viewer-state');
for (const dir of [join(native, 'sessions'), state, join(project, '.codex/skills/private-alias'), join(project, 'dest')]) mkdirSync(dir, { recursive: true });
Object.assign(process.env, { HOME: join(root, 'home'), CODEX_HOME: native, CXV_PROJECT_DIR: project,
  CXV_LOG_DIR: state, CXV_PROXY_PROFILE_PATH: join(state, 'profile.json'), CXV_TEST: '1', CXV_CAPTURE_ONLY: '1',
  CXV_SDK_MODE: '1', CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1', CXV_START_PORT: '20530', CXV_MAX_PORT: '20539' });
mkdirSync(process.env.HOME);
const needle = 'NATIVE_STATE_PRIVATE_NEEDLE';
const history = join(native, 'sessions/rollout.jsonl');
const privateBytes = `---\nname: private-alias\ndescription: ${needle}\n---\n${needle}`;
writeFileSync(history, privateBytes); writeFileSync(join(native, 'history.jsonl.bak'), needle);
writeFileSync(join(native, 'state_99.sqlite-wal'), needle); writeFileSync(join(state, 'synthetic-history.txt'), needle);
writeFileSync(join(project, 'public.txt'), needle);
linkSync(history, join(project, 'innocent.txt')); linkSync(history, join(project, 'AGENTS.md'));
linkSync(history, join(project, '.codex/skills/private-alias/SKILL.md'));
const server = await import('../server.js'), sdk = await import('../lib/sdk-manager.js');
let base, view;
before(async () => {
  (await import('../interceptor.js')).initForWorkspace(project);
  view = sdk.initSdkSession(project, 'project', { codexPath: process.execPath });
  await server.startViewer(); base = `http://127.0.0.1:${server.getPort()}`;
});
after(async () => { sdk.stopSession(); await server.stopViewer(); rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });
const call = (path, body) => fetch(base + path + (path.includes('?') ? '&' : '?') + 'instance=' + encodeURIComponent(view.instanceKey),
  body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('project listing and guidance/skill discovery do not expose native state or its innocent-looking hardlinks', async () => {
  const listing = await (await call('/api/files')).json();
  for (const name of ['viewer-state', 'innocent.txt', 'AGENTS.md']) assert.ok(!listing.some(entry => entry.name === name), name);
  assert.equal((await call('/api/files?path=native/sessions')).status, 403);
  const guidance = await (await call('/api/codex-md')).json(); assert.deepEqual(guidance.entries, []);
  const id = Buffer.from(realpathSync(join(project, 'AGENTS.md'))).toString('base64url');
  assert.equal((await call('/api/codex-md?id=' + id)).status, 404);
  const skills = await call('/api/skills'); assert.ok(!(await skills.text()).includes(needle));
});

test('both search engines and explicit replace scopes reject private native state and aliases while retaining public matches', async () => {
  const { hasRipgrep } = await import('../lib/code-search.js');
  for (const engine of ['node', ...(await hasRipgrep() ? ['rg'] : [])]) {
    const result = await (await call('/api/search', { query: needle, engine })).json();
    assert.deepEqual(result.results.map(item => item.file).sort(), ['public.txt'], engine);
  }
  for (const file of ['native/sessions/rollout.jsonl', 'native/history.jsonl.bak', 'viewer-state/synthetic-history.txt', 'innocent.txt']) {
    const result = await (await call('/api/search-replace', { query: needle, replacement: 'OVERWRITE', scope: 'file', file })).json();
    assert.equal(result.total, 0, file);
  }
  assert.equal(readFileSync(history, 'utf8'), privateBytes);
});

test('ordinary project mutations cannot create in, rename, move or delete native private owners', async () => {
  const cases = [
    ['create-file', { dirPath: 'native/sessions', name: 'created.txt' }],
    ['create-dir', { dirPath: 'native/sessions', name: 'created-dir' }],
    ['create-file', { dirPath: 'native', name: 'history.jsonl.new' }],
    ['create-file', { dirPath: 'native', name: 'state_100.sqlite-wal' }],
    ['rename-file', { oldPath: 'native/sessions', newName: 'exposed' }],
    ['move-file', { fromPath: 'native/sessions', toDir: 'dest' }],
    ['delete-file', { path: 'viewer-state' }],
    ['delete-file', { path: 'native/sessions' }],
  ];
  for (const [endpoint, body] of cases) assert.equal((await call('/api/' + endpoint, body)).status, 403, endpoint);
  assert.equal(readFileSync(history, 'utf8'), privateBytes);
  assert.equal(existsSync(join(native, 'sessions/created.txt')), false);
  assert.equal((await call('/api/create-file', { name: 'ordinary.txt' })).status, 200);
});

test('project multipart imports reject private owners and missing protected variants before writing', async () => {
  const upload = (dir, name) => {
    const form = new FormData(); form.append('file', new Blob(['IMPORTED_CANARY']), name);
    return fetch(base + '/api/import-file?' + new URLSearchParams({ dir, instance: view.instanceKey }), { method: 'POST', body: form });
  };
  assert.equal((await upload('native/sessions', 'rollout.jsonl')).status, 403);
  assert.equal((await upload('native', 'history.jsonl.new')).status, 403);
  assert.equal((await upload('viewer-state', 'created.txt')).status, 403);
  assert.equal(readFileSync(history, 'utf8'), privateBytes);
  assert.equal(existsSync(join(native, 'history.jsonl.new')), false);
  assert.equal((await upload('', 'ordinary-upload.txt')).status, 200);
  assert.equal(readFileSync(join(project, 'ordinary-upload.txt'), 'utf8'), 'IMPORTED_CANARY');
});

test('OS reveal/default-open do not bypass private-file protection or execute real applications in this fixture', async () => {
  const previousExec = childProcess.execFile, previousSpawn = childProcess.spawn, calls = [];
  childProcess.execFile = (cmd, args) => { calls.push([cmd, args]); };
  childProcess.spawn = (cmd, args) => { calls.push([cmd, args]); const child = new EventEmitter(); child.unref = () => {}; return child; };
  syncBuiltinESMExports();
  try {
    for (const endpoint of ['reveal-file', 'open-file']) {
      for (const path of ['native/sessions/rollout.jsonl', 'viewer-state/synthetic-history.txt', 'innocent.txt']) {
        assert.equal((await call('/api/' + endpoint, { path })).status, 403);
      }
    }
    assert.equal(calls.length, 0);
    assert.equal((await call('/api/open-file', { path: 'public.txt' })).status, 200);
    assert.equal(calls.length, 1);
  } finally { childProcess.execFile = previousExec; childProcess.spawn = previousSpawn; syncBuiltinESMExports(); }
});

test('metadata readers and node scan reject a singly-linked native history descriptor substituted after path validation', async () => {
  const single = join(native, 'sessions/single.jsonl'); writeFileSync(single, needle);
  const ordinary = realpathSync(join(project, 'public.txt')), original = fs.openSync;
  const { readPublicFileSync } = await import('../lib/public-file-read.js');
  const { assertNativeFilePath } = await import('../lib/file-access-policy.js');
  const { runNodeScan } = await import('../lib/search-worker.js');
  fs.openSync = (path, ...args) => original(path === ordinary ? single : path, ...args); syncBuiltinESMExports();
  try {
    assert.throws(() => readPublicFileSync(ordinary, 'utf8', assertNativeFilePath), { code: 'ACCESS_DENIED' });
    assert.deepEqual((await runNodeScan({ root: project, candidates: ['public.txt'], query: needle })).results, []);
    assert.equal(readFileSync(single, 'utf8'), needle);
  } finally { fs.openSync = original; syncBuiltinESMExports(); }
});

test('dedicated IM skill metadata remains scoped and usable inside a Viewer owner while general file tools refuse it', async () => {
  const { LOG_DIR, setLogDir } = await import('../findcx.js');
  const previous = LOG_DIR, owner = join(process.env.HOME, '.codex/cx-viewer');
  const { imSkillRoots, listSkills, toggleSkill } = await import('../lib/skills-api.js');
  const roots = imSkillRoots('dingtalk');
  const dir = join(roots[0].enabledDir, 'folder-name'); mkdirSync(dir, { recursive: true });
  const path = join(dir, 'SKILL.md'); writeFileSync(path, '---\nname: actual-im-name\ndescription: Dedicated metadata\n---\n# IM');
  const { CREDENTIAL_PATHS } = await import('../lib/credential-file-policy.js');
  mkdirSync(CREDENTIAL_PATHS.root, { recursive: true }); writeFileSync(CREDENTIAL_PATHS.keyPath, '---\nname: hidden\ndescription: PRIVATE_IM_KEY\n---');
  const alias = join(roots[0].enabledDir, 'credential-alias'); mkdirSync(alias); linkSync(CREDENTIAL_PATHS.keyPath, join(alias, 'SKILL.md'));
  try {
    setLogDir(owner);
    const skills = listSkills({ roots, includeReadonly: false });
    assert.equal(skills.find(skill => skill.name === 'actual-im-name').description, 'Dedicated metadata');
    assert.ok(!JSON.stringify(skills).includes('PRIVATE_IM_KEY'));
    const toggled = toggleSkill({ source: 'project', name: 'actual-im-name', path: dir, enabled: true, enable: false }, { roots });
    assert.equal(toggled.ok, true);
    const moved = join(roots[0].disabledDir, 'folder-name/SKILL.md');
    assert.equal((await call('/api/file-content?' + new URLSearchParams({ path: moved, editorSession: 'true' }))).status, 403);
    assert.equal((await (await call('/api/im/dingtalk/skills')).json()).ok, true);
  } finally { setLogDir(previous); }
});
