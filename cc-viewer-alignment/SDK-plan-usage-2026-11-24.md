# SDK 左下角套餐用量（2026-11-24）

交付更新：已于2026-11-24通过[PR #15](https://github.com/weiesky/cx-viewer/pull/15)合并main `8a63f94`，原实现提交保留，10/10远端CI成功；见[合并回执](./PR15-delivery-2026-11-24.md)。以下保留原实施/验收时点记录，当前GitHub交付状态以合并回执为准。

用户要求 SDK 模式也显示截图所指的左下角套餐用量。独立实现提交 `b61814f6a99ae01d38fceb440849090753f314da`，父提交 `e9f0017`；本轮属于 B11 后 Codex 原生数据源适配，不新增 B0 上游提交核销。

## 源码依据与实现

先读上游 `9eb178145bb218e0a84d806f350ac84f7287a537` 实际 diff，核对固定快照 `74cd752d99caf122e750216d2af3bb9f467c4de1` 的 App footer、UsageWindowPill 完整组件/CSS 与 response.headers → rateLimitParser 链路。`--follow` 历史确认原组件经 `48c9f4c0` 调整、`e3ca28c5` 路径迁移后，由 `9eb17814` 移除无数据占位；固定快照没有后续该组件修复/回退。复核本地 App/AppBase → requests → planUsageDisplay → UsageWindowPill，以及 SDK manager → exec/AppServer、原生 stdio client、模型目录只读 sidecar 与 scope 生命周期。

缺口是原组件只消费捕获响应头；SDK 对话记录不会自动提供账户限额。保留现有 footer 位置、组件/CSS、百分比与悬浮详情，新增 SDK 数据读取 wrapper，不新增布局、入口或国旗网络查询。

- `sdk-plan-usage.js` 复用现有受监管 stdio client 和 config serializer，使用会话实际 executable/cwd/env/config，只调用 initialize → account/read（refreshToken=false）→ account/rateLimits/read，然后关闭自有进程。协议依据为 [Codex App Server](https://learn.chatgpt.com/docs/app-server#6-rate-limits-chatgpt)。不创建/恢复线程，不发送输入，不改变 exec/AppServer 所有权或全局配置。
- 兼容单 bucket 与多 bucket 原生结果，Codex 主 bucket 排在前面；primary/secondary 按实际窗口时长显示。百分数转占比，Unix 秒转毫秒；白名单提取 quota 字段并校验数字/标识/数量，不向前端传账户身份、令牌或任意原生字段。API-key、自定义非 OpenAI provider、无有效窗口继续按原规则隐藏。
- `/api/sdk-plan-usage` 沿用精确 instance 路由，响应 no-store；manager 按实例合并并发读取、缓存 30 秒，关闭/恢复/重置时中止旧读取并拒绝旧代次。两种 transport 使用相同只读入口。
- `SdkPlanUsagePill` 在 live SDK footer 挂载，进入即读、完成后每 60 秒刷新，失败清空；退出时中止请求与定时器，旧 scope/卸载后迟到响应不能写入。独立于 requests，聊天数据更新不会覆盖原生 quota。非 SDK 响应头显示与本地历史隐藏规则继续使用原逻辑。
- patch changeset 已记录；新增发布源码仅 `lib/sdk-plan-usage.js`，已逐项检查并更新 tarball 路径基线。未运行 version、未发布 npm。

## 验证

[机器回执](./SDK-plan-usage-2026-11-24.json)保留日志、提交和原生结果。

- 定向后端 **12/12**、Web **155/155**。最终隔离全量 **2850/2850，0 skip，退出 0**（9+7+28+814+1746+246）；build、535 文件边界/0违规、604 发布源码路径与 629 稳定 tarball 路径通过。
- 覆盖原生多窗口/旧协议/空占位/非法值/无订阅/失败关闭、自定义 provider 不查全局订阅、exec 与 AppServer scoped HTTP、同名工作区、缓存与并发合并、关闭时取消、前端刷新/失败清空/工作区切换/卸载迟到响应，以及既有模型选择回归。
- **真实原生账户 → SDK HTTP → Chrome mounted DOM**：未模拟 quota 响应，实际显示 **周 85%**；悬浮详情显示 **Pro Lite、Codex 周额度、重置倒计时**；页面刷新后恢复，无 pageerror，registry sessionId 仍 null（未创建原生线程、未发送模型输入）。已实际核看[footer](./evidence/SDK-plan-usage-2026-11-24/chromium-footer.png)和[详情](./evidence/SDK-plan-usage-2026-11-24/chromium-details.png)截图。测试用 Viewer 的日志/偏好隔离，完成后只关闭自有 fixture。
- 首次定向测试的 sandbox config 断言不符合既有 serializer，已改为验证实际 profile/config 契约；首次全量在新发布路径基线门停止，复核仅新增一个源码路径并重新生成后最终全量通过。短暂 Git index 锁竞争通过有限重试结束，未删锁。

## 当前状态与下一步

当前包为 B11 后 SDK 套餐用量维护；下一步是正常重启后的活动实例 GUI 验收。只读确认活动 **7008/PID14189、sdkMode=true**，新 quota API 仍返回 SPA HTML，说明活动后端尚未加载本轮接口；不能以已构建文件或隔离 Chrome 结果冒称活动已生效。代理未停止/重启该实例，未改已有归档或全局 Codex 配置。

Windows、Electron GUI、WebKit 与真机尚未验证；既有上下文回跳和模型选择维护见 [SDK context](./SDK-context-jump-2026-11-24.md)、[模型切换](./SDK-model-switch-2026-11-24.md)。
