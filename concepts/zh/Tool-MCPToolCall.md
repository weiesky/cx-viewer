# MCPToolCall

## 定义

表示 Codex 调用了某个 MCP server 暴露的工具。Codex 通过配置系统接入 MCP server，app-server 以 `ThreadItem.type = "mcpToolCall"` 上报调用。

## 已核对字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `server` | string | MCP server 名称 |
| `tool` | string | 该 server 上的工具名 |
| `arguments` | JSON | 工具入参 |
| `status` | string | 当前调用状态 |
| `result` | object/null | MCP 工具返回结果 |
| `error` | object/null | MCP 工具返回错误 |
| `appContext` | object/null | app 侧资源上下文 |
| `pluginId` | string/null | server 来自插件时的插件 id |
| `durationMs` | number/null | 执行耗时，单位毫秒 |

## CX Viewer 映射

- 已知 server 名时，展示名为 `server.tool`。
- `item/mcpToolCall/progress` 会被收集，并与最终结果一起展示。
- `mcpServer/elicitation/request` 会映射为 [AskUserQuestion](Tool-AskUserQuestion.md)，因为 MCP server 可能请求结构化用户输入。

## 注意事项

- MCP 工具可能来自本地配置、插件或 app 集成。
- 工具可用性与审批策略由 Codex 配置和 app 策略控制，不由 viewer 决定。
- 它不同于 `DynamicToolCall`；后者是 app-server 的通用动态工具表面。
