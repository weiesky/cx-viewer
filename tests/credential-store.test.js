import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs, { existsSync, linkSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { createCredentialStore } from '../lib/credential-store.js';

const run = promisify(execFile);
const moduleUrl = pathToFileURL(join(process.cwd(), 'lib/credential-store.js')).href;
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cxv-credential-store-'));
  return { root, store: createCredentialStore(join(root, 'private')), cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('private store distinguishes absence and empty values, verifies idempotence and survives a new process', async () => {
  const { root, store, cleanup } = fixture();
  try {
    assert.equal(store.get('lan-password', 'global'), null);
    assert.equal(store.remove('lan-password', 'global'), false);
    assert.equal(existsSync(store.root), false);
    assert.equal(store.set('lan-password', 'global', ''), true);
    assert.equal(store.get('lan-password', 'global'), '');
    assert.equal(store.set('lan-password', 'global', 'private fixture'), true);
    const original = readFileSync(store.file);
    assert.equal(store.set('lan-password', 'global', 'private fixture'), false);
    assert.deepEqual(readFileSync(store.file), original);
    assert.equal(readFileSync(store.keyPath).length, 32);
    if (process.platform !== 'win32') {
      assert.equal(statSync(store.root).mode & 0o777, 0o700);
      for (const file of [store.keyPath, store.file]) assert.equal(statSync(file).mode & 0o777, 0o600);
    }
    await run(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import { createCredentialStore } from ${JSON.stringify(moduleUrl)};
      assert.equal(createCredentialStore(process.env.FIXTURE_STORE).get('lan-password', 'global'), 'private fixture');
    `], { env: { ...process.env, FIXTURE_STORE: store.root } });
    assert.equal(store.remove('lan-password', 'global'), true);
    assert.equal(store.get('lan-password', 'global'), null);
  } finally { cleanup(); }
});

test('lost, malformed or replaced master keys never cause replacement or a new secret write', () => {
  const { store, cleanup } = fixture();
  try {
    store.set('lan-password', 'global', 'private fixture');
    const original = readFileSync(store.file);
    const key = readFileSync(store.keyPath);
    for (const replacement of [null, Buffer.alloc(3), Buffer.alloc(32)]) {
      rmSync(store.keyPath, { force: true });
      if (replacement) writeFileSync(store.keyPath, replacement, { mode: 0o600 });
      assert.throws(() => store.get('lan-password', 'global'), { code: 'CREDENTIALS_UNREADABLE' });
      assert.throws(() => store.set('im-secret', 'dingtalk', 'new fixture'), { code: 'CREDENTIALS_UNREADABLE' });
      assert.deepEqual(readFileSync(store.file), original);
      if (replacement) assert.deepEqual(readFileSync(store.keyPath), replacement);
      else assert.equal(existsSync(store.keyPath), false);
    }
    writeFileSync(store.keyPath, key);
    assert.equal(store.get('lan-password', 'global'), 'private fixture');
  } finally { cleanup(); }
});

test('corrupt store schemas and swapped records cannot silently become empty or be overwritten', () => {
  const { store, cleanup } = fixture();
  try {
    store.set('lan-password', 'global', 'one');
    store.set('im-secret', 'dingtalk', 'two');
    const healthy = readFileSync(store.file);
    const swapped = JSON.parse(healthy);
    const ids = Object.keys(swapped.creds);
    [swapped.creds[ids[0]], swapped.creds[ids[1]]] = [swapped.creds[ids[1]], swapped.creds[ids[0]]];
    for (const corrupt of ['{broken', '{}', 'null', '{"version":9,"creds":{}}', '{"version":1,"creds":[]}', JSON.stringify(swapped)]) {
      writeFileSync(store.file, corrupt);
      assert.throws(() => store.get('lan-password', 'global'), { code: 'CREDENTIALS_UNREADABLE' });
      assert.throws(() => store.set('lan-password', 'global', 'replace'), { code: 'CREDENTIALS_UNREADABLE' });
      assert.throws(() => store.remove('lan-password', 'global'), { code: 'CREDENTIALS_UNREADABLE' });
      assert.equal(readFileSync(store.file, 'utf8'), corrupt);
    }
    writeFileSync(store.file, healthy);
    assert.equal(store.get('lan-password', 'global'), 'one');
  } finally { cleanup(); }
});

test('private store rejects invalid values before creating files', () => {
  const { store, cleanup } = fixture();
  try {
    for (const value of [null, '\ud800', 'x'.repeat(65537)]) assert.throws(() => store.set('lan-password', 'global', value));
    assert.throws(() => store.set('unknown', 'ref', 'fixture'));
    assert.equal(existsSync(store.root), false);
  } finally { cleanup(); }
});

test('store refuses symbolic links and hard links without modifying the destination', { skip: process.platform === 'win32' }, () => {
  for (const target of ['master.key', 'credentials.json', 'credentials.lock']) {
    for (const link of [symlinkSync, linkSync]) {
      const { root, store, cleanup } = fixture();
      try {
        store.set('lan-password', 'global', 'fixture');
        const file = join(store.root, target);
        const external = join(root, 'external');
        writeFileSync(external, Buffer.alloc(32, 5), { mode: 0o600 });
        rmSync(file, { force: true });
        link(external, file);
        assert.throws(() => store.set('lan-password', 'global', 'new'), { code: 'CREDENTIALS_UNREADABLE' });
        assert.deepEqual(readFileSync(external), Buffer.alloc(32, 5));
      } finally { cleanup(); }
    }
  }
});

test('two processes initialize one key and retain every independent encrypted record', async () => {
  const { store, cleanup } = fixture();
  try {
    await Promise.all(['one', 'two'].map(prefix => run(process.execPath, ['--input-type=module', '-e', `
      import { createCredentialStore } from ${JSON.stringify(moduleUrl)};
      const store = createCredentialStore(process.env.FIXTURE_STORE);
      for (let i = 0; i < 20; i++) store.set('im-secret', '${prefix}-' + i, 'fixture-' + i);
    `], { env: { ...process.env, FIXTURE_STORE: store.root } })));
    for (const prefix of ['one', 'two']) {
      for (let i = 0; i < 20; i++) assert.equal(store.get('im-secret', prefix + '-' + i), 'fixture-' + i);
    }
    assert.deepEqual(readdirSync(store.root).sort(), ['credentials.json', 'master.key']);
  } finally { cleanup(); }
});

test('an atomic store write failure preserves the old ciphertext and key and releases resources', async () => {
  const { store, cleanup } = fixture();
  try {
    store.set('lan-password', 'global', 'original fixture');
    const original = readFileSync(store.file);
    const key = readFileSync(store.keyPath);
    await run(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import fs from 'node:fs';
      import { syncBuiltinESMExports } from 'node:module';
      import { createCredentialStore } from ${JSON.stringify(moduleUrl)};
      const rename = fs.renameSync;
      fs.renameSync = () => { throw Object.assign(new Error('injected write failure'), { code: 'EIO' }); };
      syncBuiltinESMExports();
      try {
        assert.throws(() => createCredentialStore(process.env.FIXTURE_STORE).set('lan-password', 'global', 'new fixture'),
          { code: 'CREDENTIALS_UNREADABLE' });
      } finally { fs.renameSync = rename; syncBuiltinESMExports(); }
    `], { env: { ...process.env, FIXTURE_STORE: store.root } });
    assert.deepEqual(readFileSync(store.file), original);
    assert.deepEqual(readFileSync(store.keyPath), key);
    assert.deepEqual(readdirSync(store.root).sort(), ['credentials.json', 'master.key']);
    assert.equal(store.get('lan-password', 'global'), 'original fixture');
  } finally { cleanup(); }
});

test('reads tolerate an atomic store replacement but validate the opened file permissions and link count', { skip: process.platform === 'win32' }, () => {
  for (const replacement of ['private', 'opened-snapshot', 'public-mode', 'hard-link']) {
    const { root, store, cleanup } = fixture();
    const open = fs.openSync;
    try {
      store.set('lan-password', 'global', 'fixture');
      const bytes = readFileSync(store.file);
      let swapped = false;
      fs.openSync = (path, ...args) => {
        if (path === store.file && !swapped) {
          swapped = true;
          const snapshot = replacement === 'opened-snapshot' ? open(path, ...args) : null;
          const temporary = join(root, 'replacement');
          writeFileSync(temporary, bytes, { mode: replacement === 'public-mode' ? 0o644 : 0o600 });
          if (replacement === 'hard-link') linkSync(temporary, join(root, 'alias'));
          renameSync(temporary, store.file);
          if (snapshot !== null) return snapshot;
        }
        return open(path, ...args);
      };
      syncBuiltinESMExports();
      if (replacement === 'private' || replacement === 'opened-snapshot') assert.equal(store.get('lan-password', 'global'), 'fixture');
      else assert.throws(() => store.get('lan-password', 'global'), { code: 'CREDENTIALS_UNREADABLE' });
      assert.equal(swapped, true);
    } finally { fs.openSync = open; syncBuiltinESMExports(); cleanup(); }
  }
});
