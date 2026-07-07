# Cache Rebuild

## Background

Codex/OpenAI usage may report cached input tokens when provider-side cache reuse happens. CX-Viewer compares consecutive MainAgent request bodies to explain why cache reuse may have changed.

Cache diagnostics are useful for cost, latency, and context-quality troubleshooting. They are based on normalized viewer entries rather than provider-specific request annotations.

## Cache Rebuild Reason Categories

CX-Viewer compares the bodies of two consecutive MainAgent requests to identify likely cache/context-change causes:

| reason | Meaning | Detection Method |
|--------|---------|------------------|
| `ttl` | Long idle gap | More than 5 minutes since the last MainAgent request |
| `system_change` | System prompt changed | `JSON.stringify(prev.system) !== JSON.stringify(curr.system)` |
| `tools_change` | Tool definitions changed | `JSON.stringify(prev.tools) !== JSON.stringify(curr.tools)` |
| `model_change` | Model switched | `prev.model !== curr.model` |
| `msg_truncated` | Message stack truncated | Current request has fewer messages than the previous one, usually triggered by context window overflow |
| `msg_modified` | Historical messages modified | Prefix message content is inconsistent (prefix should be identical during normal appending) |
| `key_change` | Unknown key change | Fallback when none of the above conditions match |

## Detection Priority

1. First check the time interval — if more than 5 minutes, immediately classify as `ttl` without body comparison
2. Then check model, system, tools, and messages in sequence
3. A single request may match multiple reasons (e.g., model switch + system prompt change), in which case the `reasons` array contains all matches and the tooltip displays them on separate lines

## Common Scenarios

- **`ttl`**: The user paused for more than 5 minutes before continuing, and the cache naturally expired
- **`system_change`**: Codex system prompt changed (e.g., loaded new `AGENTS.md`, project instructions changed)
- **`tools_change`**: MCP server connection/disconnection caused changes to the available tool list
- **`model_change`**: The user switched models via the `/model` command
- **`msg_truncated`**: A long conversation triggered context window management, and Codex truncated earlier messages
- **`msg_modified`**: Codex edited historical messages (e.g., `/compact` replaced original messages with a compressed summary)
