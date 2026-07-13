# collaboration

`collaboration` is the Multi-Agent V2 tool group for coordinating teammates that work alongside the root agent. The group chip is an entry point: its callable operations are `spawn_agent`, `send_message`, `followup_task`, `wait_agent`, `interrupt_agent`, and `list_agents`.

## Operations

| Operation | Purpose |
| --- | --- |
| `spawn_agent` | Create a teammate for one concrete, bounded task that can progress independently. |
| `send_message` | Deliver context or guidance to an existing teammate without starting a new turn. |
| `followup_task` | Give an existing non-root teammate another task and start it when idle. |
| `wait_agent` | Wait for mailbox updates, completion notifications, or user steering. |
| `list_agents` | Inspect the live agent tree and task status. |
| `interrupt_agent` | Stop a teammate's current turn while keeping it available for later reuse. |

## Working model

- Teammates share the same workspace and immediately see each other's file changes.
- `spawn_agent` returns an id and canonical task path used as the `target` for later operations.
- Forked conversation context is controlled by `fork_turns`; filesystem state is shared regardless of that setting.
- Available concurrency is limited, so teammate count should match the amount of genuinely independent work.
- Multiple agents must not edit the same files concurrently without explicit coordination.
- The active collaboration policy may require an explicit user or instruction-level request before spawning teammates.

The collaboration operations are direct tools and are not nested methods of the Code Mode `exec` suite. Use `Promise.all` inside `exec` for parallel nested-tool calls; use `collaboration` when the work itself benefits from separate agent contexts and deliverables.

## Typical lifecycle

1. Split the task into independent, bounded deliverables.
2. Create teammates with `spawn_agent` and retain their returned task paths.
3. Continue useful root-agent work while teammates run.
4. Use `send_message` for extra evidence, or `followup_task` to reuse an idle teammate.
5. Use `wait_agent` or `list_agents` to observe progress, then reconcile the results before acting.
6. Use `interrupt_agent` when work is obsolete or must be redirected. Interruption does not delete the teammate.

See each `Tool-*` operation page for its exact fields and behavior.
