# Codex Tools

The tools shown in the context-usage popover come from the currently loaded Codex request-body tools, not the legacy tool catalog. The catalog documents both loaded tool-group entry points and their callable operations.

## Code Mode

- exec: Code Mode's orchestration suite for discovering, composing, parallelizing, and resuming nested tool workflows inside a fresh V8 isolate.
- wait: resume or terminate a yielded exec cell and return its latest output.

## Core tools

- shell_command: run local shell commands with explicit working directory and sandbox/approval metadata.
- apply_patch: edit workspace files with structured patches.
- view_image: inspect local image files.
- update_plan: maintain the task plan.
- request_user_input: ask structured short questions in Default or Plan mode when the tool is loaded.
- get_goal: read the active goal status, budget, and usage.
- create_goal: create a goal only when explicitly requested.
- update_goal: mark a goal complete or blocked under the goal rules.
- tool_search: search deferred tool metadata and expose matching tools for the next turn.
- list_mcp_resources: list resources exposed by MCP servers.
- list_mcp_resource_templates: list parameterized MCP resource templates.
- read_mcp_resource: read a specific MCP resource.
- web_search: search the web for text or images.
- image_generation: generate PNG images.

## Multi-Agent V2

- collaboration: the Multi-Agent V2 tool group for creating, messaging, reusing, waiting on, inspecting, and interrupting teammates.
- spawn_agent: create a bounded sub-agent task.
- send_message: queue context or guidance for an existing agent without starting a turn.
- followup_task: assign a follow-up and start the target when it is idle.
- wait_agent: wait for mailbox, completion, or user-steering updates.
- interrupt_agent: stop the target's current turn while keeping the agent available.
- list_agents: inspect the live agent tree.

The Code Mode and Multi-Agent V2 names are confirmed both by the captured request bodies and by the corresponding tool registration code in `openai/codex`. MCP, plugin, app-connector, and other dynamic tools are intentionally not hard-coded here because Codex discovers and injects them per session.

Legacy tool names are not part of the Codex tool catalog and are not kept as concept aliases.
