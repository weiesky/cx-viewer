import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  CodexMemoryError,
  detectCodexMemoriesCapability,
  filterMemoryFeatureArgs,
  getCodexMemoryDir,
  isCodexMemoryRequestAllowed,
  normalizeCodexMemoryPath,
  parseMemoriesFeatureList,
  readCodexMemoryFile,
  readCodexMemoryOverview,
} from '../lib/codex-memory.js';

function fixture() {
  const home = mkdtempSync(join(tmpdir(), 'cxv-memory-'));
  const memoryDir = join(home, 'memories');
  mkdirSync(memoryDir, { recursive: true });
  return { home, memoryDir, env: { CODEX_HOME: home } };
}

function expectCode(fn, code) {
  assert.throws(fn, err => err instanceof CodexMemoryError && err.code === code);
}

test('Codex memory root honors CODEX_HOME and CODEX_CONFIG_DIR', () => {
  assert.equal(getCodexMemoryDir({ CODEX_HOME: '/one', CODEX_CONFIG_DIR: '/two' }), join('/one', 'memories'));
  assert.equal(getCodexMemoryDir({ CODEX_CONFIG_DIR: '/two' }), join('/two', 'memories'));
});

test('memory feature parsing distinguishes enabled, disabled, and unsupported', () => {
  assert.deepEqual(parseMemoriesFeatureList('memories  experimental  true\n'), {
    supported: true, enabled: true, stage: 'experimental',
  });
  assert.equal(parseMemoriesFeatureList('memories\texperimental\tfalse\r\n').enabled, false);
  assert.equal(parseMemoriesFeatureList('hooks stable true\n').supported, false);
});

test('feature detection degrades without throwing when the CLI fails', async () => {
  const result = await detectCodexMemoriesCapability({ runner: async () => { throw new Error('missing'); } });
  assert.equal(result.supported, null);
  assert.equal(result.error, 'feature_detection_failed');
});

test('memory feature detection forwards only relevant profile and memory overrides', async () => {
  assert.deepEqual(filterMemoryFeatureArgs([
    '--profile', 'work', '--enable', 'memories', '--disable', 'hooks',
    '-c', 'features.memories=true', '-c', 'model="x"', '--remote', 'ws://example',
  ]), ['--profile', 'work', '--enable', 'memories', '-c', 'features.memories=true']);

  let received;
  const result = await detectCodexMemoriesCapability({
    executable: '/tmp/codex.js',
    featureArgs: ['--disable', 'memories'],
    runner: async options => { received = options; return 'memories experimental false\n'; },
  });
  assert.equal(received.executable, '/tmp/codex.js');
  assert.deepEqual(received.featureArgs, ['--disable', 'memories']);
  assert.equal(result.enabled, false);
});

test('overview reads MEMORY.md and falls back to memory_summary.md', async () => {
  const a = fixture();
  writeFileSync(join(a.memoryDir, 'MEMORY.md'), '# Durable');
  const enabled = async () => 'memories experimental true\n';
  const first = await readCodexMemoryOverview({ env: a.env, runner: enabled });
  assert.equal(first.status, 'ready');
  assert.equal(first.file, 'MEMORY.md');
  assert.equal(first.content, '# Durable');

  const b = fixture();
  writeFileSync(join(b.memoryDir, 'memory_summary.md'), '# Summary');
  const fallback = await readCodexMemoryOverview({ env: b.env, runner: enabled });
  assert.equal(fallback.status, 'ready');
  assert.equal(fallback.file, 'memory_summary.md');
});

test('overview separates disabled, unsupported, missing, and detection error states', async () => {
  const a = fixture();
  assert.equal((await readCodexMemoryOverview({ env: a.env, runner: async () => 'memories experimental false\n' })).status, 'disabled');
  assert.equal((await readCodexMemoryOverview({ env: a.env, runner: async () => 'hooks stable true\n' })).status, 'unsupported');
  assert.equal((await readCodexMemoryOverview({ env: a.env, runner: async () => 'memories experimental true\n' })).status, 'missing');
  assert.equal((await readCodexMemoryOverview({ env: a.env, runner: async () => { throw new Error('timeout'); } })).status, 'error');
});

test('reads nested generated Markdown and rejects unsafe or internal paths', () => {
  const f = fixture();
  mkdirSync(join(f.memoryDir, 'rollout_summaries'), { recursive: true });
  writeFileSync(join(f.memoryDir, 'rollout_summaries', '任务.md'), '# Evidence');
  assert.equal(readCodexMemoryFile('rollout_summaries/任务.md', { env: f.env }).content, '# Evidence');

  for (const value of [
    '', '../MEMORY.md', 'rollout_summaries/../MEMORY.md', '/etc/passwd.md',
    'C:\\secret.md', 'rollout_summaries//a.md', 'raw_memories.md',
    'unknown/a.md', 'extensions/private.md', 'skills/.hidden/a.md', 'rollout_summaries/a.txt',
    decodeURIComponent('rollout_summaries/%2e%2e/a.md'),
  ]) expectCode(() => normalizeCodexMemoryPath(value), 'invalid_path');
  // URLSearchParams decodes exactly once. A still-encoded segment is treated as
  // a literal filename, never decoded again into traversal by the file layer.
  assert.equal(normalizeCodexMemoryPath('rollout_summaries/%252e%252e.md'), 'rollout_summaries/%252e%252e.md');
});

test('rejects final and intermediate symlinks that leave the memory root', () => {
  const f = fixture();
  const outside = join(f.home, 'outside.md');
  writeFileSync(outside, 'secret');
  mkdirSync(join(f.memoryDir, 'rollout_summaries'));
  symlinkSync(outside, join(f.memoryDir, 'rollout_summaries', 'escape.md'));
  expectCode(() => readCodexMemoryFile('rollout_summaries/escape.md', { env: f.env }), 'invalid_path');

  const outsideDir = join(f.home, 'outside-dir');
  mkdirSync(outsideDir);
  writeFileSync(join(outsideDir, 'a.md'), 'secret');
  mkdirSync(join(f.memoryDir, 'skills'));
  symlinkSync(outsideDir, join(f.memoryDir, 'skills', 'escape'));
  expectCode(() => readCodexMemoryFile('skills/escape/a.md', { env: f.env }), 'invalid_path');
});

test('enforces the configured memory file size limit', () => {
  const f = fixture();
  writeFileSync(join(f.memoryDir, 'MEMORY.md'), 'x'.repeat(33));
  expectCode(() => readCodexMemoryFile('MEMORY.md', { env: f.env, maxBytes: 32 }), 'memory_file_too_large');
});

test('rejects a directory where a regular Markdown file is required', () => {
  const f = fixture();
  mkdirSync(join(f.memoryDir, 'skills', 'fake.md'), { recursive: true });
  expectCode(() => readCodexMemoryFile('skills/fake.md', { env: f.env }), 'invalid_path');
});

test('sensitive memory endpoints require loopback same-origin or the access token', () => {
  const base = { expectedToken: 'secret', localIps: ['192.168.1.5'] };
  assert.equal(isCodexMemoryRequestAllowed({ ...base, host: '127.0.0.1:7008', origin: 'http://127.0.0.1:7008' }), true);
  assert.equal(isCodexMemoryRequestAllowed({ ...base, host: 'evil.example:7008', origin: 'http://evil.example:7008' }), false);
  assert.equal(isCodexMemoryRequestAllowed({ ...base, host: '192.168.1.5:7008', origin: 'http://192.168.1.5:7008' }), true);
  assert.equal(isCodexMemoryRequestAllowed({ ...base, host: 'evil.example:7008', origin: 'http://evil.example:7008', token: 'secret' }), true);
  assert.equal(isCodexMemoryRequestAllowed({ ...base, host: '127.0.0.1:7008', origin: 'https://attacker.example' }), false);
});
