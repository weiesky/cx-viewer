import { isMainAgent } from './contentFilter.js';
import { getMainAgentSessionKey } from './clearCheckpoint.js';
import { formatToolAsXml } from './toolsXmlFormatter.js';
import { getResponseToolDeclaration } from '../../lib/openai-body.js';

function getEntryToolDeclaration(request) {
  const direct = getResponseToolDeclaration(request?.body);
  if (direct.declared) return direct;
  if (Array.isArray(request?._loadedTools)) {
    return { declared: true, tools: request._loadedTools };
  }
  return { declared: false, tools: [] };
}

function getInternalSessionId(request) {
  const value = request?._sessionId;
  return value === null || value === undefined || value === '' ? null : String(value);
}

function chooseLatestMainAgentTools(requests) {
  if (!Array.isArray(requests) || requests.length === 0) return [];

  // The live log can append a valid MainAgent frame whose request body only
  // carries a delta/repeated payload and therefore has no tools declaration.
  // Treat that frame as the current-session anchor, then reuse the nearest
  // non-empty declaration from the SAME logical session. Previously we selected
  // the anchor first and returned [] immediately, which made the whole tools
  // section flicker out until a later full request arrived.
  let anchor = null;
  for (let i = requests.length - 1; i >= 0; i--) {
    if (isMainAgent(requests[i]) && requests[i]?._otelSource !== true) {
      anchor = requests[i];
      break;
    }
  }
  if (!anchor) return [];

  const anchorSessionId = getInternalSessionId(anchor);
  const anchorKey = getMainAgentSessionKey(anchor);
  for (let i = requests.length - 1; i >= 0; i--) {
    const request = requests[i];
    if (!isMainAgent(request) || request?._otelSource === true) continue;

    // `_sessionId` is the strongest boundary available in the normalized live
    // stream. It prevents /clear or another logical epoch in the same Codex
    // thread from lending its tools to the current session. Legacy captures do
    // not have it, so they retain the durable thread/lane fallback.
    const requestSessionId = getInternalSessionId(request);
    const requestKey = getMainAgentSessionKey(request);
    const sameSession = anchorSessionId !== null
      ? requestSessionId === anchorSessionId
      : (anchorKey ? requestKey === anchorKey : requestKey == null);
    if (!sameSession) continue;

    const declaration = getEntryToolDeclaration(request);
    // Explicit [] means the current session intentionally has no tools. Stop
    // here instead of borrowing the previous non-empty declaration.
    if (declaration.declared) return declaration.tools;
  }
  return [];
}

export function extractLoadedTools(requests) {
  const tools = chooseLatestMainAgentTools(requests);
  if (!Array.isArray(tools) || tools.length === 0) return [];
  return tools.map(formatToolAsXml).filter(Boolean);
}
