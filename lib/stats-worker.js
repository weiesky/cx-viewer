import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { parentPort } from 'node:worker_threads';

import { listV2LocalLogs, readV2LogEntries } from './log-v2/materializer.js';
import { atomicWriteJsonSync } from './log-v2/storage.js';
import { getInputCacheUsage } from './token-usage.js';

function cachePath(logDir, project) {
  return join(logDir, 'v2-stats', `${encodeURIComponent(project)}.json`);
}

function usageOf(entry) {
  return entry?.response?.body?.usage || {};
}

export function buildStats(logDir, project, logs) {
  const models = {};
  const files = {};
  let requestCount = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  for (const log of logs) {
    const fileModels = {};
    const entries = readV2LogEntries(logDir, log.file);
    for (const entry of entries) {
      requestCount++;
      const model = entry?.body?.model || entry?.request?.body?.model || entry?.response?.body?.model;
      if (model) models[model] = (models[model] || 0) + 1;
      const usage = usageOf(entry);
      const input = Number(usage.input_tokens || usage.prompt_tokens || 0);
      const output = Number(usage.output_tokens || usage.completion_tokens || 0);
      const cache = getInputCacheUsage(usage);
      inputTokens += input;
      outputTokens += output;
      cacheReadTokens += cache.read;
      cacheWriteTokens += cache.write;
      if (model) {
        const detail = fileModels[model] ||= {
          count: 0,
          input_tokens: 0,
          output_tokens: 0,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
        };
        detail.count++;
        detail.input_tokens += input;
        detail.output_tokens += output;
        detail.cache_read_tokens += cache.read;
        detail.cache_write_tokens += cache.write;
      }
    }
    files[log.file] = {
      summary: { requestCount: entries.length, sessionCount: 1, turnCount: log.turns || 0 },
      preview: log.preview || [],
      size: log.size || 0,
      models: fileModels,
    };
  }
  return {
    _v: 2,
    project,
    updatedAt: new Date().toISOString(),
    models,
    files,
    summary: {
      requestCount,
      sessionCount: logs.length,
      turnCount: logs.reduce((sum, log) => sum + (log.turns || 0), 0),
      fileCount: logs.length,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_read_tokens: cacheReadTokens,
      cache_write_tokens: cacheWriteTokens,
    },
  };
}

export function scan(logDir, project) {
  const grouped = listV2LocalLogs(logDir, project);
  const projects = grouped[project] ? [project] : [];
  mkdirSync(join(logDir, 'v2-stats'), { recursive: true });
  if (projects.length === 0) {
    try { unlinkSync(cachePath(logDir, project)); } catch {}
  }
  for (const project of projects) {
    const stats = buildStats(logDir, project, grouped[project]);
    atomicWriteJsonSync(cachePath(logDir, project), stats, { durable: false });
  }
  return projects;
}

const pendingUpdates = new Map();
let drainScheduled = false;

function scheduleDrain() {
  if (drainScheduled) return;
  drainScheduled = true;
  setImmediate(() => {
    drainScheduled = false;
    const updates = [...pendingUpdates.values()];
    pendingUpdates.clear();
    for (const { logDir, projectName } of updates) {
      try {
        if (existsSync(logDir)) scan(logDir, projectName);
      } catch (error) {
        console.error(`[CX Viewer] Stats worker scan failed for ${projectName}:`, error.message);
      }
    }
  });
}

parentPort?.on('message', ({ type, logDir, projectName }) => {
  if (type === 'update' && projectName) {
    pendingUpdates.set(`${logDir}\0${projectName}`, { logDir, projectName });
  }
  scheduleDrain();
});
