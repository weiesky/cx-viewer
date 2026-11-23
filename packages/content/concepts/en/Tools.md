# Codex Tools

The all-tools catalog is a static reference, not a list of tools loaded in the current session. Availability depends on CLI version, model, features and host. Entries of type `namespace` group callable operations. Request tools shown in context can also be synthetic reference data produced by CX Viewer in App Server or SDK mode.

## Code Mode

- exec: Code Mode's orchestration suite for discovering, composing, parallelizing, and resuming nested tool workflows inside a fresh V8 isolate.
- wait: resume or terminate a yielded exec cell and return its latest output.

## Core tools

- shell_command: a shell tool available in some runtimes.
- exec_command: execute a command, optionally returning a running process session.
- write_stdin: write to or wait for a running command session.
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

MCP, plugin, and connector tools are discovered per session. Code Mode and collaboration names and contracts depend on the host; use the actual tool schema. Historical names remain documented for older logs.

The diff view compares namespace members and parseable declarations in the `exec` description. The latter are text declarations, not proof of runtime availability. Missing declarations are not treated as empty lists.

## Version comparison

Both 0.142.5 and 0.169.0 include Code Mode, unified command execution and tool discovery; these are not uniformly new in the latter release. The 0.169.0 model catalog includes newer models using `code_mode_only`; configuration and server-provided model metadata also affect tool selection. See the official [0.142.5 features](https://github.com/openai/codex/blob/rust-v0.142.5/codex-rs/features/src/lib.rs), [0.169.0 features](https://github.com/openai/codex/blob/rust-v0.169.0/codex-rs/features/src/lib.rs), [model catalog](https://github.com/openai/codex/blob/rust-v0.169.0/codex-rs/models-manager/models.json) and [tool discovery implementation](https://github.com/openai/codex/blob/rust-v0.169.0/codex-rs/core/src/tools/handlers/tool_search_spec.rs).
