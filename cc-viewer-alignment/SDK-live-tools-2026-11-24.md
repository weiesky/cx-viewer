# SDK 连续 shell 调用的对话实时进度

2026-11-24；实现 `817e698`，基于 B12 文档收口 `8c51a76`，分支 `fix/sdk-live-tool-progress`。这是用户报告后的独立 SDK 维护，不新增上游迁移核销；B12 完成、下一包 B13、第二轮冻结 `d3c1f7f` 均保持。

## 问题与代码依据

连续 `codex://sdk/tool/shell_command` 执行时，工具本身已有 SDK 事件，但对话要等下一条完整 MainAgent 才显示。实际调用链为：exec/AppServer → `sdk-manager._processEvent` → 当前轮 item 表 → 80ms `stream-progress` → server 控制流 → `AppBase.streamingLatest` → `ChatView` → `ChatMessage`。

逐层核对发现：

- `ChatView` 实时层明确只保留 text/thinking，丢弃 shell 的 tool_use；首轮无历史时，空面板分支也不渲染实时层。
- `AppBase` 在接收进度和冷加载时以“同时间戳、非 inProgress”判最终完成，未要求 MainAgent。已完成的 TOOL 行会误挡住该轮后续进度。
- SDK 原有 item 表与完成 ID 集合足以提供状态，但实时消息不带输出结果；连接建立时也不回放当前进度。

已阅读固定 `d3c1f7f` 的对应 ChatView 过滤逻辑及本地完整渲染/结果解析/CSS，未找到可以直接搬入的上游修复。按本次用户要求，在原卡片与控制流上作最小适配。

## 展示与一致性

复用对话末尾的原工具卡片，按调用顺序保留每一步。启动显示运行中，结束显示完成或失败，收到可用输出时更新原结果区域。简洁工具标签和完整卡片共用同一状态；沿用用户既有工具内容/结果折叠偏好，不新增独立面板或改变会话布局。

过程数据只在内存与实时控制流中存在，不写成伪造的 MainAgent 或规范日志。真实 MainAgent 完成条目到达后，在同一次状态更新中替换过程层；TOOL 行不触发替换。已进入原生 Ask 部分记录的工具不重复显示。Stop 乐观状态立即隐藏过程；历史固定视图、角色过滤沿原语义处理。

后端复用原 item 表、完成 ID 和 SDK adapter，不引入第二份事件队列。每条 shell 预览保留尾部最多 16,384 个 JS 字符，每帧输出合计最多 131,072 个字符，优先保留较新调用，截断以省略号标示；规范 TOOL/MainAgent 结果保留原完整数据。只展示 SDK 实际提供的输出：exec 如果仅在完成时提供结果，执行中仍会显示运行状态，不虚构逐行 stdout。

每帧携带原 requestId、轮次开始时间和序号；前端拒绝旧轮次、乱序和非当前实例的数据。SSE/WS mux 重连回放当前实例正在执行的快照，完成后不回放。原生 AppServer 继续沿既有 thread/turn 过滤，不启用默认关闭的 transport、Ask 托管或审批策略。

## 验证

| 验证 | 结果与边界 |
| --- | --- |
| 全量 | 2866/2866，0 失败/0 skip；组数 9 + 7 + 28 + 816 + 1760 + 246 |
| 定向 | 新后端 2 项覆盖三步 start/output/complete、失败、正式记录唯一、原生 outputDelta、输出上限、跨线程过滤和活动快照；Web 4 项覆盖首轮工具、简洁标签、Ask 部分去重、Stop/历史、同时间戳 TOOL、旧帧/跨实例/旧轮次和最终替换 |
| 构建及包门 | build 成功；536 边界文件、0 违规；605 源码路径、630 稳定 tarball 路径一致；未改版本 |
| 实际浏览器 | Chromium 159 / WebKit 27.2 × 桌面/手机模拟视口，4 场、12 张通过截图；实际 SDK manager、构建 UI、WS mux 控制流和 V2 归档，受控 exec 协议每场三步；输出更新、失败、执行中刷新、正式结果替换无重复、刷新后无残留、真实 Stop WS、兄弟实例隔离均通过，0 pageerror |
| HTTP SSE | 4 场均额外连接真实 `/events`，在无后续事件时验证回放当前实例的 partial output |
| 实际 Codex | 本机 Codex CLI 0.169.0 + 官方 SDK，exec/AppServer 各一轮，真实执行共 6 次 shell（每轮第二次 exit 1）；各 4 个 loopback Responses 请求、9 个进度帧，每次 start 均在规范 MainAgent 前可见，最终记录各一次；0 外部模型请求，无真实凭据读取 |

浏览器[结果](./evidence/SDK-live-tools-2026-11-24/result.json)、[运行中](./evidence/SDK-live-tools-2026-11-24/chromium-desktop-running.png)、[最终条目前三步状态](./evidence/SDK-live-tools-2026-11-24/chromium-desktop-settled-before-final.png)、[最终替换](./evidence/SDK-live-tools-2026-11-24/chromium-desktop-canonical.png)；真实 Codex [回执](./SDK-live-tools-native-2026-11-24.json)。完整机器索引见[验证 JSON](./SDK-live-tools-2026-11-24.json)。

首次失败均保留：Web 回归先暴露 text-only 与首轮空面板问题，修复后通过；第一次全量因根进程自定义 CXV_LOG_DIR 与 content 既有测试默认日志根预期冲突而失败，清除该根级环境、保留各 workspace 自身测试环境后全量通过，未为它修改产品；GUI 初始缺浏览器缓存路径、随后 fixture 错用 process.cwd 而非 SDK --cd，补齐测试环境后通过；原生探针首跑缺少自有 CODEX_HOME 目录，创建后双 transport 通过。初始 fixture 错误截图单独标记，不计入通过截图。GUI stopViewer 的既有 Stats worker code 1 关闭日志保留，不作为新产品故障或静默删除。

复现命令：

```sh
node --test packages/app/tests/sdk-live-tools.test.js
pnpm --filter @cxv/web exec node --test --test-name-pattern='SDK shell-only progress|tool progress survives|queued stream paint|cold V2 baseline' tests/sdk-workspace-tabs.test.js
PLAYWRIGHT_BROWSERS_PATH=/tmp/cxv-b4-browser.4dNjIw/browsers node cc-viewer-alignment/probes/sdk-live-tools-gui.mjs
node cc-viewer-alignment/probes/sdk-live-tools-native.mjs /Users/sky/.npm-global/bin/codex
```

全量运行清除继承 CXV/CODEX/OTEL/NODE_OPTIONS，使用独立 HOME/CODEX_HOME，根进程不覆盖 CXV_LOG_DIR；app/integration 自己设置测试日志目录。日志见 JSON。探针路径中的浏览器安装可替换为环境自己的 Playwright 路径，不加入产品依赖。

本地实现和 patch changeset 已提交，未 PR/推送/发布/运行 version。活动用户实例未重启或停止，未改全局 Codex 配置/旧归档；需正常重启当前后端并刷新页面才生效。隔离实例端口已关闭。Windows、Electron GUI、物理手机、活动用户 GUI、外部模型网络场景未验，不借本轮核销。下一步回到 B13。
