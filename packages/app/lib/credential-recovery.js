import { closeSync, lstatSync, mkdirSync, mkdtempSync, openSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { credentialPathsForDirectory } from './credential-paths.js';
import { createCredentialBackup, readCredentialBackup, readCredentialSource } from './credential-backup.js';
import { createCredentialStore } from './credential-store.js';
import { readReferencedSecret, stageSecretReference } from './credential-reference.js';
import { isConfigurationMigrated, markConfigurationMigrated } from './credential-migration-state.js';
import { AUTH_CREDENTIAL_VERSION_FIELD, authCredentialOwner } from './auth.js';
import { getPreferencesPath, withPreferencesLock } from './preferences.js';
import { DINGTALK_SECRET_OWNER, IM_CREDENTIAL_VERSION_FIELD, ensureDingTalkPrivateDirectory, getDingTalkImConfigPath, withDingTalkImConfigLock } from './dingtalk-im-config.js';
import { PROXY_CREDENTIAL_VERSION_FIELD, withProxyProfilesLock } from './proxy-profile-credentials.js';
import { createDefaultProxyProfiles } from './proxy-profile.js';
import { atomicWriteFile } from './logger-install.js';
import { fsyncDirectorySync } from './log-v2/storage.js';

function failure(code = 'CREDENTIAL_RECOVERY_UNREADABLE', backupPath) {
  return Object.assign(new Error(code === 'CREDENTIAL_RECOVERY_INCOMPLETE'
    ? 'Recovery did not finish; keep shared processes stopped and retry the same snapshot or use its safety backup'
    : 'Recovery source or target could not be verified; keep the matching configuration, store and key'), {
    code, status: 409, backupPath,
  });
}

function context({ ownerDirectory, backupPath, type, profileName }) {
  if (typeof ownerDirectory !== 'string' || !ownerDirectory || typeof backupPath !== 'string' || !backupPath) throw failure();
  const owner = resolve(ownerDirectory);
  let sources, identity, lock;
  if (type === 'auth' && dirname(resolve(getPreferencesPath())) === owner) {
    sources = ['preferences.json']; identity = 'preferences.json'; lock = withPreferencesLock;
  } else if (type === 'im' && resolve(getDingTalkImConfigPath()) === join(owner, 'im', 'dingtalk', 'config.json')) {
    sources = ['im/dingtalk/config.json']; identity = DINGTALK_SECRET_OWNER;
    lock = operation => {
      ensureDingTalkPrivateDirectory(dirname(getDingTalkImConfigPath()));
      return withDingTalkImConfigLock(operation);
    };
  } else if (type === 'proxy' && typeof profileName === 'string' && profileName
      && basename(profileName) === profileName && !profileName.includes('\\') && !['.', '..'].includes(profileName)) {
    sources = [profileName, `${profileName}.bak`]; identity = profileName;
    lock = operation => withProxyProfilesLock(join(owner, profileName), operation);
  } else throw failure();
  const paths = credentialPathsForDirectory(owner);
  const store = createCredentialStore(paths.root);
  const backup = readCredentialBackup(backupPath, { ownerDirectory: owner, sources });
  // Authenticate the live vault before any write. A missing/corrupt live key
  // cannot be repaired by silently replacing a shared vault with an old one.
  store.get('configuration-state', 'recovery-validation');
  if (!!lstatSync(paths.file, { throwIfNoEntry: false }) !== !!lstatSync(paths.keyPath, { throwIfNoEntry: false })) throw failure();
  const readSources = () => sources.map(name => ({ name, bytes: readCredentialSource(owner, name) }));
  readSources(); // Validate the owner/source paths before creating a source lock.
  return { owner, type, sources, identity, lock, paths, store, backup, readSources };
}

export function inspectCredentialRecovery(options) {
  const c = context(options);
  return { status: 'preview', type: c.type, scope: 'whole-source',
    sources: c.readSources().map(source => ({ path: source.name, currentPresent: source.bytes !== null,
      backupPresent: c.backup.get(source.name) !== null })) };
}

function migrationCommand(c, owner, apply = false) {
  const script = fileURLToPath(new URL(`../scripts/migrate-${c.type}-credentials.mjs`, import.meta.url));
  const args = c.type === 'proxy' ? ['--profile', join(owner, c.sources[0])] : ['--root', owner];
  if (apply) args.push('--apply', '--confirm-stopped');
  const child = spawnSync(process.execPath, [script, ...args], {
    env: { ...process.env, CXV_LOG_DIR: owner, CXV_PROXY_PROFILE_PATH: join(owner, c.type === 'proxy' ? c.identity : 'profile.json') },
    encoding: 'utf8', maxBuffer: 64 * 1024, timeout: 60_000,
  });
  if (child.error || child.status !== 0) throw failure();
  try { return JSON.parse(child.stdout); } catch { throw failure(); }
}

function writeStagingFile(stage, name, bytes) {
  const path = join(stage, name);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const fd = openSync(path, 'wx', 0o600);
  try { writeFileSync(fd, bytes); } finally { closeSync(fd); }
}

function parse(bytes) {
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

function prepareStage(c, stage) {
  for (const [name, bytes] of c.backup) if (bytes !== null) writeStagingFile(stage, name, bytes);
  const inspected = migrationCommand(c, stage);
  if (inspected.status === 'absent') {
    // Represent an empty old configuration explicitly in the new format so
    // recovery cannot turn an existing migration receipt into a downgrade.
    const bytes = readCredentialSource(stage, c.sources[0]);
    const next = c.type === 'auth' ? { ...(bytes === null ? {} : parse(bytes)), [AUTH_CREDENTIAL_VERSION_FIELD]: 1 }
      : c.type === 'im' ? { version: 1, enabled: false, [IM_CREDENTIAL_VERSION_FIELD]: 1, appSecretRef: null }
        : { ...createDefaultProxyProfiles(), [PROXY_CREDENTIAL_VERSION_FIELD]: 1 };
    const path = join(stage, c.sources[0]);
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    atomicWriteFile(path, `${JSON.stringify(next)}\n`, { mode: 0o600 });
  }
  if (migrationCommand(c, stage, true).status !== 'migrated') throw failure();
}

// Reuse a live version only after checking its owner and exact secret. Never
// replace the master key or remove any other owner's records.
function rebind(c, fromStore, kind, owner, ref, candidate) {
  const secret = readReferencedSecret(fromStore, kind, owner, ref);
  if (typeof candidate === 'string') {
    try { if (readReferencedSecret(c.store, kind, owner, candidate) === secret) return candidate; } catch {}
  }
  return stageSecretReference(c.store, kind, owner, secret);
}

function rebindDocument(c, document, fromStore, current) {
  if (c.type === 'auth') {
    const convert = (stored, project, candidate) => ({ ...stored, passwordRef: rebind(c, fromStore,
      'lan-password', authCredentialOwner(project), stored.passwordRef, candidate?.passwordRef) });
    const next = { ...document };
    const previous = current?.[AUTH_CREDENTIAL_VERSION_FIELD] === 1 ? current : null;
    if (Object.hasOwn(next, 'auth')) next.auth = convert(next.auth, null, previous?.auth);
    if (next.authByProject) next.authByProject = Object.fromEntries(Object.entries(next.authByProject)
      .map(([project, stored]) => [project, convert(stored, project, previous?.authByProject?.[project])]));
    return next;
  }
  if (c.type === 'im') {
    const candidate = current?.[IM_CREDENTIAL_VERSION_FIELD] === 1 ? current.appSecretRef : null;
    return { ...document, appSecretRef: document.appSecretRef === null ? null
      : rebind(c, fromStore, 'im-secret', DINGTALK_SECRET_OWNER, document.appSecretRef, candidate) };
  }
  const previous = current?.[PROXY_CREDENTIAL_VERSION_FIELD] === 1 && Array.isArray(current.profiles) ? current.profiles : [];
  return { ...document, profiles: document.profiles.map(profile => {
    const id = profile.id.trim();
    if (id === 'max') return profile;
    const owner = JSON.stringify([c.identity, id]);
    const candidate = previous.find(item => typeof item?.id === 'string' && item.id.trim() === id)?.apiKeyRef;
    return { ...profile, apiKeyRef: rebind(c, fromStore, 'profile-apiKey', owner, profile.apiKeyRef, candidate) };
  }) };
}

export function recoverCredentialConfiguration(options) {
  if (options.confirmStopped !== true) throw Object.assign(new Error('Stop every process sharing this configuration, then confirmStopped'), {
    code: 'CREDENTIAL_RECOVERY_REQUIRES_STOPPED',
  });
  const c = context(options);
  return c.lock(() => {
    const initial = c.readSources();
    const backupPath = createCredentialBackup(c.owner, c.sources);
    let stage;
    try {
      // The only temporary plaintext/configuration copies stay inside the
      // existing protected backup root, never the public temp directory.
      stage = mkdtempSync(join(c.paths.backupRoot, 'restore-stage-'));
      prepareStage(c, stage);
      const stageStore = createCredentialStore(join(stage, 'private-credentials-v1'));
      const next = initial.map(source => {
        const bytes = readCredentialSource(stage, source.name);
        if (bytes === null) return { name: source.name, bytes: null };
        let current;
        try { current = source.bytes === null ? null : parse(source.bytes); } catch {}
        const document = rebindDocument(c, parse(bytes), stageStore, current);
        const content = Buffer.from(`${JSON.stringify(document, null, 2)}\n`);
        const limit = c.type === 'im' ? 1024 * 1024 : 8 * 1024 * 1024;
        if (content.length > limit) throw failure();
        return { name: source.name, bytes: content };
      });
      for (const source of [...next].reverse()) {
        const current = c.readSources();
        if (current.some((item, index) => item.bytes === null ? initial[index].bytes !== null
          : initial[index].bytes === null || !item.bytes.equals(initial[index].bytes))) throw failure();
        const path = join(c.owner, source.name);
        if (source.bytes === null) {
          if (initial.find(item => item.name === source.name).bytes !== null) unlinkSync(path);
        } else atomicWriteFile(path, source.bytes, { mode: 0o600 });
        fsyncDirectorySync(dirname(path));
        initial.find(item => item.name === source.name).bytes = source.bytes;
      }
      const verified = migrationCommand(c, c.owner);
      if (!['pending-receipt', 'migrated'].includes(verified.status)) throw failure();
      if (!isConfigurationMigrated(c.store, c.type, c.identity)) markConfigurationMigrated(c.store, c.type, c.identity);
      if (migrationCommand(c, c.owner).status !== 'migrated'
          || c.readSources().some((source, index) => source.bytes === null ? next[index].bytes !== null
            : next[index].bytes === null || !source.bytes.equals(next[index].bytes))) throw failure();
      return { status: 'restored', type: c.type, scope: 'whole-source', backupPath };
    } catch {
      // Keep every version that might be referenced by a partially committed
      // source. A retry of the original snapshot can safely finish the switch.
      throw failure('CREDENTIAL_RECOVERY_INCOMPLETE', backupPath);
    } finally {
      if (stage) try { rmSync(stage, { recursive: true, force: true }); } catch {}
    }
  });
}
