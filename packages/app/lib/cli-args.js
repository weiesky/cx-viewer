export const CODEX_BYPASS_FLAG = '--dangerously-bypass-approvals-and-sandbox';

export const DEFAULT_REASONING_SUMMARY = 'detailed';
export const DEFAULT_MODE_REQUEST_USER_INPUT_CONFIG = 'features.default_mode_request_user_input=true';

const LEGACY_BYPASS_FLAGS = new Set([
  '-d',
  '--d',
  '--dangerously-skip-permissions',
]);

const LEGACY_ALLOW_BYPASS_FLAGS = new Set([
  '--ad',
  '--allow-dangerously-skip-permissions',
]);

const GLOBAL_FLAGS_WITH_VALUE = new Set([
  '-c', '--config', '-m', '--model', '-p', '--profile', '-C', '--cd',
  '-a', '--ask-for-approval', '-s', '--sandbox', '--color', '--oss-provider',
  '--remote', '--enable', '--disable', '--remote-auth-token-env',
  '--local-provider', '--add-dir',
]);
const VARIADIC_GLOBAL_FLAGS = new Set(['-i', '--image']);
const CODEX_SUBCOMMANDS = new Set([
  'resume', 'exec', 'e', 'review', 'login', 'logout', 'mcp', 'mcp-server',
  'app-server', 'exec-server', 'completion', 'sandbox', 'debug', 'apply', 'a', 'cloud',
  'plugin', 'remote-control', 'app', 'update', 'doctor', 'archive', 'delete',
  'unarchive', 'fork', 'features', 'help',
]);
const LEGACY_COMMAND_ALIASES = new Map([
  ['continue', ['resume', '--last']],
  ['--continue', ['resume', '--last']],
  ['-r', ['resume']],
  ['--resume', ['resume']],
]);
const RESUME_ONLY_FLAGS = new Set([
  '--last',
  '--all',
  '--include-non-interactive',
]);

function translateLegacyCommandAlias(args) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') return args;
    if (VARIADIC_GLOBAL_FLAGS.has(arg)) {
      while (i + 1 < args.length) {
        const next = args[i + 1];
        if (typeof next !== 'string' || next.startsWith('-')
          || CODEX_SUBCOMMANDS.has(next) || LEGACY_COMMAND_ALIASES.has(next)) break;
        i++;
      }
      continue;
    }
    if (GLOBAL_FLAGS_WITH_VALUE.has(arg)) {
      i++;
      continue;
    }
    const replacement = LEGACY_COMMAND_ALIASES.get(arg);
    if (replacement) {
      return [...args.slice(0, i), ...replacement, ...args.slice(i + 1)];
    }
    if (typeof arg === 'string' && arg.startsWith('-')) continue;
    return args;
  }
  return args;
}

function parseResumeAt(args, subcommandIndex) {
  const resumeOnlyOptionIndices = [];
  const positionalIndices = [];
  let hasLast = false;

  for (let i = subcommandIndex + 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') {
      for (let j = i + 1; j < args.length; j++) positionalIndices.push(j);
      break;
    }
    if (RESUME_ONLY_FLAGS.has(arg)) {
      resumeOnlyOptionIndices.push(i);
      if (arg === '--last') hasLast = true;
      continue;
    }
    if (VARIADIC_GLOBAL_FLAGS.has(arg)) {
      while (i + 1 < args.length) {
        const next = args[i + 1];
        if (typeof next !== 'string' || next.startsWith('-')) break;
        i++;
      }
      continue;
    }
    if (GLOBAL_FLAGS_WITH_VALUE.has(arg)) {
      i++;
      continue;
    }
    if (typeof arg === 'string' && arg.startsWith('-')) continue;
    positionalIndices.push(i);
  }

  const selectorIndex = hasLast ? null : (positionalIndices[0] ?? null);
  const selector = hasLast ? 'last' : (selectorIndex == null ? 'picker' : 'id');
  return {
    kind: 'resume',
    selector,
    threadId: selector === 'id' ? args[selectorIndex] : null,
    subcommandIndex,
    selectorIndex,
    resumeOnlyOptionIndices,
  };
}

export function parseCodexInvocation(args = []) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') return { kind: 'new', subcommandIndex: null };
    if (VARIADIC_GLOBAL_FLAGS.has(arg)) {
      while (i + 1 < args.length) {
        const next = args[i + 1];
        if (typeof next !== 'string' || next.startsWith('-') || CODEX_SUBCOMMANDS.has(next)) break;
        i++;
      }
      continue;
    }
    if (GLOBAL_FLAGS_WITH_VALUE.has(arg)) {
      i++;
      continue;
    }
    if (typeof arg === 'string' && arg.startsWith('-')) continue;
    if (arg === 'fork') return { kind: 'fork', subcommandIndex: i };
    if (CODEX_SUBCOMMANDS.has(arg) && arg !== 'resume') return { kind: 'new', subcommandIndex: i };
    if (arg === 'resume') return parseResumeAt(args, i);
    // An unknown option may have consumed this positional value. If a later
    // explicit resume token still exists before `--`, classify conservatively
    // as resume so an evolving Codex CLI cannot bypass history suppression.
    const laterResume = args.findIndex((value, index) => index > i && value === 'resume');
    const terminator = args.indexOf('--', i + 1);
    if (laterResume >= 0 && (terminator < 0 || laterResume < terminator)) {
      return parseResumeAt(args, laterResume);
    }
    return { kind: 'new', subcommandIndex: i };
  }
  return { kind: 'new', subcommandIndex: null };
}

export function stripResumeInvocation(args = [], invocation = parseCodexInvocation(args)) {
  if (invocation.kind !== 'resume' || !Number.isSafeInteger(invocation.subcommandIndex)) return [...args];
  const parsed = invocation.selectorIndex === undefined
    || !Array.isArray(invocation.resumeOnlyOptionIndices)
    ? parseResumeAt(args, invocation.subcommandIndex)
    : invocation;
  const removed = new Set([
    parsed.subcommandIndex,
    ...(parsed.resumeOnlyOptionIndices || []),
  ]);
  if (parsed.selector === 'id' && Number.isSafeInteger(parsed.selectorIndex)) {
    removed.add(parsed.selectorIndex);
  }
  return args.filter((_, index) => !removed.has(index));
}

export function normalizeCodexArgs(rawArgs = []) {
  const codexArgs = [];
  let bypassPermissions = false;
  let allowBypassToggle = false;

  for (const arg of rawArgs) {
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

  const normalizedArgs = translateLegacyCommandAlias(codexArgs);
  return {
    codexArgs: normalizedArgs,
    invocation: parseCodexInvocation(normalizedArgs),
    bypassPermissions,
    allowBypassToggle,
  };
}

export function buildWorkspaceCodexArgs({ resumeLast = false, dangerousMode = false } = {}) {
  const args = [];
  if (dangerousMode) args.push(CODEX_BYPASS_FLAG);
  if (resumeLast) args.push('resume', '--last');
  return args;
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

/** Enable Codex's native request_user_input tool in Default collaboration mode. */
export function getDefaultModeRequestUserInputConfigArgs() {
  return ['-c', DEFAULT_MODE_REQUEST_USER_INPUT_CONFIG];
}

/**
 * Append CX Viewer-owned overrides after user arguments so they have final
 * precedence. The proxy redirect is present only after proxy startup succeeds.
 */
export function appendCxvFinalConfigArgs(args = [], { proxyPort = null } = {}) {
  const finalArgs = [...args, ...getDefaultModeRequestUserInputConfigArgs()];
  if (Number.isInteger(proxyPort) && proxyPort > 0) {
    finalArgs.push('-c', `openai_base_url="http://127.0.0.1:${proxyPort}/v1"`);
  }
  return finalArgs;
}
