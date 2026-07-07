/**
 * Single source of truth for the built-in tool catalog.
 *
 * `TOOL_CATALOG` is an ordered, function-grouped list of built-in or
 * compatibility tool docs. It drives:
 *   - the "all tools" catalog modal (src/components/common/ToolsHelp.jsx)
 *   - the Tool-* whitelist in ConceptHelp (src/components/common/ConceptHelp.jsx)
 *
 * Keep this in sync with the shipped Tool-*.md docs. English and Chinese docs
 * are authoritative; other locales fall back through the concept API.
 *
 * Category `key` maps to i18n `ui.toolCatalog.cat.<key>` in src/i18n.js.
 */
export const TOOL_CATALOG = [
  { key: 'agent',    tools: ['Agent', 'Task', 'SendMessage'] },
  { key: 'file',     tools: ['FileChange', 'Read', 'Edit', 'Write', 'NotebookEdit', 'ImageView'] },
  { key: 'search',   tools: ['Glob', 'Grep'] },
  { key: 'terminal', tools: ['Bash'] },
  { key: 'web',      tools: ['WebFetch', 'WebSearch'] },
  { key: 'integration', tools: ['MCPToolCall', 'DynamicToolCall'] },
  { key: 'planning', tools: ['EnterPlanMode', 'ExitPlanMode', 'AskUserQuestion', 'Skill'] },
  { key: 'worktree', tools: ['EnterWorktree'] },
  { key: 'ide',      tools: ['getDiagnostics', 'executeCode'] },
];

// Flat list of all tool names — order follows TOOL_CATALOG.
export const ALL_TOOL_NAMES = TOOL_CATALOG.flatMap((c) => c.tools);
