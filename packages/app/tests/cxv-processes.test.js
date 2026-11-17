import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createProcessAdapter,
  decodeProcessRef,
  encodeProcessRef,
  isCxvCommand,
  isCxvProcess,
  killVerifiedTree,
  sameProcessIdentity,
} from '../lib/cxv-processes.js';

test('CXV command detection excludes unrelated node listeners', () => {
  assert.equal(isCxvCommand('node /opt/bin/cxv -d'), true);
  assert.equal(isCxvCommand('node /opt/node_modules/cx-viewer/cli.js -d'), true);
  assert.equal(isCxvCommand('node unrelated-server.js'), false);
  assert.equal(isCxvProcess({ command: 'node server.js', cwd: '/opt/node_modules/cx-viewer' }), true);
  assert.equal(isCxvProcess({ command: 'node server.js', cwd: '/opt/unrelated' }), false);
  assert.equal(isCxvProcess({ platform: 'win32', command: 'node.exe server.js' }), true);
});

test('process references preserve a stable identity without exposing the command', () => {
  const identity = { pid: 42, startId: 'start-1', commandHash: 'a'.repeat(64), port: 7008 };
  const secret = Buffer.from('test-secret');
  const ref = encodeProcessRef(identity, secret);
  assert.deepEqual(decodeProcessRef(ref, secret), identity);
  assert.equal(decodeProcessRef(ref, Buffer.from('wrong')), null);
  assert.equal(decodeProcessRef('bad', secret), null);
});

test('POSIX discovery binds listener data to the exact CXV process identity', async () => {
  const runner = async (command, args) => {
    if (command === 'lsof') {
      return { stdout: 'COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME\nnode 42 sky 18u IPv4 0 0t0 TCP *:7008 (LISTEN)\nnode 43 sky 19u IPv4 0 0t0 TCP *:7009 (LISTEN)\n' };
    }
    if (command === 'ps' && args[0] === '-p') {
      const pid = Number(args[1]);
      return { stdout: pid === 42
        ? '42 1 Mon Jul 20 22:26:27 2026 node /opt/bin/cxv\n'
        : '43 1 Mon Jul 20 22:26:28 2026 node unrelated-server.js\n' };
    }
    throw new Error(`unexpected ${command} ${args.join(' ')}`);
  };
  const adapter = createProcessAdapter({ platform: 'darwin', runner });
  const processes = await adapter.listCxvProcesses();
  assert.equal(processes.length, 1);
  assert.equal(processes[0].pid, 42);
  assert.equal(processes[0].port, 7008);
});

test('POSIX discovery recognizes the supported standalone server only in a CXV cwd', async () => {
  const runner = async (command, args) => {
    if (command === 'lsof' && args.includes('-d')) {
      return { stdout: 'p44\nfcwd\nn/opt/node_modules/cx-viewer\n' };
    }
    if (command === 'lsof') {
      return { stdout: 'COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME\nnode 44 sky 18u IPv4 0 0t0 TCP *:7008 (LISTEN)\n' };
    }
    if (command === 'ps') {
      return { stdout: '44 1 Mon Jul 20 22:26:27 2026 node server.js\n' };
    }
    throw new Error('unexpected command');
  };
  const adapter = createProcessAdapter({ platform: 'darwin', runner });
  const processes = await adapter.listCxvProcesses();
  assert.equal(processes.length, 1);
  assert.equal(processes[0].pid, 44);
});

test('process inspection errors are not mistaken for a missing process', async () => {
  const adapter = createProcessAdapter({
    platform: 'darwin',
    runner: async () => { throw Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }); },
  });
  await assert.rejects(adapter.inspect(42), error => error?.code === 'CXV_PROCESS_INSPECTION_FAILED');
});

test('Windows discovery uses PowerShell identity and listener data', async () => {
  const runner = async (_command, args) => {
    const script = args.at(-1);
    if (script.includes('Get-NetTCPConnection')) {
      return { stdout: '[{"OwningProcess":55,"LocalPort":7008}]' };
    }
    return { stdout: JSON.stringify({
      ProcessId: 55,
      ParentProcessId: 1,
      CreationDate: '20260720222627.000000+480',
      ExecutablePath: 'C:\\Program Files\\nodejs\\node.exe',
      CommandLine: 'node.exe server.js',
    }) };
  };
  const adapter = createProcessAdapter({ platform: 'win32', runner });
  const processes = await adapter.listCxvProcesses();
  assert.equal(processes.length, 1);
  assert.equal(processes[0].pid, 55);
});

test('identity comparison rejects PID reuse even when command and port are unchanged', () => {
  const expected = { pid: 42, startId: 'old', commandHash: 'a'.repeat(64) };
  const reused = { pid: 42, startId: 'new', commandHash: 'a'.repeat(64) };
  assert.equal(sameProcessIdentity(expected, reused), false);
});

test('verified tree cleanup skips descendants whose identity changed', async () => {
  const root = { pid: 42, startId: 'root', commandHash: 'a'.repeat(64) };
  const child = { pid: 43, startId: 'child', commandHash: 'b'.repeat(64) };
  const signals = [];
  const adapter = {
    inspect: async pid => pid === 42 ? root : { ...child, startId: 'reused' },
    signal: (identity, signal) => signals.push([identity.pid, signal]),
  };
  await killVerifiedTree(adapter, root, [child]);
  assert.deepEqual(signals, [[42, 'SIGKILL']]);
});
