import { parentPort, workerData } from 'node:worker_threads';

import { listRawSidecarsForLog, readRawSidecarFramePage } from '../lib/log-management.js';

try {
  const { action, logDir, file, ref, limit } = workerData || {};
  const result = action === 'list'
    ? { sidecars: listRawSidecarsForLog(logDir, file) }
    : readRawSidecarFramePage(logDir, file, ref, { limit });
  parentPort.postMessage({ ok: true, result });
} catch (error) {
  parentPort.postMessage({
    ok: false,
    error: error?.message || 'Raw sidecar request failed',
    code: error?.code || null,
    status: error?.status || null,
  });
}
