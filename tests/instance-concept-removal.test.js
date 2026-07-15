import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function source(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('removed log-instance UI and protocol identifiers do not return', () => {
  const frontend = [
    'src/AppBase.jsx',
    'src/App.jsx',
    'src/Mobile.jsx',
    'src/components/dashboard/AppHeader.jsx',
    'src/components/viewers/LogTable.jsx',
    'src/i18n.js',
  ].map(source).join('\n');

  for (const identifier of [
    'instanceId',
    'logShowAllInstances',
    'showAllInstanceLogs',
    'logInstanceId',
    '/api/session-pin',
    'session_pin',
    '?all=1',
  ]) {
    assert.equal(frontend.includes(identifier), false, `${identifier} must remain removed`);
  }
});

test('live log delivery no longer adds a process identifier', () => {
  const server = source('server.js');
  const watcher = source('lib/log-watcher.js');
  const ptyManager = source('pty-manager.js');

  assert.doesNotMatch(server, /\bgetCodexPid\b/);
  assert.doesNotMatch(watcher, /\bgetCodexPid\b|parsed\.pid\s*=/);
  assert.doesNotMatch(ptyManager, /export function getPtyPid\b/);
});

test('operational process identities remain available for locking and management', () => {
  assert.match(source('lib/log-v2/storage.js'), /owner\.pid/);
  assert.match(source('server.js'), /\/api\/cxv-processes/);
  assert.match(source('lib/otel-receiver.js'), /service\.instance\.id/);
});
