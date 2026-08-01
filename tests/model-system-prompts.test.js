import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  getDefaultSystemPrompt,
  getModelSystemPrompts,
  injectSystemPromptIntoThreadStart,
  saveDefaultSystemPrompt,
  saveModelSystemPrompt,
  selectSystemPrompt,
  SystemPromptStoreError,
} from '../lib/model-system-prompts.js';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cxv-prompts-'));
  const logDir = join(root, 'logs');
  const cwd = join(root, 'workspace');
  mkdirSync(logDir);
  mkdirSync(cwd);
  return { root, logDir, cwd };
}

test('saves, reads, clears, and rejects stale revisions', () => {
  const ctx = fixture();
  const saved = saveDefaultSystemPrompt({ ...ctx, text: 'hello', mode: 'append', expectedRevision: '0' });
  assert.equal(saved.cleared, false);
  assert.equal(getDefaultSystemPrompt(ctx).text, 'hello');
  assert.throws(
    () => saveDefaultSystemPrompt({ ...ctx, text: 'stale', mode: 'append', expectedRevision: '0' }),
    error => error instanceof SystemPromptStoreError && error.status === 409,
  );
  const cleared = saveDefaultSystemPrompt({
    ...ctx,
    text: '',
    mode: 'append',
    expectedRevision: saved.revision,
  });
  assert.deepEqual(cleared, { cleared: true, revision: '0' });
});

test('selects workspace before global and exact before longest substring', () => {
  const ctx = fixture();
  saveDefaultSystemPrompt({ ...ctx, text: 'default', mode: 'append' });
  saveModelSystemPrompt({ ...ctx, scope: 'global', name: 'GPT-5', text: 'global', mode: 'append' });
  saveModelSystemPrompt({ ...ctx, scope: 'workspace', name: 'GPT', text: 'workspace-short', mode: 'append' });
  saveModelSystemPrompt({ ...ctx, scope: 'workspace', name: 'GPT-5.6', text: 'workspace-long', mode: 'override' });

  assert.equal(selectSystemPrompt({ ...ctx, model: 'gpt-5.6-sol' }).text, 'workspace-long');
  assert.equal(selectSystemPrompt({ ...ctx, model: 'gpt-5' }).text, 'workspace-short');
  assert.equal(selectSystemPrompt({ ...ctx, model: null }).text, 'default');
  assert.equal(getModelSystemPrompts(ctx).workspace.length, 2);
});

test('rejects unsafe model names and oversized or NUL text', () => {
  const ctx = fixture();
  for (const name of ['../x', 'default', 'X_APPEND']) {
    assert.throws(() => saveModelSystemPrompt({
      ...ctx, scope: 'workspace', name, text: 'x', mode: 'append',
    }), SystemPromptStoreError);
  }
  assert.throws(() => saveDefaultSystemPrompt({ ...ctx, text: 'a\0b', mode: 'append' }), SystemPromptStoreError);
  assert.throws(
    () => saveDefaultSystemPrompt({ ...ctx, text: 'x'.repeat(128 * 1024 + 1), mode: 'append' }),
    error => error instanceof SystemPromptStoreError && error.status === 413,
  );
});

test('rejects a symlinked managed store root', () => {
  const ctx = fixture();
  const victim = join(ctx.root, 'victim');
  mkdirSync(victim);
  symlinkSync(victim, join(ctx.logDir, 'managed-system-prompts-v1'));
  assert.throws(() => getDefaultSystemPrompt(ctx), SystemPromptStoreError);
});

test('injects only thread/start and preserves the other instruction layer', () => {
  const append = injectSystemPromptIntoThreadStart({
    method: 'thread/start',
    params: { developerInstructions: 'existing', baseInstructions: 'base' },
  }, { text: 'custom', mode: 'append' });
  assert.equal(append.params.developerInstructions, 'existing\n\ncustom');
  assert.equal(append.params.baseInstructions, 'base');

  const override = injectSystemPromptIntoThreadStart({
    method: 'thread/start',
    params: { developerInstructions: 'existing', baseInstructions: 'base' },
  }, { text: 'replacement', mode: 'override' });
  assert.equal(override.params.baseInstructions, 'replacement');
  assert.equal(override.params.developerInstructions, 'existing');

  const resume = { method: 'thread/resume', params: { threadId: 't1' } };
  assert.equal(injectSystemPromptIntoThreadStart(resume, { text: 'nope', mode: 'append' }), resume);
});

test('repeated thread/start injection is idempotent', () => {
  const first = injectSystemPromptIntoThreadStart({
    method: 'thread/start',
    params: { developerInstructions: 'existing' },
  }, { text: 'custom', mode: 'append' });
  const second = injectSystemPromptIntoThreadStart(first, { text: 'custom', mode: 'append' });
  assert.equal(second.params.developerInstructions, 'existing\n\ncustom');

  const firstOverride = injectSystemPromptIntoThreadStart({
    method: 'thread/start',
    params: { baseInstructions: 'base' },
  }, { text: 'replacement', mode: 'override' });
  const secondOverride = injectSystemPromptIntoThreadStart(firstOverride, { text: 'replacement', mode: 'override' });
  assert.equal(secondOverride.params.baseInstructions, 'replacement');
});

test('stray JSON files are skipped and corrupted prompt files fail with their path', () => {
  const ctx = fixture();
  saveModelSystemPrompt({ ...ctx, scope: 'workspace', name: 'GPT-5', text: 'x', mode: 'append' });
  const listed = getModelSystemPrompts(ctx);
  writeFileSync(join(listed.workspaceDir, 'README.json'), '{}');
  assert.equal(getModelSystemPrompts(ctx).workspace.length, 1);

  writeFileSync(join(listed.workspaceDir, 'GPT-5.json'), 'not json');
  assert.throws(
    () => getModelSystemPrompts(ctx),
    error => error instanceof SystemPromptStoreError
      && error.code === 'invalid_prompt_file'
      && error.message.includes('GPT-5.json'),
  );
});
