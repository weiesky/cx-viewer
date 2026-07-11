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
  _resetInternPoolsForTest,
  internEntryBigFields,
  slimBodyBigFields,
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

test('embedded Codex config survives historical input slimming', () => {
  _resetInternPoolsForTest();
  const interned = internEntryBigFields({ body: currentCodexBody() });
  const slimmedBody = slimBodyBigFields(interned.body);

  assert.deepEqual(slimmedBody.input, []);
  assert.equal(getResponseTools(slimmedBody).length, 2);
  assert.equal(getInstructionsText(slimmedBody), 'You are Codex, an agent based on GPT-5.');
  _resetInternPoolsForTest();
});
