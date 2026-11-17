import { dirname, join, resolve } from 'node:path';
import { LOG_DIR } from '../findcx.js';
import { PROFILE_PATH } from './proxy-profile-path.js';

export function credentialPathsForDirectory(directory) {
  const owner = resolve(directory);
  const root = join(owner, 'private-credentials-v1');
  return Object.freeze({
    root, file: join(root, 'credentials.json'), keyPath: join(root, 'master.key'),
    backupRoot: join(owner, 'credential-backups-v1'),
  });
}

// Freeze both owners at startup. Changing a log directory requires a restart
// before credentials can follow it; a shared profile keeps its own owner.
export const CREDENTIAL_PATHS = credentialPathsForDirectory(LOG_DIR);
export const PROFILE_CREDENTIAL_PATHS = credentialPathsForDirectory(dirname(PROFILE_PATH));
export const PRIVATE_CREDENTIAL_ROOTS = Object.freeze([...new Set([
  CREDENTIAL_PATHS.root, CREDENTIAL_PATHS.backupRoot,
  PROFILE_CREDENTIAL_PATHS.root, PROFILE_CREDENTIAL_PATHS.backupRoot,
])]);
