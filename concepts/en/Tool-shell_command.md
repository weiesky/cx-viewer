# shell_command

`shell_command` runs commands in the user's shell. Calls must set `workdir` so command behavior does not depend on an implicit current directory.

Common fields:

- `command`: command to execute, required.
- `workdir`: working directory, required.
- `timeout_ms`: optional timeout.
- `sandbox_permissions`: use the default sandbox, or request `require_escalated` when the command genuinely needs it.
- `justification`: user-facing approval question for escalated commands.
- `prefix_rule`: optional narrowly scoped persistent approval prefix.
