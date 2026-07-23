import test from 'node:test';
import assert from 'node:assert/strict';
import * as zlib from 'node:zlib';

import {
  assembleOpenAiResponseMessage,
  classifyAgentRequest,
  getInstructionsText,
  isCodexResponsesRequest,
  isChatGptCodexResponsesUrl,
  isMainAgentRequest,
  isOpenAiApiPath,
  isResponsesEndpointUrl,
  parseRequestBodyForLog,
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
  assert.equal(isResponsesEndpointUrl('https://api.openai.com/v1/responses'), true);
  assert.equal(isChatGptCodexResponsesUrl('https://chatgpt.com/backend-api/codex/responses'), true);
  assert.equal(getInstructionsText(rootBody), rootBody.instructions);
  assert.equal(isCodexResponsesRequest(rootBody), true);
  assert.equal(isSubAgentRequest(rootBody), false);
  assert.equal(isMainAgentRequest(rootBody), true);
  assert.deepEqual(
    classifyAgentRequest('https://chatgpt.com/backend-api/codex/responses', rootBody),
    { mainAgent: true, subAgent: false, subAgentName: null },
  );

  const currentRootBody = {
    ...rootBody,
    instructions: 'You are Codex. You may delegate work to subagents.',
    client_metadata: {
      session_id: 'root-thread',
      thread_id: 'root-thread',
      'x-codex-turn-metadata': JSON.stringify({
        session_id: 'root-thread',
        thread_id: 'root-thread',
        request_kind: 'turn',
        thread_source: 'user',
      }),
    },
  };
  assert.equal(isSubAgentRequest(currentRootBody), false);
  assert.deepEqual(
    classifyAgentRequest('https://chatgpt.com/backend-api/codex/responses', currentRootBody),
    { mainAgent: true, subAgent: false, subAgentName: null },
  );
  assert.deepEqual(
    classifyAgentRequest('https://api.openai.com/v1/responses', rootBody),
    { mainAgent: false, subAgent: false, subAgentName: null },
  );

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
  assert.deepEqual(
    classifyAgentRequest('https://api.openai.com/v1/responses', subBody),
    { mainAgent: false, subAgent: false, subAgentName: null },
  );
  assert.deepEqual(
    classifyAgentRequest('https://chatgpt.com/backend-api/codex/responses', subBody),
    { mainAgent: false, subAgent: true, subAgentName: 'researcher' },
  );

  const currentSubBody = {
    ...rootBody,
    client_metadata: {
      'x-codex-turn-metadata': JSON.stringify({
        session_id: 'root-thread',
        thread_id: 'child-thread',
        parent_thread_id: 'root-thread',
        request_kind: 'turn',
        thread_source: 'subagent',
      }),
    },
  };
  assert.equal(isSubAgentRequest(currentSubBody), true);
});

test('interceptor-core limits Master classification to the direct Responses create endpoint', () => {
  const body = {
    model: 'gpt-test', stream: true,
    instructions: 'You are Codex, a coding agent.',
    tools: [{ name: 'apply_patch' }],
    input: [{ role: 'user', content: 'inspect' }],
  };
  for (const url of [
    'https://api.openai.com/v1/responses',
    'https://api.openai.com/v1/responses/',
    'https://api.openai.com/v1/responses?trace=1',
  ]) {
    assert.deepEqual(classifyAgentRequest(url, body), {
      mainAgent: false, subAgent: false, subAgentName: null,
    });
  }
  assert.equal(classifyAgentRequest('https://api.openai.com/v1/responses/resp_123', body).mainAgent, true);
  assert.equal(classifyAgentRequest('https://api.openai.com.evil/v1/responses', body).mainAgent, true);
  assert.equal(classifyAgentRequest('https://proxy.example/v1/responses', body).mainAgent, true);
  assert.equal(classifyAgentRequest('http://api.openai.com/v1/responses', body).mainAgent, true);
});

test('parseRequestBodyForLog decodes compressed JSON request bodies', () => {
  const raw = JSON.stringify({
    model: 'gpt-test',
    input: [{ role: 'user', content: [{ type: 'input_text', text: 'hi' }] }],
  });
  const body = parseRequestBodyForLog(zlib.gzipSync(Buffer.from(raw)), {
    'content-encoding': 'gzip',
  });

  assert.equal(body.model, 'gpt-test');
  assert.equal(body.input[0].content[0].text, 'hi');
});

test('parseRequestBodyForLog decodes zstd JSON request bodies when runtime supports zstd', {
  skip: typeof zlib.zstdCompressSync !== 'function',
}, () => {
  const raw = JSON.stringify({
    model: 'gpt-test',
    stream: true,
    input: [{ role: 'user', content: [{ type: 'input_text', text: 'hello zstd' }] }],
  });
  const body = parseRequestBodyForLog(zlib.zstdCompressSync(Buffer.from(raw)), {
    'content-encoding': 'zstd',
  });

  assert.equal(body.model, 'gpt-test');
  assert.equal(body.stream, true);
  assert.equal(body.input[0].content[0].text, 'hello zstd');
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
          input_tokens_details: { cached_tokens: 80, cache_write_tokens: 0 },
          output_tokens: 20,
          output_tokens_details: { reasoning_tokens: 8 },
          total_tokens: 120,
        },
      },
    },
  ]);

  assert.deepEqual(message.usage, {
    input_tokens: 100,
    input_tokens_details: { cached_tokens: 80, cache_write_tokens: 0 },
    output_tokens: 20,
    reasoning_output_tokens: 8,
    total_tokens: 120,
  });
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
    { type: 'text', text: 'final text', _codexItemId: 'msg_final' },
    {
      type: 'thinking',
      thinking: 'final reasoning',
      summary: [{ type: 'summary_text', text: 'final reasoning' }],
    },
  ]);
});

test('assembleOpenAiResponseMessage emits each Codex item once across delta and done events', () => {
  const message = assembleOpenAiResponseMessage([
    {
      type: 'response.output_item.added',
      output_index: 0,
      item: { id: 'msg_1', type: 'message', role: 'assistant', phase: 'commentary', content: [] },
    },
    { type: 'response.output_text.delta', item_id: 'msg_1', output_index: 0, delta: 'checking' },
    { type: 'response.output_text.done', item_id: 'msg_1', output_index: 0, text: 'checking' },
    {
      type: 'response.output_item.done',
      output_index: 0,
      item: {
        id: 'msg_1',
        type: 'message',
        role: 'assistant',
        phase: 'commentary',
        content: [{ type: 'output_text', text: 'checking' }],
      },
    },
    {
      type: 'response.output_item.added',
      output_index: 1,
      item: { id: 'ctc_1', call_id: 'call_1', type: 'custom_tool_call', name: 'exec', input: '' },
    },
    { type: 'response.custom_tool_call_input.delta', item_id: 'ctc_1', call_id: 'call_1', output_index: 1, delta: 'text(1)' },
    { type: 'response.custom_tool_call_input.done', item_id: 'ctc_1', call_id: 'call_1', output_index: 1, input: 'text(1)' },
    {
      type: 'response.output_item.done',
      output_index: 1,
      item: { id: 'ctc_1', call_id: 'call_1', type: 'custom_tool_call', name: 'exec', input: 'text(1)' },
    },
    {
      type: 'response.completed',
      response: { id: 'resp_1', model: 'gpt-test', status: 'completed', output: [] },
    },
  ]);

  assert.deepEqual(message.content, [
    { type: 'text', text: 'checking', phase: 'commentary', _codexItemId: 'msg_1' },
    { type: 'tool_use', id: 'call_1', name: 'exec', input: 'text(1)' },
  ]);
});

test('assembleOpenAiResponseMessage deduplicates repeated final output items by Codex id', () => {
  const item = {
    id: 'fc_same',
    call_id: 'call_same',
    type: 'function_call',
    name: 'shell_command',
    arguments: '{"command":"pwd"}',
  };
  const message = assembleOpenAiResponseMessage([{
    type: 'response.completed',
    response: { id: 'resp_same', status: 'completed', output: [item, { ...item }] },
  }]);

  assert.equal(message.content.length, 1);
  assert.equal(message.content[0].id, 'call_same');
});
