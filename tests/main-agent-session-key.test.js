import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getEntryUpstreamLane,
  getMainAgentSessionKey,
  isSessionBoundary,
} from '../src/utils/clearCheckpoint.js';
import { applyBatchEntryTimestamps } from '../src/utils/sessionManager.js';
import { mergeMainAgentSessions } from '../src/utils/sessionMerge.js';
import { reconstructEntries } from '../server/lib/delta-reconstructor.js';

function msg(role, text) {
  return { role, content: [{ type: 'text', text }] };
}

function mainEntry({ url, threadId = 'thread-1', userId = 'user-1', input, timestamp = '2026-01-01T00:00:00.000Z', delta = {} }) {
  return {
    timestamp,
    url,
    method: 'POST',
    mainAgent: true,
    subAgent: false,
    body: {
      metadata: { thread_id: threadId, user_id: userId },
      input,
    },
    response: { status: 200 },
    ...delta,
  };
}

test('main agent session key separates ChatGPT Codex backend from OpenAI API', () => {
  const api = mainEntry({
    url: 'https://api.openai.com/v1/responses',
    input: [msg('user', 'hi')],
  });
  const chatgpt = mainEntry({
    url: 'https://chatgpt.com/backend-api/codex/responses',
    input: [msg('user', 'hi')],
  });

  assert.equal(getEntryUpstreamLane(api), 'responses:https://api.openai.com/v1/responses');
  assert.equal(getEntryUpstreamLane(chatgpt), 'chatgpt-codex');
  assert.notEqual(getMainAgentSessionKey(api), getMainAgentSessionKey(chatgpt));
});

test('session key reads native Responses client_metadata and prompt cache fallback', () => {
  const fromClientMetadata = {
    url: 'https://chatgpt.com/backend-api/codex/responses',
    body: { client_metadata: { thread_id: 'native-thread' }, input: [] },
  };
  const fromPromptCache = {
    url: 'https://chatgpt.com/backend-api/codex/responses',
    body: { prompt_cache_key: 'cache-lane-7', input: [] },
  };

  assert.equal(getMainAgentSessionKey(fromClientMetadata), 'thread:native-thread|lane:chatgpt-codex');
  assert.equal(getMainAgentSessionKey(fromPromptCache), 'prompt-cache:cache-lane-7|lane:chatgpt-codex');
});

test('session boundary triggers on upstream lane change even when user and input are continuous', () => {
  const first = mainEntry({
    url: 'https://api.openai.com/v1/responses',
    input: [msg('user', 'hi'), msg('assistant', 'hello')],
  });
  const second = mainEntry({
    url: 'https://chatgpt.com/backend-api/codex/responses',
    input: [msg('user', 'hi'), msg('assistant', 'hello'), msg('user', 'continue')],
  });

  assert.equal(isSessionBoundary(second, {
    prevCount: first.body.input.length,
    count: second.body.input.length,
    prevUserId: 'user-1',
    userId: 'user-1',
    prevSessionKey: getMainAgentSessionKey(first),
    sessionKey: getMainAgentSessionKey(second),
  }), true);
});

test('mergeMainAgentSessions refuses to merge different upstream lanes', () => {
  const first = mainEntry({
    url: 'https://api.openai.com/v1/responses',
    input: [msg('user', 'hi'), msg('assistant', 'hello')],
  });
  const second = mainEntry({
    url: 'https://chatgpt.com/backend-api/codex/responses',
    input: [msg('user', 'hi'), msg('assistant', 'hello'), msg('user', 'continue')],
    timestamp: '2026-01-01T00:00:01.000Z',
  });

  let sessions = mergeMainAgentSessions([], first);
  sessions = mergeMainAgentSessions(sessions, second, { skipTransientFilter: true });

  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].messages.length, 2);
  assert.equal(sessions[1].messages.length, 3);
  assert.notEqual(sessions[0].sessionKey, sessions[1].sessionKey);
});

test('batch timestamp state starts a new stable session id on upstream lane change', () => {
  const st = {
    timestamps: [],
    generatedTimestamps: [],
    prevMainAgentTs: null,
    prevUserId: null,
    prevSessionKey: null,
    currentSessionId: null,
  };
  const first = mainEntry({
    url: 'https://api.openai.com/v1/responses',
    input: [msg('user', 'hi'), msg('assistant', 'hello')],
    timestamp: '2026-01-01T00:00:00.000Z',
  });
  const second = mainEntry({
    url: 'https://chatgpt.com/backend-api/codex/responses',
    input: [msg('user', 'hi'), msg('assistant', 'hello'), msg('user', 'continue')],
    timestamp: '2026-01-01T00:00:01.000Z',
  });

  applyBatchEntryTimestamps(st, first);
  assert.equal(st.currentSessionId, first.timestamp);
  applyBatchEntryTimestamps(st, second);
  assert.equal(st.currentSessionId, second.timestamp);
  assert.equal(second.body.input[0]._timestamp, second.timestamp);
});

test('delta reconstructor keeps different conversation ids isolated', () => {
  const first = mainEntry({
    url: 'https://api.openai.com/v1/responses',
    input: [msg('user', 'api-1')],
    delta: {
      _deltaFormat: 1,
      _conversationId: 'mainAgent:lane:api',
      _isCheckpoint: true,
      _totalMessageCount: 1,
    },
  });
  const second = mainEntry({
    url: 'https://chatgpt.com/backend-api/codex/responses',
    input: [msg('user', 'chatgpt-1')],
    delta: {
      _deltaFormat: 1,
      _conversationId: 'mainAgent:lane:chatgpt',
      _isCheckpoint: true,
      _totalMessageCount: 1,
    },
  });
  const firstDelta = mainEntry({
    url: 'https://api.openai.com/v1/responses',
    input: [msg('assistant', 'api-2')],
    delta: {
      _deltaFormat: 1,
      _conversationId: 'mainAgent:lane:api',
      _isCheckpoint: false,
      _totalMessageCount: 2,
    },
  });

  reconstructEntries([first, second, firstDelta]);

  assert.deepEqual(firstDelta.body.input.map(m => m.content[0].text), ['api-1', 'api-2']);
});
