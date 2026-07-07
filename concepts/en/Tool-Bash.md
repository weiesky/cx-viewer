# Bash

## Definition

Executes shell commands with optional timeout and background execution settings. CX Viewer records the command, working directory, output, exit code, duration, and agent identity.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command` | string | Yes | Shell command to execute |
| `description` | string | No | Short command description |
| `timeout` | number | No | Timeout in milliseconds |
| `run_in_background` | boolean | No | Whether to run independently |

## Use Cases

**Good for:**
- Running test/build commands
- Git status/diff/log operations
- Package manager commands
- Inspecting system state

**Not good for:**
- Editing files when a structured edit tool is available
- Reading many files when direct read/search tools are clearer
- Long-running dev servers unless the task explicitly needs them

## Notes

- Prefer explicit working directories and absolute paths.
- Commands that require elevated permissions or write outside the workspace may require approval.
- Root-thread command events are tool events; SubAgent commands inherit the SubAgent identity.
