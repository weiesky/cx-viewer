# EnterPlanMode

## Definition

Compatibility doc for older plan-mode transition logs. Current Codex app-server plan content is normally reported as `turn/plan/updated` or `ThreadItem.type = "plan"` and displayed through [ExitPlanMode](Tool-ExitPlanMode.md).

## Parameters

No parameters.

## Use Cases

**Usually represented older logs for:**
- New feature implementation
- Multi-file changes
- Architectural decisions
- Unclear requirements that need exploration
- Cases where user preference affects the implementation path

**Not good for:**
- Small obvious fixes
- Pure research tasks
- Requests where the user already gave precise implementation instructions

## Behavior

In older logs, entering plan mode usually meant:

1. Searches and reads relevant files.
2. Identifies existing patterns and constraints.
3. Presents an implementation plan.
4. Waits for user approval.
5. Leaving plan mode before editing.

## Notes

- `EnterPlanMode` is kept in the catalog for imported/historical logs.
- For Codex-native app-server transcripts, plan updates are explained under [ExitPlanMode](Tool-ExitPlanMode.md).
