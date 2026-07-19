import test from 'node:test';
import assert from 'node:assert/strict';

import { isMainAgent } from '../src/utils/contentFilter.js';
import { classifyRequest, formatRequestTag } from '../src/utils/requestType.js';

test('frontend classification respects Codex root and subagent flags', () => {
  const root = {
    method: 'POST',
    mainAgent: true,
    subAgent: false,
    body: {
      instructions: 'You are Codex, a coding agent.',
      tools: [],
      input: [{ role: 'user', content: 'inspect the project' }],
    },
  };

  const sub = {
    method: 'POST',
    mainAgent: false,
    subAgent: true,
    subAgentName: 'researcher',
    body: {
      instructions: 'You are Codex subagent (researcher), a general-purpose agent.',
      tools: [],
      input: [{ role: 'user', content: 'check references' }],
    },
  };

  assert.equal(isMainAgent(root), true);
  assert.deepEqual(classifyRequest(root), { type: 'MainAgent', subType: null });
  assert.equal(isMainAgent(sub), false);
  assert.deepEqual(classifyRequest(sub), { type: 'SubAgent', subType: 'researcher' });
  assert.equal(formatRequestTag('SubAgent', 'researcher'), 'SubAgent:researcher');
});

test('explicit MainAgent identity wins over subagent words in root instructions', () => {
  const root = {
    method: 'POST',
    url: 'https://chatgpt.com/backend-api/codex/responses',
    mainAgent: true,
    subAgent: false,
    body: {
      instructions: 'You are Codex. Delegate suitable tasks to a general-purpose subagent.',
      client_metadata: { available_roles: 'subagent,guardian' },
      tools: [],
      input: [{ role: 'user', content: 'continue' }],
    },
  };
  assert.equal(isMainAgent(root), true);
  assert.deepEqual(classifyRequest(root), { type: 'MainAgent', subType: null });
});

test('explicit SubAgent identity still wins when legacy flags conflict', () => {
  const sub = {
    method: 'POST',
    mainAgent: true,
    subAgent: true,
    body: {
      instructions: 'You are a general-purpose agent for delegated work.',
      input: [{ role: 'user', content: 'inspect one file' }],
    },
  };
  assert.equal(isMainAgent(sub), false);
});

test('frontend classification tags Codex tool events as Tool', () => {
  const rootTool = {
    method: 'TOOL',
    url: 'codex://tool/shell_command',
    mainAgent: false,
    subAgent: false,
    body: {
      tool_name: 'shell_command',
      tool_input: { command: 'pwd' },
    },
  };

  assert.equal(isMainAgent(rootTool), false);
  assert.deepEqual(classifyRequest(rootTool), { type: 'Tool', subType: 'shell_command' });
  assert.equal(formatRequestTag('Tool', 'shell_command'), 'Tool:shell_command');
});

test('frontend classification keeps Codex non-tool events out of SubAgent', () => {
  const warningEvent = {
    method: 'EVENT',
    url: 'codex://event/warning',
    mainAgent: false,
    subAgent: false,
    body: {
      event_name: 'warning',
      event_input: { message: 'deprecated' },
    },
  };

  assert.equal(isMainAgent(warningEvent), false);
  assert.deepEqual(classifyRequest(warningEvent), { type: 'Synthetic', subType: 'EVENT' });
});

test('frontend classification tags model catalog requests as metadata', () => {
  const chatgptModels = {
    method: 'GET',
    url: 'https://chatgpt.com/backend-api/codex/models?client_version=0.142.5',
    body: null,
    mainAgent: false,
    subAgent: false,
  };
  const localProxyModels = {
    method: 'GET',
    url: 'http://127.0.0.1:7008/v1/models?client_version=0.142.5',
    proxyUrl: 'https://chatgpt.com/backend-api/codex/models?client_version=0.142.5',
    body: null,
    mainAgent: false,
    subAgent: false,
  };

  assert.deepEqual(classifyRequest(chatgptModels), { type: 'Metadata', subType: 'Models' });
  assert.deepEqual(classifyRequest(localProxyModels), { type: 'Metadata', subType: 'Models' });
  assert.equal(formatRequestTag('Metadata', 'Models'), 'Metadata:Models');
});

test('frontend classification keeps unknown non-agent requests out of SubAgent', () => {
  const unknownGet = {
    method: 'GET',
    url: 'https://example.com/status',
    body: null,
    mainAgent: false,
    subAgent: false,
  };

  assert.deepEqual(classifyRequest(unknownGet), { type: 'Metadata', subType: null });
});

test('frontend classification rejects subagent-shaped main heuristics', () => {
  const subLike = {
    method: 'POST',
    body: {
      instructions: 'You are Codex subagent (worker), a general-purpose agent.',
      tools: [{ name: 'shell_command' }, { name: 'apply_patch' }, { name: 'tool_search' }, { name: 'web_search' }, { name: 'view_image' }, { name: 'update_plan' }],
      input: [{ role: 'user', content: 'delegated work' }],
    },
  };

  assert.equal(isMainAgent(subLike), false);
  assert.deepEqual(classifyRequest(subLike), { type: 'SubAgent', subType: 'General' });
});

test('frontend classification keeps ChatGPT root as MainAgent and defines direct OpenAI Responses as Master', () => {
  const body = {
    instructions: 'You are Codex, a coding agent.',
    tools: [{ name: 'shell_command' }, { name: 'apply_patch' }, { name: 'tool_search' }, { name: 'web_search' }, { name: 'view_image' }, { name: 'update_plan' }],
    input: [{ role: 'user', content: 'inspect the project' }],
  };
  const chatgpt = {
    method: 'POST',
    url: 'https://chatgpt.com/backend-api/codex/responses',
    mainAgent: false,
    subAgent: true,
    subAgentName: 'General',
    body,
  };
  const api = {
    method: 'POST',
    url: 'https://api.openai.com/v1/responses',
    mainAgent: true,
    subAgent: false,
    body,
  };

  assert.equal(isMainAgent(chatgpt), true);
  assert.deepEqual(classifyRequest(chatgpt), { type: 'MainAgent', subType: null });
  assert.equal(isMainAgent(api), false);
  assert.deepEqual(classifyRequest(api), { type: 'Master', subType: null });
});

test('frontend classification keeps a native ChatGPT Responses subagent out of MainAgent', () => {
  const subagent = {
    method: 'POST',
    url: 'https://chatgpt.com/backend-api/codex/responses',
    mainAgent: false,
    subAgent: true,
    subAgentName: 'researcher',
    body: {
      instructions: 'You are a general-purpose agent for a delegated Codex task.',
      client_metadata: {
        thread_id: 'sub-thread',
        parent_thread_id: 'root-thread',
        thread_spawn: 'researcher',
      },
      tools: [{ name: 'shell_command' }, { name: 'apply_patch' }],
      input: [{ role: 'user', content: 'delegated work' }],
    },
  };

  assert.equal(isMainAgent(subagent), false);
  assert.deepEqual(classifyRequest(subagent), { type: 'SubAgent', subType: 'researcher' });
});

test('frontend classification defines old OpenAI Responses transport labels as Master', () => {
  const apiRoot = {
    method: 'POST',
    url: 'https://api.openai.com/v1/responses',
    mainAgent: false,
    subAgent: true,
    subAgentName: 'OpenAI Responses',
    body: {
      instructions: 'You are Codex, a coding agent.',
      tools: [{ name: 'shell_command' }, { name: 'apply_patch' }, { name: 'tool_search' }, { name: 'web_search' }, { name: 'view_image' }, { name: 'update_plan' }],
      input: [{ role: 'user', content: 'continue the conversation' }],
    },
  };

  assert.equal(isMainAgent(apiRoot), false);
  assert.deepEqual(classifyRequest(apiRoot), { type: 'Master', subType: null });
});

test('frontend classification keeps slimmed OpenAI Responses transport out of SubAgent', () => {
  const slimmedTransport = {
    method: 'POST',
    url: 'https://api.openai.com/v1/responses',
    mainAgent: false,
    subAgent: true,
    subAgentName: 'OpenAI Responses',
    _slimmed: true,
    body: { input: [] },
  };

  assert.equal(isMainAgent(slimmedTransport), false);
  assert.deepEqual(classifyRequest(slimmedTransport), { type: 'Master', subType: null });
  assert.equal(formatRequestTag('Master', null), 'Master');
  assert.equal(formatRequestTag('Responses', 'OpenAI Responses'), 'OpenAI Responses');
});

test('frontend classification does not promote direct OpenAI Responses via Codex body heuristics', () => {
  const currentCodexRoot = {
    method: 'POST',
    url: 'https://api.openai.com/v1/responses',
    mainAgent: false,
    subAgent: false,
    body: {
      instructions: [
        { type: 'text', text: 'You are Codex, a coding agent based on GPT-5.' },
      ],
      tools: [
        { name: 'shell_command' },
        { name: 'apply_patch' },
        { name: 'update_plan' },
        { name: 'tool_search' },
        { type: 'web_search' },
        { type: 'image_generation' },
      ],
      input: [{ role: 'user', content: 'fix the viewer' }],
    },
  };

  assert.equal(isMainAgent(currentCodexRoot), false);
  assert.deepEqual(classifyRequest(currentCodexRoot), { type: 'Master', subType: null });
});

test('frontend Master classification overrides legacy identities at exact URL boundaries', () => {
  const body = {
    instructions: 'You are Codex, a coding agent.',
    tools: [{ name: 'shell_command' }, { name: 'apply_patch' }, { name: 'tool_search' }],
    input: [{ role: 'user', content: 'inspect' }],
  };
  const teammate = { url: 'https://api.openai.com/v1/responses', teammate: 'reviewer', mainAgent: true, body };
  const delegated = {
    url: 'https://api.openai.com/v1/responses', mainAgent: true,
    subAgent: true, subAgentName: 'researcher',
    body: { ...body, instructions: 'You are a general-purpose agent for a delegated Codex task.' },
  };
  assert.equal(isMainAgent(teammate), false);
  assert.deepEqual(classifyRequest(teammate), { type: 'Master', subType: null });
  assert.equal(isMainAgent(delegated), false);
  assert.deepEqual(classifyRequest(delegated), { type: 'Master', subType: null });

  for (const url of ['https://api.openai.com/v1/responses/', 'https://api.openai.com/v1/responses?trace=1']) {
    const req = { url, mainAgent: true, subAgent: false, body };
    assert.equal(isMainAgent(req), false);
    assert.deepEqual(classifyRequest(req), { type: 'Master', subType: null });
  }
  for (const url of [
    'https://api.openai.com/v1/responses/resp_123',
    'https://api.openai.com.evil/v1/responses',
    'https://proxy.example/v1/responses',
    'http://api.openai.com/v1/responses',
  ]) {
    const req = { url, mainAgent: true, subAgent: false, body };
    assert.equal(isMainAgent(req), true);
    assert.deepEqual(classifyRequest(req), { type: 'MainAgent', subType: null });
  }
});

test('Master request type follows the original URL rather than the proxy destination', () => {
  const body = {
    instructions: 'You are Codex, a coding agent.',
    tools: [{ name: 'shell_command' }, { name: 'apply_patch' }, { name: 'tool_search' }],
    input: [{ role: 'user', content: 'inspect' }],
  };
  const proxiedToOpenAi = {
    url: 'https://chatgpt.com/backend-api/codex/responses',
    proxyUrl: 'https://api.openai.com/v1/responses',
    mainAgent: true,
    body,
  };
  assert.equal(isMainAgent(proxiedToOpenAi), true);
  assert.deepEqual(classifyRequest(proxiedToOpenAi), { type: 'MainAgent', subType: null });

  const proxiedAwayFromOpenAi = {
    url: 'https://api.openai.com/v1/responses',
    proxyUrl: 'https://proxy.example/v1/responses',
    mainAgent: true,
    body,
  };
  assert.equal(isMainAgent(proxiedAwayFromOpenAi), false);
  assert.deepEqual(classifyRequest(proxiedAwayFromOpenAi), { type: 'Master', subType: null });
});

test('frontend classification tags Codex internal prompts as synthetic before MainAgent', () => {
  const summaryPrompt = {
    method: 'POST',
    mainAgent: true,
    subAgent: false,
    body: {
      instructions: 'You are Codex, a coding agent.',
      tools: [],
      input: [{ role: 'user', content: 'Summarize this coding session in a few sentences.' }],
    },
  };

  assert.deepEqual(classifyRequest(summaryPrompt), { type: 'Synthetic', subType: 'Summary' });
});
