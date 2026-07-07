# WebSearch

## Definition

Runs a web search and returns source-backed results for current information.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `allowed_domains` | string[] | No | Limit results to these domains |
| `blocked_domains` | string[] | No | Exclude these domains |

## Use Cases

**Good for:**
- Current events and recently changed facts
- Latest product, package, API, or policy information
- Finding primary documentation for technical questions

## Notes

- Search output should be cited in the final answer when it informs the response.
- Prefer primary sources for technical, legal, financial, or medical topics.
- CX Viewer records web-search tool events separately from MainAgent/SubAgent request bodies.
