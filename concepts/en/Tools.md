# Codex Tools Overview

CX Viewer now treats the Codex app-server protocol as the primary source of truth. A "tool" in the UI may come from a native `ThreadItem`, a JSON-RPC server request, an MCP/dynamic integration, or an imported legacy SDK log. This page separates those cases so the catalog does not imply that every old Claude-style tool exists as a current Codex-native item.

## Sources Checked

- Codex manual: subagents, MCP, app-server, sandbox/approval, web search, and skills sections.
- Generated app-server schema: `ThreadItem`, `CollabAgentTool`, and server request shapes.
- CX Viewer bridge: `lib/appserver-bridge.js` mappings from Codex items into `tool_use` / `tool_result`.
- Existing SDK/import compatibility paths in the viewer.

## Codex-Native Tool Events

| Tool doc | Codex source / wire item | CX Viewer display | Status |
|----------|---------------------------|-------------------|--------|
| [Bash](Tool-Bash.md) | `ThreadItem.type = "commandExecution"` | `Bash` | Native |
| [FileChange](Tool-FileChange.md) | `ThreadItem.type = "fileChange"` | `apply_patch` in live logs, documented as FileChange | Native |
| [MCPToolCall](Tool-MCPToolCall.md) | `ThreadItem.type = "mcpToolCall"` and MCP progress events | `server.tool` when server is known | Native |
| [DynamicToolCall](Tool-DynamicToolCall.md) | `ThreadItem.type = "dynamicToolCall"` and `item/tool/call` | `namespace.tool` when namespace is known | Native |
| [Agent](Tool-Agent.md) | `collabAgentToolCall`, `subAgentActivity`, and thread `source.subAgent` | MainAgent/SubAgent identity plus agent tool cards | Native |
| [SendMessage](Tool-SendMessage.md) | `CollabAgentTool = "sendInput"` | Agent communication card | Native / compatibility |
| [WebSearch](Tool-WebSearch.md) | `ThreadItem.type = "webSearch"` and `web_search` aliases | `web_search` | Native |
| [ImageView](Tool-ImageView.md) | `ThreadItem.type = "imageView"` | `view_image` | Native |
| [AskUserQuestion](Tool-AskUserQuestion.md) | `item/tool/requestUserInput` and `mcpServer/elicitation/request` | `AskUserQuestion` | Native mapping |
| [ExitPlanMode](Tool-ExitPlanMode.md) | `turn/plan/updated` and `ThreadItem.type = "plan"` | Noninteractive plan card | Native mapping |
| [Skill](Tool-Skill.md) | Codex skill loading and skill metadata | Skill capability/doc card | Native capability |

## Compatibility Tool Docs

These docs remain because imported logs, older SDK events, or plugin surfaces can still emit them. They are not current app-server `ThreadItem` tool types.

| Tool doc | Source checked | CX Viewer display | Status |
|----------|----------------|-------------------|--------|
| [Read](Tool-Read.md) | Legacy/imported file read events | `Read` | Compatibility |
| [Edit](Tool-Edit.md) | Legacy/imported edit events | `Edit` | Compatibility |
| [Write](Tool-Write.md) | Legacy/imported write events | `Write` | Compatibility |
| [NotebookEdit](Tool-NotebookEdit.md) | Legacy notebook edit events | `NotebookEdit` | Compatibility |
| [Glob](Tool-Glob.md) | Legacy/imported search events | `Glob` | Compatibility |
| [Grep](Tool-Grep.md) | Legacy/imported search events | `Grep` | Compatibility |
| [WebFetch](Tool-WebFetch.md) | Legacy/imported web fetch events | `WebFetch` | Compatibility |
| [Task](Tool-Task.md) | Older SubAgent naming and imported logs | `Task` or `Agent` | Compatibility alias |
| [EnterPlanMode](Tool-EnterPlanMode.md) | Older plan-mode tool logs | `EnterPlanMode` | Compatibility |
| [EnterWorktree](Tool-EnterWorktree.md) | Older worktree/tool logs | `EnterWorktree` | Compatibility |
| [getDiagnostics](Tool-getDiagnostics.md) | IDE/plugin diagnostics surfaces | `getDiagnostics` | Compatibility |
| [executeCode](Tool-executeCode.md) | Notebook/kernel plugin surfaces | `executeCode` | Compatibility |

## Deferred Or Removed From The Main Catalog

The following names appeared in older docs or local UI helpers but were not found as current Codex app-server `ThreadItem` tools during this pass: `TeamCreate`, `TeamDelete`, `TaskCreate`, `TaskGet`, `TaskUpdate`, `TaskList`, `TaskOutput`, `TaskStop`, `Workflow`, `Monitor`, `CronCreate`, `CronDelete`, `ScheduleWakeup`, `PushNotification`, `RemoteTrigger`, `ExitWorktree`, `LSP`, and `ToolSearch`.

They may still be parsed by specialized viewer panels or legacy import paths. They are intentionally not listed in the main Codex tool catalog until the corresponding Codex surface is verified and migrated.
