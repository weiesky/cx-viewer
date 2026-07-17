import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
export const ULTRA_AGENTS_DIR = resolve(MODULE_DIR, '..', '..', 'ultraAgents');
export const MAX_ULTRA_AGENT_BYTES = 256 * 1024;
export const MAX_ULTRA_AGENTS = 100;

const SAFE_ID = /^[A-Za-z0-9._-]+$/;

export function validateUltraAgentId(id) {
  return typeof id === 'string'
    && id.length > 0
    && id.length <= 200
    && !id.startsWith('.')
    && !id.includes('..')
    && SAFE_ID.test(id);
}

export function isLocalizedText(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).some((item) => typeof item === 'string' && item.trim().length > 0);
}

export function isNonEmptyAgentContent(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function listUltraAgents({
  dir = ULTRA_AGENTS_DIR,
  warn = console.warn,
  requireBuiltins = resolve(dir) === resolve(ULTRA_AGENTS_DIR),
} = {}) {
  if (!existsSync(dir)) {
    if (requireBuiltins) throw new Error('bundled preset directory is missing');
    return [];
  }

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (requireBuiltins) throw new Error('bundled preset directory is unreadable', { cause: error });
    warn(`[ultra-agents] unable to read preset directory: ${error?.message || 'unknown error'}`);
    return [];
  }

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json') && entry.name !== 'manifest.json')
    .map((entry) => entry.name)
    .sort();
  const agents = [];
  const seen = new Set();

  for (const name of files) {
    if (agents.length >= MAX_ULTRA_AGENTS) {
      warn(`[ultra-agents] more than ${MAX_ULTRA_AGENTS} valid presets; remaining files were ignored`);
      break;
    }

    try {
      const path = join(dir, name);
      if (statSync(path).size > MAX_ULTRA_AGENT_BYTES) {
        warn(`[ultra-agents] oversized preset ignored: ${name}`);
        continue;
      }
      const parsed = JSON.parse(readFileSync(path, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        warn(`[ultra-agents] non-object preset ignored: ${name}`);
        continue;
      }
      if (!validateUltraAgentId(parsed.id) || !isLocalizedText(parsed.title) || !isNonEmptyAgentContent(parsed.content)) {
        warn(`[ultra-agents] invalid preset ignored: ${name}`);
        continue;
      }
      if (seen.has(parsed.id)) {
        warn(`[ultra-agents] duplicate preset id ignored: ${parsed.id}`);
        continue;
      }
      seen.add(parsed.id);
      agents.push({
        id: parsed.id,
        title: parsed.title,
        description: isLocalizedText(parsed.description) ? parsed.description : '',
        content: parsed.content,
      });
    } catch (error) {
      warn(`[ultra-agents] unreadable preset ignored: ${name} (${error?.message || 'unknown error'})`);
    }
  }

  if (requireBuiltins) {
    const ids = new Set(agents.map((agent) => agent.id));
    if (!ids.has('code-expert') || !ids.has('research-expert')) {
      throw new Error('required bundled presets are missing or invalid');
    }
  }
  return agents;
}

export function handleUltraAgentsRequest(req, res, { list = listUltraAgents } = {}) {
  try {
    const agents = list();
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify({ ok: true, agents }));
  } catch (error) {
    console.error('[CX Viewer] ultra-agent presets failed:', error?.message || error);
    if (res.headersSent) {
      try { res.end(); } catch { /* socket already closed */ }
      return;
    }
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'internal_error' }));
  }
}
