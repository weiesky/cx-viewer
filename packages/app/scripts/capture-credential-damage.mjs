#!/usr/bin/env node
import { resolve } from 'node:path';

try {
  let root;
  let apply = false;
  let stopped = false;
  const sources = [];
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--root' || arg === '--source') {
      const value = args[++index];
      if (!value || value.startsWith('--') || value.trim() !== value) throw new Error('An explicit argument value is required');
      if (arg === '--root') root = value;
      else sources.push(value);
    } else if (arg === '--apply') apply = true;
    else if (arg === '--confirm-stopped') stopped = true;
    else if (arg === '--help' || arg === '-h') {
      process.stdout.write('Usage: node scripts/capture-credential-damage.mjs --root <owner> --source <relative-file> [--source <file> ...] [--apply --confirm-stopped]\nDefault: read-only file-presence/size preview. Apply saves private damage evidence, never a normal recovery snapshot; live files are not changed.\n');
      process.exit(0);
    } else throw new Error('Unknown argument');
  }
  if (!root || !sources.length || sources.length > 32 || new Set(sources).size !== sources.length) throw new Error('An explicit root and 1-32 unique source names are required');
  if (apply !== stopped) throw new Error('--apply and --confirm-stopped must be provided together');
  const owner = resolve(root);
  process.env.CXV_LOG_DIR = owner;
  const { createCredentialDamageEvidence, readCredentialStoreFiles, readCredentialSource } = await import('../lib/credential-backup.js');
  const files = new Map(sources.map(name => [name, readCredentialSource(owner, name)]));
  for (const [name, bytes] of readCredentialStoreFiles(owner)) files.set(name, bytes);
  if (apply) {
    const evidencePath = createCredentialDamageEvidence(owner, sources);
    process.stdout.write(`${JSON.stringify({ mode: 'apply', status: 'evidence-saved', evidencePath })}\n`);
  } else {
    process.stdout.write(`${JSON.stringify({ mode: 'inspect', status: 'evidence-preview',
      files: [...files].map(([path, bytes]) => ({ path, present: bytes !== null, bytes: bytes?.length ?? null })) })}\n`);
  }
} catch (error) {
  process.stderr.write(`${JSON.stringify({ error: error.message, code: error.code })}\n`);
  process.exitCode = 1;
}
