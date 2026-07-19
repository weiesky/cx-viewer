import test from 'node:test';
import assert from 'node:assert/strict';

import { isMainAgentEntry } from '../lib/main-agent-entry.js';

const body = {
  instructions: 'You are Codex, a coding agent.',
  tools: [{ name: 'shell_command' }, { name: 'apply_patch' }, { name: 'tool_search' }],
  input: [{ role: 'user', content: 'inspect' }],
};

test('direct OpenAI Responses Master entries do not receive watcher MainAgent privileges', () => {
  assert.equal(isMainAgentEntry({
    url: 'https://api.openai.com/v1/responses',
    mainAgent: true,
    body,
  }), false);
  assert.equal(isMainAgentEntry({
    url: 'https://chatgpt.com/backend-api/codex/responses',
    mainAgent: true,
    body,
  }), true);
});
