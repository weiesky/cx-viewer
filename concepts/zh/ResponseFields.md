# Response Body 字段说明

CX-Viewer 归一化后的 Codex 响应体字段说明。

## 顶层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| **model** | string | 实际使用的模型名称 |
| **id** | string | 响应或流式 item 的唯一标识符（如果来源协议提供） |
| **type** | string | 固定为 `"message"` |
| **role** | string | 固定为 `"assistant"` |
| **content** | array | 模型输出的内容块数组，包含文本、工具调用、思考过程等 |
| **stop_reason** | string | 归一化后的停止原因/状态，例如 `"end_turn"`、`"completed"`、`"failed"`、`"max_tokens"` |
| **stop_sequence** | string/null | 触发停止的序列，通常为 `null` |
| **usage** | object | Token 用量统计（详见下方） |

## content 块类型

| 类型 | 说明 |
|------|------|
| **text** | 模型的文本回复，含 `text` 字段 |
| **tool_use** | 工具调用请求，含 `name`（工具名）、`input`（参数）、`id`（调用 ID，用于匹配 tool_result） |
| **thinking** | 扩展思考内容（仅在开启 thinking 模式时出现），含 `thinking` 字段 |

## usage 字段详解

| 字段 | 说明 |
|------|------|
| **input_tokens** | 未命中缓存的输入 token 数（需要全价计费） |
| **cache_read_input_tokens** | 命中缓存的 token 数（缓存读取，计费远低于普通输入） |
| **output_tokens** | 模型输出的 token 数 |
| **reasoning_output_tokens** | 来源协议上报的推理 token 数 |
| **total_tokens** | 来源协议上报的总 token 数 |

OpenAI Responses usage 可能把缓存 token 放在 `input_tokens_details.cached_tokens` 中；CX-Viewer 会归一化到 `cache_read_input_tokens`，并从展示用的 `input_tokens` 中扣除，避免重复计数。

## stop_reason 含义

- **end_turn**：模型正常完成回复
- **tool_use**：模型需要调用工具；当来源协议提供结果时，CX-Viewer 会展示匹配的工具返回
- **max_tokens**：达到 `max_tokens` 限制被截断，回复可能不完整
