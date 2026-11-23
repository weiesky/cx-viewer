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

// Viewer options stop at `--`; known Codex option values remain literal too.
export function extractSdkTransportOptions(args = []) {
  const codexArgs = [];
  let sdkMode = false, transport = null;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') { codexArgs.push(...args.slice(i)); break; }
    if (GLOBAL_FLAGS_WITH_VALUE.has(arg)) {
      codexArgs.push(arg);
      if (i + 1 < args.length) codexArgs.push(args[++i]);
      continue;
    }
    if (arg === '--sdk' || arg === '-SDK') { sdkMode = true; continue; }
    if (arg === '--sdk-transport' || arg.startsWith('--sdk-transport=')) {
      const value = arg === '--sdk-transport' ? args[++i] : arg.slice('--sdk-transport='.length);
      if (transport !== null || !['exec', 'appserver'].includes(value)) {
        throw new TypeError('--sdk-transport requires one value: exec or appserver');
      }
      transport = value; continue;
    }
    codexArgs.push(arg);
  }
  if (transport !== null && !sdkMode) throw new TypeError('--sdk-transport requires --sdk');
  return { sdkMode, transport: transport || 'exec', codexArgs };
}

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

// Tokens after `--` belong to the native prompt. Internal options must stay in
// the option region, after user overrides, without inspecting prompt contents.
export function insertBeforeDashDash(args, injections) {
  const out = [...args];
  const at = out.indexOf('--');
  out.splice(at < 0 ? out.length : at, 0, ...injections);
  return out;
}

/**
 * Append CX Viewer-owned overrides after user arguments so they have final
 * precedence. The proxy redirect is present only after proxy startup succeeds.
 */
export function appendCxvFinalConfigArgs(args = [], { proxyPort = null } = {}) {
  const finalArgs = [...getDefaultModeRequestUserInputConfigArgs()];
  if (Number.isInteger(proxyPort) && proxyPort > 0) {
    finalArgs.push('-c', `openai_base_url="http://127.0.0.1:${proxyPort}/v1"`);
  }
  return insertBeforeDashDash(args, finalArgs);
}

// Parallel PTY workspaces share model defaults, not the boot turn's directory,
// prompt, resume target, profile or permission grants. Permission/resume choices
// come from the existing workspace picker (owner decision, 2026-11-21).
export function buildPtyWorkspaceLaunchArgs(bootArgs = [], pickerArgs = []) {
  if (![bootArgs, pickerArgs].every(args => Array.isArray(args)
      && args.every(arg => typeof arg === 'string' && !arg.includes('\0')))) {
    throw new TypeError('Invalid PTY workspace arguments');
  }
  const allowedPicker = new Set([CODEX_BYPASS_FLAG, 'resume', '--last']);
  if (pickerArgs.some(arg => !allowedPicker.has(arg)) || new Set(pickerArgs).size !== pickerArgs.length
      || pickerArgs.includes('resume') !== pickerArgs.includes('--last')) {
    throw new TypeError('Unsupported PTY workspace picker arguments');
  }
  const inherited = [];
  for (let i = 0; i < bootArgs.length; i++) {
    const arg = bootArgs[i];
    if (arg === '--') break;
    if (GLOBAL_FLAGS_WITH_VALUE.has(arg)) {
      const value = bootArgs[++i];
      if (typeof value !== 'string') throw new TypeError('Incomplete PTY workspace defaults');
      if (arg === '-m' || arg === '--model') inherited.push(arg, value);
      if ((arg === '-c' || arg === '--config')
          && /^(?:model|model_provider|model_reasoning_effort|model_reasoning_summary|model_verbosity)\s*=/.test(value.trim())
          && !/[\r\n]/.test(value)) inherited.push(arg, value);
    } else if (arg.startsWith('--model=')) inherited.push(arg);
  }
  return [...inherited, ...buildWorkspaceCodexArgs({
    dangerousMode: pickerArgs.includes(CODEX_BYPASS_FLAG), resumeLast: pickerArgs.includes('resume'),
  })];
}
