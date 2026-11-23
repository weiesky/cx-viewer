# update_plan

`update_plan` maintains the current task plan and step statuses. At most one step should be `in_progress` at a time.

Step statuses:

- `pending`: not started.
- `in_progress`: currently being worked on.
- `completed`: finished.
