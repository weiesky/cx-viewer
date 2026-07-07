# Why Are Tools Listed First?

In CX Viewer's Context panel, **Tools appear before System Prompt and Messages**. For Codex, this is a diagnostic layout: tool definitions are a large, high-impact part of the request shape, so they are shown first before the instructions and conversation history they constrain.

## Request Context Layout

Codex traffic can arrive from OpenAI Responses API calls, Codex app-server events, or SDK stream events. CX Viewer normalizes those sources into a consistent context view:

```
┌─────────────────────────────────────────────────┐
│ 1. Tools (JSON Schema definitions)               │  ← Capability surface
│ 2. System Prompt                                 │
│ 3. Messages (conversation history + current turn)│
└─────────────────────────────────────────────────┘
```

This does not claim a provider-specific serialization order. It gives you a stable way to inspect what capabilities were available before reading the prompt and message stack.

## Why Tools Often Matter Most

Tool definitions are often the largest static part of an agent request. A small UI toggle can add, remove, or reshape many tool schemas, which changes both model behavior and provider-reported cache usage.

1. **Capability changes are semantic changes**: Adding or removing a tool changes what the agent is allowed to do, not just the token count.

2. **Tool schemas can dominate request size**: MCP and dynamic tools often have detailed JSON Schemas with descriptions, enums, and nested parameters.

3. **Cache reporting follows the provider**: CX Viewer displays cache-read tokens reported by Codex/OpenAI (`cached_tokens` normalized to `cache_read_input_tokens`) instead of inventing cache-hit math locally.

4. **Message appends are usually cheaper to inspect**: Normal conversation turns mostly add one new user message and the previous assistant/tool results, while tool and instruction changes tend to be rarer and more important.

## Practical Impact

| Change Type | Cache Impact | Typical Scenario |
|-------------|-------------|-----------------|
| Tool added/removed | Provider may report lower cache reuse | MCP server connect/disconnect, plugin toggle |
| System Prompt change | Instructions and policy changed | `AGENTS.md` edit, developer instruction update |
| New message appended | Normal turn growth | User input, assistant reply, tool result |

This is why `tools_change` in [CacheRebuild](CacheRebuild.md) is treated as a high-signal rebuild reason: even when exact cache behavior is provider-side, the available action surface changed.

## Why Are Tool Definitions Placed Before the "Brain"?

From a diagnostic perspective, putting Tools first is useful because tool definitions describe the agent's available actions before you inspect the instructions that ask the agent to act.

Before taking action, a person needs to perceive what limbs and tools are available. An infant doesn't first understand the rules of the world (System), then learn to reach and grab — they first sense that they have hands and feet, then gradually understand rules through interaction with the environment. Similarly, an LLM needs to know what tools it can call (read files, write code, search, execute commands) before receiving task instructions (System Prompt), so it can accurately assess "what can I do" and "how should I do it" when processing the instructions.

If reversed — first telling the model "your task is to refactor this module", then telling it "you have Read, Edit, Bash tools" — the model would lack critical capability boundary information when understanding the task, potentially producing unrealistic plans or overlooking available approaches.

**Know what cards you hold before deciding how to play.** This is the cognitive logic behind Tools preceding System.

## Why Are MCP Tools Also in This Position?

MCP (Model Context Protocol) tools, like built-in tools, are placed at the very front of the Tools area. Understanding MCP's position in the context helps evaluate its real benefits and costs.

### MCP Advantages

- **Capability extension**: MCP lets models access external services (database queries, API calls, IDE operations, browser control, etc.), breaking beyond built-in tool boundaries
- **Open ecosystem**: Anyone can implement an MCP server; the model gains new capabilities without retraining
- **On-demand loading**: MCP servers can be selectively connected/disconnected based on task scenario, flexibly composing tool sets

### MCP Costs

- **Cache killer**: Each MCP tool's JSON Schema definition is concatenated into the very front of the KV-Cache prefix. Adding or removing one MCP tool = **entire cache invalidated from the start**. Frequently connecting/disconnecting MCP servers will dramatically reduce cache hit rates
- **Prefix bloat**: MCP tool Schemas are typically larger than built-in tools (containing detailed parameter descriptions, enums, etc.). Many MCP tools significantly increase the Tools area's token count, squeezing the context space available for Messages
- **Latency overhead**: MCP tool calls require cross-process communication (JSON-RPC over stdio/SSE), an order of magnitude slower than built-in function calls
- **Stability risk**: MCP servers are external processes that may crash, timeout, or return unexpected formats, requiring additional error handling

### Practical Recommendations

| Scenario | Recommendation |
|----------|---------------|
| Long conversations, high-frequency interaction | Minimize MCP tool count to protect cache prefix stability |
| Short tasks, one-off operations | Use MCP tools freely; cache impact is limited |
| Frequently adding/removing MCP servers | Each change triggers full cache rebuild; consider fixing the tool set |
| Oversized Tool Schemas | Trim descriptions and enums to reduce prefix token footprint |

In CX Viewer's Context panel, MCP tools are displayed alongside built-in and dynamic tools in the Tools area, giving you a clear view of each tool's Schema size and contribution to request shape.
