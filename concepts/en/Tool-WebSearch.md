# WebSearch

## Definition

Represents a Codex web search event. In the app-server schema this is `ThreadItem.type = "webSearch"` with a search `query` and optional `action`.

Codex web search availability depends on runtime configuration and policy. CX Viewer records the event when Codex reports it; it does not decide whether search is enabled, cached, live, or disabled.

## Fields Checked

| Field | Type | Description |
|-------|------|-------------|
| `query` | string | Search query |
| `action` | object/null | Search action metadata reported by app-server |

## Use Cases

**Usually represents:**
- Current events and recently changed facts
- Latest product, package, API, or policy information
- Finding primary documentation for technical questions

## Notes

- CX Viewer displays this event as `web_search` for compatibility with older logs.
- `Tool-web_search` links are aliased to this page.
- Final-answer citation behavior is handled by Codex; CX Viewer only preserves the event.
