# update_goal

`update_goal` marks the active goal as `complete` or `blocked`.

Boundaries:

- Use `complete` only when the objective is actually achieved and no required work remains.
- Use `blocked` only after the same blocking condition repeats under the goal rules and no meaningful progress is possible.
- Do not use it merely because work is hard, uncertain, or near a budget limit.
