import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRequestSummary, validateRequestSummary } from '../lib/log-v2/request-summary.js';

test('request summary keeps list fields without retaining large request and response bodies', () => {
  const entry = {
    timestamp: '2026-07-15T00:00:00.000Z',
    url: 'https://example.test/v1/responses',
    method: 'POST',
    duration: 42,
    mainAgent: true,
    body: { model: 'gpt-test', instructions: 'x'.repeat(100_000), input: [{ content: 'secret' }] },
    response: { status: 200, body: { usage: { input_tokens: 3, output_tokens: 4 }, output: 'y'.repeat(100_000) } },
  };
  const summary = buildRequestSummary(entry, {
    seq: 1, eventId: 'event', entryKey: 'entry', entryRevision: 1, threadId: 'thread', phase: 'completed',
  });

  assert.equal(validateRequestSummary(summary).ok, true);
  assert.equal(summary.root.url, entry.url);
  assert.equal(summary.body.model, 'gpt-test');
  assert.deepEqual(summary.response.usage, { input_tokens: 3, output_tokens: 4 });
  assert.equal(JSON.stringify(summary).includes('secret'), false);
  assert.equal(JSON.stringify(summary).includes('x'.repeat(100)), false);
  assert.equal(JSON.stringify(summary).includes('y'.repeat(100)), false);
});

test('request summary persists classification without retaining its prompt evidence', () => {
  const titlePrompt = 'Based on the above conversation, generate a short title for the session';
  const summary = buildRequestSummary({
    timestamp: '2026-07-15T00:00:00.000Z',
    url: 'https://example.test/v1/responses',
    mainAgent: true,
    body: { input: [{ role: 'user', content: titlePrompt }] },
  }, {
    seq: 1, eventId: 'event', entryKey: 'entry', entryRevision: 1, threadId: 'thread', phase: 'completed',
  });
  assert.deepEqual(summary.classification, { type: 'Synthetic', subType: 'Title' });
  assert.equal(JSON.stringify(summary).includes(titlePrompt), false);
});
