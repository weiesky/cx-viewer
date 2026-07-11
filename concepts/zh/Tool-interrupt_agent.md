# interrupt_agent

`interrupt_agent` 会停止目标 Agent 当前正在运行的轮次，并返回此前状态。目标不会被删除，之后仍可接收消息或后续任务。

字段：

- `target`：Agent id 或规范任务名，必填。

本工具用于终止或改向已经过时的工作，不应代替普通消息沟通。
