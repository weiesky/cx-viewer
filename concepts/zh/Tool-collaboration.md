# collaboration

`collaboration` 是用于协调 teammate 与根 Agent 并行工作的 Multi-Agent V2 工具组。UI 中的工具组 chip 是入口；其可调用操作包括 `spawn_agent`、`send_message`、`followup_task`、`wait_agent`、`interrupt_agent` 和 `list_agents`。

## 操作一览

| 操作 | 用途 |
| --- | --- |
| `spawn_agent` | 为一个具体、边界清晰且可独立推进的任务创建 teammate。 |
| `send_message` | 向现有 teammate 投递上下文或指导，但不启动新轮次。 |
| `followup_task` | 给现有非根 teammate 分配后续任务，并在其空闲时启动。 |
| `wait_agent` | 等待 mailbox 更新、完成通知或用户转向消息。 |
| `list_agents` | 查看活跃 Agent 树及任务状态。 |
| `interrupt_agent` | 停止 teammate 当前轮次，但保留它供后续复用。 |

## 工作模型

- 所有 teammate 共享同一个工作区，会立刻看到其他 Agent 的文件改动。
- `spawn_agent` 返回 Agent id 和规范任务路径，后续操作通过 `target` 引用它。
- `fork_turns` 控制复制多少会话上下文；无论如何设置，文件系统状态始终共享。
- 并发槽位有限，teammate 数量应与真正可以独立推进的工作量匹配。
- 多个 Agent 不应在没有明确协调时并发修改同一批文件。
- 当前协作策略可能要求用户或上层指令明确提出多 Agent 需求后，才能创建 teammate。

这些协作操作是直接工具，不属于 Code Mode `exec` 套件的嵌套方法。若只是并行调用多个普通工具，应在 `exec` 中使用 `Promise.all`；只有任务本身需要独立 Agent 上下文和独立交付物时，才使用 `collaboration`。

## 典型生命周期

1. 把任务拆成互相独立、边界清晰的交付物。
2. 使用 `spawn_agent` 创建 teammate，并保存返回的任务路径。
3. teammate 运行期间，根 Agent 继续推进本地工作。
4. 用 `send_message` 补充证据，或用 `followup_task` 复用空闲 teammate。
5. 用 `wait_agent` 或 `list_agents` 查看进度，汇总后交叉核对结果再行动。
6. 工作已过时或需要改向时使用 `interrupt_agent`；中断不会删除 teammate。

每个操作的精确字段与行为请查看对应的 `Tool-*` 文档。
