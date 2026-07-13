import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPromptNavItems } from '../src/utils/promptNav.js';

function visible(text, timestamp) {
  return { props: { role: 'user', text, timestamp } };
}

test('prompt navigation session separators follow session/thread identity, not array fragments', () => {
  const sessions = [
    { sessionId: 'internal-a', conversationId: 'thread:one', messages: [{ _timestamp: 't1' }] },
    { sessionId: 'internal-b', conversationId: 'thread:one', messages: [{ _timestamp: 't2' }] },
    { sessionId: 'internal-c', conversationId: 'thread:two', messages: [{ _timestamp: 't3' }] },
  ];
  const prompts = buildPromptNavItems([
    visible('one', 't1'), visible('two', 't2'), visible('three', 't3'),
  ], sessions);

  assert.equal(prompts[0].newSession, undefined);
  assert.equal(prompts[1].newSession, undefined);
  assert.equal(prompts[2].newSession, true);
});

test('prompt navigation does not show a Session divider for post-clear epochs on the same thread', () => {
  const sessions = [
    { sessionId: 'internal-a', conversationId: 'thread:one', messages: [{ _timestamp: 't1' }] },
    { sessionId: 'internal-b', conversationId: 'thread:one', messages: [{ _timestamp: 't2' }] },
  ];
  const prompts = buildPromptNavItems([visible('before', 't1'), visible('after', 't2')], sessions);
  assert.equal(prompts[0].newSession, undefined);
  assert.equal(prompts[1].newSession, undefined);
});
