# request_user_input

`request_user_input` 用来在 Plan mode 下向用户提出 1 到 3 个结构化短问题。只有当用户输入确实能解除阻塞或明显提升计划质量时才应使用。

字段要点：

- `questions`：问题数组，必填。
- 每个问题包含 `id`、`header`、`question` 和 `options`。
- `autoResolutionMs`：可选，表示非阻塞问题的自动继续窗口。
