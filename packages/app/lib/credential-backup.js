// The caller stops shared-config processes and holds every source lock. This
// module takes the store lock too; it never rewrites live configuration or keys.
import { createHash } from 'node:crypto';
import {
  closeSync, constants, fstatSync, fsyncSync, lstatSync, mkdirSync, mkdtempSync,
  openSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { credentialPathsForDirectory } from './credential-paths.js';
import { createCredentialStore } from './credential-store.js';
import { fsyncDirectorySync, withFileLockSync } from './log-v2/storage.js';

const MAX_BYTES = 8 * 1024 * 1024;
const STORE_FILES = ['private-credentials-v1/credentials.json', 'private-credentials-v1/master.key'];
const DAMAGE_EVIDENCE = 'damaged-store-evidence-v1';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function failure() {
  return Object.assign(new Error('Credential backup could not be verified; keep the original configuration and matching store'), {
    code: 'CREDENTIAL_BACKUP_UNREADABLE', status: 409,
  });
}

function directory(path, privateMode = false) {
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()
      || privateMode && process.platform !== 'win32' && (stat.mode & 0o077)) throw failure();
}

function sourceNames(sources) {
  if (!Array.isArray(sources) || !sources.length || sources.length > 32) throw failure();
  const names = sources.map(name => {
    if (typeof name !== 'string' || !name || isAbsolute(name) || name.includes('\\')
        || name.split('/').some(part => !part || part === '.' || part === '..')
        || ['manifest.json', 'private-credentials-v1', 'credential-backups-v1'].includes(name.split('/')[0])) throw failure();
    return name;
  });
  if (new Set(names).size !== names.length) throw failure();
  return names.sort();
}

function readFile(root, name, privateMode = false, allowRemoved = false) {
  directory(root);
  const parts = name.split('/');
  let path = root;
  for (const part of parts.slice(0, -1)) {
    path = join(path, part);
    if (!lstatSync(path, { throwIfNoEntry: false })) return null;
    directory(path, privateMode);
  }
  path = join(root, ...parts);
  const before = lstatSync(path, { throwIfNoEntry: false });
  if (!before) return null;
  if (allowRemoved && before.nlink === 0) return readFile(root, name, privateMode);
  const safe = stat => stat.isFile() && stat.nlink === 1 && stat.size <= MAX_BYTES
    && (!privateMode || process.platform === 'win32' || !(stat.mode & 0o077));
  if (!safe(before) || before.isSymbolicLink()) throw failure();
  let fd;
  try { fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0)); }
  catch (error) {
    if (allowRemoved && error.code === 'ENOENT') return readFile(root, name, privateMode);
    throw error;
  }
  try {
    const stat = fstatSync(fd);
    // Only the coordination lock may be released by its legitimate holder
    // during this preflight. Key, ciphertext and source reads remain strict.
    if (allowRemoved && (stat.nlink === 0 || stat.dev !== before.dev || stat.ino !== before.ino)) {
      return readFile(root, name, privateMode);
    }
    if (!safe(stat) || stat.dev !== before.dev || stat.ino !== before.ino) throw failure();
    const bytes = readFileSync(fd);
    if (bytes.length > MAX_BYTES) throw failure();
    return bytes;
  } finally { closeSync(fd); }
}

function writeFile(root, name, bytes) {
  const path = join(root, ...name.split('/'));
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const fd = openSync(path, 'wx', 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
  for (let dir = dirname(path); ; dir = dirname(dir)) {
    fsyncDirectorySync(dir);
    if (dir === root) break;
  }
}

function readBackup(path, owner, sources, evidence = false) {
  const backupRoot = credentialPathsForDirectory(owner).backupRoot;
  if (dirname(path) !== backupRoot || !relative(backupRoot, path).startsWith('snapshot-')) throw failure();
  directory(backupRoot, true);
  directory(path, true);
  const manifestBytes = readFile(path, 'manifest.json', true);
  if (!manifestBytes || manifestBytes.length > 64 * 1024) throw failure();
  const manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes));
  const names = [...sources, ...STORE_FILES];
  if (manifest?.version !== 1 || manifest.purpose !== (evidence ? DAMAGE_EVIDENCE : undefined) || manifest.owner !== owner
      || JSON.stringify(manifest.sources) !== JSON.stringify(sources)
      || !Array.isArray(manifest.files) || manifest.files.length !== names.length) throw failure();
  const files = new Map();
  for (let index = 0; index < names.length; index++) {
    const name = names[index];
    const entry = manifest.files[index];
    if (entry?.path !== name) throw failure();
    const bytes = readFile(path, name, true);
    if (entry.sha256 !== (bytes === null ? null : digest(bytes))) throw failure();
    files.set(name, bytes);
  }
  if (!evidence) {
    const key = files.get(STORE_FILES[1]);
    if (key !== null && key.length !== 32 || files.get(STORE_FILES[0]) !== null && key === null) throw failure();
    // A normal recovery snapshot authenticates every saved encrypted record.
    createCredentialStore(join(path, 'private-credentials-v1')).get('configuration-state', 'backup-validation');
  }
  return files;
}

export function readCredentialBackup(backupPath, { ownerDirectory, sources }) {
  try { return readBackup(resolve(backupPath), resolve(ownerDirectory), sourceNames(sources)); }
  catch { throw failure(); }
}

// Explicit forensic evidence only. This verifies exact bytes/absence, privacy,
// owner and hashes; it makes no claim that damaged ciphertext can be decrypted.
export function readCredentialDamageEvidence(backupPath, { ownerDirectory, sources }) {
  try { return readBackup(resolve(backupPath), resolve(ownerDirectory), sourceNames(sources), true); }
  catch { throw failure(); }
}

export function readCredentialStoreFiles(ownerDirectory) {
  try {
    const owner = resolve(ownerDirectory);
    const files = new Map(STORE_FILES.map(name => [name, readFile(owner, name, true)]));
    const root = credentialPathsForDirectory(owner).root;
    if (lstatSync(root, { throwIfNoEntry: false })) readFile(root, 'credentials.lock', true, true);
    return files;
  } catch { throw failure(); }
}

export function readCredentialSource(ownerDirectory, name) {
  try { return readFile(resolve(ownerDirectory), sourceNames([name])[0]); }
  catch { throw failure(); }
}

function createBackup(ownerDirectory, sources, evidence) {
  let path;
  try {
    const owner = resolve(ownerDirectory);
    directory(owner);
    const names = sourceNames(sources);
    const paths = credentialPathsForDirectory(owner);
    const capture = () => {
      const files = new Map([...names, ...STORE_FILES].map(name => [name, readFile(owner, name, STORE_FILES.includes(name))]));
      if (!lstatSync(paths.backupRoot, { throwIfNoEntry: false })) mkdirSync(paths.backupRoot, { mode: 0o700 });
      directory(paths.backupRoot, true);
      fsyncDirectorySync(owner);
      path = mkdtempSync(join(paths.backupRoot, 'snapshot-'));
      for (const [name, bytes] of files) if (bytes !== null) writeFile(path, name, bytes);
      writeFile(path, 'manifest.json', Buffer.from(JSON.stringify({ version: 1,
        ...(evidence ? { purpose: DAMAGE_EVIDENCE } : {}), owner, sources: names,
        files: [...files].map(([name, bytes]) => ({ path: name, sha256: bytes === null ? null : digest(bytes) })),
      })));
      const saved = readBackup(path, owner, names, evidence);
      for (const [name, bytes] of files) {
        const current = readFile(owner, name, STORE_FILES.includes(name));
        if (bytes === null ? current !== null || saved.get(name) !== null
          : !bytes.equals(saved.get(name)) || current === null || !bytes.equals(current)) throw failure();
      }
      fsyncDirectorySync(path);
      fsyncDirectorySync(paths.backupRoot);
      return path;
    };
    if (!lstatSync(paths.root, { throwIfNoEntry: false })) return capture();
    directory(paths.root, true);
    readFile(paths.root, 'credentials.lock', true, true); // Reject unsafe existing lock paths; allow a normal release.
    return withFileLockSync(join(paths.root, 'credentials.lock'), capture, { timeoutMs: 2000, staleMs: 60_000 });
  } catch {
    if (path) try { rmSync(path, { recursive: true, force: true }); } catch {}
    throw failure();
  }
}

export function createCredentialBackup(ownerDirectory, sources) {
  return createBackup(ownerDirectory, sources, false);
}

export function createCredentialDamageEvidence(ownerDirectory, sources) {
  return createBackup(ownerDirectory, sources, true);
}
