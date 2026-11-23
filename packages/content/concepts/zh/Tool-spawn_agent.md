# spawn_agent

`spawn_agent` 为一个具体、边界清晰且可以独立推进的任务创建子 Agent。新 Agent 会获得规范化任务名，并与根 Agent 共享工作区。

字段：

- `task_name`：小写任务标识，必填。
- `message`：初始任务说明，必填。
- `fork_turns`：复制最近多少轮会话上下文，可选。

任务强依赖串行上下文或没有独立交付物时，不应使用本工具。
