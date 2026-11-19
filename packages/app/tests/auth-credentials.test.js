import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs, { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = mkdtempSync(join(tmpdir(), 'cxv-auth-credentials-'));
process.env.CXV_LOG_DIR = root;
const auth = await import('../lib/auth.js');
const { CREDENTIAL_PATHS } = await import('../lib/credential-paths.js');
const { createCredentialStore } = await import('../lib/credential-store.js');
const { readReferencedSecret, stageSecretReference } = await import('../lib/credential-reference.js');
const { markConfigurationMigrated } = await import('../lib/credential-migration-state.js');
const store = createCredentialStore(CREDENTIAL_PATHS.root);
const path = auth.getAuthPrefsPath();
beforeEach(() => { rmSync(root, { recursive: true, force: true }); mkdirSync(root, { mode: 0o700 }); });
after(() => rmSync(root, { recursive: true, force: true }));

function seed(password = 'ORIGINAL') {
  const passwordRef = stageSecretReference(store, 'lan-password', auth.authCredentialOwner(), password);
  const prefs = { [auth.AUTH_CREDENTIAL_VERSION_FIELD]: 1, auth: { enabled: true, passwordRef, revision: 7 } };
  writeFileSync(path, JSON.stringify(prefs));
  return prefs;
}

test('auth keeps legacy configurations unchanged until explicitly versioned, then saves only encrypted references', () => {
  writeFileSync(path, '{}');
  auth.saveAuthConfig({ enabled: true, password: 'LEGACY' });
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).auth.password, Buffer.from('LEGACY').toString('base64'));
  assert.equal(existsSync(store.root), false);
  seed('\ufeff原密码🔑');
  assert.equal(auth.loadAuthConfig().password, '\ufeff原密码🔑');
  const saved = auth.saveAuthConfig({ enabled: true, password: 'NEXT' });
  assert.deepEqual(saved, { enabled: true, password: 'NEXT', revision: 8 });
  const prefs = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(Object.hasOwn(prefs.auth, 'password'), false);
  assert.equal(readFileSync(path, 'utf8').includes('NEXT'), false);
  assert.equal(readFileSync(store.file, 'utf8').includes('NEXT'), false);
  const project = '/fixture/encrypted-project';
  auth.saveAuthConfig({ enabled: true, password: '' }, { scope: 'project', projectDir: project });
  assert.deepEqual(auth.loadAuthConfig(project), { enabled: true, password: '', revision: 1 });
  auth.enableGlobalAuthAndClearProjectOverride(project);
  assert.equal(auth.loadAuthConfig(project).password, 'NEXT');
  auth.saveAuthConfig({ enabled: false, password: 'PROJECT' }, { scope: 'project', projectDir: project });
  auth.clearProjectAuthOverride(project);
  assert.equal(auth.loadAuthState(project).hasProjectOverride, false);
  assert.equal(Object.keys(JSON.parse(readFileSync(store.file, 'utf8')).creds).length, 1);
});

test('migrated auth fails closed for missing keys, references, ownership, unknown versions and reintroduced legacy fields', () => {
  const initial = seed('');
  const fixtures = [
    { ...initial, auth: { enabled: true } },
    { ...initial, auth: { ...initial.auth, passwordRef: 'not-json' } },
    { ...initial, auth: { ...initial.auth, password: '' } },
    { ...initial, [auth.AUTH_CREDENTIAL_VERSION_FIELD]: 2 },
    { auth: initial.auth },
    { ...initial, authByProject: { '/fixture/other': initial.auth } },
  ];
  for (const prefs of fixtures) {
    const project = prefs.authByProject ? '/fixture/other' : null;
    const bytes = JSON.stringify(prefs);
    writeFileSync(path, bytes);
    assert.equal(auth.loadAuthConfig(project).passwordUnreadable, true);
    assert.throws(() => auth.saveAuthConfig({ enabled: true, password: 'REPLACE' }, { scope: project ? 'project' : 'global', projectDir: project }), { code: 'PASSWORD_UNREADABLE' });
    assert.equal(readFileSync(path, 'utf8'), bytes);
  }
  writeFileSync(path, JSON.stringify(initial));
  unlinkSync(store.keyPath);
  assert.equal(auth.loadAuthConfig().passwordUnreadable, true);
  assert.throws(() => auth.saveAuthConfig({ enabled: true, password: 'REPLACE' }), { code: 'PASSWORD_UNREADABLE' });
  assert.equal(existsSync(store.keyPath), false);
});

test('a preferences rename failure preserves the active password and cleans the staged version', () => {
  seed();
  const original = readFileSync(path);
  const records = readFileSync(store.file);
  const rename = fs.renameSync;
  fs.renameSync = (from, to) => {
    if (to === path) throw Object.assign(new Error('test preferences rename failure'), { code: 'EIO' });
    return rename(from, to);
  };
  syncBuiltinESMExports();
  try {
    assert.throws(() => auth.saveAuthConfig({ enabled: true, password: 'NEXT' }), { code: 'EIO' });
    assert.deepEqual(readFileSync(path), original);
    assert.deepEqual(readFileSync(store.file), records);
    assert.equal(auth.loadAuthConfig().password, 'ORIGINAL');
  } finally { fs.renameSync = rename; syncBuiltinESMExports(); }
});

test('inactive-version cleanup failure does not misreport a committed password change as failed', () => {
  const initial = seed();
  const rename = fs.renameSync;
  const warn = console.warn;
  const warnings = [];
  let committed = false;
  fs.renameSync = (from, to) => {
    if (to === store.file && committed) throw Object.assign(new Error('test cleanup failure'), { code: 'EIO' });
    const result = rename(from, to);
    if (to === path) committed = true;
    return result;
  };
  console.warn = message => warnings.push(message);
  syncBuiltinESMExports();
  try {
    assert.equal(auth.saveAuthConfig({ enabled: true, password: 'NEXT' }).password, 'NEXT');
    assert.equal(auth.loadAuthConfig().password, 'NEXT');
    assert.equal(readReferencedSecret(store, 'lan-password', auth.authCredentialOwner(), initial.auth.passwordRef), 'ORIGINAL');
    assert.equal(warnings.length, 1);
    assert.ok(!warnings.join().includes('ORIGINAL'));
  } finally { fs.renameSync = rename; console.warn = warn; syncBuiltinESMExports(); }
});

test('concurrent encrypted auth updates retain revisions and the final active secret', async () => {
  seed();
  const run = suffix => new Promise((resolve, reject) => {
    const source = `const { saveAuthConfig } = await import('./lib/auth.js'); for (let i = 0; i < 10; i++) saveAuthConfig({ enabled: true, password: '${suffix}' + i });`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], { env: process.env, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(stderr)));
  });
  await Promise.all([run('A'), run('B')]);
  const current = auth.loadAuthConfig();
  assert.equal(current.revision, 27);
  assert.match(current.password, /^[AB]9$/);
  assert.equal(Object.keys(JSON.parse(readFileSync(store.file, 'utf8')).creds).length, 1);
});

test('activated auth rejects whole-file legacy replacement and deletion without recreating or overwriting the source', () => {
  seed();
  markConfigurationMigrated(store, 'auth', 'preferences.json');
  assert.equal(auth.loadAuthConfig().password, 'ORIGINAL');
  const legacy = JSON.stringify({ auth: { enabled: true, password: Buffer.from('LEGACY').toString('base64') } });
  writeFileSync(path, legacy);
  assert.equal(auth.loadAuthConfig().passwordUnreadable, true);
  assert.throws(() => auth.saveAuthConfig({ password: 'REPLACE' }), error => error.status === 409);
  assert.equal(readFileSync(path, 'utf8'), legacy);
  unlinkSync(path);
  assert.equal(auth.loadAuthConfig().passwordUnreadable, true);
  assert.throws(() => auth.saveAuthConfig({ password: 'REPLACE' }), error => error.status === 409);
  assert.equal(existsSync(path), false);
});

test('activated auth still allows an independent project override when only the global source reference is damaged', () => {
  const prefs = seed();
  markConfigurationMigrated(store, 'auth', 'preferences.json');
  prefs.auth.passwordRef = 'damaged global reference';
  writeFileSync(path, JSON.stringify(prefs));
  const project = '/fixture/independent-project';
  auth.saveAuthConfig({ enabled: true, password: 'PROJECT' }, { scope: 'project', projectDir: project });
  assert.equal(auth.loadAuthConfig(project).password, 'PROJECT');
  assert.equal(auth.loadAuthState(project).global.passwordUnreadable, true);
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).auth.passwordRef, prefs.auth.passwordRef);
});
