import { parentPort, workerData } from 'node:worker_threads';

import headless from '@xterm/headless';
import serialize from '@xterm/addon-serialize';

const { Terminal } = headless;
const { SerializeAddon } = serialize;

const terminal = new Terminal({
  cols: workerData.cols,
  rows: workerData.rows,
  scrollback: 0,
  allowProposedApi: true,
  cursorBlink: false,
  logLevel: 'off',
});
const serializer = new SerializeAddon();
terminal.loadAddon(serializer);

const queue = [];
let pumping = false;
let disposed = false;
let throughSeq = 0;
let resizeGeneration = 0;

function snapshotSafety() {
  const inputHandler = terminal._core?._inputHandler;
  const parser = inputHandler?._parser;
  const reasons = [];
  if (!parser || parser.currentState !== parser.initialState) reasons.push('parser-not-ground');
  if (terminal.modes?.synchronizedOutputMode) reasons.push('synchronized-output-open');
  if (inputHandler?._stringDecoder?._interim) reasons.push('utf16-codepoint-incomplete');
  const interim = inputHandler?._utf8Decoder?.interim;
  if (interim && Array.from(interim).some(value => value !== 0)) reasons.push('utf8-codepoint-incomplete');
  return reasons;
}

function write(data) {
  return new Promise((resolve, reject) => {
    try { terminal.write(data, resolve); } catch (error) { reject(error); }
  });
}

async function pump() {
  if (pumping || disposed) return;
  pumping = true;
  try {
    while (!disposed && queue.length > 0) {
      const message = queue.shift();
      if (message.type === 'write') {
        if (typeof message.data !== 'string' || !Number.isSafeInteger(message.seq) || message.seq < 1) {
          throw new TypeError('invalid terminal screen write command');
        }
        await write(message.data);
        throughSeq = message.seq;
        parentPort.postMessage({ type: 'ack', bytes: message.bytes });
      } else if (message.type === 'resize') {
        if (!Number.isSafeInteger(message.cols) || message.cols < 2
          || !Number.isSafeInteger(message.rows) || message.rows < 1
          || !Number.isSafeInteger(message.resizeGeneration) || message.resizeGeneration < 0) {
          throw new TypeError('invalid terminal screen resize command');
        }
        terminal.resize(message.cols, message.rows);
        resizeGeneration = message.resizeGeneration;
      } else if (message.type === 'snapshot') {
        let data = '';
        const reasons = snapshotSafety();
        if (reasons.length === 0) {
          try { data = serializer.serialize({ scrollback: 0 }); }
          catch (error) { reasons.push(`serialize-failed:${error?.message || error}`); }
        }
        parentPort.postMessage({
          type: 'snapshot',
          requestId: message.requestId,
          snapshot: {
            safe: reasons.length === 0,
            reasons,
            throughSeq,
            resizeGeneration,
            cols: terminal.cols,
            rows: terminal.rows,
            data: reasons.length === 0 ? data : null,
          },
        });
      } else if (message.type === 'dispose') {
        disposed = true;
      }
    }
  } catch (error) {
    parentPort.postMessage({ type: 'fatal', error: String(error?.message || error) });
  } finally {
    pumping = false;
    if (disposed) {
      try { terminal.dispose(); } catch { }
      parentPort.close();
    } else if (queue.length > 0) {
      setImmediate(pump);
    }
  }
}

parentPort.on('message', (message) => {
  if (disposed || !message || typeof message.type !== 'string') return;
  queue.push(message);
  void pump();
});

parentPort.postMessage({ type: 'ready' });
