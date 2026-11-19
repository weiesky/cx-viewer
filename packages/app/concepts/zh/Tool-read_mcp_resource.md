# read_mcp_resource

`read_mcp_resource` 用来读取指定 MCP server 上的具体资源。

字段：

- `server`：MCP server 名称，必填。
- `uri`：资源 URI，必填，通常来自 `list_mcp_resources` 的返回值。

旧日志中的通用 `MCPToolCall` 或 `mcpToolCall` 不是当前装载工具名；相关入口会兼容跳转到本工具。
