# Codex Tools

The tools shown in the context-usage popover come from the currently loaded Codex request-body tools, not the legacy tool catalog. The latest main-agent request in the local cx-viewer logs loaded these 14 tools:

- shell_command: run local shell commands with explicit working directory and sandbox/approval metadata.
- apply_patch: edit workspace files with structured patches.
- view_image: inspect local image files.
- update_plan: maintain the task plan.
- request_user_input: ask structured short questions in Plan mode.
- get_goal: read the active goal status, budget, and usage.
- create_goal: create a goal only when explicitly requested.
- update_goal: mark a goal complete or blocked under the goal rules.
- tool_search: search deferred tool metadata and expose matching tools for the next turn.
- list_mcp_resources: list resources exposed by MCP servers.
- list_mcp_resource_templates: list parameterized MCP resource templates.
- read_mcp_resource: read a specific MCP resource.
- web_search: search the web for text or images.
- image_generation: generate PNG images.

Legacy tool names are not part of the Codex tool catalog and are not kept as concept aliases.
