/**
 * Register request_user_input and permission approval hooks into Codex hooks.json.
 * Shared between cli.js and electron/tab-worker.js.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCodexConfigDir } from './codex-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

export function ensureHooks() {
  try {
    const codexDir = getCodexConfigDir();
    const hooksPath = resolve(codexDir, 'hooks.json');
    let settings = {};
    try { if (existsSync(hooksPath)) settings = JSON.parse(readFileSync(hooksPath, 'utf-8')); } catch {
      console.warn('[CX Viewer] Codex hooks.json is malformed, skipping hook injection');
      return;
    }

    if (!settings.hooks) settings.hooks = {};
    if (!Array.isArray(settings.hooks.PreToolUse)) settings.hooks.PreToolUse = [];
    if (!Array.isArray(settings.hooks.PermissionRequest)) settings.hooks.PermissionRequest = [];

    let changed = false;

    // request_user_input hook → ask-bridge.js
    // Guard: only execute when CXVIEWER_PORT is set (i.e. launched by cx-viewer)
    const askBridgePath = resolve(rootDir, 'lib', 'ask-bridge.js');
    const askCmd = `[ -n "$CXVIEWER_PORT" ] && node "${askBridgePath}" || true`;
    const askMatchers = ['request_user_input'];
    for (const matcher of askMatchers) {
      const askExisting = settings.hooks.PreToolUse.find(h => h.matcher === matcher);
      if (askExisting) {
        if ((askExisting.hooks?.[0]?.command || '') !== askCmd) {
          askExisting.hooks = [{ type: 'command', command: askCmd }];
          changed = true;
        }
      } else {
        settings.hooks.PreToolUse.push({
          matcher,
          hooks: [{ type: 'command', command: askCmd }]
        });
        changed = true;
      }
    }

    // Permission approval hook → perm-bridge.js (matcher: ".*" = match all permission requests)
    // Guard: only execute when CXVIEWER_PORT is set (i.e. launched by cx-viewer)
    const permBridgePath = resolve(rootDir, 'lib', 'perm-bridge.js');
    const permCmd = `[ -n "$CXVIEWER_PORT" ] && node "${permBridgePath}" || true`;
    const permMatcher = '.*';
    // Clean up legacy PreToolUse entries written by older CX-Viewer versions.
    for (let i = settings.hooks.PreToolUse.length - 1; i >= 0; i--) {
      const h = settings.hooks.PreToolUse[i];
      const cmd = h.hooks?.[0]?.command || '';
      if (cmd.includes('perm-bridge.js')) {
        settings.hooks.PreToolUse.splice(i, 1);
        changed = true;
      }
    }
    for (let i = settings.hooks.PermissionRequest.length - 1; i >= 0; i--) {
      const h = settings.hooks.PermissionRequest[i];
      const cmd = h.hooks?.[0]?.command || '';
      if (cmd.includes('perm-bridge.js') && h.matcher !== permMatcher) {
        settings.hooks.PermissionRequest.splice(i, 1);
        changed = true;
      }
    }
    const permExisting = settings.hooks.PermissionRequest.find(h => (h.hooks?.[0]?.command || '').includes('perm-bridge.js'));
    if (permExisting) {
      if (permExisting.matcher !== permMatcher || (permExisting.hooks?.[0]?.command || '') !== permCmd) {
        permExisting.matcher = permMatcher;
        permExisting.hooks = [{ type: 'command', command: permCmd }];
        changed = true;
      }
    } else {
      settings.hooks.PermissionRequest.push({
        matcher: permMatcher,
        hooks: [{ type: 'command', command: permCmd }]
      });
      changed = true;
    }

    if (changed) {
      mkdirSync(codexDir, { recursive: true });
      writeFileSync(hooksPath, JSON.stringify(settings, null, 2));
    }
  } catch (err) {
    console.warn('[CX Viewer] Failed to ensure hooks:', err.message);
  }
}
