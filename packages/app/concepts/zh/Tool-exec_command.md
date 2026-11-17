# exec_command

在支持该接口的运行环境中执行 shell 命令。常见参数包括 `cmd`、`workdir` 和 `yield_time_ms`；长时间运行的命令可能返回会话 ID，可通过 `write_stdin` 等待或交互。字段、沙箱和审批要求以当前工具 schema 为准。
