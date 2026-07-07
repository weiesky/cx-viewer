# Skill

## 定义

表示 Codex skill 能力 metadata 与 skill 触发的行为。Skill 是由 app/runtime 提供给 Codex 的专用指令包。

本轮核对的 app-server schema 中，它不是 `ThreadItem` 工具类型。CX Viewer 保留此文档，是因为 skill 可用性会出现在 Codex 上下文中，并可解释某个 turn 为什么使用了特定专用流程。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `skill` | string | 是 | 技能名称（如 "commit"、"review-pr"、"pdf"） |
| `args` | string | 否 | 技能参数 |

## 使用场景

**适合使用：**
- 用户输入了 `/<skill-name>` 格式的 slash command
- 用户的请求匹配某个已注册技能的功能

**不适合使用：**
- 内置 CLI 命令（如 `/help`、`/clear`）
- 已经在运行中的技能
- 未在可用技能列表中的技能名称

## 注意事项

- Skill 加载与调用细节由 Codex runtime 指令控制。
- 按 skill 执行过程中产生的工具调用仍应按具体事件展示，例如 `Bash`、`FileChange`、`MCPToolCall` 或 `DynamicToolCall`。
