# WebFetch

## 定义

导入日志或旧 web-fetch 工具日志的兼容文档。本轮核对的当前 Codex app-server schema 中，网页搜索由 `ThreadItem.type = "webSearch"` 表示，没有核对到一等 `WebFetch` `ThreadItem`。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string (URI) | 是 | 要抓取的完整 URL |
| `prompt` | string | 是 | 描述要从页面中提取什么信息 |

## 使用场景

**适合使用：**
- 获取公开网页的内容
- 查阅在线文档
- 提取网页中的特定信息

**不适合使用：**
- 需要认证的 URL（Google Docs、Confluence、Jira、GitHub 等）——应先查找专用的 MCP 工具
- GitHub URL——优先使用 `gh` CLI

## 注意事项

- URL 必须是完整的有效 URL
- 内容过大时结果可能被摘要
- 专用 MCP 或 dynamic 工具可能提供自己的 fetch 行为，并应展示为 [MCPToolCall](Tool-MCPToolCall.md) 或 [DynamicToolCall](Tool-DynamicToolCall.md)。
- 将本页视为兼容文档，不作为当前 Codex app-server 的事实来源。
