import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ELECTRON_RUNTIME_REQUIRED_FILES,
  electronRuntimePath,
  resolveElectronRuntimeRoot,
} from '../electron/runtime-paths.js';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('Electron source and npm layout resolves every runtime import from package root', () => {
  const runtimeRoot = resolveElectronRuntimeRoot({
    electronDir: join(repoRoot, 'electron'),
    resourcesPath: null,
    explicitRoot: null,
  });
  assert.equal(runtimeRoot, repoRoot);
  for (const file of ELECTRON_RUNTIME_REQUIRED_FILES) {
    assert.equal(existsSync(electronRuntimePath(runtimeRoot, file)), true, file);
  }
  assert.equal(
    electronRuntimePath(runtimeRoot, 'lib', 'cli-args.js'),
    join(repoRoot, 'lib', 'cli-args.js'),
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
