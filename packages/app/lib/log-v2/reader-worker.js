import { parentPort, workerData } from 'node:worker_threads';
import { dirname } from 'node:path';

import {
  findActiveV2SessionFile,
  readV2PagedEntries,
  streamV2LogEntriesInProcess,
} from './materializer.js';
import {
  readV2WireCommitsFromCursor,
  readV2WirePage,
  readV2WireSnapshot,
  readV2WireSummariesForWinners,
  rebuildRequestSummary,
} from './transport.js';
import {
  applyWireCommit,
  checkpointWireArchiveState,
  restoreWireArchiveState,
} from './reducer.js';

function serializeError(error) {
  return {
    type: 'error',
    message: error?.message || String(error),
    code: typeof error?.code === 'string' ? error.code : null,
    stack: typeof error?.stack === 'string' ? error.stack : null,
  };
}

function postEntryWithBackpressure(raw, flags, ack) {
  const expected = Atomics.load(ack, 0);
  parentPort.postMessage({ type: 'entry', raw, ...flags });
  Atomics.wait(ack, 0, expected);
}

function materializeLiveResult(state, payload, cursor) {
  const result = readV2WireCommitsFromCursor(payload.logDir, payload.file, { cursor });
  const commits = result.commits.map((commit) => {
    const descriptor = applyWireCommit(state, commit.frame);
    return Object.freeze({
      ...commit,
      summary: commit.summary || rebuildRequestSummary(dirname(payload.timelinePath), descriptor),
      frame: Object.freeze({
        ...commit.frame,
        entry: Object.freeze({
          ...commit.frame.entry,
          upsert: true,
          baseRevision: 0,
          set: Object.freeze(Object.fromEntries(descriptor.parts)),
          delete: Object.freeze([]),
        }),
      }),
    });
  });
  return { commits, cursor: result.cursor };
}

const { operation, payload, ackBuffer } = workerData || {};

if (operation === 'wire-live-session') {
  try {
    const state = restoreWireArchiveState(payload.checkpoint);
    let failed = false;
    parentPort.on('message', (message) => {
      if (failed || message?.type !== 'read') return;
      try {
        parentPort.postMessage({
          type: 'live-result',
          id: message.id,
          value: materializeLiveResult(state, payload, message.cursor),
        });
      } catch (error) {
        failed = true;
        parentPort.postMessage({ ...serializeError(error), type: 'live-error', id: message.id });
      }
    });
    parentPort.postMessage({ type: 'live-ready' });
  } catch (error) {
    parentPort.postMessage({ ...serializeError(error), type: 'live-error', id: null });
  }
} else try {
  if (operation === 'stream') {
    const ack = new Int32Array(ackBuffer);
    const options = payload.options || {};
    const result = streamV2LogEntriesInProcess(
      payload.logDir,
      payload.file,
      () => {},
      {
        since: options.since || null,
        limit: options.limit || 0,
        onScan: options.wantScan ? () => {} : null,
        onReady(value) { parentPort.postMessage({ type: 'ready', value }); },
        onRecord(raw, flags) { postEntryWithBackpressure(raw, flags, ack); },
      },
    );
    parentPort.postMessage({ type: 'result', value: result });
  } else if (operation === 'page') {
    const result = readV2PagedEntries(payload.logDir, payload.file, payload.options);
    parentPort.postMessage({ type: 'result', value: result });
  } else if (operation === 'wire-snapshot') {
    const result = readV2WireSnapshot(payload.logDir, payload.file, payload.options);
    parentPort.postMessage({ type: 'result', value: result });
  } else if (operation === 'wire-page') {
    const result = readV2WirePage(payload.logDir, payload.file, payload.options);
    parentPort.postMessage({ type: 'result', value: result });
  } else if (operation === 'wire-summaries') {
    const result = readV2WireSummariesForWinners(payload.logDir, payload.file, payload.winners);
    parentPort.postMessage({ type: 'result', value: result });
  } else if (operation === 'active-file') {
    const result = findActiveV2SessionFile(payload.logDir, payload.options);
    parentPort.postMessage({ type: 'result', value: result });
  } else if (operation === 'wire-live-suffix') {
    const state = restoreWireArchiveState(payload.checkpoint);
    const value = materializeLiveResult(state, payload, payload.cursor);
    parentPort.postMessage({ type: 'result', value: {
      ...value,
      checkpoint: checkpointWireArchiveState(state),
    } });
  } else {
    throw new TypeError(`unsupported V2 reader worker operation: ${operation}`);
  }
} catch (error) {
  parentPort.postMessage(serializeError(error));
}
