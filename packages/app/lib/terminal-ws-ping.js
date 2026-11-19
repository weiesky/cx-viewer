export const TERMINAL_WS_PING_MS = 25_000;

// Browsers can observe these app-level frames, unlike WS control pings.
export function attachTerminalWsPing(ws, { setI = setInterval, clearI = clearInterval } = {}) {
  const ping = () => {
    if (ws.readyState !== 1) return;
    try { ws.send(JSON.stringify({ type: 'ping' })); }
    catch (error) { console.warn('[CX Viewer] Terminal heartbeat failed:', error.message); }
  };
  ping();
  const timer = setI(ping, TERMINAL_WS_PING_MS);
  timer.unref?.();
  const dispose = () => { clearI(timer); ws.off('close', dispose); };
  ws.once('close', dispose);
  return dispose;
}
