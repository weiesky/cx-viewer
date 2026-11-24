import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
const isolatedConfig = await mkdtemp(join(tmpdir(), 'cxv-restart-config-'));
process.env.CODEX_HOME = isolatedConfig;
after(() => rm(isolatedConfig, { recursive: true, force: true }));
const { runRestartHelper } = await import('../lib/restart-helper.js');
const { launchRestart, restartFromHelper, waitForExit } = await import('../lib/restart.js');
const { RESTART_CONFIG_FILE, RESTART_READY_FILE } = await import('../lib/update-job.js');
const { getCurrentVersion } = await import('../lib/updater.js');

const VERSION = getCurrentVersion().split('.').map(Number).map((part, i) => i === 2 ? part + 1 : part).join('.');
const VALID_TOKEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
delete process.env.CXV_ACCESS_TOKEN;

describe('restart process', () => {
  it('launches a Node helper with validated original arguments and working directory', async (t) => {
    let child;
    const spawnImpl = () => child = spawn(process.execPath, ['-e', `import { readFileSync, writeFileSync } from 'node:fs'; const config = JSON.parse(readFileSync(process.argv[1], 'utf8')); writeFileSync(${JSON.stringify(RESTART_READY_FILE)}, JSON.stringify({ token: config.token }));`, RESTART_CONFIG_FILE]);
    t.after(() => { child?.kill(); return Promise.all([rm(RESTART_CONFIG_FILE, { force: true }), rm(RESTART_READY_FILE, { force: true })]); });
    const args = ['--no-open', '-c'];
    const result = await launchRestart({ args, cwd: '/tmp/project', version: VERSION, cliPath: '/tmp/cli.js', accessToken: VALID_TOKEN, spawnImpl });
    assert.equal(result, child);
    const config = JSON.parse(await readFile(RESTART_CONFIG_FILE, 'utf8'));
    assert.deepEqual(config.args, args);
    assert.equal(config.cwd, '/tmp/project');
    assert.equal(config.cliPath, '/tmp/cli.js');
    assert.equal(config.accessToken, VALID_TOKEN);
    assert.notEqual(config.token, VALID_TOKEN, 'readiness and LAN tokens are distinct');
    if (process.platform !== 'win32') assert.equal((await stat(RESTART_CONFIG_FILE)).mode & 0o777, 0o600);
    await assert.rejects(() => launchRestart({ version: 'invalid' }), /Invalid restart configuration/);
  });
  it('rejects helper startup failures without shutting down the old service', async (t) => {
    t.after(() => Promise.all([rm(RESTART_CONFIG_FILE, { force: true }), rm(RESTART_READY_FILE, { force: true })]));
    const spawnImpl = () => spawn(process.execPath, ['-e', 'process.exit(3)']);
    await assert.rejects(() => launchRestart({ args: [], cwd: '/tmp', version: VERSION, cliPath: '/tmp/cli.js', spawnImpl }), /exited before it was ready/);
    await assert.rejects(() => launchRestart({ args: [], cwd: '/tmp', version: VERSION, cliPath: '/tmp/cli.js', spawnImpl: () => spawn('/definitely/missing-node') }), /ENOENT/);
    await assert.rejects(() => readFile(RESTART_CONFIG_FILE), { code: 'ENOENT' });
    await assert.rejects(() => readFile(RESTART_READY_FILE), { code: 'ENOENT' });
  });
  it('atomically replaces stale handoffs with private files and omits malformed tokens', async (t) => {
    let child;
    t.after(() => { child?.kill(); return Promise.all([rm(RESTART_CONFIG_FILE, { force: true }), rm(RESTART_READY_FILE, { force: true })]); });
    const target = join(isolatedConfig, 'symlink-target');
    await writeFile(target, 'preserve these bytes');
    await mkdir(join(isolatedConfig, 'cx-viewer'), { recursive: true });
    if (process.platform !== 'win32') await symlink(target, RESTART_CONFIG_FILE);
    else await writeFile(RESTART_CONFIG_FILE, 'stale');
    const spawnImpl = () => child = spawn(process.execPath, ['-e', `import { readFileSync, writeFileSync } from 'node:fs'; const config = JSON.parse(readFileSync(process.argv[1], 'utf8')); writeFileSync(${JSON.stringify(RESTART_READY_FILE)}, JSON.stringify({ token: config.token }));`, RESTART_CONFIG_FILE]);
    for (const accessToken of [VALID_TOKEN, 'invalid']) {
      if (accessToken === 'invalid') await chmod(RESTART_CONFIG_FILE, 0o644);
      await launchRestart({ args: [], cwd: tmpdir(), version: VERSION, cliPath: '/tmp/cli.js', accessToken, spawnImpl });
      const config = JSON.parse(await readFile(RESTART_CONFIG_FILE, 'utf8'));
      assert.equal(config.accessToken, accessToken === VALID_TOKEN ? VALID_TOKEN : undefined);
      if (process.platform !== 'win32') assert.equal((await stat(RESTART_CONFIG_FILE)).mode & 0o777, 0o600);
    }
    assert.equal(await readFile(target, 'utf8'), 'preserve these bytes');
  });
  it('waits for the old process to die before starting the replacement', async () => {
    const calls = [];
    const result = await restartFromHelper({ pid: 123, cliPath: '/tmp/cli.js', cwd: '/tmp/project', args: ['--no-open'] }, {
      wait: async () => calls.push('wait'),
      spawnImpl: (...args) => { calls.push(args); return { once(name, fn) { if (name === 'exit') queueMicrotask(() => fn(0)); } }; },
    });
    assert.equal(result, 0);
    assert.equal(calls[0], 'wait');
    assert.equal(calls[1][1][0], '/tmp/cli.js');
    assert.equal(calls[1][2].cwd, '/tmp/project');
    assert.equal(calls[1][2].env.CXV_NO_OPEN, '1');
    assert.equal('CXV_ACCESS_TOKEN' in calls[1][2].env, false);
  });
  it('forwards only a valid config token, overriding or removing any ambient handoff', async (t) => {
    process.env.CXV_ACCESS_TOKEN = 'ambient-stale-token';
    t.after(() => { delete process.env.CXV_ACCESS_TOKEN; });
    for (const accessToken of [VALID_TOKEN, 'invalid', undefined]) {
      let env;
      await restartFromHelper({ pid: 123, cliPath: '/tmp/cli.js', cwd: '/tmp', args: [], accessToken }, {
        wait: async () => {},
        spawnImpl: (_command, _args, options) => { env = options.env; return { once(name, fn) { if (name === 'exit') queueMicrotask(() => fn(0)); } }; },
      });
      assert.equal(env.CXV_ACCESS_TOKEN, accessToken === VALID_TOKEN ? VALID_TOKEN : undefined);
      assert.equal(env.CXV_NO_OPEN, '1');
    }
  });
  it('has a bounded wait and handles missing executables', async () => {
    await assert.rejects(() => waitForExit(1, { alive: () => true, sleep: async () => {}, timeoutMs: -1 }), /Timed out/);
    await assert.rejects(() => restartFromHelper({ pid: 1, cliPath: '/tmp/cli.js', cwd: '/tmp', args: [] }, { wait: async () => {}, spawnImpl: () => ({ once(name, fn) { if (name === 'error') queueMicrotask(() => fn(new Error('ENOENT'))); } }) }), /ENOENT/);
  });
  it('runs the helper workflow with a fake CLI, restoring cwd/argv and exit code', async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'cxv-restart-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const output = join(dir, 'result.json');
    const cli = join(dir, 'fake-cli.js');
    const state = join(dir, 'update-state.json');
    const tarball = join(dir, 'pending.tgz');
    await writeFile(cli, `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(output)}, JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) })); process.exit(7);`);
    await writeFile(tarball, 'package');
    await writeFile(state, JSON.stringify({ version: VERSION, tarballPath: tarball, root: dir, pid: 99999999 }));
    const code = await runRestartHelper({ stateFile: state, config: { pid: 99999999, version: VERSION, cwd: dir, cliPath: cli, args: ['--no-open', 'argument with spaces'] }, install: async (staged) => { assert.equal(staged.version, VERSION); }, log: () => {} });
    assert.equal(code, 7);
    const result = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(result.args[1], 'argument with spaces');
    assert.equal(result.cwd, await realpath(dir));
    await assert.rejects(() => readFile(state), { code: 'ENOENT' });
    await assert.rejects(() => readFile(tarball), { code: 'ENOENT' });
  });
  it('records an install failure before restoring the previous CLI', async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'cxv-restart-failed-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const cli = join(dir, 'fake-cli.js');
    const state = join(dir, 'update-state.json');
    const tarball = join(dir, 'pending.tgz');
    await writeFile(cli, 'process.exit(7);');
    await writeFile(tarball, 'package');
    await writeFile(state, JSON.stringify({ version: VERSION, tarballPath: tarball, root: dir, pid: 99999999 }));
    const code = await runRestartHelper({ stateFile: state, config: { pid: 99999999, version: VERSION, cwd: dir, cliPath: cli, args: [] }, install: async () => { throw new Error('npm install failed (1)'); }, log: () => {} });
    assert.equal(code, 7);
    const failed = JSON.parse(await readFile(state, 'utf8'));
    assert.equal(failed.status, 'failed');
    assert.match(failed.error, /npm install failed/);
    assert.equal(failed.version, VERSION);
    await assert.rejects(() => readFile(tarball), { code: 'ENOENT' });
  });
  for (const failsInstall of [false, true]) it(`erases a file handoff before install and preserves the token on ${failsInstall ? 'failure restore' : 'success'}`, async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'cxv-restart-handoff-'));
    t.after(() => Promise.all([rm(dir, { recursive: true, force: true }), rm(RESTART_READY_FILE, { force: true })]));
    const output = join(dir, 'result.json');
    const cli = join(dir, 'fake-cli.mjs');
    const state = join(dir, 'update-state.json');
    const configFile = join(dir, 'restart-config.json');
    const tarball = join(dir, 'pending.tgz');
    await writeFile(cli, `import { writeFileSync, existsSync } from 'node:fs'; writeFileSync(${JSON.stringify(output)}, JSON.stringify({ token: process.env.CXV_ACCESS_TOKEN, configExists: existsSync(${JSON.stringify(configFile)}) }));`);
    await writeFile(tarball, 'package');
    await writeFile(state, JSON.stringify({ version: VERSION, tarballPath: tarball, root: dir, pid: 99999999 }));
    await writeFile(configFile, JSON.stringify({ pid: 99999999, version: VERSION, cwd: dir, cliPath: cli, args: [], token: 'readiness-fixture', accessToken: VALID_TOKEN }), { mode: 0o600 });
    let erasedBeforeInstall;
    const code = await runRestartHelper({ stateFile: state, configFile, install: async () => {
      erasedBeforeInstall = !existsSync(configFile);
      if (failsInstall) throw new Error('fixture install failure');
    }, log: () => {} });
    // Assert outside callbacks: the helper intentionally catches installer errors.
    assert.equal(code, 0);
    assert.equal(erasedBeforeInstall, true);
    assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), { token: VALID_TOKEN, configExists: false });
    assert.equal(existsSync(configFile), false);
    assert.equal(existsSync(tarball), false);
    if (failsInstall) assert.equal(JSON.parse(await readFile(state, 'utf8')).status, 'failed');
    else assert.equal(existsSync(state), false);
  });
  it('does not publish token-bearing JSON parser diagnostics and removes corrupt config', async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'cxv-restart-corrupt-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const stateFile = join(dir, 'update-state.json');
    const configFile = join(dir, 'restart-config.json');
    await writeFile(stateFile, JSON.stringify({ version: VERSION }));
    await writeFile(configFile, `{"accessToken":"${VALID_TOKEN}",broken}`);
    const logs = [];
    const code = await runRestartHelper({ stateFile, configFile, log: text => logs.push(text) });
    assert.equal(code, 1);
    const state = JSON.parse(await readFile(stateFile, 'utf8'));
    assert.equal(state.error, 'Invalid restart config');
    assert.equal(logs.join('\n').includes(VALID_TOKEN), false);
    assert.equal(existsSync(configFile), false);
  });
});
