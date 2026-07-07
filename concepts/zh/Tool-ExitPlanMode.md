# ExitPlanMode

## 定义

表示 Codex plan update 展示成的计划卡片。CX Viewer 保留历史展示名 `ExitPlanMode`，因为现有 UI 组件已经用这个名字渲染计划审批卡。

本轮核对到的 Codex traffic：

- 实时 JSON-RPC notification `turn/plan/updated`
- 历史 `ThreadItem.type = "plan"`

## 已核对字段

`turn/plan/updated`：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `plan` | array | 是 | 包含状态和文本的计划项 |
| `explanation` | string/null | 否 | 可选说明文本 |
| `turnId` | string | 否 | 用于稳定卡片 id 的 turn id |

`ThreadItem.type = "plan"`：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | string | 是 | 历史计划文本 |

## 使用场景

**通常表示：**
- Codex 发布或更新当前计划
- 历史 transcript 中包含 plan item
- 线程回放中的非交互式计划卡片

## 注意事项

- 当前 CX Viewer 的 Codex 映射中，除非存在单独审批流，否则计划卡片是非交互式的。
- 它不同于 [AskUserQuestion](Tool-AskUserQuestion.md)；后者表示结构化输入请求。
- 旧 Claude 风格“从 plan file 读取并退出 plan mode”的行为，不再作为 Codex app-server 日志的事实来源。
