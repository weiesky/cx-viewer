# WebFetch

## Definition

Compatibility doc for imported or legacy web-fetch tool logs. In the current Codex app-server schema checked for this pass, web search is represented by `ThreadItem.type = "webSearch"`; a first-class `WebFetch` `ThreadItem` was not found.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string (URI) | Yes | The full URL to fetch |
| `prompt` | string | Yes | Describes what information to extract from the page |

## Use Cases

**Good for:**
- Fetching content from public web pages
- Consulting online documentation
- Extracting specific information from web pages

**Not good for:**
- URLs requiring authentication (Google Docs, Confluence, Jira, GitHub, etc.) — look for a dedicated MCP tool first
- GitHub URLs — prefer using the `gh` CLI

## Notes

- The URL must be a complete, valid URL
- Results may be summarized if the content is too large
- Dedicated MCP or dynamic tools may provide their own fetch behavior and should be displayed as [MCPToolCall](Tool-MCPToolCall.md) or [DynamicToolCall](Tool-DynamicToolCall.md).
- Treat this page as compatibility documentation, not as the current Codex app-server source of truth.
