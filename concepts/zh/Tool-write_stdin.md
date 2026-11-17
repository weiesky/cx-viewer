# write_stdin

向 `exec_command` 返回的运行中会话发送输入，或等待后续输出。通常使用 `session_id`、`chars` 和 `yield_time_ms`；具体字段与等待规则以当前运行环境的工具 schema 为准。
