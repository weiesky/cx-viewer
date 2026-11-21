import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPtyWorkspaceLaunchArgs, CODEX_BYPASS_FLAG } from '../lib/cli-args.js';

test('a fresh picker choice cannot inherit boot bypass, profile, cwd, grants or old turn input', () => {
  const boot = [CODEX_BYPASS_FLAG, '--full-auto', '--profile', 'unsafe-profile', '--cd', '/old',
    '--ask-for-approval', 'never', '--sandbox', 'danger-full-access', '--add-dir', '/outside',
    '-c', 'approval_policy="never"', '-c', 'sandbox_mode="danger-full-access"',
    '--remote', 'ws://old', 'resume', 'old-thread', 'old prompt', '-m', 'selected-model'];
  assert.deepEqual(buildPtyWorkspaceLaunchArgs(boot, []), ['-m', 'selected-model']);
  assert.equal(boot[0], CODEX_BYPASS_FLAG, 'the running boot invocation is not rewritten');
});

test('only model settings survive and the actual picker supplies bypass and resume-last', () => {
  const boot = ['--model=selected-model', '-c', 'model_reasoning_effort="high"',
    '--config', 'model_provider="local"', '-c', 'model_reasoning_summary="detailed"',
    '-c', 'shell_environment_policy.set.SECRET="old"', '-c', 'model="bad"\napproval_policy="never"'];
  assert.deepEqual(buildPtyWorkspaceLaunchArgs(boot, ['resume', '--last', CODEX_BYPASS_FLAG]), [
    '--model=selected-model', '-c', 'model_reasoning_effort="high"', '--config', 'model_provider="local"',
    '-c', 'model_reasoning_summary="detailed"', CODEX_BYPASS_FLAG, 'resume', '--last',
  ]);
});

test('option values and terminated prompt text cannot masquerade as inherited flags', () => {
  assert.deepEqual(buildPtyWorkspaceLaunchArgs(['-c', 'approval_policy="never"', '--', '--model=prompt', CODEX_BYPASS_FLAG]), []);
  assert.deepEqual(buildPtyWorkspaceLaunchArgs(['--profile', '--model=not-an-option', '-m', 'real-model']), ['-m', 'real-model']);
});

test('workspace picker rejects arbitrary commands, cwd changes, incomplete resume and malformed input', () => {
  for (const args of [['--cd', '/other'], ['exec'], ['resume', 'old-thread'], ['resume'], ['--last'],
    [CODEX_BYPASS_FLAG, CODEX_BYPASS_FLAG], ['--config', 'approval_policy="never"'], [3], null, ['bad\0']]) {
    assert.throws(() => buildPtyWorkspaceLaunchArgs([], args), TypeError);
  }
  assert.throws(() => buildPtyWorkspaceLaunchArgs(['--model']), /Incomplete/);
});
