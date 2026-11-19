const KEY = 'cxv_sdkScratchOpen';

export function readSdkScratchOpen(storage) {
  try { return (storage || globalThis.localStorage).getItem(KEY) === 'true'; }
  catch { return false; }
}

export function saveSdkScratchOpen(open, storage) {
  try { (storage || globalThis.localStorage).setItem(KEY, String(!!open)); }
  catch {}
}
