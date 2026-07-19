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

test('request summary persists direct OpenAI Responses as Master', () => {
  const summary = buildRequestSummary({
    timestamp: '2026-07-15T00:00:00.000Z',
    url: 'https://api.openai.com/v1/responses',
    mainAgent: true,
    subAgent: true,
    teammate: 'legacy-reviewer',
    body: { input: [] },
  }, {
    seq: 2, eventId: 'event-2', entryKey: 'entry-2', entryRevision: 1, threadId: 'thread', phase: 'completed',
  });
  assert.deepEqual(summary.classification, { type: 'Master', subType: null });
});

test('request summary keeps only usage response headers for lightweight usage display', () => {
  const summary = buildRequestSummary({
    timestamp: '2026-07-16T00:00:00.000Z',
    url: 'https://example.test/v1/responses',
    response: {
      status: 200,
      headers: {
        'X-Codex-Active-Limit': 'premium',
        'x-codex-plan-type': 'prolite',
        'x-codex-primary-used-percent': '19',
        'x-codex-primary-window-minutes': '10080',
        'x-codex-primary-reset-at': '1784505600',
        'x-codex-bengalfox-limit-name': 'GPT-5.3-Codex-Spark',
        'x-codex-bengalfox-primary-used-percent': '0',
        'x-ratelimit-remaining-tokens': '1234',
        'anthropic-ratelimit-unified-5h-utilization': '0.25',
        'anthropic-ratelimit-unified-private-auth-token': 'private-prefix-secret',
        'anthropic-ratelimit-unified-status': 'x'.repeat(513),
        'x-codex-credits-balance': { secret: 'nested-secret' },
        authorization: 'Bearer secret',
        'set-cookie': 'session=secret',
        'x-codex-turn-metadata': 'private-metadata',
        'x-codex-installation-id': 'private-installation',
      },
    },
  }, {
    seq: 1, eventId: 'event', entryKey: 'entry', entryRevision: 1, threadId: 'thread', phase: 'completed',
  });

  assert.deepEqual(summary.response.headers, {
    'x-codex-active-limit': 'premium',
    'x-codex-plan-type': 'prolite',
    'x-codex-primary-used-percent': '19',
    'x-codex-primary-window-minutes': '10080',
    'x-codex-primary-reset-at': '1784505600',
    'x-codex-bengalfox-limit-name': 'GPT-5.3-Codex-Spark',
    'x-codex-bengalfox-primary-used-percent': '0',
    'x-ratelimit-remaining-tokens': '1234',
    'anthropic-ratelimit-unified-5h-utilization': '0.25',
  });
  assert.equal(JSON.stringify(summary).includes('secret'), false);
  assert.equal(JSON.stringify(summary).includes('private-metadata'), false);
  assert.equal(JSON.stringify(summary).includes('private-installation'), false);
  assert.equal(JSON.stringify(summary).includes('private-prefix-secret'), false);
  assert.equal(JSON.stringify(summary).includes('nested-secret'), false);
});

test('request summary validation rejects non-usage or non-normalized response headers', () => {
  const base = buildRequestSummary({
    timestamp: '2026-07-16T00:00:00.000Z',
    url: 'https://example.test/v1/responses',
    response: { status: 200, headers: { 'x-codex-primary-used-percent': '19' } },
  }, {
    seq: 1, eventId: 'event', entryKey: 'entry', entryRevision: 1, threadId: 'thread', phase: 'completed',
  });
  assert.equal(validateRequestSummary(base).ok, true);
  assert.equal(validateRequestSummary({
    ...base,
    response: { ...base.response, headers: { ...base.response.headers, authorization: 'Bearer secret' } },
  }).ok, false);
  assert.equal(validateRequestSummary({
    ...base,
    response: { ...base.response, headers: { 'X-Codex-Primary-Used-Percent': '19' } },
  }).ok, false);
});
