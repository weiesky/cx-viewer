import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendCxvFinalConfigArgs,
  CODEX_BYPASS_FLAG,
  getDefaultModeRequestUserInputConfigArgs,
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

test('native Default-mode request_user_input config has final precedence', () => {
  assert.deepEqual(getDefaultModeRequestUserInputConfigArgs(), [
    '-c',
    'features.default_mode_request_user_input=true',
  ]);
  assert.deepEqual(appendCxvFinalConfigArgs([
    '--model', 'gpt-test',
    '-c', 'features.default_mode_request_user_input=false',
    '-c', 'openai_base_url="https://user.invalid/v1"',
  ], { proxyPort: 4321 }).slice(-4), [
    '-c', 'features.default_mode_request_user_input=true',
    '-c', 'openai_base_url="http://127.0.0.1:4321/v1"',
  ]);
});

test('failed proxy startup does not append a stale redirect', () => {
  const args = appendCxvFinalConfigArgs(['--model', 'gpt-test']);
  assert.deepEqual(args, [
    '--model', 'gpt-test',
    '-c', 'features.default_mode_request_user_input=true',
  ]);
  assert.equal(args.some(arg => arg.includes('openai_base_url')), false);
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
