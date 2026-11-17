import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve, sep } from 'node:path';

export const ELECTRON_RUNTIME_REQUIRED_FILES = Object.freeze([
  'server.js',
  'proxy.js',
  'interceptor.js',
  'pty-manager.js',
  'i18n.js',
  'findcx.js',
  'package.json',
  join('src', 'utils', 'clearCheckpoint.js'),
  join('src', 'utils', 'contentFilter.js'),
  join('src', 'utils', 'modelIdentity.js'),
  join('src', 'utils', 'ptyChunkBuilder.js'),
  join('src', 'utils', 'requestType.js'),
  join('src', 'utils', 'teammateDetector.js'),
  join('src', 'utils', 'ultraplanTemplates.js'),
  join('src', 'utils', 'userImageRefs.js'),
  join('src', 'utils', 'userPromptContent.js'),

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
  return ELECTRON_RUNTIME_REQUIRED_FILES.every(file => existsSync(electronRuntimePath(root, ...file.split(sep))));
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
  // Workspace source layout; the published/staged app keeps its flat runtime.
  addCandidate(resolve(electronDir, '..', '..', '..', 'packages', 'app'));
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
  const path = join(runtimeRoot, ...segments);
  const parts = join(...segments).split(sep);
  // npm may hoist declared dependencies beside cx-viewer; workspace and
  // staged installs may keep them under the app. Follow Node's own resolution.
  if (!existsSync(path) && parts[0] === 'node_modules') {
    try { return createRequire(join(runtimeRoot, 'package.json')).resolve(parts.slice(1).join('/')); }
    catch { return path; }
  }
  if (!existsSync(path) && parts[0] === 'electron'
      && basename(runtimeRoot) === 'app' && basename(dirname(runtimeRoot)) === 'packages') {
    return resolve(runtimeRoot, '..', '..', 'apps', 'electron', ...parts);
  }
  return path;
}
