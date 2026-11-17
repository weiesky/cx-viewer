import { basename, dirname, resolve } from 'node:path';
import { lstatSync, readFileSync } from 'node:fs';
import { credentialPathsForDirectory } from './credential-paths.js';
import { createCredentialStore } from './credential-store.js';
import { readReferencedSecret, stageSecretReference, removeSecretReference } from './credential-reference.js';
import { validateProxyProfilesDocument } from './proxy-profile.js';
import { assertConfigurationFormat } from './credential-migration-state.js';

export const PROXY_CREDENTIAL_VERSION_FIELD = '_cxvProfileCredentialVersion';

function unreadable() {
  return Object.assign(new Error('Proxy profile credentials are unreadable; restore the matching configuration and store'), {
    code: 'CREDENTIALS_UNREADABLE', status: 409,
  });
}

export function createProxyProfileCredentials(profilePath) {
  const path = resolve(profilePath);
  const store = createCredentialStore(credentialPathsForDirectory(dirname(path)).root);
  const ownerFor = id => JSON.stringify([basename(path), id]);
  function decode(document, options = {}) {
    const version = document?.[PROXY_CREDENTIAL_VERSION_FIELD];
    assertConfigurationFormat(store, 'proxy', basename(path), version);
    if (version !== undefined && version !== 1) throw unreadable();
    return validateProxyProfilesDocument(document, { ...options,
      resolveApiKey(profile, id) {
        if (version !== 1) {
          if (Object.hasOwn(profile, 'apiKeyRef')) throw unreadable();
          return profile.apiKey;
        }
        if (Object.hasOwn(profile, 'apiKey')) throw unreadable();
        if (id === 'max') {
          if (Object.hasOwn(profile, 'apiKeyRef')) throw unreadable();
          return undefined;
        }
        return readReferencedSecret(store, 'profile-apiKey', ownerFor(id), profile.apiKeyRef);
      },
    });
  }
  const references = document => document?.[PROXY_CREDENTIAL_VERSION_FIELD] === 1
    ? document.profiles.filter(profile => profile.id.trim() !== 'max')
      .map(profile => [ownerFor(profile.id.trim()), profile.apiKeyRef]) : [];
  function cleanup(refs) {
    for (const [owner, ref] of refs) {
      try { removeSecretReference(store, 'profile-apiKey', owner, ref); }
      catch { console.warn('[CX Viewer] An inactive encrypted profile key could not be removed; restore its store before retrying cleanup'); }
    }
  }
  function readAt(location) {
    try {
      const raw = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(readFileSync(location));
      const document = JSON.parse(raw);
      return { raw, document, data: decode(document, { migrateLegacy: true }) };
    } catch (error) {
      let missing = false;
      try { missing = error.code === 'ENOENT' && !lstatSync(location, { throwIfNoEntry: false }); } catch {}
      if (missing) {
        if (location === path) assertConfigurationFormat(store, 'proxy', basename(path), undefined);
        throw error;
      }
      // JSON parse messages may include nearby secret bytes. Keep source errors generic.
      throw unreadable();
    }
  }
  return Object.freeze({
    store, ownerFor, decode,
    read: () => readAt(path),
    readBackup: () => readAt(`${path}.bak`),
    // Caller holds the source lock and synchronously writes its backup then
    // source in commit(). Only the source rename makes staged versions active.
    save(document, previous, previousBackup, commit) {
      const oldPlain = decode(previous, { migrateLegacy: true });
      const plain = validateProxyProfilesDocument(document);
      if (previous[PROXY_CREDENTIAL_VERSION_FIELD] !== 1) {
        commit(plain);
        return plain;
      }
      if (previousBackup !== null) decode(previousBackup, { migrateLegacy: true });
      const previousRefs = new Map(references(previous));
      const oldKeys = new Map(oldPlain.profiles.map(profile => [profile.id, profile.apiKey]));
      const staged = [];
      let stored;
      try {
        stored = { ...plain, [PROXY_CREDENTIAL_VERSION_FIELD]: 1,
          profiles: plain.profiles.map(({ apiKey, ...profile }) => {
            if (profile.id === 'max') return profile;
            const owner = ownerFor(profile.id);
            let apiKeyRef = previousRefs.get(owner);
            if (!apiKeyRef || oldKeys.get(profile.id) !== apiKey) {
              apiKeyRef = stageSecretReference(store, 'profile-apiKey', owner, apiKey);
              staged.push([owner, apiKeyRef]);
            }
            return { ...profile, apiKeyRef };
          }),
        };
        commit(stored);
      } catch (error) { cleanup(staged); throw error; }
      // The old source is now the latest backup. Retire only versions from
      // the overwritten backup that neither current document still uses.
      const retained = new Set([...references(stored), ...references(previous)].map(([, ref]) => ref));
      cleanup(references(previousBackup).filter(([, ref]) => !retained.has(ref)));
      return stored;
    },
  });
}
