# DynamicToolCall

## 定义

表示 Codex app-server 的动态工具调用。这类工具由 app、插件、连接器或其他扩展表面在运行时暴露，通常以 `ThreadItem.type = "dynamicToolCall"` 或 JSON-RPC request `item/tool/call` 上报。

## 已核对字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `namespace` | string/null | 可选的提供方 namespace |
| `tool` | string | 工具名 |
| `arguments` | JSON | 工具入参 |
| `status` | string | 当前调用状态 |
| `contentItems` | array/null | 结构化输出内容 |
| `success` | boolean/null | 调用是否成功 |
| `durationMs` | number/null | 执行耗时，单位毫秒 |

## CX Viewer 映射

- 已知 namespace 时，展示名为 `namespace.tool`。
- 对 `item/tool/call`，CX Viewer 会记录 pending dynamic call，并在 server request 返回结果时完成。
- 输出按普通 tool result 展示，让动态集成和内置工具共用同一套对话布局。

## 注意事项

- 非 MCP 的通用运行时工具优先参考此文档。
- 精确入参与输出结构由动态工具提供方决定。
- 旧日志可能使用 alias `dynamic_tool`；CX Viewer 会把该 alias 映射到本页。
