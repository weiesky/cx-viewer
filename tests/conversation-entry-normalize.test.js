import test from 'node:test';
import assert from 'node:assert/strict';

import { isMainAgent } from '../src/utils/contentFilter.js';
import {
  codexItemsToViewerMessages,
  createConversationEntryNormalizer,
  normalizeConversationEntry,
  shouldExcludeFromConversation,
  stampConversationMessageCount,
} from '../src/utils/conversationEntryNormalize.js';
import { mergeMainAgentSessions } from '../src/utils/sessionMerge.js';
import { messageFingerprint } from '../src/utils/sessionMerge.js';
import { applyBatchEntryTimestamps } from '../src/utils/sessionManager.js';

test('normalizes older app-server messages shape for conversation rendering', () => {
  const entry = {
    timestamp: '2026-07-08T12:00:00.000Z',
    url: 'codex://api/gpt-5.5',
    method: 'POST',
    mainAgent: true,
    subAgent: false,
    body: {
      model: 'gpt-5.5',
      system: 'You are Codex',
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: [{ type: 'text', text: 'hi' }] },
      ],
      tools: [{ name: 'shell_command' }, { name: 'apply_patch' }],
    },
    response: {
      status: 200,
      body: { content: [{ type: 'text', text: 'hi' }] },
    },
  };

  normalizeConversationEntry(entry);

  assert.equal(entry.body.instructions, 'You are Codex');
  assert.equal(entry.body.input, entry.body.messages);
  assert.equal(isMainAgent(entry), true);

  const sessions = mergeMainAgentSessions([], entry);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].messages.length, 2);
});

test('excludes api.openai.com Responses entries from conversation projection only', () => {
  assert.equal(shouldExcludeFromConversation({
    url: 'https://api.openai.com/v1/responses',
  }), true);
  assert.equal(shouldExcludeFromConversation({
    url: 'http://127.0.0.1:7008/v1/responses',
    proxyUrl: 'https://api.openai.com/v1/responses?trace=1',
  }), true);
  assert.equal(shouldExcludeFromConversation({
    url: 'https://chatgpt.com/backend-api/codex/responses',
  }), false);
});

test('projects cumulative Codex Responses items and the current response into one transcript', () => {
  const rawInput = [
    {
      type: 'message',
      role: 'developer',
      content: [{ type: 'input_text', text: 'internal instructions' }],
    },
    {
      type: 'message',
      id: 'user_1',
      role: 'user',
      content: [{ type: 'input_text', text: 'inspect the repo' }],
    },
    {
      type: 'message',
      id: 'msg_1',
      role: 'assistant',
      phase: 'commentary',
      content: [{ type: 'output_text', text: 'I will inspect it.' }],
    },
    {
      type: 'custom_tool_call',
      id: 'ctc_1',
      call_id: 'call_1',
      name: 'exec',
      input: 'text("ok")',
    },
    {
      type: 'custom_tool_call_output',
      call_id: 'call_1',
      output: [{ type: 'input_text', text: 'ok' }],
    },
  ];
  const entry = {
    mainAgent: true,
    body: { model: 'gpt-test', stream: true, input: rawInput },
    response: {
      body: {
        content: [{ type: 'text', text: 'Finished.', phase: 'final_answer', _codexItemId: 'msg_2' }],
      },
    },
  };

  const projected = normalizeConversationEntry(entry);

  assert.notEqual(projected, entry);
  assert.equal(entry.body.input, rawInput, 'raw request remains untouched for DetailPanel');
  assert.equal(projected._codexConversationProjection, true);
  assert.deepEqual(projected.body.input, [
    { role: 'user', content: [{ type: 'text', text: 'inspect the repo', _codexItemId: 'user_1' }] },
    {
      role: 'assistant',
      content: [
        { type: 'text', text: 'I will inspect it.', phase: 'commentary', _codexItemId: 'msg_1' },
        {
          type: 'tool_use',
          id: 'call_1',
          name: 'exec',
          input: 'text("ok")',
          _codexItemType: 'custom_tool_call',
          _codexItemId: 'ctc_1',
        },
      ],
    },
    {
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: 'call_1',
        content: 'ok',
        _codexItemType: 'custom_tool_call_output',
      }],
    },
    {
      role: 'assistant',
      content: [{ type: 'text', text: 'Finished.', phase: 'final_answer', _codexItemId: 'msg_2' }],
      _codexCurrentResponse: true,
    },
  ]);
});

test('Codex transcript projection keeps tool ordering and skips encrypted-only reasoning', () => {
  const messages = codexItemsToViewerMessages([
    { type: 'reasoning', id: 'r_hidden', encrypted_content: 'opaque' },
    { type: 'function_call', id: 'fc_1', call_id: 'call_1', name: 'shell_command', arguments: '{"command":"pwd"}' },
    { type: 'function_call_output', call_id: 'call_1', output: 'workspace' },
    { type: 'reasoning', id: 'r_visible', summary: [{ type: 'summary_text', text: 'checked output' }] },
  ]);

  assert.equal(messages.length, 3);
  assert.equal(messages[0].content[0].type, 'tool_use');
  assert.equal(messages[1].content[0].type, 'tool_result');
  assert.equal(messages[2].content[0].thinking, 'checked output');
});

test('repairs duplicate blocks written by the legacy Responses SSE assembler', () => {
  const entry = {
    mainAgent: true,
    body: {
      stream: true,
      input: [{
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'hello' }],
      }],
    },
    response: {
      body: {
        raw_response: { output: [] },
        content: [
          { type: 'text', text: 'workingworking' },
          { type: 'tool_use', id: 'call_1', name: 'exec', input: 'text(1)' },
          { type: 'tool_use', id: 'call_1', name: 'exec', input: 'text(1)' },
        ],
      },
    },
  };

  const projected = normalizeConversationEntry(entry);
  assert.deepEqual(projected.body.input[1].content, [
    { type: 'text', text: 'working' },
    { type: 'tool_use', id: 'call_1', name: 'exec', input: 'text(1)' },
  ]);
});

test('hides Codex environment chrome and restores the user-provided goal objective', () => {
  const messages = codexItemsToViewerMessages([
    {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: '<environment_context>private runtime context</environment_context>' }],
    },
    {
      type: 'message',
      role: 'user',
      content: [{
        type: 'input_text',
        text: '<codex_internal_context source="goal">instructions<objective>修复对话显示</objective></codex_internal_context>',
      }],
    },
  ]);

  assert.deepEqual(messages, [{
    role: 'user',
    content: [{ type: 'text', text: '修复对话显示' }],
  }]);
});

test('conversation merge follows cumulative Codex items from in-progress through tool result and final answer', () => {
  const user = {
    type: 'message', id: 'user_1', role: 'user',
    content: [{ type: 'input_text', text: 'run it' }],
  };
  const call = {
    type: 'custom_tool_call', id: 'ctc_1', call_id: 'call_1', name: 'exec', input: 'text(1)',
  };
  const result = {
    type: 'custom_tool_call_output', call_id: 'call_1', output: '1',
  };
  const base = { timestamp: '2026-07-10T00:00:00.000Z', mainAgent: true, body: { stream: true, input: [user] } };
  const completedCall = {
    ...base,
    response: { body: { content: [{ type: 'tool_use', id: 'call_1', name: 'exec', input: 'text(1)' }] } },
  };
  const completedFinal = {
    ...base,
    timestamp: '2026-07-10T00:00:01.000Z',
    body: { ...base.body, input: [user, call, result] },
    response: { body: { content: [{ type: 'text', text: 'done', _codexItemId: 'msg_final' }] } },
  };

  let sessions = mergeMainAgentSessions([], normalizeConversationEntry({ ...base, inProgress: true }));
  sessions = mergeMainAgentSessions(sessions, normalizeConversationEntry(completedCall), { skipTransientFilter: true });
  sessions = mergeMainAgentSessions(sessions, normalizeConversationEntry(completedFinal), { skipTransientFilter: true });

  assert.deepEqual(sessions[0].messages.map(message => ({
    role: message.role,
    types: message.content.map(block => block.type),
  })), [
    { role: 'user', types: ['text'] },
    { role: 'assistant', types: ['tool_use'] },
    { role: 'user', types: ['tool_result'] },
    { role: 'assistant', types: ['text'] },
  ]);
});

test('message fingerprints include every Codex block, not only the first commentary block', () => {
  const left = { role: 'assistant', content: [
    { type: 'text', text: 'checking' },
    { type: 'tool_use', id: 'call_1', name: 'exec', input: 'one' },
  ] };
  const right = { role: 'assistant', content: [
    { type: 'text', text: 'checking' },
    { type: 'tool_use', id: 'call_2', name: 'exec', input: 'two' },
  ] };
  assert.notEqual(messageFingerprint(left), messageFingerprint(right));
});

test('message fingerprints detect finalized content for the same Codex tool id', () => {
  const partial = { role: 'assistant', content: [
    { type: 'tool_use', id: 'call-1', name: 'shell_command', input: { command: 'p' } },
  ] };
  const completed = { role: 'assistant', content: [
    { type: 'tool_use', id: 'call-1', name: 'shell_command', input: { command: 'pwd' } },
  ] };
  const pendingResult = { role: 'user', content: [
    { type: 'tool_result', tool_use_id: 'call-1', content: 'running' },
  ] };
  const failedResult = { role: 'user', content: [
    { type: 'tool_result', tool_use_id: 'call-1', content: 'failed', is_error: true },
  ] };

  assert.notEqual(messageFingerprint(partial), messageFingerprint(completed));
  assert.notEqual(messageFingerprint(pendingResult), messageFingerprint(failedResult));
});

test('same Codex tool id replaces partial arguments instead of duplicating the transcript', () => {
  const normalize = createConversationEntryNormalizer();
  const user = codexMessage('user-1', 'user', 'where am I');
  const base = cumulativeEntry('2026-07-10T00:30:00.000Z', [user], null, null);
  const partial = normalize({
    ...base,
    response: { body: { content: [
      { type: 'tool_use', id: 'call-1', name: 'shell_command', input: { command: 'p' } },
    ] } },
  });
  const completed = normalize({
    ...base,
    timestamp: '2026-07-10T00:30:01.000Z',
    response: { body: { content: [
      { type: 'tool_use', id: 'call-1', name: 'shell_command', input: { command: 'pwd' } },
    ] } },
  });

  assert.equal(completed._inPlaceReplaceDetected, true);
  let sessions = mergeMainAgentSessions([], partial);
  sessions = mergeMainAgentSessions(sessions, completed);
  assert.equal(sessions[0].messages.length, 2);
  assert.equal(sessions[0].messages[1].content[0].input.command, 'pwd');
});

test('SDK entries expose the current assistant response immediately without changing the raw entry', () => {
  const entry = {
    _sdkSource: true,
    body: { input: [{ role: 'user', content: 'hello' }] },
    response: { body: { content: [{ type: 'text', text: 'hi' }] } },
  };
  const projected = normalizeConversationEntry(entry);
  assert.equal(entry.body.input.length, 1);
  assert.equal(projected.body.input.length, 2);
  assert.deepEqual(projected.body.input[1], {
    role: 'assistant',
    content: [{ type: 'text', text: 'hi' }],
    _codexCurrentResponse: true,
  });
});

test('projects Codex image tool outputs into the viewer image result contract', () => {
  const messages = codexItemsToViewerMessages([
    { type: 'function_call', call_id: 'call_image', name: 'view_image', arguments: '{"path":"a.png"}' },
    {
      type: 'function_call_output',
      call_id: 'call_image',
      output: [
        { type: 'input_text', text: 'opened' },
        { type: 'input_image', image_url: 'data:image/png;base64,aGVsbG8=' },
      ],
    },
  ]);

  assert.deepEqual(messages[1].content[0].content, [
    { type: 'text', text: 'opened' },
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'aGVsbG8=' } },
  ]);
});

test('recognizes an image-only Responses request and appends its current response', () => {
  const entry = {
    mainAgent: true,
    body: {
      input: [{
        type: 'message',
        id: 'image-user',
        role: 'user',
        content: [{ type: 'input_image', image_url: 'data:image/png;base64,aGVsbG8=' }],
      }],
    },
    response: { body: { content: [{ type: 'text', text: 'I can see it.' }] } },
  };

  const projected = normalizeConversationEntry(entry);
  assert.equal(projected._codexConversationProjection, true);
  assert.equal(projected.body.input.length, 2);
  assert.equal(projected.body.input[1].content[0].text, 'I can see it.');
  assert.equal(projected.body.input[1]._codexCurrentResponse, true);
});

test('conversation projection keeps only the latest valid user prompt before compaction', () => {
  const messages = codexItemsToViewerMessages([
    { type: 'additional_tools', tools: [{ name: 'exec' }] },
    { type: 'message', role: 'system', content: 'system' },
    { type: 'message', role: 'user', id: 'old-1', content: [{ type: 'input_text', text: 'old task one' }] },
    { type: 'message', role: 'assistant', id: 'old-answer', content: [{ type: 'output_text', text: 'orphaned old answer' }] },
    { type: 'function_call_output', call_id: 'call-1', output: 'tool output' },
    { type: 'message', role: 'user', id: 'old-2', content: [{ type: 'input_text', text: 'latest task before compact' }] },
    { type: 'function_call', call_id: 'call-2', name: 'shell_command', arguments: '{"command":"pwd"}' },
    { type: 'function_call_output', call_id: 'call-2', output: 'workspace' },
    { type: 'compaction', encrypted_content: 'opaque' },
    { type: 'message', role: 'user', id: 'after', content: [{ type: 'input_text', text: 'new task after compact' }] },
  ]);

  const visibleUserText = messages
    .filter(message => message.role === 'user')
    .flatMap(message => Array.isArray(message.content) ? message.content : [{ type: 'text', text: message.content }])
    .filter(block => block.type === 'text')
    .map(block => block.text);
  assert.deepEqual(visibleUserText, ['latest task before compact', 'new task after compact']);
  assert.equal(messages.some(message => JSON.stringify(message).includes('orphaned old answer')), false);
  assert.equal(messages.some(message => JSON.stringify(message).includes('tool output')), false);
  assert.equal(messages.some(message => JSON.stringify(message).includes('workspace')), true);
});

test('plain-string Responses messages are detected when a native compaction item is present', () => {
  const entry = {
    mainAgent: true,
    body: {
      client_metadata: { thread_id: 'thread-string-layout' },
      input: [
        { type: 'message', role: 'user', content: 'old prompt' },
        { type: 'message', role: 'user', content: 'latest prompt' },
        { type: 'compaction', id: 'compact-string-layout' },
      ],
    },
  };
  const projected = normalizeConversationEntry(entry);
  assert.notEqual(projected, entry);
  assert.deepEqual(projected.body.input.map(message => message.content), ['latest prompt']);
});

test('repairs cache token details from raw_response in legacy Codex logs', () => {
  const entry = {
    mainAgent: true,
    body: {
      input: [{
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'hello' }],
      }],
    },
    response: {
      body: {
        usage: {
          input_tokens: 54735,
          output_tokens: 292,
          total_tokens: 55027,
        },
        raw_response: {
          usage: {
            input_tokens: 54735,
            input_tokens_details: {
              cache_write_tokens: 0,
              cached_tokens: 44800,
            },
            output_tokens: 292,
            total_tokens: 55027,
          },
        },
      },
    },
  };

  const projected = normalizeConversationEntry(entry);
  assert.deepEqual(projected.response.body.usage.input_tokens_details, {
    cache_write_tokens: 0,
    cached_tokens: 44800,
  });
  assert.equal(entry.response.body.usage.input_tokens_details, undefined);
});

function codexMessage(id, role, text) {
  return {
    type: 'message',
    id,
    role,
    ...(role === 'assistant' ? { phase: 'final_answer' } : {}),
    content: [{ type: role === 'user' ? 'input_text' : 'output_text', text }],
  };
}

function cumulativeEntry(timestamp, input, responseId, responseText, threadId = 'thread-a') {
  return {
    timestamp,
    url: 'https://chatgpt.com/backend-api/codex/responses',
    mainAgent: true,
    body: {
      input,
      metadata: { user_id: 'user-a', thread_id: threadId },
    },
    response: responseText == null ? undefined : {
      body: {
        content: [{
          type: 'text',
          text: responseText,
          phase: 'final_answer',
          _codexItemId: responseId,
        }],
      },
    },
  };
}

test('stateful Codex projection emits only an overlap anchor plus each cumulative input tail', () => {
  const normalize = createConversationEntryNormalizer();
  const user1 = codexMessage('user-1', 'user', 'one');
  const assistant1 = codexMessage('assistant-1', 'assistant', 'answer one');
  const user2 = codexMessage('user-2', 'user', 'two');
  const assistant2 = codexMessage('assistant-2', 'assistant', 'answer two');
  const user3 = codexMessage('user-3', 'user', 'three');

  const first = normalize(cumulativeEntry('2026-07-10T01:00:00.000Z', [user1], 'assistant-1', 'answer one'));
  const second = normalize(cumulativeEntry('2026-07-10T01:00:01.000Z', [user1, assistant1, user2], 'assistant-2', 'answer two'));
  const third = normalize(cumulativeEntry('2026-07-10T01:00:02.000Z', [user1, assistant1, user2, assistant2, user3], 'assistant-3', 'answer three'));

  assert.equal(first._conversationMessageCount, 2);
  assert.equal(first._conversationWindowStart, 0);
  assert.equal(second._conversationMessageCount, 4);
  assert.equal(second._conversationWindowStart, 1);
  assert.deepEqual(second.body.input.map(messageFingerprint), [
    messageFingerprint(first.body.input[1]),
    messageFingerprint({ role: 'user', content: [{ type: 'text', text: 'two', _codexItemId: 'user-2' }] }),
    messageFingerprint({ role: 'assistant', content: [{ type: 'text', text: 'answer two', phase: 'final_answer', _codexItemId: 'assistant-2' }] }),
  ]);
  assert.equal(third._conversationMessageCount, 6);
  assert.equal(third._conversationWindowStart, 3);

  let sessions = mergeMainAgentSessions([], first);
  sessions = mergeMainAgentSessions(sessions, second);
  sessions = mergeMainAgentSessions(sessions, third);
  assert.deepEqual(sessions[0].messages.map(message => message.content[0].text), [
    'one', 'answer one', 'two', 'answer two', 'three', 'answer three',
  ]);
});

test('stateful Codex projection resets its input epoch after compact and isolates threads', () => {
  const normalize = createConversationEntryNormalizer();
  const user1 = codexMessage('user-1', 'user', 'one');
  const assistant1 = codexMessage('assistant-1', 'assistant', 'answer one');
  const user2 = codexMessage('user-2', 'user', 'two');

  normalize(cumulativeEntry('2026-07-10T02:00:00.000Z', [user1], 'assistant-1', 'answer one'));
  const beforeCompact = normalize(cumulativeEntry(
    '2026-07-10T02:00:01.000Z',
    [user1, assistant1, user2],
    'assistant-2',
    'answer two',
  ));
  assert.ok(beforeCompact._conversationWindowStart > 0);

  const summary = codexMessage(
    'summary-1',
    'user',
    'This session is being continued from a previous conversation. Summary.',
  );
  const compacted = normalize(cumulativeEntry(
    '2026-07-10T02:00:02.000Z',
    [summary],
    'assistant-after-compact',
    'continue',
  ));
  assert.equal(compacted._conversationWindowStart, 0);
  assert.equal(compacted._conversationMessageCount, 2);
  assert.equal(compacted.body.input.length, 2);
  assert.equal(compacted._compactContinuation, true);

  const otherThread = normalize(cumulativeEntry(
    '2026-07-10T02:00:03.000Z',
    [user1, assistant1, user2],
    'assistant-b',
    'thread b',
    'thread-b',
  ));
  assert.equal(otherThread._conversationWindowStart, 0);
  assert.equal(otherThread.body.input.length, 4);
});

test('native compaction is an authoritative stateful replacement in the production merge path', () => {
  const normalize = createConversationEntryNormalizer();
  const raw = [];
  for (let i = 0; i < 7; i++) {
    raw.push(
      codexMessage(`user-${i}`, 'user', `task ${i}`),
      codexMessage(`assistant-${i}`, 'assistant', `answer ${i}`),
    );
  }

  const before = normalize(cumulativeEntry(
    '2026-07-10T02:10:00.000Z',
    raw,
    null,
    null,
  ));
  const compacted = normalize(cumulativeEntry(
    '2026-07-10T02:10:01.000Z',
    [...raw, { type: 'compaction', id: 'compact-native' }],
    'assistant-after-native-compact',
    'continued after compact',
  ));

  assert.equal(compacted._compactContinuation, true);
  assert.equal(compacted._authoritativeConversationReplace, true);
  let sessions = mergeMainAgentSessions([], before);
  sessions = mergeMainAgentSessions(sessions, compacted);
  assert.equal(sessions.length, 1);
  assert.deepEqual(
    sessions[0].messages
      .filter(message => message.role === 'user')
      .map(message => message.content[0].text),
    ['task 6'],
  );
  assert.equal(sessions[0].messages.some(message => JSON.stringify(message).includes('task 0')), false);
  assert.equal(sessions[0].messages.some(message => JSON.stringify(message).includes('continued after compact')), true);
});

test('native compaction replacement tolerates a sparse frame without user_id', () => {
  const normalize = createConversationEntryNormalizer();
  const before = normalize(cumulativeEntry(
    '2026-07-10T02:20:00.000Z',
    [codexMessage('user-old', 'user', 'old task')],
    'assistant-old',
    'old answer',
  ));
  const sparseRaw = cumulativeEntry(
    '2026-07-10T02:20:01.000Z',
    [
      codexMessage('user-new', 'user', 'new task'),
      { type: 'compaction', id: 'compact-sparse-user' },
    ],
    'assistant-new',
    'new answer',
  );
  delete sparseRaw.body.metadata.user_id;
  const compacted = normalize(sparseRaw);

  let sessions = mergeMainAgentSessions([], before);
  sessions = mergeMainAgentSessions(sessions, compacted);

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].messages.some(message => JSON.stringify(message).includes('old task')), false);
  assert.equal(sessions[0].messages.some(message => JSON.stringify(message).includes('new task')), true);
});

test('batch timestamps use logical positions for Codex cumulative projection windows', () => {
  const normalize = createConversationEntryNormalizer();
  const user1 = codexMessage('user-1', 'user', 'one');
  const assistant1 = codexMessage('assistant-1', 'assistant', 'answer one');
  const user2 = codexMessage('user-2', 'user', 'two');
  const first = normalize(cumulativeEntry('2026-07-10T03:00:00.000Z', [user1], 'assistant-1', 'answer one'));
  const second = normalize(cumulativeEntry('2026-07-10T03:00:01.000Z', [user1, assistant1, user2], 'assistant-2', 'answer two'));
  const st = {
    timestamps: [], generatedTimestamps: [], currentSessionId: null,
    prevUserId: null, prevSessionKey: null, prevMainAgentTs: null,
  };

  applyBatchEntryTimestamps(st, first);
  applyBatchEntryTimestamps(st, second);

  assert.equal(second.body.input[0]._timestamp, '2026-07-10T03:00:00.000Z', 'overlap anchor inherits its original timestamp');
  assert.equal(second.body.input[1]._timestamp, '2026-07-10T03:00:01.000Z');
  assert.equal(second.body.input[2]._generatedTs, '2026-07-10T03:00:01.000Z', 'current response belongs to its own request');
});

test('blocked projections do not advance the cumulative input base', () => {
  const normalize = createConversationEntryNormalizer();
  const user1 = codexMessage('user-1', 'user', 'one');
  const assistant1 = codexMessage('assistant-1', 'assistant', 'answer one');
  const user2 = codexMessage('user-2', 'user', 'two');

  const blocked = cumulativeEntry('2026-07-10T04:00:00.000Z', [user1], 'assistant-1', 'answer one');
  normalize(blocked, { commit: false });
  const completed = normalize(cumulativeEntry(
    '2026-07-10T04:00:01.000Z',
    [user1, assistant1, user2],
    'assistant-2',
    'answer two',
  ));

  assert.equal(completed._conversationWindowStart, 0);
  assert.equal(completed.body.input.length, 4);
});

test('stamps projected viewer-message count before raw Responses input is slimmed', () => {
  const entry = cumulativeEntry('2026-07-10T05:00:00.000Z', [
    codexMessage('user-1', 'user', 'run'),
    { type: 'custom_tool_call', id: 'tool-1', call_id: 'call-1', name: 'exec', input: 'text(1)' },
    { type: 'custom_tool_call_output', call_id: 'call-1', output: '1' },
  ], 'assistant-1', 'done');

  stampConversationMessageCount(entry);
  assert.equal(entry.body.input.length, 3, 'raw item count is retained for DetailPanel/restore');
  assert.equal(entry._conversationMessageCount, 4, 'viewer role-message count is stored independently');
});
