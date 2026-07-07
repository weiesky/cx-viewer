# EnterWorktree

## 定义

旧 worktree transition 日志的兼容文档。本轮 Codex 核对中，`EnterWorktree` 没有出现在当前 app-server `ThreadItem` 工具类型里。CX Viewer 保留此页，是为了让历史链接和导入日志仍有解释。

## 参数

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 否 | `name`（可选）：worktree 的名称。未提供时自动生成随机名称。 |

## 使用场景

**适合使用：**
- 用户明确说 "worktree"（如 "创建一个 worktree"、"在 worktree 中工作"）

**不适合使用：**
- 用户要求创建分支、切换分支——使用 git 命令
- 用户要求修复 bug 或开发功能——除非明确提到 worktree，否则使用正常 git 工作流

## 注意事项

- 将本页视作兼容表面，不作为当前 Codex app-server 的事实来源。
- 当前 branch/worktree 行为应优先从 Codex runtime 事件、git 命令或 app metadata 推断。
