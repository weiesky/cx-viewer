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
import { resolveContextCompactionRecordBySourceKey } from '../src/utils/contextCompaction.js';

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
  assert.equal(shouldExcludeFromConversation({
    url: 'https://api.openai.com/v1/responses/',
  }), true);
  assert.equal(shouldExcludeFromConversation({
    url: 'https://api.openai.com/v1/responses/resp_123',
  }), false);
  assert.equal(shouldExcludeFromConversation({
    url: 'https://api.openai.com.evil/v1/responses',
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

test('live V2 subAgents cannot overwrite the MainAgent fallback prefix baseline after refresh', () => {
  const normalize = createConversationEntryNormalizer();
  const mainUser = codexMessage('main-user', 'user', 'delegate the search');
  const mainBase = cumulativeEntry('2026-07-10T00:35:00.000Z', [mainUser], null, null);
  // Reproduce the collision path: without a thread/session id both agents fall
  // back to the same user|url projection key.
  // The root intentionally carries a stale false flag: AppBase's authoritative
  // classifier still recognizes its ChatGPT Codex upstream lane.
  mainBase.mainAgent = false;
  mainBase.body.metadata = { user_id: 'shared-user' };
  assert.equal(isMainAgent(mainBase), true);

  const partial = normalize({
    ...mainBase,
    _v2RowHandle: 'generation:main-entry',
    _v2Descriptor: { agentRole: 'main' },
    response: { body: { content: [
      { type: 'tool_use', id: 'spawn-1', name: 'spawn_agent', input: { message: 'sea' } },
    ] } },
  }, { commit: isMainAgent(mainBase) });

  const makeSubAgentEntry = (suffix) => ({
    ...cumulativeEntry(
      `2026-07-10T00:35:00.${suffix}Z`,
      [codexMessage(`sub-user-${suffix}`, 'user', 'search the codebase')],
      null,
      null,
    ),
    // No persisted role flags: this exercises AppBase's instructions-based
    // classification rather than the normalizer's field-only fallback.
    mainAgent: undefined,
    subAgent: undefined,
    _v2RowHandle: `generation:sub-entry-${suffix}`,
    _v2Descriptor: { agentRole: 'subagent' },
    body: {
      input: [codexMessage(`sub-user-${suffix}`, 'user', 'search the codebase')],
      metadata: { user_id: 'shared-user' },
      instructions: 'You are a general-purpose agent. Search the codebase.',
    },
    response: { body: { content: [{ type: 'text', text: 'found it' }] } },
  });
  const subAgentEntries = [makeSubAgentEntry('250'), makeSubAgentEntry('500')];
  const projectedSubAgents = subAgentEntries.map((entry) => {
    assert.equal(isMainAgent(entry), false);
    return normalize(entry, { commit: isMainAgent(entry) });
  });

  const completedEntry = {
    ...mainBase,
    _v2RowHandle: 'generation:main-entry',
    _v2Descriptor: { agentRole: 'main' },
    timestamp: '2026-07-10T00:35:01.000Z',
    response: { body: { content: [
      { type: 'tool_use', id: 'spawn-1', name: 'spawn_agent', input: { message: 'search' } },
    ] } },
  };
  const completed = normalize(completedEntry, { commit: isMainAgent(completedEntry) });

  assert.equal(projectedSubAgents.every(entry => entry._codexConversationProjection === true), true,
    'subAgents remain projectable');
  assert.equal(completed._inPlaceReplaceDetected, true, 'MainAgent tail revision keeps its prefix state');

  let sessions = mergeMainAgentSessions([], partial);
  sessions = mergeMainAgentSessions(sessions, completed);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].messages.length, 2, 'live merge must not append a duplicate transcript');
  assert.equal(
    sessions[0].messages.filter(message => message.role === 'user'
      && message.content?.[0]?.text === 'delegate the search').length,
    1,
    'the real partial -> subAgent -> final chain is unique before any next request',
  );
  assert.equal(sessions[0].messages[0].content[0].text, 'delegate the search');
  assert.equal(sessions[0].messages[1].content[0].input.message, 'search');

  // Refresh/cold rebuild sees the final winner without the transient subAgent
  // projections. Its transcript must be identical to the live incremental view.
  const coldNormalize = createConversationEntryNormalizer();
  const coldCompleted = coldNormalize(completedEntry, { commit: isMainAgent(completedEntry) });
  const coldSessions = mergeMainAgentSessions([], coldCompleted);
  assert.deepEqual(
    sessions[0].messages.map(messageFingerprint),
    coldSessions[0].messages.map(messageFingerprint),
  );
});

test('normalizer role fallback and explicit commit override preserve the MainAgent baseline', () => {
  const mainUser = codexMessage('fallback-user', 'user', 'inspect');
  const mainBase = cumulativeEntry('2026-07-10T00:36:00.000Z', [mainUser], null, null);
  mainBase.body.metadata = { user_id: 'fallback-shared' };

  for (const blockedRole of [
    { mainAgent: false },
    { mainAgent: true, subAgent: true },
    { mainAgent: true, teammate: 'worker' },
  ]) {
    const normalize = createConversationEntryNormalizer();
    normalize({
      ...mainBase,
      response: { body: { content: [{ type: 'text', text: 'partial' }] } },
    });
    normalize({
      ...mainBase,
      ...blockedRole,
      body: {
        input: [codexMessage('foreign-user', 'user', 'foreign')],
        metadata: { user_id: 'fallback-shared' },
      },
      response: { body: { content: [{ type: 'text', text: 'foreign answer' }] } },
    });
    const completed = normalize({
      ...mainBase,
      response: { body: { content: [{ type: 'text', text: 'final' }] } },
    });
    assert.equal(completed._inPlaceReplaceDetected, true);
  }

  const normalizeOverride = createConversationEntryNormalizer();
  const staleRoot = { ...mainBase, mainAgent: false };
  normalizeOverride({
    ...staleRoot,
    response: { body: { content: [{ type: 'text', text: 'partial' }] } },
  }, { commit: true });
  const completedOverride = normalizeOverride({
    ...staleRoot,
    response: { body: { content: [{ type: 'text', text: 'final' }] } },
  }, { commit: true });
  assert.equal(completedOverride._inPlaceReplaceDetected, true,
    'an explicit authoritative commit overrides stale persisted role fields');
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

test('conversation projection replaces pre-compaction bubbles with one disclosure row', () => {
  const rawInput = [
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
  ];
  const messages = codexItemsToViewerMessages(rawInput);

  const visibleUserText = messages
    .filter(message => message.role === 'user')
    .flatMap(message => Array.isArray(message.content) ? message.content : [{ type: 'text', text: message.content }])
    .filter(block => block.type === 'text')
    .map(block => block.text);
  assert.deepEqual(visibleUserText, ['new task after compact']);
  const disclosure = messages.find(message => message.role === 'context-compaction');
  assert.ok(disclosure);
  assert.equal(messages.filter(message => message.role === 'context-compaction').length, 1);
  assert.equal(typeof disclosure.content, 'string');
  assert.equal(disclosure.content.length > 0, true);
  assert.equal(JSON.stringify(disclosure).includes('encrypted_content'), false);
  assert.equal(Object.hasOwn(disclosure._contextCompaction, 'prompts'), false);
  const record = resolveContextCompactionRecordBySourceKey(
    [{ body: { input: rawInput } }],
    disclosure.content,
  );
  assert.equal(JSON.stringify(record.prompts).includes('old task one'), true);
  assert.equal(JSON.stringify(record.prompts).includes('latest task before compact'), true);
  assert.equal(messages.some(message => JSON.stringify(message).includes('orphaned old answer')), false);
  assert.equal(messages.some(message => JSON.stringify(message).includes('tool output')), false);
  assert.equal(messages.some(message => JSON.stringify(message).includes('workspace')), false);
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
  assert.deepEqual(projected.body.input.map(message => message.role), ['context-compaction']);
  assert.equal(Object.hasOwn(projected.body.input[0]._contextCompaction, 'prompts'), false);
  const record = resolveContextCompactionRecordBySourceKey(
    [entry],
    projected.body.input[0].content,
  );
  assert.equal(JSON.stringify(record.prompts).includes('old prompt'), true);
  assert.equal(JSON.stringify(record.prompts).includes('latest prompt'), true);
  assert.equal(messageFingerprint(projected.body.input[0]).endsWith('|empty'), false);
});

test('collapsed conversation compaction rows do not retain a large prompt projection', () => {
  const largePrompt = 'x'.repeat(1024 * 1024);
  const entry = {
    mainAgent: true,
    body: {
      client_metadata: { thread_id: 'thread-large-compaction' },
      input: [
        { type: 'message', role: 'user', content: largePrompt },
        { type: 'compaction', id: 'compact-large' },
      ],
    },
  };
  const disclosure = normalizeConversationEntry(entry).body.input[0];
  assert.equal(disclosure.role, 'context-compaction');
  assert.equal(JSON.stringify(disclosure).length < 4096, true);
  assert.equal(Object.hasOwn(disclosure._contextCompaction, 'prompts'), false);

  const resolved = resolveContextCompactionRecordBySourceKey([entry], disclosure.content);
  assert.equal(resolved.present, true);
  assert.equal(resolved.prompts.length >= 1, true);
  assert.equal(resolved.prompts[0].truncated, true);
});

test('distinct compaction disclosure rows have stable non-colliding fingerprints', () => {
  const first = normalizeConversationEntry({
    mainAgent: true,
    body: {
      client_metadata: { thread_id: 'thread-fingerprint' },
      input: [{ type: 'compaction', id: 'compact-first' }],
    },
  }).body.input[0];
  const second = normalizeConversationEntry({
    mainAgent: true,
    body: {
      client_metadata: { thread_id: 'thread-fingerprint' },
      input: [{ type: 'compaction', id: 'compact-second' }],
    },
  }).body.input[0];

  assert.notEqual(first.content, second.content);
  assert.notEqual(messageFingerprint(first), messageFingerprint(second));
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

test('short authoritative revisions splice into a long user-id-less session without duplicating the prompt', () => {
  const normalize = createConversationEntryNormalizer();
  const history = [];
  for (let i = 0; i < 105; i++) {
    history.push(
      codexMessage(`history-user-${i}`, 'user', `history task ${i}`),
      codexMessage(`history-assistant-${i}`, 'assistant', `history answer ${i}`),
    );
  }

  const p1 = codexMessage('prompt-p1', 'user', 'P1');
  const partialRaw = cumulativeEntry(
    '2026-07-18T19:23:38.046Z',
    [...history, p1],
    'assistant-p1',
    'partial P1 answer',
    'thread-long-projection',
  );
  delete partialRaw.body.metadata.user_id;
  const partial = normalize(partialRaw, { commit: true });
  partial._v2Descriptor = { seq: 1, entryKey: 'p1-generation', agentRole: 'main' };

  const finalRaw = cumulativeEntry(
    '2026-07-18T19:23:38.046Z',
    [...history, p1],
    'assistant-p1',
    'final P1 answer',
    'thread-long-projection',
  );
  delete finalRaw.body.metadata.user_id;
  const final = normalize(finalRaw, { commit: true });
  // Materialize the short V2 projection observed in the production log. The
  // merge protocol must remain correct even when the optional replace hint is
  // absent and only the authoritative logical window metadata survives.
  final._conversationWindowStart = 210;
  final._conversationMessageCount = 212;
  final._codexConversationDelta = true;
  final._v2Descriptor = { seq: 2, entryKey: 'p1-generation', agentRole: 'main' };
  final.body = { ...final.body, input: final.body.input.slice(210) };
  delete final._inPlaceReplaceDetected;

  assert.equal(partial.body.input.length, 212);
  assert.equal(final.body.input.length, 2, 'the final revision is a physical tail window');
  assert.equal(final._conversationWindowStart, 210);
  assert.equal(final._conversationMessageCount, 212, 'logical transcript length remains complete');

  let sessions = mergeMainAgentSessions([], partial, { skipTransientFilter: true });
  sessions = mergeMainAgentSessions(sessions, final, { skipTransientFilter: true });
  const p1CountBeforeNextRequest = sessions
    .flatMap(session => session.messages)
    .filter(message => message.role === 'user' && message.content?.[0]?.text === 'P1')
    .length;
  assert.equal(sessions.length, 1, 'a short projection is not a second session');
  assert.equal(sessions[0].messages.length, 212, 'the preceding long history is preserved');
  assert.equal(p1CountBeforeNextRequest, 1, 'P1 is already unique before P2 can self-heal the view');
  assert.equal(sessions[0].messages.at(-1).content[0].text, 'final P1 answer');

  const latePartial = {
    ...partial,
    _conversationWindowStart: 210,
    _conversationMessageCount: 212,
    _codexConversationDelta: true,
    body: { ...partial.body, input: partial.body.input.slice(210) },
  };
  const afterFinal = sessions;
  sessions = mergeMainAgentSessions(sessions, latePartial, { skipTransientFilter: true });
  assert.equal(sessions, afterFinal, 'an older equal-length partial cannot overwrite the final revision');
  assert.equal(sessions[0].messages.at(-1).content[0].text, 'final P1 answer');

  const p2 = codexMessage('prompt-p2', 'user', 'P2');
  const finalAssistantInput = codexMessage('assistant-p1', 'assistant', 'final P1 answer');
  const p2Raw = cumulativeEntry(
    '2026-07-18T19:24:12.000Z',
    [...history, p1, finalAssistantInput, p2],
    'assistant-p2',
    'final P2 answer',
    'thread-long-projection',
  );
  delete p2Raw.body.metadata.user_id;
  const p2Final = normalize(p2Raw, { commit: true });
  p2Final._v2Descriptor = { seq: 3, entryKey: 'p2-generation', agentRole: 'main' };
  sessions = mergeMainAgentSessions(sessions, p2Final, { skipTransientFilter: true });
  const userTexts = sessions[0].messages
    .filter(message => message.role === 'user')
    .map(message => message.content?.[0]?.text);
  assert.equal(userTexts.filter(text => text === 'P1').length, 1);
  assert.equal(userTexts.filter(text => text === 'P2').length, 1);
  assert.equal(sessions[0].messages.length, 214);

  const afterP2 = sessions;
  sessions = mergeMainAgentSessions(sessions, final, { skipTransientFilter: true });
  assert.equal(sessions, afterP2, 'a late P1 revision cannot roll back the already committed P2 turn');
});

test('logical projection splice preserves the anonymous-to-identified user boundary', () => {
  const anonymousRaw = cumulativeEntry(
    '2026-07-18T20:00:00.000Z',
    [codexMessage('anonymous-user', 'user', 'anonymous task')],
    'anonymous-assistant',
    'anonymous answer',
    'shared-thread',
  );
  delete anonymousRaw.body.metadata.user_id;
  const anonymous = normalizeConversationEntry(anonymousRaw);

  const identifiedRaw = cumulativeEntry(
    '2026-07-18T20:00:01.000Z',
    [codexMessage('identified-user', 'user', 'identified task')],
    'identified-assistant',
    'identified answer',
    'shared-thread',
  );
  identifiedRaw.body.metadata.user_id = 'identified-user-id';
  const identified = normalizeConversationEntry(identifiedRaw);
  identified._conversationWindowStart = 1;
  identified._conversationMessageCount = 2;
  identified.body = { ...identified.body, input: identified.body.input.slice(1) };

  let sessions = mergeMainAgentSessions([], anonymous, { skipTransientFilter: true });
  sessions = mergeMainAgentSessions(sessions, identified, { skipTransientFilter: true });
  assert.equal(sessions.length, 2, 'projection metadata cannot bypass the user authorization boundary');
  assert.equal(sessions[0].userId, null);
  assert.equal(sessions[1].userId, 'identified-user-id');
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
  const compactedSource = cumulativeEntry(
    '2026-07-10T02:10:01.000Z',
    [...raw, { type: 'compaction', id: 'compact-native' }],
    'assistant-after-native-compact',
    'continued after compact',
  );
  const compacted = normalize(compactedSource);

  assert.equal(compacted._compactContinuation, true);
  assert.equal(compacted._authoritativeConversationReplace, true);
  let sessions = mergeMainAgentSessions([], before);
  sessions = mergeMainAgentSessions(sessions, compacted);
  assert.equal(sessions.length, 1);
  assert.deepEqual(sessions[0].messages.filter(message => message.role === 'user'), []);
  const disclosure = sessions[0].messages.find(message => message.role === 'context-compaction');
  assert.ok(disclosure);
  assert.equal(sessions[0].messages.filter(message => message.role === 'context-compaction').length, 1);
  const record = resolveContextCompactionRecordBySourceKey(
    [compactedSource],
    disclosure.content,
  );
  assert.equal(JSON.stringify(record.prompts).includes('task 0'), true);
  assert.equal(JSON.stringify(record.prompts).includes('task 6'), true);
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
  const ordinaryMessages = sessions[0].messages.filter(message => message.role !== 'context-compaction');
  assert.equal(ordinaryMessages.some(message => JSON.stringify(message).includes('new task')), false);
  const disclosure = sessions[0].messages.find(message => message.role === 'context-compaction');
  const record = resolveContextCompactionRecordBySourceKey([sparseRaw], disclosure?.content);
  assert.equal(JSON.stringify(record.prompts).includes('new task'), true);
  assert.equal(ordinaryMessages.some(message => JSON.stringify(message).includes('new answer')), true);
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
