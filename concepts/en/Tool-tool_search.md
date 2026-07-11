# tool_search

`tool_search` searches deferred tool metadata and exposes matching tools for the next turn.

Current logs show it is used to discover multi-agent tools, computer-use, node_repl, browser control, and other plugin/deferred tools.

Fields:

- `query`: search text, required.
- `limit`: optional maximum number of tools to return.

Response-side `tool_search_call` entries map to this document.
