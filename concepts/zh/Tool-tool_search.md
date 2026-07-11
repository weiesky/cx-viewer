# tool_search

`tool_search` 在延迟装载的工具元数据中搜索匹配项，并让结果中的工具在下一轮可被调用。

当前日志显示它用于发现多智能体工具、computer-use、node_repl、浏览器控制等插件或延迟工具。

字段：

- `query`：搜索词，必填。
- `limit`：返回工具数量上限，可选。

响应侧的 `tool_search_call` 会兼容跳转到本工具文档。
