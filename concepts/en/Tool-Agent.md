# Agent

## Definition

Represents Codex subagent and collaborative-agent activity. In the app-server schema this is not one single `Agent` item; CX Viewer builds the Agent view from several verified sources:

- `ThreadItem.type = "collabAgentToolCall"`
- `ThreadItem.type = "subAgentActivity"`
- thread source metadata such as `source.subAgent`

Codex subagents are spawned only when the user or runtime explicitly asks for that mode. The manual describes built-in profiles such as default, worker, and explorer; CX Viewer records the profile or activity kind when the app-server sends it.

## Fields Checked

For `collabAgentToolCall`:

| Field | Type | Description |
|-------|------|-------------|
| `tool` | enum | One of `spawnAgent`, `sendInput`, `resumeAgent`, `wait`, `closeAgent` |
| `status` | string | Current tool-call status |
| `senderThreadId` | string | Thread issuing the collab request |
| `receiverThreadIds` | array | Target or newly spawned agent threads |
| `prompt` | string/null | Prompt sent to the target agent |
| `model` | string/null | Requested model when present |
| `reasoningEffort` | string/null | Requested reasoning effort when present |
| `agentsStates` | object | Last known target-agent states |

For `subAgentActivity`:

| Field | Type | Description |
|-------|------|-------------|
| `kind` | string | Activity kind or agent role |
| `agentThreadId` | string | Agent thread id |
| `agentPath` | string | Agent path reported by the app-server |

## Use Cases

**Usually represents:**
- A subagent being spawned or resumed
- The main thread sending input to a worker/explorer agent
- Waiting for or closing an agent
- A subagent activity marker from app-server metadata

## Notes

- CX Viewer marks subagent turns as `subAgent: true` and keeps them separate from MainAgent turns.
- `Task` is kept as a legacy alias for imported logs. Prefer `Agent` for Codex-native documentation.
- Tool entries emitted by a subagent inherit the same subagent identity.
