#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { resolveLogV2Config } from './config.js';
import { atomicWriteJsonSync } from './storage.js';

export const LOG_V2_RUNTIME_CONFIG_KIND = 'cx-viewer.log-v2-runtime-config';
export const LOG_V2_RUNTIME_CONFIG_VERSION = 1;
export const LOG_V2_RUNTIME_CONFIG_FILE = 'runtime-config.json';

export function logV2RuntimeConfigPath(logDir) {
  if (typeof logDir !== 'string' || !logDir) throw new TypeError('logDir is required');
  return join(resolve(logDir), 'v2', LOG_V2_RUNTIME_CONFIG_FILE);
}

export function loadLogV2RuntimeConfig(logDir) {
  const value = loadLogV2RuntimeConfigDocument(logDir);
  if (!value) return Object.freeze({});
  const { kind, version, updatedAt, ...defaults } = value;
  return Object.freeze(defaults);
}

export function loadLogV2RuntimeConfigDocument(logDir) {
  const file = logV2RuntimeConfigPath(logDir);
  if (!existsSync(file)) return null;
  const value = JSON.parse(readFileSync(file, 'utf8'));
  if (value?.kind !== LOG_V2_RUNTIME_CONFIG_KIND || value?.version !== LOG_V2_RUNTIME_CONFIG_VERSION) {
    throw new Error('invalid Log Store V2 runtime config kind or version');
  }
  const allowed = new Set([
    'kind', 'version', 'updatedAt', 'minFreeBytes', 'minFreePercent', 'failureLimit',
    'writeMode', 'readMode', 'gateFile', 'projectV1',
  ]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`unknown Log Store V2 runtime config field: ${key}`);
  }
  const defaults = Object.fromEntries(Object.entries(value).filter(([key]) =>
    ['minFreeBytes', 'minFreePercent', 'failureLimit'].includes(key)));
  if (typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt))) {
    throw new Error('invalid Log Store V2 runtime config updatedAt');
  }
  // Reuse the authoritative parser so file and environment validation cannot drift.
  resolveLogV2Config({}, defaults);
  return Object.freeze({ kind: value.kind, version: value.version, updatedAt: value.updatedAt, ...defaults });
}

export function writeLogV2RuntimeConfig(logDir, values) {
  const normalized = resolveLogV2Config({}, values);
  const config = Object.freeze({
    kind: LOG_V2_RUNTIME_CONFIG_KIND,
    version: LOG_V2_RUNTIME_CONFIG_VERSION,
    updatedAt: new Date().toISOString(),
    ...normalized,
  });
  const file = logV2RuntimeConfigPath(logDir);
  atomicWriteJsonSync(file, config, { durable: true });
  return Object.freeze({ file, config });
}

function parseCli(argv) {
  const positional = [];
  const values = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) positional.push(arg);
    else {
      const [key, value] = arg.slice(2).split('=', 2);
      if (!value) throw new TypeError(`expected --${key}=VALUE`);
      if (key === 'min-free-bytes') values.minFreeBytes = value;
      else if (key === 'min-free-percent') values.minFreePercent = value;
      else if (key === 'failure-limit') values.failureLimit = value;
      else throw new TypeError(`unknown option --${key}`);
    }
  }
  if (positional.length !== 1) {
    throw new TypeError('Usage: node lib/log-v2/runtime-config.js <log-dir> [--min-free-bytes=N] [--min-free-percent=N] [--failure-limit=N]');
  }
  return { logDir: positional[0], values };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { logDir, values } = parseCli(process.argv.slice(2));
    console.log(JSON.stringify(writeLogV2RuntimeConfig(logDir, values), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
