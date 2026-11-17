#!/usr/bin/env node
import { resolve } from 'node:path';

try {
  const args = process.argv.slice(2);
  let root;
  let apply = false;
  let stopped = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--root') {
      root = args[++index];
      if (!root || root.startsWith('--') || root.trim() !== root) throw new Error('--root requires an explicit directory');
    } else if (arg === '--apply') apply = true;
    else if (arg === '--confirm-stopped') stopped = true;
    else if (arg === '--help' || arg === '-h') {
      process.stdout.write('Usage: node scripts/migrate-auth-credentials.mjs --root <LOG_DIR> [--apply --confirm-stopped]\nDefault: inspect only. Stop all processes sharing this configuration before applying.\n');
      process.exit(0);
    } else throw new Error('Unknown argument');
  }
  if (!root) throw new Error('--root is required; no default configuration is selected');
  if (apply !== stopped) throw new Error('--apply and --confirm-stopped must be provided together');
  process.env.CXV_LOG_DIR = resolve(root);
  const { inspectAuthCredentialMigration, migrateAuthCredentials } = await import('../lib/auth.js');
  const result = apply ? migrateAuthCredentials({ confirmStopped: true }) : inspectAuthCredentialMigration();
  process.stdout.write(`${JSON.stringify({ mode: apply ? 'apply' : 'inspect', ...result })}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ error: error.message, code: error.code, backupPath: error.backupPath })}\n`);
  process.exitCode = 1;
}
