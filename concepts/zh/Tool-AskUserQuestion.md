# AskUserQuestion

## 定义

表示 Codex 在 turn 执行过程中请求结构化用户输入。CX Viewer 会把两种 Codex request 形态映射到现有 `AskUserQuestion` 卡片：

- JSON-RPC server request `item/tool/requestUserInput`
- MCP elicitation request `mcpServer/elicitation/request`

## 已核对字段

`item/tool/requestUserInput`：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `questions` | array | 是 | 包含 id、标签、问题文本与选项的结构化问题 |
| `autoResolutionMs` | number/null | 否 | 可选的自动处理超时 |
| `itemId` | string | 否 | 用于匹配 pending result 的 request item id |
| `turnId` | string | 否 | 用于匹配 pending result 的 turn id |

每个归一化 question：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 稳定的问题 id |
| `header` | string | 否 | 简短 UI 标签 |
| `question` | string | 是 | 问题文本 |
| `options` | array | 否 | 可选项 |

对于 `mcpServer/elicitation/request`，CX Viewer 会把 requested schema 转成一个或多个 question，并保存 `serverName`、`mode`、`requestedSchema`、`url`、`elicitationId` 等 MCP metadata。

## 使用场景

**通常表示：**
- 收集用户偏好或需求
- 澄清模糊的指令
- MCP server 需要用户补充凭证、字段或选择
- Codex turn 暂停等待 app 返回结构化答案

## 注意事项

- `AskUserQuestion` 是 viewer 归一化名称，不一定是 wire item 原名。
- pending server request 通过 JSON-RPC id 匹配，并在 app 返回答案后转为 tool result。
- plan 更新由 [ExitPlanMode](Tool-ExitPlanMode.md) 表示，不归到本页。
