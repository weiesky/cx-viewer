import { join, resolve } from 'node:path';
import { credentialPathsForDirectory } from './credential-paths.js';
import { readCredentialBackup, readCredentialSource, readCredentialStoreFiles,
  createCredentialDamageEvidence, readCredentialDamageEvidence } from './credential-backup.js';
import { verifyCredentialStoreSnapshot } from './credential-store.js';
import { atomicWriteFile } from './logger-install.js';
import { fsyncDirectorySync, withFileLockSync } from './log-v2/storage.js';

const STORE_FILE = 'private-credentials-v1/credentials.json';
const KEY_FILE = 'private-credentials-v1/master.key';
function failure(evidencePath) {
  return Object.assign(new Error(evidencePath
    ? 'Key repair did not finish; keep shared processes stopped, preserve its damage evidence and inspect or retry'
    : 'Key repair cannot prove that every current credential will be preserved; keep the current files and matching backups'), {
    code: evidencePath ? 'CREDENTIAL_KEY_REPAIR_INCOMPLETE' : 'CREDENTIAL_KEY_REPAIR_UNREADABLE',
    status: 409, evidencePath,
  });
}

function context(options) {
  try {
    if (typeof options.ownerDirectory !== 'string' || !options.ownerDirectory
        || typeof options.backupPath !== 'string' || !options.backupPath || !Array.isArray(options.sources)) throw failure();
    const owner = resolve(options.ownerDirectory);
    const sources = [...options.sources].sort();
    const backup = readCredentialBackup(options.backupPath, { ownerDirectory: owner, sources });
    return { owner, sources, key: backup.get(KEY_FILE), paths: credentialPathsForDirectory(owner),
      read: () => readCredentialStoreFiles(owner) };
  } catch { throw failure(); }
}

function classify(c, files) {
  const bytes = files.get(STORE_FILE);
  if (bytes === null) throw failure(); // Never rebuild a missing live store.
  const currentKey = files.get(KEY_FILE);
  if (currentKey !== null) {
    try { return { status: 'healthy', scope: 'key-only', ...verifyCredentialStoreSnapshot(bytes, currentKey) }; } catch {}
  }
  // Zero records cannot authenticate a candidate key. A normal empty live
  // store with a valid current key was already handled by the healthy branch.
  const proof = verifyCredentialStoreSnapshot(bytes, c.key);
  if (!proof.records) throw failure();
  return { status: 'repairable', scope: 'key-only', ...proof };
}

function same(left, right) {
  return left === null ? right === null : right !== null && left.equals(right);
}

export function inspectCredentialKeyRepair(options) {
  try {
    const c = context(options);
    return classify(c, c.read());
  } catch { throw failure(); }
}

export function repairCredentialKey(options) {
  if (options.confirmStopped !== true) throw Object.assign(new Error('Stop every process sharing this credential store, then confirmStopped'), {
    code: 'CREDENTIAL_KEY_REPAIR_REQUIRES_STOPPED',
  });
  const c = context(options);
  let evidencePath;
  try {
    const initial = c.read();
    const state = classify(c, initial);
    const lock = operation => withFileLockSync(join(c.paths.root, 'credentials.lock'), operation, { timeoutMs: 2000, staleMs: 60_000 });
    if (state.status === 'healthy') {
      return lock(() => {
        const verified = classify(c, c.read());
        if (verified.status !== 'healthy') throw failure();
        // Also completes durability after a previous rename succeeded but its
        // directory fsync failed. No source, ciphertext or key bytes change.
        fsyncDirectorySync(c.paths.root);
        return { ...verified, evidencePath: null };
      });
    }
    evidencePath = createCredentialDamageEvidence(c.owner, c.sources);
    const evidence = readCredentialDamageEvidence(evidencePath, { ownerDirectory: c.owner, sources: c.sources });
    return lock(() => {
      const current = c.read();
      const verified = classify(c, current);
      if (verified.status === 'healthy') {
        // A concurrent explicit repair may already have completed. Verify the
        // latest complete store and leave it intact instead of overwriting it.
        fsyncDirectorySync(c.paths.root);
        return { ...verified, evidencePath };
      }
      for (const name of [STORE_FILE, KEY_FILE]) {
        if (!same(initial.get(name), evidence.get(name)) || !same(current.get(name), evidence.get(name))) throw failure();
      }
      for (const name of c.sources) {
        if (!same(readCredentialSource(c.owner, name), evidence.get(name))) throw failure();
      }
      // The candidate has now authenticated every current record under the
      // same store lock used by normal writers. Only the key is replaced.
      atomicWriteFile(c.paths.keyPath, c.key, { mode: 0o600 });
      fsyncDirectorySync(c.paths.root);
      const completed = c.read();
      if (!same(completed.get(STORE_FILE), current.get(STORE_FILE))
          || !same(completed.get(KEY_FILE), c.key) || classify(c, completed).status !== 'healthy') throw failure();
      return { status: 'repaired', scope: 'key-only', records: verified.records, evidencePath };
    });
  } catch {
    // A key rename may already be committed; never restore a missing/bad key
    // over the newly verified one after a directory fsync failure.
    throw failure(evidencePath);
  }
}
