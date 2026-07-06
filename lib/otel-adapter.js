/**
 * OpenTelemetry Adapter - 网络报文追踪模块
 * 将拦截的 Codex 网络请求转换为 OTel Traces 并通过 OTLP 导出
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import resourcesPkg from '@opentelemetry/resources';
import semConvPkg from '@opentelemetry/semantic-conventions';
import otelApi from '@opentelemetry/api';

const { Resource } = resourcesPkg;
const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_SERVICE_INSTANCE_ID } = semConvPkg;
const { trace, SpanKind, SpanStatusCode } = otelApi;

// OTel 配置
const OTEL_COLLECTOR_URL = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
const ENABLE_OTEL = process.env.CXV_OTEL_ENABLED !== '0'; // 默认开启

// 当前追踪会话ID
let _traceSessionId = null;
let _sdk = null;
let _tracer = null;

/**
 * 初始化 OTel SDK
 */
export function initOtelAdapter(projectName, sessionId) {
  if (!ENABLE_OTEL) return false;

  _traceSessionId = sessionId || generateSessionId();

  try {
    const resource = new Resource({
      [SEMRESATTRS_SERVICE_NAME]: 'cx-viewer',
      [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version || '2.0.0',
      [SEMRESATTRS_SERVICE_INSTANCE_ID]: _traceSessionId,
      'cx-viewer.project': projectName || 'unknown',
      'cx-viewer.session': _traceSessionId,
    });

    const traceExporter = new OTLPTraceExporter({
      url: OTEL_COLLECTOR_URL,
      headers: {},
    });

    _sdk = new NodeSDK({
      resource,
      traceExporter,
      autoDetectResources: false,
    });

    _sdk.start();
    _tracer = trace.getTracer('cx-viewer-network', '2.0.0');

    process.on('SIGINT', shutdownOtel);
    process.on('SIGTERM', shutdownOtel);

    return true;
  } catch (err) {
    console.error('[OTel Adapter] Failed to initialize:', err.message);
    return false;
  }
}

/**
 * 生成会话ID
 */
function generateSessionId() {
  return `cxv-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 创建网络请求 Span
 */
export function createRequestSpan(requestEntry) {
  if (!_tracer) return null;

  const {
    url,
    method,
    headers,
    body,
    timestamp,
    project,
    mainAgent,
    teammate,
    teamName,
    isStream,
    isHeartbeat,
    isCountTokens,
  } = requestEntry;

  if (isHeartbeat && process.env.CXV_OTEL_SKIP_HEARTBEAT === '1') return null;

  const spanName = `${method} ${getUrlPath(url)}`;
  const startTime = timestamp ? new Date(timestamp).getTime() : Date.now();

  const span = _tracer.startSpan(spanName, {
    kind: SpanKind.CLIENT,
    startTime,
    attributes: {
      'http.request.method': method,
      'http.request.url': url,
      'http.request.headers': JSON.stringify(sanitizeHeaders(headers)),
      'http.request.body.size': body ? JSON.stringify(body).length : 0,

      'cx.codex.main_agent': mainAgent || false,
      'cx.codex.is_stream': isStream || false,
      'cx.codex.is_heartbeat': isHeartbeat || false,
      'cx.codex.is_count_tokens': isCountTokens || false,
      'cx.codex.project': project || 'unknown',

      ...(teammate && { 'cx.codex.teammate': teammate }),
      ...(teamName && { 'cx.codex.team_name': teamName }),

      ...(body?.model && { 'cx.codex.model': body.model }),
      ...(body?.stream !== undefined && { 'cx.codex.stream_param': body.stream }),
      ...(body?.messages && { 'cx.codex.message_count': body.messages.length }),
      ...(body?.tools && { 'cx.codex.tool_count': body.tools.length }),
    },
  });

  return span;
}

/**
 * 完成 Span 并记录响应
 */
export function completeRequestSpan(span, requestEntry) {
  if (!span) return;

  const { response, duration } = requestEntry;
  const endTime = Date.now();

  try {
    if (response) {
      span.setAttribute('http.response.status_code', response.status);
      span.setAttribute('http.response.headers', JSON.stringify(response.headers || {}));
      span.setAttribute('http.response.body.size', response.body ? JSON.stringify(response.body).length : 0);

      if (response.status >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: response.statusText || `HTTP ${response.status}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      if (response.body) {
        const body = response.body;
        if (body.usage) {
          span.setAttribute('cx.codex.usage.input_tokens', body.usage.input_tokens || 0);
          span.setAttribute('cx.codex.usage.output_tokens', body.usage.output_tokens || 0);
          span.setAttribute('cx.codex.usage.total_tokens', body.usage.total_tokens || 0);
        }
        if (body.stop_reason) {
          span.setAttribute('cx.codex.stop_reason', body.stop_reason);
        }
        if (body.model) {
          span.setAttribute('cx.codex.response_model', body.model);
        }
      }
    }

    if (duration) {
      span.setAttribute('http.request.duration_ms', duration);
    }

    span.end(endTime);
  } catch (err) {
    span.recordException(err);
    span.end(endTime);
  }
}

/**
 * 记录流式响应事件
 */
export function recordStreamEvent(span, event) {
  if (!span) return;

  const eventType = event.type || 'unknown';
  span.addEvent(`stream.${eventType}`, {
    'cx.codex.event_type': eventType,
    'cx.codex.event_data': JSON.stringify(event).slice(0, 1000),
  });
}

/**
 * 脱敏 Headers
 */
function sanitizeHeaders(headers) {
  if (!headers) return {};
  const safe = { ...headers };
  const sensitive = ['authorization', 'x-api-key', 'cookie', 'x-auth-token'];
  for (const key of Object.keys(safe)) {
    if (sensitive.includes(key.toLowerCase())) {
      const val = safe[key];
      safe[key] = val?.length > 12 ? `${val.slice(0, 8)}****${val.slice(-4)}` : '****';
    }
  }
  return safe;
}

/**
 * 提取 URL path
 */
function getUrlPath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * 关闭 OTel SDK
 */
export function shutdownOtel() {
  if (_sdk) {
    _sdk.shutdown().catch(() => {});
    _sdk = null;
    _tracer = null;
  }
}

/**
 * 获取当前会话ID
 */
export function getTraceSessionId() {
  return _traceSessionId;
}

/**
 * 检查 OTel 是否启用
 */
export function isOtelEnabled() {
  return ENABLE_OTEL && _tracer !== null;
}

export default {
  initOtelAdapter,
  createRequestSpan,
  completeRequestSpan,
  recordStreamEvent,
  shutdownOtel,
  getTraceSessionId,
  isOtelEnabled,
};
