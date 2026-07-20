// Workspace Registry - 工作区持久化管理
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync, openSync, closeSync, renameSync, unlinkSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { LOG_DIR } from './findcx.js';
import { listV2LocalLogs } from './lib/log-v2/materializer.js';
import { projectIdForCwd } from './lib/log-v2/project-id.js';

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

  while (true) {
    try {
      const fd = openSync(getLockFile(), 'wx');
      closeSync(fd);
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
    try { unlinkSync(getLockFile()); } catch { }
  }
}

export function loadWorkspaces() {
  try {
    if (!existsSync(getWorkspacesFile())) return [];
    const data = JSON.parse(readFileSync(getWorkspacesFile(), 'utf-8'));
    return Array.isArray(data.workspaces) ? data.workspaces : [];
  } catch {
    return [];
  }
}

export function saveWorkspaces(list) {
  const tmpFile = `${getWorkspacesFile()}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    writeFileSync(tmpFile, JSON.stringify({ workspaces: list }, null, 2));
    
    // Windows 上 renameSync 可能会因为目标文件存在或被占用而失败
    // 简单的重试机制
    let retries = 3;
    while (retries > 0) {
      try {
        renameSync(tmpFile, getWorkspacesFile());
        break;
      } catch (err) {
        if (retries === 1) throw err;
        retries--;
        sleep(20);
      }
    }
  } catch (err) {
    console.error('[CX Viewer] Failed to save workspaces:', err.message);
    // 尝试清理临时文件
    try { unlinkSync(tmpFile); } catch { }
  }
}

export function registerWorkspace(absolutePath) {
  return withLock(() => {
    const resolvedPath = resolve(absolutePath);
    const projectName = basename(resolvedPath).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const list = loadWorkspaces();
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
    const list = loadWorkspaces();
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
        const projectId = projectIdForCwd(w.path, w.projectName);
        logs = listV2LocalLogs(LOG_DIR, projectId)[projectId] || [];
      } catch { }
      return { ...w, logCount: logs.length, totalSize: logs.reduce((sum, log) => sum + (log.size || 0), 0) };
    })
    .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
}
