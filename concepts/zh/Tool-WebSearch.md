# WebSearch

## 定义

表示 Codex 的网页搜索事件。在 app-server schema 中它是 `ThreadItem.type = "webSearch"`，包含搜索 `query` 和可选 `action`。

Codex web search 是否可用取决于 runtime 配置和策略。CX Viewer 只在 Codex 上报事件时记录它，不决定搜索是 enabled、cached、live 还是 disabled。

## 已核对字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `query` | string | 搜索查询 |
| `action` | object/null | app-server 上报的搜索 action metadata |

## 使用场景

**通常表示：**
- 当前事件和近期变化的事实
- 最新产品、包、API 或政策信息
- 为技术问题查找一手文档

## 注意事项

- CX Viewer 为兼容旧日志，将该事件显示为 `web_search`。
- `Tool-web_search` 链接会 alias 到本页。
- 最终回答是否引用来源由 Codex 处理；CX Viewer 只保留事件。
