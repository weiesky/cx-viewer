import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repositoryUrl = pathToFileURL(join(process.cwd(), 'lib/preferences.js')).href;

function runUpdater(logDir, iterations) {
  const source = `
    import { updatePreferences } from ${JSON.stringify(repositoryUrl)};
    for (let i = 0; i < ${iterations}; i++) {
      updatePreferences(prefs => {
        prefs.concurrentCounter = (prefs.concurrentCounter || 0) + 1;
        return prefs;
      });
    }
  `;
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
