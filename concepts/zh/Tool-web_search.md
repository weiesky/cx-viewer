# web_search

`web_search` 用于访问网络搜索，支持文本和图片内容。Codex 官方手册说明，当 Codex 执行 web search 时，transcript 中会出现 `web_search` 项；该能力也可通过配置切换为缓存、实时或禁用。

适用场景：

- 用户明确要求联网、查询最新信息或验证当前事实。
- 需要官方文档、直接链接或精确来源。
- 信息有较高概率已经变化。

响应侧的 `web_search_call` 会兼容跳转到本工具文档。
