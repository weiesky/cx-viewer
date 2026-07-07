# FileChange

## Definition

Represents a Codex app-server file patch event. In the generated schema this is `ThreadItem.type = "fileChange"` with a list of `changes` and a patch `status`.

CX Viewer may still display live entries with the compatibility tool name `apply_patch` because older viewers and imported logs used that name. This document is the Codex-facing explanation for that event.

## Fields Checked

| Field | Type | Description |
|-------|------|-------------|
| `changes` | array | File update changes reported by the app-server schema |
| `status` | string | Patch application status |
| `output` | string | Optional streamed patch output collected from `item/fileChange/outputDelta` |

## CX Viewer Mapping

- `fileChange` becomes a tool-like card so file edits appear in the same timeline as terminal and MCP calls.
- `item/fileChange/patchUpdated` can update the displayed change list before completion.
- `item/fileChange/requestApproval` is handled as an approval request when Codex needs permission before applying a patch.

## Notes

- Prefer this doc for Codex-native logs.
- Keep `apply_patch` as a display alias for imported or live compatibility entries.
- This event describes file changes; it is separate from older `Edit` and `Write` compatibility docs.
