#!/usr/bin/env node
import { resolve } from 'node:path';

try {
  const values = {};
  const sources = [];
  let apply = false;
  let stopped = false;
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (['--root', '--backup', '--source'].includes(arg)) {
      const value = args[++index];
      if (!value || value.startsWith('--') || value.trim() !== value) throw new Error('An explicit argument value is required');
      if (arg === '--source') sources.push(value);
      else values[arg] = value;
    } else if (arg === '--apply') apply = true;
    else if (arg === '--confirm-stopped') stopped = true;
    else if (arg === '--help' || arg === '-h') {
      process.stdout.write('Usage: node scripts/repair-credential-key.mjs --root <owner> --backup <snapshot> --source <relative-file> [--source <file> ...] [--apply --confirm-stopped]\nDefault: read-only proof. Sources must match the backup manifest. Only a key that authenticates EVERY current record can be applied; source files and ciphertext are preserved.\n');
      process.exit(0);
    } else throw new Error('Unknown argument');
  }
  if (!values['--root'] || !values['--backup'] || !sources.length) throw new Error('--root, --backup and --source are required');
  if (apply !== stopped) throw new Error('--apply and --confirm-stopped must be provided together');
  process.env.CXV_LOG_DIR = resolve(values['--root']);
  const { inspectCredentialKeyRepair, repairCredentialKey } = await import('../lib/credential-key-repair.js');
  const options = { ownerDirectory: process.env.CXV_LOG_DIR, backupPath: resolve(values['--backup']), sources, confirmStopped: stopped };
  const result = apply ? repairCredentialKey(options) : inspectCredentialKeyRepair(options);
  process.stdout.write(`${JSON.stringify({ mode: apply ? 'apply' : 'inspect', ...result })}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ error: error.message, code: error.code, evidencePath: error.evidencePath })}\n`);
  process.exitCode = 1;
}
