# Skill

## Definition

Represents Codex skill capability metadata and skill-triggered behavior. Skills are specialized instruction packs that can be made available to Codex by the app/runtime.

This is not a `ThreadItem` tool type in the app-server schema checked for this pass. CX Viewer keeps it as a documented capability because skill availability appears in Codex context and can explain why a turn uses specialized workflows.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `skill` | string | Yes | Skill name (e.g., "commit", "review-pr", "pdf") |
| `args` | string | No | Skill arguments |

## Use Cases

**Good for:**
- When the user enters a slash command in the `/<skill-name>` format
- When the user's request matches the functionality of a registered skill

**Not good for:**
- Built-in CLI commands (e.g., `/help`, `/clear`)
- A skill that is already running
- Skill names not in the available skills list

## Notes

- Skill loading and invocation details are controlled by Codex runtime instructions.
- Tool calls produced while following a skill should still appear as their concrete events, such as `Bash`, `FileChange`, `MCPToolCall`, or `DynamicToolCall`.
