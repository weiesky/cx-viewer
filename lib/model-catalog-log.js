import { createHash } from 'node:crypto';
import {
  isMetadataModelsEntry,
  METADATA_MODELS_REPEAT,
} from './repeat-entry.js';

function endpointKey(entry) {
  return String(entry?.proxyUrl || entry?.url || '');
}

function contentSignature(entry) {
  const stable = JSON.stringify({
    endpoint: endpointKey(entry),
    method: String(entry?.method || 'GET').toUpperCase(),
    body: entry?.body ?? null,
    status: entry?.response?.status ?? null,
    responseBody: entry?.response?.body ?? null,
  });
  return createHash('sha256').update(stable).digest('hex');
}

function marker(timestamp) {
  return { timestamp, _cxvRepeat: METADATA_MODELS_REPEAT };
}

/**
 * Compact only a consecutive run of model-catalog records. The first completed
 * response is the base. In-progress catalog polling records are always skipped;
 * a changed completed response is written in full and becomes the new base.
 */
export function createModelCatalogLogCompactor() {
  let baseEndpoint = null;
  let baseSignature = null;

  return {
    process(entry) {
      if (!isMetadataModelsEntry(entry)) {
        baseEndpoint = null;
        baseSignature = null;
        return entry;
      }

      const endpoint = endpointKey(entry);
      if (baseEndpoint && endpoint !== baseEndpoint) {
        baseEndpoint = null;
        baseSignature = null;
      }

      if (entry.inProgress) {
        return null;
      }

      const signature = contentSignature(entry);
      if (baseSignature && endpoint === baseEndpoint && signature === baseSignature) {
        return marker(entry.timestamp);
      }

      baseEndpoint = endpoint;
      baseSignature = signature;
      return entry;
    },
    reset() {
      baseEndpoint = null;
      baseSignature = null;
    },
  };
}
