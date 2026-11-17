import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { ensureHooks } from '../lib/ensure-hooks.js';

test('ensureHooks removes the obsolete ask hook and preserves permission hooks', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cxv-hooks-'));
  const oldCodexHome = process.env.CODEX_HOME;
  const oldCodexConfigDir = process.env.CODEX_CONFIG_DIR;
  process.env.CODEX_HOME = dir;
  delete process.env.CODEX_CONFIG_DIR;

  try {
    writeFileSync(join(dir, 'hooks.json'), JSON.stringify({
      hooks: {
        PreToolUse: [{
          matcher: 'request_user_input',
          hooks: [{ type: 'command', command: 'node /old/cx-viewer/lib/ask-bridge.js' }],
        }],
        PermissionRequest: [{
          matcher: '.*',
          hooks: [{ type: 'command', command: 'node audit-hook.js' }],
        }],
      },
    }, null, 2));

    ensureHooks();

    const hooksPath = join(dir, 'hooks.json');
    assert.equal(existsSync(hooksPath), true);
    assert.equal(existsSync(join(dir, 'settings.json')), false);

    const hooks = JSON.parse(readFileSync(hooksPath, 'utf8')).hooks;
    assert.equal(
      hooks.PreToolUse.some(entry =>
        entry.matcher === 'request_user_input' && entry.hooks?.[0]?.command?.includes('ask-bridge.js')
      ),
      false
    );
    assert.equal(
      hooks.PermissionRequest.some(entry =>
        entry.matcher === '.*' && entry.hooks?.[0]?.command?.includes('perm-bridge.js')
      ),
      true
    );
    assert.equal(
      hooks.PermissionRequest.some(entry => entry.hooks?.[0]?.command === 'node audit-hook.js'),
      true
    );
    assert.equal(
      hooks.PreToolUse.some(entry => entry.hooks?.[0]?.command?.includes('perm-bridge.js')),
      false
    );
  } finally {
    if (oldCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = oldCodexHome;
    if (oldCodexConfigDir === undefined) delete process.env.CODEX_CONFIG_DIR;
    else process.env.CODEX_CONFIG_DIR = oldCodexConfigDir;
    rmSync(dir, { recursive: true, force: true });
  }
});
