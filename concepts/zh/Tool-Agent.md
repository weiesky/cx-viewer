# Agent

## 定义

表示 Codex 的 subagent 与协作 agent 活动。在 app-server schema 中它不是单一的 `Agent` item；CX Viewer 会从以下已核对来源组装 Agent 视图：

- `ThreadItem.type = "collabAgentToolCall"`
- `ThreadItem.type = "subAgentActivity"`
- 线程 source metadata，例如 `source.subAgent`

Codex 只有在用户或 runtime 明确要求时才会 spawn subagent。manual 中描述了 default、worker、explorer 等内置 profile；app-server 上报时，CX Viewer 会记录对应 profile 或 activity kind。

## 已核对字段

`collabAgentToolCall`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `tool` | enum | `spawnAgent`、`sendInput`、`resumeAgent`、`wait`、`closeAgent` 之一 |
| `status` | string | 当前工具调用状态 |
| `senderThreadId` | string | 发起协作请求的线程 |
| `receiverThreadIds` | array | 目标或新建 agent 线程 |
| `prompt` | string/null | 发送给目标 agent 的 prompt |
| `model` | string/null | 存在时表示请求的模型 |
| `reasoningEffort` | string/null | 存在时表示请求的 reasoning effort |
| `agentsStates` | object | 目标 agent 的最后状态 |

`subAgentActivity`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `kind` | string | 活动类型或 agent 角色 |
| `agentThreadId` | string | agent 线程 id |
| `agentPath` | string | app-server 上报的 agent 路径 |

## 使用场景

**通常表示：**
- spawn 或 resume subagent
- main thread 给 worker/explorer agent 发送输入
- 等待或关闭某个 agent
- app-server metadata 中的 subagent activity 标记

## 注意事项

- CX Viewer 会将 subagent turn 标记为 `subAgent: true`，并与 MainAgent turn 分开展示。
- `Task` 保留为导入日志的旧 alias。Codex 原生文档优先使用 `Agent`。
- subagent 产生的工具事件会继承同一个 subagent 身份。
