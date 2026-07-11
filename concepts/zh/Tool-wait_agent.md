# wait_agent

`wait_agent` 等待任意活跃 Agent 的 mailbox 更新。收到最终状态通知或新的用户输入改变当前轮次方向时，也会提前结束等待。

字段：

- `timeout_ms`：可选，必须处于运行时允许的等待范围内。

返回值只汇总哪些 Agent 有更新，不包含消息正文；实际内容应从会话中送达的 Agent 消息查看。
