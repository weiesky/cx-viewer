import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse } from 'smol-toml';
import { createCodexAppServerClient } from './codex-appserver-client.js';
import { getCodexConfigDir } from './codex-config.js';
import { selectSystemPrompt } from './model-system-prompts.js';

const VALUE_FLAGS = new Set(['-c', '--config', '-m', '--model', '-p', '--profile', '-C', '--cd', '-s', '--sandbox', '-a', '--ask-for-approval', '--color', '--add-dir', '--output-schema', '-o', '--output-last-message', '--thread-source', '--cyber-access-program', '--enable', '--disable', '-i', '--image']);
const BOOL_FLAGS = new Set(['--json', '--ephemeral', '--skip-git-repo-check', '--trust', '--ignore-rules', '--strict-config', '--approve-for-me', '--dangerously-bypass-approvals-and-sandbox', '--dangerously-bypass-hook-trust']);
const PROFILE_FIELDS = ['model', 'model_instructions_file', 'instructions', 'developer_instructions'];
const BELOW_PROFILE = new Set(['packagedDefaults', 'mdm', 'system', 'enterpriseManaged', 'user']);
const noop = () => {};

// Inspect only native option positions. Prompt text, stdin, resume/fork and
// non-runtime commands are never reinterpreted as fresh-session options.
export function headlessPromptLaunch(args, cwd) {
  const launch = { cwd: resolve(cwd), configArgs: [], profile: null, model: null };
  let exec = false, prompt = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') break;
    if (!exec && !prompt && (arg === 'exec' || arg === 'e')) { exec = true; continue; }
    if (!arg.startsWith('-')) {
      if (!prompt && ['resume', 'fork', 'review', 'help', 'login', 'logout', 'mcp', 'mcp-server', 'app-server', 'debug', 'features', 'completion', 'sandbox', 'apply', 'cloud', 'plugin', 'app'].includes(arg)) return null;
      prompt = true;
      continue;
    }
    if (arg === '-h' || arg === '--help' || arg === '-V' || arg === '--version') return null;
    if (BOOL_FLAGS.has(arg)) {
      if (arg === '--strict-config') launch.configArgs.push(arg);
      continue;
    }
    const attachedShort = !arg.startsWith('--') && arg.length > 2 && VALUE_FLAGS.has(arg.slice(0, 2));
    const eq = arg.indexOf('='), flag = attachedShort ? arg.slice(0, 2) : eq < 0 ? arg : arg.slice(0, eq);
    if (!VALUE_FLAGS.has(flag)) throw new Error('unsupported_native_prompt_options');
    const value = attachedShort ? arg.slice(2).replace(/^=/, '') : eq < 0 ? args[++i] : arg.slice(eq + 1);
    if (typeof value !== 'string') throw new Error('incomplete_native_prompt_options');
    if (flag === '-c' || flag === '--config') launch.configArgs.push('-c', value);
    else if (flag === '--enable' || flag === '--disable') launch.configArgs.push(flag, value);
    else if (flag === '-i' || flag === '--image') {
      while (i + 1 < args.length && !args[i + 1].startsWith('-')
          && !['exec', 'e', 'resume', 'fork', 'review', 'help'].includes(args[i + 1])) i++;
    }
    else if (flag === '-m' || flag === '--model') launch.model = value;
    else if (flag === '-p' || flag === '--profile') launch.profile = value;
    else if (flag === '-C' || flag === '--cd') launch.cwd = resolve(cwd, value);
  }
  // The native explicit model selector takes precedence over config.toml and -c.
  if (launch.model !== null) launch.configArgs.push('-c', `model=${JSON.stringify(launch.model)}`);
  return launch;
}

async function readNativeConfig({ codexPath, launch, env, signal }) {
  signal?.throwIfAborted();
  const client = createCodexAppServerClient({ codexPath, cwd: launch.cwd, args: launch.configArgs,
    env: { ...env, CXV_WORKSPACE_MODE: '1', CXV_LOGGER_BOOTSTRAP_DISABLED: '1' } });
  const abort = () => { void client.stop(); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    await client.request('initialize', { clientInfo: { name: 'cxv_prompt_config', version: '1' }, capabilities: { experimentalApi: true } });
    client.notify('initialized');
    return await client.request('config/read', { cwd: launch.cwd, includeLayers: false });
  } finally { signal?.removeEventListener('abort', abort); await client.stop(); }
}

function withProfile(config, origins, launch, env) {
  if (launch.profile === null) return config;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(launch.profile)) throw new Error('unsupported_native_profile_name');
  // Profiles can also change project discovery/trust. Do not guess a different
  // set of enabled project layers from an app-server that cannot select profiles.
  const file = join(getCodexConfigDir(env), `${launch.profile}.config.toml`);
  const stat = statSync(file);
  if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('invalid_native_profile');
  const raw = readFileSync(file);
  if (raw.byteLength > 1024 * 1024) throw new Error('invalid_native_profile');
  const profile = parse(new TextDecoder('utf-8', { fatal: true }).decode(raw), { integersAsBigInt: 'asNeeded', unsafeKeyBehaviour: 'throw' });
  if (profile.projects || profile.project_root_markers || profile.profile || profile.profiles) throw new Error('unsupported_native_profile_discovery');
  if (config.profile === launch.profile || Object.hasOwn(config.profiles || {}, launch.profile)) throw new Error('legacy_native_profile_conflict');
  const effective = { ...config };
  for (const key of PROFILE_FIELDS) {
    if (!Object.hasOwn(profile, key)) continue;
    const origin = origins?.[key]?.name?.type;
    if (origin !== undefined && !BELOW_PROFILE.has(origin)) continue;
    if (typeof profile[key] !== 'string') throw new Error('invalid_native_profile_prompt');
    effective[key] = profile[key];
  }
  return effective;
}

// No model turn or GUI is started by preparation. The caller owns both the
// native exec and the returned cleanup, including spawn errors and shutdown.
export async function prepareHeadlessSystemPrompt({ codexPath, args, cwd, logDir, model = null, resolveModel = null, env = process.env, readConfig = readNativeConfig, signal }) {
  if (env.CXV_DISABLE_AUTO_SYSTEM_PROMPT === '1') return { args: [], close: noop };
  const launch = headlessPromptLaunch(args, cwd);
  if (!launch) return { args: [], close: noop };
  const state = await readConfig({ codexPath, launch, env, signal });
  signal?.throwIfAborted();
  const config = withProfile(state.config || {}, state.origins, launch, env);
  // Explicit native instructions retain authority in every config layer.
  if (config.model_instructions_file || config.instructions) return { args: [], close: noop };
  let selected;
  try { selected = selectSystemPrompt({ logDir, cwd: launch.cwd, model: (resolveModel ? resolveModel(launch.cwd) : model) || config.model || null }); }
  catch { throw Object.assign(new Error('Managed system prompt could not be loaded'), { code: 'CXV_MANAGED_PROMPT_LOAD_FAILED' }); }
  if (!selected) return { args: [], close: noop };
  if (selected.mode === 'append') {
    const host = typeof config.developer_instructions === 'string' ? config.developer_instructions : '';
    return { args: ['-c', `developer_instructions=${JSON.stringify(host.trim() ? `${host}\n\n${selected.text}` : selected.text)}`], selected, close: noop };
  }
  let root;
  try { root = mkdtempSync(join(tmpdir(), 'cxv-native-prompt-')); }
  catch { throw Object.assign(new Error('Managed system prompt file could not be created'), { code: 'CXV_MANAGED_PROMPT_LOAD_FAILED' }); }
  const file = join(root, 'instructions.md');
  try { writeFileSync(file, selected.text, { mode: 0o600, flag: 'wx' }); }
  catch { rmSync(root, { recursive: true, force: true }); throw Object.assign(new Error('Managed system prompt file could not be written'), { code: 'CXV_MANAGED_PROMPT_LOAD_FAILED' }); }
  return { args: ['-c', `model_instructions_file=${JSON.stringify(file)}`], selected,
    close() { rmSync(root, { recursive: true, force: true }); } };
}
