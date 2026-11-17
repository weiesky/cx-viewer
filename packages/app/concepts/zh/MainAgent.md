# MainAgent

## 定义

MainAgent 是 Codex 在非 agent team 状态下的主干请求链路。每一次用户与 Codex 的交互，都会产生一系列 API 请求，其中 MainAgent 请求构成了核心对话链路。对于 OpenAI Responses API，MainAgent 会携带完整的 `instructions`、`tools` 和 `input`。

## 识别方式

在 cx-viewer 中，MainAgent 通过 `req.mainAgent === true` 标识，由 `interceptor.js` 在请求捕获时自动标记。

判定条件（满足全部）：
- 请求体包含 `instructions` 字段
- 请求体包含 `input` 数组
- 请求体包含 `tools` 数组（工具定义）
- `instructions` 中包含 "Codex" 特征文本

## 与 SubAgent 的区别

| 特征 | MainAgent | SubAgent |
|------|-----------|----------|
| instructions | 完整的 Codex 主指令 | 精简的任务专用指令 |
| tools 数组 | 包含全部可用工具 | 通常只包含任务所需的少量工具 |
| input | 累积完整对话上下文 | 仅包含子任务相关输入 |
