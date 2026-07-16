import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const ELECTRON_RUNTIME_REQUIRED_FILES = Object.freeze([
  'server.js',
  'proxy.js',
  'interceptor.js',
  'pty-manager.js',
  'i18n.js',
  'findcx.js',
  'package.json',
  join('electron', 'tab-worker.js'),
  join('electron', 'runtime-paths.js'),
  join('lib', 'cli-args.js'),
  join('lib', 'codex-config.js'),
  join('lib', 'ensure-hooks.js'),
  join('node_modules', '@xterm', 'addon-unicode11', 'package.json'),
  join('node_modules', 'node-pty', 'package.json'),
  join('node_modules', 'ws', 'package.json'),
]);

function isRuntimeRoot(root) {
  return ELECTRON_RUNTIME_REQUIRED_FILES.every(file => existsSync(join(root, file)));
}

/**
 * Resolve the one directory that owns CX Viewer's Node runtime modules.
 *
 * Source and npm layouts keep electron/ beside server.js. A packaged desktop
 * build may copy the same runtime tree to Resources/server so the external
 * Node process used by tab-worker does not need to read through app.asar.
 */
export function resolveElectronRuntimeRoot({
  electronDir,
  resourcesPath = typeof process.resourcesPath === 'string' ? process.resourcesPath : null,
  explicitRoot = process.env.CXV_RUNTIME_ROOT || null,
} = {}) {
  if (typeof electronDir !== 'string' || !electronDir) {
    throw new TypeError('electronDir must be a non-empty path');
  }

  const candidates = [];
  const addCandidate = value => {
    if (typeof value !== 'string' || !value) return;
    const absolute = resolve(value);
    if (!candidates.includes(absolute)) candidates.push(absolute);
  };

  addCandidate(explicitRoot);
  if (resourcesPath) addCandidate(join(resourcesPath, 'server'));
  if (resourcesPath) addCandidate(join(resourcesPath, 'app.asar.unpacked'));
  addCandidate(resolve(electronDir, '..'));
  // Compatibility with desktop layouts that keep electron/ and server/ as
  // siblings. The selected root is still the server directory itself.
  addCandidate(resolve(electronDir, '..', 'server'));

  const runtimeRoot = candidates.find(isRuntimeRoot);
  if (runtimeRoot) return runtimeRoot;

  const error = new Error(
    `CX Viewer Electron runtime is incomplete; checked: ${candidates.join(', ')}`,
  );
  error.code = 'CXV_ELECTRON_RUNTIME_NOT_FOUND';
  error.candidates = candidates;
  throw error;
}

export function electronRuntimePath(runtimeRoot, ...segments) {
  if (typeof runtimeRoot !== 'string' || !runtimeRoot) {
    throw new TypeError('runtimeRoot must be a non-empty path');
  }
  return join(runtimeRoot, ...segments);
}
