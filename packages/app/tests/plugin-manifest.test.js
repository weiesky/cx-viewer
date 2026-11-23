import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import {
  parsePluginManifest,
  resolveInsidePluginDir,
  validatePluginName,
  validateServicePrefix,
  computeMainFingerprint,
  computePanelFingerprint,
  listPluginDirs,
} from '../lib/plugin-manifest.js';
import { setLogDir } from '../findcx.js';

let tmpRoot;
let pluginsDir;

function setup() {
  // setLogDir's safety gate only allows paths under home or /tmp (macOS os.tmpdir() is
  // /var/folders/..., which is rejected), so the temp LOG_DIR lives under home.
  tmpRoot = mkdtempSync(join(homedir(), '.ccv-plsvc-test-'));
  pluginsDir = join(tmpRoot, 'plugins');
  mkdirSync(pluginsDir, { recursive: true });
  setLogDir(tmpRoot);
}

function teardown() {
  rmSync(tmpRoot, { recursive: true, force: true });
  setLogDir('tmp');
}

function writeDirPlugin(dirName, files) {
  const dir = join(pluginsDir, dirName);
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, content);
  }
  return dir;
}

function writePrefs(obj) {
  writeFileSync(join(tmpRoot, 'preferences.json'), JSON.stringify(obj));
}

// ─── plugin-manifest ───

describe('plugin-manifest', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('validates plugin names and service prefixes', () => {
    assert.ok(validatePluginName('hello-service'));
    assert.ok(validatePluginName('a.b_c-1'));
    assert.ok(!validatePluginName('-bad'));
    assert.ok(!validatePluginName('has space'));
    assert.ok(!validatePluginName(''));
    assert.ok(validateServicePrefix('/plugins/hello'));
    assert.ok(!validateServicePrefix('/api/x'));
    assert.ok(!validateServicePrefix('/plugins/a/b'));
  });

  it('parses a full service+panel manifest', () => {
    const dir = writeDirPlugin('hello-service', {
      'plugin.json': JSON.stringify({
        name: 'hello-service',
        version: '1.2.3',
        main: 'main.mjs',
        service: { entry: 'service.mjs', env: { MODE: 'demo' } },
        panel: { entry: 'panel/index.js', css: 'panel/index.css', title: { zh: '你好' }, icon: 'api', width: 900, desktopOnly: true },
        config: { defaults: { greeting: 'hi' } },
      }),
      'main.mjs': 'export default {};',
      'service.mjs': '// service',
      'panel/index.js': '// bundle',
      'panel/index.css': '/* css */',
    });
    const { manifest, error } = parsePluginManifest(dir);
    assert.equal(error, undefined);
    assert.equal(manifest.name, 'hello-service');
    assert.equal(manifest.version, '1.2.3');
    assert.equal(manifest.mainRel, 'main.mjs');
    assert.equal(manifest.service.prefix, '/plugins/hello-service');
    assert.deepEqual(manifest.service.env, { MODE: 'demo' });
    assert.equal(manifest.panel.width, 900);
    assert.equal(manifest.panel.desktopOnly, true);
    assert.equal(manifest.panel.icon, 'api');
    assert.deepEqual(manifest.configDefaults, { greeting: 'hi' });
  });

  it('rejects invalid manifests with specific errors', () => {
    const dir = writeDirPlugin('bad-json', { 'plugin.json': '{nope' });
    assert.match(parsePluginManifest(dir).error, /not valid JSON/);

    const dir2 = writeDirPlugin('bad-name', { 'plugin.json': JSON.stringify({ name: 'has space' }) });
    assert.match(parsePluginManifest(dir2).error, /invalid plugin name/);

    const dir3 = writeDirPlugin('bad-prefix', {
      'plugin.json': JSON.stringify({ name: 'bad-prefix', service: { entry: 's.mjs', prefix: '/api/x' } }),
      's.mjs': '',
    });
    assert.match(parsePluginManifest(dir3).error, /invalid service\.prefix/);

    const dir4 = writeDirPlugin('html-panel', {
      'plugin.json': JSON.stringify({ name: 'html-panel', panel: { entry: 'panel/index.html' } }),
    });
    assert.match(parsePluginManifest(dir4).error, /iframe-style|\.js bundle/);

    const dir5 = writeDirPlugin('root-panel', {
      'plugin.json': JSON.stringify({ name: 'root-panel', panel: { entry: 'bundle.js' } }),
      'bundle.js': '',
    });
    assert.match(parsePluginManifest(dir5).error, /subdirectory/);

    const dir6 = writeDirPlugin('env-override', {
      'plugin.json': JSON.stringify({ name: 'env-override', service: { entry: 's.mjs', env: { CXV_LOG_DIR: '/tmp' } } }),
      's.mjs': '',
    });
    assert.match(parsePluginManifest(dir6).error, /reserved variable/);
    for (const key of ['CXV_ACCESS_TOKEN', 'cxv_log_dir']) {
      writeFileSync(join(dir6, 'plugin.json'), JSON.stringify({ name: 'env-override', service: { entry: 's.mjs', env: { [key]: '/tmp' } } }));
      assert.match(parsePluginManifest(dir6).error, /reserved variable/);
    }
  });

  it('rejects path escape in entry fields', () => {
    const dir = writeDirPlugin('escape', {
      'plugin.json': JSON.stringify({ name: 'escape', service: { entry: '../outside.mjs' } }),
    });
    writeFileSync(join(pluginsDir, 'outside.mjs'), '');
    assert.match(parsePluginManifest(dir).error, /\.\.|escape|illegal/);
  });

  it('resolveInsidePluginDir blocks symlink escape', () => {
    const outside = mkdtempSync(join(tmpdir(), 'ccv-outside-'));
    writeFileSync(join(outside, 'secret.js'), 'x');
    const dir = join(pluginsDir, 'sym');
    mkdirSync(dir, { recursive: true });
    symlinkSync(join(outside, 'secret.js'), join(dir, 'link.js'));
    const r = resolveInsidePluginDir(dir, 'link.js', 'test');
    assert.ok(r.error || r.real === join(outside, 'secret.js') && false, 'symlink escape must not resolve inside');
    rmSync(outside, { recursive: true, force: true });
  });

  it('computes different fingerprints when helper changes', () => {
    const files = {
      'plugin.json': JSON.stringify({ name: 'fp', main: 'main.mjs' }),
      'main.mjs': 'import "./helper.mjs";\nexport default {};',
      'helper.mjs': 'export const v = 1;',
    };
    const dir = writeDirPlugin('fp', files);
    const { manifest } = parsePluginManifest(dir);
    const fp1 = computeMainFingerprint(manifest.raw, manifest.mainPath, dir);
    writeFileSync(join(dir, 'helper.mjs'), 'export const v = 2;');
    const fp2 = computeMainFingerprint(manifest.raw, manifest.mainPath, dir);
    assert.notEqual(fp1, fp2, 'helper change must bust fingerprint');
  });

  it('computePanelFingerprint changes with mtime/size', async () => {
    const dir = writeDirPlugin('pf', {
      'plugin.json': JSON.stringify({ name: 'pf', panel: { entry: 'panel/index.js' } }),
      'panel/index.js': '// v1',
    });
    const { manifest } = parsePluginManifest(dir);
    const f1 = computePanelFingerprint(manifest.panel);
    await new Promise(r => setTimeout(r, 20));
    writeFileSync(join(dir, 'panel/index.js'), '// v1 longer');
    const f2 = computePanelFingerprint(manifest.panel);
    assert.notEqual(f1, f2);
  });

  it('listPluginDirs returns only directories', () => {
    writeDirPlugin('a-dir', { 'plugin.json': '{}' });
    writeFileSync(join(pluginsDir, 'b-file.js'), '');
    assert.deepEqual(listPluginDirs(pluginsDir), ['a-dir']);
  });
});

