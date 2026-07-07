# Agent

## Definition

Launches a Codex SubAgent to handle a bounded task with its own context and tool access. CX Viewer marks these turns as `subAgent: true` and keeps their request/response bodies separate from the MainAgent turn that spawned them.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Task description for the SubAgent |
| `description` | string | Yes | Short label shown in the UI |
| `subagent_type` | string | Yes | SubAgent profile or capability set |
| `model` | string | No | Optional model override |
| `max_turns` | integer | No | Maximum autonomous turns |
| `run_in_background` | boolean | No | Whether the task can continue independently |
| `resume` | string | No | Existing agent/session id to continue |
| `isolation` | string | No | Optional isolation mode such as a worktree |

## Use Cases

**Good for:**
- Broad codebase exploration
- Parallel research
- Long-running implementation subtasks
- Work that benefits from an isolated context

**Not good for:**
- Reading one known file
- Searching a small known file set
- Tiny edits where direct tool calls are clearer

## Notes

- SubAgent output must be relayed by the MainAgent if the user needs to see it.
- Tool entries emitted by a SubAgent keep the same `subAgentName` and parent thread metadata.
- Root tool calls are displayed as synthetic/tool events, not as SubAgent turns.
