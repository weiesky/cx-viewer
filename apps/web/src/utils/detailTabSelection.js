import { getCodexMcpToolUseName, getCodexToolUseName } from "@cxv/core/requestType";

export function requestHidesContextTab(request) {
  return getCodexToolUseName(request) !== null
    || getCodexMcpToolUseName(request) !== null;
}

/** Keep the selected detail tab valid when the selected request changes. */
export function resolveDetailTabForRequest(currentTab, request) {
  const hidesContext = requestHidesContextTab(request);
  if (currentTab === 'raw' && !request?._codexRaw) {
    return hidesContext ? 'request' : 'context';
  }
  if (currentTab === 'context' && hidesContext) return 'request';
  return currentTab;
}
