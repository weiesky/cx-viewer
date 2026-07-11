# exec

`exec` is the main Code Mode orchestration suite. It runs an async JavaScript module in a fresh V8 isolate and turns the tools loaded for the current turn into callable JavaScript methods. It is therefore more than a JavaScript evaluator: it is the composition layer for shell, file, planning, goal, MCP, web, image, plugin, and other dynamically loaded capabilities.

## What the suite provides

- **One JavaScript surface for many tools.** Every enabled nested tool is available on the global `tools` object.
- **Sequential composition.** A result from one tool can be inspected and passed into the next tool in the same script.
- **Parallel orchestration.** Independent calls can be combined with `Promise.all` to reduce round trips.
- **Dynamic discovery.** `ALL_TOOLS` exposes enabled tool metadata, including deferred tools that may not appear in the generated reference text.
- **Typed call guidance.** The runtime description generates TypeScript-like declarations from each nested tool's input and output schema.
- **Incremental and multimodal output.** Scripts can emit text, ordinary images, generated images, and immediate progress notifications.
- **Cross-call state.** Serializable values can be stored and loaded by later `exec` calls in the same session.
- **Long-running cells.** Work that outlives the initial yield window returns a cell id and continues through `wait`.

Nested tools keep their own schemas, sandbox boundaries, and approval requirements. Calling a tool through `exec` does not bypass its policy.

## Calling nested tools

Tool names are normalized into valid JavaScript identifiers. A plain tool such as `shell_command` is called as `tools.shell_command(...)`; a namespaced tool such as `web.run` is exposed as a name like `tools.web__run(...)`.

- Function tools take an object argument.
- Freeform tools, such as `apply_patch`, take a string argument.
- A nested call returns an object or string according to that tool's contract.
- Deferred tools remain discoverable by filtering `ALL_TOOLS` by `name` or `description`.

Sequential composition:

```js
const goal = await tools.get_goal({});
text(goal);
```

Parallel composition:

```js
const [status, resources] = await Promise.all([
  tools.shell_command({ command: "git status --short", workdir: "/workspace" }),
  tools.list_mcp_resources({}),
]);
text(status);
text(resources);
```

## Runtime helpers

| Helper | Purpose |
| --- | --- |
| `text(value)` | Append text output; objects should be serialized explicitly when needed. |
| `image(value, detail?)` | Forward a base64 data URL, image item, or MCP image content block. |
| `generatedImage(result)` | Forward an image-generation result and optional output hint. |
| `notify(value)` | Emit an additional output immediately while the script continues. |
| `store(key, value)` | Save a serializable value for later `exec` calls in this session. |
| `load(key)` | Read a value previously saved with `store`. |
| `exit()` | Finish the script successfully at the current point. |
| `setTimeout` / `clearTimeout` | Schedule or cancel callbacks inside the isolate. |
| `yield_control()` | Yield accumulated output immediately while leaving the script running. |
| `ALL_TOOLS` | Inspect `{ name, description }` metadata for enabled nested tools. |

Pending timers alone do not keep the isolate alive. Await an explicit promise when delayed work must complete.

## Input and execution lifecycle

The input is raw JavaScript source, not JSON, a quoted string, or a Markdown code block. The script is evaluated as an async module, so top-level `await` is available.

An optional first-line pragma controls the initial yield window and direct output budget:

```js
// @exec: {"yield_time_ms": 10000, "max_output_tokens": 2000}
const result = await tools.shell_command({
  command: "npm test",
  workdir: "/workspace",
  timeout_ms: 120000,
});
text(result);
```

- `yield_time_ms` defaults to 10,000 milliseconds.
- `max_output_tokens` defaults to 10,000 tokens.
- When work is still running at the yield boundary, `exec` returns `Script running with cell ID ...`.
- Pass that id to `wait`; repeat until the cell completes, or use `terminate: true` to stop it.
- Once evaluation finishes, the isolate is destroyed and unawaited promises are discarded. Values survive only when explicitly saved with `store`.

## Environment boundaries

The isolate intentionally has no Node.js APIs, direct filesystem access, direct network access, or `console`. Use nested tools for those capabilities and explicit output helpers for results. HTTP image URLs cannot be passed directly to `generatedImage`; image output must follow the helper's data/result contract.

This design lets one `exec` call act as a small, policy-aware workflow: discover capabilities, call several tools, branch on their results, preserve state, and emit only the useful combined output.
