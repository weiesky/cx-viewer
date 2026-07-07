# KV-Cache Content

## What is Prompt Caching?

When you work with Codex, the model request can include system instructions, tool definitions, and conversation history. If the upstream OpenAI/Codex service reports cached input tokens, CX-Viewer surfaces those values as cache usage.

In CX-Viewer, "KV-Cache" is a UI shorthand for provider-reported prompt/cache reuse. It is not the key-value cache inside transformer attention layers.

## How Caching Works

CX-Viewer does not infer cache hits from request-body annotations. It compares MainAgent bodies for diagnostics and displays cache usage only when response usage fields report cached tokens.

```
Tools / System Prompt / Messages
```

For OpenAI Responses usage, cached tokens may appear as `input_tokens_details.cached_tokens`; CX-Viewer normalizes that to `cache_read_input_tokens`.

## What is "Current KV-Cache Content"?

The "Current KV-Cache Content" displayed in CX-Viewer is extracted from the most recent MainAgent request. It includes:

- **System Prompt**: Codex system instructions, including core agent directives, tool usage specifications, `AGENTS.md` project instructions, environment information, etc.
- **Tools**: The current list of available tool definitions (such as Read, Write, Bash, Agent, MCP tools, etc.)
- **Messages**: The conversation history that was present in the most recent MainAgent request

## Why View Cache Content?

1. **Understand Context**: See what Codex sent to the model for the current turn
2. **Cost/Latency Diagnostics**: Cache usage can explain why some turns are cheaper or faster than others
3. **Debug Conversations**: When Codex responses do not match expectations, checking context confirms whether the system prompt and historical messages are correct
4. **Context Quality Monitoring**: During debugging, configuration changes, or prompt adjustments, KV-Cache-Text provides a centralized view to quickly confirm whether core context has degraded or been unexpectedly polluted — without manually reviewing raw messages

## Multi-Level Caching Strategy

Provider-side caching details can vary by model, endpoint, and account. CX-Viewer therefore treats cache metrics as reported facts, not as a locally guaranteed cache model.

## Cache Lifecycle

- **Hit**: The response reports cached input tokens (`cache_read_input_tokens`)
- **No hit / unknown**: The response does not report cached input tokens
- **Context change**: System prompt, tool list, model, or message content changed compared with the previous MainAgent request
