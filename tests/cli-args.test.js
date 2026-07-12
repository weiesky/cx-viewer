import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CODEX_BYPASS_FLAG,
  hasBypassPermissions,
  normalizeCodexArgs,
  getReasoningSummaryConfigArgs,
} from '../lib/cli-args.js';

test('normalizeCodexArgs consumes cxv bypass aliases before spawning Codex', () => {
  for (const alias of ['-d', '--d', '--dangerously-skip-permissions']) {
    const { codexArgs, bypassPermissions } = normalizeCodexArgs([alias, 'hello']);
    assert.equal(bypassPermissions, true);
    assert.deepEqual(codexArgs, [CODEX_BYPASS_FLAG, 'hello']);
    assert.equal(hasBypassPermissions(codexArgs), true);
    assert.equal(codexArgs.includes(alias), false);
  }
});

test('normalizeCodexArgs keeps allow-bypass toggle as cxv-only', () => {
  const { codexArgs, allowBypassToggle } = normalizeCodexArgs(['--ad', 'hello']);
  assert.equal(allowBypassToggle, true);
  assert.deepEqual(codexArgs, ['hello']);
});

test('getReasoningSummaryConfigArgs enables detailed summaries by default', () => {
  assert.deepEqual(getReasoningSummaryConfigArgs({}), [
    '-c',
    'model_reasoning_summary="detailed"',
  ]);
});
