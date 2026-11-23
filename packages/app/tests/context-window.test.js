import test from 'node:test';
import assert from 'node:assert/strict';
import { computeContextPercent, contextUsageForView, formatContextUsage, nativeContextWindow, nativeContextPercent, sumUsageContextTokens } from '../server/lib/context-rules.js';
import { buildContextWindowEvent } from '../lib/context-watcher.js';
const entry = (window, total = 20100) => ({ _appServerSource: true,
  response: { body: { context_window: window, usage: { input_tokens: 20000, output_tokens: 100, total_tokens: total }, total_usage: { total_tokens: 990000 } } } });

test('the native last-turn window and current usage follow model switches with Codex baseline rounding', () => {
  assert.equal(computeContextPercent({ lastMainAgent: entry(475000) }), 2);
  assert.equal(computeContextPercent({ lastMainAgent: entry(258400) }), 3);
  assert.equal(computeContextPercent({ lastMainAgent: entry(475000) }), 2);
  assert.equal(nativeContextPercent(12000, 475000), 0);
  assert.equal(nativeContextPercent(999999, 475000), 100);
  assert.equal(nativeContextPercent(0, 12000), 100);
});

test('unknown, invalid and raw wire windows never reuse an older native snapshot or guess from a model name', () => {
  const contextWindow = buildContextWindowEvent({ total_tokens: 20100 }, 475000);
  for (const window of [undefined, null, 0, -1, Infinity, '475000', 475000.5]) {
    assert.equal(computeContextPercent({ contextWindow, lastMainAgent: entry(window) }), null);
  }
  const wire = entry(1000000); delete wire._appServerSource; wire.body = { model: 'k3[1m]' };
  assert.equal(nativeContextWindow(wire), null);
  assert.equal(computeContextPercent({ contextWindow, lastMainAgent: wire }), null);
  assert.equal(computeContextPercent({}), null);
  assert.equal(formatContextUsage(20100, null), '20.1K (—)');
  assert.equal(formatContextUsage(0, null), '—');
});

test('server SSE and frontend use the same native window and last-turn total without counting cached input twice', () => {
  const usage = { input_tokens: 20000, output_tokens: 100, total_tokens: 20100, input_tokens_details: { cached_tokens: 19000 } };
  const data = buildContextWindowEvent(usage, 258400);
  assert.equal(data.total_input_tokens, 20000); assert.equal(data.used_percentage, 3);
  assert.equal(computeContextPercent({ contextWindow: data }), 3);
  assert.equal(sumUsageContextTokens(usage), 20100);
  assert.equal(buildContextWindowEvent(usage).used_percentage, null);
  assert.equal(buildContextWindowEvent(usage).context_window_size, null);
});

test('SDK exec context uses a separate native snapshot across live updates and cold entry replay', () => {
  const sdk = { _sdkSource: true, timestamp: '2026-11-23T14:00:00Z',
    body: { metadata: { transport: 'exec', thread_id: 'root', cwd: '/project', instance_key: 'a' } },
    response: { body: { usage: { total_tokens: 4140366 } } } };
  assert.equal(contextUsageForView({ lastMainAgent: sdk }), null);
  assert.equal(computeContextPercent({ lastMainAgent: sdk }), null);
  sdk.response.body.context_usage = { total_tokens: 54985 };
  sdk.response.body.context_window = 475000;
  assert.equal(computeContextPercent({ lastMainAgent: sdk }), 9);
  const live = { source: 'codex-rollout', sessionId: 'root', cwd: '/project', instanceKey: 'a',
    turn_timestamp: '2026-11-23T14:01:00Z', ...buildContextWindowEvent({ total_tokens: 171029 }, 475000) };
  assert.equal(computeContextPercent({ contextWindow: live, lastMainAgent: sdk }), 34);
  assert.equal(sumUsageContextTokens(contextUsageForView({ contextWindow: live, lastMainAgent: sdk })), 171029);
  for (const override of [{ sessionId: 'sibling' }, { cwd: '/other' }, { instanceKey: 'b' }, { turn_timestamp: '2026-11-23T13:59:00Z' }]) {
    assert.equal(computeContextPercent({ contextWindow: { ...live, ...override }, lastMainAgent: sdk }), 9);
  }
  const cold = JSON.parse(JSON.stringify(sdk));
  assert.equal(computeContextPercent({ lastMainAgent: cold }), 9);
  assert.equal(cold.response.body.usage.total_tokens, 4140366, 'accounting remains separate');
  assert.equal(computeContextPercent({ contextWindow: live }), 34);
});
