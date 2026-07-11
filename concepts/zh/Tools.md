# Codex 工具

“上下文消耗”弹窗里的 Codex 工具清单来自当前会话请求体中的已装载工具，而不是旧版工具集合。当前主 Agent 最近一次请求装载了 14 个工具：

- shell_command：运行本地 shell 命令，并通过 sandbox/approval 字段表达权限边界。
- apply_patch：用结构化 patch 修改工作区文件。
- view_image：查看本地图片文件。
- update_plan：维护任务计划。
- request_user_input：在 Plan mode 下向用户提出结构化短问题。
- get_goal：读取当前 goal 的状态、预算和用量。
- create_goal：在明确要求时创建 goal。
- update_goal：在目标真正完成或满足阻塞规则时更新 goal 状态。
- tool_search：搜索延迟装载工具的元数据，并让匹配工具在下一轮可用。
- list_mcp_resources：列出 MCP server 暴露的资源。
- list_mcp_resource_templates：列出 MCP server 暴露的参数化资源模板。
- read_mcp_resource：读取指定 MCP 资源。
- web_search：访问网络搜索文本或图片内容。
- image_generation：生成 PNG 图片。

旧版工具名不属于当前 Codex 工具清单，也不再作为概念文档别名保留。
