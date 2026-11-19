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

export function resolveLogV2Config(env = process.env, defaults = {}) {
  const configured = (variable, field) => env[variable] == null || String(env[variable]).trim() === ''
    ? defaults[field]
    : env[variable];
  return Object.freeze({
    minFreeBytes: parseNonNegativeNumber(
      configured('CXV_LOG_V2_MIN_FREE_BYTES', 'minFreeBytes'),
      512 * 1024 * 1024,
      'CXV_LOG_V2_MIN_FREE_BYTES',
    ),
    minFreePercent: parsePercent(configured('CXV_LOG_V2_MIN_FREE_PERCENT', 'minFreePercent'), 5, 'CXV_LOG_V2_MIN_FREE_PERCENT'),
    failureLimit: parsePositiveInteger(configured('CXV_LOG_V2_FAILURE_LIMIT', 'failureLimit'), 3, 'CXV_LOG_V2_FAILURE_LIMIT'),
  });
}
