import { randomBytes } from 'node:crypto';
import {
  chmodSync, closeSync, constants, existsSync, fchmodSync, fstatSync, fsyncSync, lstatSync, mkdirSync,
  openSync, readFileSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

import { LOG_DIR } from '../findcx.js';
import { renameSyncWithRetry } from './file-api.js';
import { getDingTalkImConfigPath } from './config-paths.js';
import { fsyncDirectorySync, withFileLockSync } from './log-v2/storage.js';
import { CREDENTIAL_PATHS } from './credential-paths.js';
import { createCredentialStore } from './credential-store.js';
import { readReferencedSecret, stageSecretReference, removeSecretReference } from './credential-reference.js';
import { assertConfigurationFormat, isConfigurationMigrated, markConfigurationMigrated } from './credential-migration-state.js';
import { createCredentialBackup, readCredentialSource } from './credential-backup.js';
export { DINGTALK_IM_ID, getDingTalkImRoot, getDingTalkImConfigPath } from './config-paths.js';

const DEFAULT_MAX_CHUNK_CHARS = 3800;
const MIN_MAX_CHUNK_CHARS = 500;
const MAX_MAX_CHUNK_CHARS = 5000;
const MAX_ALLOWLIST_ENTRIES = 500;
const MAX_ID_CHARS = 256;
export const IM_CREDENTIAL_VERSION_FIELD = '_cxvImCredentialVersion';
export const DINGTALK_SECRET_OWNER = 'im:dingtalk';
const secretStore = createCredentialStore(CREDENTIAL_PATHS.root);

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
  let created = false;
  try {
    fd = openSync(tmp, 'wx', 0o600);
    created = true;
    fchmodSync(fd, 0o600);
    writeFileSync(fd, data, 'utf8');
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSyncWithRetry(tmp, path);
    try {
      const dirFd = openSync(dir, 'r');
      try { fsyncSync(dirFd); } finally { closeSync(dirFd); }
    } catch {}
  } catch (error) {
    if (fd !== undefined) try { closeSync(fd); } catch {}
    if (created) try { unlinkSync(tmp); } catch {}
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
    ackCard: value.ackCard !== false,
    cardTemplateId: normalizeString(value.cardTemplateId, 512),
    aiCardTemplateId: normalizeString(value.aiCardTemplateId, 512),
    aiCardStreamKey: normalizeString(value.aiCardStreamKey, 128),
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

function unreadableConfig() {
  return Object.assign(new Error('DingTalk configuration is unreadable; restore config.json before saving'), {
    code: 'DINGTALK_CONFIG_UNREADABLE', status: 409,
  });
}

function parseStoredConfig(bytes) {
  if (bytes.length > 1024 * 1024) throw unreadableConfig();
  const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)
      || parsed.version !== undefined && parsed.version !== 1
      || parsed.appSecret !== undefined && typeof parsed.appSecret !== 'string') throw unreadableConfig();
  return parsed;
}

function readStoredConfig() {
  const path = getDingTalkImConfigPath();
  let fd;
  try {
    for (const dir of [resolve(LOG_DIR), join(LOG_DIR, 'im'), dirname(path)]) {
      const stat = lstatSync(dir);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw unreadableConfig();
    }
    assertReplaceableRegularFile(path);
    fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0));
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.nlink > 1 || stat.size > 1024 * 1024) throw unreadableConfig();
    const bytes = readFileSync(fd);
    return parseStoredConfig(bytes);
  } catch (error) {
    let missing = false;
    try { missing = error.code === 'ENOENT' && !lstatSync(path, { throwIfNoEntry: false }); } catch {}
    if (missing) return {};
    throw unreadableConfig();
  } finally { if (fd !== undefined) closeSync(fd); }
}

export function withDingTalkImConfigLock(callback) {
  const path = getDingTalkImConfigPath();
  assertReplaceableRegularFile(path);
  const lockPath = `${path}.lock`;
  assertReplaceableRegularFile(lockPath);
  try {
    return withFileLockSync(lockPath, callback, { timeoutMs: 2000, staleMs: 60_000 });
  } catch (error) {
    if (error.code === 'CXV_LOG_V2_LOCK_TIMEOUT') {
      error.message = 'DingTalk configuration is being changed by another process';
      error.status = 409;
    }
    throw error;
  }
}

function mutateStoredConfig(updater) {
  const path = getDingTalkImConfigPath();
  ensureDingTalkPrivateDirectory(dirname(path));
  return withDingTalkImConfigLock(() => {
    const next = updater(readStoredConfig());
    atomicWritePrivateFile(path, `${JSON.stringify(next, null, 2)}\n`);
    return next;
  });
}

function decodeStoredConfig(stored) {
  try {
    const version = stored[IM_CREDENTIAL_VERSION_FIELD];
    assertConfigurationFormat(secretStore, 'im', DINGTALK_SECRET_OWNER, version);
    if (version === undefined) {
      if (Object.hasOwn(stored, 'appSecretRef')) throw new Error('Missing credential version');
      return normalizeDingTalkImConfig(stored);
    }
    if (version !== 1 || Object.hasOwn(stored, 'appSecret')
        || resolve(getDingTalkImConfigPath()) !== resolve(getDingTalkImConfigPath(dirname(CREDENTIAL_PATHS.root)))) {
      throw new Error('Invalid migrated secret configuration');
    }
    if (stored.appSecretRef === null && stored.enabled !== true) return normalizeDingTalkImConfig(stored);
    const appSecret = readReferencedSecret(secretStore, 'im-secret', DINGTALK_SECRET_OWNER, stored.appSecretRef);
    if (!appSecret.trim()) throw new Error('Invalid referenced secret');
    return normalizeDingTalkImConfig({ ...stored, appSecret });
  } catch {
    throw Object.assign(new Error('Stored DingTalk secret is unreadable; restore its matching configuration, store and master key'), {
      code: 'DINGTALK_SECRET_UNREADABLE', status: 409,
    });
  }
}

function imMigrationSource() {
  if (resolve(LOG_DIR) !== resolve(dirname(CREDENTIAL_PATHS.root))) throw unreadableConfig();
  const source = relative(LOG_DIR, getDingTalkImConfigPath()).split(sep).join('/');
  const bytes = readCredentialSource(LOG_DIR, source);
  let stored;
  try { stored = bytes === null ? {} : parseStoredConfig(bytes); }
  catch { throw unreadableConfig(); }
  const config = validateDingTalkImConfig(decodeStoredConfig(stored));
  const activated = isConfigurationMigrated(secretStore, 'im', DINGTALK_SECRET_OWNER);
  const status = bytes === null ? 'absent' : stored[IM_CREDENTIAL_VERSION_FIELD] === 1
    ? activated ? 'migrated' : 'pending-receipt' : 'legacy';
  return { source, bytes, stored, config, status };
}

function imMigrationSummary(state) {
  return { status: state.status, enabled: state.config.enabled, hasSecret: !!state.config.appSecret };
}

export function inspectDingTalkCredentialMigration() {
  return imMigrationSummary(imMigrationSource());
}

// Offline opt-in only. Ordinary startup and settings updates never call this.
export function migrateDingTalkCredentials({ confirmStopped = false } = {}) {
  if (confirmStopped !== true) throw Object.assign(new Error('Stop every process sharing this configuration, then confirmStopped'), {
    code: 'CREDENTIAL_MIGRATION_REQUIRES_STOPPED',
  });
  // Do not create missing IM directories just to inspect an absent config.
  const preliminary = imMigrationSource();
  if (preliminary.status === 'absent') return { ...imMigrationSummary(preliminary), backupPath: null };
  return withDingTalkImConfigLock(() => {
    const initial = imMigrationSource();
    if (initial.status === 'absent' || initial.status === 'migrated') return { ...imMigrationSummary(initial), backupPath: null };
    const backupPath = createCredentialBackup(LOG_DIR, [initial.source]);
    let staged;
    try {
      let next = initial.stored;
      if (initial.status === 'legacy') {
        const { appSecret, ...rest } = next;
        staged = initial.config.appSecret
          ? stageSecretReference(secretStore, 'im-secret', DINGTALK_SECRET_OWNER, initial.config.appSecret) : null;
        next = { ...rest, [IM_CREDENTIAL_VERSION_FIELD]: 1, appSecretRef: staged };
      }
      const current = readCredentialSource(LOG_DIR, initial.source);
      if (current === null || !current.equals(initial.bytes)) throw new Error('Source changed');
      const content = `${JSON.stringify(next, null, 2)}\n`;
      if (Buffer.byteLength(content) > 1024 * 1024) throw new Error('Migrated source exceeds the source reader limit');
      atomicWritePrivateFile(getDingTalkImConfigPath(), content);
      fsyncDirectorySync(dirname(getDingTalkImConfigPath()));
      const verified = imMigrationSource();
      if (verified.status !== 'pending-receipt'
          || JSON.stringify(verified.config) !== JSON.stringify(initial.config)) throw new Error('Migration verification failed');
      markConfigurationMigrated(secretStore, 'im', DINGTALK_SECRET_OWNER);
      const completed = imMigrationSource();
      if (completed.status !== 'migrated') throw new Error('Migration receipt verification failed');
      return { ...imMigrationSummary(completed), backupPath };
    } catch {
      // A rename can commit before directory fsync fails. Delete a staged ref
      // only if the exact original source still exists; otherwise retain it.
      try {
        const current = readCredentialSource(LOG_DIR, initial.source);
        if (staged && current !== null && current.equals(initial.bytes)) {
          removeSecretReference(secretStore, 'im-secret', DINGTALK_SECRET_OWNER, staged);
        }
      } catch {}
      throw Object.assign(new Error('Credential migration did not finish; keep processes stopped and retry or recover from its matching backup'), {
        code: 'CREDENTIAL_MIGRATION_INCOMPLETE', status: 409, backupPath,
      });
    }
  });
}

function mutateCredentials(updater) {
  const staged = [];
  const retired = [];
  const cleanup = refs => {
    for (const ref of refs) {
      try { removeSecretReference(secretStore, 'im-secret', DINGTALK_SECRET_OWNER, ref); }
      catch { console.warn('[CX Viewer] An inactive encrypted IM secret could not be removed; restore its store before retrying cleanup'); }
    }
  };
  let result;
  try {
    mutateStoredConfig(stored => {
      const current = decodeStoredConfig(stored);
      result = updater(current);
      if (stored[IM_CREDENTIAL_VERSION_FIELD] !== 1) return result;
      const { appSecret, ...config } = result;
      let appSecretRef = null;
      if (appSecret) {
        if (current.appSecret === appSecret) appSecretRef = stored.appSecretRef;
        else {
          appSecretRef = stageSecretReference(secretStore, 'im-secret', DINGTALK_SECRET_OWNER, appSecret);
          staged.push(appSecretRef);
        }
      }
      if (typeof stored.appSecretRef === 'string' && stored.appSecretRef !== appSecretRef) retired.push(stored.appSecretRef);
      return { ...config, [IM_CREDENTIAL_VERSION_FIELD]: 1, appSecretRef };
    });
  } catch (error) { cleanup(staged); throw error; }
  cleanup(retired);
  return result;
}

export function loadDingTalkImConfig() { return decodeStoredConfig(readStoredConfig()); }

export function loadDingTalkImState() {
  const { appSecret, ...state } = loadDingTalkImConfig();
  return { ...state, hasSecret: !!appSecret };
}

export function saveDingTalkImConfig(value = {}) {
  return mutateCredentials(current => {
    const merged = { ...current, ...value };
    if (typeof value.appSecret !== 'string' || value.appSecret.trim() === '') merged.appSecret = current.appSecret;
    return validateDingTalkImConfig(merged);
  });
}

export function clearDingTalkImSecret() {
  return mutateCredentials(current => ({ ...current, enabled: false, appSecret: '' }));
}
