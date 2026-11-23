# followup_task

`followup_task` assigns a follow-up task to an existing non-root agent and starts a turn when that agent is idle. If it is already running, the task is delivered at a safe message boundary or after the pending tool call.

Fields:

- `target`: agent id or canonical task name, required.
- `message`: follow-up task instructions, required.

It is intended for reusing an agent whose existing context is relevant to the next task.
