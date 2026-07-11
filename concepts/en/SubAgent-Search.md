# SubAgent: Search

## Definition

Search is a sub-agent type spawned by Codex's main agent to perform codebase searches. It discovers available search and reading capabilities through `tool_search`, then returns the results to the parent agent.

## Behavior

- Spawned automatically when the main agent needs to search or explore the codebase
- Runs in an isolated context with read-only access
- Uses current Codex/deferred tools for file pattern matching, content search, and file inspection
- Returns search results to the parent agent for further processing

## When It Appears

Search sub-agents typically appear when:

1. The main agent needs to find specific files, functions, or code patterns
2. A broad codebase exploration is requested by the user
3. The agent is investigating dependencies, references, or usage patterns
