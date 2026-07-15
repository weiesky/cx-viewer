import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/AppBase.jsx', import.meta.url), 'utf8');

test('V2 bootstrap waits for the React baseline commit before becoming live-ready', () => {
  assert.match(source, /await this\._runSseColdIngest\([\s\S]*?this\._v2BootstrapReady = true/);
  assert.match(source, /_commitColdIngest\([\s\S]*?return new Promise\([\s\S]*?this\.setState\(newState,[\s\S]*?resolve\(true\)/);
});

test('a live reset during bootstrap is deferred until the baseline is visible', () => {
  assert.match(source, /if \(!this\._v2BootstrapReady\) \{[\s\S]*?this\._v2LiveNeedsReset = true/);
  assert.match(source, /this\._v2BootstrapReady = true;[\s\S]*?if \(this\._v2LiveNeedsReset\)/);
});
