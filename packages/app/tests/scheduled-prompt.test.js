import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleScheduledPrompt, buildLocalUltraplan, buildCustomTemplate } from '../src/utils/ultraplanTemplates.js';

test('scheduled raw prompts and quoted durable attachments are assembled without mutating storage', () => {
  assert.equal(assembleScheduledPrompt({ prompt: '  raw 中文  ' }), 'raw 中文');
  assert.equal(assembleScheduledPrompt(null), '');
  const task = { prompt: ' inspect ', template: 'none', attachments: [{ name: 'a', path: '/project/a file.png' }] };
  const before = structuredClone(task);
  assert.equal(assembleScheduledPrompt(task), '"/project/a file.png" inspect');
  assert.deepEqual(task, before);
  assert.equal(assembleScheduledPrompt({ attachments: task.attachments }), '"/project/a file.png"');
  assert.equal(buildLocalUltraplan('raw', 'none', 'ignored'), 'raw');
});

test('scheduled expert snapshots reuse native templates and re-editing never wraps the stored text', () => {
  for (const template of ['codeExpert', 'researchExpert']) {
    const task = { template, prompt: 'inspect' };
    assert.equal(assembleScheduledPrompt(task), buildLocalUltraplan('inspect', template));
    assert.equal(task.prompt, 'inspect');
  }
  const task = { template: 'custom:fixture', templateContent: 'snapshot body', prompt: 'inspect' };
  assert.equal(assembleScheduledPrompt(task), buildCustomTemplate('snapshot body') + '\n\ninspect');
  assert.match(assembleScheduledPrompt(task), /<user_instructions>/);
  assert.equal(assembleScheduledPrompt({ ...task, templateContent: '' }), 'inspect');
  assert.equal(assembleScheduledPrompt({ ...task, template: 'unknown' }), 'inspect');
});
