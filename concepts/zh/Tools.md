# Codex 工具一览

CX Viewer 现在以 Codex app-server 协议作为主要事实来源。UI 里的“工具”可能来自原生 `ThreadItem`、JSON-RPC server request、MCP/dynamic 集成，也可能来自导入的旧 SDK 日志。这里把这些来源分开，避免把旧 Claude 风格工具误认为当前 Codex 原生工具。

## 已核对来源

- Codex manual：Subagents、MCP、app-server、sandbox/approval、web search、skills 等章节。
- 本地生成的 app-server schema：`ThreadItem`、`CollabAgentTool` 与 server request 结构。
- CX Viewer 桥接层：`lib/appserver-bridge.js` 中从 Codex item 到 `tool_use` / `tool_result` 的映射。
- 现有 SDK/import 兼容路径。

## Codex 原生工具事件

| 工具文档 | Codex 来源 / wire item | CX Viewer 展示 | 状态 |
|----------|-------------------------|----------------|------|
| [Bash](Tool-Bash.md) | `ThreadItem.type = "commandExecution"` | `Bash` | 原生 |
| [FileChange](Tool-FileChange.md) | `ThreadItem.type = "fileChange"` | live 日志中仍显示 `apply_patch`，文档归到 FileChange | 原生 |
| [MCPToolCall](Tool-MCPToolCall.md) | `ThreadItem.type = "mcpToolCall"` 与 MCP progress 事件 | 已知 server 时显示 `server.tool` | 原生 |
| [DynamicToolCall](Tool-DynamicToolCall.md) | `ThreadItem.type = "dynamicToolCall"` 与 `item/tool/call` | 已知 namespace 时显示 `namespace.tool` | 原生 |
| [Agent](Tool-Agent.md) | `collabAgentToolCall`、`subAgentActivity`、thread `source.subAgent` | MainAgent/SubAgent 身份与 agent 工具卡 | 原生 |
| [SendMessage](Tool-SendMessage.md) | `CollabAgentTool = "sendInput"` | agent 通信卡 | 原生 / 兼容 |
| [WebSearch](Tool-WebSearch.md) | `ThreadItem.type = "webSearch"` 与 `web_search` alias | `web_search` | 原生 |
| [ImageView](Tool-ImageView.md) | `ThreadItem.type = "imageView"` | `view_image` | 原生 |
| [AskUserQuestion](Tool-AskUserQuestion.md) | `item/tool/requestUserInput` 与 `mcpServer/elicitation/request` | `AskUserQuestion` | 原生映射 |
| [ExitPlanMode](Tool-ExitPlanMode.md) | `turn/plan/updated` 与 `ThreadItem.type = "plan"` | 非交互式 plan 卡片 | 原生映射 |
| [Skill](Tool-Skill.md) | Codex skill 加载与 skill metadata | Skill 能力 / 文档卡 | 原生能力 |

## 兼容工具文档

这些文档保留是因为导入日志、旧 SDK 事件或插件表面仍可能产生这些名字。它们不是当前 app-server `ThreadItem` 原生工具类型。

| 工具文档 | 已核对来源 | CX Viewer 展示 | 状态 |
|----------|------------|----------------|------|
| [Read](Tool-Read.md) | 旧日志 / 导入的文件读取事件 | `Read` | 兼容 |
| [Edit](Tool-Edit.md) | 旧日志 / 导入的编辑事件 | `Edit` | 兼容 |
| [Write](Tool-Write.md) | 旧日志 / 导入的写入事件 | `Write` | 兼容 |
| [NotebookEdit](Tool-NotebookEdit.md) | 旧 notebook 编辑事件 | `NotebookEdit` | 兼容 |
| [Glob](Tool-Glob.md) | 旧日志 / 导入的搜索事件 | `Glob` | 兼容 |
| [Grep](Tool-Grep.md) | 旧日志 / 导入的搜索事件 | `Grep` | 兼容 |
| [WebFetch](Tool-WebFetch.md) | 旧日志 / 导入的网页抓取事件 | `WebFetch` | 兼容 |
| [Task](Tool-Task.md) | 旧 SubAgent 命名与导入日志 | `Task` 或 `Agent` | 兼容 alias |
| [EnterPlanMode](Tool-EnterPlanMode.md) | 旧 plan-mode 工具日志 | `EnterPlanMode` | 兼容 |
| [EnterWorktree](Tool-EnterWorktree.md) | 旧 worktree/tool 日志 | `EnterWorktree` | 兼容 |
| [getDiagnostics](Tool-getDiagnostics.md) | IDE/plugin diagnostics 表面 | `getDiagnostics` | 兼容 |
| [executeCode](Tool-executeCode.md) | Notebook/kernel plugin 表面 | `executeCode` | 兼容 |

## 暂缓或移出主目录

以下名字出现在旧文档或本地 UI helper 中，但本轮没有在当前 Codex app-server `ThreadItem` 工具类型里核对到：`TeamCreate`、`TeamDelete`、`TaskCreate`、`TaskGet`、`TaskUpdate`、`TaskList`、`TaskOutput`、`TaskStop`、`Workflow`、`Monitor`、`CronCreate`、`CronDelete`、`ScheduleWakeup`、`PushNotification`、`RemoteTrigger`、`ExitWorktree`、`LSP`、`ToolSearch`。

它们可能仍由专门的 viewer 面板或旧日志导入路径解析；在确认并完成相应 Codex 表面迁移前，不再放进主工具目录。
