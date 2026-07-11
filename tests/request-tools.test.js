import test from 'node:test';
import assert from 'node:assert/strict';

import { extractLoadedTools } from '../src/utils/requestTools.js';

function mainAgent(tools) {
  return {
    body: {
      instructions: [
        { type: 'text', text: 'You are Codex, a coding agent based on GPT-5.' },
      ],
      tools,
      input: [],
    },
  };
}

test('loaded tool extraction reads request body tools as XML', () => {
  const tools = extractLoadedTools([
    mainAgent([
      { name: 'shell_command', description: 'Run shell commands.' },
      { name: 'apply_patch', description: 'Edit files.' },
    ]),
  ]);

  assert.equal(tools.length, 2);
  assert.match(tools[0], /<name>shell_command<\/name>/);
  assert.match(tools[1], /<name>apply_patch<\/name>/);
});

test('loaded tool extraction uses the latest MainAgent in a mixed request list', () => {
  const tools = extractLoadedTools([
    mainAgent([{ name: 'shell_command' }]),
    {
      type: 'subAgent',
      body: {
        instructions: [{ type: 'text', text: 'You are a file search specialist.' }],
        tools: [{ name: 'stale_subagent_tool' }],
        input: [],
      },
    },
    mainAgent([{ name: 'tool_search' }]),
  ]);

  assert.equal(tools.length, 1);
  assert.match(tools[0], /<name>tool_search<\/name>/);
  assert.doesNotMatch(tools[0], /stale_subagent_tool/);
});

test('loaded tool extraction reads current Codex additional_tools input item', () => {
  const tools = extractLoadedTools([{
    mainAgent: true,
    body: {
      input: [
        {
          type: 'additional_tools', role: 'developer',
          tools: [{ name: 'shell_command' }, { name: 'apply_patch' }],
        },
        {
          type: 'message', role: 'developer',
          content: [{ type: 'input_text', text: 'You are Codex.' }],
        },
      ],
    },
  }]);

  assert.equal(tools.length, 2);
  assert.match(tools[0], /<name>shell_command<\/name>/);
});
