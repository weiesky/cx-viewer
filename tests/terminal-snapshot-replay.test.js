import test from 'node:test';
import assert from 'node:assert/strict';
import headless from '@xterm/headless';
import unicode11 from '@xterm/addon-unicode11';

import { TerminalStateModel } from '../lib/terminal-state-model.js';
import { INBAND_RESET } from '../src/utils/terminalWriteQueue.js';
import { replayTerminalSnapshot } from '../src/utils/terminalSnapshotReplay.js';

const { Terminal } = headless;
const { Unicode11Addon } = unicode11;

function replay(snapshot, initial = { cols: 80, rows: 24 }) {
  const events = [];
  const terminal = {
    ...initial,
    resize(cols, rows) {
      events.push(['resize', cols, rows]);
      this.cols = cols;
      this.rows = rows;
    },
  };
  const writeQueue = {
    reset() { events.push(['reset']); },
    push(data) { events.push(['push', data]); },
  };
  const applied = replayTerminalSnapshot({ terminal, writeQueue, snapshot });
  return { applied, events };
}

function makeHeadless(cols, rows) {
  const terminal = new Terminal({ allowProposedApi: true, cols, rows, scrollback: 100 });
  terminal.loadAddon(new Unicode11Addon());
  terminal.unicode.activeVersion = '11';
  return terminal;
}

function writeTerminal(terminal, data) {
  return new Promise((resolve, reject) => {
    try { terminal.write(data, resolve); } catch (error) { reject(error); }
  });
}

test('snapshot replay applies its exact geometry before one atomic reset plus serialization', () => {
  const snapshot = { cols: 100, rows: 30, data: '\x1b[?2004hSCREEN' };
  const { applied, events } = replay(snapshot);
  assert.equal(applied, true);
  assert.deepEqual(events, [
    ['resize', 100, 30],
    ['reset'],
    ['push', INBAND_RESET + snapshot.data],
  ]);

  const sameGeometry = replay({ cols: 80, rows: 24, data: 'SAME' });
  assert.deepEqual(sameGeometry.events, [
    ['reset'],
    ['push', INBAND_RESET + 'SAME'],
  ]);
});

test('in-band reset always exits sync output and alternate buffer before clearing normal', async (t) => {
  const syncEnd = INBAND_RESET.indexOf('\x1b[?2026l');
  const normal = INBAND_RESET.indexOf('\x1b[?1049l');
  const clear = INBAND_RESET.indexOf('\x1b[2J');
  assert.ok(syncEnd >= 0);
  assert.ok(normal > syncEnd);
  assert.ok(clear > normal);

  const target = makeHeadless(20, 4);
  t.after(() => target.dispose());
  await writeTerminal(target, '\x1b[?1049h\x1b[?2026hDIRTY-ALT');
  await writeTerminal(target, INBAND_RESET);
  assert.equal(target.buffer.active.type, 'normal');
  assert.equal(target.modes.synchronizedOutputMode, false);
});

test('real xterm oracle restores canonical normal/alternate buffers and modes from either target buffer', async (t) => {
  const sourceCommands = [
    {
      active: 'normal',
      data: 'SOURCE-NORMAL\r\n彩色'
        + '\x1b[?1h\x1b[?2004h\x1b[?1000h\x1b[?1006h\x1b[?25l',
    },
    {
      active: 'alternate',
      data: 'SOURCE-NORMAL\r\n'
        + '\x1b[?1049hSOURCE-ALTERNATE'
        + '\x1b[?1h\x1b[?2004h\x1b[?1002h\x1b[?1016h\x1b[?25l',
    },
  ];

  for (const source of sourceCommands) {
    const model = new TerminalStateModel({ cols: 30, rows: 6, scrollback: 100 });
    t.after(() => model.dispose());
    await model.ready;
    model.enqueue(source.data);
    const snapshot = await model.requestSnapshot();
    assert.equal(snapshot.safe, true, snapshot.reasons.join(', '));
    assert.equal(snapshot.activeBuffer, source.active);

    for (const targetActive of ['normal', 'alternate']) {
      const target = makeHeadless(snapshot.cols, snapshot.rows);
      t.after(() => target.dispose());
      const dirty = targetActive === 'alternate'
        ? 'DIRTY-NORMAL\x1b[?1049hDIRTY-ALTERNATE\x1b[?2004l\x1b[?25h'
        : 'DIRTY-NORMAL\x1b[?2004l\x1b[?25h';
      await writeTerminal(target, dirty);
      await writeTerminal(target, INBAND_RESET + snapshot.data);

      assert.equal(target.buffer.active.type, source.active,
        `${targetActive} target must restore ${source.active}`);
      assert.deepEqual({
        ...target.modes,
        convertEol: Boolean(target._core.optionsService.rawOptions.convertEol),
      }, snapshot.modes);
      assert.equal(
        target._core.coreMouseService._activeEncoding,
        snapshot.mouseEncoding,
      );
      assert.equal(!target._core.coreService.isCursorHidden, snapshot.cursor.visible);
      const normalText = Array.from(
        { length: target.buffer.normal.length },
        (_, row) => target.buffer.normal.getLine(row).translateToString(true),
      ).join('\n');
      assert.match(normalText, /SOURCE-NORMAL/);
      assert.doesNotMatch(normalText, /DIRTY-NORMAL/);
      if (source.active === 'alternate') {
        const alternateText = Array.from(
          { length: target.buffer.alternate.length },
          (_, row) => target.buffer.alternate.getLine(row).translateToString(true),
        ).join('\n');
        assert.match(alternateText, /SOURCE-ALTERNATE/);
        assert.doesNotMatch(alternateText, /DIRTY-ALTERNATE/);
      }
    }
  }
});
