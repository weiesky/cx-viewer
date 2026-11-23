import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
const root = mkdtempSync('/tmp/cxv-updater-');
process.env.HOME = root; process.env.CODEX_HOME = join(root, 'codex');
mkdirSync(process.env.CODEX_HOME);
const { checkAndUpdate, isNewer, detectHomebrewInstall, detectPnpmGlobalInstall, isAnyCcvBusy } = await import('../lib/updater.js');
const nativeConfig = join(process.env.CODEX_HOME, 'config.toml');
const fetchImpl = async () => ({ ok: true, json: async () => ({ version: '1.1.21', dist: { tarball: 'https://registry.npmjs.org/cx-viewer/-/cx-viewer-1.1.21.tgz' } }) });
after(() => rmSync(root, { recursive: true, force: true }));

test('checking detects an available stable release without ever running an installer', async () => {
  let installed = false;
  const state = await checkAndUpdate({ force: true, fetchImpl, interactive: true, execImpl: () => { installed = true; } });
  assert.equal(state.status, 'available'); assert.equal(state.remoteVersion, '1.1.21');
  assert.equal(installed, false);
  assert.equal((await checkAndUpdate({ fetchImpl })).status, 'skipped');
});
test('native traffic/config disable remains effective; explicit check can override the setting', async () => {
  process.env.CODEX_DISABLE_NONESSENTIAL_TRAFFIC = '1';
  assert.equal((await checkAndUpdate({ force: true, fetchImpl })).status, 'disabled');
  delete process.env.CODEX_DISABLE_NONESSENTIAL_TRAFFIC;
  for (const key of ['auto_update', 'auto_updates']) {
    writeFileSync(nativeConfig, `${key} = false\n`);
    assert.equal((await checkAndUpdate({ force: true, fetchImpl })).status, 'disabled');
    assert.equal((await checkAndUpdate({ force: true, fetchImpl, allowDisabled: true, interactive: true })).status, 'available');
  }
  rmSync(nativeConfig);
});
test('managed channels, busy peers and major updates do not auto-install', async () => {
  assert.equal((await checkAndUpdate({ force: true, fetchImpl, brewPrefix: '/opt/homebrew' })).status, 'brew_managed');
  assert.equal((await checkAndUpdate({ force: true, fetchImpl, pnpmRoot: '/owned/global' })).status, 'pnpm_managed');
  assert.equal((await checkAndUpdate({ force: true, fetchImpl, busy: true })).status, 'deferred_busy');
  assert.equal((await checkAndUpdate({ force: true, fetchImpl: async () => ({ ok: true, json: async () => ({ version: '2.0.0' }) }) })).status, 'major_available');
});
test('registry failure and malformed versions fail safely; test context never contacts the network implicitly', async () => {
  assert.equal((await checkAndUpdate({ force: true })).status, 'skipped_test_context');
  assert.equal((await checkAndUpdate({ force: true, fetchImpl: async () => { throw new Error('offline'); } })).status, 'error');
  for (const version of ['latest', '1.1.21;echo', '1.1.21-beta', '', undefined]) {
    assert.equal((await checkAndUpdate({ force: true, fetchImpl: async () => ({ ok: true, json: async () => ({ version }) }) })).status, 'error');
    assert.equal(isNewer(version, '1.1.20'), false);
  }
});
test('native package-manager paths and conservative listener detection keep their boundaries', () => {
  assert.equal(detectHomebrewInstall('/opt/homebrew/Cellar/cx-viewer/1.1.20/lib/node_modules/cx-viewer/lib', value => value), '/opt/homebrew');
  assert.equal(detectPnpmGlobalInstall('/Users/test/Library/pnpm/global/5/node_modules/.pnpm/cx-viewer@1.1.20/node_modules/cx-viewer/lib', value => value), '/Users/test/Library/pnpm');
  assert.equal(detectPnpmGlobalInstall('/workspace/cx-viewer/lib', value => value), null);
  assert.equal(isAnyCcvBusy({ currentPid: 10, lsofImpl: () => 'p10\np20\n' }), true);
  assert.equal(isAnyCcvBusy({ currentPid: 10, lsofImpl: () => 'p10\n' }), false);
});
