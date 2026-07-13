import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifySessionTransition,
  getEntryUpstreamLane,
  getMainAgentConversationId,
  getMainAgentSessionKey,
  isSessionBoundary,
} from '../src/utils/clearCheckpoint.js';
import { applyBatchEntryTimestamps, applyInPlaceLastMsgReplace, getSessionBoundaryId, isSessionDividerBoundary } from '../src/utils/sessionManager.js';
import { mergeMainAgentSessions } from '../src/utils/sessionMerge.js';
import { reconstructEntries } from '../server/lib/delta-reconstructor.js';

function msg(role, text) {
  return { role, content: [{ type: 'text', text }] };
}

function mainEntry({ url, threadId = 'thread-1', sessionId = null, userId = 'user-1', input, timestamp = '2026-01-01T00:00:00.000Z', delta = {} }) {
  return {
    timestamp,
    url,
    method: 'POST',
    mainAgent: true,
    subAgent: false,
    body: {
      metadata: { thread_id: threadId, ...(sessionId ? { session_id: sessionId } : {}), user_id: userId },
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

test('visible session boundaries follow upstream session id and fall back to thread id', () => {
  const sameThreadA = { sessionId: 'internal-a', conversationId: 'thread:one', messages: [{ _timestamp: 'a' }] };
  const sameThreadB = { sessionId: 'internal-b', conversationId: 'thread:one', messages: [{ _timestamp: 'b' }] };
  const otherThread = { sessionId: 'internal-c', conversationId: 'thread:two', messages: [{ _timestamp: 'c' }] };
  assert.equal(isSessionDividerBoundary(sameThreadA, sameThreadB), false);
  assert.equal(isSessionDividerBoundary(sameThreadB, otherThread), true);

  const upstreamSessionA = { ...sameThreadA, conversationId: 'session:session-a' };
  const upstreamSessionB = { ...sameThreadB, conversationId: 'session:session-b' };
  assert.equal(getSessionBoundaryId(upstreamSessionA), 'session:session-a');
  assert.equal(isSessionDividerBoundary(upstreamSessionA, upstreamSessionB), true);
});

test('conversation identity prefers session_id and otherwise uses thread_id', () => {
  const entry = mainEntry({
    url: 'https://chatgpt.com/backend-api/codex/responses',
    input: [msg('user', 'one')],
  });
  assert.equal(getMainAgentConversationId(entry), 'thread:thread-1');
  entry.body.metadata.session_id = 'session-1';
  assert.equal(getMainAgentConversationId(entry), 'session:session-1');
});

test('optional session_id disappearing on a sparse frame does not split the thread', () => {
  const full = mainEntry({
    url: 'https://chatgpt.com/backend-api/codex/responses',
    sessionId: 'session-a',
    input: [msg('user', 'one')],
  });
  const sparse = mainEntry({
    url: 'https://chatgpt.com/backend-api/codex/responses',
    input: [msg('user', 'one'), msg('assistant', 'two')],
  });
  const transition = classifySessionTransition(sparse, {
    prevCount: 1,
    count: 2,
    prevUserId: 'user-1',
    userId: 'user-1',
    prevSessionKey: getMainAgentSessionKey(full),
    sessionKey: getMainAgentSessionKey(sparse),
    prevConversationId: getMainAgentConversationId(full),
    conversationId: getMainAgentConversationId(sparse),
  });
  assert.equal(transition.isBoundary, false);

  const a = { sessionId: 'epoch-a', conversationId: 'session:session-a', sessionKey: getMainAgentSessionKey(full) };
  const b = { sessionId: 'epoch-b', conversationId: 'thread:thread-1', sessionKey: getMainAgentSessionKey(sparse) };
  assert.equal(isSessionDividerBoundary(a, b), false);
});

test('only explicitly in-progress short history drops are transient', () => {
  const context = {
    prevCount: 6,
    count: 1,
    prevUserId: 'user-1',
    userId: 'user-1',
    prevSessionKey: 'thread:old',
    sessionKey: 'thread:old',
  };
  const completed = mainEntry({
    url: 'https://chatgpt.com/backend-api/codex/responses',
    input: [msg('user', 'new short session')],
  });
  assert.equal(classifySessionTransition(completed, context).isBoundary, true);
  const pending = { ...completed, inProgress: true };
  assert.equal(classifySessionTransition(pending, context).isTransient, true);
  assert.equal(classifySessionTransition(pending, context).isBoundary, false);
});

test('merge keeps distinct stamped session ids separate even on the same thread', () => {
  const first = mainEntry({
    url: 'https://chatgpt.com/backend-api/codex/responses',
    input: [msg('user', 'one')],
  });
  first._sessionId = 'epoch-a';
  const second = mainEntry({
    url: 'https://chatgpt.com/backend-api/codex/responses',
    input: [msg('user', 'two')],
    timestamp: '2026-01-01T00:00:01.000Z',
  });
  second._sessionId = 'epoch-b';

  let sessions = mergeMainAgentSessions([], first);
  sessions = mergeMainAgentSessions(sessions, second, { skipTransientFilter: true });
  assert.deepEqual(sessions.map(s => s.sessionId), ['epoch-a', 'epoch-b']);
});

test('client_metadata user changes form a hard merge boundary', () => {
  const first = mainEntry({
    url: 'https://chatgpt.com/backend-api/codex/responses',
    input: Array.from({ length: 10 }, (_, index) => msg(
      index % 2 === 0 ? 'user' : 'assistant',
      `account A ${index}`,
    )),
  });
  first.body.metadata = {};
  first.body.client_metadata = { thread_id: 'shared', user_id: 'account-a' };
  const second = mainEntry({
    url: 'https://chatgpt.com/backend-api/codex/responses',
    input: [msg('user', 'account B')],
    timestamp: '2026-01-01T00:00:01.000Z',
  });
  second.body.metadata = {};
  second.body.client_metadata = { thread_id: 'shared', user_id: 'account-b' };
  let sessions = mergeMainAgentSessions([], first);
  sessions = mergeMainAgentSessions(sessions, second);
  assert.equal(sessions.length, 2);
  assert.deepEqual(sessions.map(session => session.userId), ['account-a', 'account-b']);
});

test('authoritative session_id changes advance the batch logical epoch', () => {
  const st = {
    timestamps: [], generatedTimestamps: [], currentSessionId: null,
    prevUserId: null, prevSessionKey: null, prevConversationId: null, prevMainAgentTs: null,
  };
  const first = mainEntry({
    url: 'https://chatgpt.com/backend-api/codex/responses',
    sessionId: 'session-a',
    input: Array.from({ length: 6 }, (_, i) => msg(i % 2 ? 'assistant' : 'user', `one-${i}`)),
  });
  applyBatchEntryTimestamps(st, first);
  const firstEpoch = st.currentSessionId;

  const second = mainEntry({
    url: 'https://chatgpt.com/backend-api/codex/responses',
    sessionId: 'session-b',
    input: [msg('user', 'two')],
    timestamp: '2026-01-01T00:00:01.000Z',
  });
  applyBatchEntryTimestamps(st, second);
  assert.notEqual(st.currentSessionId, firstEpoch);
  assert.equal(second._sessionBoundaryReason, 'conversation');
});

test('post-clear logical epochs do not create a visible divider within one upstream conversation', () => {
  const before = {
    sessionId: 'epoch-a', conversationId: 'session:same',
    messages: [{ _timestamp: 'a' }],
  };
  const after = {
    sessionId: 'epoch-b', conversationId: 'session:same',
    messages: [{ _timestamp: 'b' }],
  };
  assert.equal(isSessionDividerBoundary(before, after), false);
});

test('in-place replacement preserves session identity and boundary metadata', () => {
  const oldLast = { role: 'assistant', content: 'draft', _timestamp: 'a' };
  const previous = [{
    userId: 'user', sessionKey: 'key', sessionId: 'epoch', conversationId: 'session:one',
    messages: [{ role: 'user', content: 'ask', _timestamp: 'a' }, oldLast],
    response: { status: 200 }, entryTimestamp: 'a',
  }];
  const entry = {
    _inPlaceReplaceDetected: true,
    _isCheckpoint: true,
    body: { input: [{ role: 'user', content: 'ask' }, { role: 'assistant', content: 'final' }] },
    response: { status: 200 },
  };
  const result = applyInPlaceLastMsgReplace(previous, entry, 'b', false);
  assert.equal(result.applied, true);
  assert.equal(result.sessions[0].sessionKey, 'key');
  assert.equal(result.sessions[0].sessionId, 'epoch');
  assert.equal(result.sessions[0].conversationId, 'session:one');
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
