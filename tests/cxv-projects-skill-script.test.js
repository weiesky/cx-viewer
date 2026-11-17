import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  adaptiveUrl, cleanEnv, loadWorkspaces, logDir, normDir,
} from '../imSkills/scripts/cxv-projects.mjs';

test('CXV project skill adapts URLs to password login', () => {
  assert.equal(adaptiveUrl('http://192.168.1.5:7008?token=abc', true), 'http://192.168.1.5:7008');
  assert.equal(adaptiveUrl('http://192.168.1.5:7008?token=abc', false), 'http://192.168.1.5:7008?token=abc');
  assert.equal(adaptiveUrl(null, true), null);
});

test('CXV project skill strips inherited worker state but keeps the shared log root', () => {
  const previous = { ...process.env };
  try {
    process.env.CXV_LOG_DIR = '/tmp/cxv-log';
    process.env.CXV_HOST = '127.0.0.1';
    process.env.CXV_IM_PLATFORM = 'dingtalk';
    process.env.CXV_START_PORT = '7150';
    const env = cleanEnv();
    assert.equal(env.CXV_LOG_DIR, '/tmp/cxv-log');
    assert.equal(env.CXV_HOST, undefined);
    assert.equal(env.CXV_IM_PLATFORM, undefined);
    assert.equal(env.CXV_START_PORT, undefined);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});

test('CXV project skill uses the CX Viewer workspace registry', () => {
  const previous = process.env.CXV_LOG_DIR;
  const root = mkdtempSync(join(tmpdir(), 'cxv-skill-workspaces-'));
  try {
    process.env.CXV_LOG_DIR = root;
    writeFileSync(join(root, 'workspaces.json'), JSON.stringify({ workspaces: [{ path: '/a' }, { path: '/b' }] }));
    assert.equal(logDir(), resolve(root));
    assert.equal(loadWorkspaces().length, 2);
  } finally {
    if (previous === undefined) delete process.env.CXV_LOG_DIR;
    else process.env.CXV_LOG_DIR = previous;
    rmSync(root, { recursive: true, force: true });
  }
  assert.equal(logDir(), join(homedir(), '.codex', 'cx-viewer'));
});

test('CXV project skill normalizes existing and missing directories', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-skill-path-'));
  try {
    const expected = process.platform === 'win32' ? realpathSync(root).toLowerCase() : realpathSync(root);
    assert.equal(normDir(root), expected);
    const missing = join(root, 'missing');
    assert.equal(normDir(missing), process.platform === 'win32' ? resolve(missing).toLowerCase() : resolve(missing));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
