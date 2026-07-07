# DynamicToolCall

## Definition

Represents a Codex app-server dynamic tool call. These tools are exposed at runtime by apps, plugins, connectors, or other extension surfaces, and are reported as `ThreadItem.type = "dynamicToolCall"` or the JSON-RPC request `item/tool/call`.

## Fields Checked

| Field | Type | Description |
|-------|------|-------------|
| `namespace` | string/null | Optional namespace for the provider |
| `tool` | string | Tool name |
| `arguments` | JSON | Tool arguments |
| `status` | string | Current call status |
| `contentItems` | array/null | Structured output content |
| `success` | boolean/null | Whether the call succeeded |
| `durationMs` | number/null | Runtime in milliseconds |

## CX Viewer Mapping

- The display name is `namespace.tool` when a namespace is available.
- For `item/tool/call`, CX Viewer records a pending dynamic call and resolves it when the server request result arrives.
- The content is shown as a normal tool result so dynamic integrations share the same transcript layout as built-in tools.

## Notes

- Use this doc for generic runtime tools that are not MCP-specific.
- The exact input and output schema depends on the dynamic provider.
- Older logs may use the alias `dynamic_tool`; CX Viewer maps that alias to this page.
