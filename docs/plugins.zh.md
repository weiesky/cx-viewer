# CX-Viewer插件系统

[English](./plugins.md) · [服务与面板插件](./plugin-services.zh.md)

插件目录为 `$CXV_LOG_DIR/plugins/`（默认 `~/.codex/cx-viewer/plugins/`），也支持随包的plugins目录；用户同名插件优先。单个 `.js`/`.mjs` 导出 `{name,hooks}`，目录插件声明 `plugin.json`。插件是可信本地代码，进程隔离用于故障恢复，不是安全沙箱。

Waterfall按插件顺序串行执行：`httpsOptions` 在启动前提供 `{cert,key}` 或 `{pfx,passphrase}`；`localUrl` 返回 `{url}` 修改分享链接；`beforeRequest` 接收 `{req,res,url,method,parsedUrl,handled}`，写响应后只返回 `{handled:true}`。原生认证、受保护管理路由与精确workspace校验先执行，勿覆盖请求身份字段。

Parallel通知包括 `serverStarted`、`serverStopping`、`onNewEntry`、`onAgentLoopStart` 和 `onAgentLoopEnd`。serverStarted提供port/host/url/basePath/ip/token/protocol/httpServer/registerRoute，可通过registerRoute注册认证后的自定义API，不暴露无作用域PTY或原生审批resolver。agent-loop保留原生精确instance与turn身份，来自SDK或PTY各自接受/终止信号。

加载器为兼容保留上游权限/计划/Ask hook名称与15秒超时；Codex原生审批、reviewer和Ask不调用Claude resolver。超时无法取消插件自身的异步工作。异常隔离并记录，插件管理或disabledPlugins可禁用；Reload重扫单文件及目录。目录生命周期、热更新限制、子进程密钥与面板构建见[服务插件](./plugin-services.zh.md)。本地voiceInput及capability/moduleVersion语音兼容保持。

完整可运行的单文件示例见[English](./plugins.md)。
