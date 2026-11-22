import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync, watchFile, unwatchFile } from 'node:fs';
import { join, resolve } from 'node:path';
import { atomicWriteFile } from './logger-install.js';
import { withFileLockSync } from './log-v2/storage.js';
import { ensureProjectIdForCwd, resolveProjectIdForCwd } from './log-v2/project-id.js';
import { projectArchiveDirectoryName } from './log-v2/identity.js';

const ID = /^[A-Za-z0-9._-]{1,128}$/;
const knownFiles = new Set();
const revision = raw => raw === null ? '0' : createHash('sha256').update(raw).digest('hex');
const invalid = () => Object.assign(new Error('Workspace proxy assignment is invalid or unsafe'), { status: 409 });
function location(logDir, cwd, write = false) {
  let canonical = resolve(cwd);
  try { canonical = realpathSync(canonical); } catch {}
  const id = (write ? ensureProjectIdForCwd : resolveProjectIdForCwd)(logDir, canonical);
  return join(logDir, projectArchiveDirectoryName(id), 'active-profile.json');
}
function read(file) {
  let raw;
  try {
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 16384) throw invalid();
    raw = readFileSync(file);
    if (raw.byteLength > 16384) throw invalid();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if (knownFiles.has(file)) throw invalid();
    return { revision: '0', roles: { subagent: 'follow' } };
  }
  let data;
  try { data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)); } catch { throw invalid(); }
  if (!data || Array.isArray(data) || typeof data !== 'object' || (data.version !== undefined && data.version !== 1)
      || (data.activeId !== undefined && (typeof data.activeId !== 'string' || !ID.test(data.activeId)))
      || (data.roles !== undefined && (!data.roles || typeof data.roles !== 'object' || Array.isArray(data.roles)))
      || (data.roles?.subagent !== undefined && (typeof data.roles.subagent !== 'string' || !ID.test(data.roles.subagent)))) throw invalid();
  knownFiles.add(file);
  return { ...(data.activeId ? { activeId: data.activeId } : {}), roles: { subagent: data.roles?.subagent || 'follow' }, revision: revision(raw) };
}
export function readWorkspaceProxy(logDir, cwd) { return read(location(logDir, cwd)); }
export function workspaceProxyFile(logDir, cwd) { return location(logDir, cwd); }
export function watchWorkspaceProxy(file, listener) {
  watchFile(file, { interval: 1500, persistent: false }, listener);
  return () => unwatchFile(file, listener);
}

// The catalogue's own credential/CAS lock is always acquired before this lock.
// A caller may keep it across catalogue persistence via commit(state).
export function withWorkspaceProxyUpdate({ logDir, cwd, expectedRevision, activeId, roles, profiles }, commit) {
  const file = location(logDir, cwd, true);
  return withFileLockSync(`${file}.lock`, () => {
    const state = read(file);
    if (typeof expectedRevision !== 'string' || state.revision !== expectedRevision) {
      throw Object.assign(new Error('Workspace proxy assignment changed in another window or process'), { status: 409 });
    }
    const ids = new Set(profiles.map(p => p.id));
    if (activeId !== undefined && (typeof activeId !== 'string' || !ids.has(activeId))) throw new TypeError('Invalid workspace main proxy');
    if (roles !== undefined && (!roles || typeof roles !== 'object' || Array.isArray(roles)
        || Object.keys(roles).some(key => key !== 'subagent'))) throw new TypeError('Only the native subagent role is supported');
    const next = { version: 1, ...(state.activeId ? { activeId: state.activeId } : {}), roles: { ...state.roles } };
    if (activeId !== undefined) next.activeId = activeId;
    if (roles && Object.hasOwn(roles, 'subagent')) {
      const value = roles.subagent;
      next.roles.subagent = typeof value === 'string' && (value === 'follow' || ids.has(value)) ? value : 'follow';
    }
    // Validate all state before changing either file. The callback owns any
    // catalogue update; its failure leaves this assignment untouched.
    commit?.(next);
    const raw = JSON.stringify(next, null, 2) + '\n';
    atomicWriteFile(file, raw, { mode: 0o600 });
    knownFiles.add(file);
    return { ...next, revision: revision(raw) };
  }, { timeoutMs: 0, staleMs: 60000 });
}

export function resolveWorkspaceProxy(data, workspace, role, { officialDefault = false } = {}) {
  const activeId = workspace.activeId || data.active;
  const main = data.profiles.find(p => p.id === activeId);
  if (!main) throw Object.assign(new Error('Assigned main proxy profile no longer exists'), { status: 409 });
  const profile = main.id === 'max' ? null : main;
  if (role !== 'subagent' || (main.id === 'max' && officialDefault)) return profile;
  const id = workspace.roles.subagent;
  if (!id || id === 'follow') return profile;
  if (id === 'max') return null;
  return data.profiles.find(p => p.id === id) || profile;
}
