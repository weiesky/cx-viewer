import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { READ_MODES, WRITE_MODES, resolveLogV2Config } from '../lib/log-v2/config.js';
import {
  loadLogV2RuntimeConfig,
  loadLogV2RuntimeConfigDocument,
  logV2RuntimeConfigPath,
  writeLogV2RuntimeConfig,
} from '../lib/log-v2/runtime-config.js';

test('log v2 config defaults to v1 read and write', () => {
  assert.deepEqual(resolveLogV2Config({}), {
    writeMode: 'v1',
    readMode: 'v1',
    minFreeBytes: 512 * 1024 * 1024,
    minFreePercent: 5,
    failureLimit: 3,
    gateFile: null,
    projectV1: true,
  });
});

test('log v2 config accepts startup-only dual write and v2 read', () => {
  const config = resolveLogV2Config({
    CXV_LOG_WRITE_MODE: ' DUAL ',
    CXV_LOG_READ_MODE: 'V2',
  });
  assert.equal(config.writeMode, 'dual');
  assert.equal(config.readMode, 'v2');
  assert.ok(Object.isFrozen(config));
  assert.equal(config.gateFile, null);
  assert.equal(config.projectV1, true);
  assert.deepEqual(WRITE_MODES, ['v1', 'dual', 'v2']);
  assert.deepEqual(READ_MODES, ['v1', 'v2']);
});

test('log v2 config rejects explicit unsupported modes', () => {
  assert.throws(() => resolveLogV2Config({ CXV_LOG_WRITE_MODE: 'shadow' }), /CXV_LOG_WRITE_MODE/);
  assert.throws(() => resolveLogV2Config({ CXV_LOG_READ_MODE: 'dual' }), /CXV_LOG_READ_MODE/);
  assert.throws(() => resolveLogV2Config({ CXV_LOG_V2_MIN_FREE_BYTES: '-1' }), /MIN_FREE_BYTES/);
  assert.throws(() => resolveLogV2Config({ CXV_LOG_V2_FAILURE_LIMIT: '0' }), /FAILURE_LIMIT/);
  assert.throws(() => resolveLogV2Config({ CXV_LOG_V2_MIN_FREE_PERCENT: '101' }), /MIN_FREE_PERCENT/);
  assert.throws(() => resolveLogV2Config({ CXV_LOG_V2_PROJECT_V1: 'sometimes' }), /PROJECT_V1/);
});

test('runtime config persists startup defaults while explicit environment wins', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-runtime-config-'));
  try {
    const written = writeLogV2RuntimeConfig(root, {
      writeMode: 'dual', readMode: 'v1', minFreeBytes: 123, projectV1: false,
    });
    assert.equal(written.file, logV2RuntimeConfigPath(root));
    const defaults = loadLogV2RuntimeConfig(root);
    assert.equal(defaults.writeMode, 'dual');
    assert.equal(defaults.minFreeBytes, 123);
    assert.equal(resolveLogV2Config({}, defaults).writeMode, 'dual');
    assert.equal(resolveLogV2Config({ CXV_LOG_WRITE_MODE: 'v1' }, defaults).writeMode, 'v1');
    assert.ok(Object.isFrozen(defaults));
    const document = loadLogV2RuntimeConfigDocument(root);
    assert.equal(document.updatedAt, written.config.updatedAt);
    assert.equal(document.writeMode, 'dual');
    assert.ok(Object.isFrozen(document));

    writeFileSync(written.file, JSON.stringify({ ...written.config, updatedAt: 'invalid' }));
    assert.throws(() => loadLogV2RuntimeConfig(root), /updatedAt/);

    writeFileSync(written.file, JSON.stringify({ kind: 'wrong', version: 1 }));
    assert.throws(() => loadLogV2RuntimeConfig(root), /kind or version/);

    writeFileSync(written.file, JSON.stringify({ ...written.config, unexpected: true }));
    assert.throws(() => loadLogV2RuntimeConfigDocument(root), /unknown.*unexpected/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runtime config loader and CLI handle absent files, normalized values, and invalid options', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-runtime-cli-'));
  try {
    assert.deepEqual(loadLogV2RuntimeConfig(root), {});
    assert.equal(loadLogV2RuntimeConfigDocument(root), null);
    const cliPath = fileURLToPath(new URL('../lib/log-v2/runtime-config.js', import.meta.url));
    const child = spawnSync(process.execPath, [
      cliPath,
      root,
      '--write=dual',
      '--read=v1',
      '--min-free-bytes=0',
      '--min-free-percent=0',
      '--failure-limit=5',
      '--project-v1=false',
    ], { encoding: 'utf8', timeout: 20_000 });
    assert.equal(child.status, 0, child.stderr);
    const output = JSON.parse(child.stdout);
    assert.equal(output.file, logV2RuntimeConfigPath(root));
    const document = loadLogV2RuntimeConfigDocument(root);
    assert.equal(document.writeMode, 'dual');
    assert.equal(document.readMode, 'v1');
    assert.equal(document.minFreeBytes, 0);
    assert.equal(document.minFreePercent, 0);
    assert.equal(document.failureLimit, 5);
    assert.equal(document.projectV1, false);
    assert.equal(statSync(output.file).mode & 0o777, 0o600);

    const invalid = spawnSync(process.execPath, [cliPath, root, '--unknown=value'], {
      encoding: 'utf8', timeout: 20_000,
    });
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /unknown option/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('interceptor reads dual observation mode from the log-root runtime config', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-runtime-process-'));
  const logs = join(root, 'logs');
  const project = join(root, 'project');
  try {
    mkdirSync(logs, { recursive: true });
    mkdirSync(project, { recursive: true });
    writeLogV2RuntimeConfig(logs, {
      writeMode: 'dual', readMode: 'v1', minFreeBytes: 0, minFreePercent: 0,
    });
    const interceptorUrl = pathToFileURL(fileURLToPath(new URL('../interceptor.js', import.meta.url))).href;
    const script = `
      const mod = await import(${JSON.stringify(interceptorUrl)});
      await mod._initPromise;
      const result = mod.appendLogEntry({
        timestamp: '2026-07-14T03:00:00.000Z', project: 'project', url: 'codex://runtime-config',
        method: 'POST', headers: {}, body: { value: 1 }, response: null,
      }, { source: 'proxy', cwd: ${JSON.stringify(project)}, projectId: 'project' });
      console.log(JSON.stringify({ result, status: mod.getLogV2RuntimeStatus() }));
      process.exit(0);
    `;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: project,
      env: {
        ...process.env,
        CXV_TEST: '1',
        CXV_LOG_DIR: logs,
        CXV_WORKSPACE_MODE: '0',
        CXV_LOG_WRITE_MODE: '',
        CXV_LOG_READ_MODE: '',
      },
      encoding: 'utf8',
      timeout: 20_000,
    });
    assert.equal(child.status, 0, child.stderr);
    const output = JSON.parse(child.stdout.trim().split('\n').at(-1));
    assert.equal(output.status.config.writeMode, 'dual');
    assert.equal(output.status.config.readMode, 'v1');
    assert.equal(output.result.written, true);
    assert.equal(output.result.shadowV2.written, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
