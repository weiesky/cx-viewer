import test from 'node:test';
import assert from 'node:assert/strict';

import {
  didFinishConversationHydration,
  getConversationGroupStartTs,
  getCurrentConversationStartIndex,
  getCurrentConversationWindowStartIndex,
  getImmediateFragmentUpperBound,
} from '../src/utils/sessionDisplay.js';
import { getLatestSessionByActivity, resolveDisplaySessions } from '../src/utils/sessionManager.js';

test('same-conversation fragments share a divider group but keep immediate chronology bounds', () => {
  const sessions = [
    { sessionId: 'a', conversationId: 'thread:one', messages: [{ _timestamp: '2026-01-01T00:00:00Z' }] },
    { sessionId: 'b', conversationId: 'thread:one', messages: [{ _timestamp: '2026-01-01T00:01:00Z' }] },
    { sessionId: 'c', conversationId: 'thread:two', messages: [{ _timestamp: '2026-01-01T00:02:00Z' }] },
  ];

  assert.equal(getImmediateFragmentUpperBound(sessions, 0), '2026-01-01T00:01:00Z');
  assert.equal(getImmediateFragmentUpperBound(sessions, 1), '2026-01-01T00:02:00Z');
  assert.equal(getCurrentConversationStartIndex(sessions), 2);
});

test('current-only follows the latest logical epoch even within one visible conversation', () => {
  const sessions = [
    { sessionId: 'old', conversationId: 'thread:old', messages: [{ _timestamp: '2026-01-01T00:00:00Z' }] },
    { _cold: true, sessionId: 'cold', conversationId: 'thread:current', firstTs: '2026-01-01T00:10:00Z' },
    { sessionId: 'hot', conversationId: 'thread:current', messages: [{ _timestamp: '2026-01-01T00:11:00Z' }] },
  ];

  const start = getCurrentConversationStartIndex(sessions);
  assert.equal(start, 2);
  assert.equal(getConversationGroupStartTs(sessions, start), '2026-01-01T00:11:00Z');
  assert.equal(getImmediateFragmentUpperBound(sessions, 1), '2026-01-01T00:11:00Z');
  assert.equal(getImmediateFragmentUpperBound(sessions, 2, '2026-01-01T00:12:00Z'), '2026-01-01T00:12:00Z');
});

test('current-only can anchor latest activity when insertion-order tail is stale', () => {
  const sessions = [
    { sessionId: 'active', entryTimestamp: '2026-01-01T00:03:00Z', messages: [{ _timestamp: '2026-01-01T00:00:00Z' }] },
    { sessionId: 'stale-tail', entryTimestamp: '2026-01-01T00:02:00Z', messages: [{ _timestamp: '2026-01-01T00:01:00Z' }] },
  ];
  const active = getLatestSessionByActivity(sessions);
  assert.equal(getCurrentConversationStartIndex(sessions, active), 0);
});

test('compact live window keeps exactly the previous session above the current one', () => {
  const sessions = [
    { sessionId: 'oldest' },
    { sessionId: 'previous' },
    { sessionId: 'current' },
  ];

  assert.equal(getCurrentConversationWindowStartIndex(sessions), 1);
  assert.equal(getCurrentConversationWindowStartIndex(sessions, sessions[1]), 0);
  assert.equal(getCurrentConversationWindowStartIndex([sessions[0]]), 0);
});

test('conversation hydration finishes only on a non-empty loading falling edge', () => {
  const sessions = [{ sessionId: 'current' }];
  assert.equal(didFinishConversationHydration(true, false, sessions), true);
  assert.equal(didFinishConversationHydration(false, false, sessions), false);
  assert.equal(didFinishConversationHydration(true, true, sessions), false);
  assert.equal(didFinishConversationHydration(true, false, []), false);
});

test('local current-session pin slices older sessions without remote instance state', () => {
  const sessions = [
    { sessionId: 'old', entryTimestamp: '2026-01-01T00:01:00Z', messages: [] },
    { sessionId: 'current', entryTimestamp: '2026-01-01T00:03:00Z', messages: [] },
    { sessionId: 'stale-tail', entryTimestamp: '2026-01-01T00:02:00Z', messages: [] },
  ];

  const currentOnly = resolveDisplaySessions(sessions, 'current', true);
  assert.deepEqual(currentOnly.sessions, sessions.slice(0, 2));
  assert.equal(currentOnly.upperBoundTs, null);

  const unfiltered = resolveDisplaySessions(sessions, 'old', false);
  assert.equal(unfiltered.sessions, sessions);
  assert.equal(unfiltered.upperBoundTs, null);
});
