import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createEntrySlimmer,
  createIncrementalSlimmer,
  inheritToolSnapshotOnDedup,
  internMainAgentInput,
  restoreSlimmedEntry,
} from '../src/utils/entry-slim.js';
import { _resetReadPoolForTest } from '../src/utils/readResultPool.js';
import { isPostClearCheckpoint } from '../src/utils/clearCheckpoint.js';

const isMainAgent = entry => entry?.mainAgent === true && !entry?.teammate;

function makeEntry(name, input, overrides = {}) {
  return {
    mainAgent: true,
    timestamp: `2026-07-12T00:00:0${input.length}.000Z`,
    body: {
      input,
      instructions: `instructions-${name}`,
      tools: [{ name: `tool-${name}`, description: `description-${name}` }],
      metadata: { user_id: 'user-1', keep: `metadata-${name}` },
      tool_choice: { type: 'tool', name: `tool-${name}` },
    },
    ...overrides,
  };
}

test('batch slimmer migrates cumulative messages behavior to MainAgent input only', () => {
  const firstInput = [{ role: 'user', content: 'one' }, { role: 'assistant', content: 'two' }];
  const finalInput = [...firstInput, { role: 'user', content: 'three' }];
  const first = makeEntry('first', firstInput);
  const subAgent = makeEntry('sub', [{ role: 'user', content: 'sub' }], { mainAgent: false, subAgent: true });
  const last = makeEntry('last', finalInput);
  const firstFields = {
    instructions: first.body.instructions,
    tools: first.body.tools,
    metadata: first.body.metadata,
    toolChoice: first.body.tool_choice,
  };
  const subBody = subAgent.body;
  const entries = [first, subAgent, last];
  const slimmer = createEntrySlimmer(isMainAgent);

  entries.forEach((entry, index) => slimmer.process(entry, entries, index));
  slimmer.finalize(entries);

  assert.equal(entries[0]._slimmed, true);
  assert.deepEqual(entries[0].body.input, []);
  assert.equal(entries[0].body.instructions, firstFields.instructions);
  assert.equal(entries[0].body.tools, firstFields.tools);
  assert.equal(entries[0].body.metadata, firstFields.metadata);
  assert.equal(entries[0].body.tool_choice, firstFields.toolChoice);
  assert.equal(entries[1].body, subBody);
  assert.equal(entries[1]._slimmed, undefined);
  assert.equal(entries[2].body.input, finalInput);

  const restored = restoreSlimmedEntry(entries[0], entries);
  assert.deepEqual(restored.body.input, firstInput);
  assert.equal(restored.body.instructions, firstFields.instructions);
  assert.equal(restored.body.tools, firstFields.tools);
  assert.equal(restored.body.metadata, firstFields.metadata);
  assert.equal(restored.body.tool_choice, firstFields.toolChoice);
});

test('incremental slimmer leaves non-MainAgent input and all non-input fields untouched', () => {
  const requests = [];
  const slimmer = createIncrementalSlimmer(isMainAgent);
  const first = makeEntry('first', [{ role: 'user', content: 'one' }]);
  slimmer.processEntry(first, requests, 0);
  requests.push(first);

  const subAgent = makeEntry('sub', [{ role: 'user', content: 'sub' }], { mainAgent: false, teammate: 'researcher' });
  const subBody = subAgent.body;
  slimmer.processEntry(subAgent, requests, 1);
  requests.push(subAgent);
  assert.equal(requests[0]._slimmed, undefined);
  assert.equal(requests[1].body, subBody);

  const last = makeEntry('last', [
    { role: 'user', content: 'one' },
    { role: 'assistant', content: 'two' },
  ]);
  slimmer.processEntry(last, requests, 2);
  requests.push(last);

  assert.equal(requests[0]._slimmed, true);
  assert.deepEqual(requests[0].body.input, []);
  assert.equal(requests[0].body.instructions, 'instructions-first');
  assert.deepEqual(requests[0].body.tools, [{ name: 'tool-first', description: 'description-first' }]);
  assert.equal(requests[1].body, subBody);
});

function makeCurrentLayoutEntry(name, conversationInput, tools = null) {
  const input = [];
  if (tools) input.push({ type: 'additional_tools', tools });
  input.push(...conversationInput);
  return {
    mainAgent: true,
    _sessionId: 'session-current-layout',
    body: {
      input,
      instructions: `instructions-${name}`,
      metadata: { user_id: 'user-1', thread_id: 'thread-current-layout' },
    },
  };
}

test('batch slimmer rolls additional_tools forward when later frames omit the declaration', () => {
  const declared = [{ name: 'exec', description: 'Run code.' }, { name: 'wait' }];
  const first = makeCurrentLayoutEntry('first', [{ role: 'user', content: 'one' }], declared);
  const second = makeCurrentLayoutEntry('second', [
    { role: 'user', content: 'one' },
    { role: 'assistant', content: 'two' },
  ]);
  const entries = [first, second];
  const slimmer = createEntrySlimmer(isMainAgent);

  entries.forEach((entry, index) => slimmer.process(entry, entries, index));
  slimmer.finalize(entries);

  assert.equal(entries[0]._slimmed, true);
  assert.equal(entries[0]._loadedTools, undefined);
  assert.equal(entries[1]._loadedTools, declared);
});

test('incremental slimmer keeps one rolling tool snapshot on the latest MainAgent frame', () => {
  const declared = [{ name: 'exec' }, { name: 'collaboration' }];
  const requests = [];
  const slimmer = createIncrementalSlimmer(isMainAgent);
  const first = makeCurrentLayoutEntry('first', [{ role: 'user', content: 'one' }], declared);
  slimmer.processEntry(first, requests, 0);
  requests.push(first);

  const second = makeCurrentLayoutEntry('second', [
    { role: 'user', content: 'one' },
    { role: 'assistant', content: 'two' },
  ]);
  slimmer.processEntry(second, requests, 1);
  requests.push(second);

  const third = makeCurrentLayoutEntry('third', [
    { role: 'user', content: 'one' },
    { role: 'assistant', content: 'two' },
    { role: 'user', content: 'three' },
  ]);
  slimmer.processEntry(third, requests, 2);
  requests.push(third);

  assert.equal(requests[0]._loadedTools, undefined);
  assert.equal(requests[1]._loadedTools, undefined);
  assert.equal(requests[2]._loadedTools, declared);
});

test('dedup replacement preserves a rolling tool snapshot but respects explicit empty tools', () => {
  const previous = makeCurrentLayoutEntry('in-progress', [{ role: 'user', content: 'one' }]);
  previous._loadedTools = [{ name: 'exec' }];
  const completed = makeCurrentLayoutEntry('completed', [{ role: 'user', content: 'one' }]);
  inheritToolSnapshotOnDedup(previous, completed);
  assert.deepEqual(completed._loadedTools, previous._loadedTools);

  const cleared = makeCurrentLayoutEntry('cleared', [{ role: 'user', content: 'one' }], []);
  inheritToolSnapshotOnDedup(previous, cleared);
  assert.equal(cleared._loadedTools, undefined);
});

test('slimming preserves a bounded context compaction marker', () => {
  const compaction = { type: 'compaction', encrypted_content: 'ciphertext' };
  const first = makeEntry('first', [compaction]);
  const last = makeEntry('last', [compaction, { role: 'user', content: 'later' }]);
  const entries = [first, last];
  const batch = createEntrySlimmer(isMainAgent);
  entries.forEach((entry, index) => batch.process(entry, entries, index));
  batch.finalize(entries);
  assert.deepEqual(entries[0]._contextCompaction, {
    present: true, count: 1, summary: null, truncated: false,
  });
  assert.equal(JSON.stringify(entries[0]._contextCompaction).includes('ciphertext'), false);

  const requests = [];
  const incremental = createIncrementalSlimmer(isMainAgent);
  const liveFirst = makeEntry('live-first', [compaction]);
  incremental.processEntry(liveFirst, requests, 0);
  requests.push(liveFirst);
  const liveLast = makeEntry('live-last', [compaction, { role: 'user', content: 'later' }]);
  incremental.processEntry(liveLast, requests, 1);
  assert.deepEqual(requests[0]._contextCompaction, entries[0]._contextCompaction);
});

test('slimming preserves a post-clear checkpoint marker', () => {
  const clear = makeEntry('clear', [{
    role: 'user',
    content: [{ type: 'text', text: '<command-name>/clear</command-name>' }],
  }]);
  clear._isCheckpoint = true;
  const later = makeEntry('later', [
    { role: 'user', content: 'fresh' },
    { role: 'assistant', content: 'ok' },
  ]);
  const entries = [clear, later];
  const slimmer = createEntrySlimmer(isMainAgent);
  entries.forEach((entry, index) => slimmer.process(entry, entries, index));
  slimmer.finalize(entries);
  assert.equal(entries[0]._slimmed, true);
  assert.equal(entries[0]._postClearCheckpoint, true);
  assert.equal(entries[0].body.input.length, 0);
  assert.equal(isPostClearCheckpoint(entries[0], 20), true);
});

test('slimmer never treats an authoritative session_id change as a transient frame', () => {
  const first = makeEntry('session-a', Array.from({ length: 6 }, (_, i) => ({ role: 'user', content: `${i}` })));
  first.body.metadata.session_id = 'session-a';
  const second = makeEntry('session-b', [{ role: 'user', content: 'new' }]);
  second.body.metadata.session_id = 'session-b';
  const entries = [first, second];
  const batch = createEntrySlimmer(isMainAgent);
  entries.forEach((entry, index) => batch.process(entry, entries, index));
  batch.finalize(entries);
  assert.equal(first._slimmed, undefined);

  const requests = [makeEntry('live-a', first.body.input)];
  requests[0].body.metadata.session_id = 'session-a';
  const live = createIncrementalSlimmer(isMainAgent);
  live.processEntry(requests[0], [], 0);
  const liveSecond = makeEntry('live-b', [{ role: 'user', content: 'new' }]);
  liveSecond.body.metadata.session_id = 'session-b';
  live.processEntry(liveSecond, requests, 1);
  assert.equal(requests[0]._slimmed, undefined);
});

test('batch process and finalize share the same in-progress transient decision', () => {
  const first = makeEntry('first', Array.from({ length: 6 }, (_, i) => ({ role: 'user', content: `${i}` })));
  const transient = makeEntry('transient', [{ role: 'user', content: 'partial' }], { inProgress: true });
  const last = makeEntry('last', Array.from({ length: 7 }, (_, i) => ({ role: 'user', content: `${i}` })));
  const entries = [first, transient, last];
  const slimmer = createEntrySlimmer(isMainAgent);
  entries.forEach((entry, index) => slimmer.process(entry, entries, index));
  slimmer.finalize(entries);
  assert.notEqual(entries[0]._fullEntryIndex, -1);
  assert.equal(entries[0]._fullEntryIndex, 2);
});

test('restore rejects a full-entry pointer from another session', () => {
  const slimmed = makeEntry('slimmed', []);
  slimmed._slimmed = true;
  slimmed._messageCount = 1;
  slimmed._fullEntryIndex = 1;
  slimmed._sessionId = 'epoch-a';
  const other = makeEntry('other', [{ role: 'user', content: 'secret' }]);
  other._sessionId = 'epoch-b';
  assert.equal(restoreSlimmedEntry(slimmed, [slimmed, other]), slimmed);
});

test('raw input interning is gated to MainAgent and does not pool tools or instructions', () => {
  _resetReadPoolForTest();
  const repeatedResult = 'x'.repeat(300);
  const input = [{ role: 'user', content: [{ type: 'tool_result', content: repeatedResult }] }];
  const first = makeEntry('first', input);
  const second = makeEntry('second', structuredClone(input));
  const subAgent = makeEntry('sub', structuredClone(input), { mainAgent: false, subAgent: true });

  assert.equal(internMainAgentInput(first, isMainAgent), first);
  const internedSecond = internMainAgentInput(second, isMainAgent);
  assert.notEqual(internedSecond, second);
  assert.equal(internedSecond.body.tools, second.body.tools);
  assert.equal(internedSecond.body.instructions, second.body.instructions);
  assert.equal(Object.hasOwn(internedSecond.body, '_cxvTools'), false);
  assert.equal(Object.hasOwn(internedSecond.body, '_cxvInstructions'), false);
  assert.equal(internMainAgentInput(subAgent, isMainAgent), subAgent);
  _resetReadPoolForTest();
});
