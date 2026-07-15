import { parentPort, workerData } from 'node:worker_threads';

import {
  readV2PagedEntries,
  streamV2LogEntriesInProcess,
} from './materializer.js';
import { readV2WirePage, readV2WireSnapshot } from './transport.js';

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

try {
  const { operation, payload, ackBuffer } = workerData || {};
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
  } else {
    throw new TypeError(`unsupported V2 reader worker operation: ${operation}`);
  }
} catch (error) {
  parentPort.postMessage(serializeError(error));
}
