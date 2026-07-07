# EnterWorktree

## Definition

Compatibility doc for older worktree transition logs. During this Codex review, `EnterWorktree` was not found as a current app-server `ThreadItem` tool type. CX Viewer keeps the page so historical links and imported logs still have an explanation.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| name | string | No | A name for the worktree. If not provided, a random name is generated. |

## Use Cases

**Good for:**
- The user explicitly says "worktree" (e.g., "start a worktree", "work in a worktree", "create a worktree")

**Not good for:**
- The user asks to create/switch branches — use git commands instead
- The user asks to fix a bug or work on a feature — use normal git workflow unless they specifically mention worktrees

## Notes

- Treat this as a compatibility surface, not as the current Codex app-server source of truth.
- Current branch/worktree behavior should be inferred from Codex runtime events, git commands, or app metadata when available.
