# cc-viewer → cx-viewer 分批对齐规划

2026-11-22 B8已完成并由[PR #9](https://github.com/weiesky/cx-viewer/pull/9)合并main（`6106d41`），37原始本地commit备份/映射保留，整合与merge tree精确一致，实际无PR checks。最终2232/2232、0skip/build/pack737，新生产安装685/685、全部737包/211Web字节、B1.2/隔离CLI通过；真实默认SDK双浏览器与native主/子分源分项验证通过。代理重试配置与统计明确排除，提示仅新会话、原生窗口/未知态及能力门保持。54候选按B8子项核销，混合B9–B11和未验环境单列。见[B8完成矩阵](./B8-completion-matrix.md)；[B9交接](./B9-handoff.md)与14候选已准备，本轮未开始B9。

2026-11-18 GitHub 同步：已按用户请求将 main 6045b53 与 codex/pnpm-workspace 2c0edc8 原子推送到 origin 同名分支，远端完整 hash 已读回核对，上游跟踪已设置。未执行强推、分支合并或活动安装切换；未提交的 AGENTS.md 与 cc-viewer-alignment 文档仍保留本地。

2026-11-18 提交整理：用户选择按两阶段压缩，原 main 34 笔合为 `6045b53`，原新结构工作树 11 笔合为 `2c0edc8`。两阶段文件树均与原末端完全相同；未切换活动目录、未推送。原提交与43笔专项实施证据保留在 archive 引用中，见 [45条完整映射](./local-commit-consolidation-2026-11-18.md)。此次不重复运行测试，后文1161/1161等为原实现批次验证。

## 1. 基线、范围与证据

- 发布基线：cx-viewer npm 1.1.20 于 2026-07-26 04:55:08 UTC 发布，标签 v1.1.20；目标代码基线为本地 `753fd6c632b5bac8577dfe98f28d666ff3437d28`。这两者不同：发布后本地已有变更，不应重复实现。
- 上游固定快照：[cc-viewer 74cd752d99caf122e750216d2af3bb9f467c4de1](https://github.com/weiesky/cc-viewer/tree/74cd752d99caf122e750216d2af3bb9f467c4de1)，仓库发布提交为 1.9.29。冻结快照便于复查；上游今后新提交需另增批次，不混入本轮。
- 时间窗口：以 Git 提交时间筛选 `2026-07-26T04:55:08Z` 之后且快照可达的全部提交，共 337 条，其中 32 条 merge、305 条非 merge。作者时间和提交时间可能不同；不能只看作者日期决定是否纳入。已保留 release、fix、refactor、CI 和 merge。
- [完整时间线与工作包索引](./cc-viewer-alignment-commit-index.md) 逐条覆盖全部提交；[逐提交台账](./cc-viewer-alignment-commit-ledger.md) 为每条列完整提交链接、双时间、父提交、相对第一父提交全部改动路径、本地候选路径、初筛主题与动作。自动分类是索引，不是逐行审查；合并提交不能与分支提交重复搬运。同一实现可能在不同 hash 重复出现或被 revert，实施前需验证血缘及最终状态。
- [首轮能力清单](./cc-viewer-alignment-inventory.md) 是按功能归纳的阅读入口。上游主要依据 [history.md](https://github.com/weiesky/cc-viewer/blob/74cd752d99caf122e750216d2af3bb9f467c4de1/history.md)、各 commit 完整 diff 和测试。本地判断按当前工作树复核，不能只依赖同名文件。

## 2. 对齐原则与状态

**2026-11-19 用户明确纠偏：基线实际代码优先。** 本专项是基线迁移，不是根据文档重新设计。每笔先读取目标 PR 的真实 diff、完整组件、调用链和 CSS，并核对固定快照中后续修复/回退的最终有效代码；文档、标题、任务矩阵不能代替源码。保持基线布局、样式、入口及交互；Claude/Codex 差异仅在有具体代码依据的必要边界适配，不能作为自由改版的理由。既有偏离项恢复为待纠偏；功能/构建/GUI 操作通过不等于视觉对齐。完整约束、记录格式与 B2 已确认偏差见[源码优先迁移规范](./migration-code-first.md)。

处理结果必须为每条提交标记其中一种：**已具备（附证据） / 需适配（明确目标） / 上游后续提交已替代 / 不适用（说明） / 暂缓（原因） / 仍待核验**。未标记和未验证不得写成已对齐。产品能力可拆分到多个批次；一个上游提交也可拆成多个 cx 提交。

上游是 Claude Code 协议、pnpm monorepo；本项目为 Codex，已按用户决策前置为 pnpm workspace。协议、内部文件布局和工具命名可作必要适配，这不构成用户界面重设计授权。优先复用上游实际实现与本地兼容能力，保持上游用户可见结构、样式和交互。网络/审批/持久数据的语义必须由 Codex App Server、SDK 和当前安全设置决定；不为了外观一致移除审批或更改沙箱。

## 3. 实施方法与批次交付

每批执行以下顺序：

1. 从台账筛选该主题的全部 commit（包含修复和 merge），先读取目标 PR 的真实 diff、相关完整源码/调用方/CSS，再核对固定快照中的最终代码；`history.md` 仅作辅助索引。识别后续修复、revert、版本差异与实际依赖；维护原始 hash → 本地实现和验收的映射，并记录每处必要适配的具体原因。
2. 对照 cx 真实数据流，记录当前行为、待复现问题和可复用代码；收集最小脱敏 fixture。列出不适用的 Claude 专用字段及理由。
3. 将可独立验收的能力拆成小提交；文件列表以目标目录的实际架构为准。先处理数据、权限与向后兼容，再接 UI。
4. 针对性单测、受控集成测试、必要的真实 CLI 测试；涉及 UI 则覆盖桌面、移动、深浅色与无障碍。跨工作区测同名不同路径、同路径不同实例及两个客户端。必要时执行全量 `npm test`、`npm run build` 和 `npm run pack:dry-run`。
5. 回填台账状态、目标 commit、验证命令、残余风险和后续依赖。不能复现的上游修复保留待验证或标不适用，附证据；不盲目 cherry-pick。

## 4. 工作包与当前进度

进度更新至2026-11-22：B4–B8均已验证并由PR合并main；B8最新2232完整/685新安装通过，B9只准备未执行，见[B9交接](./B9-handoff.md)。未验环境继续保留。

| 工作包 | 当前状态 | 已完成与下一步 |
| --- | --- | --- |
| B0 | 已完结：台账与迁移准入复核 | 337 条范围核对、99 条合并/元数据归属、238 条代码/依赖对照、28 条高优先级候选决议；功能验收由各实施包负责。 |
| B1 | B1.2 本地实现与隔离安装验收完成；真实验收待执行 | 配置保护、凭据库、auth/proxy/IM 条件启用运行时、回执保护、私有备份及 auth/proxy/IM 显式迁移入口已实现；按配置恢复、无损 key 修复及坏库现场留存已实现；已确认不提供有损整库回退，本地安装验收完成；真实验收尚待。 |
| B2 | 已用户验收收口；后发现的普通PTY入口已由B7纠偏并验证 | 身份/队列/恢复/工作区UI保持；活动旧后端正常重启复验和未覆盖环境单列。 |
| B3 | 已完成并推送main（第4/12工作包） | 聚合提交[7c3d849](https://github.com/weiesky/cx-viewer/commit/7c3d849b9e7acda1c974077843406c23627dbdcb)已快进推送；渐进分片、恢复/历史授权、mux背压、分页/增量扫描完成，1410项通过，见[B3完成矩阵](./B3-completion-matrix.md)。目标环境边界明示，下一包B4。 |
| B4 | 已完成并由PR #4合并main（第5/12工作包） | E66实际GUI/1580完整及既有安装通过；见[B4完成矩阵](./B4-completion-matrix.md)。 |
| B5 | 已完成（第6/12工作包），1commit/1PR交付，GitHub实际状态以关联PR为准 | 1781完整/487新安装/原GUI与32目标图；下一B6，见[B5完成矩阵](./B5-completion-matrix.md)。 |
| B6 | 已完成并经PR #6合并main（第7/12工作包），9f3e2ce | 1986完整/525新安装/6场26图与10轮问答；见[B6完成矩阵](./B6-completion-matrix.md)。 |
| B7 | 已完成（第8/12工作包），51笔已整合并由PR #8合并main | 2181/2181、build/pack723、新安装634/634；B7子项/混合边界及未验项见[B7完成矩阵](./B7-completion-matrix.md)。 |
| B8 | 已完成，第9/12工作包，PR #9合并main | 54候选按B8子项核销，见[B8完成矩阵](./B8-completion-matrix.md)。 |
| B9–B10 | B9已准备未执行 | 14候选与剩余权限/定时全链见[B9交接](./B9-handoff.md)。 |
| B11 / 工程前置 | A1 6287d2a 已主线，A2 3b15a6d 已工作树提交并通过本地验证 | 继续在新结构实施 B1 余项及 B2–B10；全局实例未切换，B11 其他验收继续。 |

当前最新检查点为B8最终2232/2232、0skip、build/pack737；全新生产安装685/685、全部737包/211Web精确字节、B1.2与隔离CLI通过。真实SDK双引擎与native分源证据及未验范围见[B8完成矩阵](./B8-completion-matrix.md)。

### B0 — 台账校验与版本测试基线

**完整上游提交索引**：[B0 时间顺序索引](./cc-viewer-alignment-commit-index.md#b0)；[B0 交叉候选](./B0-cross-index.md#cross-b0)。索引中的合并、发布及待归类项均需逐条确认，不能因为是工程记录而跳过。

**当前状态：台账与迁移准入复核完成（2026-11-17）。** 用户确认按本节范围迁移，真实 CLI、GUI 和跨平台验收随对应批次执行。337 条 ID 与固定上游窗口一致，99 条合并/元数据归属、238 条代码/依赖对照，28 条高优先级候选已给出迁移决议；新增游标失败确认及 SSE 连续写失败隔离证据。详见 [B0 交接及限制](./B0-handoff.md)。功能与环境验收留在 B1–B11，不表示所有 diff 逐行审完或产品验收通过。

**目标**：将 337 条机械索引转成可追踪任务，消除重复、变更回滚和源码路径误配。先核查 32 条 merge 对应子提交、发布 tag、release 与 revert；对于每项 P0/P1 阅读 diff 和测试，建立映射和验收。对 `753fd6c` 做 clean workspace 基准，记录 `codex --version`、SDK 版本、Node、操作系统。

**位置**：本计划和逐提交台账；`tests/` 现有测试；临时隔离工作目录。**验收**：每条 commit 至少有确定状态、证据链接或明确归属；重复和 superseded 必须指出对应 hash。正常 CI 与 CLI 测试使用临时 `CODEX_HOME` 和脱敏 fixture。**依赖**：无。**风险**：机械筛选主题可能遗漏交叉主题，按上游文件和提交历史复核。

### B1 — 配置写入与凭证保护

**当前状态：B1.1 已实现，B1.2 本地实现与隔离安装验收已收尾（2026-11-18，b549125），真实用户/目标环境仍待。** preferences、不可读密码及作用域、注册表保护已实现；凭据加密与私有库、访问边界、auth/proxy/IM 显式格式运行时、持久回执执行、私有快照和 auth/proxy/IM 显式迁移命令均已提交。本阶段已依次完成 `8a1ad0d`（拒绝 source 删除/整体降级）、`0d2bf0f`（验证恢复快照）、`fa25aaa`（auth 迁移）、`63664dd`（proxy 当前/.bak 迁移）、`c52565b`（IM 迁移），并修复两类写入器的临时文件碰撞；最新验证见本节进度总览及 [B1 实施](./B1-config-implementation.md)。用户已选择升级后仅新版、按配置归属分库，见 [迁移方案](./B1-credential-migration-proposal.md)。按配置安全恢复已由 36d0697 实现；无损 key 修复与损坏现场留存也已实现；已确认不提供有损整库回退，真实用户/目标环境验收仍待；真实用户凭据尚未迁移，B1 及相关上游提交仍未整体完成。

**完整上游提交索引**：[B1 时间顺序索引](./cc-viewer-alignment-commit-index.md#b1)；[B0 交叉候选](./B0-cross-index.md#cross-b1)。逐项核对索引及交叉工作包中的修复、合并和后续替代记录。

**工作项**：①审计 `preferences`、代理 profile、auth、IM 配置、备份和多进程写路径；②合并现有锁与原子写，防并发覆盖；③设计敏感值加密、密钥权限与路径访问控制；④迁移前备份、写后验证、异常回滚、幂等与旧版并存策略；⑤失败时保持受保护状态，避免错误转发凭证；⑥同步文档和打包。

**候选文件**：`lib/auth.js`、`lib/auth-routes.js`、`lib/proxy-profile.js`、`lib/dingtalk-im-config.js`、配置/备份相关模块、`server.js`；必要时新增共享存储/密钥模块。先验证具体读写调用链，不能直接覆盖 Codex 自身 `auth.json`。

**验收**：并发读改写无丢失；磁盘损坏、权限拒绝、迁移中断与重复迁移可恢复；跨项目与远程 API 不泄露密钥；旧进程/备份行为有明确处理。运行 `tests/auth*.test.js`、`tests/proxy-profiles-api.test.js`、`tests/dingtalk-im-config.test.js` 及新增迁移测试。**风险**：与旧进程、备份和第三方认证联动，须先做只读审计及模拟迁移。

**高优先级核验**：[`4c5e633e68`](./cc-viewer-alignment-commit-ledger.md#commit-4c5e633e68) 对应本地 `lib/preferences.js` 损坏文件读成空对象、后续可能覆盖的风险；隔离临时目录已用本地函数源码复现损坏文件被更新覆盖；隔离 HTTP 实测发现启用密码时非空畸形存储值解码为空并触发无密码放行：非 loopback 请求返回 200，改为有效密码后返回 403。工作区注册表也已隔离复现损坏文件被覆盖和保存失败仍返回成功。实施时须区分有意无密码模式与损坏值，验证实际 HTTP、WebSocket 和恢复。凭据加密须结合 [`739f49a6de`](./cc-viewer-alignment-commit-ledger.md#commit-739f49a6de) 和 [`565613bbea`](./cc-viewer-alignment-commit-ledger.md#commit-565613bbea) 的后续修复与回退。

### B2 — 多工作区身份与 SDK 会话

**2026-11-19 收口结论：B2经用户明确验收完成。** 已按固定PR源码纠正UI及关闭/恢复链路；测试、实际GUI与未覆盖环境分别记录，详见[B2矩阵](./B2-completion-matrix.md)和[GUI证据](./B2-gui-acceptance.md)。指针拖放/物理多指等保留未验证事实，不再阻塞用户已接受的B2收口。当时进入B3；现B3已完成并推送，下一包B4。B2的混合提交不自动算作其他包完成。

**完整上游提交索引**：[B2 时间顺序索引](./cc-viewer-alignment-commit-index.md#b2)；[B0 交叉候选](./B0-cross-index.md#cross-b2)。逐项核对索引及交叉工作包中的修复、合并和后续替代记录。

**工作项**：①明确 cwd、instance、thread、turn 身份及所有权；②核对 registry 与 PTY 生命周期；③给 SDK 会话独立状态与消息队列、恢复/关闭语义；④前端切换、排序、刷新恢复和同名消歧；⑤旧连接、延迟响应和后台 workspace 事件过滤；⑥跨客户端并发/断线清理。

**候选文件**：`workspace-registry.js`、`pty-manager.js`、`lib/sdk-manager.js`、`lib/appserver-bridge.js`、`server.js`、`src/components/dashboard/AppHeader.jsx`、`src/components/chat/ChatView.jsx` 及相关 controller。优先复用已有事件与 registry，Codex SDK 不支持的 Claude 状态须降级。

**验收**：两个不同 cwd 同名项目、同 cwd 多次打开复用常驻会话、两个浏览器同时操作；发送、取消、恢复、关闭、刷新、切换时无交叉、无误杀；真实 Codex 0.169 和 SDK 0.142.5 路径分开报告。用户已于本轮确认 SDK 每目录一个常驻会话，不新增同目录多独立会话。运行 `tests/sdk-manager.test.js`、`tests/sdk-session-registry.test.js`、`tests/pty-manager.test.js`、相关 workspace 和 appserver 测试。**依赖**：B0；配置变动与 B1 协调。**风险**：切换导致数据丢失或任务误归属，先增隔离测试。

### B3 — 长会话、存储和实时传输

**当前状态：已完成并推送main（2026-11-20）。** 原30笔已合并为[7c3d849](https://github.com/weiesky/cx-viewer/commit/7c3d849b9e7acda1c974077843406c23627dbdcb)并完成远端hash核对；用户已选渐进启用；最终1410/1410、0 skip、构建通过。分片/恢复/历史授权、ZIP/删除/live及格式等效结论见[B3完成矩阵](./B3-completion-matrix.md)与[分片实施](./B3-sharding.md)。真实网络、其他OS/最低Node、物理设备和断电等未覆盖事项单列，用户确认收口不改变未验证边界。

**完整上游提交索引**：[B3 时间顺序索引](./cc-viewer-alignment-commit-index.md#b3)；[B0 交叉候选](./B0-cross-index.md#cross-b3)。逐项核对索引及交叉工作包中的修复、合并和后续替代记录。

**工作项**：①建立长日志/高频事件基准；②复核 `log-v2` 分片、并发落盘、顺序、裁剪、历史迁移和冷热读；③检查 workspace 范围内 SSE、WebSocket、重连游标、背压和断线恢复；④按基准优先修复增量扫描、内存和重放；⑤仅在现有通道确实不满足目标时评估 WS mux，保留兼容回退。

**候选文件**：`lib/log-v2/`、`lib/appserver-bridge.js`、`server.js`、`src/components/chat/ChatView.jsx`、`src/components/chat/controllers/toolFileChangeController.js`、前端传输控制器。**验收**：断开/恢复、页面刷新、慢客户端、服务重启、归档/删除期间无遗漏、重复和跨项目串流；测内存与响应时间。运行 `tests/log-v2-*.test.js`、`tests/tool-file-change-controller.test.js`、流与回放测试。**依赖**：B2 身份定义。**风险**：存储迁移可能造成数据丢失，保留原数据并在迁移后验证。

**B0 历史证据（已由本轮B3实施更新，见上文）**：[`0670581b3d`](./cc-viewer-alignment-commit-ledger.md#commit-0670581b3d) 的本地冷加载失败清理需要适配，覆盖 token/epoch、gate、已提交基线索引、normalizer/slimmer、archive 与重试；[`d7f355ba89`](./cc-viewer-alignment-commit-ledger.md#commit-d7f355ba89) 的首轮进行中数据链路已通过隔离验证，response 保留子项及实际浏览器仍待核验。完整命令及复现边界见 [专项记录](./B0-cold-ingest-review.md)，不把源方法注入失败当成自然损坏日志的 HTTP 复现。

### B4 — Agent 生命周期、任务与状态反馈

**当前状态：已完成（第5/12工作包，2026-11-21）。** E66按明确授权以临时Playwright完成G1–G5实际Chromium/WebKit与phone/pad仿真GUI，原截图/哈希已留存；最终1580完整、0skip、构建及pack:dry-run通过，既有新安装291/702文件/204Web精确字节及B1.2/CLI保持。B4实际范围收口，混合子项不折算其他工作包完成；本轮1commit/1PR交付，自查后通过PR合并main；原72笔映射/备份见[整合记录](./local-commit-consolidation-2026-11-21.md)，后续工作包B5。见[B4完成矩阵](./B4-completion-matrix.md)。

**完整上游提交索引**：[B4 时间顺序索引](./cc-viewer-alignment-commit-index.md#b4)；[B0 交叉候选](./B0-cross-index.md#cross-b4)。逐项核对索引及交叉工作包中的修复、合并和后续替代记录。

**工作项**：①映射 Codex turn start/end、工具执行、子 agent 与 task 的真实协议；②做事件归属、状态恢复和滞后事件保护；③按现有事件实现任务/活跃 agent HUD，不能推测不存在的状态；④慢首字节、重试和失败提示与取消/恢复联动；⑤评估语音与插件事件。

**候选文件**：`lib/appserver-bridge.js`、`lib/sdk-adapter.js`、`lib/sdk-manager.js`、`server.js`、`src/components/chat/ChatView.jsx`、新 HUD 组件及状态 utility。**验收**：多 workspace、后台 agent、刷新、迟到事件、错误/停止和无任务降级；Codex 不提供时不显示假状态。运行 appserver/sdk/聊天相关测试和捕获的脱敏真实事件回放。**依赖**：B2/B3。

### B5 — 文件操作与搜索

**当前状态：已完成（第6/12工作包，2026-11-21）。** E1–45独立迁移/审计，E46收口；1781/1781、0skip/build/pack712、真实安装487/487与源码/204Web字节/B1.2/CLI通过。实际双引擎目标8场26图、user/plugin另2场6图；47候选混合子项及原缺陷/未验环境单列。下一工作包B6，见[B5完成矩阵](./B5-completion-matrix.md)。

**历史前置**：b4051ed等原相对符号链接越界修复已保留；B5最终端点/target/native owner及授权验证见E26–45和完成矩阵，其他平台仍未验。

**完整上游提交索引**：[B5 时间顺序索引](./cc-viewer-alignment-commit-index.md#b5)；[B0 交叉候选](./B0-cross-index.md#cross-b5)。逐项核对索引及交叉工作包中的修复、合并和后续替代记录。

**工作项**：①逐项验收树、浏览、上传下载、编辑、搜索和拖动；②接入对话/终端前定义绝对路径、相对路径、引用转义和文件夹语义；③搜索 worker 与大列表虚拟化已按原基线迁入并有前后基准；④修复项目切换后的路径归属。

**EPIPE核验已完成**：96c477d582的既有stdin防护已由E1按真实提前退出/缺失命令/超时和HTTP失败回退复核，24项通过；原本地ecc1048映射保留，见[B5实施](./B5-implementation.md)。

**候选文件**：`lib/file-api.js`、`lib/code-search.js`、`src/components/files/FileExplorer.jsx`、`src/components/search/SearchPanel.jsx`、`src/components/chat/ChatView.jsx`、`src/components/mobile/MobileFileExplorer.jsx`。**验收**：realpath、符号链接、目录越界、同名项目、空格/换行路径、移动端及写操作授权；运行文件、搜索、端点和 UI 测试。**依赖**：B2 工作区归属。

B5安全复核：E7/E26/E33/E36/E39组合native凭据/历史/descriptor/alias/祖先与缺失叶策略，覆盖通用文件工具；目标身份/管理员与跨项目异步归属已验。专属image/voice/IM按原scope，OS terminal按原管理员/containment意图；不声称全部TOCTOU或跨平台已解决。

### B6 — 预览与内容引用

**当前状态：已完成（第7/12工作包，2026-11-21）。** E1–E13逐笔迁移/修复/验收、E14收口；1986/1986、0skip/build/pack720，新安装525/525/211Web字节与B1.2/CLI通过。双引擎6场26图及10轮连续问答通过；混合范围/真机未验单列，见[B6完成矩阵](./B6-completion-matrix.md)。
**完整上游提交索引**：[B6 时间顺序索引](./cc-viewer-alignment-commit-index.md#b6)；[B0 交叉候选](./B0-cross-index.md#cross-b6)。逐项核对索引及交叉工作包中的修复、合并和后续替代记录。

**工作项**：统一类型与二进制识别；有界 ZIP/TAR/GZIP 目录/条目预览，支持图片音频字幕与不支持格式的下载回退；对话选中文本、diff 和工具参数引用；Markdown 源复制。新增依赖之前先核对已安装依赖和许可。

**候选文件**：`lib/file-api.js`、`src/components/files/FileContentView.jsx`、`src/components/viewers/`、`src/components/chat/ChatMessage.jsx`、`src/components/chat/ChatView.jsx`。**验收**：压缩包路径穿越、嵌套/解压炸弹、超大文件、编码、音频 range、XSS、安全链接、触屏选区；使用受控 fixture。**依赖**：B5 文件读策略。

普通CLI/PTY入口缺口已由B7 E12/E13恢复原Header与隔离运行链；活动7008仍是旧后端，正常重启后的入口复验保持待办。历史[缺口记录](./B2-pty-workspace-entry-gap-2026-11-21.md)保留。

### B7 — 输入体验、导航和 Skills

**当前状态：已完成（第8/12工作包，2026-11-22）。** E1–E47及四笔追加共51笔独立验证后整合为5b1c397，经[PR #8](https://github.com/weiesky/cx-viewer/pull/8)合并main（89a8d9d）。74去重候选仅按B7 scope闭合，2914d6479d窄split及80ced6a996只读扩窗追加核验；混合其他包、实际native计划producer与真机/外部环境限制单列。最终2181/2181、0skip、build/pack723、新安装634/634与全部包/Web字节通过，见[B7完成矩阵](./B7-completion-matrix.md)。[B7交接](./B7-handoff.md)为历史起点；B8也已完成，当前按[B9交接](./B9-handoff.md)准备下一包。

**完整上游提交索引**：[B7 时间顺序索引](./cc-viewer-alignment-commit-index.md#b7)；[B0 交叉候选](./B0-cross-index.md#cross-b7)。逐项核对索引及交叉工作包中的修复、合并和后续替代记录。

**工作项**：比对排队发送/立即发送/中断、输入草稿、Prompt 导航、斜杠菜单、模型 chip、SDK 和 PTY 布局；仅对 Codex 支持的 slash 命令与实际 skills 展示。避免把内部 SDK 队列误认为现有完整产品能力。

**候选文件**：`src/components/chat/ChatView.jsx`、聊天输入组件、`src/utils/promptNav.js`、`lib/sdk-manager.js`、skills API 和 `src/i18n.js`。**验收**：IME、粘贴图片、视图切换、断线恢复、重复发送、键盘与屏幕阅读器；运行 prompt/skills/SDK 测试。**依赖**：B2；可与 B5 并行但需协调 ChatView 冲突。

### B8 — 代理、模型与提示词

**当前状态：已完成（第9/12工作包，2026-11-22）。** 2026-11-22 B8已完成并由[PR #9](https://github.com/weiesky/cx-viewer/pull/9)合并main（`6106d41`），37原始本地commit备份/映射保留，整合与merge tree精确一致，实际无PR checks。最终2232/2232、0skip/build/pack737，新生产安装685/685、全部737包/211Web字节、B1.2/隔离CLI通过；真实默认SDK双浏览器与native主/子分源分项验证通过。代理重试配置与统计明确排除，提示仅新会话、原生窗口/未知态及能力门保持。54候选按B8子项核销，混合B9–B11和未验环境单列。见[B8完成矩阵](./B8-completion-matrix.md)；[B9交接](./B9-handoff.md)与14候选已准备，本轮未开始B9。

**完整上游提交索引**：[B8 时间顺序索引](./cc-viewer-alignment-commit-index.md#b8)；[B0 交叉候选](./B0-cross-index.md#cross-b8)。逐项核对索引及交叉工作包中的修复、合并和后续替代记录。

**工作项**：代理重试配置与统计整体按用户2026-11-22要求排除；核对现有 profile、Responses 代理、角色身份与模型热切；验证提示词对 fresh/resume/fork 的绑定与缓存；只引入 Codex 支持的参数。评估上游模型 preset 的适用性，不假设第三方模型支持与 Claude 相同。

**候选文件**：`proxy.js`、`interceptor.js`、`lib/proxy-profile.js`、`lib/model-system-prompts.js`、`lib/appserver-bridge.js`、设置 UI。**验收**：API key 与 ChatGPT 登录、角色路由、流/非流、失败及恢复、凭证不外泄；运行 `tests/proxy-profile.test.js`、`tests/interceptor-proxy-profile.test.js`、`tests/model-system-prompts.test.js`。**依赖**：B1/B2。

### B9 — 定时任务与授权

**当前状态：2026-11-23本地实施/验收完成，已提交[PR #11](https://github.com/weiesky/cx-viewer/pull/11)，尚未合并。** 29笔原始提交已备份并整合为 `0a162b4`，原/整合/远端内容一致；实际没有PR checks，不冒称远端CI通过。14候选按B9子项核销，2443/2443、0skip/build/pack747、新生产安装859/859及747包/211Web精确字节通过；实际native SDK/PTY、双浏览器6配置16图通过。保留native权限/reviewer，用户明确选择独立任务用AppServer、常驻transport不变；问答托管可选默认关闭。见[B9完成矩阵](./B9-completion-matrix.md)、[整合记录](./B9-local-commit-consolidation-2026-11-23.md)与[B9实施](./B9-implementation.md)。未验环境继续单列，B10未启动。

**完整上游提交索引**：[B9 时间顺序索引](./cc-viewer-alignment-commit-index.md#b9)；[B0 交叉候选](./B0-cross-index.md#cross-b9)。逐项核对索引及交叉工作包中的修复、合并和后续替代记录。

**工作项**：先核固定源码中本机离线/睡眠、时区和夏令时、错过执行、重试、幂等、目标 workspace 与身份的实际语义；持久配置和单次/周期调度、任务历史；再接模板和附件。自动答题与 `-2` 完全免审批是独立产品选择，默认不启用，不能由定时任务暗中改变权限。

**候选文件**：核固定上游完整调度/持久化/UI调用链，再复用现有配置/API/会话机制并作最小native适配；`server.js`、`src/components/chat/`、`lib/sdk-manager.js` 为接入点。**验收**：进程重启、重复触发、取消、目录消失、无权限、附件删除、两进程竞争、失败重试及历史；时钟用 fake timer，并辅以隔离联测。**依赖**：B1/B2/B4。

### B10 — 服务插件与反向代理

**完整上游提交索引**：[B10 时间顺序索引](./cc-viewer-alignment-commit-index.md#b10)；[B0 交叉候选](./B0-cross-index.md#cross-b10)。逐项核对索引及交叉工作包中的修复、合并和后续替代记录。

**工作项**：对照现有 JS hook 插件与目录服务插件协议；设计生命周期、同端口路由、前端面板、权限和升级兼容；分别核验 base path、公开 URL、WS、认证、二维码和引导更新/重启；无需预先迁移 monorepo。

**候选文件**：`lib/plugin-loader.js`、`lib/plugin-manager.js`、`lib/updater.js`、`src/utils/apiUrl.js`、`server.js`、插件设置 UI。**验收**：恶意或异常插件隔离、路径前缀编码、Host/Origin、反代 TLS、WS 断线和更新失败回滚；相关 API 和打包测试。**依赖**：B1/B2/B3。

<a id="b11-engineering"></a>

### B11 — 安全交互、IM、跨平台与工程收尾

**当前状态：工程前置 A1/A2 已分别提交并完成本地验证。** A1 6287d2a 在主线，A2 3b15a6d 在独立工作树，当前全局运行目录未切换。后续在新结构继续 B1 余项及 B2–B10，见 [工程交接](./A1-A2-engineering.md)。B11 其他能力及最终跨平台验收仍按各自依赖执行；B1–B4 的整包验收依赖不再作为 pnpm/workspace 的前置。B0 的调研已转入 A1/A2 实施，用户已确认最小结构范围；Changesets 与进一步抽包范围另行确认，见 [pnpm 与 monorepo 专项](./B0-pnpm-monorepo.md)。

**pnpm 专项门槛与剩余验收**：A1 已在独立新依赖目录通过 frozen install、安装脚本许可、原生 PTY、全量、构建、npm 产物与生产安装；A2 已通过新布局全量、构建、npm 产物及 macOS unsigned 目录包 Resources/server 的实际 Node/HTTP/UI/PTY 与链接归属核验。发布仍使用单一 cx-viewer npm 包。当前全局实例未切换，Node 20/22 远端 CI、最低 runtime、GUI、Windows/Linux、签名/公证、全局升级仍待验收。A3 Changesets 和进一步 core/content 抽取分别决定，不能把工程子项本地通过当作 B11 整体验收。

**完整上游提交索引**：[B11 时间顺序索引](./cc-viewer-alignment-commit-index.md#b11)；[B0 交叉候选](./B0-cross-index.md#cross-b11)。逐项核对索引及交叉工作包中的修复、合并和后续替代记录。

**工作项**：逐项比较 Codex 审批、Ask 和 IM 停止/保存；对自动答题、完全免审独立评估并明确默认策略；核对 Electron/macOS/Windows/Linux、手机/iPad 的启动、终端、文件和进程回收；pnpm 与最小 workspace 已前置实现并通过本地验证；继续完成 CI/打包及目标环境验收，Claude hook 的适用性独立评估。

**候选文件**：`lib/codex-request-user-input.js`、`lib/perm-bridge.js`、`lib/dingtalk-im-bridge.js`、`pty-manager.js`、`electron/`、`src/components/mobile/`、`scripts/`。**验收**：审批并发和断线时不误批准；IM 配置保存/停止不丢密钥；平台执行和打包矩阵；回归全量测试。**依赖**：B1–B4；各平台无可用环境时明确记录未验证。

## 5. 发布前验收与批次记录

**实例化验证约定**：每轮先在当前环境尝试；若无法跑通，记录失败原因、所需环境、操作步骤和预期结果，交由用户验证，并继续不依赖该验证结果的工作。未实际通过的验证保持未验证状态。

每个批次在台账回填：上游 hash、对应本地 commit、状态、测试命令与结果、尚未覆盖的平台、数据迁移/回滚步骤。全线完成前不得以“全部对齐”描述。最终检查：`env -u CXV_BYPASS_PERMISSIONS npm test`、`npm run build`、`npm run pack:dry-run`；再按真实 CLI 模式完成用户授权范围内的端到端验收。此前全量测试需清除继承的 bypass 环境变量；测试不能使用真实凭据或破坏现有会话。

## 6. 当前未完成与需决策项

- B0 已完结；原 15 条待归类项已由人工分流明确归属，见 [B0 交接](./B0-handoff.md)。337 条提交的功能对齐与环境验收继续由 B1–B11 逐项完成，不以累计本地提交数抵扣整条上游提交。
- B2已用户验收，B3已完成并以7c3d849推送main；B4已完成并由PR #4合并main，B5/B6/B7已完成范围内迁移验收并经PR合并main，下一包B9（本轮未执行）；B1.2 本地实现与隔离安装验收已收尾，已确认不提供有损整库回退，真实用户/目标环境验收仍待；三类迁移、live 可读库的按配置恢复、可证明无损的 key 修复及损坏现场留存已实现，用户已选择 auth 恢复整份 preferences，真实用户迁移尚未执行。真实迁移前停用共享配置的进程、备份并验证可恢复；迁移完成仍停用时追加含新 key 的正常快照，迁移前快照不能保证包含新 key。
- 工程前置 A1/A2 已分别提交 6287d2a/3b15a6d，并完成当前 macOS/Node 24 的源码/npm/桌面 Node payload 验证。当前全局实例未切换，后续开发使用新结构工作树；Changesets 和进一步 core/content 抽取分别确认。
- 自动审批、自动答题、定时任务及插件服务的权限语义仍须在对应工作包实施前明确。现有台账初筛标签保留历史线索，实施前仍需阅读完整 diff、后续修复和当前数据流。
- 已通过的隔离测试不替代真实模型 CLI、GUI、移动端、Windows/Electron、跨平台、断电或持续高负载验证；失败记录及环境要求随工作包保留。

2026-11-19 iOS追加补证：隔离iPhone16e/iOS18.6 Simulator移动Safari的软键输入、网页触控Enter/Up/保持键盘展开、20×60→37×60及scratch切回保留输出通过。CUA drag/scroll未观察滚动位移，原因未定；指针跨项落点/物理单多指惯性仍待。不是物理真机通过，无后续代码改动。
