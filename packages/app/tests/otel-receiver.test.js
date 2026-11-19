import test from 'node:test';
import assert from 'node:assert/strict';

import { parseOtlpTraces } from '../lib/otel-receiver.js';

function attr(key, value) {
  return { key, value: { stringValue: value } };
}

test('OTel prompt mirrors are supplemental while API usage remains MainAgent data', () => {
  const entries = parseOtlpTraces({
    resourceSpans: [{
      resource: { attributes: [attr('service.instance.id', 'otel-session-1')] },
      scopeSpans: [{
        spans: [{
          name: 'request',
          traceId: 'trace',
          spanId: 'span',
          startTimeUnixNano: '1000000',
          endTimeUnixNano: '2000000',
          events: [
            { name: 'codex.api_request', attributes: [attr('input_token_count', '10')] },
            { name: 'codex.user_prompt', attributes: [attr('prompt', 'work')] },
          ],
        }],
      }],
    }],
  }).flat();
  const api = entries.find(entry => entry.url.startsWith('codex://api/'));
  const prompt = entries.find(entry => entry.url === 'codex://user_prompt');
  assert.equal(api.mainAgent, true);
  assert.equal(prompt.mainAgent, false);
  assert.equal(prompt.subAgent, false);
  assert.equal(api._otelSessionId, 'otel-session-1');
  assert.equal(prompt._otelSessionId, 'otel-session-1');
});
