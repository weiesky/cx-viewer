import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { headlessPromptLaunch, prepareHeadlessSystemPrompt } from '../lib/headless-system-prompts.js';
import { getModelSystemPrompts, saveDefaultSystemPrompt, saveModelSystemPrompt } from '../lib/model-system-prompts.js';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-headless-prompt-test-'));
  const cwd = join(root, 'project'), codexHome = join(root, 'codex'), logDir = join(root, 'logs');
  mkdirSync(cwd); mkdirSync(codexHome);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, cwd, codexHome, logDir, env: { CODEX_HOME: codexHome } };
}
const readConfig = async () => ({ config: { model: 'k3' } });

test('a corrupted managed prompt fails closed without exposing its path or content', async t => {
  const ctx = fixture(t);
  saveModelSystemPrompt({ ...ctx, scope: 'workspace', name: 'KIMI-K3', mode: 'override', text: 'PRIVATE PROMPT' });
  writeFileSync(join(getModelSystemPrompts(ctx).workspaceDir, 'KIMI-K3.json'), 'PRIVATE MALFORMED');
  await assert.rejects(prepareHeadlessSystemPrompt({ ...ctx, args: ['exec'], readConfig }), error => {
    assert.equal(error.code, 'CXV_MANAGED_PROMPT_LOAD_FAILED');
    assert.doesNotMatch(error.message, /PRIVATE|KIMI|project/);
    return true;
  });
});

test('headless option inspection preserves literal prompts and skips native resume/fork/review', () => {
  const launch = headlessPromptLaunch(['-c', 'model="old"', 'exec', '--model=k3', '--profile', 'work', '-C', 'child', '--', '--profile', 'literal'], '/tmp/parent');
  assert.equal(launch.cwd, '/tmp/parent/child'); assert.equal(launch.profile, 'work');
  assert.deepEqual(launch.configArgs, ['-c', 'model="old"', '-c', 'model="k3"']);
  for (const args of [['resume', '--last'], ['exec', '-c', 'model="k3"', 'resume', '--last'], ['e', 'fork', 'id'], ['exec', 'review'], ['--help'], ['app-server']]) assert.equal(headlessPromptLaunch(args, '/tmp'), null);
  assert.throws(() => headlessPromptLaunch(['exec', '--future-native-option', 'x'], '/tmp'), /unsupported_native_prompt_options/);
  const compact = headlessPromptLaunch(['-cmodel="old"', 'exec', '-mk3', '--enable', 'multi_agent', '-i', 'one.png', 'two.png', '--profile=work', '--', '-p'], '/tmp');
  assert.deepEqual(compact.configArgs, ['-c', 'model="old"', '--enable', 'multi_agent', '-c', 'model="k3"']);
  assert.equal(compact.profile, 'work');
  assert.deepEqual(headlessPromptLaunch(['exec', 'a positional prompt', '-mk3', '-c', 'model_instructions_file="manual.md"'], '/tmp').configArgs,
    ['-c', 'model_instructions_file="manual.md"', '-c', 'model="k3"']);
});

test('a new native launch renders its model prompt into a private owned file and cleans it exactly', async t => {
  const ctx = fixture(t); let observed;
  saveModelSystemPrompt({ ...ctx, scope: 'workspace', name: 'KIMI-K3', mode: 'override', text: 'private ${model.name}\n${verbatim}' });
  const result = await prepareHeadlessSystemPrompt({ ...ctx, codexPath: 'unused', args: ['exec', '--', 'literal'], readConfig: async p => { observed = p; return readConfig(); } });
  const file = JSON.parse(result.args[1].slice('model_instructions_file='.length));
  assert.equal(observed.launch.cwd, ctx.cwd); assert.equal(readFileSync(file, 'utf8'), 'private k3\n${verbatim}');
  assert.equal(statSync(file).mode & 0o777, 0o600);
  assert.equal(statSync(join(file, '..')).mode & 0o777, 0o700);
  result.close(); result.close(); assert.equal(existsSync(file), false);
});

test('native host developer instructions are preserved before a managed append', async t => {
  const ctx = fixture(t);
  saveDefaultSystemPrompt({ ...ctx, mode: 'append', text: 'CXV 中文 ${verbatim}' });
  const result = await prepareHeadlessSystemPrompt({ ...ctx, args: ['exec'], readConfig: async () => ({ config: { model: 'gpt-test', developer_instructions: 'HOST\nline two' } }) });
  assert.deepEqual(result.args, ['-c', 'developer_instructions="HOST\\nline two\\n\\nCXV 中文 ${verbatim}"']); result.close();
});

test('named profile strings preserve TOML multiline semantics and stay below trusted project/runtime origins', async t => {
  const ctx = fixture(t); const file = join(ctx.codexHome, 'work.config.toml');
  const raw = 'model = "k3"\ndeveloper_instructions = """\nPROFILE HOST\n第二行\n"""\n'; writeFileSync(file, raw);
  saveModelSystemPrompt({ ...ctx, scope: 'workspace', name: 'KIMI-K3', mode: 'append', text: 'APPEND' });
  const input = { ...ctx, args: ['exec', '-p', 'work'] };
  const profile = await prepareHeadlessSystemPrompt({ ...input, readConfig: async () => ({ config: { model: 'gpt-test', developer_instructions: 'BASE' }, origins: { model: { name: { type: 'user' } }, developer_instructions: { name: { type: 'user' } } } }) });
  assert.equal(JSON.parse(profile.args[1].slice('developer_instructions='.length)), 'PROFILE HOST\n第二行\n\n\nAPPEND');
  const project = await prepareHeadlessSystemPrompt({ ...input, readConfig: async () => ({ config: { model: 'glm-5.2', developer_instructions: 'PROJECT' }, origins: { model: { name: { type: 'project' } }, developer_instructions: { name: { type: 'sessionFlags' } } } }) });
  assert.equal(project.selected.name, 'GLM-5.2'); project.close();
  assert.equal(readFileSync(file, 'utf8'), raw);
});

test('manual native instruction files from a profile or effective config suppress automatic prompts', async t => {
  const ctx = fixture(t); writeFileSync(join(ctx.codexHome, 'manual.config.toml'), 'model="k3"\nmodel_instructions_file="manual.md"\n');
  for (const options of [
    { args: ['exec', '-p', 'manual'], readConfig },
    { args: ['exec'], readConfig: async () => ({ config: { model: 'k3', model_instructions_file: '/native/manual.md' } }) },
  ]) assert.deepEqual((await prepareHeadlessSystemPrompt({ ...ctx, ...options })).args, []);
});

test('resume, fork, environment disable and malformed profile paths cannot allocate or inspect a fresh prompt', async t => {
  const ctx = fixture(t); const untouched = async () => { throw Error('unexpected config read'); };
  for (const args of [['exec', 'resume', '--last'], ['fork', 'id']]) assert.deepEqual((await prepareHeadlessSystemPrompt({ ...ctx, args, readConfig: untouched })).args, []);
  assert.deepEqual((await prepareHeadlessSystemPrompt({ ...ctx, args: ['exec'], env: { CXV_DISABLE_AUTO_SYSTEM_PROMPT: '1' }, readConfig: untouched })).args, []);
  await assert.rejects(prepareHeadlessSystemPrompt({ ...ctx, args: ['exec', '-p', '../escape'], readConfig }), /unsupported_native_profile_name/);
  writeFileSync(join(ctx.codexHome, 'discovery.config.toml'), 'model="k3"\n[projects."/tmp"]\ntrust_level="trusted"\n');
  await assert.rejects(prepareHeadlessSystemPrompt({ ...ctx, args: ['exec', '-p', 'discovery'], readConfig }), /unsupported_native_profile_discovery/);
});

test('headless model routing resolves the actual -C workspace only for a fresh automatic prompt', async t => {
  const ctx = fixture(t), child = join(ctx.cwd, 'child'); mkdirSync(child);
  saveModelSystemPrompt({ ...ctx, cwd: child, scope: 'workspace', name: 'GLM-5.2', mode: 'override', text: 'CHILD WORKSPACE PROMPT' });
  let calls = 0;
  const resolveModel = cwd => { calls++; assert.equal(cwd, child); return 'glm-5.2'; };
  const result = await prepareHeadlessSystemPrompt({ ...ctx, args: ['exec', '-C', 'child'], resolveModel, readConfig });
  const file = JSON.parse(result.args[1].slice('model_instructions_file='.length));
  assert.equal(readFileSync(file, 'utf8'), 'CHILD WORKSPACE PROMPT'); result.close();
  await prepareHeadlessSystemPrompt({ ...ctx, args: ['exec', 'resume', '--last'], resolveModel, readConfig });
  await prepareHeadlessSystemPrompt({ ...ctx, args: ['exec', '-C', 'child'], resolveModel,
    readConfig: async () => ({ config: { model_instructions_file: '/manual.md' } }) });
  assert.equal(calls, 1);
});
