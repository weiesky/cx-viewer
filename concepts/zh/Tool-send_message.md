# send_message

`send_message` 向现有 Agent 的队列投递消息并尽快送达，但不会启动一个新轮次。

字段：

- `target`：`spawn_agent` 返回的相对或规范任务名，必填。
- `message`：要投递的上下文、证据或指导，必填。

如果需要让空闲目标主动开始另一个任务，应改用 `followup_task`。
