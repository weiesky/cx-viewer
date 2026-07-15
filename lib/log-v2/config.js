const WRITE_MODES = Object.freeze(['v1', 'dual', 'v2']);
const READ_MODES = Object.freeze(['v1', 'v2']);

function parseMode(value, allowed, fallback, variableName) {
  if (value == null || String(value).trim() === '') return fallback;

  const normalized = String(value).trim().toLowerCase();
  if (!allowed.includes(normalized)) {
    throw new TypeError(
      `${variableName} must be one of ${allowed.join(', ')}; received ${JSON.stringify(value)}`,
    );
  }
  return normalized;
}

function parseNonNegativeNumber(value, fallback, variableName) {
  if (value == null || String(value).trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new TypeError(`${variableName} must be a non-negative number; received ${JSON.stringify(value)}`);
  }
  return parsed;
}

function parsePositiveInteger(value, fallback, variableName) {
  const parsed = parseNonNegativeNumber(value, fallback, variableName);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new TypeError(`${variableName} must be a positive safe integer; received ${JSON.stringify(value)}`);
  }
  return parsed;
}

function parsePercent(value, fallback, variableName) {
  const parsed = parseNonNegativeNumber(value, fallback, variableName);
  if (parsed > 100) throw new TypeError(`${variableName} must be between 0 and 100; received ${JSON.stringify(value)}`);
  return parsed;
}

function parseBoolean(value, fallback, variableName) {
  if (value == null || String(value).trim() === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new TypeError(`${variableName} must be a boolean; received ${JSON.stringify(value)}`);
}

/**
 * Resolves log-store selection once during process startup.
 *
 * Callers should retain the returned object instead of reading process.env for
 * each event. Changing the environment therefore takes effect after restart,
 * which keeps dual-write/read comparison deterministic.
 */
export function resolveLogV2Config(env = process.env, defaults = {}) {
  const configured = (variable, field) => env[variable] == null || String(env[variable]).trim() === ''
    ? defaults[field]
    : env[variable];
  return Object.freeze({
    writeMode: parseMode(configured('CXV_LOG_WRITE_MODE', 'writeMode'), WRITE_MODES, 'v1', 'CXV_LOG_WRITE_MODE'),
    readMode: parseMode(configured('CXV_LOG_READ_MODE', 'readMode'), READ_MODES, 'v1', 'CXV_LOG_READ_MODE'),
    minFreeBytes: parseNonNegativeNumber(
      configured('CXV_LOG_V2_MIN_FREE_BYTES', 'minFreeBytes'),
      512 * 1024 * 1024,
      'CXV_LOG_V2_MIN_FREE_BYTES',
    ),
    minFreePercent: parsePercent(configured('CXV_LOG_V2_MIN_FREE_PERCENT', 'minFreePercent'), 5, 'CXV_LOG_V2_MIN_FREE_PERCENT'),
    failureLimit: parsePositiveInteger(configured('CXV_LOG_V2_FAILURE_LIMIT', 'failureLimit'), 3, 'CXV_LOG_V2_FAILURE_LIMIT'),
    gateFile: typeof configured('CXV_LOG_V2_GATE_FILE', 'gateFile') === 'string'
      && configured('CXV_LOG_V2_GATE_FILE', 'gateFile').trim()
      ? configured('CXV_LOG_V2_GATE_FILE', 'gateFile').trim()
      : null,
    projectV1: parseBoolean(configured('CXV_LOG_V2_PROJECT_V1', 'projectV1'), true, 'CXV_LOG_V2_PROJECT_V1'),
  });
}

export { READ_MODES, WRITE_MODES };
