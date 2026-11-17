import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

function runBridgeAgainst(response, { env = {}, command = 'npm test' } = {}) {
  return new Promise((resolve, reject) => {
    let received = null;
    const server = createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        received = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const child = spawn(process.execPath, ['lib/perm-bridge.js'], {
        cwd: fileURLToPath(new URL('..', import.meta.url)),
        env: { ...process.env, ...env, CXVIEWER_PORT: String(server.address().port) },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', chunk => { stdout += chunk; });
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', status => {
        server.close(() => resolve({ status, stdout, stderr, received }));
      });
      child.stdin.end(JSON.stringify({
        hook_event_name: 'PermissionRequest',
        tool_name: 'shell_command',
        tool_input: { command },
      }));
    });
  });
}

test('perm-bridge emits Codex PermissionRequest decisions', () => {
  const child = spawnSync(process.execPath, ['lib/perm-bridge.js'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    input: JSON.stringify({
      hook_event_name: 'PermissionRequest',
      tool_name: 'shell_command',
      tool_input: { command: 'npm test' },
    }),
    env: { ...process.env, CXVIEWER_PORT: '1', CXV_BYPASS_PERMISSIONS: '1' },
    encoding: 'utf8',
  });

  assert.equal(child.status, 0);
  const output = JSON.parse(child.stdout);
  assert.equal(output.hookSpecificOutput.hookEventName, 'PermissionRequest');
  assert.equal(output.hookSpecificOutput.decision.behavior, 'allow');
});

test('perm-bridge can defer a PermissionRequest to the native Codex reviewer', async () => {
  const child = await runBridgeAgainst({ deferToCodex: true });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), { continue: true, suppressOutput: true });
  assert.equal(child.received.forceManual, false);
});

test('perm-bridge preserves manual publish guard in bypass mode', async () => {
  const child = await runBridgeAgainst({ decision: 'allow' }, {
    env: { CXV_BYPASS_PERMISSIONS: '1' },
    command: 'git push origin main',
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.received.forceManual, true);
  assert.equal(JSON.parse(child.stdout).hookSpecificOutput.decision.behavior, 'allow');
});

test('perm-bridge preserves manual publish guard outside bypass mode', async () => {
  const child = await runBridgeAgainst({ decision: 'deny' }, {
    command: 'npm publish',
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.received.forceManual, true);
  assert.equal(JSON.parse(child.stdout).hookSpecificOutput.decision.behavior, 'deny');
});

test('perm-bridge fails closed for protected publish commands when viewer is unavailable in bypass mode', () => {
  const child = spawnSync(process.execPath, ['lib/perm-bridge.js'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    input: JSON.stringify({
      hook_event_name: 'PermissionRequest',
      tool_name: 'shell_command',
      tool_input: { command: 'git -C repo push origin main' },
    }),
    env: { ...process.env, CXVIEWER_PORT: '', CXV_BYPASS_PERMISSIONS: '1' },
    encoding: 'utf8',
  });
  assert.equal(child.status, 0);
  assert.equal(JSON.parse(child.stdout).hookSpecificOutput.decision.behavior, 'deny');
});

test('perm-bridge fails closed for protected publish commands without bypass when viewer is unavailable', () => {
  const child = spawnSync(process.execPath, ['lib/perm-bridge.js'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    input: JSON.stringify({
      hook_event_name: 'PermissionRequest',
      tool_name: 'shell_command',
      tool_input: { command: 'git push origin main' },
    }),
    env: { ...process.env, CXVIEWER_PORT: '', CXV_BYPASS_PERMISSIONS: '0' },
    encoding: 'utf8',
  });
  assert.equal(child.status, 0);
  assert.equal(JSON.parse(child.stdout).hookSpecificOutput.decision.behavior, 'deny');
});

test('perm-bridge recognizes common protected publish command variants', async () => {
  for (const command of [
    'git -C repo push origin main',
    'git -c user.name=test commit -m test',
    'npm --workspace pkg publish',
    'env git push origin main',
    'GIT_SSH_COMMAND=ssh git push origin main',
    'command git commit -m test',
    'sudo /usr/bin/git push origin main',
    'env npm publish',
  ]) {
    const child = await runBridgeAgainst({ decision: 'deny' }, { command });
    assert.equal(child.received.forceManual, true, command);
  }
});
