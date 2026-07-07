# SendMessage

## 定义

表示 Codex 协作 agent 的输入发送。在生成的 schema 中，消息发送是 `CollabAgentTool` 的一个变体：`sendInput`。

CX Viewer 保留 `SendMessage` 文档名，是为了兼容现有 team/session UI；但 Codex 原生流量应理解为 `collabAgentToolCall`。

## 已核对字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `tool` | enum | 对应此行为时为 `sendInput` |
| `senderThreadId` | string | 发送输入的线程 |
| `receiverThreadIds` | array | 目标 agent 线程 id |
| `prompt` | string/null | 发送给目标 agent 的文本 |
| `status` | string | 当前调用状态 |
| `agentsStates` | object | 目标 agent 的最后状态 |

## 相关 Agent 工具

同一个 `CollabAgentTool` enum 还包含 `spawnAgent`、`resumeAgent`、`wait`、`closeAgent`。完整 Codex 原生映射见 [Agent](Tool-Agent.md)。
