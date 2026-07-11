# followup_task

`followup_task` 给现有的非根 Agent 分配后续任务，并在目标空闲时启动一轮。如果目标正在运行，任务会在安全的消息边界或当前工具调用结束后送达。

字段：

- `target`：Agent id 或规范任务名，必填。
- `message`：后续任务说明，必填。

它适合复用已有上下文与下一任务密切相关的 Agent。
