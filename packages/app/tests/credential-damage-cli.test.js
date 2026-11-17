import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, linkSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createCredentialStore } from '../lib/credential-store.js';
import { readCredentialDamageEvidence, readCredentialBackup } from '../lib/credential-backup.js';

const run = promisify(execFile);
const command = fileURLToPath(new URL('../scripts/capture-credential-damage.mjs', import.meta.url));
function fixture(t) {
  const owner = mkdtempSync(join(tmpdir(), 'cxv-damage-cli-'));
  t.after(() => rmSync(owner, { recursive: true, force: true }));
  const store = createCredentialStore(join(owner, 'private-credentials-v1'));
  store.set('im-secret', 'synthetic-owner', 'synthetic-secret');
  const sources = ['preferences.json', 'profile.json'];
  writeFileSync(join(owner, sources[0]), Buffer.from([0xff, 0, 10]));
  writeFileSync(store.file, 'synthetic broken ciphertext', { mode: 0o600 });
  writeFileSync(store.keyPath, 'bad-key', { mode: 0o600 });
  const args = ['--root', owner, ...sources.flatMap(name => ['--source', name])];
  return { owner, store, sources, args };
}

test('damage preview is read-only and explicit capture retains exact invalid bytes and absence without exposing contents', async t => {
  const { owner, store, sources, args } = fixture(t);
  const before = [join(owner, sources[0]), store.file, store.keyPath].map(path => readFileSync(path));
  const preview = await run(process.execPath, [command, ...args]);
  const result = JSON.parse(preview.stdout);
  assert.equal(result.status, 'evidence-preview');
  assert.deepEqual(result.files.find(file => file.path === 'profile.json'), { path: 'profile.json', present: false, bytes: null });
  assert.ok(!preview.stdout.includes('ciphertext') && !preview.stdout.includes('bad-key'));
  assert.equal(existsSync(join(owner, 'credential-backups-v1')), false);
  const capture = await run(process.execPath, [command, ...args, '--apply', '--confirm-stopped']);
  const saved = JSON.parse(capture.stdout);
  assert.equal(saved.status, 'evidence-saved');
  assert.ok(!capture.stdout.includes('ciphertext') && !capture.stdout.includes('bad-key'));
  const options = { ownerDirectory: owner, sources };
  const files = readCredentialDamageEvidence(saved.evidencePath, options);
  assert.deepEqual(files.get('preferences.json'), before[0]);
  assert.equal(files.get('profile.json'), null);
  assert.deepEqual(files.get('private-credentials-v1/credentials.json'), before[1]);
  assert.deepEqual(files.get('private-credentials-v1/master.key'), before[2]);
  assert.throws(() => readCredentialBackup(saved.evidencePath, options), { code: 'CREDENTIAL_BACKUP_UNREADABLE' });
  assert.deepEqual([join(owner, sources[0]), store.file, store.keyPath].map(path => readFileSync(path)), before);
  assert.equal(existsSync(join(owner, 'profile.json')), false);
});

test('capture rejects missing confirmations, invalid scope and source aliases before saving evidence', async t => {
  const { owner, store, sources, args } = fixture(t);
  for (const invalid of [[], [...args, '--apply'], [...args, '--confirm-stopped'], [...args, '--source', '../secret'],
    [...args, '--source', sources[0]], [...args, '--source', 'private-credentials-v1/master.key']]) {
    await assert.rejects(run(process.execPath, [command, ...invalid]), error => error.code === 1);
  }
  const alias = join(owner, 'source-alias');
  linkSync(join(owner, sources[0]), alias);
  await assert.rejects(run(process.execPath, [command, ...args, '--apply', '--confirm-stopped']), error => error.code === 1);
  assert.equal(existsSync(join(owner, 'credential-backups-v1')), false);
  assert.equal(readFileSync(store.keyPath, 'utf8'), 'bad-key');
  assert.equal(readFileSync(store.file, 'utf8'), 'synthetic broken ciphertext');
  assert.ok(!readdirSync(store.root).some(name => name.endsWith('.lock')));
});
