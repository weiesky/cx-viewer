# EnterPlanMode

## Definition

Switches Codex into a planning-focused mode before implementation. The agent explores the codebase, designs an approach, and asks for approval before making substantive edits.

## Parameters

No parameters.

## Use Cases

**Good for:**
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

After entering plan mode, Codex typically:

1. Searches and reads relevant files.
2. Identifies existing patterns and constraints.
3. Presents an implementation plan.
4. Waits for user approval.
5. Exits plan mode before editing.

## Notes

- CX Viewer displays plan-mode transitions as tool/synthetic events.
- Planning is most useful when the implementation path is uncertain or has meaningful tradeoffs.
