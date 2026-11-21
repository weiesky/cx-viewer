import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPromptNavItems, shouldUseComposerPromptNav } from '../src/utils/promptNav.js';

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

test('native Plan, Ask and UltraPlan targets interleave without folding same-bubble cards', () => {
  const rows = buildPromptNavItems([
    visible('plain', 't1'),
    { props: { role: 'assistant', timestamp: 't3', displayTs: 't2', content: [
      { type: 'tool_use', name: 'update_plan', input: { plan: '\n## Plan title\nstep' } },
      { type: 'tool_use', name: 'request_user_input', input: { questions: [{ question: ' ' }, { question: 'Choose a target' }] } },
      { type: 'tool_use', name: 'request_user_input', input: { questions: [{ question: 'A second question' }] } },
    ] } },
    { props: { role: 'user', text: 'Ultra task', isUltraplan: true, timestamp: 't3' } },
    compaction('t4'),
  ], []);
  assert.deepEqual(rows.map(row => row.kind), ['prompt', 'plan', 'ask', 'ask', 'ultraplan', 'compaction']);
  assert.deepEqual(rows.slice(1, 4).map(row => row.visibleIdx), [1, 1, 1]);
  assert.deepEqual(rows.slice(1, 4).map(row => row.timestamp), ['t2', 't2', 't2']);
  assert.deepEqual(rows.slice(1, 4).map(row => row.display), ['Plan title', 'Choose a target', 'A second question']);
  assert.ok(!JSON.stringify(rows).includes('secret prompt'));
});

test('an assistant card belongs to its producer session and time instead of the next carrier', () => {
  const sessions = [
    { conversationId: 'thread:a', messages: [{ _timestamp: 'a-start' }, { _timestamp: 'a-end' }] },
    { conversationId: 'thread:b', messages: [{ _timestamp: 'b-start' }] },
  ];
  const rows = buildPromptNavItems([visible('A', 'a-start'),
    { props: { role: 'assistant', timestamp: 'b-start', displayTs: 'a-end', content: [
      { type: 'tool_use', name: 'request_user_input', input: { questions: [{ question: 'A question' }] } },
    ] } }, visible('B', 'b-start')], sessions);
  assert.equal(rows[1].sessionIdx, 0); assert.equal(rows[1].timestamp, 'a-end');
  assert.equal(rows[1].newSession, undefined); assert.equal(rows[2].newSession, true);
});

test('native navigation rejects prototype and foreign tool names and tolerates streaming shells', () => {
  const rows = buildPromptNavItems([{ props: { role: 'assistant', timestamp: 'fallback', content: [
    ...['constructor', 'toString', '__proto__', 'ExitPlanMode', 'AskUserQuestion'].map(name => ({ type: 'tool_use', name, input: {} })),
    { type: 'tool_use', name: 'update_plan', input: { plan: [{ step: 'Native checklist', status: 'pending' }] } },
    { type: 'tool_use', name: 'request_user_input', input: { questions: 'streaming shell' } },
  ] } }], []);
  assert.deepEqual(rows.map(row => row.kind), ['plan', 'ask']);
  assert.deepEqual(rows.map(row => row.display), ['', '']);
  assert.deepEqual(rows.map(row => row.timestamp), ['fallback', 'fallback']);
});

test('card titles keep the original 80-character cap and plain-prompt dedup does not swallow cards', () => {
  const text = 'long '.repeat(30);
  const rows = buildPromptNavItems([visible('repeat', '1'), visible('repeat', '2'),
    { props: { role: 'assistant', content: [{ type: 'tool_use', name: 'request_user_input', input: { questions: [{ question: text }] } }] } },
    { props: { role: 'assistant', content: [{ type: 'tool_use', name: 'request_user_input', input: { questions: [{ question: text }] } }] } },
  ], []);
  assert.equal(rows.length, 3); assert.equal(rows[1].display, text.trim().slice(0, 80) + '...');
  assert.equal(rows[2].display, rows[1].display); assert.notEqual(rows[1].visibleIdx, rows[2].visibleIdx);
});


test('composer prompt navigation follows original desktop live SDK or hidden PTY layouts', () => {
  for (const isMobile of [false, true]) for (const cliMode of [false, true])
    for (const sdkMode of [false, true]) for (const terminalVisible of [false, true]) {
      assert.equal(shouldUseComposerPromptNav({ isMobile, cliMode, sdkMode, terminalVisible }),
        cliMode && !isMobile && (sdkMode || !terminalVisible));
    }
});
