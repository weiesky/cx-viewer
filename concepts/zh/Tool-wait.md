# wait

`wait` 用来恢复一个已 yield 的 `exec` cell，只返回本次新增输出或最终完成状态。

字段：

- `cell_id`：运行中的 exec cell 标识，必填。
- `yield_time_ms`：再次 yield 前的等待时间。
- `max_tokens`：本次 wait 返回内容的 token 上限。
- `terminate`：为 true 时终止 cell，而不是继续等待。

只有在 `exec` 明确报告脚本仍在运行并返回 cell id 后才使用本工具。
