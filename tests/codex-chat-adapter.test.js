import test from 'node:test';
import assert from 'node:assert/strict';

import {
  adaptChatCompletionsResponse,
  prepareChatCompletionsRequest,
} from '../lib/codex-chat-adapter.js';

const PROFILE = {
  id: 'deepseek',
  name: 'DeepSeek',
  baseURL: 'https://api.deepseek.com',
  apiKey: 'deepseek-secret',
  activeModel: 'deepseek-v4-flash',
  effort: 'max',
  wireApi: 'chat-completions',
};

function prepare(body) {
  return prepareChatCompletionsRequest('https://chatgpt.com/backend-api/codex/responses', {
    method: 'POST',
    headers: new Headers({
      authorization: 'Bearer oauth-secret',
      'chatgpt-account-id': 'acct-123',
      cookie: 'session=secret',
      'content-type': 'application/json',
    }),
    body: JSON.stringify(body),
  }, PROFILE);
}

test('Responses request becomes a DeepSeek Chat request with isolated credentials', () => {
  const result = prepare({
    model: 'official-model',
    instructions: 'Follow the project instructions.',
    stream: true,
    reasoning: { effort: 'low' },
    tools: [
      { type: 'function', name: 'lookup', description: 'Lookup', parameters: { type: 'object', properties: {} } },
      { type: 'custom', name: 'exec', description: 'Run a command' },
    ],
    input: [
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Start' }] },
      { type: 'reasoning', summary: [{ type: 'summary_text', text: 'Need tools' }] },
      { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: '' }] },
      { type: 'function_call', call_id: 'call-a', name: 'lookup', arguments: '{"q":"x"}' },
      { type: 'custom_tool_call', call_id: 'call-b', name: 'exec', input: 'pwd' },
      { type: 'function_call_output', call_id: 'call-a', output: 'found' },
      { type: 'custom_tool_call_output', call_id: 'call-b', output: '/tmp' },
    ],
  });

  assert.equal(result.url, 'https://api.deepseek.com/chat/completions');
  assert.equal(result.options.headers.get('authorization'), 'Bearer deepseek-secret');
  assert.equal(result.options.headers.get('chatgpt-account-id'), null);
  assert.equal(result.options.headers.get('cookie'), null);
  const chat = JSON.parse(result.options.body);
  assert.equal(chat.model, 'deepseek-v4-flash');
  assert.equal(chat.reasoning_effort, 'max');
  assert.deepEqual(chat.thinking, { type: 'enabled' });
  assert.equal(chat.messages[0].role, 'system');
  assert.equal(chat.messages[2].role, 'assistant');
  assert.equal(chat.messages[2].reasoning_content, 'Need tools');
  assert.equal(chat.messages[2].content, '');
  assert.equal(chat.messages[2].tool_calls.length, 2);
  assert.equal(chat.messages[3].tool_call_id, 'call-a');
  assert.equal(chat.messages[4].tool_call_id, 'call-b');
  assert.equal(chat.tools[1].function.name, 'exec');
});

test('unsupported Responses semantics fail before an upstream request exists', () => {
  assert.throws(() => prepare({
    model: 'x',
    input: [{ type: 'message', role: 'user', content: [{ type: 'input_image', image_url: 'https://example.test/a.png' }] }],
  }), /unsupported non-text/i);
  assert.throws(() => prepare({
    model: 'x',
    tools: [{ type: 'web_search' }],
    input: 'hello',
  }), /Unsupported Responses tool type/);
});

test('Codex agent_message history becomes an assistant Chat message', () => {
  const result = prepare({
    model: 'x',
    input: [
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Review this' }] },
      { type: 'agent_message', id: 'agent-1', text: 'First finding' },
      { type: 'agentMessage', id: 'agent-2', content: [{ type: 'output_text', text: ' and second finding' }] },
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Continue' }] },
    ],
  });

  assert.deepEqual(JSON.parse(result.options.body).messages, [
    { role: 'user', content: 'Review this' },
    { role: 'assistant', content: 'First finding and second finding' },
    { role: 'user', content: 'Continue' },
  ]);
});

test('opaque Codex compaction is skipped without leaking it or dropping later messages', () => {
  const result = prepare({
    model: 'x',
    instructions: 'Keep working on the task.',
    input: [
      {
        type: 'compaction',
        id: 'compact-1',
        encrypted_content: 'OPENAI_ONLY_CIPHERTEXT',
        internal_chat_message_metadata_passthrough: { turn_id: 'turn-secret' },
      },
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Continue' }] },
    ],
  });

  const serialized = result.options.body;
  const chat = JSON.parse(serialized);
  assert.deepEqual(chat.messages, [
    { role: 'system', content: 'Keep working on the task.' },
    { role: 'user', content: 'Continue' },
  ]);
  assert.doesNotMatch(serialized, /OPENAI_ONLY_CIPHERTEXT|turn-secret|compact-1/);
});

test('latest compaction replaces earlier messages and pending assistant tool state', () => {
  const result = prepare({
    model: 'x',
    instructions: 'Keep the project rules.',
    tools: [{ type: 'function', name: 'lookup' }],
    input: [
      { type: 'compaction', encrypted_content: 'older-history' },
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'old-user' }] },
      { type: 'reasoning', summary: [{ type: 'summary_text', text: 'old-reasoning' }] },
      { type: 'function_call', call_id: 'old-call', name: 'lookup', arguments: '{}' },
      { type: 'compaction', id: 'compact-latest', encrypted_content: 'old-history' },
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'new-user' }] },
    ],
  });

  const serialized = result.options.body;
  assert.deepEqual(JSON.parse(serialized).messages, [
    { role: 'system', content: 'Keep the project rules.' },
    { role: 'user', content: 'new-user' },
  ]);
  assert.doesNotMatch(serialized, /old-user|old-reasoning|old-call|old-history|compact-latest/);
});

test('compaction rejects orphaned tool outputs and an empty portable suffix', () => {
  assert.throws(() => prepare({
    model: 'x',
    tools: [{ type: 'function', name: 'lookup' }],
    input: [
      { type: 'function_call', call_id: 'old-call', name: 'lookup', arguments: '{}' },
      { type: 'compaction', encrypted_content: 'opaque' },
      { type: 'function_call_output', call_id: 'old-call', output: 'stale' },
    ],
  }), /no matching tool call after the latest compaction/);

  assert.throws(() => prepare({
    model: 'x',
    input: [{ type: 'compaction', encrypted_content: 'opaque' }],
  }), /no portable conversation messages/);
});

test('remote compaction trigger uses Chat history and returns a reusable compaction item', async () => {
  const prepared = prepare({
    model: 'x',
    stream: false,
    instructions: 'Summarize the conversation for continuation.',
    input: [
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Keep issue 42 open' }] },
      { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Acknowledged' }] },
      { type: 'compaction_trigger' },
    ],
  });
  const chat = JSON.parse(prepared.options.body);
  assert.equal(prepared.context.compactionRequest, true);
  assert.equal(chat.messages.at(-1).content, 'Acknowledged');
  assert.doesNotMatch(prepared.options.body, /compaction_trigger/);

  const response = await adaptChatCompletionsResponse(new Response(JSON.stringify({
    id: 'chat-compact',
    model: 'deepseek-v4-flash',
    choices: [{
      index: 0,
      finish_reason: 'stop',
      message: { content: 'Issue 42 remains open.' },
    }],
  }), { headers: { 'content-type': 'application/json' } }), prepared.context);
  const body = await response.json();
  assert.equal(body.output.length, 1);
  assert.equal(body.output[0].type, 'compaction');
  assert.doesNotMatch(body.output[0].encrypted_content, /Issue 42/);

  const continued = prepare({
    model: 'x',
    input: [
      body.output[0],
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Continue' }] },
    ],
  });
  assert.deepEqual(JSON.parse(continued.options.body).messages, [
    { role: 'user', content: 'Compacted conversation state:\nIssue 42 remains open.' },
    { role: 'user', content: 'Continue' },
  ]);
});

test('streaming remote compaction emits exactly one compaction output item', async () => {
  const prepared = prepare({
    model: 'x',
    stream: true,
    instructions: 'Compact the history.',
    input: [
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Remember alpha' }] },
      { type: 'compaction_trigger' },
    ],
  });
  const source = [
    'data: {"id":"chat-compact-stream","model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"content":"Alpha is retained."},"finish_reason":"stop"}]}',
    '',
    'data: [DONE]',
    '',
    '',
  ].join('\n');
  const response = await adaptChatCompletionsResponse(new Response(byteSplitStream(source), {
    headers: { 'content-type': 'text/event-stream' },
  }), prepared.context);
  const text = await response.text();
  const events = text.split(/\n\n/).filter(Boolean)
    .map(block => JSON.parse(block.split('\n').find(line => line.startsWith('data:')).slice(5)));
  const completed = events.find(event => event.type === 'response.completed');
  assert.ok(completed);
  assert.equal(completed.response.output.length, 1);
  assert.equal(completed.response.output[0].type, 'compaction');
  assert.equal(events.filter(event => event.type === 'response.output_item.done').length, 1);
  assert.ok(events.every(event => event.type !== 'response.output_text.delta'));
});

test('realistic compaction transcript with Codex v2 tool items converts standalone', () => {
  const result = prepare({
    model: 'x',
    instructions: 'Compact this conversation.',
    tools: [{ type: 'function', name: 'lookup' }],
    input: [
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Find images' }] },
      { type: 'reasoning', summary: [{ type: 'summary_text', text: 'Need search' }] },
      { type: 'web_search_call', call_id: 'web-1', status: 'completed', action: { type: 'web_search', queries: [{ q: 'cats' }] } },
      { type: 'function_call_output', call_id: 'web-1', output: 'search results' },
      { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Found results' }] },
      { type: 'image_generation_call', call_id: 'img-1', status: 'completed', action: { type: 'image_generation', prompt: 'a cat' }, result: { revised_prompt: 'a cat' } },
      { type: 'local_shell_call', call_id: 'sh-1', status: 'completed', action: { type: 'exec', command: 'ls -la' } },
      { type: 'function_call_output', call_id: 'sh-1', output: 'files' },
      { type: 'agent_message', id: 'a-1', text: 'Reviewing the findings' },
      { type: 'compaction', id: 'opaque-1', encrypted_content: 'OPENAI_ONLY_CIPHERTEXT' },
      { type: 'context_compaction', id: 'ctx-1', encrypted_content: 'OPENAI_ONLY_AGAIN' },
      { type: 'other', id: 'other-1' },
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Continue' }] },
      { type: 'compaction_trigger' },
    ],
  });
  const serialized = result.options.body;
  const chat = JSON.parse(serialized);
  assert.equal(result.context.compactionRequest, true);
  assert.deepEqual(chat.messages, [
    { role: 'system', content: 'Compact this conversation.' },
    { role: 'user', content: 'Continue' },
  ]);
  assert.doesNotMatch(serialized, /OPENAI_ONLY_CIPHERTEXT|OPENAI_ONLY_AGAIN|compaction_trigger|web-1|img-1|sh-1/);
});

test('Codex v2 tool call items project into assistant tool_calls without losing outputs', () => {
  const result = prepare({
    model: 'x',
    input: [
      { type: 'web_search_call', call_id: 'web-1', status: 'completed', action: { type: 'web_search', queries: [{ q: 'cats' }] } },
      { type: 'function_call_output', call_id: 'web-1', output: 'search results' },
      { type: 'local_shell_call', call_id: 'sh-1', status: 'completed', action: { type: 'exec', command: 'ls' } },
      { type: 'function_call_output', call_id: 'sh-1', output: 'files' },
      { type: 'image_generation_call', call_id: 'img-1', status: 'completed', action: { type: 'image_generation', prompt: 'a cat' } },
    ],
  });
  const chat = JSON.parse(result.options.body);
  const assistants = chat.messages.filter(m => m.role === 'assistant');
  const callNames = assistants.flatMap(m => (m.tool_calls || []).map(call => call.function.name));
  assert.deepEqual(callNames, ['web_search', 'local_shell', 'image_generation']);
  const webSearch = assistants[0].tool_calls[0];
  assert.equal(webSearch.function.arguments, JSON.stringify({ queries: [{ q: 'cats' }] }));
  const localShell = assistants[1].tool_calls[0];
  assert.equal(localShell.function.arguments, JSON.stringify({ type: 'exec', command: 'ls' }));
  const imageGen = assistants[2].tool_calls[0];
  assert.equal(imageGen.function.arguments, JSON.stringify({ prompt: 'a cat' }));
  const tools = chat.messages.filter(m => m.role === 'tool');
  assert.deepEqual(tools.map(m => m.content), ['search results', 'files']);
});

test('Responses Lite tool search and additional tools round-trip through Chat functions', async () => {
  const prepared = prepare({
    model: 'x',
    stream: false,
    tools: [{ type: 'tool_search', execution: 'client' }],
    parallel_tool_calls: false,
    tool_choice: 'required',
    input: [{
      type: 'additional_tools',
      role: 'developer',
      tools: [{
        type: 'function',
        namespace: 'multi_agent_v1',
        name: 'spawn_agent',
        description: 'Spawn an agent',
        parameters: { type: 'object', properties: { message: { type: 'string' } } },
      }],
    }, { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Delegate' }] }],
  });
  const chat = JSON.parse(prepared.options.body);
  assert.equal(chat.parallel_tool_calls, false);
  assert.equal(chat.tool_choice, 'required');
  assert.equal(chat.tools[0].function.name, 'tool_search');
  assert.match(chat.tools[1].function.name, /^multi_agent_v1__spawn_agent_[a-f0-9]{10}$/);

  const response = await adaptChatCompletionsResponse(new Response(JSON.stringify({
    id: 'chat-search',
    model: 'deepseek-v4-flash',
    choices: [{
      index: 0,
      finish_reason: 'tool_calls',
      message: {
        content: '',
        tool_calls: [{
          id: 'search-1',
          type: 'function',
          function: { name: 'tool_search', arguments: '{"query":"spawn agent","limit":1}' },
        }],
      },
    }],
  }), { headers: { 'content-type': 'application/json' } }), prepared.context);
  const body = await response.json();
  const call = body.output.find(item => item.type === 'tool_search_call');
  assert.equal(call.execution, 'client');
  assert.deepEqual(call.arguments, { query: 'spawn agent', limit: 1 });
});

test('tool_search namespace output flattens and restores the Codex namespace', async () => {
  const prepared = prepare({
    model: 'x',
    stream: false,
    tools: [{ type: 'tool_search', execution: 'client' }],
    input: [
      {
        type: 'tool_search_call',
        call_id: 'search-1',
        execution: 'client',
        arguments: { query: 'spawn agent' },
      },
      {
        type: 'tool_search_output',
        call_id: 'search-1',
        status: 'completed',
        execution: 'client',
        tools: [{
          type: 'namespace',
          name: 'multi_agent_v1',
          tools: [{
            type: 'function',
            name: 'spawn_agent',
            description: 'Spawn an agent',
            parameters: { type: 'object', properties: { message: { type: 'string' } } },
          }],
        }],
      },
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Continue' }] },
    ],
  });
  const chat = JSON.parse(prepared.options.body);
  const namespaced = chat.tools[1].function.name;
  assert.match(namespaced, /^multi_agent_v1__spawn_agent_[a-f0-9]{10}$/);

  const response = await adaptChatCompletionsResponse(new Response(JSON.stringify({
    id: 'chat-namespace',
    model: 'deepseek-v4-flash',
    choices: [{
      index: 0,
      finish_reason: 'tool_calls',
      message: {
        content: '',
        tool_calls: [{
          id: 'spawn-1',
          type: 'function',
          function: { name: namespaced, arguments: '{"message":"inspect"}' },
        }],
      },
    }],
  }), { headers: { 'content-type': 'application/json' } }), prepared.context);
  const call = (await response.json()).output.find(item => item.type === 'function_call');
  assert.equal(call.namespace, 'multi_agent_v1');
  assert.equal(call.name, 'spawn_agent');
});

test('ambiguous Chat tool names fail closed instead of overwriting metadata', () => {
  assert.throws(() => prepare({
    model: 'x',
    input: 'hello',
    tools: [
      { type: 'function', name: 'same' },
      { type: 'custom', name: 'same' },
    ],
  }), /Tool name collision/);
});

test('DeepSeek effort preserves low and maps flash xhigh to high', () => {
  const low = prepareChatCompletionsRequest('https://example.test/v1/responses', {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'x', reasoning: { effort: 'low' }, input: 'hello' }),
  }, { ...PROFILE, activeModel: 'deepseek-v4-flash', effort: '' });
  assert.equal(JSON.parse(low.options.body).reasoning_effort, 'low');

  const xhigh = prepareChatCompletionsRequest('https://example.test/v1/responses', {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'x', reasoning: { effort: 'xhigh' }, input: 'hello' }),
  }, { ...PROFILE, activeModel: 'deepseek-v4-flash', effort: '' });
  assert.equal(JSON.parse(xhigh.options.body).reasoning_effort, 'high');
});

test('Chat profile without explicit effort omits thinking parameters and preserves baseURL query', () => {
  const result = prepareChatCompletionsRequest('https://chatgpt.com/backend-api/codex/responses', {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'x', input: 'hello', stream: true }),
  }, { ...PROFILE, baseURL: 'https://gateway.example/v1?tenant=abc', effort: '' });
  assert.equal(result.url, 'https://gateway.example/v1/chat/completions?tenant=abc');
  const chat = JSON.parse(result.options.body);
  assert.equal(chat.thinking, undefined);
  assert.equal(chat.reasoning_effort, undefined);
  assert.equal(chat.model, 'deepseek-v4-flash');
});

test('non-stream Chat response becomes a Responses object', async () => {
  const prepared = prepare({ model: 'x', stream: false, input: 'hello', tools: [{ type: 'custom', name: 'exec' }] });
  const response = await adaptChatCompletionsResponse(new Response(JSON.stringify({
    id: 'chat-1',
    model: 'deepseek-v4-flash',
    choices: [{
      index: 0,
      finish_reason: 'tool_calls',
      message: {
        reasoning_content: 'Need command',
        content: '',
        tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'exec', arguments: '{"input":"pwd"}' } }],
      },
    }],
    usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
  }), { headers: { 'content-type': 'application/json' } }), prepared.context);
  const body = await response.json();
  assert.equal(body.status, 'completed');
  assert.equal(body.id, 'chat-1');
  assert.equal(body.output[0].type, 'reasoning');
  assert.equal(body.output[1].type, 'custom_tool_call');
  assert.equal(body.output[1].input, 'pwd');
  assert.equal(body.usage.input_tokens, 10);
});

test('non-empty undeclared Chat tools pass through for Codex deferred tool resolution', async () => {
  const jsonPrepared = prepare({ model: 'x', stream: false, input: 'hello' });
  const jsonResponse = await adaptChatCompletionsResponse(new Response(JSON.stringify({
    choices: [{
      index: 0,
      finish_reason: 'tool_calls',
      message: {
        content: '',
        tool_calls: [{ id: 'unknown-1', type: 'function', function: { name: 'undeclared', arguments: '{}' } }],
      },
    }],
  }), { headers: { 'content-type': 'application/json' } }), jsonPrepared.context);
  const jsonBody = await jsonResponse.json();
  assert.equal(jsonBody.output[0].type, 'function_call');
  assert.equal(jsonBody.output[0].name, 'undeclared');

  const streamPrepared = prepare({ model: 'x', stream: true, input: 'hello' });
  const source = [
    'data: {"choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"unknown-2","function":{"name":"undeclared","arguments":"{}"}}]},"finish_reason":"tool_calls"}]}',
    '',
    'data: [DONE]',
    '',
    '',
  ].join('\n');
  const response = await adaptChatCompletionsResponse(new Response(byteSplitStream(source), {
    headers: { 'content-type': 'text/event-stream' },
  }), streamPrepared.context);
  const text = await response.text();
  assert.match(text, /response\.completed/);
  assert.match(text, /"type":"function_call"/);
  assert.match(text, /"name":"undeclared"/);
  assert.doesNotMatch(text, /response\.failed/);
});

test('oversized non-stream Chat response is rejected before JSON parsing', async () => {
  const prepared = prepare({ model: 'x', stream: false, input: 'hello' });
  const oversized = new Uint8Array(8 * 1024 * 1024 + 1);
  const response = new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(oversized);
      controller.close();
    },
  }), { headers: { 'content-type': 'application/json' } });
  await assert.rejects(
    adaptChatCompletionsResponse(response, prepared.context),
    /exceeds adapter limit/,
  );
});

function byteSplitStream(text) {
  const bytes = new TextEncoder().encode(text);
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index >= bytes.length) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.slice(index, index + 1));
      index++;
    },
  });
}

test('Chat SSE split at every byte yields a complete Responses lifecycle', async () => {
  const prepared = prepare({ model: 'x', stream: true, input: 'hello', tools: [{ type: 'function', name: 'lookup' }] });
  const source = [
    'data: {"id":"chat-2","model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"reasoning_content":"思考"},"finish_reason":null}]}',
    '',
    'data: {"id":"chat-2","model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"content":"你好"},"finish_reason":null}]}',
    '',
    'data: {"id":"chat-2","model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call-2","function":{"name":"lookup","arguments":"{\\"q\\":"}}]},"finish_reason":null}]}',
    '',
    'data: {"id":"chat-2","model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"x\\"}"}}]},"finish_reason":"tool_calls"}]}',
    '',
    'data: {"choices":[],"usage":{"prompt_tokens":3,"completion_tokens":2,"total_tokens":5}}',
    '',
    'data: [DONE]',
    '',
    '',
  ].join('\r\n');
  const response = await adaptChatCompletionsResponse(new Response(byteSplitStream(source), {
    headers: { 'content-type': 'text/event-stream' },
  }), prepared.context);
  const text = await response.text();
  const events = text.split(/\n\n/).filter(Boolean).map(block => JSON.parse(block.split('\n').find(line => line.startsWith('data:')).slice(5)));
  assert.equal(events[0].type, 'response.created');
  assert.ok(events.some(event => event.type === 'response.output_text.delta' && event.delta === '你好'));
  const completed = events.find(event => event.type === 'response.completed');
  assert.ok(completed);
  assert.equal(completed.response.status, 'completed');
  assert.equal(completed.response.usage.total_tokens, 5);
  assert.equal(completed.response.output.find(item => item.type === 'function_call').arguments, '{"q":"x"}');
});

test('fragmented custom tool stream emits matching unwrapped delta and done input', async () => {
  const prepared = prepare({ model: 'x', stream: true, input: 'hello', tools: [{ type: 'custom', name: 'exec' }] });
  const source = [
    'data: {"id":"chat-custom","model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call-custom","function":{"name":"ex","arguments":"{\\"in"}}]},"finish_reason":null}]}',
    '',
    'data: {"id":"chat-custom","model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"name":"ec","arguments":"put\\":\\"pwd\\"}"}}]},"finish_reason":"tool_calls"}]}',
    '',
    'data: [DONE]',
    '',
    '',
  ].join('\n');
  const response = await adaptChatCompletionsResponse(new Response(byteSplitStream(source), {
    headers: { 'content-type': 'text/event-stream' },
  }), prepared.context);
  const text = await response.text();
  const events = text.split(/\n\n/).filter(Boolean).map(block => JSON.parse(block.split('\n').find(line => line.startsWith('data:')).slice(5)));
  const delta = events.find(event => event.type === 'response.custom_tool_call_input.delta');
  const done = events.find(event => event.type === 'response.custom_tool_call_input.done');
  const completed = events.find(event => event.type === 'response.completed');

  assert.equal(delta.delta, 'pwd');
  assert.equal(done.input, 'pwd');
  assert.equal(completed.response.output.find(item => item.type === 'custom_tool_call').input, 'pwd');
  assert.doesNotMatch(text, /\{\\"input\\"/);
});

test('truncated Chat SSE terminates with response.failed', async () => {
  const prepared = prepare({ model: 'x', stream: true, input: 'hello' });
  const response = await adaptChatCompletionsResponse(new Response(byteSplitStream(
    'data: {"choices":[{"index":0,"delta":{"content":"partial"},"finish_reason":null}]}\n\n',
  )), prepared.context);
  const text = await response.text();
  assert.match(text, /response\.failed/);
  assert.doesNotMatch(text, /response\.completed/);
});

test('agent_message history tolerates structured and non-portable content parts', () => {
  const result = prepare({
    model: 'x',
    input: [
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Continue' }] },
      {
        type: 'agent_message',
        id: 'agent-1',
        content: [
          { type: 'output_text', text: 'Findings: ' },
          {
            type: 'function_call_output',
            call_id: 'call-x',
            output: [{ type: 'output_text', text: 'file listing' }],
          },
          { type: 'refusal', refusal: ' (declined)' },
          { type: 'input_image', image_url: 'https://example.test/x.png' },
        ],
      },
    ],
  });
  const chat = JSON.parse(result.options.body);
  const assistant = chat.messages.find(m => m.role === 'assistant');
  assert.ok(assistant.content.includes('Findings:'));
  assert.ok(assistant.content.includes('file listing'));
  assert.ok(assistant.content.includes('(declined)'));
  assert.ok(assistant.content.includes('[non-text part omitted]'));
});

test('function_call_output with non-portable parts still converts', () => {
  const result = prepare({
    model: 'x',
    tools: [{ type: 'function', name: 'lookup' }],
    input: [
      { type: 'function_call', call_id: 'call-a', name: 'lookup', arguments: '{}' },
      {
        type: 'function_call_output',
        call_id: 'call-a',
        output: [
          { type: 'output_text', text: 'result ok' },
          { type: 'input_image', image_url: 'data:image/png;base64,abc' },
        ],
      },
    ],
  });
  const chat = JSON.parse(result.options.body);
  const tool = chat.messages.find(m => m.role === 'tool');
  assert.equal(tool.tool_call_id, 'call-a');
  assert.ok(tool.content.includes('result ok'));
  assert.ok(tool.content.includes('[non-text part omitted]'));
});

test('agent_message text-bearing parts without a portable type are preserved', () => {
  const result = prepare({
    model: 'x',
    input: [
      {
        type: 'agent_message',
        id: 'agent-1',
        content: [
          { text: 'type-less text ' },
          { type: 'unknown_part', text: 'unknown-type text ' },
          { content: [{ type: 'output_text', text: 'nested text' }] },
        ],
      },
    ],
  });
  const chat = JSON.parse(result.options.body);
  const assistant = chat.messages.find(m => m.role === 'assistant');
  assert.ok(assistant.content.includes('type-less text'));
  assert.ok(assistant.content.includes('unknown-type text'));
  assert.ok(assistant.content.includes('nested text'));
  assert.doesNotMatch(assistant.content, /non-text part omitted/);
});

test('strict message content still accepts text-bearing parts without a type', () => {
  const result = prepare({
    model: 'x',
    input: [
      { type: 'message', role: 'user', content: [{ text: 'plain user text' }] },
    ],
  });
  const chat = JSON.parse(result.options.body);
  assert.equal(chat.messages.find(m => m.role === 'user').content, 'plain user text');
});

test('agent_message encrypted_content parts carry the real task text', () => {
  const result = prepare({
    model: 'x',
    input: [
      {
        type: 'agent_message',
        id: 'agent-1',
        content: [
          { type: 'input_text', text: 'Message Type: NEW_TASK\nPayload:\n' },
          { type: 'encrypted_content', encrypted_content: '请审查 lib/codex-chat-adapter.js 的文本投影逻辑' },
        ],
      },
    ],
  });
  const chat = JSON.parse(result.options.body);
  const assistant = chat.messages.find(m => m.role === 'assistant');
  assert.ok(assistant.content.includes('Message Type: NEW_TASK'));
  assert.ok(assistant.content.includes('请审查 lib/codex-chat-adapter.js 的文本投影逻辑'));
  assert.doesNotMatch(assistant.content, /non-text part omitted/);
});

test('Chat SSE error chunk surfaces as response.failed instead of silent success', async () => {
  const response = new Response([
    'data: {"id":"chat-stream","model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"content":"partial"}}]}',
    'data: {"id":"chat-stream","model":"deepseek-v4-flash","error":{"message":"Insufficient balance","code":"insufficient_quota"}}',
    'data: [DONE]',
    '',
  ].join('\n\n'), { status: 200, headers: { 'content-type': 'text/event-stream' } });
  const adapted = await adaptChatCompletionsResponse(response, { model: 'x', stream: true });
  const text = await adapted.text();
  assert.match(text, /event: response\.failed/);
  assert.match(text, /Insufficient balance/);
  assert.doesNotMatch(text, /event: response\.completed/);
});

test('non-2xx Chat JSON error becomes a failed Responses object', async () => {
  const response = new Response(JSON.stringify({ error: { message: 'model not found', code: 'model_not_found' } }), {
    status: 400,
    headers: { 'content-type': 'application/json' },
  });
  const adapted = await adaptChatCompletionsResponse(response, { model: 'x', stream: false });
  const body = JSON.parse(await adapted.text());
  assert.equal(body.status, 'failed');
  assert.equal(body.error.code, 'adapter_response_error');
  assert.match(body.error.message, /model not found/);
});

test('non-2xx Chat stream error becomes a response.failed SSE event', async () => {
  const response = new Response('{"error":{"message":"rate limited"}}', {
    status: 429,
    headers: { 'content-type': 'text/event-stream' },
  });
  const adapted = await adaptChatCompletionsResponse(response, { model: 'x', stream: true });
  const text = await adapted.text();
  assert.match(text, /event: response\.failed/);
  assert.match(text, /rate limited/);
});
