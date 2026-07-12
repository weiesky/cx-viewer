import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getInstructionsText,
  getResponseConversationItems,
  getResponseInstructions,
  getResponseTools,
} from '../lib/openai-body.js';
import { classifyAgentRequest, isCodexResponsesRequest } from '../lib/interceptor-core.js';
import { isMainAgentEntry } from '../lib/main-agent-entry.js';
import {
  createEntrySlimmer,
  restoreSlimmedEntry,
} from '../src/utils/entry-slim.js';

function currentCodexBody() {
  return {
    model: 'gpt-5.6-sol',
    stream: true,
    input: [
      {
        type: 'additional_tools',
        role: 'developer',
        tools: [
          { name: 'shell_command', description: 'Run shell commands.' },
          { name: 'apply_patch', description: 'Edit files.' },
        ],
      },
      {
        type: 'message',
        role: 'developer',
        content: [{ type: 'input_text', text: 'You are Codex, an agent based on GPT-5.' }],
      },
      {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'inspect the repository' }],
      },
    ],
  };
}

test('reads tools and system prompt from current Codex input config items', () => {
  const body = currentCodexBody();
  assert.equal(getResponseTools(body).length, 2);
  assert.equal(getResponseTools(body)[0].name, 'shell_command');
  assert.deepEqual(getResponseInstructions(body), body.input[1].content);
  assert.equal(getInstructionsText(body), 'You are Codex, an agent based on GPT-5.');
  assert.equal(getResponseConversationItems(body).length, 1);
  assert.equal(getResponseConversationItems(body)[0].role, 'user');
});

test('current Codex input config layout remains a MainAgent request', () => {
  const body = currentCodexBody();
  assert.equal(isCodexResponsesRequest(body), true);
  assert.deepEqual(
    classifyAgentRequest('https://chatgpt.com/backend-api/codex/responses', body),
    { mainAgent: true, subAgent: false, subAgentName: null },
  );
  assert.equal(isMainAgentEntry({ body }), true);
});

test('embedded Codex config is recovered by restoring a slimmed MainAgent input', () => {
  const first = { mainAgent: true, body: currentCodexBody() };
  const second = {
    mainAgent: true,
    body: {
      ...currentCodexBody(),
      input: [...currentCodexBody().input, {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: 'done' }],
      }],
    },
  };
  const entries = [first, second];
  const slimmer = createEntrySlimmer(entry => entry.mainAgent === true);
  entries.forEach((entry, index) => slimmer.process(entry, entries, index));
  slimmer.finalize(entries);

  assert.deepEqual(entries[0].body.input, []);
  assert.equal(getResponseTools(entries[0].body).length, 0);
  assert.equal(getInstructionsText(entries[0].body), '');

  const restored = restoreSlimmedEntry(entries[0], entries);
  assert.equal(getResponseTools(restored.body).length, 2);
  assert.equal(getInstructionsText(restored.body), 'You are Codex, an agent based on GPT-5.');
});
