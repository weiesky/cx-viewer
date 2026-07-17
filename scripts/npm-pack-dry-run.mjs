#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cacheDir = process.env.NPM_CONFIG_CACHE || join(tmpdir(), 'cx-viewer-npm-cache');

// Keep package previews independent from a maintainer's global npm cache state.
// This avoids false release-check failures caused by root-owned files in ~/.npm.
const result = spawnSync(
  'npm',
  ['pack', '--dry-run', '--json', '--cache', cacheDir],
  {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  },
);

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || 'npm pack --dry-run failed\n');
  process.exit(result.status ?? 1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch (error) {
  process.stderr.write(`Unable to parse npm pack report: ${error.message}\n${result.stdout}\n`);
  process.exit(1);
}

const files = new Set((report?.[0]?.files || []).map((entry) => entry.path));
const required = [
  'ultraAgents/README.md',
  'ultraAgents/manifest.json',
  'ultraAgents/code-expert.json',
  'ultraAgents/research-expert.json',
  'concepts/en/UltraPlan.md',
  'concepts/en/CustomUltraplanExpert.md',
  'concepts/zh/UltraPlan.md',
  'concepts/zh/CustomUltraplanExpert.md',
];
const missing = required.filter((path) => !files.has(path));
if (missing.length) {
  process.stderr.write(`npm package is missing required UltraPlan assets:\n${missing.map((path) => `- ${path}`).join('\n')}\n`);
  process.exit(1);
}

if (result.stderr) process.stderr.write(result.stderr);
process.stdout.write(`npm package preview verified (${files.size} files; UltraPlan presets and docs included).\n`);
