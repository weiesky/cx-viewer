// Frozen paths are shared with the future runtime adapter. This module does
// not create the store or activate credential migration.
import { lstatSync, readdirSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { canonicalPath } from './canonical-path.js';
import { PRIVATE_CREDENTIAL_ROOTS } from './credential-paths.js';
import { getPreferencesPath, getDingTalkImConfigPath } from './config-paths.js';
import { PROFILE_PATH } from './proxy-profile-path.js';
export { CREDENTIAL_PATHS, PROFILE_CREDENTIAL_PATHS } from './credential-paths.js';

function inside(path, root) {
  const rel = relative(root, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function denied(cause) {
  return Object.assign(new Error('Private credential files are not available through file tools', { cause }), {
    code: 'ACCESS_DENIED', status: 403,
  });
}

/** Paths plus device/inode checks prevent hard-link aliases of private files. */
export function createCredentialFilePolicy(privateRoots) {
  const getRoots = () => [...new Set((typeof privateRoots === 'function' ? privateRoots() : privateRoots).map(path => resolve(path)))];

  function matchesPrivateInode(stat, roots) {
    const pending = roots.map(canonicalPath);
    let visited = 0;
    while (pending.length) {
      if (++visited > 4096) throw new Error('Private file inspection limit exceeded');
      const path = pending.pop();
      const current = lstatSync(path, { throwIfNoEntry: false });
      if (!current) continue;
      if (current.isSymbolicLink()) throw new Error('Unsafe private directory entry');
      if (stat.dev === current.dev && stat.ino === current.ino) return true;
      if (current.isDirectory() && !current.isSymbolicLink()) {
        for (const name of readdirSync(path)) pending.push(join(path, name));
      }
    }
    return false;
  }

  function assertPath(path, descriptorStat = null) {
    try {
      const lexical = resolve(path);
      const canonical = canonicalPath(lexical);
      const roots = getRoots();
      for (const root of roots) {
        if (inside(lexical, root) || inside(canonical, canonicalPath(root))) throw denied();
      }
      let stat = descriptorStat;
      if (!stat) {
        try { stat = statSync(canonical); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      if (stat?.isFile() && (descriptorStat || stat.nlink > 1) && matchesPrivateInode(stat, roots)) throw denied();
      return canonical;
    } catch (cause) {
      if (cause.code === 'ACCESS_DENIED') throw cause;
      throw denied(cause);
    }
  }

  return Object.freeze({
    assertPath,
    assertMutationPath(path) {
      const canonical = assertPath(path);
      // Moving/removing an ancestor would also move/remove its private roots.
      for (const root of getRoots()) {
        if (inside(root, resolve(path)) || inside(canonicalPath(root), canonical)) throw denied();
      }
      return canonical;
    },
    searchExclusions(searchRoot) {
      const base = canonicalPath(searchRoot);
      return getRoots().map(canonicalPath).filter(path => inside(path, base))
        .map(path => relative(base, path).split(sep).join('/') || '**');
    },
    allows(path, descriptorStat = null) {
      try { assertPath(path, descriptorStat); return true; } catch { return false; }
    },
  });
}

const initialConfigPaths = [getPreferencesPath(), getDingTalkImConfigPath(), PROFILE_PATH, `${PROFILE_PATH}.bak`];
const policy = createCredentialFilePolicy(() => [
  ...PRIVATE_CREDENTIAL_ROOTS, ...initialConfigPaths,
  getPreferencesPath(), getDingTalkImConfigPath(),
]);
export const assertPublicFilePath = policy.assertPath;
export const assertPublicMutationPath = policy.assertMutationPath;
export const isPublicFilePath = policy.allows;
export const credentialSearchExclusions = policy.searchExclusions;
