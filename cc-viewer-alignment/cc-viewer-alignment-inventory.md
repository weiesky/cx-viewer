# cc-viewer 功能对齐：首轮盘点

基线：cx-viewer npm 1.1.20，2026-07-26 04:55:08 UTC，对应 tag v1.1.20。本地 HEAD 753fd6c 含发布之后的改动，差距判断以此 HEAD 为准。上游调研快照为 [74cd752d](https://github.com/weiesky/cc-viewer/tree/74cd752d99caf122e750216d2af3bb9f467c4de1)，2026-11-16 23:21 +08，版本 1.9.29。参见 [上游变更历史](https://github.com/weiesky/cc-viewer/blob/74cd752d99caf122e750216d2af3bb9f467c4de1/history.md) 和 [cx-viewer npm](https://www.npmjs.com/package/cx-viewer?activeTab=versions)。

基线后共 337 条 Git 提交，含合并、发布和修复。下表列出非合并且标题以 feat 开头的提交，不代表所有功能：部分能力在非 feat 提交、合并 PR 或历史说明中。以下状态来自代码搜索与关键路径阅读，尚未逐项做 GUI 或跨平台联测。

## 功能主题与初步判断

| 主题 | cc-viewer 更新 | cx-viewer 初步状态 | 建议 |
| --- | --- | --- | --- |
| 多工作区 | 多实例、同名消歧、切换恢复、排序、会话恢复 | 已有 workspace registry 和 PTY；隔离与完整交互待核验 | P0 先测身份和跨工作区数据隔离 |
| SDK 会话 | 每工作区持久会话、上下文/MCP 状态、恢复与停止 | sdk-manager 使用模块级状态；Codex SDK 契约不同 | P0 先做真实版本及会话隔离测试 |
| 实时链路 | 分工作区 SSE、WS 多路复用、回退、背压与重连 | 已有 App Server bridge 和日志流；差异待联测 | P0 以 Codex 原生链路为准逐项加固 |
| 安全与配置 | JSON 原子锁、AES-GCM 凭证库、迁移与备份 | auth 存在 base64，代理 profile 接受 API key；需进一步审计落盘 | P0 单独设计迁移、回滚和旧进程兼容 |
| 长会话 | 分片、历史加载、增量扫描、内存约束 | 已有 log-v2、归档及 bounded history | P0 建立压力基准，按瓶颈修复 |
| 任务与子 Agent | 任务 HUD、活动代理卡片、轮次状态 | 已有 Codex agent 事件与渲染；未发现对应 HUD | P1 先核实 Codex 实际事件与降级 |
| 网络状态 | 慢上游、重试反馈、活性检测 | 有 proxy-errors 等基础，覆盖范围待测 | P1 按请求与工作区隔离 |
| 文件浏览与搜索 | 远程文件树、上传下载、移动、搜索与编辑 | 已有 FileExplorer、搜索和文件 API，逐项验收 | P1 分只读、写操作和跨平台拆分 |
| 文件交互与预览 | 拖文件/Git 到对话或终端；ZIP/TAR、音频、字幕及二进制保护 | 需对照现有文件视图逐项确认 | P1 先处理路径安全与二进制保护 |
| 对话输入 | 排队、立即发送、选中引用、Markdown 源复制、布局调整 | SDK 有消息队列；完整交互待确认 | P1/P2 分批交付 |
| 定时任务 | 单次/周期、执行历史、模板、附件 | 搜索未发现对应实现 | P2 在会话生命周期稳定后实施 |
| 代理与提示词 | 按角色切源、模型热切、提示词 preset 和恢复绑定 | 已有 proxy profile 与 model-system-prompts；语义待核 | P2 依据 Codex 协议设计 |
| 插件 | 目录型 service 插件、同端口代理、远程面板 | 现有 JS hook 插件系统 | P2 另行设计协议与授权边界 |
| 部署更新 | 云反代 base URL/路径、引导更新重启 | 有 base path 和 updater，端到端覆盖待确认 | P2 验证 HTTP/WS、认证、反代 |
| 权限问答 | 服务端倒计时、自动答题、完全免审批 | 已有 Codex ask bridge，Claude 审批语义不同 | P2 独立产品决策，默认保留人工确认 |
| 工程与发布 | pnpm monorepo、包边界、CI 与 tarball | 当前 npm 单仓，已有构建和打包检查 | 不因上游重构自动迁移 |
| 平台与 IM | IM 管理、移动端、Electron 修复 | 本地已有钉钉和移动/桌面代码 | P1 逐项验证是否适用 |
| Claude 专属 | Claude hooks、SDK 事件和 tool catalog | Codex 协议不同 | 迁移通用体验，不能直接照搬 |

## 建议实施顺序

1. 建立 PTY、App Server、SDK 的单/多工作区、恢复、断线及桌面/移动验收矩阵。
2. 处理配置写入安全和敏感信息存储；明确迁移失败、备份恢复及多进程兼容。
3. 完成多工作区身份、SDK 生命周期、恢复和路由隔离，避免串话与串数据。
4. 测量长会话性能，分别处理存储读取、传输背压与重连恢复。
5. 基于 Codex 真实事件补任务/子 Agent 状态、慢上游和失败反馈。
6. 分批实现文件浏览、预览、拖拽引用和对话输入体验。
7. 会话可靠性达标后设计定时任务、插件与云部署；补跨平台测试和文档。

完全免审批、自动回答等会改变安全语义，应单独决定，不默认作为兼容目标。上游 monorepo 和 Claude 专属实现亦不应机械移植。每批开始前需补充具体文件、依赖、验收标准和真实场景验证。

## 基线之后非合并 feat 提交索引

日期为作者日期，筛选依据 Git 提交时间，因此个别日期可能早于基准；非 feat 变化需结合上游 history 和完整提交继续核查。

| 作者日期 | 提交 | 标题 |
| --- | --- | --- |
| 2026-11-16 | [8f1d3453](https://github.com/weiesky/cc-viewer/commit/8f1d3453) | feat(web): move prompt-nav into composer and relocate mic in --sdk layout |
| 2026-11-16 | [478268a4](https://github.com/weiesky/cc-viewer/commit/478268a4) | feat(web): copy selected chat markdown as markdown source |
| 2026-11-16 | [1b3c2268](https://github.com/weiesky/cc-viewer/commit/1b3c2268) | feat(web): 「添加到对话」覆盖代码 diff、工具参数区与 AskUserQuestion 卡片 |
| 2026-11-16 | [2e09d301](https://github.com/weiesky/cc-viewer/commit/2e09d301) | feat(web): 选中助手回复文字弹出「添加到对话」，作为引用 chip 随消息发送 |
| 2026-11-16 | [97531377](https://github.com/weiesky/cc-viewer/commit/97531377) | feat(web): 重构 --sdk 活跃 SubAgent/Teammate 浮条为可折叠卡片列表 |
| 2026-11-15 | [a2f5cd4b](https://github.com/weiesky/cc-viewer/commit/a2f5cd4b) | feat(web): drag git changes (files, folders, commits) into chat or terminal |
| 2026-11-13 | [18758378](https://github.com/weiesky/cc-viewer/commit/18758378) | feat(web+server): add "full auto-approve" (-2) permission tier lifting the npm-publish hard gate |
| 2026-11-13 | [18bd742b](https://github.com/weiesky/cc-viewer/commit/18bd742b) | feat: add subtitle preview and extend image preview formats |
| 2026-11-13 | [20313b25](https://github.com/weiesky/cc-viewer/commit/20313b25) | feat: add inline audio preview with streaming range support |
| 2026-11-12 | [6e3c93cd](https://github.com/weiesky/cc-viewer/commit/6e3c93cd) | feat: add guided npm updates with restart |
| 2026-11-12 | [f96811cd](https://github.com/weiesky/cc-viewer/commit/f96811cd) | feat: unify file preview routing and binary guards |
| 2026-11-11 | [91a523d0](https://github.com/weiesky/cc-viewer/commit/91a523d0) | feat: add cross-platform archive preview |
| 2026-11-11 | [beaa2e86](https://github.com/weiesky/cc-viewer/commit/beaa2e86) | feat(web): support dragging folders into terminal and chat |
| 2026-11-11 | [ea995f38](https://github.com/weiesky/cc-viewer/commit/ea995f38) | feat(web): drag files into terminal or chat |
| 2026-11-11 | [a6b82f16](https://github.com/weiesky/cc-viewer/commit/a6b82f16) | feat(web): 文件搜索并入文件浏览器面板并重排搜索控件 |
| 2026-11-11 | [96f3a7a4](https://github.com/weiesky/cc-viewer/commit/96f3a7a4) | feat(chat): move user-prompts entry from hamburger menu to prompt-nav "more" |
| 2026-11-11 | [d6ec38be](https://github.com/weiesky/cc-viewer/commit/d6ec38be) | feat(header): stop auto-pinning system-prompt entry to top navbar |
| 2026-11-11 | [6081b5d0](https://github.com/weiesky/cc-viewer/commit/6081b5d0) | feat(ask): AskUserQuestion auto-answer (问答题自动托管) — server-side hosting |
| 2026-11-10 | [2914d647](https://github.com/weiesky/cc-viewer/commit/2914d647) | feat(web): quick-fill time buttons for one-time scheduled tasks (#169) |
| 2026-11-05 | [57c732d0](https://github.com/weiesky/cc-viewer/commit/57c732d0) | feat(server): add CCV_BASE_URL for cloud reverse-proxy deployment |
| 2026-11-03 | [791a5e18](https://github.com/weiesky/cc-viewer/commit/791a5e18) | feat(web): raise chat composer max height from 6 to 12 lines |
| 2026-11-03 | [0cde7d1d](https://github.com/weiesky/cc-viewer/commit/0cde7d1d) | feat(web): SDK mode task checklist HUD via sdk-task WS relay |
| 2026-11-03 | [6b340326](https://github.com/weiesky/cc-viewer/commit/6b340326) | feat(sdk): slow-upstream in-flight advisory |
| 2026-11-02 | [ef5fc8b1](https://github.com/weiesky/cc-viewer/commit/ef5fc8b1) | feat(server+web): SDK 模式 Agent-Loop 感知修复与权威轮次边界 |
| 2026-11-02 | [dd23ce8d](https://github.com/weiesky/cc-viewer/commit/dd23ce8d) | feat(web): open file content directly on tree click in file browser |
| 2026-10-31 | [cdf05bf8](https://github.com/weiesky/cc-viewer/commit/cdf05bf8) | feat(server+web): inline 502/network retry feedback with progress and a manual resume-retry affordance |
| 2026-10-29 | [7a75e1be](https://github.com/weiesky/cc-viewer/commit/7a75e1be) | feat(web+server): context menu and preview editing in the CLAUDE.md/skill file browser |
| 2026-10-27 | [566ade13](https://github.com/weiesky/cc-viewer/commit/566ade13) | feat(web): open CLAUDE.md and skill folders |
| 2026-10-25 | [5ee6739c](https://github.com/weiesky/cc-viewer/commit/5ee6739c) | feat: merge SDK context usage into blood bars |
| 2026-10-24 | [451ef48d](https://github.com/weiesky/cc-viewer/commit/451ef48d) | feat(server+web): scheduled tasks — storage in preferences.json + run history split + modal UX polish |
| 2026-10-23 | [177b85df](https://github.com/weiesky/cc-viewer/commit/177b85df) | feat(server+web): add scheduled tasks ("设置定时任务") |
| 2026-10-23 | [c66b5fe2](https://github.com/weiesky/cc-viewer/commit/c66b5fe2) | feat(web): move proxy hot-switch chip into the chat input bar (#158) |
| 2026-10-22 | [58493d1c](https://github.com/weiesky/cc-viewer/commit/58493d1c) | feat(plugins): directory service plugins with same-port proxy + remote React panels |
| 2026-10-22 | [9967ebdb](https://github.com/weiesky/cc-viewer/commit/9967ebdb) | feat(web): rename AgentTeam menu label to localized quick-prompt wording |
| 2026-10-22 | [a336d391](https://github.com/weiesky/cc-viewer/commit/a336d391) | feat(web): fold terminal toolbar upload into the sparkle quick-settings menu |
| 2026-10-21 | [a2be00c4](https://github.com/weiesky/cc-viewer/commit/a2be00c4) | feat(web): 桌面文件上传收纳进 (+) 菜单 |
| 2026-10-21 | [67ceb5b7](https://github.com/weiesky/cc-viewer/commit/67ceb5b7) | feat(web): "/" 弹出斜杠技能菜单 |
| 2026-10-16 | [d906edb3](https://github.com/weiesky/cc-viewer/commit/d906edb3) | feat(web): skill scope rows + frosted glass bars |
| 2026-10-15 | [a84385b5](https://github.com/weiesky/cc-viewer/commit/a84385b5) | feat(sdk): per-workspace close + stable instance identity for same-name disambiguation |
| 2026-10-14 | [db2ada08](https://github.com/weiesky/cc-viewer/commit/db2ada08) | feat(sse): multiplex the dialogue channel over one WebSocket, SSE fallback |
| 2026-10-13 | [5c28d4c5](https://github.com/weiesky/cc-viewer/commit/5c28d4c5) | feat(sse): per-workspace independent SSE channels |
| 2026-10-13 | [2dbe5cd6](https://github.com/weiesky/cc-viewer/commit/2dbe5cd6) | feat(web): 汉堡菜单「钉住」持久化迁移到 preferences.json (#148) |
| 2026-10-13 | [2be5bb23](https://github.com/weiesky/cc-viewer/commit/2be5bb23) | feat(ui): 小终端(scratch)按工作区分组并伴随视图切换,关闭工作区连带回收 |
| 2026-10-13 | [30790404](https://github.com/weiesky/cc-viewer/commit/30790404) | feat(sdk): SDK 模式改为每工作区独立常驻会话(按 cwd 多会话,对齐 PTY) |
| 2026-10-13 | [133bc219](https://github.com/weiesky/cc-viewer/commit/133bc219) | feat(sdk): SDK 模式 MCP 状态面板 + sdkModel chip + 修双面板无限拉取环 |
| 2026-10-13 | [04d05a58](https://github.com/weiesky/cc-viewer/commit/04d05a58) | feat(sdk): SDK 模式健壮性修正 + 新增「Context 用量」面板 |
| 2026-10-10 | [7f7f78e2](https://github.com/weiesky/cc-viewer/commit/7f7f78e2) | feat(web): 新建工作区目录树「启动」一步直启 |
| 2026-10-10 | [d6cab486](https://github.com/weiesky/cc-viewer/commit/d6cab486) | feat(server): relay SDK task_* messages as sdk-task WS frames (#147) |
| 2026-10-09 | [649f853e](https://github.com/weiesky/cc-viewer/commit/649f853e) | Feat/resume global switcher (#146) |
| 2026-10-08 | [eb2e9703](https://github.com/weiesky/cc-viewer/commit/eb2e9703) | feat(web): project tab drag-to-reorder + persist order; focus/mask fixes; 1.8.x series summary (v1.9.1) (#145) |
| 2026-09-22 | [811b0494](https://github.com/weiesky/cc-viewer/commit/811b0494) | feat(server): encrypt local credentials at rest in an AES-256-GCM vault |
| 2026-09-22 | [d663452c](https://github.com/weiesky/cc-viewer/commit/d663452c) | feat(server): unify config JSON writes behind a locked+atomic json-store kernel |
| 2026-09-21 | [3e7f0472](https://github.com/weiesky/cc-viewer/commit/3e7f0472) | feat(server): encrypt local credentials at rest in an AES-256-GCM vault |
| 2026-09-21 | [4c5e633e](https://github.com/weiesky/cc-viewer/commit/4c5e633e) | feat(server): unify config JSON writes behind a locked+atomic json-store kernel |
| 2026-09-18 | [01ff6d85](https://github.com/weiesky/cc-viewer/commit/01ff6d85) | feat: task HUD antd detail popovers, IM stop/save buttons, fix stop wiping config |
| 2026-09-16 | [2e17699f](https://github.com/weiesky/cc-viewer/commit/2e17699f) | feat(git): show +n/-n line stats on unpushed-commit rows, restore real file statuses |
| 2026-09-16 | [b604b1e4](https://github.com/weiesky/cc-viewer/commit/b604b1e4) | feat(system-prompt): add async no-poll rule to kimi-k3 preset; drop defensive-engineering line from all prompt templates |
| 2026-09-15 | [085c2151](https://github.com/weiesky/cc-viewer/commit/085c2151) | feat(proxy): system 提示词热切换、内置 preset 族系合并与别名扩展 |
| 2026-09-12 | [637fbb02](https://github.com/weiesky/cc-viewer/commit/637fbb02) | feat(files): theme-adaptive file-type icon colors (dark/light) |
| 2026-09-12 | [a278d689](https://github.com/weiesky/cc-viewer/commit/a278d689) | feat(files): per-file-type SVG icons in the file browser |
| 2026-09-12 | [5aa5728b](https://github.com/weiesky/cc-viewer/commit/5aa5728b) | feat(files): unify open-project icon to open in-app web file browser |
| 2026-09-12 | [bf2d6f2a](https://github.com/weiesky/cc-viewer/commit/bf2d6f2a) | feat(chat): task-list HUD progress dots + reset task list on new prompt |
| 2026-09-10 | [365af800](https://github.com/weiesky/cc-viewer/commit/365af800) | feat(files): file browser modal upload + in-project drag-move + zone drag feedback |
| 2026-09-09 | [865604d6](https://github.com/weiesky/cc-viewer/commit/865604d6) | feat(files): remote web file browser modal with shared context menu + image thumbnails |
| 2026-09-09 | [6880f773](https://github.com/weiesky/cc-viewer/commit/6880f773) | feat(chat): clickable local file paths in markdown links and code spans |
| 2026-09-07 | [aa584229](https://github.com/weiesky/cc-viewer/commit/aa584229) | feat(chat): surface Plan/Ask/UltraPlan entries in User Prompt Nav with badges |
| 2026-09-05 | [ba3eee8f](https://github.com/weiesky/cc-viewer/commit/ba3eee8f) | feat(files): add "Download to local" context-menu item for remote sessions, streamed via GET /api/download-file |
| 2026-09-04 | [d5e66ec1](https://github.com/weiesky/cc-viewer/commit/d5e66ec1) | feat(cli): inject enhanced context into headless (-p)/one-shot run sessions without starting GUI |
| 2026-09-02 | [a70440ee](https://github.com/weiesky/cc-viewer/commit/a70440ee) | feat(chat): minimal conversation preference merges consecutive tool-only turns into one bubble (default on) |
| 2026-09-01 | [1c5fadaf](https://github.com/weiesky/cc-viewer/commit/1c5fadaf) | feat(chat): Claude Code task checklist HUD docked above the chat composer |
| 2026-08-27 | [20e6573b](https://github.com/weiesky/cc-viewer/commit/20e6573b) | feat(chat): raise conversation render-window limits (800/400/300) and 300-item load-earlier step |
| 2026-08-25 | [72c059f6](https://github.com/weiesky/cc-viewer/commit/72c059f6) | feat(system-prompt): teammate no-wait rules in built-in presets + GLM-5.3 preset |
| 2026-08-25 | [51c974e4](https://github.com/weiesky/cc-viewer/commit/51c974e4) | feat(permission): default auto-approve to a 3s countdown |
| 2026-08-25 | [3a215921](https://github.com/weiesky/cc-viewer/commit/3a215921) | feat(context): default unrecognized model context window to 1M |
| 2026-08-24 | [fe0c52ff](https://github.com/weiesky/cc-viewer/commit/fe0c52ff) | feat(system-prompt): built-in model system prompts default-effective with override + tombstone disable |
| 2026-08-24 | [f28d9cae](https://github.com/weiesky/cc-viewer/commit/f28d9cae) | feat(ultraplan): add Test Analysis Expert (测分专家) preset expert |
| 2026-08-23 | [dafe2bce](https://github.com/weiesky/cc-viewer/commit/dafe2bce) | feat(chat): busy-queue floating bubbles with send-now + two interrupt fixes |
| 2026-08-23 | [efc7f8ea](https://github.com/weiesky/cc-viewer/commit/efc7f8ea) | feat(chat): floating composer overlay + SDK full-surface parity |
| 2026-08-17 | [6680d041](https://github.com/weiesky/cc-viewer/commit/6680d041) | feat(tools): sync tool catalog to Claude Code 2.1.233 — 21 new tools, MCP & Extensions category |
| 2026-08-17 | [3cc05b49](https://github.com/weiesky/cc-viewer/commit/3cc05b49) | feat(proxy): per-role proxy sources for Main Agent / Sub-Agent / Teammate (1.7.22) |
| 2026-08-17 | [02ce99f2](https://github.com/weiesky/cc-viewer/commit/02ce99f2) | feat(system-prompt): auto header entry, model-aware default tab, chip icon |
| 2026-08-16 | [69b104cb](https://github.com/weiesky/cc-viewer/commit/69b104cb) | feat(system-prompt): type-ahead model names in "+ Add model" dialog (1.7.21) |
| 2026-08-03 | [fc68e850](https://github.com/weiesky/cc-viewer/commit/fc68e850) | feat(chat): support Claude Code 2.x JSONL transcripts with tool_result images (1.7.15) |
| 2026-08-01 | [6baff0cd](https://github.com/weiesky/cc-viewer/commit/6baff0cd) | feat(log-list): perf cache + server-side pagination + project switcher (1.7.13) |
| 2026-07-30 | [e932bbef](https://github.com/weiesky/cc-viewer/commit/e932bbef) | feat(context): kimi logo refresh + context-window follows hot-switched model |
