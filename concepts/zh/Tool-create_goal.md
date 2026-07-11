# create_goal

`create_goal` 只在用户或系统明确要求创建 goal 时使用。它会启动一个新的活跃目标；如果已有未完成目标，调用会失败。

字段：

- `objective`：具体目标，必填。
- `token_budget`：可选；只有用户明确要求 token 预算时才设置。
