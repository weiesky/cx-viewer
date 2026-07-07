# SendMessage

## Definition

Represents Codex collaborative-agent input. In the generated schema, message passing is one variant of `CollabAgentTool`: `sendInput`.

CX Viewer keeps the `SendMessage` doc name for compatibility with existing team/session UI, but Codex-native traffic should be read as a `collabAgentToolCall`.

## Fields Checked

| Field | Type | Description |
|-------|------|-------------|
| `tool` | enum | `sendInput` for this behavior |
| `senderThreadId` | string | Thread sending the input |
| `receiverThreadIds` | array | Target agent thread ids |
| `prompt` | string/null | Text sent to the target agent |
| `status` | string | Current call status |
| `agentsStates` | object | Last known target-agent states |

## Related Agent Tools

The same `CollabAgentTool` enum also includes `spawnAgent`, `resumeAgent`, `wait`, and `closeAgent`. See [Agent](Tool-Agent.md) for the full Codex-native mapping.
