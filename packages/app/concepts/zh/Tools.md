# Codex 工具

“全部工具”是静态参考目录，不代表当前会话实际装载的工具。实际能力取决于 CLI 版本、模型、功能配置和宿主；`namespace` 类型条目表示分组，其子项为可调用操作。上下文中展示的请求工具也可能是 CX Viewer 为 App Server 或 SDK 模式合成的参考数据。

## Code Mode

- exec：Code Mode 的工具编排套件，在全新的 V8 isolate 中发现、组合、并行执行和续跑嵌套工具 workflow。
- wait：继续等待或终止已 yield 的 exec cell，并返回最新输出。

## 核心工具

- shell_command：部分运行环境使用的 shell 工具。
- exec_command：部分运行环境使用的命令执行工具，可以返回运行中的进程会话。
- write_stdin：向运行中的命令会话写入输入或等待输出。
- apply_patch：用结构化 patch 修改工作区文件。
- view_image：查看本地图片文件。
- update_plan：维护任务计划。
- request_user_input：当前工具清单已装载时，可在 Default 或 Plan mode 下向用户提出结构化短问题。
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

- collaboration：Multi-Agent V2 工具组，用于创建、通信、复用、等待、检查和中断 teammate。
- spawn_agent：创建一个边界清晰的子 Agent 任务。
- send_message：向现有 Agent 投递上下文或指导，但不启动新一轮。
- followup_task：分配后续任务，并在目标空闲时启动它。
- wait_agent：等待 mailbox、完成通知或用户转向消息。
- interrupt_agent：停止目标当前轮次，同时保留该 Agent 供后续复用。
- list_agents：查看当前线程树中的活跃 Agent。

MCP、插件和连接器工具随会话发现和注入。Code Mode 与协作工具的名称和具体接口随运行环境变化；应以实际工具 schema 为准。历史工具名仍保留，以便阅读旧日志。

差异视图会比较 namespace 子项，以及可解析的 `exec` 描述中的声明；后者只是文本声明，不证明工具在运行时可用。缺失声明不会被当作空列表。

## 版本对照

0.142.5 与 0.169.0 的官方源码都包含 Code Mode、统一命令执行和工具发现能力，不能笼统称为近期新增。0.169.0 的模型目录包含使用 `code_mode_only` 的新模型；工具选择还会受配置和服务端模型目录影响。参见 [0.142.5 功能开关](https://github.com/openai/codex/blob/rust-v0.142.5/codex-rs/features/src/lib.rs)、[0.169.0 功能开关](https://github.com/openai/codex/blob/rust-v0.169.0/codex-rs/features/src/lib.rs)、[0.169.0 模型目录](https://github.com/openai/codex/blob/rust-v0.169.0/codex-rs/models-manager/models.json) 和 [工具发现实现](https://github.com/openai/codex/blob/rust-v0.169.0/codex-rs/core/src/tools/handlers/tool_search_spec.rs)。
