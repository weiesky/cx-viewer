import { parentPort, workerData } from 'node:worker_threads';

import headless from '@xterm/headless';
import serialize from '@xterm/addon-serialize';
import unicode11 from '@xterm/addon-unicode11';

const { Terminal } = headless;
const { SerializeAddon } = serialize;
const { Unicode11Addon } = unicode11;
const ESC = '\x1b';
const CSI = `${ESC}[`;
const MAX_WRITE_BATCH = 256 * 1024;
const MAX_COMMAND_QUEUE = 65_792;
const SNAPSHOT_LIMITATIONS = Object.freeze({
  oscTitle: false,
  oscPalette: false,
  historicalHyperlinks: false,
  inlineImages: false,
  note: 'These presentation-side OSC/image features are outside the authoritative parser-state contract.',
});

const {
  generation,
  cols,
  rows,
  scrollback,
  snapshotScrollback,
} = workerData;

const terminal = new Terminal({
  allowProposedApi: true,
  cols,
  rows,
  scrollback,
  cursorBlink: false,
  cursorStyle: 'bar',
  logLevel: 'off',
});
const serializeAddon = new SerializeAddon();
const unicode11Addon = new Unicode11Addon();
terminal.loadAddon(unicode11Addon);
terminal.unicode.activeVersion = '11';
terminal.loadAddon(serializeAddon);

let appliedSeq = 0;
let failed = false;
let pumping = false;
const commandQueue = [];
let commandHead = 0;

function commandCount() {
  return commandQueue.length - commandHead;
}

function peekCommand() {
  return commandQueue[commandHead];
}

function takeCommand() {
  if (commandHead >= commandQueue.length) return undefined;
  const message = commandQueue[commandHead++];
  if (commandHead >= 4096 && commandHead * 2 >= commandQueue.length) {
    commandQueue.splice(0, commandHead);
    commandHead = 0;
  }
  return message;
}

function clearCommands() {
  commandQueue.length = 0;
  commandHead = 0;
}

function serializeError(error, code = 'TERMINAL_STATE_WORKER_ERROR') {
  return {
    code: error?.code || code,
    message: error?.message || String(error),
    stack: typeof error?.stack === 'string' ? error.stack : null,
  };
}

function writeTerminal(data) {
  return new Promise((resolve, reject) => {
    try {
      terminal.write(data, resolve);
    } catch (error) {
      reject(error);
    }
  });
}

function assertCommand(message, expectedSeq = appliedSeq + 1) {
  if (message.generation !== generation) {
    const error = new Error('terminal state generation mismatch');
    error.code = 'TERMINAL_GENERATION_MISMATCH';
    throw error;
  }
  if (!Number.isSafeInteger(message.seq) || message.seq !== expectedSeq) {
    const error = new Error(
      `terminal state sequence mismatch: expected ${expectedSeq}, received ${message.seq}`,
    );
    error.code = 'TERMINAL_SEQUENCE_MISMATCH';
    throw error;
  }
}

function publicModes() {
  return { ...terminal.modes };
}

function privateBuffers() {
  const buffers = terminal._core?._bufferService?.buffers;
  return {
    normal: buffers?.normal,
    alternate: buffers?.alt,
    active: buffers?.active,
  };
}

function bufferState(publicBuffer, privateBuffer) {
  return {
    type: publicBuffer.type,
    cursorX: publicBuffer.cursorX,
    cursorY: publicBuffer.cursorY,
    baseY: publicBuffer.baseY,
    viewportY: publicBuffer.viewportY,
    length: publicBuffer.length,
    scrollTop: privateBuffer?.scrollTop ?? 0,
    scrollBottom: privateBuffer?.scrollBottom ?? terminal.rows - 1,
    tabStops: Object.keys(privateBuffer?.tabs || {})
      .filter(column => privateBuffer.tabs[column])
      .map(Number)
      .filter(column => Number.isSafeInteger(column) && column >= 0 && column < terminal.cols)
      .sort((left, right) => left - right),
    savedCursor: {
      x: privateBuffer?.savedX ?? 0,
      y: privateBuffer?.savedY ?? 0,
    },
    _private: {
      publicBuffer,
      buffer: privateBuffer,
      savedAttr: privateBuffer?.savedCurAttrData,
      savedCharset: privateBuffer?.savedCharset,
    },
  };
}

function terminalState() {
  const core = terminal._core;
  const privateBufferSet = privateBuffers();
  const decModes = core?.coreService?.decPrivateModes;
  const rawOptions = core?.optionsService?.rawOptions;
  const normal = bufferState(terminal.buffer.normal, privateBufferSet.normal);
  const alternate = bufferState(terminal.buffer.alternate, privateBufferSet.alternate);
  const cursorStyle = decModes?.cursorStyle ?? rawOptions?.cursorStyle ?? 'block';
  const cursorBlink = decModes?.cursorBlink ?? rawOptions?.cursorBlink ?? false;
  const inputHandler = core?._inputHandler;

  return {
    activeBuffer: terminal.buffer.active.type,
    buffers: { normal, alternate },
    modes: {
      ...publicModes(),
      convertEol: Boolean(rawOptions?.convertEol),
    },
    cursor: {
      visible: !core?.coreService?.isCursorHidden,
      style: cursorStyle,
      blink: Boolean(cursorBlink),
    },
    mouseEncoding: core?.coreMouseService?._activeEncoding ?? 'DEFAULT',
    _private: {
      charsetService: core?._charsetService,
      currentAttr: inputHandler?._curAttrData,
      inputHandler,
    },
  };
}

function decoderHasPendingBytes(decoder) {
  const interim = decoder?.interim;
  return Boolean(interim && Array.from(interim).some((value) => value !== 0));
}

function snapshotSafety(state) {
  const reasons = [];
  const inputHandler = state._private.inputHandler;
  const parser = inputHandler?._parser;
  const charsetService = state._private.charsetService;
  const joinReplay = state._private.joinReplay;

  if (!parser || parser.currentState !== parser.initialState) {
    reasons.push('parser-not-ground');
  }
  if (state.modes.synchronizedOutputMode) {
    reasons.push('synchronized-output-open');
  }
  if (inputHandler?._stringDecoder?._interim) {
    reasons.push('utf16-codepoint-incomplete');
  }
  if (decoderHasPendingBytes(inputHandler?._utf8Decoder)) {
    reasons.push('utf8-codepoint-incomplete');
  }
  if (!joinReplay.safe) reasons.push(joinReplay.reason);

  if (!charsetService || charsetService.glevel !== 0
    || charsetService.charset !== undefined
    || !Array.isArray(charsetService._charsets)
    || charsetService._charsets.some(charset => charset !== undefined)) {
    reasons.push('charset-non-default');
  }

  const currentAttr = state._private.currentAttr;
  if (!currentAttr) {
    reasons.push('unsupported-xterm-attributes');
  } else if (currentAttr.hasExtendedAttrs?.()) {
    reasons.push(currentAttr.extended?.urlId
      ? 'osc8-hyperlink-open'
      : 'current-extended-attributes');
  }

  // The replay envelope moves the cursor while restoring tab stops, scroll
  // regions and DECSC. CUP cannot recreate x === cols (pending wrap).
  for (const buffer of Object.values(state.buffers)) {
    if (buffer.cursorX === terminal.cols) {
      reasons.push(`${buffer.type}-cursor-wrap-pending`);
    }
    if (buffer.savedCursor.x >= terminal.cols) {
      reasons.push(`${buffer.type}-saved-cursor-wrap-pending`);
    }
    if (buffer._private.savedCharset !== undefined) {
      reasons.push(`${buffer.type}-saved-charset-non-default`);
    }
    if (!buffer._private.savedAttr) {
      reasons.push(`${buffer.type}-saved-attributes-unavailable`);
    } else if (buffer._private.savedAttr.hasExtendedAttrs?.()) {
      reasons.push(`${buffer.type}-saved-extended-attributes`);
    }
    const publicBuffer = buffer._private.publicBuffer;
    const firstRow = Math.max(
      0,
      buffer.baseY - (buffer.type === 'normal' ? snapshotScrollback : 0),
    );
    const lastRow = Math.min(buffer.length, buffer.baseY + terminal.rows);
    const cell = publicBuffer?.getNullCell?.();
    let protectedCell = false;
    let extendedCell = false;
    for (let row = firstRow; row < lastRow && !(protectedCell && extendedCell); row++) {
      const line = publicBuffer?.getLine(row);
      if (!line) continue;
      for (let column = 0; column < terminal.cols; column++) {
        const current = line.getCell(column, cell);
        if (!current) continue;
        if (current.isProtected?.()) protectedCell = true;
        if (current.hasExtendedAttrs?.()) extendedCell = true;
        if (protectedCell && extendedCell) break;
      }
    }
    if (protectedCell) reasons.push(`${buffer.type}-protected-cells`);
    if (extendedCell) reasons.push(`${buffer.type}-extended-cells`);
  }

  if (!terminal._core?.coreService || !terminal._core?.coreMouseService
    || !inputHandler || !charsetService) {
    reasons.push('unsupported-xterm-internals');
  }
  return reasons;
}

function activeGraphemeReplay(state) {
  const inputHandler = state._private.inputHandler;
  const parser = inputHandler?._parser;
  const precedingJoinState = parser?.precedingJoinState ?? 0;
  if (!precedingJoinState) return { safe: true, data: '' };
  if (state.modes.insertMode) {
    return { safe: false, reason: 'grapheme-join-with-insert-mode' };
  }

  const buffer = state.buffers[state.activeBuffer]?._private.buffer;
  const line = buffer?.lines?.get(buffer.ybase + buffer.y);
  const cursorX = buffer?.x;
  if (!line || !Number.isSafeInteger(cursorX) || cursorX <= 0 || cursorX > terminal.cols) {
    return { safe: false, reason: 'grapheme-join-cell-unavailable' };
  }

  let start = cursorX - 1;
  while (start >= 0 && line.getWidth(start) === 0 && !line.hasContent(start)) start--;
  if (start < 0) return { safe: false, reason: 'grapheme-join-cell-unavailable' };
  const width = line.getWidth(start);
  const text = line.getString(start);
  if (!text || !Number.isSafeInteger(width) || width <= 0 || start + width !== cursorX) {
    return { safe: false, reason: 'grapheme-join-cell-mismatch' };
  }

  // Recompute xterm's opaque UnicodeJoinProperties value from the complete
  // grapheme stored in the cursor-adjacent cell. This proves the printable
  // primer below reconstructs the exact parser continuation, not merely the
  // visible glyph.
  let reconstructed = 0;
  for (const character of text) {
    reconstructed = inputHandler._unicodeService.charProperties(
      character.codePointAt(0),
      reconstructed,
    );
  }
  if (reconstructed !== precedingJoinState) {
    return { safe: false, reason: 'grapheme-join-state-unreconstructable' };
  }

  // Every cursor/control sequence resets precedingJoinState. Therefore the
  // replay must end with a printable reconstruction of the last grapheme.
  // CUB moves onto the existing cell, the grapheme overwrites itself, and the
  // cursor returns to its original position with the join state restored.
  return { safe: true, data: `${CSI}${width}D${text}` };
}

function setMode(code, enabled, isPrivate = true) {
  return `${CSI}${isPrivate ? '?' : ''}${code}${enabled ? 'h' : 'l'}`;
}

function cursorPosition(buffer, originMode) {
  const row = originMode
    ? buffer.cursorY - buffer.scrollTop + 1
    : buffer.cursorY + 1;
  return `${CSI}${Math.max(1, row)};${buffer.cursorX + 1}H`;
}

function colorSgr(attr, foreground) {
  const color = foreground ? attr.getFgColor() : attr.getBgColor();
  if (foreground ? attr.isFgRGB() : attr.isBgRGB()) {
    return [foreground ? 38 : 48, 2, color >>> 16 & 255, color >>> 8 & 255, color & 255];
  }
  if (foreground ? attr.isFgPalette() : attr.isBgPalette()) {
    if (color < 8) return [(foreground ? 30 : 40) + color];
    if (color < 16) return [(foreground ? 90 : 100) + color - 8];
    return [foreground ? 38 : 48, 5, color];
  }
  return [foreground ? 39 : 49];
}

function attrSequence(attr) {
  const params = [0];
  if (attr.isBold()) params.push(1);
  if (attr.isDim()) params.push(2);
  if (attr.isItalic()) params.push(3);
  if (attr.isUnderline()) params.push(4);
  if (attr.isBlink()) params.push(5);
  if (attr.isInverse()) params.push(7);
  if (attr.isInvisible()) params.push(8);
  if (attr.isStrikethrough()) params.push(9);
  if (attr.isOverline()) params.push(53);
  params.push(...colorSgr(attr, true), ...colorSgr(attr, false));
  return `${CSI}${params.join(';')}m${CSI}${attr.isProtected() ? 1 : 0}"q`;
}

function savedCursorPosition(buffer) {
  const row = Math.max(
    0,
    Math.min(terminal.rows - 1, buffer.savedCursor.y - buffer.baseY),
  );
  return `${CSI}${row + 1};${buffer.savedCursor.x + 1}H`;
}

function restoreSavedCursorSlot(buffer, currentAttr) {
  return attrSequence(buffer._private.savedAttr)
    + savedCursorPosition(buffer)
    + `${ESC}7`
    + attrSequence(currentAttr);
}

function restoreTabStops(buffer) {
  let value = `${CSI}3g`;
  for (const column of buffer.tabStops) {
    value += `${CSI}${column + 1}G${ESC}H`;
  }
  return value;
}

function restoreBufferState(buffer, currentAttr) {
  let value = '';
  if (buffer.scrollTop !== 0 || buffer.scrollBottom !== terminal.rows - 1) {
    value += `${CSI}${buffer.scrollTop + 1};${buffer.scrollBottom + 1}r`;
  }
  value += restoreTabStops(buffer);
  value += restoreSavedCursorSlot(buffer, currentAttr);
  value += cursorPosition(buffer, false);
  return value;
}

function mouseProtocolSequence(mode) {
  switch (mode) {
    case 'x10': return setMode(9, true);
    case 'vt200': return setMode(1000, true);
    case 'drag': return setMode(1002, true);
    case 'any': return setMode(1003, true);
    default: return '';
  }
}

function mouseEncodingSequence(encoding) {
  switch (encoding) {
    case 'UTF8': return setMode(1005, true);
    case 'SGR': return setMode(1006, true);
    case 'URXVT': return setMode(1015, true);
    case 'SGR_PIXELS': return setMode(1016, true);
    default: return '';
  }
}

function cursorStyleSequence(cursor) {
  const base = cursor.style === 'underline' ? 3 : cursor.style === 'bar' ? 5 : 1;
  const code = cursor.blink ? base : base + 1;
  return `${CSI}${code} q`;
}

function modeEnvelope(state) {
  const modes = state.modes;
  let value = '';
  if (modes.applicationCursorKeysMode) value += setMode(1, true);
  if (modes.applicationKeypadMode) value += setMode(66, true);
  if (modes.bracketedPasteMode) value += setMode(2004, true);
  if (modes.insertMode) value += setMode(4, true, false);
  value += setMode(20, modes.convertEol, false);
  if (modes.reverseWraparoundMode) value += setMode(45, true);
  if (modes.sendFocusMode) value += setMode(1004, true);
  if (!modes.wraparoundMode) value += setMode(7, false);
  value += mouseProtocolSequence(modes.mouseTrackingMode);
  value += mouseEncodingSequence(state.mouseEncoding);

  const active = state.buffers[state.activeBuffer];
  if (modes.originMode) {
    value += setMode(6, true);
    value += cursorPosition(active, true);
  }
  value += cursorStyleSequence(state.cursor);
  value += setMode(25, state.cursor.visible);
  // A safe snapshot is only produced while synchronized output is closed.
  value += setMode(2026, false);
  value += attrSequence(state._private.currentAttr);
  return value;
}

function serializeReplay(state) {
  const options = {
    scrollback: snapshotScrollback,
    excludeModes: true,
    excludeAltBuffer: true,
  };
  const normalVt = serializeAddon.serialize(options);
  let replay = `${ESC}c${normalVt}`;
  const currentAttr = state._private.currentAttr;

  if (state.activeBuffer === 'alternate') {
    replay += restoreBufferState(state.buffers.normal, currentAttr);
    const withAlternate = serializeAddon.serialize({
      ...options,
      excludeAltBuffer: false,
    });
    if (!withAlternate.startsWith(normalVt)) {
      throw new Error('serialize addon returned an unstable normal-buffer prefix');
    }
    const alternateVt = withAlternate.slice(normalVt.length);
    const alternatePrefix = `${CSI}?1049h${CSI}H`;
    if (!alternateVt.startsWith(alternatePrefix)) {
      throw new Error('serialize addon returned an unstable alternate-buffer prefix');
    }
    // 1049h overwrites the normal buffer's DECSC slot. Mode 47 switches the
    // buffer without that side effect, allowing both saved cursor slots to be
    // reconstructed independently.
    replay += `${CSI}?47h${CSI}H${alternateVt.slice(alternatePrefix.length)}`;
    replay += restoreBufferState(state.buffers.alternate, currentAttr);
  } else {
    // The inactive alternate buffer is empty but its DECSC slot survives
    // xterm's buffer clear. Rebuild that slot without touching normal DECSC.
    replay += `${CSI}?47h`;
    replay += restoreSavedCursorSlot(state.buffers.alternate, currentAttr);
    replay += `${CSI}?47l`;
    replay += restoreBufferState(state.buffers.normal, currentAttr);
  }

  replay += modeEnvelope(state);
  replay += state._private.joinReplay.data;
  return replay;
}

function createSnapshot(seq) {
  const state = terminalState();
  state._private.joinReplay = activeGraphemeReplay(state);
  const reasons = snapshotSafety(state);
  const includedScrollback = Math.min(
    snapshotScrollback,
    state.buffers.normal.baseY,
  );
  const publicBuffers = Object.fromEntries(
    Object.entries(state.buffers).map(([name, buffer]) => {
      const { _private, ...publicBuffer } = buffer;
      return [name, publicBuffer];
    }),
  );
  const { _private, ...publicState } = state;
  const common = {
    generation,
    seq,
    cols: terminal.cols,
    rows: terminal.rows,
    unicodeVersion: terminal.unicode.activeVersion,
    history: {
      policy: 'bounded-scrollback',
      terminalLimit: scrollback,
      snapshotLimit: snapshotScrollback,
      includedRows: includedScrollback,
    },
    limitations: SNAPSHOT_LIMITATIONS,
    ...publicState,
    buffers: publicBuffers,
  };

  if (reasons.length > 0) {
    return { ...common, safe: false, reasons, data: null };
  }
  return {
    ...common,
    safe: true,
    reasons: [],
    // Replay contract: write into an xterm 6.0 terminal of cols x rows with at
    // least snapshotLimit scrollback. RIS is embedded, so prior state is reset.
    data: serializeReplay(state),
  };
}

async function handleMessage(message) {
  if (failed) return;
  if (!message || message.generation !== generation) {
    throw Object.assign(new Error('terminal state generation mismatch'), {
      code: 'TERMINAL_GENERATION_MISMATCH',
    });
  }

  if (message.type === 'resize') {
    assertCommand(message);
    terminal.resize(message.cols, message.rows);
    appliedSeq = message.seq;
    parentPort.postMessage({
      type: 'applied-command',
      generation,
      command: 'resize',
      seq: appliedSeq,
    });
    return;
  }

  if (message.type === 'snapshot') {
    if (message.seq !== appliedSeq) {
      const error = new Error(
        `snapshot barrier mismatch: requested ${message.seq}, applied ${appliedSeq}`,
      );
      error.code = 'TERMINAL_SNAPSHOT_BARRIER_MISMATCH';
      parentPort.postMessage({
        type: 'request-error',
        generation,
        requestId: message.requestId,
        error: serializeError(error),
      });
      return;
    }
    try {
      parentPort.postMessage({
        type: 'snapshot',
        generation,
        requestId: message.requestId,
        snapshot: createSnapshot(message.seq),
      });
    } catch (error) {
      parentPort.postMessage({
        type: 'request-error',
        generation,
        requestId: message.requestId,
        error: serializeError(error),
      });
    }
    return;
  }

  if (message.type === 'dispose') {
    terminal.dispose();
    parentPort.close();
    return;
  }

  throw Object.assign(new Error(`unsupported terminal state command: ${message.type}`), {
    code: 'TERMINAL_STATE_COMMAND_UNSUPPORTED',
  });
}

function dataKind(data) {
  return typeof data === 'string' ? 'string' : 'bytes';
}

function dataSize(message) {
  if (!Number.isSafeInteger(message.byteLength) || message.byteLength < 0) {
    const error = new Error('terminal write byteLength must be a non-negative integer');
    error.code = 'TERMINAL_WRITE_SIZE_INVALID';
    throw error;
  }
  return message.byteLength;
}

function combineWrites(messages, kind, size) {
  if (messages.length === 1) return messages[0].data;
  if (kind === 'string') return messages.map((message) => message.data).join('');
  const combined = new Uint8Array(size);
  let offset = 0;
  for (const message of messages) {
    combined.set(message.data, offset);
    offset += message.data.byteLength;
  }
  return combined;
}

async function processWriteBatch() {
  const first = peekCommand();
  const kind = dataKind(first.data);
  const messages = [];
  let size = 0;
  let expectedSeq = appliedSeq + 1;

  while (peekCommand()?.type === 'write') {
    const message = peekCommand();
    if (dataKind(message.data) !== kind) break;
    const nextSize = dataSize(message);
    if (messages.length > 0 && size + nextSize > MAX_WRITE_BATCH) break;
    assertCommand(message, expectedSeq);
    takeCommand();
    messages.push(message);
    size += nextSize;
    expectedSeq += 1;
  }

  await writeTerminal(combineWrites(messages, kind, size));
  appliedSeq = messages[messages.length - 1].seq;
  parentPort.postMessage({
    type: 'applied',
    generation,
    firstSeq: messages[0].seq,
    seq: appliedSeq,
    bytes: size,
  });
}

async function pumpCommands() {
  if (pumping || failed) return;
  pumping = true;
  try {
    while (commandCount() > 0 && !failed) {
      if (peekCommand().type === 'write') {
        await processWriteBatch();
      } else {
        await handleMessage(takeCommand());
      }
    }
  } catch (error) {
    failed = true;
    clearCommands();
    parentPort.postMessage({
      type: 'fatal',
      generation,
      error: serializeError(error),
    });
  } finally {
    pumping = false;
    if (commandCount() > 0 && !failed) setImmediate(pumpCommands);
  }
}

parentPort.on('message', (message) => {
  if (commandCount() >= MAX_COMMAND_QUEUE) {
    failed = true;
    clearCommands();
    parentPort.postMessage({
      type: 'fatal',
      generation,
      error: serializeError(
        Object.assign(new Error('terminal state worker command queue overflow'), {
          code: 'TERMINAL_STATE_COMMAND_OVERFLOW',
        }),
      ),
    });
    return;
  }
  commandQueue.push(message);
  if (!pumping) setImmediate(pumpCommands);
});

parentPort.postMessage({
  type: 'ready',
  generation,
  cols: terminal.cols,
  rows: terminal.rows,
  scrollback,
  snapshotScrollback,
});
