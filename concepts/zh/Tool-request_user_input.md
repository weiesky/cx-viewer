# request_user_input

`request_user_input` 用来在当前工具清单已装载它时，向用户提出 1 到 3 个结构化短问题；Default 与 Plan mode 都可使用。Default mode 下应优先作出安全、合理的假设继续执行，只在缺少用户选择会造成实质风险或真正阻塞时使用。

字段要点：

- `questions`：问题数组，必填。
- 每个问题包含 `id`、`header`、`question` 和 `options`。
- `autoResolutionMs`：可选，表示非阻塞问题的自动继续窗口。
