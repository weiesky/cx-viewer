// Real installed-package self-update in an owned npm prefix. The caller must
// provide package-result.json from an isolated install and a synthetic newer
// tarball; never point this probe at a user/global installation.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer, request } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { chmod, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { restartPollDecision } from '../../apps/web/src/utils/updateProgress.js';

const metadataFile = realpathSync(process.argv[2]);
const metadata = JSON.parse(readFileSync(metadataFile, 'utf8'));
const base = realpathSync(dirname(metadataFile));
const pkg = realpathSync(metadata.package);
const npmRoot = dirname(pkg);
const prefix = dirname(dirname(npmRoot));
assert.ok(base.includes('cxv-b12-production-'));
assert.equal(pkg, join(base, 'prefix/lib/node_modules/cx-viewer'));
assert.equal(prefix, join(base, 'prefix'));
const runtimeHome = join(base, 'runtime-home');
const project = join(base, 'project');
const logs = join(base, 'viewer-logs');
const bin = join(base, 'fixture-bin');
for (const directory of [runtimeHome, project, logs, bin]) mkdirSync(directory, { recursive: true, mode: 0o700 });
const codex = join(bin, 'codex');
writeFileSync(codex, `#!${process.execPath}\nimport { appendFileSync } from 'node:fs';\nappendFileSync(${JSON.stringify(join(base, 'codex-calls.jsonl'))}, JSON.stringify({ args: process.argv.slice(2), handoffPresent: process.env.CXV_ACCESS_TOKEN !== undefined }) + '\\n');\nif (process.argv.includes('--version')) console.log('codex-cli 0.169.0'); else process.exitCode = 23;\n`, { mode: 0o700 });
// Node treats an extensionless entry as CommonJS outside a type:module package.
writeFileSync(join(bin, 'package.json'), '{"type":"module"}\n');
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
  !/^(CXV_|CODEX_|OTEL_)/.test(name) && !['NODE_OPTIONS', 'NPM_CONFIG_PREFIX', 'NPM_CONFIG_CACHE'].includes(name)));
Object.assign(env, { HOME: runtimeHome, CODEX_HOME: join(runtimeHome, 'codex'),
  PATH: `${bin}:${process.env.PATH}`, CXV_LOG_DIR: logs, CXV_NO_OPEN: '1',
  CXV_TEST: '1', NODE_ENV: 'test', CXV_CAPTURE_ONLY: '1', CXV_BYPASS_PERMISSIONS: '0',
  CXV_BASE_PATH: '/b12/', CXV_ALLOWED_HOSTS: 'localhost,127.0.0.1,::1,[::1],viewer.invalid',
  npm_config_prefix: prefix, npm_config_cache: join(base, 'npm-cache') });
Object.assign(process.env, { HOME: runtimeHome, CODEX_HOME: env.CODEX_HOME, CXV_LOG_DIR: logs });
const update = await import(pathToFileURL(join(pkg, 'lib/update-job.js')));
const configDir = dirname(update.UPDATE_STATE_FILE);
mkdirSync(configDir, { recursive: true, mode: 0o700 });
const cliPath = join(pkg, 'cli.js');
const packageVersion = () => JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8')).version;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const history = [];
const children = [];
const outputs = [];
let downloader;

async function freePort() {
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}
const port = await freePort();
Object.assign(env, { CXV_START_PORT: String(port), CXV_MAX_PORT: String(port) });

function http(path, { method = 'GET', token, remote = false } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, method,
      path: '/b12' + path + (token ? `${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : ''),
      headers: remote ? { Host: `viewer.invalid:${port}` } : {}, timeout: 3000 }, response => {
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        let data; try { data = JSON.parse(body); } catch {}
        resolve({ status: response.statusCode, data, body });
      });
    });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('probe request timeout'))); req.end();
  });
}
async function waitFor(check, label, timeout = 180000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try { const value = await check(); if (value) return value; } catch {}
    await pause(100);
  }
  throw new Error('Timed out: ' + label + '; inspect private runtime logs at ' + base);
}
async function start() {
  const logFile = join(base, `runtime-${outputs.length}.log`);
  writeFileSync(logFile, '', { mode: 0o600 });
  const child = spawn(process.execPath, [cliPath, '--sdk', '-C', project], { cwd: project, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const output = { text: '', logFile };
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => {
    output.text += chunk; writeFileSync(logFile, output.text, { mode: 0o600 });
  });
  outputs.push(output); children.push(child);
  const info = await waitFor(async () => {
    if (child.exitCode !== null) throw new Error('owned CLI exited');
    const value = await http('/api/version-info');
    return value.status === 200 && value.data?.canRestart && value.data;
  }, 'initial CLI startup', 20000);
  const local = await http('/api/local-url');
  const token = new URL(local.data.url).searchParams.get('token');
  assert.match(token, /^[a-f0-9]{32}$/);
  assert.equal((await http('/api/version-info', { token, remote: true })).status, 200);
  assert.equal((await http('/api/version-info', { remote: true })).status, 403);
  return { child, output, info, token };
}
async function stopOwned(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return;
  let command;
  try { command = execFileSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }); }
  catch { return; }
  assert.ok(command.includes(cliPath), 'refuse to stop a process outside the owned prefix');
  process.kill(pid, 'SIGTERM');
  await waitFor(() => {
    try { process.kill(pid, 0); return false; } catch { return true; }
  }, 'owned replacement shutdown', 10000);
}
function replacementPid(output) {
  return Number([...output.text.matchAll(/Restarted in the background with PID (\d+)/g)].at(-1)?.[1]);
}
async function restart(state, targetVersion, expected) {
  const ready = await http('/api/update/status');
  assert.equal(ready.data.status, 'restart_required');
  const response = await http('/api/update/restart', { method: 'POST' });
  assert.equal(response.status, 200, response.body);
  assert.equal(response.data.status, 'restarting');
  const next = await waitFor(async () => {
    const value = await http('/api/version-info', { token: state.token, remote: true });
    return value.status === 200 && value.data?.processId !== state.info.processId
      && value.data?.version === expected && value.data?.canRestart && value.data;
  }, 'real helper install and replacement HTTP');
  assert.equal(restartPollDecision({ info: next, previousProcessId: state.info.processId, targetVersion }),
    expected === targetVersion ? 'reload' : 'restored');
  assert.equal(existsSync(update.RESTART_CONFIG_FILE), false);
  assert.equal((await http('/api/version-info', { remote: true })).status, 403);
  await waitFor(() => Number.isInteger(replacementPid(state.output)) && replacementPid(state.output) > 0,
    'owned replacement PID in helper log', 10000);
  history.push({ beforeVersion: state.info.version, afterVersion: next.version,
    processChanged: true, oldTokenHttp: 200, anonymousRemoteHttp: 403,
    recoveryDecision: expected === targetVersion ? 'reload' : 'restored', configErased: true });
  return next;
}
async function stage(version, content, dist) {
  const file = await update.downloadRelease({ release: { version,
    dist: { tarball: `https://registry.npmjs.org/cx-viewer/-/cx-viewer-${version}.tgz`, ...dist } },
    directory: configDir,
    fetchImpl: (_url, options) => fetch(`http://127.0.0.1:${downloader.address().port}/registry`, options) });
  assert.deepEqual(readFileSync(file), content);
  writeFileSync(update.UPDATE_STATE_FILE, JSON.stringify({ version, tarballPath: file, root: npmRoot, dist }), { mode: 0o600 });
  return file;
}

try {
  const content = readFileSync(metadata.syntheticArchive);
  const digest = { integrity: 'sha512-' + createHash('sha512').update(content).digest('base64') };
  downloader = createServer((req, res) => {
    if (req.url === '/registry') { res.writeHead(302, { Location: '/cdn' }); res.end(); }
    else { res.writeHead(200, { 'Content-Length': content.length }); res.end(content); }
  });
  await new Promise(resolve => downloader.listen(0, '127.0.0.1', resolve));
  const staged = await stage(metadata.syntheticTargetVersion, content, digest);
  const first = await start();
  assert.equal(first.info.version, metadata.repoVersion);
  await restart(first, metadata.syntheticTargetVersion, metadata.syntheticTargetVersion);
  assert.equal(packageVersion(), metadata.syntheticTargetVersion);
  assert.equal(existsSync(staged), false);
  assert.equal(existsSync(update.UPDATE_STATE_FILE), false);
  await stopOwned(replacementPid(first.output));

  // Real helper failure path: the staged file is now corrupt. It must fail
  // integrity verification before npm and restore the existing owned CLI.
  const parts = metadata.syntheticTargetVersion.split('.'); parts[2] = String(Number(parts[2]) + 1);
  const failedTarget = parts.join('.');
  const corrupt = await stage(failedTarget, content, digest);
  writeFileSync(corrupt, 'corrupt staged tarball', { mode: 0o600 });
  await chmod(corrupt, 0o600);
  const second = await start();
  assert.notEqual(second.token, first.token, 'a manual launch must rotate the previous token');
  assert.equal((await http('/api/version-info', { token: first.token, remote: true })).status, 403);
  await restart(second, failedTarget, metadata.syntheticTargetVersion);
  const failed = await http('/api/update/status');
  assert.equal(failed.data.status, 'error');
  assert.match(failed.data.error, /integrity check failed/);
  assert.equal(failed.body.includes(second.token), false);
  assert.equal(existsSync(corrupt), false);
  await stopOwned(replacementPid(second.output));

  const callsFile = join(base, 'codex-calls.jsonl');
  const calls = existsSync(callsFile) ? readFileSync(callsFile, 'utf8').trim().split('\n').map(JSON.parse) : [];
  assert.ok(calls.every(call => call.args.includes('--version') && !call.handoffPresent),
    'the probe must not execute a model turn or leak the handoff');
  const result = { installedPackage: pkg, npmPrefix: prefix, port,
    syntheticTargetOnly: metadata.syntheticTargetVersion, repositoryVersionUnchanged: metadata.repoVersion,
    realRedirectedTarball: true, realCliRestartHandler: true, realNpmInstallInOwnedPrefix: true,
    history, manualLaunchRotated: true, corruptStageRestoredWithoutInstall: true,
    modelTurns: 0, childHandoffAbsent: true, activeUserInstancesTouched: false,
    guiVerified: false, privateLogFiles: outputs.map(output => output.logFile) };
  writeFileSync(join(base, 'runtime-result.json'), JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(result, null, 2));
} finally {
  for (const child of children) if (child.exitCode === null && child.signalCode === null) await stopOwned(child.pid);
  for (const output of outputs) {
    const pid = replacementPid(output);
    if (pid > 0) await stopOwned(pid);
  }
  if (downloader) { downloader.closeAllConnections(); await new Promise(resolve => downloader.close(resolve)); }
  await rm(update.RESTART_CONFIG_FILE, { force: true });
}
