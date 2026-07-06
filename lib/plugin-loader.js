import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { LOG_DIR } from '../findcx.js';

// 动态获取（LOG_DIR 可能在运行时被 setLogDir 修改）
export function getPluginsDir() { return join(LOG_DIR, 'plugins'); }
function getPrefsFilePath() { return join(LOG_DIR, 'preferences.json'); }
const SHOULD_LOG = process.env.CXV_DEBUG_PLUGINS === '1';

// Hook 类型定义
const HOOK_TYPES = {
  httpsOptions: 'waterfall',
  localUrl: 'waterfall',
  serverStarted: 'parallel',
  serverStopping: 'parallel',
  onNewEntry: 'parallel',
};

let _plugins = [];
let _pluginStates = new Map();

function normalizeCapabilities(plugin) {
  const capabilities = new Set(Array.isArray(plugin.capabilities) ? plugin.capabilities.filter(Boolean) : []);
  if (plugin.hooks && typeof plugin.hooks.voiceInput === 'function') {
    capabilities.add('voiceInput');
  }
  return Array.from(capabilities);
}

function normalizeVoiceInput(plugin) {
  if (!plugin || typeof plugin !== 'object') return null;
  const voiceInput = plugin.voiceInput;
  if (!voiceInput || typeof voiceInput !== 'object') return null;
  const appKey = typeof voiceInput.appKey === 'string' ? voiceInput.appKey.trim() : '';
  const digestEndpoint = typeof voiceInput.digestEndpoint === 'string' ? voiceInput.digestEndpoint.trim() : '';
  const normalized = {};
  if (appKey) normalized.appKey = appKey;
  if (digestEndpoint) normalized.digestEndpoint = digestEndpoint;
  return Object.keys(normalized).length > 0 ? normalized : {};
}

function getModuleVersion(filePath) {
  try {
    return String(statSync(filePath).mtimeMs);
  } catch {
    return null;
  }
}

function extractNameFromSource(content, fallback) {
  const match = content.match(/name\s*:\s*['"]([^'"]+)['"]/);
  return match ? match[1] : fallback;
}

function extractCapabilitiesFromSource(content) {
  const match = content.match(/capabilities\s*:\s*\[([^\]]*)\]/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

/**
 * 扫描 LOG_DIR/plugins/ 目录，动态 import 每个 .js/.mjs 文件
 */
export async function loadPlugins() {
  _plugins = [];
  _pluginStates = new Map();

  if (!existsSync(getPluginsDir())) return;

  // 读取 disabledPlugins 列表
  let disabledPlugins = [];
  try {
    if (existsSync(getPrefsFilePath())) {
      const prefs = JSON.parse(readFileSync(getPrefsFilePath(), 'utf-8'));
      if (Array.isArray(prefs.disabledPlugins)) {
        disabledPlugins = prefs.disabledPlugins;
      }
    }
  } catch { }

  let files;
  try {
    files = readdirSync(getPluginsDir())
      .filter(f => f.endsWith('.js') || f.endsWith('.mjs'))
      .sort();
  } catch {
    return;
  }

  for (const file of files) {
    const filePath = join(getPluginsDir(), file);
    const moduleVersion = getModuleVersion(filePath);
    try {
      const source = readFileSync(filePath, 'utf-8');
      const fileUrl = pathToFileURL(filePath);
      fileUrl.searchParams.set('v', moduleVersion || String(Date.now()));
      const mod = await import(fileUrl.href);
      const plugin = mod.default || mod;
      const name = plugin.name || file;
      const hooks = (plugin.hooks && typeof plugin.hooks === 'object') ? plugin.hooks : {};
      const capabilities = normalizeCapabilities(plugin);
      const voiceInput = normalizeVoiceInput(plugin);
      const canLoad = Object.keys(hooks).length > 0 || capabilities.length > 0;

      if (disabledPlugins.includes(name)) {
        _pluginStates.set(file, {
          name,
          file,
          hooks: Object.keys(hooks),
          capabilities,
          voiceInput,
          moduleVersion,
          enabled: false,
          loaded: false,
          loadError: null,
        });
        if (SHOULD_LOG) console.error(`[CX Viewer] Plugin "${name}" is disabled, skipping.`);
        continue;
      }

      if (!canLoad) {
        _pluginStates.set(file, {
          name: extractNameFromSource(source, name),
          file,
          hooks: [],
          capabilities: extractCapabilitiesFromSource(source),
          voiceInput: null,
          moduleVersion,
          enabled: true,
          loaded: false,
          loadError: 'Plugin must export hooks or capabilities',
        });
        continue;
      }

      _plugins.push({ name, hooks, file, capabilities, voiceInput, moduleVersion });
      _pluginStates.set(file, {
        name,
        file,
        hooks: Object.keys(hooks),
        capabilities,
        voiceInput,
        moduleVersion,
        enabled: true,
        loaded: true,
        loadError: null,
      });
      if (SHOULD_LOG) console.error(`[CX Viewer] Plugin loaded: ${name} (${file})`);
    } catch (err) {
      try {
        const source = readFileSync(filePath, 'utf-8');
        _pluginStates.set(file, {
          name: extractNameFromSource(source, file),
          file,
          hooks: [],
          capabilities: extractCapabilitiesFromSource(source),
          voiceInput: null,
          moduleVersion,
          enabled: true,
          loaded: false,
          loadError: err.message,
        });
      } catch {
        _pluginStates.set(file, {
          name: file,
          file,
          hooks: [],
          capabilities: [],
          voiceInput: null,
          moduleVersion,
          enabled: true,
          loaded: false,
          loadError: err.message,
        });
      }
      if (SHOULD_LOG) console.error(`[CX Viewer] Failed to load plugin "${file}":`, err.message);
    }
  }
}

/**
 * waterfall hook：串行管道执行，前一个的返回值传给下一个
 */
export async function runWaterfallHook(name, initialValue) {
  let value = initialValue;
  for (const plugin of _plugins) {
    const hookFn = plugin.hooks[name];
    if (typeof hookFn !== 'function') continue;
    try {
      const result = await hookFn(value);
      if (result != null && typeof result === 'object') {
        value = { ...value, ...result };
      }
    } catch (err) {
      if (SHOULD_LOG) console.error(`[CX Viewer] Plugin "${plugin.name}" hook "${name}" error:`, err.message);
    }
  }
  return value;
}

/**
 * parallel hook：并行通知执行，返回值忽略
 */
export async function runParallelHook(name, context = {}) {
  const tasks = [];
  for (const plugin of _plugins) {
    const hookFn = plugin.hooks[name];
    if (typeof hookFn !== 'function') continue;
    tasks.push(
      Promise.resolve()
        .then(() => hookFn(context))
        .catch(err => {
          if (SHOULD_LOG) console.error(`[CX Viewer] Plugin "${plugin.name}" hook "${name}" error:`, err.message);
        })
    );
  }
  await Promise.all(tasks);
}

/**
 * 返回所有插件文件信息（含已禁用的），供 /api/plugins 使用
 */
export function getPluginsInfo() {
  if (!existsSync(getPluginsDir())) return [];

  let disabledPlugins = [];
  try {
    if (existsSync(getPrefsFilePath())) {
      const prefs = JSON.parse(readFileSync(getPrefsFilePath(), 'utf-8'));
      if (Array.isArray(prefs.disabledPlugins)) {
        disabledPlugins = prefs.disabledPlugins;
      }
    }
  } catch { }

  let files;
  try {
    files = readdirSync(getPluginsDir())
      .filter(f => f.endsWith('.js') || f.endsWith('.mjs'))
      .sort();
  } catch {
    return [];
  }

  return files.map(file => {
    const state = _pluginStates.get(file);
    if (state) return state;

    const loaded = _plugins.find(p => p.file === file);
    let name = file;

    // 如果插件已加载，使用加载时的 name
    if (loaded) {
      name = loaded.name;
    } else {
      // 如果插件未加载（可能被禁用），尝试读取文件获取真实的 name
      try {
        const filePath = join(getPluginsDir(), file);
        const content = readFileSync(filePath, 'utf-8');
        // 简单匹配 name: 'xxx' 或 name: "xxx"
        const match = content.match(/name\s*:\s*['"]([^'"]+)['"]/);
        if (match) {
          name = match[1];
        }
      } catch {
        // 读取失败，使用文件名
      }
    }

    const hooks = loaded ? Object.keys(loaded.hooks) : [];
    const capabilities = loaded ? loaded.capabilities : [];
    const voiceInput = loaded ? loaded.voiceInput : null;
    const enabled = !disabledPlugins.includes(name);
    const moduleVersion = loaded?.moduleVersion || getModuleVersion(join(getPluginsDir(), file));
    return { name, file, hooks, capabilities, voiceInput, moduleVersion, enabled, loaded: !!loaded, loadError: null };
  });
}
