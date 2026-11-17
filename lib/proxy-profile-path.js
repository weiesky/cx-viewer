import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

// Shared by the interceptor and file policy without importing the interceptor.
export const PROFILE_PATH = resolve(process.env.CXV_PROXY_PROFILE_PATH || join(homedir(), '.codex', 'cx-viewer', 'profile.json'));
