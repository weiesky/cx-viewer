# AskUserQuestion

## Definition

Represents structured user input requested by Codex during a turn. CX Viewer maps two Codex request forms into the existing `AskUserQuestion` card:

- JSON-RPC server request `item/tool/requestUserInput`
- MCP elicitation request `mcpServer/elicitation/request`

## Fields Checked

For `item/tool/requestUserInput`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `questions` | array | Yes | Structured questions with ids, labels, text, and options |
| `autoResolutionMs` | number/null | No | Optional timeout for automatic resolution |
| `itemId` | string | No | Request item id used for pending result matching |
| `turnId` | string | No | Turn id used for pending result matching |

For each normalized question:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Stable question id |
| `header` | string | No | Short UI label |
| `question` | string | Yes | Question text |
| `options` | array | No | Available options |

For `mcpServer/elicitation/request`, CX Viewer converts the requested schema into one or more question entries and stores MCP metadata such as `serverName`, `mode`, `requestedSchema`, `url`, and `elicitationId`.

## Use Cases

**Usually represents:**
- Collecting user preferences or requirements
- Clarifying ambiguous instructions
- Asking the user for missing credentials, fields, or choices required by an MCP server
- Letting a Codex turn pause until the app returns a structured answer

## Notes

- `AskUserQuestion` is a viewer normalization name, not necessarily the exact wire item name.
- Pending server requests are matched by JSON-RPC id and resolved into a tool result when the app returns an answer.
- Plan updates are represented by [ExitPlanMode](Tool-ExitPlanMode.md), not by this page.
