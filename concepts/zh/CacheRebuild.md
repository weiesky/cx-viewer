# Cache Rebuild（缓存重建）

## 背景

当 provider 侧发生缓存复用时，Codex/OpenAI usage 可能会上报缓存输入 token。CX-Viewer 会对比连续两个 MainAgent 请求 body，用于解释缓存复用为什么可能发生变化。

缓存诊断有助于费用、延迟和上下文质量排查。它基于 CX-Viewer 归一化后的 entry，而不是依赖某个 provider 特有的请求标记。

## 缓存重建原因分类

CX-Viewer 通过对比前后两个 MainAgent 请求 body，识别可能的缓存/上下文变化原因：

| reason | 含义 | 判断方式 |
|--------|------|----------|
| `ttl` | 长时间空闲 | 距上一个 MainAgent 请求超过 5 分钟 |
| `system_change` | system prompt 变更 | `JSON.stringify(prev.system) !== JSON.stringify(curr.system)` |
| `tools_change` | 工具定义变更 | `JSON.stringify(prev.tools) !== JSON.stringify(curr.tools)` |
| `model_change` | 模型切换 | `prev.model !== curr.model` |
| `msg_truncated` | 消息栈被截断 | 当前请求的 messages 数量少于上一个请求，通常因上下文窗口溢出触发截断 |
| `msg_modified` | 历史消息修改 | 前缀消息内容不一致（正常追加时前缀应完全相同） |
| `key_change` | 未知键变更 | 以上条件均不匹配时的 fallback |

## 判断优先级

1. 首先检查时间间隔——超过 5 分钟直接判定为 `ttl`，不再做 body 对比
2. 然后依次检查 model、system、tools、messages
3. 一个请求可能同时命中多个原因（如模型切换 + system prompt 变更），此时 `reasons` 数组包含所有匹配项，tooltip 换行显示

## 常见场景

- **`ttl`**：用户暂停操作超过 5 分钟后继续，缓存自然过期
- **`system_change`**：Codex 更新了 system prompt（如加载新的 `AGENTS.md`、project instructions 变化）
- **`tools_change`**：MCP server 连接/断开导致可用工具列表变化
- **`model_change`**：用户通过 `/model` 命令切换模型
- **`msg_truncated`**：对话过长触发上下文窗口管理，Codex 截断早期消息
- **`msg_modified`**：Codex 对历史消息做了编辑（如 `/compact` 压缩摘要替换原始消息）
