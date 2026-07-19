import { getInputItemText, getInstructionsText, getResponseConversationItems, getResponseInstructions, getResponseTools } from './openai-body.js';
import { isOpenAiResponsesMasterEntry } from './openai-responses-url.js';

const SUBAGENT_INSTRUCTIONS_RE = /command execution specialist|file search specialist|planning specialist|general-purpose agent|security monitor|performing a web search/i;
const TEAMMATE_INSTRUCTIONS_RE = /running as an agent in a team|Agent Teammate Communication/i;
const CURRENT_CODEX_TOOL_NAMES = new Set([
  'shell_command',
  'apply_patch',
  'view_image',
  'update_plan',
  'request_user_input',
  'get_goal',
  'create_goal',
  'update_goal',
  'tool_search',
  'list_mcp_resources',
  'list_mcp_resource_templates',
  'read_mcp_resource',
  'web_search',
  'image_generation',
]);

function getToolName(tool) {
  if (!tool || typeof tool !== 'object') return null;
  return tool.name || tool.type || tool.function?.name || null;
}

export function isMainAgentEntry(entry) {
  if (!entry) return false;
  if (isOpenAiResponsesMasterEntry(entry)) return false;

  if (entry.teammate) return false;
  const instructionsText = getInstructionsText(entry.body || {});
  if (TEAMMATE_INSTRUCTIONS_RE.test(instructionsText)) return false;

  if (entry.mainAgent === true) {
    if (SUBAGENT_INSTRUCTIONS_RE.test(instructionsText)) return false;
    return true;
  }

  const body = entry.body || {};
  const instructions = getResponseInstructions(body);
  const tools = getResponseTools(body);
  if (!instructions || tools.length === 0) return false;

  if (!instructionsText.includes('You are Codex')) return false;
  if (SUBAGENT_INSTRUCTIONS_RE.test(instructionsText)) return false;

  const isInstructionsArray = Array.isArray(instructions);
  const toolNames = new Set(tools.map(getToolName).filter(Boolean));
  const hasToolSearch = toolNames.has('ToolSearch') || toolNames.has('tool_search');
  if (isInstructionsArray && hasToolSearch) {
    const input = getResponseConversationItems(body);
    const firstInputContent = input.length > 0 ? getInputItemText(input[0]) : '';
    if (firstInputContent.includes('<available-deferred-tools>')) return true;
  }

  for (const name of CURRENT_CODEX_TOOL_NAMES) {
    if (toolNames.has(name)) return true;
  }

  if (tools.length > 5) {
    const hasPatch = toolNames.has('apply_patch');
    const hasShell = toolNames.has('shell_command');
    const hasDiscovery = toolNames.has('tool_search');
    if (hasPatch && hasShell && hasDiscovery) return true;
  }

  return false;
}
