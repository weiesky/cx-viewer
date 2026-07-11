# apply_patch

`apply_patch` 是 Codex 修改文件的结构化 patch 工具。它接收 freeform patch，而不是 JSON。

适用场景：

- 新增、删除或更新仓库文件。
- 保持变更可审阅，避免用 shell 重定向直接写文件。
- 精确表达局部修改。

旧日志中的 `FileChange` 或 `fileChange` 是文件变更事件名，会兼容跳转到本工具。
