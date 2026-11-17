import { parentPort, workerData } from 'node:worker_threads';

import { LogV2WriteCoordinator } from './coordinator.js';

function serializeError(error) {
  return {
    message: error?.message || String(error),
    code: typeof error?.code === 'string' ? error.code : null,
    stack: typeof error?.stack === 'string' ? error.stack : null,
  };
}

const coordinator = new LogV2WriteCoordinator({
  ...workerData.options,
  onDegraded(message) {
    parentPort.postMessage({ type: 'degraded', message });
  },
});

parentPort.on('message', (message) => {
  if (message?.type === 'write') {
    try {
      const result = coordinator.writeEntry(message.entry, message.context);
      parentPort.postMessage({
        type: 'write-result',
        id: message.id,
        result: {
          ...result,
          accepted: true,
          durable: result?.written === true,
        },
        snapshot: coordinator.snapshot(),
      });
    } catch (error) {
      parentPort.postMessage({
        type: 'write-result',
        id: message.id,
        error: serializeError(error),
        snapshot: coordinator.snapshot(),
      });
    }
    return;
  }
  if (message?.type === 'flush') {
    // MessagePort delivery is ordered, so receiving this message proves every
    // preceding write has finished its durable transaction.
    parentPort.postMessage({
      type: 'flush-result',
      id: message.id,
      snapshot: {
        ...coordinator.snapshot(),
        accepted: true,
        durable: true,
      },
    });
  }
});

parentPort.postMessage({ type: 'ready', snapshot: coordinator.snapshot() });
