# Why Are Tools Listed First?

In CX Viewer's Context panel, **Tools appear before Instructions and Input**. For Codex, this is a diagnostic layout: tool definitions are a large, high-impact part of the request shape, so they are shown first before the instructions and conversation context they constrain.

## Request Context Layout

Codex traffic can arrive from OpenAI Responses API calls, Codex app-server events, or SDK stream events. CX Viewer normalizes those sources into a consistent context view:

```
┌─────────────────────────────────────────────────┐
│ 1. Tools (JSON Schema definitions)               │  ← Capability surface
│ 2. Instructions                                  │
│ 3. Input (conversation history + current turn)   │
└─────────────────────────────────────────────────┘
```

This does not claim a provider-specific serialization order. It gives you a stable way to inspect what capabilities were available before reading instructions and input history.

## Why Tools Often Matter Most

Tool definitions are often the largest static part of an agent request. A small UI toggle can add, remove, or reshape many tool schemas, which changes model behavior and request size.

1. **Capability changes are semantic changes**: Adding or removing a tool changes what the agent is allowed to do, not just the token count.

2. **Tool schemas can dominate request size**: MCP and dynamic tools often have detailed JSON Schemas with descriptions, enums, and nested parameters.

4. **Input appends are usually cheaper to inspect**: Normal conversation turns mostly add new user input and the previous assistant/tool results, while tool and instruction changes tend to be rarer and more important.

## Practical Impact

| Change Type | Cache Impact | Typical Scenario |
|-------------|-------------|-----------------|
| Tool added/removed | Request shape changes | MCP server connect/disconnect, plugin toggle |
| Instructions change | Instructions and policy changed | `AGENTS.md` edit, developer instruction update |
| New input appended | Normal turn growth | User input, assistant reply, tool result |

## Why Are Tool Definitions Placed Before the "Brain"?

From a diagnostic perspective, putting Tools first is useful because tool definitions describe the agent's available actions before you inspect the instructions that ask the agent to act.

Before taking action, a person needs to perceive what limbs and tools are available. An infant doesn't first understand the rules of the world (Instructions), then learn to reach and grab — they first sense that they have hands and feet, then gradually understand rules through interaction with the environment. Similarly, an LLM needs to know what tools it can call (read files, write code, search, execute commands) before receiving task instructions, so it can accurately assess "what can I do" and "how should I do it" when processing the instructions.

If reversed — first telling the model "your task is to refactor this module", then telling it "you have shell_command, apply_patch, and tool_search" — the model would lack critical capability boundary information when understanding the task, potentially producing unrealistic plans or overlooking available approaches.

**Know what cards you hold before deciding how to play.** This is the cognitive logic behind Tools preceding Instructions.

## Why Are MCP Tools Also in This Position?

MCP (Model Context Protocol) tools, like built-in tools, are placed at the very front of the Tools area. Understanding MCP's position in the context helps evaluate its real benefits and costs.

### MCP Advantages

- **Capability extension**: MCP lets models access external services (database queries, API calls, IDE operations, browser control, etc.), breaking beyond built-in tool boundaries
- **Open ecosystem**: Anyone can implement an MCP server; the model gains new capabilities without retraining
- **On-demand loading**: MCP servers can be selectively connected/disconnected based on task scenario, flexibly composing tool sets

### MCP Costs
- **Prefix bloat**: MCP tool Schemas are typically larger than built-in tools (containing detailed parameter descriptions, enums, etc.). Many MCP tools significantly increase the Tools area's token count, squeezing the context space available for Input
- **Latency overhead**: MCP tool calls require cross-process communication (JSON-RPC over stdio/SSE), an order of magnitude slower than built-in function calls
- **Stability risk**: MCP servers are external processes that may crash, timeout, or return unexpected formats, requiring additional error handling

### Practical Recommendations

| Scenario | Recommendation |
|----------|---------------|
| Long conversations, high-frequency interaction | Minimize MCP tool count to keep requests smaller and easier to inspect |
| Short tasks, one-off operations | Use MCP tools freely; overhead is usually limited |
| Frequently adding/removing MCP servers | Each change reshapes the request; consider fixing the tool set |
| Oversized Tool Schemas | Trim descriptions and enums to reduce prefix token footprint |

In CX Viewer's Context panel, MCP tools are displayed alongside built-in and dynamic tools in the Tools area, giving you a clear view of each tool's Schema size and contribution to request shape.
