# KV-Cache 缓存内容

## 什么是 Prompt Caching？

当你使用 Codex 时，模型请求可能包含 system 指令、工具定义和对话历史。如果上游 OpenAI/Codex 服务在 usage 中上报了缓存输入 token，CX-Viewer 会把这些值展示为缓存用量。

CX-Viewer 中的"KV-Cache"是对 provider 上报的 prompt/cache 复用信息的 UI 简称，并不是 LLM 内部 attention 层的 key-value cache。

## 缓存的工作原理

CX-Viewer 不从请求体标记推断缓存命中。它会对比 MainAgent body 辅助诊断，同时只在 response usage 明确上报缓存 token 时展示缓存用量。

```
Tools / System Prompt / Messages
```

在 OpenAI Responses usage 中，缓存 token 可能出现在 `input_tokens_details.cached_tokens`；CX-Viewer 会归一化为 `cache_read_input_tokens`。

## "当前 KV-Cache 缓存内容"是什么？

CX-Viewer 中显示的"当前 KV-Cache 缓存内容"，来自最近一次 MainAgent 请求。具体包括：

- **System Prompt**：Codex 的系统指令，包含核心 agent 指令、工具使用规范、`AGENTS.md` 项目指令、环境信息等
- **Tools**：当前可用的工具定义列表（如 Read、Write、Bash、Agent、MCP 工具等）
- **Messages**：最近一次 MainAgent 请求中携带的对话历史

## 为什么要查看缓存内容？

1. **理解上下文**：了解 Codex 本轮实际发送给模型的内容
2. **费用/延迟诊断**：缓存用量可以帮助解释某些轮次为什么更便宜或更快
3. **调试对话**：当 Codex 回答不符合预期时，检查上下文可以确认 system prompt 和历史消息是否正确
4. **上下文质量监控**：在调试、修改配置或调整 prompt 的过程中，KV-Cache-Text 提供了一个集中的视角，帮助你快速确认核心上下文是否出现劣化或被意外内容污染——无需逐条翻阅原始报文

## 多级缓存策略

Provider 侧缓存细节会随模型、endpoint 和账号策略变化。CX-Viewer 因此把缓存指标当作"上游上报事实"展示，而不是在本地假设固定缓存模型。

## 缓存的生命周期

- **命中**：response 上报了缓存输入 token（`cache_read_input_tokens`）
- **未命中/未知**：response 没有上报缓存输入 token
- **上下文变化**：system prompt、工具列表、模型或消息内容相对上一条 MainAgent 请求发生变化
