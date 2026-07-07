# Task

> **Note:** `Task` is kept as a legacy compatibility name. Codex-native traffic should prefer [Agent](Tool-Agent.md).

## Definition

Represents older imported logs where a subagent launch was named `Task`. In current Codex app-server traffic, subagent and collaborative-agent activity is represented through `collabAgentToolCall`, `subAgentActivity`, and thread source metadata.

## CX Viewer Mapping

- Imported `Task` calls normalize to the same visual subagent model as `Agent`.
- Native Codex `spawnAgent` and related collab calls should be documented under [Agent](Tool-Agent.md).
- If a log contains old `Task` arguments, CX Viewer treats them as best-effort display data rather than a current Codex schema.

## Notes

- Keep this page for old JSONL imports and historical UI links.
- Do not use this page as the source of truth for current Codex subagent fields.
