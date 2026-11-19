// Workspace Registry - 工作区持久化管理
import { readFileSync, writeFileSync, mkdirSync, statSync, fstatSync, lstatSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { LOG_DIR } from './findcx.js';
import { listV2LocalLogs } from './lib/log-v2/materializer.js';
import { resolveProjectIdForCwd } from './lib/log-v2/project-id.js';
import { renameSyncWithRetry } from './lib/file-api.js';

// 动态获取（LOG_DIR 可能在运行时被 setLogDir 修改）
function getWorkspacesFile() { return join(LOG_DIR, 'workspaces.json'); }
function getLockFile() { return join(LOG_DIR, 'workspaces.lock'); }

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function withLock(fn) {
  mkdirSync(LOG_DIR, { recursive: true });
  const deadline = Date.now() + 2000;
  // 如果锁文件超过 5 秒未更新，认为它是死锁（前一个进程崩溃）
  const STALE_THRESHOLD = 5000;
  let fd;

  while (true) {
    try {
      fd = openSync(getLockFile(), 'wx');
      break;
    } catch (err) {
      if (err?.code === 'EEXIST') {
        if (Date.now() < deadline) {
          // 检查是否为陈旧锁
          try {
            const stats = statSync(getLockFile());
            if (Date.now() - stats.mtimeMs > STALE_THRESHOLD) {
              // 尝试强制移除锁
              try { unlinkSync(getLockFile()); } catch { }
              // 立即重试获取
              continue;
            }
          } catch {
            // stat 失败可能意味着锁刚被释放，继续循环尝试获取
          }
          sleep(25);
          continue;
        }
      }
      throw err;
    }
  }

  try {
    return fn();
  } finally {
    let ownsLock = false;
    try {
      const held = fstatSync(fd);
      const current = statSync(getLockFile());
      ownsLock = held.dev === current.dev && held.ino === current.ino;
    } catch {}
    try { closeSync(fd); } catch {}
    if (ownsLock) try { unlinkSync(getLockFile()); } catch {}
  }
}

export function loadWorkspaces({ strict = false } = {}) {
  try {
    const bytes = readFileSync(getWorkspacesFile());
    const data = JSON.parse(strict ? new TextDecoder('utf-8', { fatal: true }).decode(bytes) : bytes.toString('utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.workspaces)) {
      throw new TypeError('Invalid workspace registry');
    }
    return data.workspaces;
  } catch (cause) {
    if (!strict) return [];
    if (cause.code === 'ENOENT') {
      try { if (!lstatSync(getWorkspacesFile(), { throwIfNoEntry: false })) return []; } catch {}
    }
    throw Object.assign(new Error('Workspace registry is unreadable; restore workspaces.json before saving', { cause }), {
      code: 'WORKSPACES_UNREADABLE',
    });
  }
}

export function saveWorkspaces(list) {
  const tmpFile = `${getWorkspacesFile()}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    writeFileSync(tmpFile, JSON.stringify({ workspaces: list }, null, 2), { mode: 0o600 });
    renameSyncWithRetry(tmpFile, getWorkspacesFile());
  } catch (err) {
    // 尝试清理临时文件
    try { unlinkSync(tmpFile); } catch { }
    throw err;
  }
}

export function registerWorkspace(absolutePath) {
  return withLock(() => {
    const resolvedPath = resolve(absolutePath);
    const projectName = basename(resolvedPath).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const list = loadWorkspaces({ strict: true });
    const existing = list.find(w => w.path === resolvedPath);
    if (existing) {
      existing.lastUsed = new Date().toISOString();
      existing.projectName = projectName;
      saveWorkspaces(list);
      return existing;
    }
    const now = new Date().toISOString();
    const entry = {
      id: randomBytes(6).toString('hex'),
      path: resolvedPath,
      projectName,
      lastUsed: now,
      createdAt: now,
    };
    list.push(entry);
    saveWorkspaces(list);
    return entry;
  });
}

export function removeWorkspace(id) {
  return withLock(() => {
    const list = loadWorkspaces({ strict: true });
    const filtered = list.filter(w => w.id !== id);
    if (filtered.length !== list.length) {
      saveWorkspaces(filtered);
      return true;
    }
    return false;
  });
}

export function getWorkspaces() {
  const list = loadWorkspaces();
  return list
    .map(w => {
      let logs = [];
      try {
        const projectId = resolveProjectIdForCwd(LOG_DIR, w.path, w.projectName);
        logs = listV2LocalLogs(LOG_DIR, projectId)[projectId] || [];
      } catch { }
      return { ...w, logCount: logs.length, totalSize: logs.reduce((sum, log) => sum + (log.size || 0), 0) };
    })
    .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
}
