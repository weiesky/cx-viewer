# Codex 工具

“上下文消耗”弹窗里的 Codex 工具清单来自当前会话请求体中的已装载工具，而不是旧版工具集合。2026 年 7 月 11 日的本地请求日志包含 14 个嵌套/核心工具，以及两个新装载工具组中的 8 个可调用入口，共计 22 个已收录工具。

## Code Mode

- exec：Code Mode 的工具编排套件，在全新的 V8 isolate 中发现、组合、并行执行和续跑嵌套工具 workflow。
- wait：继续等待或终止已 yield 的 exec cell，并返回最新输出。

## 核心工具

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

## Multi-Agent V2

- spawn_agent：创建一个边界清晰的子 Agent 任务。
- send_message：向现有 Agent 投递上下文或指导，但不启动新一轮。
- followup_task：分配后续任务，并在目标空闲时启动它。
- wait_agent：等待 mailbox、完成通知或用户转向消息。
- interrupt_agent：停止目标当前轮次，同时保留该 Agent 供后续复用。
- list_agents：查看当前线程树中的活跃 Agent。

Code Mode 与 Multi-Agent V2 的工具名同时得到了本地请求体和 `openai/codex` 对应工具注册源码的确认。MCP、插件、App connector 等动态工具按会话发现和注入，因此不会硬编码进本目录。

旧版工具名不属于当前 Codex 工具清单，也不再作为概念文档别名保留。
