/**
 * Single source of truth for the built-in tool catalog.
 *
 * `TOOL_CATALOG` is an ordered, function-grouped list of every built-in tool
 * that ships a concept doc at `concepts/<lang>/Tool-<name>.md`. It drives:
 *   - the "all tools" catalog modal (src/components/common/ToolsHelp.jsx)
 *   - the Tool-* whitelist in ConceptHelp (src/components/common/ConceptHelp.jsx)
 *
 * Keep this in sync with the shipped Tool-*.md docs — the guard test
 * `test/tool-catalog-concepts.test.js` fails if any catalog tool lacks a doc
 * in any language directory.
 *
 * Category `key` maps to i18n `ui.toolCatalog.cat.<key>` in src/i18n.js.
 */
export const TOOL_CATALOG = [
  { key: 'agent',    tools: ['Agent', 'TaskCreate', 'TaskGet', 'TaskUpdate', 'TaskList', 'TaskOutput', 'TaskStop'] },
  { key: 'team',     tools: ['TeamCreate', 'TeamDelete', 'SendMessage', 'Workflow', 'Monitor'] },
  { key: 'file',     tools: ['Read', 'Edit', 'Write', 'NotebookEdit'] },
  { key: 'search',   tools: ['Glob', 'Grep', 'ToolSearch'] },
  { key: 'terminal', tools: ['Bash'] },
  { key: 'web',      tools: ['WebFetch', 'WebSearch'] },
  { key: 'planning', tools: ['EnterPlanMode', 'ExitPlanMode', 'AskUserQuestion', 'Skill'] },
  { key: 'worktree', tools: ['EnterWorktree', 'ExitWorktree'] },
  { key: 'schedule', tools: ['CronCreate', 'CronDelete', 'CronList', 'ScheduleWakeup', 'PushNotification', 'RemoteTrigger'] },
  { key: 'ide',      tools: ['getDiagnostics', 'executeCode', 'LSP'] },
];

// Flat list of all tool names (37) — order follows TOOL_CATALOG.
export const ALL_TOOL_NAMES = TOOL_CATALOG.flatMap((c) => c.tools);
