# interrupt_agent

`interrupt_agent` stops an agent's current turn, if one is running, and returns its previous status. The target remains available for later messages and follow-up tasks.

Field:

- `target`: agent id or canonical task name, required.

Use it to redirect obsolete work, not as a replacement for normal messaging.
