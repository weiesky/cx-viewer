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

test('frontend classification treats Codex Responses root as MainAgent', () => {
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
  assert.equal(isMainAgent(api), true);
  assert.deepEqual(classifyRequest(api), { type: 'MainAgent', subType: null });
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

test('frontend classification recovers current OpenAI Responses root logs mis-tagged as SubAgent', () => {
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

  assert.equal(isMainAgent(apiRoot), true);
  assert.deepEqual(classifyRequest(apiRoot), { type: 'MainAgent', subType: null });
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
  assert.deepEqual(classifyRequest(slimmedTransport), { type: 'Responses', subType: 'OpenAI Responses' });
  assert.equal(formatRequestTag('Responses', 'OpenAI Responses'), 'OpenAI Responses');
});

test('frontend classification treats current Codex snake_case tools as MainAgent without explicit flag', () => {
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

  assert.equal(isMainAgent(currentCodexRoot), true);
  assert.deepEqual(classifyRequest(currentCodexRoot), { type: 'MainAgent', subType: null });
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
