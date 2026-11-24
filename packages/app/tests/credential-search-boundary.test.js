import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs, { linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';

const root = mkdtempSync(join(tmpdir(), 'cxv-credential-search-'));
const project = join(root, 'project');
mkdirSync(project);
process.env.CXV_LOG_DIR = join(project, 'state[1]');
process.env.CODEX_HOME = join(project, 'codex-owner');
process.env.CXV_PROXY_PROFILE_PATH = join(project, 'profile[1].json');
const { CREDENTIAL_PATHS } = await import('../lib/credential-file-policy.js');
const { runNodeScan } = await import('../lib/search-worker.js');
const { searchCode, hasRipgrep } = await import('../lib/code-search.js');
const { searchReplace } = await import('../lib/code-replace.js');
const marker = 'BOUNDARY_NEEDLE';
const backup = join(CREDENTIAL_PATHS.backupRoot, 'first', 'preferences.json');
const privateFiles = [CREDENTIAL_PATHS.keyPath, CREDENTIAL_PATHS.file, backup,
  ...[ 'update-state.json', 'restart-config.json', 'restart-ready.json', 'cx-viewer-fixture.tgz' ].map(name => join(process.env.CXV_LOG_DIR, name)),
  // Update handoffs are owned by CODEX_HOME even when viewer logs are elsewhere.
  ...['restart-config.json', 'restart-config.json.cxv-fixture.tmp', 'update-state.json']
    .map(name => join(process.env.CODEX_HOME, 'cx-viewer', name)),
  join(process.env.CXV_LOG_DIR, 'preferences.json'), join(process.env.CXV_LOG_DIR, 'im/dingtalk/config.json'),
  process.env.CXV_PROXY_PROFILE_PATH, `${process.env.CXV_PROXY_PROFILE_PATH}.bak`];
for (const path of privateFiles) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, marker, { mode: 0o600 });
}
writeFileSync(join(project, 'public.txt'), marker);
writeFileSync(join(project, 'master.key'), marker);
const alias = join(project, 'key-alias.txt');
if (process.platform !== 'win32') linkSync(CREDENTIAL_PATHS.keyPath, alias);
const rgPresent = await hasRipgrep();
after(() => rmSync(root, { recursive: true, force: true }));

for (const engine of ['node', 'ripgrep']) {
  test(`${engine} search excludes real private roots and inode aliases but permits project fixtures`, { skip: engine === 'ripgrep' && !rgPresent }, async () => {
    const result = await searchCode({ root: project, query: marker, engine, includeGlobs: ['**/*'] });
    assert.equal(result.error, undefined);
    assert.deepEqual(result.results.map(item => item.file).sort(), ['master.key', 'public.txt']);
    const privateResult = await searchCode({ root: CREDENTIAL_PATHS.root, query: marker, engine });
    assert.deepEqual(privateResult.results, []);
  });
}

test('named-file and all-file replacements cannot alter private keys or plaintext backups', async () => {
  for (const path of privateFiles) {
    const result = await searchReplace({ root: project, query: marker, replacement: 'replace', scope: 'file', file: relative(project, path) });
    assert.equal(result.total, 0);
    assert.equal(readFileSync(path, 'utf8'), marker);
  }
  const result = await searchReplace({ root: project, query: marker, replacement: 'public replacement', scope: 'all' });
  assert.equal(result.total, 2);
  for (const path of privateFiles) assert.equal(readFileSync(path, 'utf8'), marker);
});

test('worker scan body and replacement reject a private descriptor substituted after path checks', async () => {
  rmSync(alias, { force: true });
  const path = join(project, 'public.txt');
  writeFileSync(path, marker);
  const canonical = realpathSync(path);
  const open = fs.openSync;
  let redirected = 0;
  fs.openSync = (path, ...args) => {
    if (path === canonical) { redirected++; return open(CREDENTIAL_PATHS.keyPath, ...args); }
    return open(path, ...args);
  };
  syncBuiltinESMExports();
  try {
    // fs monkeypatches are isolate-local: exercise the actual worker body here.
    const search = await runNodeScan({ root: project, query: marker });
    assert.deepEqual(search.results, []);
    const replace = await searchReplace({ root: project, query: marker, replacement: 'replace', scope: 'file', file: 'public.txt' });
    assert.equal(replace.total, 0);
    assert.equal(redirected, 2);
  } finally { fs.openSync = open; syncBuiltinESMExports(); }
  assert.equal(readFileSync(path, 'utf8'), marker);
  assert.equal(readFileSync(CREDENTIAL_PATHS.keyPath, 'utf8'), marker);
});
