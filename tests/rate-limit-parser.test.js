import test from 'node:test';
import assert from 'node:assert/strict';

import { extractLatestPlanUsage, parseRateLimitHeaders } from '../src/utils/rateLimitParser.js';

test('parses current Codex subscription and model-specific quota headers', () => {
  const usage = parseRateLimitHeaders({
    'x-codex-active-limit': 'premium',
    'x-codex-bengalfox-limit-name': 'GPT-5.3-Codex-Spark',
    'x-codex-bengalfox-primary-over-secondary-limit-percent': '0',
    'x-codex-bengalfox-primary-reset-after-seconds': '604800',
    'x-codex-bengalfox-primary-reset-at': '1784715581',
    'x-codex-bengalfox-primary-used-percent': '0',
    'x-codex-bengalfox-primary-window-minutes': '10080',
    'x-codex-bengalfox-secondary-reset-after-seconds': '0',
    'x-codex-bengalfox-secondary-reset-at': '',
    'x-codex-bengalfox-secondary-used-percent': '0',
    'x-codex-bengalfox-secondary-window-minutes': '0',
    'x-codex-credits-balance': '',
    'x-codex-credits-has-credits': 'False',
    'x-codex-credits-unlimited': 'False',
    'x-codex-plan-type': 'prolite',
    'x-codex-primary-over-secondary-limit-percent': '0',
    'x-codex-primary-reset-after-seconds': '576219',
    'x-codex-primary-reset-at': '1784687000',
    'x-codex-primary-used-percent': '77',
    'x-codex-primary-window-minutes': '10080',
    'x-codex-safety-buffering-enabled': 'true',
    'x-codex-safety-buffering-faster-model': 'gpt-5.6-luna',
    'x-codex-secondary-reset-after-seconds': '0',
    'x-codex-secondary-reset-at': '',
    'x-codex-secondary-used-percent': '0',
    'x-codex-secondary-window-minutes': '0',
  });

  assert.equal(usage.source, 'codex');
  assert.equal(usage.activeLimit, 'premium');
  assert.equal(usage.planType, 'prolite');
  assert.deepEqual(usage.credits, { hasCredits: false, unlimited: false, balance: null });
  assert.deepEqual(usage.safetyBuffering, { enabled: true, fasterModel: 'gpt-5.6-luna' });
  assert.deepEqual(usage.windows.map((window) => ({
    id: window.id,
    label: window.label,
    utilization: window.utilization,
    windowMinutes: window.windowMinutes,
    resetAt: window.resetAt,
  })), [
    {
      id: 'codex:primary',
      label: 'Codex primary',
      utilization: 0.77,
      windowMinutes: 10080,
      resetAt: 1784687000000,
    },
    {
      id: 'codex_bengalfox:primary',
      label: 'GPT-5.3-Codex-Spark primary',
      utilization: 0,
      windowMinutes: 10080,
      resetAt: 1784715581000,
    },
  ]);
  assert.equal(usage.windows[0].primaryOverSecondaryLimitPercent, 0);
  assert.equal(usage.windows[1].primaryOverSecondaryLimitPercent, 0);
});

test('uses reset-after-seconds when an absolute reset timestamp is absent', () => {
  const before = Date.now();
  const usage = parseRateLimitHeaders({
    'x-codex-primary-used-percent': '25',
    'x-codex-primary-window-minutes': '300',
    'x-codex-primary-reset-after-seconds': '60',
  });
  const after = Date.now();

  assert.ok(usage.windows[0].resetAt >= before + 60000);
  assert.ok(usage.windows[0].resetAt <= after + 60000);
});

test('anchors partial reset-after headers to the response observation time', () => {
  const observedAt = Date.parse('2026-07-15T08:00:00.000Z');
  const usage = parseRateLimitHeaders({
    'x-codex-primary-used-percent': '25',
    'x-codex-primary-reset-after-seconds': '60',
  }, { observedAt });
  assert.equal(usage.windows[0].resetAt, observedAt + 60_000);
});

test('preserves reset-only Codex windows without inventing utilization', () => {
  const observedAt = Date.parse('2026-07-15T08:00:00.000Z');
  const usage = parseRateLimitHeaders({
    'x-codex-secondary-reset-after-seconds': '90',
  }, { observedAt });
  assert.equal(usage.windows.length, 1);
  assert.equal(usage.windows[0].id, 'codex:secondary');
  assert.equal(usage.windows[0].utilization, null);
  assert.equal(usage.windows[0].resetAt, observedAt + 90_000);
});

test('discovers model-specific reset-only windows and anchors OpenAI relative resets', () => {
  const observedAt = Date.parse('2026-07-15T08:00:00.000Z');
  const codex = parseRateLimitHeaders({
    'x-codex-bengalfox-primary-reset-at': '1784715581',
  }, { observedAt });
  assert.equal(codex.windows[0].id, 'codex_bengalfox:primary');
  assert.equal(codex.windows[0].utilization, null);

  const openai = parseRateLimitHeaders({
    'x-ratelimit-reset-requests': '2m',
  }, { observedAt });
  assert.equal(openai.windows[0].resetAt, observedAt + 120_000);
});

test('history reloads produce a stable reset from the entry timestamp', () => {
  const requests = [{
    timestamp: '2026-07-15T08:00:00.000Z',
    response: { headers: {
      'x-codex-primary-used-percent': '25',
      'x-codex-primary-reset-after-seconds': '60',
    } },
  }];
  const first = extractLatestPlanUsage(requests);
  const second = extractLatestPlanUsage(requests);
  assert.equal(first.windows[0].resetAt, Date.parse(requests[0].timestamp) + 60_000);
  assert.equal(second.windows[0].resetAt, first.windows[0].resetAt);
});
