import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createEntrySlimmer,
  createIncrementalSlimmer,
  internMainAgentInput,
  restoreSlimmedEntry,
} from '../src/utils/entry-slim.js';
import { _resetReadPoolForTest } from '../src/utils/readResultPool.js';

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
