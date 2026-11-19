import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ELECTRON_RUNTIME_REQUIRED_FILES,
  electronRuntimePath,
  resolveElectronRuntimeRoot,
} from '../electron/runtime-paths.js';

const electronRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = join(electronRoot, '..', '..');
const appRoot = join(repoRoot, 'packages', 'app');

test('Electron source and npm layout resolves every runtime import from package root', () => {
  const runtimeRoot = resolveElectronRuntimeRoot({
    electronDir: join(electronRoot, 'electron'),
    resourcesPath: null,
    explicitRoot: null,
  });
  assert.equal(runtimeRoot, appRoot);
  for (const file of ELECTRON_RUNTIME_REQUIRED_FILES) {
    assert.equal(existsSync(electronRuntimePath(runtimeRoot, file)), true, file);
  }
  assert.equal(
    electronRuntimePath(runtimeRoot, 'lib', 'cli-args.js'),
    join(appRoot, 'lib', 'cli-args.js'),
  );
});

test('Electron packaged layout resolves the external Node runtime under Resources/server', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-electron-runtime-'));
  try {
    const serverRoot = join(root, 'Resources', 'server');
    for (const file of ELECTRON_RUNTIME_REQUIRED_FILES) {
      const path = join(serverRoot, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, '');
    }
    assert.equal(resolveElectronRuntimeRoot({
      electronDir: join(root, 'app.asar', 'electron'),
      resourcesPath: join(root, 'Resources'),
      explicitRoot: null,
    }), serverRoot);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Electron builder unpacked layout resolves the executable external Node runtime', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-electron-unpacked-'));
  try {
    const unpackedRoot = join(root, 'Resources', 'app.asar.unpacked');
    for (const file of ELECTRON_RUNTIME_REQUIRED_FILES) {
      const path = join(unpackedRoot, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, '');
    }
    assert.equal(resolveElectronRuntimeRoot({
      electronDir: join(root, 'Resources', 'app.asar', 'electron'),
      resourcesPath: join(root, 'Resources'),
      explicitRoot: null,
    }), unpackedRoot);
    assert.equal(
      electronRuntimePath(unpackedRoot, 'electron', 'tab-worker.js'),
      join(unpackedRoot, 'electron', 'tab-worker.js'),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Electron runtime resolution fails closed for an incomplete layout', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-electron-incomplete-'));
  try {
    assert.throws(() => resolveElectronRuntimeRoot({
      electronDir: join(root, 'electron'),
      resourcesPath: null,
      explicitRoot: null,
    }), error => error?.code === 'CXV_ELECTRON_RUNTIME_NOT_FOUND');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});


test('npm local installs resolve hoisted production dependencies beside the app package', () => {
  const prefix = mkdtempSync(join(tmpdir(), 'cxv-electron-hoisted-'));
  const runtimeRoot = join(prefix, 'node_modules', 'cx-viewer');
  try {
    for (const file of ELECTRON_RUNTIME_REQUIRED_FILES) {
      const base = file.split(sep)[0] === 'node_modules' ? prefix : runtimeRoot;
      const path = join(base, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, path.endsWith('package.json') ? '{}' : '');
    }
    assert.equal(resolveElectronRuntimeRoot({ electronDir: join(runtimeRoot, 'electron'), resourcesPath: null, explicitRoot: null }), runtimeRoot);
    assert.equal(realpathSync(electronRuntimePath(runtimeRoot, 'node_modules', 'node-pty', 'package.json')),
      realpathSync(join(prefix, 'node_modules', 'node-pty', 'package.json')));
  } finally { rmSync(prefix, { recursive: true, force: true }); }
});
