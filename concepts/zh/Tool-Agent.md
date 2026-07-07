# Agent

## 定义

启动一个 Codex SubAgent，用独立上下文和工具权限处理边界清晰的任务。CX Viewer 会把这些 turn 标记为 `subAgent: true`，并与触发它们的 MainAgent turn 分开展示请求和响应。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `prompt` | string | 是 | SubAgent 要执行的任务描述 |
| `description` | string | 是 | UI 中显示的简短标签 |
| `subagent_type` | string | 是 | SubAgent profile 或能力集 |
| `model` | string | 否 | 可选模型覆盖 |
| `max_turns` | integer | 否 | 最大自主执行轮数 |
| `run_in_background` | boolean | 否 | 是否允许后台独立运行 |
| `resume` | string | 否 | 要继续的已有 agent/session id |
| `isolation` | string | 否 | 可选隔离模式，例如 worktree |

## 使用场景

**适合使用：**
- 大范围代码库探索
- 并行研究
- 长时间运行的实现子任务
- 需要隔离上下文的工作

**不适合使用：**
- 读取一个已知文件
- 在少量已知文件里搜索
- 很小的修改，直接调用工具更清晰

## 注意事项

- 如果用户需要看到结果，SubAgent 输出需要由 MainAgent 转述。
- SubAgent 产生的工具事件会保留相同的 `subAgentName` 和父线程元数据。
- 根线程工具调用会显示为 synthetic/tool 事件，不会被误判为 SubAgent turn。
