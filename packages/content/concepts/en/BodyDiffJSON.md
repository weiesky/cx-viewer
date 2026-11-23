# Body Diff JSON (Request Body Incremental Comparison)

## Background

Codex MainAgent turns are represented as full request snapshots in CX Viewer. A request can include conversation history, instructions, tool definitions, metadata, and model/runtime options. As the session grows, the normalized body becomes harder to inspect by eye.

Body Diff JSON solves exactly this problem: it automatically compares the bodies of two consecutive MainAgent requests, extracts the incremental differences, and lets you see at a glance what content was actually added in the current request.

## How It Works

1. **Identify consecutive MainAgent requests**: The current request must be a MainAgent type, and a previous MainAgent request must exist
2. **Field-by-field comparison**: Iterates through all top-level fields of the request body, skipping internal properties prefixed with `_`
3. **Smart diff extraction**:
   - New fields: Displayed directly
   - Deleted fields: Not shown (usually doesn't affect understanding)
   - Changed fields: Shows the current value
   - `input` array special handling: Only shows newly added input items (since normal conversation is append-only, prefix input remains unchanged)
4. **Request body shrinkage detection**: If the current request body is smaller than the previous one, it indicates context truncation or session reset, and a notice is displayed instead of a diff

## Typical Scenarios

In a normal conversation round, Body Diff JSON typically contains only:
- `input`: 1-2 newly added input items (the user's input + the assistant's reply from the previous round)

If you see changes to `instructions`, `tools`, `model`, or other fields in the diff, it means a configuration change occurred in this round.

## Usage

- Body Diff JSON is displayed in the MainAgent request detail panel
- Click the title to expand/collapse
- Supports both JSON and Text viewing modes, plus one-click copy
- In the top-left **CX Viewer -> Global Settings**, you can set "Expand Body Diff JSON by default"
