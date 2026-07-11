# exec

`exec` 是 Code Mode 的核心工具编排套件。它在全新的 V8 isolate 中运行一个异步 JavaScript module，并把当前轮次已装载的工具转换为可调用的 JavaScript 方法。因此它不只是“执行 JavaScript”，而是 shell、文件、计划、goal、MCP、网络、图片、插件及其他动态能力的统一组合层。

## 套件提供的能力

- **统一的 JavaScript 调用面。** 所有已启用的嵌套工具都挂载在全局 `tools` 对象上。
- **串行组合。** 可以检查前一个工具的结果，并在同一脚本中把它传给下一个工具。
- **并行编排。** 相互独立的调用可以通过 `Promise.all` 并行执行，减少往返等待。
- **动态发现。** `ALL_TOOLS` 提供已启用工具的元数据，也包含未写入生成式参考文本的 deferred tools。
- **类型提示。** 运行时会根据嵌套工具的输入、输出 schema 生成类似 TypeScript 的声明。
- **增量和多模态输出。** 脚本可以输出文本、普通图片、生成图片以及即时进度通知。
- **跨调用状态。** 可序列化数据可以保存，并由同一会话后续的 `exec` 调用读取。
- **长任务 cell。** 超过初始 yield 窗口的任务会返回 cell id，并通过 `wait` 继续运行。

嵌套工具仍保留各自的 schema、沙箱边界和审批要求。通过 `exec` 调用不会绕过原有权限策略。

## 调用嵌套工具

工具名会被规范化为合法 JavaScript 标识符。普通工具 `shell_command` 通过 `tools.shell_command(...)` 调用；带 namespace 的 `web.run` 则会暴露为类似 `tools.web__run(...)` 的名称。

- Function tool 接收对象参数。
- `apply_patch` 这类 freeform tool 接收字符串参数。
- 嵌套调用根据各自契约返回对象或字符串。
- deferred tool 即使没有出现在生成的参考正文中，也可以按 `name` 或 `description` 筛选 `ALL_TOOLS` 来发现。

串行组合：

```js
const goal = await tools.get_goal({});
text(goal);
```

并行组合：

```js
const [status, resources] = await Promise.all([
  tools.shell_command({ command: "git status --short", workdir: "/workspace" }),
  tools.list_mcp_resources({}),
]);
text(status);
text(resources);
```

## 运行时 helper

| Helper | 作用 |
| --- | --- |
| `text(value)` | 追加文本输出；对象需要时应显式序列化。 |
| `image(value, detail?)` | 转发 base64 data URL、图片项或 MCP 图片内容块。 |
| `generatedImage(result)` | 转发图片生成结果及可选的输出提示。 |
| `notify(value)` | 在脚本继续运行的同时立刻发出一条附加输出。 |
| `store(key, value)` | 保存可序列化数据，供本会话后续 `exec` 调用使用。 |
| `load(key)` | 读取此前通过 `store` 保存的数据。 |
| `exit()` | 在当前位置正常结束脚本。 |
| `setTimeout` / `clearTimeout` | 在 isolate 内安排或取消回调。 |
| `yield_control()` | 立即交出已累积的输出，同时保持脚本继续运行。 |
| `ALL_TOOLS` | 查看已启用嵌套工具的 `{ name, description }` 元数据。 |

仅存在待触发 timer 不会让 isolate 保持运行；需要完成延迟工作时，必须等待一个明确的 Promise。

## 输入格式与执行生命周期

输入必须是原始 JavaScript source，不能是 JSON、带引号字符串或 Markdown 代码块。脚本按异步 module 执行，因此可以直接使用顶层 `await`。

首行可以使用可选 pragma，控制首次 yield 时间和直接输出预算：

```js
// @exec: {"yield_time_ms": 10000, "max_output_tokens": 2000}
const result = await tools.shell_command({
  command: "npm test",
  workdir: "/workspace",
  timeout_ms: 120000,
});
text(result);
```

- `yield_time_ms` 默认 10,000 毫秒。
- `max_output_tokens` 默认 10,000 tokens。
- 到达 yield 边界时任务仍在运行，`exec` 会返回 `Script running with cell ID ...`。
- 将这个 id 传给 `wait`，可以反复等待直至完成；也可以用 `terminate: true` 终止。
- JavaScript 执行完成后 isolate 会被销毁，未被 await 的 Promise 会被丢弃。只有通过 `store` 显式保存的数据可以跨调用保留。

## 环境边界

isolate 刻意不直接提供 Node.js API、文件系统、网络和 `console`。这些能力必须通过嵌套工具获得，结果则通过显式输出 helper 返回。HTTP 图片 URL 也不能直接传给 `generatedImage`，图片输出必须符合对应的 data/result 契约。

这种设计让一次 `exec` 调用可以成为一个小型、遵守权限策略的 workflow：发现能力、调用多个工具、根据结果分支、保存状态，并只输出最终有用的组合结果。
