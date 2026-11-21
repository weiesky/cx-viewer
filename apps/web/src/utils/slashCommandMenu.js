// Slash-skill menu pure logic: trigger detection, command normalization, grouping,
// filtering, and outgoing-text composition. No React/Node deps — importable from node:test.
//
// Data sources:
// - Native AppServer: actual skills/list metadata via the scoped read-only endpoint.
// - PTY / pre-init / failure fallback: actual enabled SKILL.md files from /api/skills.

export const CLOSED_SLASH_MENU = Object.freeze({ open: false, query: '', activeIndex: 0 });

export const BUILTIN_SKILL_GROUP_KEY = 'builtin';
export const PERSONAL_SKILL_GROUP_KEY = 'personal';
export const SKILL_GROUP_TITLE_KEYS = Object.freeze({
  personal: 'ui.slashMenu.personalSkills',
  builtin: 'ui.slashMenu.builtinSkills',
});

// Command token safety: letters/digits/dots/underscore/colon/dash only. Mirrors the
// server skills-api SAFE_NAME spirit — anything with whitespace/linebreaks would break
// the native `$name` token we write back into the textarea.
const SAFE_COMMAND_NAME = /^[A-Za-z0-9._:-]+$/;

// Trigger: value starts with '/' and the caret sits inside the first command token
// (no whitespace before the caret). Returns { query } or null when the menu must close.
export function getSlashMenuContext(value, caret) {
  if (typeof value !== 'string' || value[0] !== '/') return null;
  const pos = typeof caret === 'number' && caret >= 0 ? Math.min(caret, value.length) : value.length;
  if (pos < 1) return null;
  const beforeCaret = value.slice(0, pos);
  // Any whitespace (incl. \n \t U+2028 U+2029) before the caret means the command token ended.
  if (/\s/.test(beforeCaret)) return null;
  return { query: beforeCaret.slice(1) };
}

// Sanitize native skills/list metadata into safe menu items.
// Strips leading '/', drops empty/non-string/unsafe/duplicate names (first occurrence wins).
export function normalizeSdkCommands(commands) {
  if (!Array.isArray(commands)) return [];
  const seen = new Set();
  const out = [];
  for (const c of commands) {
    if (!c || typeof c.name !== 'string') continue;
    const name = c.name.replace(/^\/+/, '');
    if (!name || !SAFE_COMMAND_NAME.test(name) || seen.has(name)) continue;
    seen.add(name);
    out.push({
      name,
      description: typeof c.description === 'string' ? c.description : '',
      group: !c.pluginId && ['system', 'admin'].includes(c.scope) ? BUILTIN_SKILL_GROUP_KEY : PERSONAL_SKILL_GROUP_KEY,
      argumentHint: typeof c.argumentHint === 'string' ? c.argumentHint : '',
      aliases: Array.isArray(c.aliases)
        ? c.aliases.filter(a => typeof a === 'string').map(a => a.replace(/^\/+/, ''))
        : [],
    });
  }
  return out;
}

// Map /api/skills rows to menu items. Keeps only enabled skills; builtin -> builtin group,
// user/project/plugin -> personal. Native invocation uses the actual metadata name,
// without inventing plugin namespace aliases or builtin descriptions.
export function fsSkillsToMenuItems(skills) {
  if (!Array.isArray(skills)) return [];
  const out = [], seen = new Set();
  for (const s of skills) {
    if (!s || s.enabled !== true || typeof s.path !== 'string' || !s.path) continue;
    const name = typeof s.name === 'string' ? s.name : '';
    if (!name || !SAFE_COMMAND_NAME.test(name) || seen.has(name)) continue;
    seen.add(name);
    const isBuiltin = s.source === 'builtin';
    out.push({
      name,
      description: typeof s.description === 'string' ? s.description : '',
      argumentHint: '',
      aliases: [],
      group: isBuiltin ? BUILTIN_SKILL_GROUP_KEY : PERSONAL_SKILL_GROUP_KEY,
    });
  }
  return out;
}

// name -> { group, description } lookup built from /api/skills rows. Personal (user/project/
// plugin) takes precedence over builtin on name collision so a user shadowing `review` is
// grouped as personal.
export function buildSkillSourceIndex(fsSkills) {
  const map = new Map();
  if (!Array.isArray(fsSkills)) return map;
  for (const s of fsSkills) {
    if (!s) continue;
    const display = typeof s.name === 'string' ? s.name : '';
    if (!display) continue;
    const group = s.source === 'builtin' ? BUILTIN_SKILL_GROUP_KEY : PERSONAL_SKILL_GROUP_KEY;
    const existing = map.get(display);
    if (existing && existing.group === PERSONAL_SKILL_GROUP_KEY) continue; // personal wins
    map.set(display, {
      group,
      description: typeof s.description === 'string' ? s.description : '',
    });
  }
  return map;
}

function itemMatchesQuery(item, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  if (item.name.toLowerCase().startsWith(q)) return true;
  return (item.aliases || []).some(a => typeof a === 'string' && a.toLowerCase().startsWith(q));
}

function classifyGroup(name, sourceIndex) {
  const fromFs = sourceIndex && sourceIndex.get(name);
  if (fromFs) return fromFs.group;
  return PERSONAL_SKILL_GROUP_KEY;
}

// Build the grouped, filtered, flat-indexed menu model.
// - sdkReady=true: source = SDK commands (server order preserved), group via fs index / builtin set.
// - otherwise: source = /api/skills rows (fs order: personal sorted by name, builtin per BUILTIN set).
// Returns { groups: [{key, titleKey, items}], flatItems, source: 'sdk'|'fs' }.
export function buildSlashMenuModel({ sdkReady, sdkCommands, fsSkills, query }) {
  const sourceIndex = buildSkillSourceIndex(fsSkills);
  let items;
  let source;
  // Native successful empty catalogs are authoritative (including disabled skills).
  if (sdkReady && Array.isArray(sdkCommands)) {
    source = 'sdk';
    items = sdkCommands.map(c => ({
      name: c.name,
      description: c.description || '',
      argumentHint: c.argumentHint || '',
      aliases: c.aliases || [],
      group: c.group || classifyGroup(c.name, sourceIndex),
    }));
  } else {
    source = 'fs';
    const fsItems = fsSkillsToMenuItems(fsSkills);
    const personal = fsItems
      .filter(i => i.group === PERSONAL_SKILL_GROUP_KEY)
      .sort((a, b) => a.name.localeCompare(b.name));
    const builtin = fsItems.filter(i => i.group === BUILTIN_SKILL_GROUP_KEY).sort((a, b) => a.name.localeCompare(b.name));
    items = [...personal, ...builtin];
  }

  const filtered = items.filter(i => itemMatchesQuery(i, query));

  const groups = [];
  const flatItems = [];
  let flatIndex = 0;
  for (const key of [PERSONAL_SKILL_GROUP_KEY, BUILTIN_SKILL_GROUP_KEY]) {
    const groupItems = filtered.filter(i => i.group === key);
    if (!groupItems.length) continue;
    const withIndex = groupItems.map(i => ({ ...i, flatIndex: flatIndex++ }));
    flatItems.push(...withIndex);
    groups.push({ key, titleKey: SKILL_GROUP_TITLE_KEYS[key], items: withIndex });
  }
  return { groups, flatItems, source };
}

// Compose the final outgoing text. A slash command must stay at the very start of the
// message — prefixing image paths before it would break command recognition. For ordinary
// text keep the legacy behavior (images first).
export function composeOutgoingText(userText, imagePaths) {
  if (!imagePaths) return userText;
  if (!userText) return imagePaths;
  return /^\s*[/$]/.test(userText)
    ? `${userText} ${imagePaths}`
    : `${imagePaths} ${userText}`;
}
