import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPromptNavItems } from '../src/utils/promptNav.js';

function visible(text, timestamp) {
  return { props: { role: 'user', text, timestamp } };
}

function compaction(timestamp, prompts = [{ segments: [{ type: 'text', text: 'secret prompt' }] }]) {
  return { props: { role: 'context-compaction', timestamp, record: { present: true, prompts } } };
}

test('prompt navigation includes compaction as a content-free structural target', () => {
  const items = buildPromptNavItems([
    visible('before', 't1'),
    compaction('t2'),
    visible('after', 't3'),
  ], [{ messages: [{ _timestamp: 't1' }, { _timestamp: 't2' }, { _timestamp: 't3' }] }]);

  assert.deepEqual(items.map(item => item.kind), ['prompt', 'compaction', 'prompt']);
  assert.equal(items[1].display, null);
  assert.equal(items[1].visibleIdx, 1);
  assert.equal(items[1].timestamp, 't2');
  assert.equal(JSON.stringify(items).includes('secret prompt'), false);
});

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
