import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  unlinkSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';

import { atomicWriteFile } from './logger-install.js';
import { withFileLockSync } from './log-v2/storage.js';

export const SYSTEM_PROMPT_MAX_BYTES = 128 * 1024;
export const SYSTEM_PROMPT_STORE_VERSION = 1;
export const MODEL_PROMPT_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

const EMPTY_REVISION = '0';
const OWNER_FILE = '.cxv-system-prompts-v1';

export class SystemPromptStoreError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = 'SystemPromptStoreError';
    this.code = code;
    this.status = status;
  }
}

function revision(raw) {
  return createHash('sha256').update(raw).digest('hex');
}

function ensureDirectory(path) {
  if (existsSync(path)) {
    const stat = lstatSync(path);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new SystemPromptStoreError('unsafe_store_path', 409);
    }
    return;
  }
  mkdirSync(path, { mode: 0o700, recursive: true });
}

function ensureStoreRoot(logDir) {
  ensureDirectory(logDir);
  const root = join(logDir, 'managed-system-prompts-v1');
  ensureDirectory(root);
  const owner = join(root, OWNER_FILE);
  if (!existsSync(owner)) {
    atomicWriteFile(owner, `${JSON.stringify({ version: SYSTEM_PROMPT_STORE_VERSION })}\n`, { mode: 0o600 });
  } else {
    const stat = lstatSync(owner);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) {
      throw new SystemPromptStoreError('unsafe_store_owner', 409);
    }
    const parsed = JSON.parse(readFileSync(owner, 'utf8'));
    if (parsed?.version !== SYSTEM_PROMPT_STORE_VERSION) {
      throw new SystemPromptStoreError('unsupported_store_version', 409);
    }
  }
  return root;
}

function workspaceToken(cwd) {
  if (typeof cwd !== 'string' || !cwd.trim()) throw new SystemPromptStoreError('workspace_required', 400);
  let canonical = resolve(cwd);
  try { canonical = realpathSync(canonical); } catch {}
  const name = basename(canonical).replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 48) || 'workspace';
  return `${name}-${createHash('sha256').update(canonical).digest('hex').slice(0, 12)}`;
}

function normalizeMode(mode) {
  if (mode !== 'append' && mode !== 'override') throw new SystemPromptStoreError('invalid_mode', 400);
  return mode;
}

function normalizeText(text) {
  if (typeof text !== 'string') throw new SystemPromptStoreError('invalid_text', 400);
  if (text.includes('\0')) throw new SystemPromptStoreError('invalid_text', 400);
  if (Buffer.byteLength(text, 'utf8') > SYSTEM_PROMPT_MAX_BYTES) {
    throw new SystemPromptStoreError('prompt_too_large', 413);
  }
  return text;
}

export function normalizeModelPromptName(name) {
  if (typeof name !== 'string' || !MODEL_PROMPT_NAME_RE.test(name)
      || name.toLowerCase() === 'default' || /_APPEND$/i.test(name)) {
    throw new SystemPromptStoreError('invalid_model_name', 400);
  }
  return name.toUpperCase();
}

function assertManagedFile(path) {
  if (!existsSync(path)) return false;
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) {
    throw new SystemPromptStoreError('unsafe_prompt_file', 409);
  }
  return true;
}

function readEntry(path) {
  if (!assertManagedFile(path)) return null;
  const raw = readFileSync(path, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SystemPromptStoreError('invalid_prompt_file', 409);
  }
  if (parsed?.version !== SYSTEM_PROMPT_STORE_VERSION) {
    throw new SystemPromptStoreError('unsupported_prompt_version', 409);
  }
  return {
    text: normalizeText(parsed.text),
    mode: normalizeMode(parsed.mode),
    revision: revision(raw),
  };
}

function writeEntry(path, { text, mode, expectedRevision }) {
  const normalizedText = normalizeText(text);
  try {
    return withFileLockSync(`${path}.lock`, () => {
      const current = readEntry(path);
      const currentRevision = current?.revision || EMPTY_REVISION;
      if (expectedRevision !== undefined && expectedRevision !== currentRevision) {
        throw new SystemPromptStoreError('prompt_conflict', 409);
      }
      if (!normalizedText.trim()) {
        if (current) unlinkSync(path);
        return { cleared: true, revision: EMPTY_REVISION };
      }
      const raw = `${JSON.stringify({
        version: SYSTEM_PROMPT_STORE_VERSION,
        mode: normalizeMode(mode),
        text: normalizedText,
      }, null, 2)}\n`;
      atomicWriteFile(path, raw, { mode: 0o600 });
      return { cleared: false, revision: revision(raw) };
    }, { timeoutMs: 0, staleMs: 60_000 });
  } catch (error) {
    if (error?.code === 'CXV_LOG_V2_LOCK_TIMEOUT') {
      throw new SystemPromptStoreError('prompt_conflict', 409);
    }
    throw error;
  }
}

function scopePaths({ logDir, cwd, scope = 'workspace' }) {
  const root = ensureStoreRoot(logDir);
  const scopeRoot = scope === 'global'
    ? join(root, 'global')
    : join(root, 'workspaces', workspaceToken(cwd));
  ensureDirectory(scope === 'global' ? scopeRoot : join(root, 'workspaces'));
  ensureDirectory(scopeRoot);
  const models = join(scopeRoot, 'models');
  ensureDirectory(models);
  return { root, scopeRoot, models };
}

export function getDefaultSystemPrompt(options) {
  const { scopeRoot } = scopePaths({ ...options, scope: 'workspace' });
  const entry = readEntry(join(scopeRoot, 'default.json'));
  return {
    text: entry?.text || '',
    mode: entry?.mode || 'append',
    revision: entry?.revision || EMPTY_REVISION,
    dir: scopeRoot,
    active: true,
  };
}

export function saveDefaultSystemPrompt(options) {
  const { scopeRoot } = scopePaths({ ...options, scope: 'workspace' });
  return writeEntry(join(scopeRoot, 'default.json'), options);
}

function listModelEntries(options) {
  const { models } = scopePaths(options);
  const entries = [];
  for (const file of readdirSync(models).sort()) {
    if (!file.endsWith('.json')) continue;
    const name = file.slice(0, -5);
    let normalizedName;
    try {
      normalizedName = normalizeModelPromptName(name);
    } catch {
      // 杂散 JSON（如 README.json）不是受管提示词，不应让整个列表/注入失败
      console.warn(`[CX-Viewer] Skipping non-prompt store file: ${join(models, file)}`);
      continue;
    }
    try {
      const entry = readEntry(join(models, file));
      if (entry) entries.push({ name: normalizedName, scope: options.scope, ...entry });
    } catch (error) {
      if (error instanceof SystemPromptStoreError) {
        // 非受管文件（没有我们的版本标记，如误放的 README.json）不阻断列表；
        // 带版本标记但内容损坏的受管文件仍 fail-closed（可能正是要注入的条目），错误必须能定位文件
        if (error.code === 'unsupported_prompt_version') {
          console.warn(`[CX-Viewer] Skipping non-managed prompt file: ${join(models, file)}`);
          continue;
        }
        error.message = `${error.code}: ${join(models, file)}`;
        throw error;
      }
      throw new SystemPromptStoreError('invalid_prompt_file', 409);
    }
  }
  return { dir: models, entries };
}

export function getModelSystemPrompts({ logDir, cwd }) {
  const global = listModelEntries({ logDir, cwd, scope: 'global' });
  const workspace = listModelEntries({ logDir, cwd, scope: 'workspace' });
  return {
    globalDir: global.dir,
    workspaceDir: workspace.dir,
    global: global.entries,
    workspace: workspace.entries,
  };
}

export function saveModelSystemPrompt(options) {
  const scope = options.scope === 'global' ? 'global' : options.scope === 'workspace' ? 'workspace' : null;
  if (!scope) throw new SystemPromptStoreError('invalid_scope', 400);
  const name = normalizeModelPromptName(options.name);
  const { models } = scopePaths({ ...options, scope });
  return writeEntry(join(models, `${name}.json`), options);
}

function bestMatch(entries, model) {
  if (!model) return null;
  const needle = String(model).toLowerCase();
  return entries
    .filter(entry => needle.includes(entry.name.toLowerCase()))
    .sort((a, b) => {
      const exactA = needle === a.name.toLowerCase() ? 1 : 0;
      const exactB = needle === b.name.toLowerCase() ? 1 : 0;
      return exactB - exactA || b.name.length - a.name.length || a.name.localeCompare(b.name);
    })[0] || null;
}

export function selectSystemPrompt({ logDir, cwd, model }) {
  const models = getModelSystemPrompts({ logDir, cwd });
  return bestMatch(models.workspace, model)
    || bestMatch(models.global, model)
    || (() => {
      const fallback = getDefaultSystemPrompt({ logDir, cwd });
      return fallback.text.trim() ? { ...fallback, scope: 'workspace', name: 'DEFAULT' } : null;
    })();
}

export function injectSystemPromptIntoThreadStart(message, selected) {
  if (message?.method !== 'thread/start' || !selected?.text?.trim()) return message;
  const params = { ...(message.params || {}) };
  if (selected.mode === 'override') {
    // 重发同一 thread/start 时保持幂等，避免覆盖用户同字段内容
    if (params.baseInstructions !== selected.text) params.baseInstructions = selected.text;
  } else {
    const existing = typeof params.developerInstructions === 'string'
      ? params.developerInstructions
      : '';
    if (!existing.includes(selected.text.trim())) {
      params.developerInstructions = existing.trim()
        ? `${existing}\n\n${selected.text}`
        : selected.text;
    }
  }
  return { ...message, params };
}
