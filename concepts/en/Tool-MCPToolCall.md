# MCPToolCall

## Definition

Represents a Codex call to a tool exposed by an MCP server. Codex configures MCP servers through its configuration system, and the app-server reports calls as `ThreadItem.type = "mcpToolCall"`.

## Fields Checked

| Field | Type | Description |
|-------|------|-------------|
| `server` | string | MCP server name |
| `tool` | string | Tool name on that server |
| `arguments` | JSON | Tool arguments |
| `status` | string | Current call status |
| `result` | object/null | Result returned by the MCP tool |
| `error` | object/null | Error returned by the MCP tool |
| `appContext` | object/null | App-specific resource context |
| `pluginId` | string/null | Plugin id when the server came from a plugin |
| `durationMs` | number/null | Runtime in milliseconds |

## CX Viewer Mapping

- The display name is `server.tool` when a server name is available.
- `item/mcpToolCall/progress` messages are collected and shown with the final result.
- `mcpServer/elicitation/request` is mapped to [AskUserQuestion](Tool-AskUserQuestion.md) because MCP servers can request structured user input.

## Notes

- MCP tools can come from local config, plugins, or app integrations.
- Approval and availability are controlled by Codex configuration and app policy, not by this viewer.
- This is different from `DynamicToolCall`, which is the app-server's generic dynamic tool surface.
