import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, realpathSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  LOGGER_INJECT_START,
  injectLoggerBootstrapAt,
  removeLoggerBootstrapAt,
  resolveJavascriptLauncher,
} from '../lib/logger-install.js';

test('logger bootstrap injection follows npm bin symlinks and is idempotent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cxv-logger-install-'));
  const launcher = join(dir, 'codex.js');
  const bin = join(dir, 'codex');
  const bootstrap = join(dir, 'logger-bootstrap.js');
  writeFileSync(launcher, '#!/usr/bin/env node\nconsole.log("codex");\n');
  chmodSync(launcher, 0o751);
  writeFileSync(bootstrap, 'export {};\n');
  symlinkSync(launcher, bin);

  assert.equal(resolveJavascriptLauncher(bin), realpathSync(launcher));
  const originalInode = statSync(launcher).ino;
  const first = injectLoggerBootstrapAt(bin, bootstrap);
  assert.equal(first.status, 'injected');
  assert.notEqual(statSync(launcher).ino, originalInode);
  assert.equal(statSync(launcher).mode & 0o777, 0o751);
  assert.match(readFileSync(launcher, 'utf8'), new RegExp(LOGGER_INJECT_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(injectLoggerBootstrapAt(bin, bootstrap).status, 'exists');

  // Removing cx-viewer without running its uninstaller must not brick Codex.
  writeFileSync(bootstrap, 'throw new Error("missing logger runtime");\n');
  const fallback = spawnSync(process.execPath, [launcher], { encoding: 'utf8' });
  assert.equal(fallback.status, 0, fallback.stderr);
  assert.match(fallback.stdout, /codex/);

  const removed = removeLoggerBootstrapAt(bin);
  assert.equal(removed.status, 'removed');
  assert.equal(readFileSync(launcher, 'utf8'), '#!/usr/bin/env node\nconsole.log("codex");\n');
});

test('logger bootstrap injection updates a stale bootstrap location', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cxv-logger-update-'));
  const launcher = join(dir, 'codex.js');
  writeFileSync(launcher, '#!/usr/bin/env node\nconsole.log("codex");\n');

  assert.equal(injectLoggerBootstrapAt(launcher, join(dir, 'old.js')).status, 'injected');
  assert.equal(injectLoggerBootstrapAt(launcher, join(dir, 'new.js')).status, 'updated');
  const content = readFileSync(launcher, 'utf8');
  assert.doesNotMatch(content, /old\.js/);
  assert.match(content, /new\.js/);
});
