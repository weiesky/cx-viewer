# B0 高优先级人工复核候选

2026-11-17 已完成本清单全部 28 个唯一 hash 的迁移准入复核；逐项最终处置与未验证范围见 [B0 交接](./B0-handoff.md)，不等于功能实施完成。

以下按上游提交说明中出现 P0、P1、CVE、fail-closed 或 security 机械检索；包括合并、重复补丁及提示词中的优先级文本，因此**不是已判定优先级，也不是完整安全清单**。每条需要结合 diff、测试、后续提交和本地真实流程人工确定是否适用；首轮对照不等于通过。其他未命中关键词的风险也必须处理。

| 提交时间 | 上游提交 | 核验入口 |
| --- | --- | --- |
| 2026-07-26T17:06:42+08:00 | [6bd3b80e58](./cc-viewer-alignment-commit-ledger.md#commit-6bd3b80e58) — fix(win): restore Claude discovery and Electron tab launch on Windows | [上游说明](./B0-upstream-messages.md#message-6bd3b80e58)、[差异与测试](./B0-commit-file-evidence.md#evidence-6bd3b80e58) |
| 2026-08-17T04:30:14+00:00 | [5c468c042e](./cc-viewer-alignment-commit-ledger.md#commit-5c468c042e) — fix: CVE-2026-13676 security vulnerability | [上游说明](./B0-upstream-messages.md#message-5c468c042e)、[差异与测试](./B0-commit-file-evidence.md#evidence-5c468c042e) |
| 2026-08-17T13:35:58+00:00 | [9255663e33](./cc-viewer-alignment-commit-ledger.md#commit-9255663e33) — fix: CVE-2026-39244 security vulnerability | [上游说明](./B0-upstream-messages.md#message-9255663e33)、[差异与测试](./B0-commit-file-evidence.md#evidence-9255663e33) |
| 2026-08-18T06:40:50-04:00 | [3f141cb974](./cc-viewer-alignment-commit-ledger.md#commit-3f141cb974) — Merge pull request #141 from anupamme/fix-repo-cc-viewer-cve-2026-39244-adm-zip | [上游说明](./B0-upstream-messages.md#message-3f141cb974)、[差异与测试](./B0-commit-file-evidence.md#evidence-3f141cb974) |
| 2026-08-18T06:42:07-04:00 | [9f4e329be4](./cc-viewer-alignment-commit-ledger.md#commit-9f4e329be4) — Merge branch 'main' into fix-repo-cc-viewer-cve-2026-13676-fast-uri | [上游说明](./B0-upstream-messages.md#message-9f4e329be4)、[差异与测试](./B0-commit-file-evidence.md#evidence-9f4e329be4) |
| 2026-08-18T06:42:17-04:00 | [721e2c9940](./cc-viewer-alignment-commit-ledger.md#commit-721e2c9940) — Merge pull request #140 from anupamme/fix-repo-cc-viewer-cve-2026-13676-fast-uri | [上游说明](./B0-upstream-messages.md#message-721e2c9940)、[差异与测试](./B0-commit-file-evidence.md#evidence-721e2c9940) |
| 2026-08-20T09:39:45-04:00 | [cda9ed326d](./cc-viewer-alignment-commit-ledger.md#commit-cda9ed326d) — fix(deps): carry CVE-2026-13676/CVE-2026-39244 fixes into the monorepo layout | [上游说明](./B0-upstream-messages.md#message-cda9ed326d)、[差异与测试](./B0-commit-file-evidence.md#evidence-cda9ed326d) |
| 2026-09-17T15:12:28+08:00 | [8923322f88](./cc-viewer-alignment-commit-ledger.md#commit-8923322f88) — chore(ultraplan): refine code-expert review priority wording | [上游说明](./B0-upstream-messages.md#message-8923322f88)、[差异与测试](./B0-commit-file-evidence.md#evidence-8923322f88) |
| 2026-09-18T16:21:22+08:00 | [01ff6d85e8](./cc-viewer-alignment-commit-ledger.md#commit-01ff6d85e8) — feat: task HUD antd detail popovers, IM stop/save buttons, fix stop wiping config | [上游说明](./B0-upstream-messages.md#message-01ff6d85e8)、[差异与测试](./B0-commit-file-evidence.md#evidence-01ff6d85e8) |
| 2026-09-21T11:45:20+08:00 | [3e7f047290](./cc-viewer-alignment-commit-ledger.md#commit-3e7f047290) — feat(server): encrypt local credentials at rest in an AES-256-GCM vault | [上游说明](./B0-upstream-messages.md#message-3e7f047290)、[差异与测试](./B0-commit-file-evidence.md#evidence-3e7f047290) |
| 2026-09-21T17:17:04+08:00 | [739f49a6de](./cc-viewer-alignment-commit-ledger.md#commit-739f49a6de) — fix(server): close review findings on the credential vault + json-store convergence | [上游说明](./B0-upstream-messages.md#message-739f49a6de)、[差异与测试](./B0-commit-file-evidence.md#evidence-739f49a6de) |
| 2026-09-21T20:52:14+08:00 | [565613bbea](./cc-viewer-alignment-commit-ledger.md#commit-565613bbea) — fix(server): revert credential root to frozen; close re-review findings | [上游说明](./B0-upstream-messages.md#message-565613bbea)、[差异与测试](./B0-commit-file-evidence.md#evidence-565613bbea) |
| 2026-09-22T00:50:37+08:00 | [3cba408188](./cc-viewer-alignment-commit-ledger.md#commit-3cba408188) — fix(server): revert credential root to frozen; close re-review findings | [上游说明](./B0-upstream-messages.md#message-3cba408188)、[差异与测试](./B0-commit-file-evidence.md#evidence-3cba408188) |
| 2026-09-22T00:50:37+08:00 | [3c78188314](./cc-viewer-alignment-commit-ledger.md#commit-3c78188314) — fix(server): close review findings on the credential vault + json-store convergence | [上游说明](./B0-upstream-messages.md#message-3c78188314)、[差异与测试](./B0-commit-file-evidence.md#evidence-3c78188314) |
| 2026-09-22T00:50:37+08:00 | [811b049485](./cc-viewer-alignment-commit-ledger.md#commit-811b049485) — feat(server): encrypt local credentials at rest in an AES-256-GCM vault | [上游说明](./B0-upstream-messages.md#message-811b049485)、[差异与测试](./B0-commit-file-evidence.md#evidence-811b049485) |
| 2026-10-09T17:23:44+08:00 | [649f853e5e](./cc-viewer-alignment-commit-ledger.md#commit-649f853e5e) — Feat/resume global switcher (#146) | [上游说明](./B0-upstream-messages.md#message-649f853e5e)、[差异与测试](./B0-commit-file-evidence.md#evidence-649f853e5e) |
| 2026-10-10T15:24:07+08:00 | [d6cab4869a](./cc-viewer-alignment-commit-ledger.md#commit-d6cab4869a) — feat(server): relay SDK task_* messages as sdk-task WS frames (#147) | [上游说明](./B0-upstream-messages.md#message-d6cab4869a)、[差异与测试](./B0-commit-file-evidence.md#evidence-d6cab4869a) |
| 2026-10-13T00:25:47+08:00 | [04d05a5824](./cc-viewer-alignment-commit-ledger.md#commit-04d05a5824) — feat(sdk): SDK 模式健壮性修正 + 新增「Context 用量」面板 | [上游说明](./B0-upstream-messages.md#message-04d05a5824)、[差异与测试](./B0-commit-file-evidence.md#evidence-04d05a5824) |
| 2026-10-14T00:12:29+08:00 | [a30d8c92a7](./cc-viewer-alignment-commit-ledger.md#commit-a30d8c92a7) — fix(sse): per-workspace SSE 通道 CR 修复(P1×7+P2×7)与 git-diff flake | [上游说明](./B0-upstream-messages.md#message-a30d8c92a7)、[差异与测试](./B0-commit-file-evidence.md#evidence-a30d8c92a7) |
| 2026-10-14T00:20:15+08:00 | [d01259c844](./cc-viewer-alignment-commit-ledger.md#commit-d01259c844) — Merge pull request #149 from weiesky/fix/sse-per-workspace-cr | [上游说明](./B0-upstream-messages.md#message-d01259c844)、[差异与测试](./B0-commit-file-evidence.md#evidence-d01259c844) |
| 2026-10-15T13:47:57+08:00 | [46d33276c9](./cc-viewer-alignment-commit-ledger.md#commit-46d33276c9) — fix(sse): gate ws.mux.diag probes + pin perMessageDeflate:false (CR follow-up) | [上游说明](./B0-upstream-messages.md#message-46d33276c9)、[差异与测试](./B0-commit-file-evidence.md#evidence-46d33276c9) |
| 2026-10-22T22:11:06+08:00 | [58493d1c85](./cc-viewer-alignment-commit-ledger.md#commit-58493d1c85) — feat(plugins): directory service plugins with same-port proxy + remote React panels | [上游说明](./B0-upstream-messages.md#message-58493d1c85)、[差异与测试](./B0-commit-file-evidence.md#evidence-58493d1c85) |
| 2026-10-24T03:45:08+08:00 | [451ef48d6a](./cc-viewer-alignment-commit-ledger.md#commit-451ef48d6a) — feat(server+web): scheduled tasks — storage in preferences.json + run history split + modal UX polish | [上游说明](./B0-upstream-messages.md#message-451ef48d6a)、[差异与测试](./B0-commit-file-evidence.md#evidence-451ef48d6a) |
| 2026-10-27T23:47:58+08:00 | [134a0de7ac](./cc-viewer-alignment-commit-ledger.md#commit-134a0de7ac) — docs(ultraplan): rewrite UltraReview team workflow to named Agent teammates | [上游说明](./B0-upstream-messages.md#message-134a0de7ac)、[差异与测试](./B0-commit-file-evidence.md#evidence-134a0de7ac) |
| 2026-11-03T23:05:11+08:00 | [2ea5181df8](./cc-viewer-alignment-commit-ledger.md#commit-2ea5181df8) — fix(sdk+web): CR follow-ups — slow-upstream toast robustness + assorted P2 | [上游说明](./B0-upstream-messages.md#message-2ea5181df8)、[差异与测试](./B0-commit-file-evidence.md#evidence-2ea5181df8) |
| 2026-11-03T23:05:11+08:00 | [92ed9bc751](./cc-viewer-alignment-commit-ledger.md#commit-92ed9bc751) — fix(content): unify UltraReview prompt to the TeamCreate-free version | [上游说明](./B0-upstream-messages.md#message-92ed9bc751)、[差异与测试](./B0-commit-file-evidence.md#evidence-92ed9bc751) |
| 2026-11-04T03:12:45+08:00 | [a3cc12619f](./cc-viewer-alignment-commit-ledger.md#commit-a3cc12619f) — fix(sdk+web): slow-upstream toast revive/dead-timer fixes + related P2 | [上游说明](./B0-upstream-messages.md#message-a3cc12619f)、[差异与测试](./B0-commit-file-evidence.md#evidence-a3cc12619f) |
| 2026-11-10T23:16:37+08:00 | [2914d6479d](./cc-viewer-alignment-commit-ledger.md#commit-2914d6479d) — feat(web): quick-fill time buttons for one-time scheduled tasks (#169) | [上游说明](./B0-upstream-messages.md#message-2914d6479d)、[差异与测试](./B0-commit-file-evidence.md#evidence-2914d6479d) |

补充本地已隔离复现风险：[`96c477d582`](./cc-viewer-alignment-commit-ledger.md#commit-96c477d582) 对应子进程 stdin EPIPE；[`4c5e633e68`](./cc-viewer-alignment-commit-ledger.md#commit-4c5e633e68) 对应损坏 preferences 覆盖。另已隔离复现密码字段非空但无效时被当作空密码，非 loopback HTTP 请求返回 200，而有效密码配置返回 403；见 [复现记录](./B0-commit-lineage.md)。

### 关键词清单外补充：冷加载故障与首轮刷新

2026-11-17 已复核 [`0670581b3d`](./cc-viewer-alignment-commit-ledger.md#commit-0670581b3d)、[`d7f355ba89`](./cc-viewer-alignment-commit-ledger.md#commit-d7f355ba89)：处理异常注入确认活跃/历史入口不释放 gate 且索引与旧基线不一致；活跃路径瞬态失败可重试恢复，不称为必然永久冻结。临时 canonical 日志经实际 HTTP/SSE 和提取的 AppBase 方法验证首轮进行中可读取当前会话并续接完成记录；下一轮 lastSession.response 清除的语义、游标失败确认、写异常关闭及真实 GUI/CLI 仍待 B3/B4 验证。详见 [完整复核、命令和限制](./B0-cold-ingest-review.md)。相关现有测试 81/81；未实施修复。

## 配置及凭据：已复核的调用链

- [4c5e633e68](./cc-viewer-alignment-commit-ledger.md#commit-4c5e633e68)：当前 preferences.test.js 测试两进程 40 次更新与文件权限，未覆盖损坏内容。server.js 的 POST /api/preferences、approvalsReviewer 和插件配置路径以及 lib/auth.js 更新路径均调用 updatePreferences；已在临时目录复现损坏内容被覆盖。B1 需要在写入锁内区分缺失、损坏与正常值，保留原文件并测试两个进程及失败恢复。
- [3e7f047290](./cc-viewer-alignment-commit-ledger.md#commit-3e7f047290) / [811b049485](./cc-viewer-alignment-commit-ledger.md#commit-811b049485)：本地 lib/auth.js 将密码 Base64 编码，lib/dingtalk-im-config.js 将 appSecret 写入私有配置，lib/proxy-profile.js 要求第三方 profile 的 apiKey。加密迁移涉及认证、代理、IM 三条链，不能只替换 auth；密钥、备份和迁移读取失败需分别验证。
- [739f49a6de](./cc-viewer-alignment-commit-ledger.md#commit-739f49a6de) / [3c78188314](./cc-viewer-alignment-commit-ledger.md#commit-3c78188314)：上游修复不可读密码、损坏文件、锁重入、无凭据第三方路由和敏感备份目录。当前本地第三方 profile 校验要求非空 apiKey，但整个路由的异常处理仍需端到端测试；鉴权函数已复现非空无效 Base64 解码为空并走 HTTP 无密码允许分支。
- [565613bbea](./cc-viewer-alignment-commit-ledger.md#commit-565613bbea) / [3cba408188](./cc-viewer-alignment-commit-ledger.md#commit-3cba408188)：后续上游回退动态凭据根；本地 server.js 当前拒绝在线切换到不同 logDir 并要求重启，syncAuthProject 仍在环境或日志根变化时重新载入认证并撤销会话。迁移设计须保证密钥归属、重启及旧会话撤销，不能直接移植中间版本。
- [01ff6d85e8](./cc-viewer-alignment-commit-ledger.md#commit-01ff6d85e8)：本地 IM 保存合并和仅禁用保留密钥已隔离验证；HUD、请求体异常、进程关闭与并发仍待 B4/B11。

## 多工作区及 SDK：高优先级复核拆项

[上游 per-workspace 审查修复](./cc-viewer-alignment-commit-ledger.md#commit-a30d8c92a7) 的七项不能作为一个功能点验收。本地 server.js 的 streaming_status 定时器向 clients 广播，AppBase.jsx 在 workspace_started 时重置视图状态，现有 tests/log-v2-coordinator.test.js 覆盖多个 session 的存储定位，但不能证明多浏览器实时状态隔离。B2/B3 应分别验证：

1. 关闭过程：停止服务器或关闭会话后，不向已关闭连接发送任务状态；重复快照不导致重复 UI。
2. 活跃边缘：两个工作区同时开始、停止、再次开始；停止或被中断的一个工作区必须清除自身状态，不清除另一工作区。
3. 关闭与重建：关闭 PTY 后清理该实例的 turn、streaming、session 归属，再启动同名实例不得继承旧状态。
4. session 视图：project、instance 和 session 标识全链路一致；刷新和重连不读到其他实例的内容或上下文。
5. 工作区切换：普通启动、同名实例、关闭后的重绑定分别测试，旧频道和新频道的数据不能串流。
6. 重连：断线期间的进度、快照、增量恢复和队列溢出要覆盖重复、缺失、过期 baseline。
7. 通道数量和文档：按最终实际实现确定连接数与淘汰策略，不复制上游已过时的说明。

[SDK 混合修复](./cc-viewer-alignment-commit-ledger.md#commit-d6cab4869a) 的审批取消、长驻流、SDK 续会、空实例冷加载及 task 事件分别归 B2/B3/B4/B11；本地使用 Codex SDK 和 appserver，需用其真实事件确认，不复制 Claude canUseTool 结构。[SDK 上下文面板](./cc-viewer-alignment-commit-ledger.md#commit-04d05a5824) 对应本地 appserver tokenUsage 及固定血条规则，分类详情、可用来源和切换清理仍需按 Codex 验证。[mux 修复](./cc-viewer-alignment-commit-ledger.md#commit-46d33276c9) 只在采用对应通道时适用，本地现有终端 WebSocket 与上游对话 mux 不应混为一谈。

## 定时任务和插件服务：边界与依赖

- [58493d1c85](./cc-viewer-alignment-commit-ledger.md#commit-58493d1c85)：上游新增独立进程服务、同端口代理和远程 React 面板，并增加管理端同源校验、WebSocket Origin 检查、子进程环境白名单、父进程 token 隔离、PID/nonce 验证与异常回收。本地 lib/plugin-loader.js 加载同进程 JS hooks，并非同一隔离模型。B10 如果实现服务插件，需分别验证代理请求、WS 升级、TLS 反代、Set-Cookie/Location、敏感环境变量、进程 PID 复用、重启与卸载；必须保留既有 hook 兼容。
- [451ef48d6a](./cc-viewer-alignment-commit-ledger.md#commit-451ef48d6a)：上游配置、任务历史拆存且限制访问，claimRunId 防重复；旧格式只读，故障重启需要恢复一次性任务状态。本地尚未发现同名 scheduler。B9 必须先依赖 B1 严格配置写入及 B2 工作区身份，再按创建、定时、重启、竞态、取消、重复执行、附件和权限逐项实施。
- [2914d6479d](./cc-viewer-alignment-commit-ledger.md#commit-2914d6479d)：快捷时间只是大型提交的一项，另含 SDK 代理状态与断线快照、Claude IM 信任对话、定时附件与 UltraPlan；最终活跃代理表现还被 975313773a 重构。B4/B9/B11 分别验收，Claude 信任初始化不可直接应用于 Codex 工作区。

### mux 修复补充：区分负载限制与压缩

已阅读 [46d33276c9](./cc-viewer-alignment-commit-ledger.md#commit-46d33276c9) 的 ws-mux 源码与测试。上游事后说明：11 MiB 冷加载超出旧 8 MiB 队列时，提升上限至 32 MiB 是解决溢出的主要改动；禁用 perMessageDeflate 是降低误判的预防措施，且会增加远端传输量。测试分别固定构造参数并模拟 12 MiB 快消费者突发。

本地 server.js 构造的是终端及 scratch WebSocket，分别有 2 MiB/512 KiB 高低水位，拥塞时通过终端重同步恢复；未发现上游 /ws/mux 实现。tests/terminal-websocket.test.js 已测大终端渲染对 HTTP 的影响，但不等于对话冷加载 12 MiB、慢消费者、重同步及泄漏测试。因此 B3 应对现有传输补相应真实场景；仅在引入 mux 后核验其队列上限及压缩开销，不把 32 MiB 当成通用安全参数。

### 工作区注册表

[649f853e5e](./cc-viewer-alignment-commit-ledger.md#commit-649f853e5e) 里的 P0 是上游 limit 读取错误；本地 server.js 的 /api/workspaces 不接收该 limit，不能称为同一回归。本地 workspace-registry.js 的 loadWorkspaces 对损坏文件返回空列表、saveWorkspaces 吞掉写入错误，已分别在临时目录复现覆盖与返回假成功；完整过程记录见 [B0 记录](./B0-commit-lineage.md)。此外 getWorkspaces 同步遍历所有 workspace 的 log-v2 数据，是否有性能问题必须先基准测试，不能复用上游 10 倍数据。相关持久化保护归 B1，工作区隔离和列表性能归 B2。

### 插件关联的同源与访问地址

已阅读 [58493d1c85](./cc-viewer-alignment-commit-ledger.md#commit-58493d1c85) 的 same-origin.js 和 same-origin.test.js：上游先拒绝 Sec-Fetch-Site: cross-site，即使没有 Origin；插件管理及 local-url 另有管理员和同源限制。

本地 server.js 以 Origin 和 Host 判断，/api/local-url 返回包含 ACCESS_TOKEN 的 URL。隔离服务收到不带 Origin、带 Sec-Fetch-Site: cross-site 的 loopback GET 时返回 200，URL 含 token，响应未包含 Access-Control-Allow-Origin；测试没有证明浏览器跨源脚本能够读取响应，也未测试其他浏览器机制。B10/B11 应以真实浏览器测试 no-cors、导航、WS、同源和合法 CLI，禁止非授权跨站操作，避免破坏无 Origin 的本机 CLI。还要核查普通远端认证用户与管理员的 local-url 及插件管理权限。

### SDK 上下文与续会的代码及测试对照

已阅读 [04d05a5824](./cc-viewer-alignment-commit-ledger.md#commit-04d05a5824) 的 sdk-context 路由和 route test：上游覆盖 inactive、快照成功和控制请求失败，数据来自 Claude SDK getContextUsage。本地 lib/sdk-manager.js 将 turn.completed usage 写入记录，tests/sdk-manager.test.js 覆盖 Codex 的 input/output/reasoning 计数；lib/appserver-bridge.js 另接 tokenUsage。不能声称 Codex 提供上游 categories、MCP 和 memory 完整分解。B2/B8 应分开校验来源，未知字段标为不可用，并测试切线程、重连及取值失败。

同一提交的队列限制需单列：当前 lib/sdk-manager.js 的忙时 _messageQueue.push 没有同名上限；上游为 50 并在满时显式拒绝。B2 应基于本地发送回执设计上限、可见错误、停止/重启清理和消息不重复，不机械假定 50 为唯一合理值。

已阅读 [d6cab4869a](./cc-viewer-alignment-commit-ledger.md#commit-d6cab4869a) 的 resume 路由差异和 events-instance-live-empty 测试：上游通过实例存活判定区分真正空会话与已死实例，避免读取绑定项目记录。本地 SDK 的 resumeThread 与 log-v2 存储模型不同；B2/B3 测试必须为项目 A 准备可识别记录、项目 B 准备活跃空实例，并验证 B 不出现 A 数据，之后 B 的首条消息可更新。实例死亡则必须清理和提示，不能当作空会话。

### 慢上游提示：首个响应体字节与视图切换

已阅读 [a3cc12619f](./cc-viewer-alignment-commit-ledger.md#commit-a3cc12619f) 的 proxy.js 与 ChatView.jsx 差异：上游将慢请求计时从收到 headers 延续到首个 body chunk，并在错误、空 body、断开和切换工作区时清理定时器与 requestId；只销毁 toast 不足以防止周期计时器重新显示。当前本地 proxy.js 使用 fetch 和 Readable.fromWeb，未发现同名 slow-upstream 事件；不能把现有 SSE 心跳当成上游提示功能。

B8 的实现验收应模拟 headers 立即到达但 body 延迟、并发请求、首 chunk、空响应、stream error、客户端取消、切换工作区和无浏览器连接。B3 验证事件按项目/实例过滤；不以实际外网请求或用户账户完成这些测试。

### 凭据测试补充：读取和写入必须同作用域

已阅读 [739f49a6de](./cc-viewer-alignment-commit-ledger.md#commit-739f49a6de) 的 auth 和 json-store 回归测试：上游对不可读密码的保存、自动生成返回 409，并测试同步写入重入异步锁时不能静默丢更新。[565613bbea](./cc-viewer-alignment-commit-ledger.md#commit-565613bbea) 进一步区分全局不可读和项目覆盖不可读：目标是新项目覆盖时，不应因为另一个全局值损坏而误拒绝；目标项目覆盖本身损坏时禁止覆盖。B1 测试需覆盖这两种情况，并考虑当前本地锁是同步实现，不能假设已有异步锁语义。

### Windows / Electron 启动

已阅读 [6bd3b80e58](./cc-viewer-alignment-commit-ledger.md#commit-6bd3b80e58) 对 Electron main 的修改：上游在找不到外部 Node 时使用 Electron 二进制并设置 ELECTRON_RUN_AS_NODE，fork 出错立即把 tab 标为 error。当前 electron/main.js 仍使用 where node 的首行、找不到时回退裸 node；存在 child.on error，但需核对错误状态和 child.send 处理。findcx.js 的 Codex 寻址与上游 Claude 不同，不能原样使用其查找逻辑。

本机为 macOS，未完成 Windows 打包或 GUI 验证。B11 实施后请在 Windows 测：打包应用正常发现 Codex；在独立测试账户或受控环境中让外部 Node 不在 GUI PATH，启动新 tab 并观察可运行或明确错误；模拟无效 worker 可执行路径，确认不会一直 loading；恢复环境后再测常规启动。记录应用版本、Node、Codex、安装方式和诊断信息，不上传令牌或真实会话。

### 文件策略：相对符号链接逃逸

阅读 [451ef48d6a](./cc-viewer-alignment-commit-ledger.md#commit-451ef48d6a) 的 file-access-policy 差异与测试后，对本地 lib/file-api.js 做隔离测试：在临时 project 内建立指向 project 外临时文件的相对路径符号链接，使用非 editorSession 的 readFileContent 和 writeFileContent，读写均成功。隔离服务的 /api/file-content GET 和 POST 均返回 200，并分别读到、改写了项目外的临时测试文件。/api/file-raw 对普通项目文件使用 resolveFilePath，但该端点及其他文件入口尚未做 HTTP 验证，不能推断全部端点结果。

B5 应在所有非 editor 项目文件入口统一 realpath/父目录校验，覆盖最终链接、中间目录链接、相对路径、绝对路径、创建新文件以及并发替换；同时明确授权的 editorSession 和项目内部合法符号链接行为。B1/B9 的密钥、配置、备份和定时任务文件还须单独设置访问边界，不能仅依赖目录名。
