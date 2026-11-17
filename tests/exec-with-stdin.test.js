import test from 'node:test';
import assert from 'node:assert/strict';
import { execWithStdin } from '../lib/exec-with-stdin.js';

test('stdin helper retains normal output and accepts git-style nonzero exits', async () => {
  const source = `let input = ''; process.stdin.on('data', d => input += d); process.stdin.on('end', () => { process.stdout.write(input.toUpperCase()); process.exitCode = 1; });`;
  assert.equal(await execWithStdin(process.execPath, ['-e', source], 'public.txt\n', { timeout: 2000 }), 'PUBLIC.TXT\n');
});

test('early child exits with buffered input do not produce unhandled stdin EPIPE', async () => {
  for (let i = 0; i < 3; i++) {
    assert.equal(await execWithStdin(process.execPath, ['-e', 'process.exit(1)'], 'x'.repeat(4 * 1024 * 1024), { timeout: 2000 }), '');
  }
});

test('spawn failures and timeouts reject without leaving a late unhandled pipe error', async () => {
  await assert.rejects(execWithStdin('cxv-nonexistent-command-fixture', [], 'x'.repeat(1024 * 1024), { timeout: 1000 }), { code: 'ENOENT' });
  await assert.rejects(execWithStdin(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], 'x'.repeat(1024 * 1024), { timeout: 50 }), /timeout/);
});
