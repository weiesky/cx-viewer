import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SERVER_URL = new URL('../server.js', import.meta.url).href;
const VALID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

function loadTokenInChild(value) {
  const dir = mkdtempSync(join(tmpdir(), 'cxv-token-env-'));
  try {
    const env = { ...process.env, HOME: dir, CODEX_HOME: join(dir, 'codex'),
      CXV_LOG_DIR: join(dir, 'logs'), CXV_PROJECT_DIR: dir,
      CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1', CXV_TEST: '1',
      CXV_PROXY_PROFILE_PATH: join(dir, 'profiles.json') };
    for (const name of ['CXV_ACCESS_TOKEN', 'CXV_IM_WORKER', 'CXV_TLS_CERT', 'CXV_TLS_KEY']) delete env[name];
    if (value !== undefined) env.CXV_ACCESS_TOKEN = value;
    const script = `
      const mod = await import(${JSON.stringify(SERVER_URL)});
      const { spawnSync } = await import('node:child_process');
      const child = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.env.CXV_ACCESS_TOKEN === undefined))'], { encoding: 'utf8' });
      console.log(JSON.stringify({ token: mod.getAccessToken(), envLeft: process.env.CXV_ACCESS_TOKEN === undefined,
        childClean: child.status === 0 && child.stdout === 'true', otelSeparate: mod.getOtelAccessToken() !== mod.getAccessToken() }));
      await mod.stopViewer();
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env, encoding: 'utf8', timeout: 20000, killSignal: 'SIGKILL' });
    assert.equal(result.error, undefined, result.stderr);
    assert.equal(result.signal, null, result.stderr);
    assert.equal(result.status, 0, result.stderr);
    const line = result.stdout.split('\n').find(line => line.startsWith('{"token":'));
    assert.ok(line, result.stdout);
    return JSON.parse(line);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

describe('server access-token self-update handoff', () => {
  it('adopts the inherited token and consumes it before later child processes', () => {
    const result = loadTokenInChild(VALID);
    assert.equal(result.token, VALID);
    assert.equal(result.envLeft, true);
    assert.equal(result.childClean, true);
    assert.equal(result.otelSeparate, true);
  });
  it('rejects malformed handoffs, strips them and generates a fresh token', () => {
    const result = loadTokenInChild('invalid-handoff');
    assert.match(result.token, /^[a-f0-9]{32}$/);
    assert.equal(result.envLeft, true);
    assert.equal(result.childClean, true);
  });
  it('rotates tokens across manual starts without a handoff', () => {
    const first = loadTokenInChild();
    const second = loadTokenInChild();
    assert.match(first.token, /^[a-f0-9]{32}$/);
    assert.match(second.token, /^[a-f0-9]{32}$/);
    assert.notEqual(first.token, second.token);
    assert.equal(first.envLeft && second.envLeft, true);
  });
});
