import assert from 'node:assert/strict';
import test from 'node:test';

import headless from '@xterm/headless';
import unicode11 from '@xterm/addon-unicode11';

import { TerminalStateModel } from '../lib/terminal-state-model.js';

const { Terminal } = headless;
const { Unicode11Addon } = unicode11;

function writeTerminal(terminal, data) {
  return new Promise((resolve, reject) => {
    try {
      terminal.write(data, resolve);
    } catch (error) {
      reject(error);
    }
  });
}

function makeTerminal(options) {
  const terminal = new Terminal({
    allowProposedApi: true,
    cursorBlink: false,
    cursorStyle: 'bar',
    logLevel: 'off',
    ...options,
  });
  terminal.loadAddon(new Unicode11Addon());
  terminal.unicode.activeVersion = '11';
  return terminal;
}

function dumpCell(cell) {
  return {
    chars: cell.getChars(),
    width: cell.getWidth(),
    fgMode: cell.getFgColorMode(),
    fg: cell.getFgColor(),
    bgMode: cell.getBgColorMode(),
    bg: cell.getBgColor(),
    bold: cell.isBold(),
    dim: cell.isDim(),
    italic: cell.isItalic(),
    underline: cell.isUnderline(),
    blink: cell.isBlink(),
    inverse: cell.isInverse(),
    invisible: cell.isInvisible(),
    strike: cell.isStrikethrough(),
  };
}

function dumpBuffer(buffer) {
  const lines = [];
  const cell = buffer.getNullCell();
  for (let row = 0; row < buffer.length; row += 1) {
    const line = buffer.getLine(row);
    const cells = [];
    for (let col = 0; col < line.length; col += 1) {
      cells.push(dumpCell(line.getCell(col, cell)));
    }
    lines.push({ wrapped: line.isWrapped, cells });
  }
  return {
    cursorX: buffer.cursorX,
    cursorY: buffer.cursorY,
    baseY: buffer.baseY,
    viewportY: buffer.viewportY,
    length: buffer.length,
    lines,
  };
}

function dumpAttr(attr) {
  return {
    fg: attr.fg,
    bg: attr.bg,
    extended: {
      underlineStyle: attr.extended?.underlineStyle ?? 0,
      underlineColor: attr.extended?.underlineColor ?? 0,
      underlineVariantOffset: attr.extended?.underlineVariantOffset ?? 0,
      urlId: attr.extended?.urlId ?? 0,
    },
  };
}

function dumpPrivateBuffer(buffer) {
  return {
    scrollTop: buffer.scrollTop,
    scrollBottom: buffer.scrollBottom,
    tabStops: Object.keys(buffer.tabs)
      .filter(column => buffer.tabs[column])
      .map(Number)
      .sort((left, right) => left - right),
    savedX: buffer.savedX,
    savedY: buffer.savedY,
    savedAttr: dumpAttr(buffer.savedCurAttrData),
    hasSavedCharset: buffer.savedCharset !== undefined,
  };
}

function inspectTerminal(terminal) {
  const core = terminal._core;
  const privateBuffers = core._bufferService.buffers;
  const decModes = core.coreService.decPrivateModes;
  const options = core.optionsService.rawOptions;
  return {
    cols: terminal.cols,
    rows: terminal.rows,
    activeBuffer: terminal.buffer.active.type,
    normal: {
      ...dumpBuffer(terminal.buffer.normal),
      ...dumpPrivateBuffer(privateBuffers.normal),
    },
    alternate: {
      ...dumpBuffer(terminal.buffer.alternate),
      ...dumpPrivateBuffer(privateBuffers.alt),
    },
    modes: { ...terminal.modes },
    convertEol: Boolean(core.optionsService.rawOptions.convertEol),
    precedingJoinState: core._inputHandler._parser.precedingJoinState,
    cursor: {
      visible: !core.coreService.isCursorHidden,
      style: decModes.cursorStyle ?? options.cursorStyle,
      blink: Boolean(decModes.cursorBlink ?? options.cursorBlink),
    },
    mouseEncoding: core.coreMouseService._activeEncoding,
    currentAttr: dumpAttr(core._inputHandler._curAttrData),
  };
}

async function replaySnapshot(snapshot) {
  const terminal = makeTerminal({
    cols: snapshot.cols,
    rows: snapshot.rows,
    scrollback: snapshot.history.terminalLimit,
  });
  terminal.reset();
  await writeTerminal(terminal, snapshot.data);
  return terminal;
}

async function runCommands(model, oracle, commands) {
  for (const command of commands) {
    if (command.type === 'write') {
      model.enqueue(command.data);
    } else {
      model.resize(command.cols, command.rows);
    }
  }
  const snapshotPromise = model.requestSnapshot();

  for (const command of commands) {
    if (command.type === 'write') {
      await writeTerminal(oracle, command.data);
    } else {
      oracle.resize(command.cols, command.rows);
    }
  }
  return snapshotPromise;
}

test('worker preserves FIFO writes/resizes and replays normal buffer, Unicode and modes', async (t) => {
  const model = new TerminalStateModel({
    cols: 14,
    rows: 5,
    scrollback: 12,
    snapshotScrollback: 12,
    generation: 'normal-generation',
  });
  t.after(() => model.dispose());
  await model.ready;
  const oracle = makeTerminal({ cols: 14, rows: 5, scrollback: 12 });
  t.after(() => oracle.dispose());

  const commands = [
    { type: 'write', data: 'one\r\ntwo\r\nthree\r\nfour\r\nfive\r\n' },
    { type: 'write', data: '\x1b[38;2;10;20' },
    { type: 'write', data: ';30m彩色\ud83d' },
    { type: 'write', data: '\ude00\x1b[0m' },
    { type: 'resize', cols: 18, rows: 6 },
    {
      type: 'write',
      data: '\x1b[?1h\x1b=\x1b[?2004h\x1b[4h\x1b[?45h'
        + '\x1b[?1004h\x1b[?1003h\x1b[?1006h'
        + '\x1b[2;5r\x1b[?6h\x1b[2;4H\x1b[3 q\x1b[?25l',
    },
  ];

  const snapshot = await runCommands(model, oracle, commands);
  assert.equal(snapshot.safe, true, snapshot.reasons.join(', '));
  assert.equal(snapshot.generation, 'normal-generation');
  assert.equal(snapshot.seq, commands.length);
  assert.equal(snapshot.unicodeVersion, '11');
  assert.equal(snapshot.history.policy, 'bounded-scrollback');

  const replay = await replaySnapshot(snapshot);
  t.after(() => replay.dispose());
  assert.deepEqual(inspectTerminal(replay), inspectTerminal(oracle));
});

test('snapshot restores normal and active alternate buffers plus 1016 mouse mode', async (t) => {
  const options = {
    cols: 16,
    rows: 5,
    scrollback: 10,
    snapshotScrollback: 10,
    generation: 'alternate-generation',
  };
  const model = new TerminalStateModel(options);
  t.after(() => model.dispose());
  await model.ready;
  const oracle = makeTerminal(options);
  t.after(() => oracle.dispose());

  const commands = [
    { type: 'write', data: 'normal-A\r\nnormal-B\r\nnormal-C' },
    { type: 'write', data: '\x1b[2;4r\x1b[3;6H' },
    { type: 'write', data: '\x1b[?1049hALT界面\r\n\x1b[1;34m蓝色\x1b[0m' },
    { type: 'write', data: '\x1b[2;5r\x1b[4;7H\x1b[?1002h\x1b[?1016h\x1b[6 q' },
  ];

  const snapshot = await runCommands(model, oracle, commands);
  assert.equal(snapshot.safe, true, snapshot.reasons.join(', '));
  assert.equal(snapshot.activeBuffer, 'alternate');
  assert.equal(snapshot.mouseEncoding, 'SGR_PIXELS');

  const replay = await replaySnapshot(snapshot);
  t.after(() => replay.dispose());
  assert.deepEqual(inspectTerminal(replay), inspectTerminal(oracle));
});

test('snapshot refuses partial parser, Unicode and DEC 2026 boundaries', async (t) => {
  const model = new TerminalStateModel({
    cols: 12,
    rows: 4,
    generation: 'safety-generation',
  });
  t.after(() => model.dispose());
  await model.ready;

  assert.throws(() => model.enqueue({ invalid: true }), /string or an ArrayBuffer view/);
  assert.equal(model.seq, 0);
  assert.equal(model.enqueue('\x1b['), 1);
  let snapshot = await model.requestSnapshot();
  assert.equal(snapshot.safe, false);
  assert.ok(snapshot.reasons.includes('parser-not-ground'));

  assert.equal(model.enqueue('31mOK\x1b[0m'), 2);
  snapshot = await model.requestSnapshot();
  assert.equal(snapshot.safe, true);

  assert.equal(model.enqueue('\ud83d'), 3);
  snapshot = await model.requestSnapshot();
  assert.equal(snapshot.safe, false);
  assert.ok(snapshot.reasons.includes('utf16-codepoint-incomplete'));

  assert.equal(model.enqueue('\ude00'), 4);
  snapshot = await model.requestSnapshot();
  assert.equal(snapshot.safe, true);

  assert.equal(model.enqueue('\x1b[?2026hframe'), 5);
  snapshot = await model.requestSnapshot();
  assert.equal(snapshot.safe, false);
  assert.ok(snapshot.reasons.includes('synchronized-output-open'));
  assert.equal(snapshot.data, null);

  assert.equal(model.enqueue('\x1b[?2026l'), 6);
  snapshot = await model.requestSnapshot();
  assert.equal(snapshot.safe, true);
  assert.equal(snapshot.seq, 6);
});

test('generation/sequence request is an exact FIFO barrier, not a latest-state read', async (t) => {
  const model = new TerminalStateModel({
    cols: 20,
    rows: 3,
    generation: 'barrier-generation',
  });
  t.after(() => model.dispose());
  await model.ready;

  const bytes = new TextEncoder().encode('prefix');
  assert.equal(model.enqueue(bytes), 1);
  assert.equal(bytes.byteLength, 6, 'enqueue must not detach caller-owned memory');
  const prefixRequest = model.requestSnapshot();
  assert.equal(model.enqueue('-suffix'), 2);
  const suffixRequest = model.requestSnapshot();

  const [prefix, suffix] = await Promise.all([prefixRequest, suffixRequest]);
  assert.equal(prefix.generation, 'barrier-generation');
  assert.equal(prefix.seq, 1);
  assert.equal(suffix.seq, 2);

  const prefixReplay = await replaySnapshot(prefix);
  const suffixReplay = await replaySnapshot(suffix);
  t.after(() => prefixReplay.dispose());
  t.after(() => suffixReplay.dispose());
  assert.equal(prefixReplay.buffer.active.getLine(0).translateToString(true), 'prefix');
  assert.equal(suffixReplay.buffer.active.getLine(0).translateToString(true), 'prefix-suffix');
});

test('snapshot history is explicitly bounded independently of worker retention', async (t) => {
  const model = new TerminalStateModel({
    cols: 10,
    rows: 3,
    scrollback: 20,
    snapshotScrollback: 2,
    generation: 'bounded-generation',
  });
  t.after(() => model.dispose());
  await model.ready;

  for (let index = 0; index < 10; index += 1) {
    model.enqueue(`line-${index}\r\n`);
  }
  const snapshot = await model.requestSnapshot();
  assert.equal(snapshot.safe, true);
  assert.equal(snapshot.history.terminalLimit, 20);
  assert.equal(snapshot.history.snapshotLimit, 2);
  assert.equal(snapshot.history.includedRows, 2);

  const replay = await replaySnapshot(snapshot);
  t.after(() => replay.dispose());
  assert.ok(replay.buffer.normal.baseY <= 2);
  assert.ok(replay.buffer.normal.length <= snapshot.rows + 2);
  const text = Array.from(
    { length: replay.buffer.normal.length },
    (_, row) => replay.buffer.normal.getLine(row).translateToString(true),
  ).join('\n');
  assert.match(text, /line-9/);
  assert.doesNotMatch(text, /line-0/);
});

test('tracks outstanding UTF-8 bytes and acknowledges applied write batches', async (t) => {
  const model = new TerminalStateModel({
    cols: 20,
    rows: 4,
    generation: 'backlog-accounting-generation',
  });
  t.after(() => model.dispose());
  await model.ready;

  assert.equal(model.healthy, true);
  assert.equal(model.queuedBytes, 0);
  model.enqueue('A界😀');
  model.enqueue(Uint8Array.of(0x42, 0x43, 0x44));
  assert.equal(model.queuedBytes, 11, 'strings must be accounted as UTF-8, not UTF-16');

  const snapshot = await model.requestSnapshot();
  assert.equal(snapshot.safe, true);
  assert.equal(model.queuedBytes, 0, 'snapshot is delivered after the batch acknowledgement');
  assert.equal(model.healthy, true);
});

test('snapshot cut preserves xterm Unicode grapheme continuation for future suffix bytes', async (t) => {
  const cases = [
    { prefix: 'A', suffix: '\u0301', label: 'combining mark' },
    { prefix: 'A', suffix: '\x1b[3b', label: 'repeat preceding grapheme' },
    { prefix: '♥', suffix: '\ufe0f', label: 'variation selector' },
    { prefix: '👩', suffix: '\u200d💻', label: 'ZWJ emoji' },
    { prefix: '界', suffix: '\u0301', label: 'wide-cell combining mark' },
  ];

  for (const entry of cases) {
    const options = {
      cols: 10,
      rows: 3,
      scrollback: 10,
      snapshotScrollback: 10,
      generation: `grapheme-${entry.label}`,
    };
    const model = new TerminalStateModel(options);
    t.after(() => model.dispose());
    await model.ready;
    model.enqueue(entry.prefix);
    const snapshot = await model.requestSnapshot();
    assert.equal(snapshot.safe, true, `${entry.label}: ${snapshot.reasons.join(', ')}`);

    const oracle = makeTerminal(options);
    const replay = await replaySnapshot(snapshot);
    t.after(() => oracle.dispose());
    t.after(() => replay.dispose());
    await writeTerminal(oracle, entry.prefix);
    await Promise.all([
      writeTerminal(oracle, entry.suffix),
      writeTerminal(replay, entry.suffix),
    ]);

    assert.deepEqual(
      inspectTerminal(replay),
      inspectTerminal(oracle),
      `${entry.label} diverged after the exact suffix`,
    );
  }
});

test('snapshot restores line-feed/new-line mode for future output', async (t) => {
  const options = {
    cols: 10,
    rows: 3,
    scrollback: 10,
    generation: 'line-feed-mode-generation',
  };
  const model = new TerminalStateModel(options);
  t.after(() => model.dispose());
  await model.ready;
  const oracle = makeTerminal(options);
  t.after(() => oracle.dispose());

  const prefix = 'AB\x1b[20h';
  model.enqueue(prefix);
  await writeTerminal(oracle, prefix);
  const snapshot = await model.requestSnapshot();
  assert.equal(snapshot.safe, true, snapshot.reasons.join(', '));
  assert.equal(snapshot.modes.convertEol, true);

  const replay = await replaySnapshot(snapshot);
  t.after(() => replay.dispose());
  await Promise.all([
    writeTerminal(oracle, '\nX'),
    writeTerminal(replay, '\nX'),
  ]);
  assert.deepEqual(inspectTerminal(replay), inspectTerminal(oracle));
});

test('zero-byte writes cannot bypass the bounded command backlog', async (t) => {
  const model = new TerminalStateModel({
    cols: 10,
    rows: 3,
    maxQueuedCommands: 3,
    generation: 'command-overflow-generation',
  });
  t.after(() => model.dispose());
  await model.ready;

  model.enqueue('');
  model.enqueue('');
  model.enqueue('');
  assert.equal(model.queuedBytes, 0);
  assert.equal(model.queuedCommands, 3);
  assert.throws(
    () => model.enqueue(''),
    error => error.code === 'TERMINAL_STATE_COMMAND_OVERFLOW',
  );
  assert.equal(model.healthy, false);
  assert.equal(model.queuedCommands, 0);
});

test('backlog overflow is fatal and cannot silently skip terminal bytes', async (t) => {
  const model = new TerminalStateModel({
    cols: 10,
    rows: 3,
    maxQueuedBytes: 4,
    generation: 'backlog-overflow-generation',
  });
  t.after(() => model.dispose());
  await model.ready;

  assert.throws(
    () => model.enqueue('界界'),
    error => error.code === 'TERMINAL_STATE_BACKLOG_OVERFLOW',
  );
  assert.equal(model.healthy, false);
  assert.equal(model.queuedBytes, 0);
  assert.throws(
    () => model.enqueue('later'),
    error => error.code === 'TERMINAL_STATE_BACKLOG_OVERFLOW',
  );
  assert.throws(
    () => model.requestSnapshot(),
    error => error.code === 'TERMINAL_STATE_BACKLOG_OVERFLOW',
  );
});

test('snapshot timeout makes the model fatal and rejects every stacked request', async (t) => {
  const model = new TerminalStateModel({
    cols: 80,
    rows: 24,
    scrollback: 1000,
    generation: 'snapshot-timeout-generation',
  });
  t.after(() => model.dispose());
  await model.ready;

  // Parsing this cannot finish before a 1ms main-thread timeout. The second
  // request proves the timeout rejects the entire model rather than leaving a
  // stale serializer alive and accumulating more barriers.
  model.enqueue('x'.repeat(8 * 1024 * 1024));
  const timedOut = model.requestSnapshot({ timeoutMs: 1 });
  const stacked = model.requestSnapshot({ timeoutMs: 1000 });
  await assert.rejects(
    timedOut,
    error => error.code === 'TERMINAL_SNAPSHOT_TIMEOUT',
  );
  await assert.rejects(
    stacked,
    error => error.code === 'TERMINAL_SNAPSHOT_TIMEOUT',
  );
  assert.equal(model.healthy, false);
  assert.throws(
    () => model.enqueue('must-not-be-accepted'),
    error => error.code === 'TERMINAL_SNAPSHOT_TIMEOUT',
  );
});

test('unexpected graceful worker exit is still fatal', async (t) => {
  const model = new TerminalStateModel({
    cols: 10,
    rows: 3,
    generation: 'unexpected-exit-generation',
  });
  t.after(() => model.dispose());
  await model.ready;

  const exited = new Promise(resolve => model._worker.once('exit', resolve));
  model._worker.postMessage({
    type: 'dispose',
    generation: model.generation,
  });
  assert.equal(await exited, 0);
  assert.equal(model.healthy, false);
  assert.throws(
    () => model.enqueue('after-exit'),
    error => error.code === 'TERMINAL_STATE_WORKER_EXIT',
  );
});

test('dispose before worker readiness rejects ready instead of leaving it pending', async () => {
  const model = new TerminalStateModel({
    cols: 10,
    rows: 3,
    generation: 'dispose-before-ready-generation',
  });
  const ready = model.ready;
  const disposed = model.dispose();
  await assert.rejects(
    ready,
    error => error.code === 'TERMINAL_STATE_DISPOSED',
  );
  await disposed;
  assert.equal(model.healthy, false);
});

test('RIS replay envelope restores custom tabs and the DECSC cursor/attribute slot', async (t) => {
  const options = {
    cols: 14,
    rows: 5,
    scrollback: 8,
    snapshotScrollback: 8,
    generation: 'ris-envelope-generation',
  };
  const model = new TerminalStateModel(options);
  t.after(() => model.dispose());
  await model.ready;
  const oracle = makeTerminal(options);
  t.after(() => oracle.dispose());

  const commands = [
    { type: 'write', data: 'screen-state' },
    {
      type: 'write',
      data: '\x1b[3g\x1b[4G\x1bH\x1b[10G\x1bH'
        + '\x1b[2;6H\x1b[1;32;44m\x1b[1"q\x1b7'
        + '\x1b[0m\x1b[0"q\x1b[4;2H',
    },
  ];
  const snapshot = await runCommands(model, oracle, commands);
  assert.equal(snapshot.safe, true, snapshot.reasons.join(', '));
  assert.deepEqual(snapshot.buffers.normal.tabStops, [3, 9]);
  assert.deepEqual(snapshot.buffers.normal.savedCursor, { x: 5, y: 1 });

  const replay = await replaySnapshot(snapshot);
  t.after(() => replay.dispose());
  assert.deepEqual(inspectTerminal(replay), inspectTerminal(oracle));

  // ESC 8 and HT exercise future parser behavior, not merely static cells.
  const suffix = '\x1b8S\tT';
  await Promise.all([
    writeTerminal(oracle, suffix),
    writeTerminal(replay, suffix),
  ]);
  assert.deepEqual(inspectTerminal(replay), inspectTerminal(oracle));
});

test('non-default charset state is explicitly unsafe and OSC/image omissions are declared', async (t) => {
  const model = new TerminalStateModel({
    cols: 12,
    rows: 4,
    generation: 'unsupported-state-generation',
  });
  t.after(() => model.dispose());
  await model.ready;

  model.enqueue('\x1b(0');
  let snapshot = await model.requestSnapshot();
  assert.equal(snapshot.safe, false);
  assert.ok(snapshot.reasons.includes('charset-non-default'));
  assert.deepEqual(snapshot.limitations, {
    oscTitle: false,
    oscPalette: false,
    historicalHyperlinks: false,
    inlineImages: false,
    note: 'These presentation-side OSC/image features are outside the authoritative parser-state contract.',
  });

  // Current G0 is returned to ASCII, but DECSC retains the line-drawing map.
  model.enqueue('\x1b7\x1b(B');
  snapshot = await model.requestSnapshot();
  assert.equal(snapshot.safe, false);
  assert.ok(snapshot.reasons.includes('normal-saved-charset-non-default'));
});

test('snapshot rejects retained cell state that SerializeAddon drops', async (t) => {
  const model = new TerminalStateModel({
    cols: 12,
    rows: 4,
    generation: 'retained-cell-attributes-generation',
  });
  t.after(() => model.dispose());
  await model.ready;

  model.enqueue('\x1b[1"qA\x1b[0"qB');
  let snapshot = await model.requestSnapshot();
  assert.equal(snapshot.safe, false);
  assert.ok(snapshot.reasons.includes('normal-protected-cells'));

  model.enqueue('\x1bc\x1b[4:3;58:2::255:0:0mA\x1b[0mB');
  snapshot = await model.requestSnapshot();
  assert.equal(snapshot.safe, false);
  assert.ok(snapshot.reasons.includes('normal-extended-cells'));
});
