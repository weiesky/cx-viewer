import { isMainAgent } from './contentFilter.js';
import { getMainAgentSessionKey } from './clearCheckpoint.js';
import { formatToolAsXml } from './toolsXmlFormatter.js';
import { getResponseTools } from '../../lib/openai-body.js';

function chooseLatestMainAgentRequestWithTools(requests) {
  if (!Array.isArray(requests) || requests.length === 0) return null;

  // The live log can append a valid MainAgent frame whose request body only
  // carries a delta/repeated payload and therefore has no tools declaration.
  // Treat that frame as the current-session anchor, then reuse the nearest
  // non-empty declaration from the SAME Codex thread. Previously we selected
  // the anchor first and returned [] immediately, which made the whole tools
  // section flicker out until a later full request arrived.
  let anchor = null;
  for (let i = requests.length - 1; i >= 0; i--) {
    if (isMainAgent(requests[i])) {
      anchor = requests[i];
      break;
    }
  }
  if (!anchor) return null;

  const anchorKey = getMainAgentSessionKey(anchor);
  for (let i = requests.length - 1; i >= 0; i--) {
    const request = requests[i];
    if (!isMainAgent(request)) continue;

    // A known thread id/lane is authoritative. When neither side has a key,
    // the entries are from the legacy capture format and remain compatible.
    // Never borrow tools from a differently identified session.
    const requestKey = getMainAgentSessionKey(request);
    const sameSession = anchorKey
      ? requestKey === anchorKey
      : requestKey == null;
    if (!sameSession) continue;

    const tools = getResponseTools(request?.body);
    if (Array.isArray(tools) && tools.length > 0) return request;
  }
  return null;
}

export function extractLoadedTools(requests) {
  const chosen = chooseLatestMainAgentRequestWithTools(requests);
  const tools = getResponseTools(chosen?.body);
  if (!Array.isArray(tools) || tools.length === 0) return [];
  return tools.map(formatToolAsXml).filter(Boolean);
}
