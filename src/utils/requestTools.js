import { isMainAgent } from './contentFilter.js';
import { formatToolAsXml } from './toolsXmlFormatter.js';
import { getResponseTools } from '../../lib/openai-body.js';

function chooseLatestMainAgentRequest(requests) {
  if (!Array.isArray(requests) || requests.length === 0) return null;
  if (requests.length === 1) return requests[0];
  for (let i = requests.length - 1; i >= 0; i--) {
    if (isMainAgent(requests[i])) return requests[i];
  }
  return null;
}

export function extractLoadedTools(requests) {
  const chosen = chooseLatestMainAgentRequest(requests);
  const tools = getResponseTools(chosen?.body);
  if (!Array.isArray(tools) || tools.length === 0) return [];
  return tools.map(formatToolAsXml).filter(Boolean);
}
