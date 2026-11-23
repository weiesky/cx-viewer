# send_message

`send_message` queues a message for an existing agent and delivers it promptly, without starting a new turn.

Fields:

- `target`: relative or canonical task name returned by `spawn_agent`, required.
- `message`: context, evidence, or guidance to queue, required.

Use `followup_task` instead when an idle target must actively start another task.
