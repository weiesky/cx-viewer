# ExitPlanMode

## Definition

Represents a Codex plan update shown as a plan card. CX Viewer keeps the historical `ExitPlanMode` display name because existing UI components already render plan approval cards under that name.

Codex traffic checked for this mapping:

- realtime JSON-RPC notification `turn/plan/updated`
- historical `ThreadItem.type = "plan"`

## Fields Checked

For `turn/plan/updated`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plan` | array | Yes | Plan items with status and text |
| `explanation` | string/null | No | Optional explanation text |
| `turnId` | string | No | Turn id used to stabilize the card id |

For `ThreadItem.type = "plan"`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | Historical plan text |

## Use Cases

**Usually represents:**
- Codex publishing or updating its current plan
- A historical transcript containing a plan item
- A noninteractive plan card in a thread replay

## Notes

- In current CX Viewer Codex mapping, plan cards are noninteractive unless a separate approval flow is present.
- This is different from [AskUserQuestion](Tool-AskUserQuestion.md), which represents structured input requests.
- Older Claude-style "exit plan mode reads a plan file" behavior is not the source of truth for Codex app-server logs.
