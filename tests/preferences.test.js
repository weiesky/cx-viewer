import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repositoryUrl = pathToFileURL(join(process.cwd(), 'lib/preferences.js')).href;

function runPreferencesScript(logDir, source) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], {
      env: { ...process.env, CXV_LOG_DIR: logDir },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(stderr || `child exited ${code}`)));
  });
}

function runUpdater(logDir, iterations) {
  return runPreferencesScript(logDir, `
    import { updatePreferences } from ${JSON.stringify(repositoryUrl)};
    for (let i = 0; i < ${iterations}; i++) {
      updatePreferences(prefs => {
        prefs.concurrentCounter = (prefs.concurrentCounter || 0) + 1;
        return prefs;
      });
    }
  `);
}

test('preferences updates are atomic, mode 0600, and serialized across processes', async () => {
  const logDir = mkdtempSync(join(tmpdir(), 'cxv-preferences-'));
  try {
    await Promise.all([runUpdater(logDir, 20), runUpdater(logDir, 20)]);
    const path = join(logDir, 'preferences.json');
    const prefs = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(prefs.concurrentCounter, 40);
    assert.equal(statSync(path).mode & 0o777, 0o600);
  } finally {
    rmSync(logDir, { recursive: true, force: true });
  }
});

test('updates preserve corrupt preferences and release the lock for recovery', async () => {
  const logDir = mkdtempSync(join(tmpdir(), 'cxv-preferences-corrupt-'));
  const path = join(logDir, 'preferences.json');
  try {
    for (const corrupt of ['{"secret":"truncated', 'null', '[]', '"text"', '42']) {
      writeFileSync(path, corrupt);
      await runPreferencesScript(logDir, `
        import assert from 'node:assert/strict';
        import { readPreferences, updatePreferences } from ${JSON.stringify(repositoryUrl)};
        assert.deepEqual(readPreferences(), {});
        let called = false;
        assert.throws(() => updatePreferences(() => { called = true; return {}; }),
          { code: 'PREFERENCES_UNREADABLE' });
        assert.equal(called, false);
      `);
      assert.equal(readFileSync(path, 'utf8'), corrupt);
      assert.equal(existsSync(`${path}.lock`), false);
      assert.equal(readdirSync(logDir).some(name => name.includes('.tmp-')), false);
    }
    writeFileSync(path, '{"concurrentCounter":7}');
    await runUpdater(logDir, 1);
    assert.equal(JSON.parse(readFileSync(path, 'utf8')).concurrentCounter, 8);
  } finally { rmSync(logDir, { recursive: true, force: true }); }
});

test('an unreadable preferences path is not treated as a missing file', async () => {
  const logDir = mkdtempSync(join(tmpdir(), 'cxv-preferences-unreadable-'));
  const path = join(logDir, 'preferences.json');
  mkdirSync(path);
  try {
    await runPreferencesScript(logDir, `
      import assert from 'node:assert/strict';
      import { readPreferences, updatePreferences } from ${JSON.stringify(repositoryUrl)};
      assert.deepEqual(readPreferences(), {});
      assert.throws(() => updatePreferences(prefs => prefs), { code: 'PREFERENCES_UNREADABLE' });
    `);
    assert.equal(statSync(path).isDirectory(), true);
    assert.equal(existsSync(`${path}.lock`), false);
  } finally { rmSync(logDir, { recursive: true, force: true }); }
});

test('strict updates reject malformed UTF-8 without replacing it', async () => {
  const logDir = mkdtempSync(join(tmpdir(), 'cxv-preferences-encoding-'));
  const path = join(logDir, 'preferences.json');
  const bytes = Buffer.concat([Buffer.from('{"secret":"'), Buffer.from([0xff]), Buffer.from('"}')]);
  writeFileSync(path, bytes);
  try {
    await runPreferencesScript(logDir, `
      import assert from 'node:assert/strict';
      import { updatePreferences } from ${JSON.stringify(repositoryUrl)};
      assert.throws(() => updatePreferences(prefs => prefs), { code: 'PREFERENCES_UNREADABLE' });
    `);
    assert.deepEqual(readFileSync(path), bytes);
  } finally { rmSync(logDir, { recursive: true, force: true }); }
});

test('strict updates do not replace a dangling preferences symlink', { skip: process.platform === 'win32' }, async () => {
  const logDir = mkdtempSync(join(tmpdir(), 'cxv-preferences-symlink-'));
  const path = join(logDir, 'preferences.json');
  symlinkSync(join(logDir, 'missing.json'), path);
  try {
    await runPreferencesScript(logDir, `
      import assert from 'node:assert/strict';
      import { updatePreferences } from ${JSON.stringify(repositoryUrl)};
      assert.throws(() => updatePreferences(prefs => prefs), { code: 'PREFERENCES_UNREADABLE' });
    `);
    assert.equal(lstatSync(path).isSymbolicLink(), true);
    assert.equal(existsSync(`${path}.lock`), false);
  } finally { rmSync(logDir, { recursive: true, force: true }); }
});

test('a failed atomic replacement preserves preferences and cleans up temporary files and lock', async () => {
  const logDir = mkdtempSync(join(tmpdir(), 'cxv-preferences-write-failure-'));
  const path = join(logDir, 'preferences.json');
  const original = '{"secret":"keep"}';
  writeFileSync(path, original);
  try {
    await runPreferencesScript(logDir, `
      import assert from 'node:assert/strict';
      import fs from 'node:fs';
      import { syncBuiltinESMExports } from 'node:module';
      import { updatePreferences } from ${JSON.stringify(repositoryUrl)};
      const rename = fs.renameSync;
      fs.renameSync = () => { throw Object.assign(new Error('injected write failure'), { code: 'EIO' }); };
      syncBuiltinESMExports();
      try { assert.throws(() => updatePreferences(prefs => ({ ...prefs, theme: 'light' })), { code: 'EIO' }); }
      finally { fs.renameSync = rename; syncBuiltinESMExports(); }
    `);
    assert.equal(readFileSync(path, 'utf8'), original);
    assert.deepEqual(readdirSync(logDir), ['preferences.json']);
    await runUpdater(logDir, 1);
    assert.equal(JSON.parse(readFileSync(path, 'utf8')).secret, 'keep');
  } finally { rmSync(logDir, { recursive: true, force: true }); }
});

test('an exclusive temporary-file collision preserves the existing file and preferences', async () => {
  const logDir = mkdtempSync(join(tmpdir(), 'cxv-preferences-collision-'));
  const path = join(logDir, 'preferences.json');
  writeFileSync(path, '{"theme":"original"}');
  try {
    await runPreferencesScript(logDir, `
      import assert from 'node:assert/strict';
      import fs from 'node:fs';
      import { syncBuiltinESMExports } from 'node:module';
      import { updatePreferences } from ${JSON.stringify(repositoryUrl)};
      const open = fs.openSync;
      let collision;
      fs.openSync = (path, ...args) => {
        if (String(path).includes('.tmp-') && !collision) {
          collision = path;
          fs.writeFileSync(path, 'unrelated existing file');
        }
        return open(path, ...args);
      };
      syncBuiltinESMExports();
      assert.throws(() => updatePreferences(() => ({ theme: 'replacement' })), { code: 'EEXIST' });
      assert.equal(fs.readFileSync(collision, 'utf8'), 'unrelated existing file');
    `);
    assert.equal(readFileSync(path, 'utf8'), '{"theme":"original"}');
    assert.equal(existsSync(`${path}.lock`), false);
  } finally { rmSync(logDir, { recursive: true, force: true }); }
});
