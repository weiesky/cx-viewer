import { INBAND_RESET } from './terminalWriteQueue.js';

/**
 * Install a canonical terminal snapshot into xterm.
 *
 * Geometry is applied before any replay bytes: a serialized screen is only
 * meaningful on the grid that produced it. The reset and serialization are
 * pushed as one in-band item so xterm's async WriteBuffer cannot interleave a
 * live suffix between them. The serializer is responsible for explicitly
 * restoring source modes (including alternate buffer, cursor and input modes).
 */
export function replayTerminalSnapshot({ terminal, writeQueue, snapshot }) {
  if (!terminal || !writeQueue || typeof snapshot?.data !== 'string') return false;
  if (!Number.isSafeInteger(snapshot.cols) || snapshot.cols <= 0
    || !Number.isSafeInteger(snapshot.rows) || snapshot.rows <= 0) return false;

  try {
    if (terminal.cols !== snapshot.cols || terminal.rows !== snapshot.rows) {
      terminal.resize(snapshot.cols, snapshot.rows);
    }
    writeQueue.reset();
    writeQueue.push(INBAND_RESET + snapshot.data);
    return true;
  } catch {
    return false;
  }
}
