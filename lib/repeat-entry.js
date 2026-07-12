// Shared disk-log repeat markers. Keep this module browser-safe: it is used by
// Node log readers and by AppBase when a live watcher starts after the base
// record was already loaded.

export const METADATA_MODELS_REPEAT = 'metadata-models';

export function isMetadataModelsEntry(entry) {
  if (!entry) return false;
  const method = String(entry.method || 'GET').toUpperCase();
  if (method !== 'GET') return false;
  for (const value of [entry.proxyUrl, entry.url]) {
    if (!value) continue;
    try {
      const pathname = new URL(value).pathname.replace(/\/+$/, '');
      if (pathname === '/backend-api/codex/models'
          || pathname.endsWith('/codex/models')
          || pathname === '/v1/models') return true;
    } catch {
      if (/\/(?:backend-api\/)?codex\/models(?:[?#]|$)/.test(String(value))
          || /\/v1\/models(?:[?#]|$)/.test(String(value))) return true;
    }
  }
  return false;
}

export function isMetadataModelsRepeatMarker(entry) {
  return entry?._cxvRepeat === METADATA_MODELS_REPEAT
    && typeof entry.timestamp === 'string'
    && !!entry.timestamp;
}

export function createRepeatEntryExpander() {
  let modelCatalogBase = null;
  return {
    process(entry) {
      if (!entry) return entry;
      if (isMetadataModelsRepeatMarker(entry)) {
        if (!modelCatalogBase) return entry;
        return {
          ...modelCatalogBase,
          timestamp: entry.timestamp,
          _cxvRepeated: METADATA_MODELS_REPEAT,
        };
      }
      if (isMetadataModelsEntry(entry)) {
        // The completed record follows the in-progress record and becomes the
        // authoritative base. A full in-progress record is still a useful live
        // fallback when no completed response has arrived yet.
        modelCatalogBase = entry;
      }
      return entry;
    },
    reset() {
      modelCatalogBase = null;
    },
    hasBase() {
      return modelCatalogBase !== null;
    },
  };
}

export function expandRepeatEntries(entries) {
  const expander = createRepeatEntryExpander();
  return (entries || []).map(entry => expander.process(entry));
}
