import { readFileSync, existsSync, watchFile, unwatchFile, openSync, readSync, closeSync, statSync } from 'node:fs';
import { isMainAgentEntry } from './main-agent-entry.js';
import { buildContextWindowEvent } from './context-watcher.js';
import { reconstructEntries, createIncrementalReconstructor } from '../server/lib/delta-reconstructor.js';
import { countLogEntries, streamReconstructedEntries } from './log-stream.js';
import { createRepeatEntryExpander } from './repeat-entry.js';
import { setLatestMapValue } from './log-entry-order.js';

// 跟踪所有被 watch 的日志文件
const watchedFiles = new Map();

/**
 * Read and parse a JSONL log file.
 * @param {string} logFile - absolute path to the log file
 * @returns {Array} parsed and deduplicated entries
 */
export function readLogFile(logFile) {
  if (!existsSync(logFile)) {
    return [];
  }

  try {
    const content = readFileSync(logFile, 'utf-8');
    const entries = content.split('\n---\n').filter(line => line.trim());
    const parsed = createRepeatEntryExpander();
    const expanded = entries.map(entry => {
      try {
        return parsed.process(JSON.parse(entry));
      } catch {
        return null;
      }
    }).filter(Boolean);
    // 去重：同一 timestamp+url 的条目，后出现的（带 response）覆盖先出现的（在途）
    const map = new Map();
    for (const entry of expanded) {
      const key = `${entry.timestamp}|${entry.url}`;
      setLatestMapValue(map, key, entry);
    }
    return reconstructEntries(Array.from(map.values()));
  } catch (err) {
    console.error('Error reading log file:', err);
    return [];
  }
}

/**
 * Send an SSE entry to all connected clients.
 * @param {Array} clients - SSE client array
 * @param {object} entry - parsed log entry
 */
export function sendToClients(clients, entry) {
  clients.forEach(client => {
    if (client.cxvControlOnly) return;
    try {
      client.write(`data: ${JSON.stringify(entry)}\n\n`);
    } catch (err) {
      // Client disconnected
    }
  });
}

/**
 * Send a named SSE event to all connected clients.
 * @param {Array} clients - SSE client array
 * @param {string} eventName - SSE event name
 * @param {object} data - event payload
 */
export function sendEventToClients(clients, eventName, data) {
  clients.forEach(client => {
    try {
      client.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (err) {}
  });
}

/**
 * Watch a log file for changes and broadcast new entries.
 * @param {object} opts
 * @param {string} opts.logFile - log file to watch
 * @param {Array} opts.clients - SSE clients array
 * @param {Function} opts.runParallelHook - plugin hook runner
 * @param {Function} opts.notifyStatsWorker - stats worker notifier
 * @param {Function} opts.getLogFile - returns current LOG_FILE value
 */
export function watchLogFile(opts) {
  const { logFile, clients, runParallelHook, notifyStatsWorker, getLogFile } = opts;
  if (watchedFiles.has(logFile)) return;

  // Track byte offset instead of string length — avoids full-file re-read on every poll
  let lastByteOffset = 0;
  let pendingTail = ''; // incomplete entry carried across polls
  // Delta storage: 增量重建器，用于逐条重建 mainAgent delta 条目
  const _reconstructor = createIncrementalReconstructor();
  const _repeatExpander = createRepeatEntryExpander();
  try {
    if (existsSync(logFile)) {
      // 附着后只从 EOF 增量读，但重建器的会话基线必须先回放既有内容建立。
      // 不播种时，Codex CLI 侧压缩器继续写入的非 checkpoint delta 会在空基线上
      // 重建成错误长度的 input（"无基线冷启动透传"策略不打 broken 标记），下游
      // 归一化器 rawIds 前缀断裂 + merge 错位会把整段对话重复渲染，逐轮累积，
      // 直到该会话下一 checkpoint 才止损（页面上已重复的内容要刷新才清除）。
      const content = readFileSync(logFile);
      lastByteOffset = content.length;
      const parts = content.toString('utf-8').split('\n---\n');
      const tail = parts.pop() || '';
      for (const part of parts) {
        if (!part.trim()) continue;
        try { _reconstructor.reconstruct(_repeatExpander.process(JSON.parse(part))); } catch {}
      }
      if (tail.trim()) {
        try {
          _reconstructor.reconstruct(_repeatExpander.process(JSON.parse(tail)));
        } catch {
          // 末尾半截 entry：留给轮询续拼，其余字节到达后完整广播，不再整条丢弃。
          pendingTail = tail;
        }
      }
    }
  } catch {}

  watchedFiles.set(logFile, true);
  watchFile(logFile, { interval: 500 }, () => {
    try {
      const currentSize = statSync(logFile).size;

      // File truncated (rotation or clear) — reset offset and check rotation immediately
      if (currentSize < lastByteOffset) {
        lastByteOffset = 0;
        pendingTail = '';
        _reconstructor.reset();
        _repeatExpander.reset();

        // 文件被清空可能是轮转信号，立即检查是否已切换到新文件
        const currentLogFile = getLogFile();
        if (currentLogFile !== logFile && !watchedFiles.has(currentLogFile)) {
          unwatchFile(logFile);
          watchedFiles.delete(logFile);

          // 流式分段广播，避免全量加载 OOM
          const legacyReloadClients = clients.filter(client => !client.cxvControlOnly);
          const rotTotal = countLogEntries(currentLogFile);
          legacyReloadClients.forEach(client => {
            try { client.write(`event: load_start\ndata: ${JSON.stringify({ total: rotTotal, incremental: false })}\n\n`); } catch { }
          });
          streamReconstructedEntries(currentLogFile, (segment) => {
            const data = JSON.stringify(segment);
            legacyReloadClients.forEach(client => {
              try { client.write(`event: load_chunk\ndata: ${data}\n\n`); } catch { }
            });
          });
          legacyReloadClients.forEach(client => {
            try { client.write(`event: load_end\ndata: {}\n\n`); } catch { }
          });
          watchLogFile({ ...opts, logFile: currentLogFile });
          return;
        }
      }

      if (currentSize <= lastByteOffset) return;

      // Read only the new bytes
      const bytesToRead = currentSize - lastByteOffset;
      const buf = Buffer.alloc(bytesToRead);
      const fd = openSync(logFile, 'r');
      try {
        readSync(fd, buf, 0, bytesToRead, lastByteOffset);
      } finally {
        closeSync(fd);
      }
      lastByteOffset = currentSize;

      const raw = pendingTail + buf.toString('utf-8');
      const parts = raw.split('\n---\n');

      // Last part may be incomplete — keep it for next poll
      pendingTail = parts.pop() || '';

      // If there's only the tail and no complete entries, check if tail is a complete entry
      // (happens when the file ends without a trailing \n---\n)
      if (parts.length === 0 && pendingTail.trim()) {
        try {
          JSON.parse(pendingTail);
          // Valid JSON — treat as complete entry
          parts.push(pendingTail);
          pendingTail = '';
        } catch {
          // Incomplete — keep in pendingTail for next poll
        }
      }

      const validParts = parts.filter(p => p.trim());
      if (validParts.length > 0) {
        validParts.forEach(entry => {
          try {
            const parsed = _repeatExpander.process(JSON.parse(entry));
            // Delta storage: reconstruct before push — 确保前端收到完整 messages
            _reconstructor.reconstruct(parsed);
            sendToClients(clients, parsed);
            runParallelHook('onNewEntry', parsed).catch(() => {});
            if (isMainAgentEntry(parsed) && !parsed.inProgress) {
              const usage = parsed.response?.body?.usage;
              if (usage) {
                const cwData = buildContextWindowEvent(usage);
                if (cwData) {
                  sendEventToClients(clients, 'context_window', cwData);
                }
              }
            }
          } catch (err) {
            // Skip invalid entries
          }
        });
        notifyStatsWorker(logFile);
      }

      // 检测日志文件是否已轮转到新文件
      const currentLogFile = getLogFile();
      if (currentLogFile !== logFile && !watchedFiles.has(currentLogFile)) {
        // Unwatch old file to prevent watcher leak on rotation
        unwatchFile(logFile);
        watchedFiles.delete(logFile);

        // 流式分段广播，避免全量加载 OOM
        const legacyReloadClients = clients.filter(client => !client.cxvControlOnly);
        const endRotTotal = countLogEntries(currentLogFile);
        legacyReloadClients.forEach(client => {
          try { client.write(`event: load_start\ndata: ${JSON.stringify({ total: endRotTotal, incremental: false })}\n\n`); } catch { }
        });
        streamReconstructedEntries(currentLogFile, (segment) => {
          const data = JSON.stringify(segment);
          legacyReloadClients.forEach(client => {
            try { client.write(`event: load_chunk\ndata: ${data}\n\n`); } catch { }
          });
        });
        legacyReloadClients.forEach(client => {
          try { client.write(`event: load_end\ndata: {}\n\n`); } catch { }
        });
        watchLogFile({ ...opts, logFile: currentLogFile });
      }
    } catch (err) {
      // File not yet created, will retry on next poll
    }
  });
}

/**
 * Start watching the current log file + install statusLine + context window.
 * @param {object} opts
 * @param {string} opts.logFile - current LOG_FILE
 * @param {Array} opts.clients - SSE clients array
 * @param {Function} opts.runParallelHook
 * @param {Function} opts.notifyStatsWorker
 * @param {Function} opts.getLogFile
 */
export function startWatching(opts) {
  const { clients, ...watchOpts } = opts;
  watchLogFile({ ...watchOpts, clients });
}

/** Get the watchedFiles Map (for cleanup in stopViewer). */
export function getWatchedFiles() {
  return watchedFiles;
}
