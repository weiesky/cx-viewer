import { basename, dirname, join, resolve } from 'node:path';
import { createProxyProfileCredentials, PROXY_CREDENTIAL_VERSION_FIELD, withProxyProfilesLock } from './proxy-profile-credentials.js';
import { createCredentialBackup, readCredentialSource } from './credential-backup.js';
import { assertConfigurationFormat, isConfigurationMigrated, markConfigurationMigrated } from './credential-migration-state.js';
import { stageSecretReference, removeSecretReference } from './credential-reference.js';
import { atomicWriteFile } from './logger-install.js';
import { fsyncDirectorySync } from './log-v2/storage.js';

function migrationContext(profilePath) {
  const path = resolve(profilePath);
  const owner = dirname(path);
  const name = basename(path);
  const credentials = createProxyProfileCredentials(path);
  function read() {
    try {
      const sources = [name, `${name}.bak`].map(source => {
        const bytes = readCredentialSource(owner, source);
        if (bytes === null) return { name: source, bytes, document: null, data: null };
        const document = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes));
        return { name: source, bytes, document, data: credentials.decode(document, { migrateLegacy: true }) };
      });
      if (sources[0].bytes === null) {
        assertConfigurationFormat(credentials.store, 'proxy', name, undefined);
        if (sources[1].bytes !== null) throw new Error('Orphaned backup');
      }
      const present = sources.filter(source => source.bytes !== null);
      const encrypted = present.filter(source => source.document[PROXY_CREDENTIAL_VERSION_FIELD] === 1).length;
      const status = !present.length ? 'absent' : encrypted === present.length
        ? isConfigurationMigrated(credentials.store, 'proxy', name) ? 'migrated' : 'pending-receipt'
        : encrypted ? 'partial' : 'legacy';
      return { sources, status };
    } catch {
      throw Object.assign(new Error('Proxy migration source is unreadable; restore its matching configuration and store'), {
        code: 'CREDENTIALS_UNREADABLE', status: 409,
      });
    }
  }
  return { owner, name, credentials, read };
}

function summary(state) {
  const counts = state.sources.map(source => source.data?.profiles.filter(profile => profile.id !== 'max').length || 0);
  return { status: state.status, profiles: counts[0], backupProfiles: counts[1] };
}

export function inspectProxyCredentialMigration(profilePath) {
  return summary(migrationContext(profilePath).read());
}

// Explicit offline migration only; runtime reads/saves never activate migration.
export function migrateProxyCredentials(profilePath, { confirmStopped = false } = {}) {
  if (confirmStopped !== true) throw Object.assign(new Error('Stop every process sharing this configuration, then confirmStopped'), {
    code: 'CREDENTIAL_MIGRATION_REQUIRES_STOPPED',
  });
  const context = migrationContext(profilePath);
  const { owner, name, credentials, read } = context;
  return withProxyProfilesLock(profilePath, () => {
    const initial = read();
    if (initial.status === 'absent' || initial.status === 'migrated') return { ...summary(initial), backupPath: null };
    const backupPath = createCredentialBackup(owner, initial.sources.map(source => source.name));
    const staged = [];
    try {
      // Backup first, current second, receipt last. A partial source switch is
      // readable and resumable while no receipt has activated downgrade guards.
      for (const source of [...initial.sources].reverse()) {
        if (source.bytes === null) continue;
        let next = source.document;
        if (next[PROXY_CREDENTIAL_VERSION_FIELD] !== 1) {
          const keys = new Map(source.data.profiles.map(profile => [profile.id, profile.apiKey]));
          next = { ...next, [PROXY_CREDENTIAL_VERSION_FIELD]: 1,
            profiles: next.profiles.map(({ apiKey, ...profile }) => {
              const id = profile.id.trim();
              if (id === 'max') return profile;
              const credentialOwner = credentials.ownerFor(id);
              const apiKeyRef = stageSecretReference(credentials.store, 'profile-apiKey', credentialOwner, keys.get(id));
              staged.push([credentialOwner, apiKeyRef]);
              return { ...profile, apiKeyRef };
            }),
          };
        }
        // Check both sources before every switch, including absence of .bak.
        for (const expected of initial.sources) {
          const current = readCredentialSource(owner, expected.name);
          if (current === null ? expected.bytes !== null : expected.bytes === null || !current.equals(expected.bytes)) {
            throw new Error('Source changed');
          }
        }
        const content = `${JSON.stringify(next, null, 2)}\n`;
        if (Buffer.byteLength(content) > 8 * 1024 * 1024) throw new Error('Migrated source exceeds the source reader limit');
        atomicWriteFile(join(owner, source.name), content, { mode: 0o600 });
        fsyncDirectorySync(owner);
        // Advance only the concurrency baseline; preserve original decoded
        // semantics for the verification below.
        source.bytes = Buffer.from(content);
      }
      const verified = read();
      if (verified.status !== 'pending-receipt'
          || JSON.stringify(verified.sources.map(source => source.data)) !== JSON.stringify(initial.sources.map(source => source.data))) {
        throw new Error('Migration verification failed');
      }
      markConfigurationMigrated(credentials.store, 'proxy', name);
      const completed = read();
      if (completed.status !== 'migrated') throw new Error('Migration receipt verification failed');
      return { ...summary(completed), backupPath };
    } catch {
      // Remove only provably inactive staged refs after both sources decode.
      // A committed ref survives even if its directory fsync failed; if either
      // source is unreadable, retain all staged ciphertext for recovery.
      try {
        const current = read();
        const activeRefs = new Set(current.sources.flatMap(source => source.document?.profiles
          .map(profile => profile.apiKeyRef).filter(Boolean) || []));
        for (const [credentialOwner, ref] of staged) {
          if (!activeRefs.has(ref)) removeSecretReference(credentials.store, 'profile-apiKey', credentialOwner, ref);
        }
      } catch {}
      throw Object.assign(new Error('Credential migration did not finish; keep processes stopped and retry or recover from its matching backup'), {
        code: 'CREDENTIAL_MIGRATION_INCOMPLETE', status: 409, backupPath,
      });
    }
  });
}
