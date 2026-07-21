import { randomBytes } from 'node:crypto';
import {
  chmodSync, closeSync, existsSync, fsyncSync, lstatSync, mkdirSync,
  openSync, readFileSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

import { LOG_DIR } from '../findcx.js';
import { renameSyncWithRetry } from './file-api.js';

const DEFAULT_MAX_CHUNK_CHARS = 3800;
const MIN_MAX_CHUNK_CHARS = 500;
const MAX_MAX_CHUNK_CHARS = 5000;
const MAX_ALLOWLIST_ENTRIES = 500;
const MAX_ID_CHARS = 256;

export const DINGTALK_IM_ID = 'dingtalk';

export function getDingTalkImRoot() {
  return join(LOG_DIR, 'im', DINGTALK_IM_ID);
}

export function getDingTalkImConfigPath() {
  return join(getDingTalkImRoot(), 'config.json');
}

export function getDingTalkImWorkerDir() {
  return join(LOG_DIR, 'IM_dingtalk');
}

export function ensureDingTalkPrivateDirectory(dir) {
  const root = resolve(LOG_DIR);
  const target = resolve(dir);
  const rel = relative(root, target);
  if (rel === '..' || rel.startsWith(`..${sep}`) || rel === '' && target !== root) {
    throw Object.assign(new Error(`DingTalk IM path escapes log root: ${dir}`), { code: 'UNSAFE_IM_PATH' });
  }
  const segments = rel ? rel.split(sep).filter(Boolean) : [];
  let current = root;
  mkdirSync(current, { recursive: true, mode: 0o700 });
  const rootStat = lstatSync(current);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw Object.assign(new Error(`Unsafe DingTalk IM log root: ${current}`), { code: 'UNSAFE_IM_PATH' });
  }
  for (const segment of segments) {
    current = join(current, segment);
    try { mkdirSync(current, { mode: 0o700 }); }
    catch (error) { if (error?.code !== 'EEXIST') throw error; }
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw Object.assign(new Error(`Unsafe DingTalk IM directory: ${current}`), { code: 'UNSAFE_IM_PATH' });
    }
    try { chmodSync(current, 0o700); } catch {}
  }
}

export function assertDingTalkWorkerPathSafe(target) {
  const workerRoot = resolve(getDingTalkImWorkerDir());
  const resolvedTarget = resolve(target);
  const rel = relative(workerRoot, resolvedTarget);
  if (rel === '..' || rel.startsWith(`..${sep}`) || resolve(rel) === rel) {
    throw Object.assign(new Error('DingTalk worker path escapes its workspace'), { code: 'UNSAFE_IM_PATH' });
  }
  let current = workerRoot;
  if (existsSync(current)) {
    const rootStat = lstatSync(current);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
      throw Object.assign(new Error(`Unsafe DingTalk worker root: ${current}`), { code: 'UNSAFE_IM_PATH' });
    }
  }
  for (const segment of rel.split(sep).filter(Boolean)) {
    current = join(current, segment);
    if (!existsSync(current)) break;
    const stat = lstatSync(current);
    if (stat.isSymbolicLink()) {
      throw Object.assign(new Error(`Unsafe DingTalk worker symlink: ${current}`), { code: 'UNSAFE_IM_PATH' });
    }
  }
  return resolvedTarget;
}

function assertReplaceableRegularFile(path) {
  let stat;
  try { stat = lstatSync(path); }
  catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink > 1) {
    throw Object.assign(new Error(`Unsafe DingTalk IM file: ${path}`), { code: 'UNSAFE_IM_PATH' });
  }
}

export function atomicWritePrivateFile(path, data) {
  const dir = dirname(path);
  ensureDingTalkPrivateDirectory(dir);
  assertReplaceableRegularFile(path);
  const tmp = join(dir, `.${basename(path)}.tmp-${process.pid}-${randomBytes(6).toString('hex')}`);
  let fd;
  try {
    fd = openSync(tmp, 'wx', 0o600);
    writeFileSync(fd, data, 'utf8');
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSyncWithRetry(tmp, path);
    chmodSync(path, 0o600);
    try {
      const dirFd = openSync(dir, 'r');
      try { fsyncSync(dirFd); } finally { closeSync(dirFd); }
    } catch {}
  } catch (error) {
    if (fd !== undefined) try { closeSync(fd); } catch {}
    try { unlinkSync(tmp); } catch {}
    throw error;
  }
}

function normalizeString(value, max = 4096) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function normalizeAllowlist(value) {
  if (!Array.isArray(value)) return [];
  const result = [];
  const seen = new Set();
  for (const item of value) {
    const id = normalizeString(item, MAX_ID_CHARS);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= MAX_ALLOWLIST_ENTRIES) break;
  }
  return result;
}

export function normalizeDingTalkImConfig(value = {}) {
  const chunk = Number(value.maxChunkChars);
  return {
    version: 1,
    enabled: value.enabled === true,
    appKey: normalizeString(value.appKey, 512),
    appSecret: normalizeString(value.appSecret, 4096),
    allowStaffIds: normalizeAllowlist(value.allowStaffIds),
    maxChunkChars: Number.isFinite(chunk)
      ? Math.max(MIN_MAX_CHUNK_CHARS, Math.min(MAX_MAX_CHUNK_CHARS, Math.round(chunk)))
      : DEFAULT_MAX_CHUNK_CHARS,
  };
}

export function validateDingTalkImConfig(config, { requireEnabled = false } = {}) {
  const cfg = normalizeDingTalkImConfig(config);
  if (requireEnabled || cfg.enabled) {
    if (!cfg.appKey) throw Object.assign(new Error('DingTalk appKey is required'), { code: 'DINGTALK_APP_KEY_REQUIRED' });
    if (!cfg.appSecret) throw Object.assign(new Error('DingTalk appSecret is required'), { code: 'DINGTALK_APP_SECRET_REQUIRED' });
  }
  return cfg;
}

export function loadDingTalkImConfig() {
  try {
    const path = getDingTalkImConfigPath();
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink > 1) return normalizeDingTalkImConfig();
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return normalizeDingTalkImConfig(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
  } catch {
    return normalizeDingTalkImConfig();
  }
}

export function loadDingTalkImState() {
  const { appSecret, ...state } = loadDingTalkImConfig();
  return { ...state, hasSecret: !!appSecret };
}

export function saveDingTalkImConfig(value = {}) {
  const current = loadDingTalkImConfig();
  const merged = { ...current, ...value };
  if (typeof value.appSecret !== 'string' || value.appSecret.trim() === '') merged.appSecret = current.appSecret;
  const normalized = validateDingTalkImConfig(merged);
  atomicWritePrivateFile(getDingTalkImConfigPath(), `${JSON.stringify(normalized, null, 2)}\n`);
  return normalized;
}

export function clearDingTalkImSecret() {
  const config = { ...loadDingTalkImConfig(), enabled: false, appSecret: '' };
  atomicWritePrivateFile(getDingTalkImConfigPath(), `${JSON.stringify(config, null, 2)}\n`);
  return config;
}
