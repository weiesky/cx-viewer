import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/settings/ProcessModal.jsx', import.meta.url), 'utf8');

test('process modal sends an opaque process reference and polls the accepted operation', () => {
  assert.match(source, /JSON\.stringify\(\{ processRef: target\.processRef \}\)/);
  assert.match(source, /\/api\/cxv-processes\/kill-status\?id=/);
  assert.match(source, /final\?\.status === 'exited' \|\| final\?\.status === 'forced'/);
});

test('process modal aborts polling when it closes', () => {
  assert.match(source, /killAbortRef\.current\?\.abort\(\)/);
  assert.match(source, /return \(\) => killAbortRef\.current\?\.abort\(\)/);
});

test('server exposes accepted termination operations instead of premature success', () => {
  const server = readFileSync(new URL('../server.js', import.meta.url), 'utf8');
  assert.match(server, /\/api\/cxv-processes\/kill-status/);
  assert.match(server, /res\.writeHead\(202/);
  assert.match(server, /sameProcessIdentity\(expected, actual\)/);
});
