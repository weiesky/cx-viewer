import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../cli.js', import.meta.url), 'utf8');

test('CLI installs exactly one shutdown coordinator before startup modes run', () => {
  const registrations = source.match(/registerSignalShutdown\(/g) || [];
  assert.equal(registrations.length, 1);
  assert.ok(source.indexOf('registerSignalShutdown(') < source.indexOf('async function runCliMode('));
});

test('CLI cleanup keeps proxy shutdown in function scope', () => {
  assert.match(source, /let stopProxyFn = \(\) => \{\}/);
  assert.match(source, /stopProxyFn = stopProxy/);
  assert.match(source, /try \{ stopProxyFn\(\); \} catch \{\}/);
});

test('the shared SDK, PTY and workspace restart handler forwards the live access token', () => {
  assert.match(source, /launchRestart\(\{ \.\.\.cxvLaunch, version, accessToken: serverMod\.getAccessToken\(\) \}\)/);
  assert.equal((source.match(/registerUpdateRestart\(serverMod\)/g) || []).length, 4,
    'one shared declaration and all three launch modes must register the handler');
});
