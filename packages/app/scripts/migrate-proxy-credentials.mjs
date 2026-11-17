#!/usr/bin/env node
import { resolve } from 'node:path';
import { inspectProxyCredentialMigration, migrateProxyCredentials } from '../lib/proxy-credential-migration.js';

try {
  const args = process.argv.slice(2);
  let profile;
  let apply = false;
  let stopped = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--profile') {
      profile = args[++index];
      if (!profile || profile.startsWith('--') || profile.trim() !== profile) throw new Error('--profile requires an explicit file');
    } else if (arg === '--apply') apply = true;
    else if (arg === '--confirm-stopped') stopped = true;
    else if (arg === '--help' || arg === '-h') {
      process.stdout.write('Usage: node scripts/migrate-proxy-credentials.mjs --profile <profile.json> [--apply --confirm-stopped]\nDefault: inspect only. Stop all processes sharing this configuration before applying.\n');
      process.exit(0);
    } else throw new Error('Unknown argument');
  }
  if (!profile) throw new Error('--profile is required; no default configuration is selected');
  if (apply !== stopped) throw new Error('--apply and --confirm-stopped must be provided together');
  const path = resolve(profile);
  const result = apply ? migrateProxyCredentials(path, { confirmStopped: true }) : inspectProxyCredentialMigration(path);
  process.stdout.write(`${JSON.stringify({ mode: apply ? 'apply' : 'inspect', ...result })}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ error: error.message, code: error.code, backupPath: error.backupPath })}\n`);
  process.exitCode = 1;
}
