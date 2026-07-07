# Response Body Field Reference

Field reference for CX-Viewer's normalized Codex response body.

## Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| **model** | string | The model name actually used |
| **id** | string | Unique response or streamed item identifier when available |
| **type** | string | Always `"message"` |
| **role** | string | Always `"assistant"` |
| **content** | array | Array of content blocks output by the model, containing text, tool calls, thinking process, etc. |
| **stop_reason** | string | Normalized reason/status for stopping, such as `"end_turn"`, `"completed"`, `"failed"`, or `"max_tokens"` |
| **stop_sequence** | string/null | The sequence that triggered the stop, usually `null` |
| **usage** | object | Token usage statistics (see below) |

## content Block Types

| Type | Description |
|------|-------------|
| **text** | The model's text reply, contains a `text` field |
| **tool_use** | Tool call request, contains `name` (tool name), `input` (parameters), `id` (call ID, used to match tool_result) |
| **thinking** | Extended thinking content (only appears when thinking mode is enabled), contains a `thinking` field |

## usage Field Details

| Field | Description |
|-------|-------------|
| **input_tokens** | Number of input tokens that did not hit the cache (billed at full price) |
| **cache_read_input_tokens** | Number of tokens that hit the cache (cache read, billed much lower than normal input) |
| **output_tokens** | Number of tokens output by the model |
| **reasoning_output_tokens** | Reasoning tokens when the source reports them |
| **total_tokens** | Total tokens reported by the source |

OpenAI Responses usage may report cached tokens under `input_tokens_details.cached_tokens`; CX-Viewer normalizes that into `cache_read_input_tokens` and subtracts it from displayed `input_tokens` to avoid double counting.

## stop_reason Meanings

- **end_turn**: The model completed its reply normally
- **tool_use**: The model needs to call a tool; CX-Viewer shows the matching tool result when the capture source provides it
- **max_tokens**: The reply was truncated due to reaching the `max_tokens` limit and may be incomplete
