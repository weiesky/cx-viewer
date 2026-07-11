# Teammate

## 定义

Teammate 是 Codex Agent Team 模式下的协作 agent。主 agent 会通过 `tool_search` 发现当前可用的 multi-agent 工具；当这些工具可用时，每个 teammate 作为独立的 agent 进程运行，拥有自己的上下文窗口和工具集。

## 与 SubAgent 的区别

| 特征 | Teammate | SubAgent |
|------|----------|----------|
| 生命周期 | 持续存在，可接收多次消息 | 一次性任务，完成即销毁 |
| 通信方式 | 通过可用 multi-agent 工具集进行团队通信 | 父→子单向调用，返回结果 |
| 上下文 | 独立完整上下文，跨轮次保留 | 隔离的任务上下文 |
| 协作模式 | 团队协作，可相互通信 | 层级结构，只与父 agent 交互 |
| 任务类型 | 复杂的多步骤任务 | 搜索、探索等单一任务 |

## 行为

- 由主 agent（team lead）通过可用 multi-agent 工具创建并分配团队身份
- 通过可用 multi-agent 任务/状态工具共享任务状态
- 每轮执行完毕后进入 idle 状态，等待新消息唤醒
- 可通过 `shutdown_request` 优雅终止

## 统计面板说明

Teammate 统计面板显示每个 teammate 的 API 调用次数。`Name` 列为 teammate 名称（如 `reviewer-security`、`reviewer-pipeline`），`次数` 列为该 teammate 产生的 API 请求总数。
