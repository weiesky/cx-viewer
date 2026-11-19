import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendOtelTraceExporterConfigArgsOnce,
  getOtelTraceExporterConfigArgs,
  stripLegacyOtelConfigBlock,
  withOtelTraceAuthHeader,
} from '../lib/otel-config.js';

test('OTel receiver is passed as a process-local Codex config override', () => {
  assert.deepEqual(getOtelTraceExporterConfigArgs('http://127.0.0.1:7012'), [
    '-c',
    'otel.trace_exporter={ otlp-http = { protocol = "json", endpoint = "http://127.0.0.1:7012" } }',
    '-c',
    'shell_environment_policy.set.OTEL_EXPORTER_OTLP_TRACES_HEADERS=""',
  ]);
  assert.deepEqual(getOtelTraceExporterConfigArgs(''), []);
  assert.equal(JSON.stringify(getOtelTraceExporterConfigArgs('http://127.0.0.1:7012')).includes('secret-token'), false);
  assert.equal(
    withOtelTraceAuthHeader('tenant=one,x-cxv-otel-token=stale', 'fresh-token'),
    'tenant=one,x-cxv-otel-token=fresh-token',
  );
});

test('OTel child argv contains exactly one final trace exporter in bridge and fallback layouts', () => {
  const otel = getOtelTraceExporterConfigArgs('http://127.0.0.1:7012');
  const stale = ['-c', 'otel.trace_exporter="none"'];
  const bridge = appendOtelTraceExporterConfigArgsOnce(
    ['-c', 'model_reasoning_summary="detailed"', ...stale, '--remote', 'ws://127.0.0.1:9000'],
    otel,
  );
  const fallback = appendOtelTraceExporterConfigArgsOnce(
    ['-c', 'model_reasoning_summary="detailed"', ...stale],
    otel,
  );
  for (const args of [bridge, fallback]) {
    assert.equal(args.filter(arg => arg.startsWith('otel.trace_exporter=')).length, 1);
    assert.equal(args.filter(arg => arg.startsWith(
      'shell_environment_policy.set.OTEL_EXPORTER_OTLP_TRACES_HEADERS=',
    )).length, 1);
    assert.deepEqual(args.slice(-otel.length), otel);
  }
  assert.equal(bridge.includes('--remote'), true);
  assert.equal(fallback.includes('--remote'), false);
});

test('legacy cleanup preserves the user-owned otel table', () => {
  const original = [
    'model = "gpt-test"',
    '',
    '[otel]',
    'log_user_prompt = true',
    '',
    '# >>> CX-Viewer OTel >>>',
    '[otel]',
    'trace_exporter = { otlp-http = { endpoint = "http://127.0.0.1:7012" } }',
    '# <<< CX-Viewer OTel <<<',
    '',
    '[features]',
    'hooks = true',
    '',
  ].join('\n');

  const result = stripLegacyOtelConfigBlock(original);
  assert.equal(result.removed, true);
  assert.match(result.content, /\[otel\]\nlog_user_prompt = true/);
  assert.match(result.content, /\[features\]\nhooks = true/);
  assert.equal(result.content.includes('CX-Viewer OTel'), false);
  assert.equal(result.content.includes('trace_exporter'), false);
});

test('legacy cleanup does not alter unmarked or incomplete config blocks', () => {
  const userConfig = '[otel]\ntrace_exporter = "none"\n';
  assert.deepEqual(stripLegacyOtelConfigBlock(userConfig), {
    content: userConfig,
    removed: false,
  });

  const incomplete = '# >>> CX-Viewer OTel >>>\n[otel]\n';
  assert.deepEqual(stripLegacyOtelConfigBlock(incomplete), {
    content: incomplete,
    removed: false,
  });
});
