import { reportSwallowed } from './errorReport.js';

// xterm's screen covers its native viewport. Reuse the main terminal's
// pixel accumulation and inertia for scratch, through the public scroll API.
export function attachMobileTouchScroll(terminal, container) {
  const screen = container?.querySelector('.xterm-screen');
  if (!screen || !terminal) return null;
  let disposed = false, scrollFrame = null, momentumFrame = null;
  let lastY = 0, lastTime = 0, finger = null;
  let pending = 0, remainder = 0, samples = [];
  const lineHeight = () => terminal._core?._renderService?.dimensions?.css?.cell?.height || 15;
  const scroll = lines => {
    if (disposed || !lines) return;
    try { terminal.scrollLines(lines); }
    catch (error) { reportSwallowed('term.mobile-touch-scroll.scrollLines', error); }
  };
  const stop = () => {
    if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
    if (momentumFrame !== null) cancelAnimationFrame(momentumFrame);
    scrollFrame = momentumFrame = null;
    pending = remainder = 0;
    samples = [];
  };
  const anchor = touch => {
    finger = touch?.identifier ?? null;
    if (touch) lastY = touch.clientY;
    lastTime = performance.now();
  };
  const flush = () => {
    scrollFrame = null;
    if (disposed) return;
    remainder += pending;
    pending = 0;
    const height = lineHeight(), lines = Math.trunc(remainder / height);
    scroll(lines);
    remainder -= lines * height;
  };
  const start = event => {
    if (disposed) return;
    stop();
    anchor(event.touches[0]);
  };
  const move = event => {
    if (disposed) return;
    const touch = event.touches[0];
    if (event.touches.length !== 1 || (touch.identifier ?? null) !== finger) {
      // Pinch/multi-finger transitions must never reuse velocity or a stale
      // single-finger anchor (upstream 2ea5181df8).
      stop(); anchor(touch); return;
    }
    const now = performance.now(), delta = lastY - touch.clientY, elapsed = now - lastTime;
    if (elapsed > 0) samples.push({ velocity: delta / elapsed * 16, time: now });
    samples = samples.filter(sample => now - sample.time <= 100);
    pending += delta;
    if (scrollFrame === null) scrollFrame = requestAnimationFrame(flush);
    anchor(touch);
  };
  const cancel = event => {
    if (disposed) return;
    if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
    flush(); stop(); anchor(event.touches[0]);
  };
  const end = event => {
    if (disposed) return;
    if (event.touches.length) { cancel(event); return; }
    if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
    flush();
    const now = performance.now();
    samples = samples.filter(sample => now - sample.time <= 100);
    let weighted = 0, weight = 0;
    if (samples.length >= 2) {
      for (const sample of samples) {
        const w = Math.max(0, 1 - (now - sample.time) / 100);
        weighted += sample.velocity * w; weight += w;
      }
    }
    let velocity = weight ? weighted / weight : 0;
    samples = [];
    finger = null;
    if (Math.abs(velocity) < 0.5) return;
    let momentum = 0;
    const tick = () => {
      momentumFrame = null;
      if (disposed) return;
      const height = lineHeight();
      if (Math.abs(velocity) < 0.3) { scroll(Math.round(momentum / height)); return; }
      momentum += velocity;
      const lines = Math.trunc(momentum / height);
      scroll(lines); momentum -= lines * height;
      velocity *= 0.95;
      momentumFrame = requestAnimationFrame(tick);
    };
    momentumFrame = requestAnimationFrame(tick);
  };
  const listeners = { touchstart: start, touchmove: move, touchend: end, touchcancel: cancel };
  for (const [type, listener] of Object.entries(listeners)) screen.addEventListener(type, listener, { passive: true });
  return () => {
    disposed = true;
    stop();
    for (const [type, listener] of Object.entries(listeners)) screen.removeEventListener(type, listener);
  };
}
