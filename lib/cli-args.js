export const CODEX_BYPASS_FLAG = '--dangerously-bypass-approvals-and-sandbox';

export const DEFAULT_REASONING_SUMMARY = 'detailed';

const LEGACY_BYPASS_FLAGS = new Set([
  '-d',
  '--d',
  '--dangerously-skip-permissions',
]);

const LEGACY_ALLOW_BYPASS_FLAGS = new Set([
  '--ad',
  '--allow-dangerously-skip-permissions',
]);

function translateLegacyCommandAlias(args) {
  if (args.length === 0) return args;

  const [first, ...rest] = args;
  if (first === 'continue' || first === '--continue') {
    return ['resume', '--last', ...rest];
  }
  if (first === '-r' || first === '--resume') {
    return ['resume', ...rest];
  }
  return args;
}

export function normalizeCodexArgs(rawArgs = []) {
  const args = translateLegacyCommandAlias(rawArgs);
  const codexArgs = [];
  let bypassPermissions = false;
  let allowBypassToggle = false;

  for (const arg of args) {
    if (LEGACY_BYPASS_FLAGS.has(arg)) {
      codexArgs.push(CODEX_BYPASS_FLAG);
      bypassPermissions = true;
      continue;
    }

    if (LEGACY_ALLOW_BYPASS_FLAGS.has(arg)) {
      allowBypassToggle = true;
      continue;
    }

    codexArgs.push(arg);
  }

  return {
    codexArgs,
    bypassPermissions,
    allowBypassToggle,
  };
}

export function hasBypassPermissions(args = []) {
  return args.includes(CODEX_BYPASS_FLAG);
}

/**
 * CX Viewer always requests readable reasoning summaries when it launches
 * Codex. Keep this internal so users do not need extra environment or config.
 */
export function getReasoningSummaryConfigArgs() {
  return ['-c', `model_reasoning_summary="${DEFAULT_REASONING_SUMMARY}"`];
}
