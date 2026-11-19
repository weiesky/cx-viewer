import { reportSwallowed } from './errorReport.js';

// Measure the xterm host: tab rails, keybars and the soft keyboard are already
// excluded by the flex layout. Keep the existing phone policy of 60 columns.
export function computeMobileFixedLayout(terminal, container) {
  const cell = terminal?._core?._renderService?.dimensions?.css?.cell;
  const width = container?.clientWidth;
  const height = container?.clientHeight;
  const currentSize = terminal?.options.fontSize;
  if (![width, height, currentSize, cell?.width, cell?.height]
    .every(value => Number.isFinite(value) && value > 0)) return null;
  const fontSize = Math.floor(currentSize * width / (60 * cell.width) * 10) / 10;
  if (fontSize <= 0) return null;
  const rows = Math.max(5, Math.min(100, Math.floor(height / (cell.height * fontSize / currentSize))));
  return { fontSize, cols: 60, rows };
}

// Share measurement, bounded renderer readiness retries, and cleanup between
// main PTY and scratch. The caller owns xterm and its resize protocol.
export function watchMobileFixedLayout(terminal, container, { isAlive, onResized } = {}) {
  let disposed = false;
  let frame = null;
  let retry = null;
  const alive = () => !disposed && (!isAlive || isAlive());
  const cancelPending = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    if (retry !== null) clearTimeout(retry);
    frame = retry = null;
  };
  const measure = (attempt = 0) => {
    frame = null;
    retry = null;
    if (!alive()) return;
    // Hidden tabs wait for refit/ResizeObserver, rather than polling forever.
    if (!(container?.clientWidth > 0 && container?.clientHeight > 0)) return;
    const layout = computeMobileFixedLayout(terminal, container);
    if (!layout) {
      if (attempt < 40) retry = setTimeout(() => measure(attempt + 1), 50);
      return;
    }
    terminal.options.fontSize = layout.fontSize;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (!alive()) return;
      const measured = computeMobileFixedLayout(terminal, container);
      if (!measured) return;
      const changed = terminal.cols !== measured.cols || terminal.rows !== measured.rows;
      try {
        if (changed) terminal.resize(measured.cols, measured.rows);
        onResized?.(changed);
      } catch (error) { reportSwallowed('term.mobile-fixed-layout.resize', error); }
    });
  };
  const resize = () => {
    cancelPending();
    if (alive()) frame = requestAnimationFrame(() => measure());
  };
  const observer = new ResizeObserver(resize);
  if (container) observer.observe(container);
  const viewport = window.visualViewport || window;
  viewport.addEventListener('resize', resize);
  return {
    resize,
    dispose() {
      disposed = true;
      cancelPending();
      observer.disconnect();
      viewport.removeEventListener('resize', resize);
    },
  };
}
