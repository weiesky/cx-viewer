# Bash

## Definition

Represents a Codex terminal command event. In the app-server schema this is `ThreadItem.type = "commandExecution"`, not a free-form Claude-style tool definition.

CX Viewer displays this event as `Bash` because that is the established terminal card name in the UI.

## Fields Checked

| Field | Type | Description |
|-------|------|-------------|
| `command` | string | Command executed by Codex |
| `cwd` | string | Working directory |
| `processId` | string/null | Underlying PTY process id when available |
| `source` | string | Source of the command execution |
| `status` | string | Current execution status |
| `commandActions` | array | Best-effort parsed command actions |
| `aggregatedOutput` | string/null | Combined stdout/stderr output |
| `exitCode` | number/null | Process exit code |
| `durationMs` | number/null | Runtime in milliseconds |

## Use Cases

**Usually represents:**
- Running test/build commands
- Git status/diff/log operations
- Package manager commands
- Inspecting system state

## Notes

- `item/commandExecution/outputDelta` and PTY output deltas are collected before the final item arrives.
- `item/commandExecution/requestApproval` is handled when Codex needs approval for a command.
- Sandbox and approval behavior comes from Codex runtime policy; CX Viewer only records and displays it.
- SubAgent commands inherit the thread/subagent identity from the app-server source metadata.
