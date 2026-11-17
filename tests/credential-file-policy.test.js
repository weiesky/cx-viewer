import test from 'node:test';
import assert from 'node:assert/strict';
import { fstatSync, closeSync, linkSync, mkdirSync, mkdtempSync, openSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCredentialFilePolicy } from '../lib/credential-file-policy.js';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cxv-credential-policy-'));
  const vault = join(root, 'vault');
  const backups = join(root, 'backups');
  const project = join(root, 'project');
  mkdirSync(project);
  return { root, vault, backups, project, policy: createCredentialFilePolicy([vault, backups]),
    cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('credential roots are denied before creation, while same-named project fixtures remain usable', () => {
  const { vault, backups, project, policy, cleanup } = fixture();
  try {
    for (const path of [vault, join(vault, 'master.key'), join(backups, 'one', 'preferences.json')]) {
      assert.throws(() => policy.assertPath(path), { code: 'ACCESS_DENIED' });
      assert.equal(policy.allows(path), false);
    }
    for (const path of [join(project, 'master.key'), vault + '-example.txt']) assert.equal(policy.allows(path), true);
  } finally { cleanup(); }
});

test('symbolic aliases cannot expose a vault or backup tree', { skip: process.platform === 'win32' }, () => {
  const { vault, backups, project, policy, cleanup } = fixture();
  try {
    for (const [index, privateRoot] of [vault, backups].entries()) {
      mkdirSync(privateRoot);
      writeFileSync(join(privateRoot, 'secret'), 'fixture');
      symlinkSync(privateRoot, join(project, `alias-${index}`));
      assert.throws(() => policy.assertPath(join(project, `alias-${index}`, 'secret')), { code: 'ACCESS_DENIED' });
      assert.equal(policy.allows(join(project, `alias-${index}`, 'new')), false);
    }
  } finally { cleanup(); }
});

test('hard-linked private data and already-open descriptors remain protected', { skip: process.platform === 'win32' }, () => {
  const { vault, backups, project, policy, cleanup } = fixture();
  try {
    for (const [index, privateRoot] of [vault, backups].entries()) {
      mkdirSync(privateRoot);
      writeFileSync(join(privateRoot, 'secret'), 'fixture');
      const direct = openSync(join(privateRoot, 'secret'), 'r');
      try { assert.throws(() => policy.assertPath(join(project, 'ordinary'), fstatSync(direct)), { code: 'ACCESS_DENIED' }); }
      finally { closeSync(direct); }
      const alias = join(project, `alias-${index}`);
      linkSync(join(privateRoot, 'secret'), alias);
      assert.equal(policy.allows(alias), false);
      const fd = openSync(alias, 'r');
      try { assert.throws(() => policy.assertPath(join(project, 'other-name'), fstatSync(fd)), { code: 'ACCESS_DENIED' }); }
      finally { closeSync(fd); }
    }
    writeFileSync(join(project, 'normal'), 'fixture');
    linkSync(join(project, 'normal'), join(project, 'normal-link'));
    assert.equal(policy.allows(join(project, 'normal-link')), true);
  } finally { cleanup(); }
});

test('mutation guards reject private roots and ancestors while permitting ordinary siblings', () => {
  const { root, vault, backups, project, policy, cleanup } = fixture();
  try {
    for (const path of [root, vault, backups, join(vault, 'future')]) {
      assert.throws(() => policy.assertMutationPath(path), { code: 'ACCESS_DENIED' });
    }
    assert.doesNotThrow(() => policy.assertPath(root)); // Browsing the parent remains useful.
    assert.doesNotThrow(() => policy.assertMutationPath(project));
    assert.doesNotThrow(() => policy.assertMutationPath(vault + '-example'));
  } finally { cleanup(); }
});

test('an explicitly configured private symlink protects its target without blocking ordinary descriptors', { skip: process.platform === 'win32' }, () => {
  const { root, project, cleanup } = fixture();
  const secret = join(root, 'actual-config');
  const configured = join(root, 'configured-link');
  try {
    writeFileSync(secret, 'synthetic secret');
    symlinkSync(secret, configured);
    const policy = createCredentialFilePolicy([configured]);
    assert.equal(policy.allows(configured), false);
    assert.equal(policy.allows(secret), false);
    const ordinary = join(project, 'ordinary');
    writeFileSync(ordinary, 'public');
    const fd = openSync(ordinary, 'r');
    try { assert.doesNotThrow(() => policy.assertPath(ordinary, fstatSync(fd))); }
    finally { closeSync(fd); }
    linkSync(secret, join(project, 'alias'));
    assert.equal(policy.allows(join(project, 'alias')), false);
  } finally { cleanup(); }
});
