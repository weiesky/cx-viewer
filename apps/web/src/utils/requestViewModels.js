/**
 * Compatibility seam between the legacy full-entry state and the V2 wire
 * stores.  The legacy path intentionally keeps the existing entry references;
 * later V2 stages replace each lane independently without changing consumers
 * all at once.
 */

function legacyRowHandle(entry, index) {
  const timestamp = typeof entry?.timestamp === 'string' ? entry.timestamp : '';
  const url = typeof entry?.url === 'string' ? entry.url : '';
  return `legacy:${timestamp}\u0000${url}\u0000${index}`;
}
export function buildLegacyRequestViewModels({ requests, filteredRequests, selectedIndex }) {
  const all = Array.isArray(requests) ? requests : [];
  const visible = Array.isArray(filteredRequests) ? filteredRequests : [];
  const hydratedEntryStore = new Map();
  const requestDescriptors = visible.map((entry, index) => {
    const handle = legacyRowHandle(entry, index);
    hydratedEntryStore.set(handle, entry);
    return Object.freeze({ handle, legacyEntry: entry });
  });
  const selectedDescriptor = selectedIndex == null ? null : requestDescriptors[selectedIndex] || null;

  return Object.freeze({
    // These aliases preserve the current UI contract during P0.  V2 replaces
    // them with independently-owned projections in later stages.
    requestDescriptors: Object.freeze(requestDescriptors),
    conversationProjection: visible,
    hydratedEntryStore,
    selectedRowHandle: selectedDescriptor?.handle || null,
    selectedRequest: selectedDescriptor
      ? hydratedEntryStore.get(selectedDescriptor.handle) || null
      : null,
    allRequests: all,
  });
}
