/**
 * Codex config.toml management utility
 * Reads/writes openai_base_url in Codex's TOML config files
 * to redirect API traffic through the cxv proxy.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const BACKUP_SUFFIX = '.cxv-backup';

/**
 * Older CX-Viewer versions could leave a loopback proxy URL in Codex's global
 * config.toml. Treat that as stale and fall back to settings.json / env instead.
 * Legit local overrides should be configured in settings.json or OPENAI_BASE_URL.
 */
export function isStaleLocalCodexBaseUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
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
 * Read a simple key = "value" from a TOML file
 */
function readTomlValue(filePath, key) {
  try {
    if (!existsSync(filePath)) return null;
    const content = readFileSync(filePath, 'utf-8');
    const match = content.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm'));
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Get the original Codex base URL from user-level or system-level config.toml
 * (Skips project-level to avoid reading our own proxy URL)
 */
export function getOriginalCodexBaseUrl() {
  // User config
  const userUrl = readTomlValue(join(homedir(), '.codex', 'config.toml'), 'openai_base_url');
  if (userUrl && !isStaleLocalCodexBaseUrl(userUrl)) return userUrl;

  // System config
  const systemUrl = readTomlValue('/etc/codex/config.toml', 'openai_base_url');
  return isStaleLocalCodexBaseUrl(systemUrl) ? null : systemUrl;
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
