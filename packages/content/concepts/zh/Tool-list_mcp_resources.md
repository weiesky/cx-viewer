# list_mcp_resources

`list_mcp_resources` 用来列出 MCP server 提供的资源。资源可以是文件、数据库 schema 或应用上下文等，适合在可用时优先于网络搜索使用。

字段：

- `server`：可选，限定某个 MCP server。
- `cursor`：可选，用于分页继续读取。
