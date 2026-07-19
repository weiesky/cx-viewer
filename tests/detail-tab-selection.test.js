import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  requestHidesContextTab,
  resolveDetailTabForRequest,
} from '../src/utils/detailTabSelection.js';

test('switching from Codex Raw to MainAgent falls back to Context', () => {
  const mainAgent = { url: 'https://chatgpt.com/backend-api/codex/responses', mainAgent: true };
  assert.equal(requestHidesContextTab(mainAgent), false);
  assert.equal(resolveDetailTabForRequest('raw', mainAgent), 'context');
});

test('switching from Codex Raw to a tool row falls back to Request', () => {
  const tool = { url: 'codex://tool/shell_command' };
  assert.equal(requestHidesContextTab(tool), true);
  assert.equal(resolveDetailTabForRequest('raw', tool), 'request');
  assert.equal(resolveDetailTabForRequest('context', tool), 'request');
});

test('keeps available tabs and never invents Codex Raw for a request without raw frames', () => {
  const rawRequest = { url: 'codex://tool/shell_command', _codexRaw: { fromSeq: 1, toSeq: 2 } };
  assert.equal(resolveDetailTabForRequest('raw', rawRequest), 'raw');
  assert.equal(resolveDetailTabForRequest('response', {}), 'response');

  const detailPanel = readFileSync(new URL('../src/components/dashboard/DetailPanel.jsx', import.meta.url), 'utf8');
  assert.match(detailPanel, /if \(request\._codexRaw\) \{/);
  assert.doesNotMatch(detailPanel, /request\._codexRaw \|\| currentTab === 'raw'/);
  assert.match(detailPanel, /activeKey=\{activeTab\}/);
});
