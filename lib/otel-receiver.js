/**
 * otel-receiver.js — 轻量级 OTLP HTTP 接收器
 *
 * 接收 Codex CLI 原生发出的 OTel trace 数据（OTLP JSON 格式），
 * 解析 spans 并转换为 cx-viewer 的 entry 格式，写入 JSONL 日志文件。
 *
 * Codex 通过 config.toml [otel] 配置将遥测数据发送到此端点。
 * 支持的数据：API 请求、工具调用、用户提示等。
 */

import { appendFileSync } from 'node:fs';

/**
 * 从 OTLP JSON trace 数据中提取 spans 并转换为 cx-viewer entries
 * @param {object} otlpData - OTLP ExportTraceServiceRequest JSON
 * @returns {Array} cx-viewer entry 数组
 */
export function parseOtlpTraces(otlpData) {
  const entries = [];
  if (!otlpData?.resourceSpans) return entries;

  for (const rs of otlpData.resourceSpans) {
    const resourceAttrs = extractAttributes(rs.resource?.attributes);

    for (const ss of rs.scopeSpans || []) {
      for (const span of ss.spans || []) {
        const entry = spanToEntry(span, resourceAttrs);
        if (entry) entries.push(entry);
      }
    }
  }
  return entries;
}

/**
 * 将单个 OTel span 转换为 cx-viewer entry 数组
 * 一个 span 可能包含多种事件（api_request + tool.call 等），全部提取
 */
function spanToEntry(span, resourceAttrs) {
  const attrs = extractAttributes(span.attributes);
  const events = (span.events || []).map(e => ({
    name: e.name,
    attrs: extractAttributes(e.attributes),
    timeUnixNano: e.timeUnixNano,
  }));

  if (events.length === 0) return null;

  const startNano = BigInt(span.startTimeUnixNano || '0');
  const endNano = BigInt(span.endTimeUnixNano || '0');
  const durationMs = Number((endNano - startNano) / 1000000n);
  const timestamp = new Date(Number(startNano / 1000000n)).toISOString();
  const model = attrs['codex.model'] || attrs['model'] || resourceAttrs['model'] || null;
  const project = resourceAttrs['cx-viewer.project'] || resourceAttrs['service.name'] || 'codex';

  const results = [];

  // API 请求事件
  for (const evt of events.filter(e => e.name === 'codex.api_request')) {
    const a = evt.attrs;
    results.push({
      timestamp,
      project,
      url: `codex://api/${span.name || 'request'}`,
      method: 'POST',
      headers: {},
      body: { model: model || a['model'], _otelSpanName: span.name },
      response: {
        status: parseInt(a['http.response.status_code']) || 200,
        statusText: a['success'] === 'true' ? 'OK' : (a['error.message'] || 'Error'),
        headers: {},
        body: {
          usage: {
            input_tokens: parseInt(a['input_token_count']) || 0,
            output_tokens: parseInt(a['output_token_count']) || 0,
            cache_read_input_tokens: parseInt(a['cached_token_count']) || 0,
          },
          model: model || a['model'],
        },
      },
      duration: parseInt(a['duration_ms']) || durationMs,
      isStream: true,
      mainAgent: true,
      _otelSource: true,
      _otelTraceId: span.traceId,
      _otelSpanId: span.spanId,
    });
  }

  // 工具调用事件
  const toolResultEvents = events.filter(e => e.name === 'codex.tool_result');
  for (const tc of events.filter(e => e.name === 'codex.tool.call')) {
    const a = tc.attrs;
    const toolName = a['tool_name'] || 'unknown';
    const matchResult = toolResultEvents.find(tr => tr.attrs['call_id'] === a['call_id']);
    results.push({
      timestamp: tc.timeUnixNano
        ? new Date(Number(BigInt(tc.timeUnixNano) / 1000000n)).toISOString()
        : timestamp,
      project,
      url: `codex://tool/${toolName}`,
      method: 'TOOL',
      headers: {},
      body: {
        tool_name: toolName,
        tool_input: safeJsonParse(a['arguments']),
        _callId: a['call_id'],
        _source: a['source'],
      },
      response: matchResult ? {
        status: 200, statusText: 'OK', headers: {},
        body: {
          output: safeJsonParse(matchResult.attrs['output']) || matchResult.attrs['output'],
          _outputLength: parseInt(matchResult.attrs['output_length']) || 0,
        },
      } : null,
      duration: parseInt(a['duration_ms'] || matchResult?.attrs['duration_ms']) || 0,
      isStream: false,
      mainAgent: false,
      _otelSource: true,
      _otelTraceId: span.traceId,
    });
  }

  // 用户提示事件
  for (const evt of events.filter(e => e.name === 'codex.user_prompt')) {
    const a = evt.attrs;
    results.push({
      timestamp: evt.timeUnixNano
        ? new Date(Number(BigInt(evt.timeUnixNano) / 1000000n)).toISOString()
        : timestamp,
      project,
      url: 'codex://user_prompt',
      method: 'POST',
      headers: {},
      body: {
        model,
        messages: [{ role: 'user', content: a['prompt'] || '' }],
        _promptLength: parseInt(a['prompt_length']) || 0,
      },
      response: null,
      duration: 0,
      isStream: false,
      mainAgent: true,
      _otelSource: true,
      _otelTraceId: span.traceId,
    });
  }

  return results.length > 0 ? results : null;
}

/**
 * 提取 OTLP attributes 数组为普通对象
 * OTLP 格式: [{ key: 'foo', value: { stringValue: 'bar' } }]
 */
function extractAttributes(attrs) {
  if (!Array.isArray(attrs)) return {};
  const result = {};
  for (const attr of attrs) {
    if (!attr?.key) continue;
    const v = attr.value;
    if (!v) continue;
    if (v.stringValue !== undefined) result[attr.key] = v.stringValue;
    else if (v.intValue !== undefined) result[attr.key] = String(v.intValue);
    else if (v.doubleValue !== undefined) result[attr.key] = String(v.doubleValue);
    else if (v.boolValue !== undefined) result[attr.key] = String(v.boolValue);
    else if (v.arrayValue) result[attr.key] = JSON.stringify(v.arrayValue.values);
    else if (v.kvlistValue) result[attr.key] = JSON.stringify(v.kvlistValue.values);
  }
  return result;
}

/**
 * 将 OTel entries 写入 JSONL 日志文件
 * @param {string} logFile - 日志文件路径
 * @param {Array} entries - cx-viewer entry 数组
 */
export function writeOtelEntries(logFile, entries) {
  if (!logFile || !entries.length) return;
  const lines = entries
    .flat() // spanToEntry 可能返回数组（多个工具调用）
    .filter(Boolean)
    .map(e => JSON.stringify(e) + '\n---\n')
    .join('');
  try {
    appendFileSync(logFile, lines);
  } catch (err) {
    if (process.env.CXV_DEBUG) {
      console.error('[OTel Receiver] Write error:', err.message);
    }
  }
}

function safeJsonParse(s) {
  if (!s || typeof s !== 'string') return s;
  try { return JSON.parse(s); } catch { return s; }
}
