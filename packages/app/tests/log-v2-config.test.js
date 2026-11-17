import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveLogV2Config } from '../lib/log-v2/config.js';
import { loadLogV2RuntimeConfig, loadLogV2RuntimeConfigDocument, logV2RuntimeConfigPath, writeLogV2RuntimeConfig } from '../lib/log-v2/runtime-config.js';

test('log config is V2-only and retains reliability limits', () => {
  assert.deepEqual(resolveLogV2Config({}), {
    minFreeBytes: 512 * 1024 * 1024,
    minFreePercent: 5,
    failureLimit: 3,
  });
  assert.deepEqual(resolveLogV2Config({
    CXV_LOG_V2_MIN_FREE_BYTES: '0', CXV_LOG_V2_MIN_FREE_PERCENT: '0', CXV_LOG_V2_FAILURE_LIMIT: '5',
  }), { minFreeBytes: 0, minFreePercent: 0, failureLimit: 5 });
  assert.throws(() => resolveLogV2Config({ CXV_LOG_V2_MIN_FREE_BYTES: '-1' }), /MIN_FREE_BYTES/);
  assert.throws(() => resolveLogV2Config({ CXV_LOG_V2_FAILURE_LIMIT: '0' }), /FAILURE_LIMIT/);
});

test('runtime config rejects unsupported fields', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-runtime-config-'));
  try {
    const file = logV2RuntimeConfigPath(root);
    writeLogV2RuntimeConfig(root, { minFreeBytes: 123 });
    const base = loadLogV2RuntimeConfigDocument(root);
    writeFileSync(file, JSON.stringify({ ...base, unexpected: true }));
    assert.throws(() => loadLogV2RuntimeConfig(root), /unknown.*unexpected/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('runtime config ignores retired V1 selection fields', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-runtime-config-'));
  try {
    writeLogV2RuntimeConfig(root, { minFreeBytes: 123 });
    const file = logV2RuntimeConfigPath(root);
    const base = loadLogV2RuntimeConfigDocument(root);
    writeFileSync(file, JSON.stringify({ ...base, writeMode: 'dual', readMode: 'v1', gateFile: '/tmp/gate', projectV1: true }));
    assert.deepEqual(loadLogV2RuntimeConfig(root), { minFreeBytes: 123, minFreePercent: 5, failureLimit: 3 });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('runtime config CLI writes only V2 reliability settings', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-runtime-cli-'));
  try {
    const cli = fileURLToPath(new URL('../lib/log-v2/runtime-config.js', import.meta.url));
    const child = spawnSync(process.execPath, [cli, root, '--min-free-bytes=0', '--min-free-percent=0', '--failure-limit=5'], { encoding: 'utf8' });
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(loadLogV2RuntimeConfig(root), { minFreeBytes: 0, minFreePercent: 0, failureLimit: 5 });
    assert.equal(statSync(logV2RuntimeConfigPath(root)).mode & 0o777, 0o600);
    const retired = spawnSync(process.execPath, [cli, root, '--write=v1'], { encoding: 'utf8' });
    assert.equal(retired.status, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
