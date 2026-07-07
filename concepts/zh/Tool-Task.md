# Task

> **注意：** `Task` 只作为旧日志兼容名称保留。Codex 原生流量应优先参考 [Agent](Tool-Agent.md)。

## 定义

表示旧导入日志中名为 `Task` 的 subagent 启动。在当前 Codex app-server 流量中，subagent 与协作 agent 活动由 `collabAgentToolCall`、`subAgentActivity` 和线程 source metadata 表示。

## CX Viewer 映射

- 导入的 `Task` 调用会归一化到与 `Agent` 相同的 subagent 可视模型。
- 原生 Codex 的 `spawnAgent` 等协作调用应参考 [Agent](Tool-Agent.md)。
- 如果日志里包含旧 `Task` 参数，CX Viewer 只把它们作为尽力展示数据，不视为当前 Codex schema。

## 注意事项

- 保留此页是为了兼容旧 JSONL 导入和历史 UI 链接。
- 不要把本页当作当前 Codex subagent 字段的事实来源。
