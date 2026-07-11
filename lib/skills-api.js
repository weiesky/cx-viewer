import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import JSZip from 'jszip';

const BUILTIN_NAMES = new Set([
  'update-config', 'keybindings-help', 'simplify', 'fewer-permission-prompts',
  'loop', 'schedule', 'codex-api', 'init', 'review', 'security-review',
]);

const IM_PLATFORMS = new Set(['dingtalk', 'feishu', 'wecom', 'discord']);

function safeJsonParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function frontmatter(text) {
  const match = /^---\s*\n([\s\S]*?)\n---/.exec(text || '');
  if (!match) return {};
  const out = {};
  const lines = match[1].split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    if (/^[|>][-+]?$/.test(value)) {
      const fold = value.startsWith('>');
      const collected = [];
      for (i = i + 1; i < lines.length; i++) {
        const next = lines[i];
        if (next !== '' && !/^\s/.test(next)) { i--; break; }
        collected.push(next.replace(/^\s+/, ''));
      }
      while (collected.length && collected[collected.length - 1] === '') collected.pop();
      value = fold ? collected.join(' ') : collected.join('\n');
    }
    out[key] = value.replace(/^["']|["']$/g, '');
  }
  return out;
}

export function parseSkillMetadata(skillDir) {
  const mdPath = join(skillDir, 'SKILL.md');
  if (!existsSync(mdPath)) return null;
  try {
    const text = readFileSync(mdPath, 'utf8');
    const fm = frontmatter(text);
    return {
      name: fm.name || basename(skillDir),
      description: fm.description || null,
    };
  } catch {
    return { name: basename(skillDir), description: null };
  }
}

function isDir(path) {
  try { return existsSync(path) && statSync(path).isDirectory(); } catch { return false; }
}

function canonical(path) {
  try { return realpathSync(path); } catch { return resolve(path); }
}

function isContained(parent, child) {
  const p = canonical(parent);
  let c;
  try {
    c = realpathSync(child);
  } catch {
    const rel = relative(resolve(parent), resolve(child));
    if (rel === '..' || rel.startsWith(`..${sep}`) || resolve(rel) === rel) return false;
    c = resolve(p, rel || '.');
  }
  return c === p || c.startsWith(p + sep);
}

function sanitizeName(name, fallback = 'skill') {
  const raw = String(name || fallback)
    .trim()
    .replace(/\.md$/i, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!raw || raw === '.' || raw === '..') return fallback;
  return raw.slice(0, 80);
}

function uniqueDir(parent, preferred) {
  let name = sanitizeName(preferred);
  let target = join(parent, name);
  let i = 1;
  while (existsSync(target)) {
    name = `${sanitizeName(preferred)}-${i++}`;
    target = join(parent, name);
  }
  return { name, target };
}

function scanSkillDir(baseDir, source, enabled, options = {}) {
  const out = [];
  if (!isDir(baseDir)) return out;
  const realBase = canonical(baseDir);
  try {
    for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') && !options.includeDotDirs) continue;
      const skillDir = join(baseDir, entry.name);
      const meta = parseSkillMetadata(skillDir);
      if (!meta) continue;
      out.push({
        name: meta.name || entry.name,
        source,
        enabled,
        path: skillDir,
        description: meta.description,
        _root: options.rootKey || realBase,
        ...(options.store ? { store: options.store } : {}),
        ...(options.pluginName ? { pluginName: options.pluginName } : {}),
      });
    }
  } catch {}
  return out;
}

function scanBuiltinSkills(homeDir = homedir()) {
  const systemDir = join(homeDir, '.codex', 'skills', '.system');
  const skills = scanSkillDir(systemDir, 'builtin', true, { includeDotDirs: false, store: 'system' });
  const diskNames = new Set(skills.map(s => s.name));
  for (const name of BUILTIN_NAMES) {
    if (!diskNames.has(name)) {
      skills.push({ name, source: 'builtin', enabled: true, path: null, description: null, store: 'builtin' });
    }
  }
  return skills;
}

function scanPluginSkills(homeDir = homedir()) {
  const cacheDir = join(homeDir, '.codex', 'plugins', 'cache');
  const out = [];
  if (!isDir(cacheDir)) return out;
  const visit = (dir) => {
    const manifestPath = join(dir, '.codex-plugin', 'plugin.json');
    if (existsSync(manifestPath)) {
      const manifest = safeJsonParse(readFileSync(manifestPath, 'utf8')) || {};
      const rel = relative(cacheDir, dir).split('/');
      const marketplace = rel[0] || 'plugin';
      const pluginName = `${manifest.name || basename(dir)}@${marketplace}`;
      const skillRel = manifest.skills || './skills';
      const skillDirs = Array.isArray(skillRel) ? skillRel : [skillRel];
      for (const one of skillDirs) {
        if (typeof one !== 'string') continue;
        out.push(...scanSkillDir(resolve(dir, one), 'plugin', true, { pluginName, store: 'plugin' }));
      }
      return;
    }
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      visit(join(dir, entry.name));
    }
  };
  visit(cacheDir);
  return out;
}

function markDuplicates(skills) {
  const byRootName = new Map();
  for (const s of skills) {
    if (!s.path || (s.source !== 'user' && s.source !== 'project')) continue;
    const key = `${s.source}:${s.store || ''}:${s._root || dirname(s.path)}:${s.name}`;
    const prev = byRootName.get(key) || { enabled: [], disabled: [] };
    (s.enabled ? prev.enabled : prev.disabled).push(s);
    byRootName.set(key, prev);
  }
  for (const group of byRootName.values()) {
    if (group.enabled.length && group.disabled.length) {
      for (const s of [...group.enabled, ...group.disabled]) s.duplicate = true;
    }
  }
  return skills.map(({ _root, ...s }) => s);
}

export function getGlobalSkillRoots(homeDir = homedir()) {
  return [
    { source: 'user', store: 'codex', enabledDir: join(homeDir, '.codex', 'skills'), disabledDir: join(homeDir, '.codex', 'skills-skip') },
    { source: 'user', store: 'agents', enabledDir: join(homeDir, '.agents', 'skills'), disabledDir: join(homeDir, '.agents', 'skills-skip') },
  ];
}

export function getProjectSkillRoots(cwd) {
  return [
    { source: 'project', store: 'project', enabledDir: join(cwd, '.codex', 'skills'), disabledDir: join(cwd, '.codex', 'skills-skip') },
  ];
}

export function getImRoot(platform, homeDir = homedir()) {
  const id = sanitizeName(platform || '', '');
  if (!IM_PLATFORMS.has(id)) return null;
  return join(homeDir, '.codex', 'cx-viewer', 'im', id);
}

export function listSkills({ cwd = process.cwd(), homeDir = homedir(), roots = null, includeReadonly = true } = {}) {
  const rootList = roots || [...getProjectSkillRoots(cwd), ...getGlobalSkillRoots(homeDir)];
  const out = [];
  for (const root of rootList) {
    const rootKey = `${canonical(root.enabledDir)}:${canonical(root.disabledDir)}`;
    out.push(...scanSkillDir(root.enabledDir, root.source, true, { store: root.store, rootKey }));
    out.push(...scanSkillDir(root.disabledDir, root.source, false, { store: root.store, rootKey }));
  }
  if (includeReadonly) {
    out.push(...scanBuiltinSkills(homeDir));
    out.push(...scanPluginSkills(homeDir));
  }
  return markDuplicates(out);
}

export function listImSkills(platform, { homeDir = homedir() } = {}) {
  const root = getImRoot(platform, homeDir);
  if (!root) throw Object.assign(new Error('Unknown IM platform'), { status: 404 });
  return listSkills({
    homeDir,
    cwd: root,
    includeReadonly: false,
    roots: [{ source: 'project', store: `im:${platform}`, enabledDir: join(root, '.codex', 'skills'), disabledDir: join(root, '.codex', 'skills-skip') }],
  });
}

function managedRoots({ cwd = process.cwd(), homeDir = homedir(), roots = null } = {}) {
  return roots || [...getProjectSkillRoots(cwd), ...getGlobalSkillRoots(homeDir)];
}

function findMutableSkill(params, options = {}) {
  const roots = managedRoots(options);
  const candidates = [];
  for (const root of roots) {
    if (params.source && params.source !== root.source) continue;
    for (const [enabled, dir] of [[true, root.enabledDir], [false, root.disabledDir]]) {
      if (!isDir(dir)) continue;
      const skillDir = params.path ? resolve(params.path) : join(dir, sanitizeName(params.name));
      if (!isContained(dir, skillDir)) continue;
      if (!existsSync(join(skillDir, 'SKILL.md'))) continue;
      const meta = parseSkillMetadata(skillDir) || { name: basename(skillDir) };
      if (params.name && meta.name !== params.name && basename(skillDir) !== params.name) continue;
      if (params.enabled !== undefined && !!params.enabled !== enabled) continue;
      candidates.push({ root, enabled, skillDir, name: meta.name || basename(skillDir) });
      if (params.path) return candidates[0];
    }
  }
  if (candidates.length === 0) return null;
  if (candidates.length > 1) throw Object.assign(new Error('Multiple matching skills; path is required'), { status: 409, code: 'AMBIGUOUS' });
  return candidates[0];
}

export function toggleSkill(params, options = {}) {
  if (params.source !== 'user' && params.source !== 'project') {
    throw Object.assign(new Error('Only user/project skills can be toggled'), { status: 400 });
  }
  const current = findMutableSkill({ ...params, enabled: params.enable ? false : true }, options)
    || findMutableSkill(params, options);
  if (!current) throw Object.assign(new Error('Skill not found'), { status: 404 });

  const targetBase = params.enable ? current.root.enabledDir : current.root.disabledDir;
  const sourceBase = params.enable ? current.root.disabledDir : current.root.enabledDir;
  if (!isContained(sourceBase, current.skillDir)) {
    throw Object.assign(new Error('Skill is already in the requested state'), { status: 409, code: 'DUPLICATE' });
  }
  const target = join(targetBase, basename(current.skillDir));
  if (existsSync(target)) {
    throw Object.assign(new Error('Target skill already exists'), { status: 409, code: 'DUPLICATE' });
  }
  mkdirSync(targetBase, { recursive: true });
  renameSync(current.skillDir, target);
  return { ok: true, path: target };
}

export function deleteSkill(params, options = {}) {
  if (params.source !== 'user' && params.source !== 'project') {
    throw Object.assign(new Error('Only user/project skills can be deleted'), { status: 400 });
  }
  const current = findMutableSkill(params, options);
  if (!current) throw Object.assign(new Error('Skill not found'), { status: 404 });
  rmSync(current.skillDir, { recursive: true, force: true });
  return { ok: true };
}

function firstSkillMdInZip(zip) {
  const hits = Object.values(zip.files)
    .filter(f => !f.dir && /(^|\/)SKILL\.md$/i.test(f.name) && !f.name.startsWith('__MACOSX/'))
    .sort((a, b) => a.name.split('/').length - b.name.split('/').length);
  return hits[0] || null;
}

async function writeZipSkill(targetRoot, filename, data) {
  const zip = await JSZip.loadAsync(data);
  const skillMd = firstSkillMdInZip(zip);
  if (!skillMd) {
    throw Object.assign(new Error('SKILL.md not found in zip'), { status: 400, code: 'MISSING_SKILL_MD' });
  }
  const skillText = await skillMd.async('string');
  const meta = frontmatter(skillText);
  const parts = skillMd.name.split('/').filter(Boolean);
  const prefix = parts.length > 1 ? parts.slice(0, -1).join('/') + '/' : '';
  const fallbackName = prefix ? parts[0] : basename(filename, '.zip');
  const { target } = uniqueDir(targetRoot, meta.name || fallbackName);
  mkdirSync(target, { recursive: true });

  for (const file of Object.values(zip.files)) {
    if (file.dir || file.name.startsWith('__MACOSX/')) continue;
    if (prefix && !file.name.startsWith(prefix)) continue;
    const rel = prefix ? file.name.slice(prefix.length) : file.name;
    if (!rel || rel.startsWith('/') || rel.split('/').some(part => !part || part === '.' || part === '..')) continue;
    const dest = join(target, rel);
    if (!isContained(target, dest)) continue;
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, Buffer.from(await file.async('uint8array')));
  }
  if (!existsSync(join(target, 'SKILL.md'))) writeFileSync(join(target, 'SKILL.md'), skillText);
  return { ok: true, path: target };
}

function writeMarkdownSkill(targetRoot, filename, data) {
  const text = Buffer.isBuffer(data) ? data.toString('utf8') : String(data || '');
  const meta = frontmatter(text);
  const fallback = /^skill\.md$/i.test(filename || '') ? 'skill' : basename(filename || 'skill', '.md');
  const { target } = uniqueDir(targetRoot, meta.name || fallback);
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, 'SKILL.md'), text);
  return { ok: true, path: target };
}

export async function importSkillUpload({ filename, data, targetRoot }) {
  if (!filename || !data) throw Object.assign(new Error('No file'), { status: 400 });
  const lower = filename.toLowerCase();
  mkdirSync(targetRoot, { recursive: true });
  if (lower.endsWith('.zip')) return writeZipSkill(targetRoot, filename, data);
  if (lower.endsWith('.md')) return writeMarkdownSkill(targetRoot, filename, data);
  throw Object.assign(new Error('Unsupported skill upload type'), { status: 400, code: 'INVALID_TYPE' });
}

export function imSkillRoots(platform, { homeDir = homedir() } = {}) {
  const root = getImRoot(platform, homeDir);
  if (!root) throw Object.assign(new Error('Unknown IM platform'), { status: 404 });
  return [{ source: 'project', store: `im:${platform}`, enabledDir: join(root, '.codex', 'skills'), disabledDir: join(root, '.codex', 'skills-skip') }];
}

export function imSkillImportRoot(platform, { homeDir = homedir() } = {}) {
  const root = getImRoot(platform, homeDir);
  if (!root) throw Object.assign(new Error('Unknown IM platform'), { status: 404 });
  return join(root, '.codex', 'skills');
}
