# Task

> **Note:** `Task` is kept as a legacy name for SubAgent launches. Codex-native traffic should prefer the `Agent` terminology when available. See [Tool-Agent](Tool-Agent).

## Definition

Launches a SubAgent to autonomously handle a multi-step task. In CX Viewer, legacy `Task` and newer `Agent` calls normalize to the same SubAgent display model.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Task description for the SubAgent |
| `description` | string | Yes | Short label |
| `subagent_type` | string | Yes | SubAgent profile or capability set |
| `model` | string | No | Optional model override |
| `max_turns` | integer | No | Maximum autonomous turns |
| `run_in_background` | boolean | No | Whether the task can continue independently |
| `resume` | string | No | Existing agent/session id to continue |
| `isolation` | string | No | Optional isolation mode such as a worktree |

## Notes

- Use direct file/search tools for narrow lookups.
- Use SubAgents for broad exploration, parallel research, or isolated multi-step work.
- CX Viewer relies on explicit Codex/app-server metadata when available and falls back to request-shape heuristics for imported legacy logs.
