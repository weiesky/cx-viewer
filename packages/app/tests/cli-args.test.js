import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendCxvFinalConfigArgs,
  buildWorkspaceCodexArgs,
  CODEX_BYPASS_FLAG,
  getDefaultModeRequestUserInputConfigArgs,
  hasBypassPermissions,
  normalizeCodexArgs,
  parseCodexInvocation,
  stripResumeInvocation,
  getReasoningSummaryConfigArgs,
} from '../lib/cli-args.js';

test('Codex invocation parsing distinguishes resume from config and nested words', () => {
  assert.equal(normalizeCodexArgs(['continue']).invocation.kind, 'resume');
  assert.equal(normalizeCodexArgs(['--continue']).invocation.selector, 'last');
  assert.equal(normalizeCodexArgs(['-r']).invocation.selector, 'picker');
  assert.deepEqual(normalizeCodexArgs(['-c', 'foo=bar', 'continue']).codexArgs, [
    '-c', 'foo=bar', 'resume', '--last',
  ]);
  assert.equal(parseCodexInvocation(['-c', 'foo=resume', 'resume', 'thread-1']).threadId, 'thread-1');
  assert.equal(parseCodexInvocation(['exec', 'resume']).kind, 'new');
  assert.equal(parseCodexInvocation(['e', 'resume']).kind, 'new');
  assert.equal(parseCodexInvocation(['a', 'resume']).kind, 'new');
  assert.equal(parseCodexInvocation(['-c', 'foo=bar', 'e', 'resume']).kind, 'new');
  assert.equal(parseCodexInvocation(['-c', 'foo=bar']).kind, 'new');
  assert.equal(parseCodexInvocation(['fork', '--last']).kind, 'fork');
  assert.equal(parseCodexInvocation(['-c', 'foo=bar', 'fork', 'thread-1']).kind, 'fork');
  assert.equal(parseCodexInvocation(['--enable', 'feature', '--add-dir', '/tmp/x', 'resume', '--last']).kind, 'resume');
  assert.equal(parseCodexInvocation(['--image', 'a.png', 'b.png', 'resume', '--last']).selector, 'last');
  assert.equal(parseCodexInvocation(['--', 'resume']).kind, 'new');
  assert.equal(parseCodexInvocation(['--future-option', 'value', 'resume', '--last']).kind, 'resume');
});

test('fresh fallback removes resume selector but preserves config pairs', () => {
  const args = ['-c', 'before=1', '--remote', 'ws://127.0.0.1:1234', 'resume', '--last', '-c', 'after=2'];
  assert.deepEqual(stripResumeInvocation(args), [
    '-c', 'before=1', '--remote', 'ws://127.0.0.1:1234', '-c', 'after=2',
  ]);
  const flagsAfterResume = normalizeCodexArgs(['continue', '-d', '--search']).codexArgs;
  assert.deepEqual(stripResumeInvocation(flagsAfterResume), [
    CODEX_BYPASS_FLAG, '--search',
  ]);

  assert.deepEqual(stripResumeInvocation([
    '-c', 'before=1', 'resume', '--all', '--include-non-interactive',
    '-c', 'after=2', 'thread-1', 'continue with this prompt',
  ]), [
    '-c', 'before=1', '-c', 'after=2', 'continue with this prompt',
  ]);
  assert.deepEqual(stripResumeInvocation([
    'resume', '--last', '-c', 'after=2', 'continue with this prompt',
  ]), [
    '-c', 'after=2', 'continue with this prompt',
  ]);
  assert.deepEqual(stripResumeInvocation([
    'resume', '--include-non-interactive', '-c', 'after=2', '--last',
    'continue with this prompt',
  ]), [
    '-c', 'after=2', 'continue with this prompt',
  ]);
  assert.deepEqual(stripResumeInvocation([
    'resume', '--all', '--', 'thread-1', 'prompt after terminator',
  ]), [
    '--', 'prompt after terminator',
  ]);
});

test('workspace launch args use only native Codex resume and bypass flags', () => {
  assert.deepEqual(buildWorkspaceCodexArgs(), []);
  assert.deepEqual(buildWorkspaceCodexArgs({ resumeLast: true }), ['resume', '--last']);
  assert.deepEqual(buildWorkspaceCodexArgs({ dangerousMode: true }), [CODEX_BYPASS_FLAG]);
  assert.deepEqual(buildWorkspaceCodexArgs({ resumeLast: true, dangerousMode: true }), [
    CODEX_BYPASS_FLAG, 'resume', '--last',
  ]);
  assert.equal(normalizeCodexArgs(
    buildWorkspaceCodexArgs({ resumeLast: true, dangerousMode: true }),
  ).invocation.kind, 'resume');
  assert.deepEqual(
    normalizeCodexArgs(['--dangerously-skip-permissions', 'continue']).codexArgs,
    [CODEX_BYPASS_FLAG, 'resume', '--last'],
  );
});

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
