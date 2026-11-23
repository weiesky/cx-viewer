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
import {
  loadPlugins,
  getPluginEntries,
  getServiceEntries,
  getPluginsGeneration,
  getPluginsInfo,
  runWaterfallHook,
  _resetModuleCacheForTest,
} from '../lib/plugin-loader.js';
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

// ─── plugin-loader directory plugins ───

describe('plugin-loader directory plugins', () => {
  beforeEach(() => {
    setup();
    _resetModuleCacheForTest();
  });
  afterEach(teardown);

  it('loads a directory plugin without main (service-only)', async () => {
    writeDirPlugin('svc-only', {
      'plugin.json': JSON.stringify({ name: 'svc-only', service: { entry: 'service.mjs' } }),
      'service.mjs': '// svc',
    });
    const { entries } = await loadPlugins();
    const entry = entries.find(e => e.name === 'svc-only');
    assert.ok(entry, 'entry should exist');
    assert.equal(entry.loadError, null);
    assert.equal(entry.service.prefix, '/plugins/svc-only');
    const services = getServiceEntries();
    assert.equal(services.length, 1);
    assert.equal(services[0].name, 'svc-only');
  });

  it('loads a directory plugin with hooks and lifecycle', async () => {
    writeDirPlugin('full', {
      'plugin.json': JSON.stringify({ name: 'full', main: 'main.mjs', panel: { entry: 'panel/index.js' } }),
      'main.mjs': `export default { hooks: { localUrl(v) { return { url: v.url + '/full' }; } }, async activate() {}, async deactivate() {} };`,
      'panel/index.js': '// bundle',
    });
    await loadPlugins();
    const result = await runWaterfallHook('localUrl', { url: 'http://x' });
    assert.equal(result.url, 'http://x/full');
    const entry = getPluginEntries().find(e => e.name === 'full');
    assert.equal(entry.panel.icon, 'appstore');
    assert.ok(entry.panel.fingerprint);
    assert.equal(entry.type, undefined); // type is only derived in getPluginsInfo
    const info = getPluginsInfo().find(p => p.name === 'full');
    assert.equal(info.type, 'panel');
    assert.equal(info.dir, 'full');
    assert.deepEqual(info.hooks, ['localUrl']);
  });

  it('marks directory plugin disabled via preferences without executing main', async () => {
    writeDirPlugin('disabled-dir', {
      'plugin.json': JSON.stringify({ name: 'disabled-dir', main: 'main.mjs', service: { entry: 's.mjs' } }),
      'main.mjs': 'throw new Error("must not execute");',
      's.mjs': '',
    });
    writePrefs({ disabledPlugins: ['disabled-dir'] });
    const { entries } = await loadPlugins();
    const entry = entries.find(e => e.name === 'disabled-dir');
    assert.equal(entry.enabled, false);
    assert.equal(entry.loadError, null);
    assert.equal(getServiceEntries().length, 0);
    const info = getPluginsInfo().find(p => p.name === 'disabled-dir');
    assert.equal(info.enabled, false);
    assert.equal(info.type, 'service');
  });

  it('records manifest errors as loadError without throwing', async () => {
    writeDirPlugin('broken', { 'plugin.json': '{bad' });
    const { entries } = await loadPlugins();
    const entry = entries.find(e => e.dir === 'broken');
    assert.match(entry.loadError, /not valid JSON/);
  });

  it('ignores directories without plugin.json', async () => {
    mkdirSync(join(pluginsDir, 'random-assets'), { recursive: true });
    const { entries } = await loadPlugins();
    assert.ok(!entries.some(e => e.dir === 'random-assets'));
  });

  it('custom service.prefix is rejected in v1 (mount table routes by name)', async () => {
    writeDirPlugin('pa', {
      'plugin.json': JSON.stringify({ name: 'pa', service: { entry: 's.mjs', prefix: '/plugins/same' } }),
      's.mjs': '',
    });
    const { entries } = await loadPlugins();
    const pa = entries.find(e => e.name === 'pa');
    assert.match(pa.loadError, /service\.prefix must be \/plugins\/pa/);
    assert.equal(getServiceEntries().length, 0);
  });

  it('reload reuses module when fingerprint unchanged, reimports after change', async () => {
    writeDirPlugin('hot', {
      'plugin.json': JSON.stringify({ name: 'hot', main: 'main.mjs' }),
      'main.mjs': 'export default { name: "hot", marker: 1, hooks: {} };',
    });
    await loadPlugins();
    const gen1 = getPluginsGeneration();
    const m1 = getPluginEntries().find(e => e.name === 'hot').plugin;

    await loadPlugins();
    const m2 = getPluginEntries().find(e => e.name === 'hot').plugin;
    assert.equal(m1, m2, 'unchanged fingerprint should reuse module instance');
    assert.ok(getPluginsGeneration() > gen1);

    writeFileSync(join(pluginsDir, 'hot', 'main.mjs'), 'export default { name: "hot", marker: 2, hooks: {} };');
    await loadPlugins();
    const m3 = getPluginEntries().find(e => e.name === 'hot').plugin;
    assert.notEqual(m1, m3, 'changed fingerprint should reimport');
    assert.equal(m3.marker, 2);
  });

  it('single-file plugin behavior unchanged; service field rejected', async () => {
    writeFileSync(join(pluginsDir, 'legacy.js'), 'export default { name: "legacy", hooks: { localUrl(v) { return v; } } };');
    writeFileSync(join(pluginsDir, 'bad-single.js'), 'export default { name: "bad-single", service: {} };');
    const { entries } = await loadPlugins();
    const legacy = entries.find(e => e.name === 'legacy');
    assert.equal(legacy.shape, 'file');
    assert.equal(legacy.loadError, null);
    const bad = entries.find(e => e.name === 'bad-single');
    assert.match(bad.loadError, /single-file plugins cannot declare/);
  });

  it('getPluginsInfo includes dir plugin type and service prefix', async () => {
    writeDirPlugin('svc', {
      'plugin.json': JSON.stringify({ name: 'svc', service: { entry: 's.mjs' }, panel: { entry: 'panel/index.js', title: { en: 'Svc' } } }),
      's.mjs': '',
      'panel/index.js': '',
    });
    await loadPlugins();
    const info = getPluginsInfo().find(p => p.name === 'svc');
    assert.equal(info.type, 'service');
    assert.deepEqual(info.service, { prefix: '/plugins/svc' });
    assert.equal(info.panel.icon, 'appstore');
    assert.deepEqual(info.panel.titleI18n, { en: 'Svc' });
  });
});

// cx-viewer legacy capabilities and cache-busting must survive the directory migration.
describe('legacy plugin compatibility', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('retains capability-only voice plugins and reloads modified file modules', async () => {
    const file = join(pluginsDir, 'voice.mjs');
    writeFileSync(file, 'export default { name: "voice", capabilities: ["voiceInput"], voiceInput: { appKey: "test" } };');
    await loadPlugins();
    const first = getPluginsInfo().find(p => p.name === 'voice');
    assert.equal(first.loaded, true);
    assert.deepEqual(first.capabilities, ['voiceInput']);
    assert.equal(first.voiceInput.appKey, 'test');
    writeFileSync(file, 'export default { name: "voice", capabilities: ["voiceInput"], voiceInput: { appKey: "changed" } };');
    const { utimesSync } = await import('node:fs');
    utimesSync(file, new Date(), new Date(Date.now() + 2000));
    await loadPlugins();
    const second = getPluginsInfo().find(p => p.name === 'voice');
    assert.equal(second.voiceInput.appKey, 'changed');
    assert.notEqual(second.moduleVersion, first.moduleVersion);
  });
  it('times out hung approval hooks without timing out startup hooks', async () => {
    writeDirPlugin('timed', {
      'plugin.json': JSON.stringify({ name: 'timed', main: 'main.mjs' }),
      'main.mjs': 'export default { hooks: { onPermRequest() { return new Promise(() => {}); }, localUrl() { return new Promise(r => setTimeout(() => r({ url: "ready" }), 30)); } } };',
    });
    await loadPlugins();
    assert.deepEqual(await runWaterfallHook('onPermRequest', { pending: true }, 10), { pending: true });
    assert.deepEqual(await runWaterfallHook('localUrl', { url: 'before' }, 1), { url: 'ready' });
  });
});
