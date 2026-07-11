# spawn_agent

`spawn_agent` creates a sub-agent for one concrete, bounded task that can make useful progress independently. The new agent receives a canonical task name and shares the workspace with the root agent.

Fields:

- `task_name`: lowercase task identifier, required.
- `message`: initial task instructions, required.
- `fork_turns`: optional amount of recent conversation context to copy.

Do not use it for work that is tightly sequential or lacks an independent deliverable.
