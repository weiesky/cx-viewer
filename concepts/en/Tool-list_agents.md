# list_agents

`list_agents` reads the live agent tree for the current root thread and reports each task's status.

Field:

- `path_prefix`: optional canonical task-path prefix used to narrow the tree; omit it to list all live agents.

This is a read-only inspection tool and does not start, interrupt, or close agents.
