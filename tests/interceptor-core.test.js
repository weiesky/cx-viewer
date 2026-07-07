import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assembleOpenAiResponseMessage,
  getSystemText,
  isCodexResponsesRequest,
  isMainAgentRequest,
  isOpenAiApiPath,
  isSubAgentRequest,
} from '../lib/interceptor-core.js';

test('interceptor-core recognizes Codex Responses API main and sub-agent requests', () => {
  const rootBody = {
    model: 'gpt-test',
    stream: true,
    instructions: 'You are Codex, a coding agent.',
    tools: [{ name: 'apply_patch' }, { type: 'web_search' }],
    input: [
      {
        role: 'user',
        content: [{ type: 'input_text', text: 'inspect this workspace' }],
      },
    ],
  };

  assert.equal(isOpenAiApiPath('https://api.openai.com/v1/responses'), true);
  assert.equal(isOpenAiApiPath('https://api.openai.com/v1/responses/resp_123'), true);
  assert.equal(getSystemText(rootBody), rootBody.instructions);
  assert.equal(isCodexResponsesRequest(rootBody), true);
  assert.equal(isSubAgentRequest(rootBody), false);
  assert.equal(isMainAgentRequest(rootBody), true);

  const subBody = {
    model: 'gpt-test',
    stream: true,
    instructions: 'You are a general-purpose agent for a delegated Codex task.',
    metadata: {
      parent_thread_id: 'root-thread',
      thread_spawn: 'researcher',
    },
    tools: [{ name: 'apply_patch' }],
    input: [
      {
        role: 'user',
        content: [{ type: 'input_text', text: 'run the delegated search' }],
      },
    ],
  };

  assert.equal(isCodexResponsesRequest(subBody), true);
  assert.equal(isSubAgentRequest(subBody), true);
  assert.equal(isMainAgentRequest(subBody), false);
});

test('assembleOpenAiResponseMessage converts Responses SSE events to viewer message content', () => {
  const message = assembleOpenAiResponseMessage([
    {
      type: 'response.created',
      response: {
        id: 'resp_1',
        model: 'gpt-test',
      },
    },
    {
      type: 'response.reasoning_summary_text.delta',
      delta: 'checking',
    },
    {
      type: 'response.reasoning_summary_text.done',
    },
    {
      type: 'response.output_item.added',
      item: {
        id: 'fc_1',
        call_id: 'call_1',
        type: 'function_call',
        name: 'apply_patch',
        arguments: '',
      },
    },
    {
      type: 'response.function_call_arguments.delta',
      item_id: 'fc_1',
      call_id: 'call_1',
      delta: '{"patch":"*** Begin Patch"}',
    },
    {
      type: 'response.function_call_arguments.done',
      item_id: 'fc_1',
      call_id: 'call_1',
    },
    {
      type: 'response.output_text.delta',
      delta: 'done',
    },
    {
      type: 'response.output_text.done',
    },
    {
      type: 'response.completed',
      response: {
        id: 'resp_1',
        model: 'gpt-test',
        status: 'completed',
        usage: {
          input_tokens: 9,
          output_tokens: 4,
        },
      },
    },
  ]);

  assert.equal(message.id, 'resp_1');
  assert.equal(message.model, 'gpt-test');
  assert.equal(message.stop_reason, 'completed');
  assert.equal(message.usage.input_tokens, 9);
  assert.equal(message.content[0].type, 'thinking');
  assert.equal(message.content[0].thinking, 'checking');
  assert.equal(message.content[1].type, 'tool_use');
  assert.equal(message.content[1].id, 'call_1');
  assert.equal(message.content[1].name, 'apply_patch');
  assert.equal(message.content[1].input.patch, '*** Begin Patch');
  assert.equal(message.content[2].type, 'text');
  assert.equal(message.content[2].text, 'done');
});

test('assembleOpenAiResponseMessage normalizes Responses API token details', () => {
  const message = assembleOpenAiResponseMessage([
    {
      type: 'response.completed',
      response: {
        id: 'resp_usage',
        model: 'gpt-usage',
        status: 'completed',
        output: [
          {
            id: 'msg_usage',
            type: 'message',
            content: [{ type: 'output_text', text: 'ok' }],
          },
        ],
        usage: {
          input_tokens: 100,
          input_tokens_details: { cached_tokens: 35 },
          output_tokens: 20,
          output_tokens_details: { reasoning_tokens: 8 },
          total_tokens: 120,
        },
      },
    },
  ]);

  assert.equal(message.usage.input_tokens, 65);
  assert.equal(message.usage.cache_read_input_tokens, 35);
  assert.equal(message.usage.output_tokens, 20);
  assert.equal(message.usage.reasoning_output_tokens, 8);
  assert.equal(message.usage.total_tokens, 120);
});

test('assembleOpenAiResponseMessage prefers final response.output when present', () => {
  const message = assembleOpenAiResponseMessage([
    {
      type: 'response.output_text.delta',
      delta: 'stale streamed text',
    },
    {
      type: 'response.completed',
      response: {
        id: 'resp_final',
        model: 'gpt-final',
        status: 'completed',
        output: [
          {
            id: 'msg_final',
            type: 'message',
            content: [{ type: 'output_text', text: 'final text' }],
          },
          {
            id: 'reason_final',
            type: 'reasoning',
            summary: [{ type: 'summary_text', text: 'final reasoning' }],
          },
        ],
      },
    },
  ]);

  assert.equal(message.id, 'resp_final');
  assert.deepEqual(message.content, [
    { type: 'text', text: 'final text' },
    {
      type: 'thinking',
      thinking: 'final reasoning',
      summary: [{ type: 'summary_text', text: 'final reasoning' }],
    },
  ]);
});
