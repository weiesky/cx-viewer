/**
 * Single source of truth for the built-in tool catalog.
 *
 * `TOOL_CATALOG` is an ordered, function-grouped list of the currently loaded
 * Codex request-body tools. It drives:
 *   - the "all tools" catalog modal (src/components/common/ToolsHelp.jsx)
 *   - the Tool-* whitelist in ConceptHelp (src/components/common/ConceptHelp.jsx)
 *
 * Keep this in sync with the shipped Tool-*.md docs. English and Chinese docs
 * are authoritative; other locales fall back through the concept API.
 *
 * Category `key` maps to i18n `ui.toolCatalog.cat.<key>` in src/i18n.js.
 */
export const TOOL_CATALOG = [
  { key: 'codeMode', tools: ['exec', 'wait'] },
  { key: 'terminal', tools: ['shell_command'] },
  { key: 'file', tools: ['apply_patch', 'view_image'] },
  { key: 'planning', tools: ['update_plan', 'request_user_input', 'get_goal', 'create_goal', 'update_goal'] },
  {
    key: 'team',
    tools: ['spawn_agent', 'send_message', 'followup_task', 'wait_agent', 'interrupt_agent', 'list_agents'],
  },
  {
    key: 'integration',
    tools: ['tool_search', 'list_mcp_resources', 'list_mcp_resource_templates', 'read_mcp_resource'],
  },
  { key: 'web', tools: ['web_search', 'image_generation'] },
];

// Flat list of all tool names — order follows TOOL_CATALOG.
export const ALL_TOOL_NAMES = TOOL_CATALOG.flatMap((c) => c.tools);
