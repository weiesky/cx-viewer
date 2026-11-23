# shell_command

`shell_command` 用来在用户的 shell 中运行命令。调用时必须设置 `workdir`，避免依赖隐式当前目录。

常用字段：

- `command`：要执行的命令，必填。
- `workdir`：命令运行目录，必填。
- `timeout_ms`：超时时间。
- `sandbox_permissions`：使用默认沙箱，或在确实需要时请求 `require_escalated`。
- `justification`：请求提权时展示给用户的问题。
- `prefix_rule`：可选的、较窄范围的持久批准前缀。
