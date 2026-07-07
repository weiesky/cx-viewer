# EnterPlanMode

## 定义

旧 plan-mode transition 日志的兼容文档。当前 Codex app-server 中，计划内容通常通过 `turn/plan/updated` 或 `ThreadItem.type = "plan"` 上报，并由 [ExitPlanMode](Tool-ExitPlanMode.md) 卡片展示。

## 参数

无参数。

## 使用场景

**通常表示旧日志中的：**
- 新功能实现——需要架构决策
- 存在多种可行方案——需要用户选择
- 代码修改影响现有行为或结构
- 多文件变更——可能涉及 2-3 个以上文件
- 需求不明确——需要先探索再理解范围
- 用户偏好很重要——实现可以有多种合理方向

**不适合作为当前原生来源：**
- 单行或少量行的修复（拼写错误、明显 bug）
- 用户已给出非常具体的指令
- 纯研究/探索任务

## 规划模式中的行为

旧日志中进入规划模式通常表示：
1. 使用 Glob、Grep、Read 工具深入探索代码库
2. 理解现有模式和架构
3. 设计实施方案
4. 将方案提交给用户审批
5. 方案就绪后离开 plan mode

## 注意事项

- `EnterPlanMode` 保留在目录中，是为了兼容导入 / 历史日志。
- Codex 原生 app-server transcript 的计划更新请参考 [ExitPlanMode](Tool-ExitPlanMode.md)。
