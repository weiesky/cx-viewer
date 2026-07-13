export const LEGACY_OTEL_MARKER = '# >>> CX-Viewer OTel >>>';
export const LEGACY_OTEL_MARKER_END = '# <<< CX-Viewer OTel <<<';
export const OTEL_AUTH_HEADER = 'x-cxv-otel-token';
export const OTEL_TRACE_HEADERS_ENV = 'OTEL_EXPORTER_OTLP_TRACES_HEADERS';
const OTEL_CHILD_ENV_SCRUB_CONFIG = `shell_environment_policy.set.${OTEL_TRACE_HEADERS_ENV}=""`;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a process-local Codex config override for CX Viewer's trace receiver.
 * This avoids adding a second [otel] table to the user's config.toml.
 */
export function getOtelTraceExporterConfigArgs(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length === 0) return [];
  return [
    '-c',
    `otel.trace_exporter={ otlp-http = { protocol = "json", endpoint = ${JSON.stringify(endpoint)} } }`,
    // The exporter needs the header in the Codex process, but project tools do
    // not. A nested `set` override preserves the user's other shell policy while
    // replacing this one variable with an empty value in every subprocess.
    '-c',
    OTEL_CHILD_ENV_SCRUB_CONFIG,
  ];
}

/** Inject the secret through the standard OTLP environment, never child argv. */
export function withOtelTraceAuthHeader(existing, authToken) {
  if (typeof authToken !== 'string' || authToken.length === 0) return existing || '';
  const fields = typeof existing === 'string'
    ? existing.split(',').map(field => field.trim()).filter(Boolean)
    : [];
  const filtered = fields.filter(field => {
    const separator = field.indexOf('=');
    if (separator < 0) return true;
    let key = field.slice(0, separator).trim();
    try { key = decodeURIComponent(key); } catch {}
    return key.toLowerCase() !== OTEL_AUTH_HEADER;
  });
  filtered.push(`${OTEL_AUTH_HEADER}=${encodeURIComponent(authToken)}`);
  return filtered.join(',');
}

function isTraceExporterOverride(value) {
  return typeof value === 'string' && /^\s*otel\.trace_exporter\s*=/.test(value);
}

function isOtelChildEnvScrubOverride(value) {
  return typeof value === 'string'
    && value.trim().startsWith(`shell_environment_policy.set.${OTEL_TRACE_HEADERS_ENV}=`);
}

/** Keep exactly one CX Viewer trace exporter override, with final precedence. */
export function appendOtelTraceExporterConfigArgsOnce(args = [], otelConfigArgs = []) {
  const next = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-c' && (isTraceExporterOverride(args[i + 1])
        || isOtelChildEnvScrubOverride(args[i + 1]))) {
      i++;
      continue;
    }
    next.push(args[i]);
  }
  return otelConfigArgs.length > 0 ? [...next, ...otelConfigArgs] : next;
}

/** Remove only the temporary block written by CX Viewer versions <= 1.0.8. */
export function stripLegacyOtelConfigBlock(content) {
  if (typeof content !== 'string' || !content.includes(LEGACY_OTEL_MARKER)) {
    return { content, removed: false };
  }

  const pattern = new RegExp(
    `(?:^|\\r?\\n)${escapeRegExp(LEGACY_OTEL_MARKER)}\\r?\\n[\\s\\S]*?\\r?\\n${escapeRegExp(LEGACY_OTEL_MARKER_END)}(?=\\r?\\n|$)`,
    'g',
  );
  let removed = false;
  let next = content.replace(pattern, (match) => {
    removed = true;
    return match.startsWith('\r\n') ? '\r\n' : match.startsWith('\n') ? '\n' : '';
  });

  if (!removed) return { content, removed: false };
  next = next.replace(/^(?:\r?\n){2,}/, (match) => match.includes('\r\n') ? '\r\n' : '\n');
  return { content: next, removed: true };
}
