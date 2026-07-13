import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getConversationGroupStartTs,
  getCurrentConversationStartIndex,
  getImmediateFragmentUpperBound,
} from '../src/utils/sessionDisplay.js';
import { getLatestSessionByActivity } from '../src/utils/sessionManager.js';

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
