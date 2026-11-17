/**
 * Codex config.toml management utility
 * Reads/writes openai_base_url in Codex's TOML config files
 * to redirect API traffic through the cxv proxy.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const BACKUP_SUFFIX = '.cxv-backup';

export function getCodexConfigDir(env = process.env) {
  return env.CODEX_HOME || env.CODEX_CONFIG_DIR || join(homedir(), '.codex');
}

export function getCodexConfigPath(env = process.env) {
  return join(getCodexConfigDir(env), 'config.toml');
}

function parseTomlScalar(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    try {
      return value[0] === '"' ? JSON.parse(value) : value.slice(1, -1);
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  return value;
}

function tomlScalar(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return JSON.stringify(String(value));
}

function stripTomlComment(line) {
  let quote = null;
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '#') return line.slice(0, i);
  }
  return line;
}

export function parseCodexConfigToml(content) {
  const values = {};
  const lines = String(content || '').split(/\r?\n/);
  for (const line of lines) {
    if (/^\s*\[/.test(line)) break;
    const match = stripTomlComment(line).match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    values[match[1]] = parseTomlScalar(match[2]);
  }
  return values;
}

export function readCodexGlobalConfig(env = process.env) {
  const configDir = getCodexConfigDir(env);
  const configPath = getCodexConfigPath(env);
  let values = {};
  try {
    if (existsSync(configPath)) values = parseCodexConfigToml(readFileSync(configPath, 'utf-8'));
  } catch { }
  return { ...values, configDir, configPath };
}

function updateTopLevelTomlValues(content, patch) {
  const lines = String(content || '').split(/\r?\n/);
  const firstSection = lines.findIndex(line => /^\s*\[/.test(line));
  const topEnd = firstSection >= 0 ? firstSection : lines.length;
  const pending = new Map(Object.entries(patch));

  for (let i = 0; i < topEnd; i++) {
    const match = lines[i].match(/^(\s*)([A-Za-z0-9_.-]+)(\s*=\s*)(.*)$/);
    if (!match || !pending.has(match[2])) continue;
    lines[i] = `${match[1]}${match[2]}${match[3]}${tomlScalar(pending.get(match[2]))}`;
    pending.delete(match[2]);
  }

  if (pending.size > 0) {
    const additions = Array.from(pending, ([key, value]) => `${key} = ${tomlScalar(value)}`);
    if (firstSection >= 0) {
      const insertAt = firstSection > 0 && lines[firstSection - 1].trim() === '' ? firstSection - 1 : firstSection;
      lines.splice(insertAt, 0, ...additions, '');
    } else {
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
      lines.push(...additions);
    }
  }

  return lines.join('\n').replace(/\n*$/, '\n');
}

export function updateCodexGlobalConfig(incoming = {}, env = process.env) {
  const patch = {};
  if (typeof incoming.model === 'string') patch.model = incoming.model;
  if (typeof incoming.showThinkingSummaries === 'boolean') patch.show_raw_agent_reasoning = incoming.showThinkingSummaries;
  if (typeof incoming.show_raw_agent_reasoning === 'boolean') patch.show_raw_agent_reasoning = incoming.show_raw_agent_reasoning;

  const configDir = getCodexConfigDir(env);
  const configPath = getCodexConfigPath(env);
  if (Object.keys(patch).length > 0) {
    let content = '';
    try { if (existsSync(configPath)) content = readFileSync(configPath, 'utf-8'); } catch { }
    mkdirSync(configDir, { recursive: true });
    writeFileSync(configPath, updateTopLevelTomlValues(content, patch));
  }
  return readCodexGlobalConfig(env);
}

/**
 * Older CX-Viewer versions could leave a loopback proxy URL in Codex's global
 * config.toml. Treat that as stale and fall back to env/default routing instead.
 * Legit local overrides should be configured in config.toml or OPENAI_BASE_URL.
 */
export function isStaleLocalCodexBaseUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^\[|\]$/g, '');
    const isLoopback = host === '127.0.0.1'
      || host === 'localhost'
      || host === '::1'
      || host === '::ffff:127.0.0.1';
    if (!isLoopback) return false;
    return parsed.pathname === '' || parsed.pathname === '/';
  } catch {
    return false;
  }
}

/**
 * Return true when a base URL points at the local loopback interface. Unlike
 * isStaleLocalCodexBaseUrl (which only flags loopback + empty path), this flags
 * ANY loopback host regardless of path — used to make sure a best-effort read of
 * the user's "real" upstream never picks up a cx-viewer-injected proxy URL.
 */
export function isLoopbackBaseUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, '');
    return host === '127.0.0.1'
      || host === 'localhost'
      || host === '::1'
      || host === '::ffff:127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * Best-effort read of the user's genuine openai_base_url from user/system
 * config.toml, IGNORING any loopback value (which would be a cx-viewer proxy
 * redirect, not a real upstream). Returns null when only a loopback / no value
 * is present. Strips a CX-Viewer managed block before parsing so a leftover
 * injected value is never mistaken for the real upstream.
 */
export function readOriginalOpenAiBaseUrl(env = process.env) {
  for (const p of [getCodexConfigPath(env), '/etc/codex/config.toml']) {
    try {
      if (!existsSync(p)) continue;
      const raw = readFileSync(p, 'utf-8');
      const cleaned = raw.replace(/# >>> CX-Viewer [^\n]*>>>[\s\S]*?# <<< CX-Viewer [^\n]*<<<\n?/g, '');
      const m = cleaned.match(/^openai_base_url\s*=\s*"([^"]*)"/m);
      const val = m ? m[1] : null;
      if (val && !isLoopbackBaseUrl(val)) return val;
    } catch {
      // ignore and try next path
    }
  }
  return null;
}

/**
 * Get the original Codex base URL from user-level or system-level config.toml
 * (Skips project-level to avoid reading our own proxy URL)
 */
export function getOriginalCodexBaseUrl(env = process.env) {
  return readOriginalOpenAiBaseUrl(env);
}

/**
 * Set openai_base_url in project-level .codex/config.toml to redirect traffic.
 * Backs up existing config and returns a cleanup function to restore it.
 *
 * @param {string} projectDir - workspace/project directory
 * @param {string} proxyUrl - proxy URL (e.g. "http://127.0.0.1:PORT")
 * @returns {() => void} cleanup function to restore original config
 */
export function setProjectCodexBaseUrl(projectDir, proxyUrl) {
  const configDir = join(projectDir, '.codex');
  const configPath = join(configDir, 'config.toml');
  const backupPath = configPath + BACKUP_SUFFIX;

  try { mkdirSync(configDir, { recursive: true }); } catch (err) { console.warn('[CX Viewer] mkdirSync failed:', configDir, err.message); }

  // Backup existing config
  let hadOriginal = false;
  if (existsSync(configPath)) {
    try {
      copyFileSync(configPath, backupPath);
      hadOriginal = true;
    } catch (err) { console.warn('[CX Viewer] Config backup failed:', err.message); }
  }

  // Read existing content or start fresh
  let content = '';
  try {
    if (existsSync(configPath)) {
      content = readFileSync(configPath, 'utf-8');
    }
  } catch (err) { console.warn('[CX Viewer] Config read failed:', err.message); }

  // Update or append openai_base_url
  const regex = /^openai_base_url\s*=\s*"[^"]*"/m;
  if (regex.test(content)) {
    content = content.replace(regex, `openai_base_url = "${proxyUrl}"`);
  } else {
    // Append after any existing content
    const trimmed = content.trimEnd();
    content = trimmed ? trimmed + `\nopenai_base_url = "${proxyUrl}"\n` : `openai_base_url = "${proxyUrl}"\n`;
  }

  try {
    writeFileSync(configPath, content);
  } catch (err) {
    console.error('[CX Viewer] Failed to write Codex config:', err.message);
  }

  // Return cleanup function
  return function restoreCodexConfig() {
    try {
      if (hadOriginal && existsSync(backupPath)) {
        copyFileSync(backupPath, configPath);
        unlinkSync(backupPath);
      } else if (!hadOriginal) {
        // We created this config — remove our key or the whole file
        if (existsSync(configPath)) {
          const current = readFileSync(configPath, 'utf-8');
          const cleaned = current.replace(/^openai_base_url\s*=\s*"[^"]*"\n?/gm, '').trim();
          if (cleaned) {
            writeFileSync(configPath, cleaned + '\n');
          } else {
            unlinkSync(configPath);
          }
        }
        if (existsSync(backupPath)) unlinkSync(backupPath);
      }
    } catch (err) { console.warn('[CX Viewer] Config restore failed:', err.message); }
  };
}

/**
 * Restore config from backup on startup (in case of previous crash).
 * Call this early in the startup sequence.
 */
export function restoreCrashBackup(projectDir) {
  const configPath = join(projectDir, '.codex', 'config.toml');
  const backupPath = configPath + BACKUP_SUFFIX;
  try {
    if (existsSync(backupPath)) {
      copyFileSync(backupPath, configPath);
      unlinkSync(backupPath);
    }
  } catch (err) { console.warn('[CX Viewer] Crash backup restore failed:', err.message); }
}
