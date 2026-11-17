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

function threadedMainAgent(threadId, tools) {
  return {
    mainAgent: true,
    body: {
      client_metadata: { thread_id: threadId },
      instructions: 'You are Codex.',
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

test('loaded tool extraction falls back past an empty MainAgent frame in the same thread', () => {
  const tools = extractLoadedTools([
    threadedMainAgent('thread-a', [{ name: 'shell_command' }, { name: 'apply_patch' }]),
    threadedMainAgent('thread-a', undefined),
  ]);

  assert.equal(tools.length, 2);
  assert.match(tools[0], /<name>shell_command<\/name>/);
  assert.match(tools[1], /<name>apply_patch<\/name>/);
});

test('loaded tool extraction does not borrow tools from another thread', () => {
  const tools = extractLoadedTools([
    threadedMainAgent('thread-a', [{ name: 'stale_tool' }]),
    threadedMainAgent('thread-b', []),
  ]);

  assert.deepEqual(tools, []);
});

test('loaded tool extraction reads the rolling snapshot after additional_tools was slimmed', () => {
  const tools = extractLoadedTools([{
    mainAgent: true,
    _sessionId: 'session-a',
    _slimmed: true,
    _loadedTools: [{ name: 'exec', description: 'Run code.' }, { name: 'wait' }],
    body: { input: [], instructions: 'You are Codex.' },
  }]);

  assert.equal(tools.length, 2);
  assert.match(tools[0], /<name>exec<\/name>/);
  assert.match(tools[1], /<name>wait<\/name>/);
});

test('loaded tool extraction keeps the current internal session isolated', () => {
  const tools = extractLoadedTools([
    {
      mainAgent: true,
      _sessionId: 'session-a',
      _loadedTools: [{ name: 'stale_tool' }],
      body: { input: [], instructions: 'You are Codex.' },
    },
    {
      mainAgent: true,
      _sessionId: 'session-b',
      inProgress: true,
      _loadedTools: [{ name: 'collaboration' }],
      body: { input: [], instructions: 'You are Codex.' },
    },
  ]);

  assert.equal(tools.length, 1);
  assert.match(tools[0], /<name>collaboration<\/name>/);
  assert.doesNotMatch(tools[0], /stale_tool/);
});

test('an explicit empty tool declaration clears inherited tools', () => {
  const tools = extractLoadedTools([
    threadedMainAgent('thread-a', [{ name: 'exec' }]),
    threadedMainAgent('thread-a', []),
  ]);
  assert.deepEqual(tools, []);
});

test('OTel usage mirrors never replace the real MainAgent tool anchor', () => {
  const tools = extractLoadedTools([
    threadedMainAgent('thread-a', [{ name: 'exec' }]),
    {
      mainAgent: true,
      _otelSource: true,
      url: 'codex://api/request',
      body: { model: 'gpt-test' },
    },
  ]);
  assert.equal(tools.length, 1);
  assert.match(tools[0], /<name>exec<\/name>/);
});
