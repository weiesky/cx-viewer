#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cacheDir = process.env.NPM_CONFIG_CACHE || join(tmpdir(), 'cx-viewer-npm-cache');

// Keep package previews independent from a maintainer's global npm cache state.
// This avoids false release-check failures caused by root-owned files in ~/.npm.
const result = spawnSync(
  'npm',
  ['pack', '--dry-run', '--cache', cacheDir],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
);

process.exit(result.status ?? 1);
