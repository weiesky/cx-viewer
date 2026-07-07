# Bash

## 定义

表示 Codex 的终端命令事件。在 app-server schema 中它是 `ThreadItem.type = "commandExecution"`，不是 Claude 风格的自由表述工具定义。

CX Viewer 仍将它展示为 `Bash`，因为这是 UI 中已有的终端卡片名称。

## 已核对字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `command` | string | Codex 执行的命令 |
| `cwd` | string | 工作目录 |
| `processId` | string/null | 可用时的底层 PTY 进程 id |
| `source` | string | 命令执行来源 |
| `status` | string | 当前执行状态 |
| `commandActions` | array | 对命令动作的尽力解析 |
| `aggregatedOutput` | string/null | stdout/stderr 聚合输出 |
| `exitCode` | number/null | 进程退出码 |
| `durationMs` | number/null | 执行耗时，单位毫秒 |

## 使用场景

**通常表示：**
- 运行测试和构建命令
- Git status/diff/log 操作
- 包管理器命令
- 检查系统状态

## 注意事项

- `item/commandExecution/outputDelta` 与 PTY 输出 delta 会在最终 item 到达前被收集。
- Codex 需要命令审批时，`item/commandExecution/requestApproval` 会被处理。
- sandbox 与审批策略由 Codex runtime 决定；CX Viewer 只负责记录和展示。
- SubAgent 命令会继承 app-server source metadata 中的线程 / subagent 身份。
