import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { classifyUserContent, extractDisplayText, isSystemText } from '../src/utils/contentFilter.js';
import { projectUserPromptItem } from '../src/utils/userPromptContent.js';
import {
  buildCustomTemplate,
  buildLocalUltraplan,
  parseUltraplanPrompt,
} from '../src/utils/ultraplanTemplates.js';

const ROOT = new URL('../', import.meta.url);

test('built-in UltraPlan prompts expose only the user task', () => {
  for (const variant of ['codeExpert', 'researchExpert']) {
    const wire = buildLocalUltraplan('repair the conversation panel', variant);
    const parsed = parseUltraplanPrompt(wire);
    assert.equal(parsed?.displayText, 'repair the conversation panel');
    assert.equal(parsed?.isUltraplan, true);
    assert.equal(parsed.displayText.includes('[SCOPED INSTRUCTION]'), false);
  }
});

test('auto-wrapped custom and seeded UltraPlan prompts preserve user-visible material', () => {
  const custom = buildLocalUltraplan('custom task', 'custom', undefined, 'Coordinate several reviewers.');
  assert.equal(parseUltraplanPrompt(custom)?.displayText, 'custom task');

  const seeded = buildLocalUltraplan('improve it', 'codeExpert', 'draft step one');
  assert.equal(parseUltraplanPrompt(seeded)?.displayText, 'improve it');
});

test('UltraPlan task may quote user_instructions tags without losing the message', () => {
  const task = '为什么开头有一个"<user_instructions>"吗？请区分这个特性。';
  assert.equal(parseUltraplanPrompt(buildLocalUltraplan(task))?.displayText, task);

  const bothTags = '正文可以讨论 <user_instructions> 和 </user_instructions> 字面量。';
  assert.equal(parseUltraplanPrompt(buildLocalUltraplan(bothTags))?.displayText, bothTags);
});

test('UltraPlan survives string, array, and prompt-summary projection paths', () => {
  const wire = buildLocalUltraplan('serious bug fixture', 'codeExpert');
  assert.equal(extractDisplayText(wire), 'serious bug fixture');

  const classified = classifyUserContent([{ type: 'text', text: wire }]);
  assert.equal(classified.textBlocks.length, 1);
  assert.equal(classified.textBlocks[0].text, 'serious bug fixture');
  assert.equal(classified.textBlocks[0].isUltraplan, true);

  const projected = projectUserPromptItem({
    type: 'message', role: 'user', content: [{ type: 'input_text', text: wire }],
  });
  assert.deepEqual(projected?.segments, [{ type: 'text', text: 'serious bug fixture' }]);
});

test('mixed text blocks keep their original order', () => {
  const wire = buildLocalUltraplan('second task', 'codeExpert');
  const classified = classifyUserContent([
    { type: 'text', text: 'first task' },
    { type: 'text', text: wire },
    { type: 'text', text: 'third task' },
  ]);
  assert.deepEqual(
    classified.textBlocks.map(block => [block.text, block.isUltraplan === true]),
    [['first task', false], ['second task', true], ['third task', false]],
  );
});

test('ordinary or malformed user_instructions remain hidden and unclassified', () => {
  const ordinary = '<user_instructions>private system rule</user_instructions>\n\nhello';
  const suffixOnly = '<user_instructions>private</user_instructions>\n\nmention update_plan, request_user_input, and multi_agent_v${verson}';
  const unclosed = '<user_instructions>[SCOPED INSTRUCTION] next 1-3 interactions update_plan request_user_input multi_agent_v${verson}';
  const quoted = `Please explain this template:\n${buildCustomTemplate('Coordinate reviewers.')}`;
  const multiple = `${buildLocalUltraplan('one')}\n${buildLocalUltraplan('two')}`;

  for (const value of [ordinary, suffixOnly, unclosed, quoted, multiple]) {
    assert.equal(parseUltraplanPrompt(value), null);
  }
  assert.equal(isSystemText(ordinary), true);
  assert.equal(extractDisplayText(ordinary), '');
  assert.equal(classifyUserContent([{ type: 'text', text: ordinary }]).textBlocks.length, 0);
});

test('many literal opening tags are rejected without being treated as scaffolds', () => {
  const value = `${'<user_instructions>'.repeat(5000)} ordinary user text`;
  assert.equal(parseUltraplanPrompt(value), null);
});

test('pre-wrapped nonstandard custom instructions are not guessed as UltraPlan history', () => {
  const wire = buildLocalUltraplan('task', 'custom', undefined, '<user_instructions>custom private rules</user_instructions>');
  assert.equal(parseUltraplanPrompt(wire), null);
});

test('UltraPlan marker is wired to both history shapes, pending rows, and ChatMessage cache', () => {
  const view = readFileSync(new URL('src/components/chat/ChatView.jsx', ROOT), 'utf8');
  const message = readFileSync(new URL('src/components/chat/ChatMessage.jsx', ROOT), 'utf8');
  assert.match(view, /const isUltraplan = textBlocks\[ti\]\.isUltraplan === true/);
  assert.match(view, /isUltraplan=\{isUltraplan\}/);
  assert.match(view, /isUltraplan=\{record\.kind === 'ultraplan'\}/);
  assert.match(view, /const isPlan = !isUltraplan && \/Implement the following plan:\/i/);
  assert.match(message, /p\.isUltraplan !== n\.isUltraplan/);
  assert.match(message, /t\('ui\.ultraplan'\)/);
});
