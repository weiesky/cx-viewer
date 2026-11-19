import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('different log roots share profile credentials only when their profile owner is shared', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-credential-owners-'));
  const script = `
    const paths = await import('./lib/credential-paths.js');
    const { PROFILE_PATH } = await import('./lib/proxy-profile-path.js');
    const findcx = await import('./findcx.js');
    const { isPublicFilePath } = await import('./lib/credential-file-policy.js');
    const changed = (await import('node:os')).homedir() + '/.cxv-path-change-fixture';
    findcx.setLogDir(changed);
    if (findcx.LOG_DIR !== changed) throw new Error('log directory did not actually change');
    process.env.CXV_PROXY_PROFILE_PATH = 'changed.json';
    console.log(JSON.stringify({ ...paths, PROFILE_PATH,
      publicKey: isPublicFilePath(paths.PROFILE_CREDENTIAL_PATHS.keyPath),
      oldConfigPublic: isPublicFilePath(process.env.CXV_LOG_DIR + '/preferences.json'),
      newConfigPublic: isPublicFilePath(changed + '/preferences.json'),
      publicExample: isPublicFilePath(paths.PROFILE_CREDENTIAL_PATHS.keyPath + '-example') }));
  `;
  const load = (log, profile) => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    env: { ...process.env, CXV_LOG_DIR: log, CXV_PROXY_PROFILE_PATH: profile }, encoding: 'utf8',
  }));
  try {
    const profile = join(root, 'shared', 'profile.json');
    const a = load(join(root, 'a'), profile);
    const b = load(join(root, 'b'), profile);
    assert.notEqual(a.CREDENTIAL_PATHS.root, b.CREDENTIAL_PATHS.root);
    assert.deepEqual(a.PROFILE_CREDENTIAL_PATHS, b.PROFILE_CREDENTIAL_PATHS);
    assert.equal(a.PROFILE_PATH, profile);
    assert.equal(a.CREDENTIAL_PATHS.root, join(root, 'a', 'private-credentials-v1'));
    assert.equal(a.publicKey, false);
    assert.equal(a.oldConfigPublic, false);
    assert.equal(a.newConfigPublic, false);
    // Still inside the private directory, even with an innocent-looking suffix.
    assert.equal(a.publicExample, false);
    const same = load(join(root, 'shared'), profile);
    assert.deepEqual(same.CREDENTIAL_PATHS, same.PROFILE_CREDENTIAL_PATHS);
    assert.equal(same.PRIVATE_CREDENTIAL_ROOTS.length, 2);
    const relative = load(join(root, 'a'), 'test-profile.json');
    assert.equal(relative.PROFILE_PATH, resolve('test-profile.json'));
    assert.deepEqual(readdirSync(root), []); // Path definitions create no user files.
  } finally { rmSync(root, { recursive: true, force: true }); }
});
