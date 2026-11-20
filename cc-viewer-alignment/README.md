# cc-viewer 功能对齐专项

**迁移约束：优先参考 PR 的实际代码，禁止根据文档自由改版。** B2已按上游组件/CSS/交互纠偏并经用户验收收口；B4及后续工作包继续遵守该规则，运行性测试不能单独代表视觉对齐。必读[源码优先迁移规范与已确认偏差](./migration-code-first.md)。

2026-11-21 B4已完成（第5/12工作包），B2/B3已收口；固定上游74cd752d99caf122e750216d2af3bb9f467c4de1。任务/Agent身份与生命周期、审批问答、失败恢复/慢请求、活性/重放、原HUD/MCP/model chip/浮动输入区/压缩提示、启动参数及SDK主通道PTY隔离已分笔核验。用户明确允许临时Playwright后，E66完成G1–G5实际Chromium159/WebKit27.2 GUI：分叉与审批预抢刷新各一份、原生滚动条11px实际可拖、多行/HUD/队列/空态错误/长回复、phone/pad仿真、压缩恢复清理、SDK说明及分类不可用/普通PTY与离线门控。12张原截图与哈希见B4-final-gui回执。最终1580/1580、0skip、构建与pack:dry-run通过；E64新安装291运行时、702文件/204Web精确字节、B1.2/CLI通过，本轮无生产变更。默认exec/显式AppServer渐进方案及既选353K用量条保持。本轮按授权以1commit/1PR交付，原72笔hash映射与可恢复备份见local-commit-consolidation-2026-11-21.md；GitHub最终合并状态以关联PR为准，完成后下一工作包B5。B7普通PTY队列/技能导航、B8角色分源/模型提示、B9自动审批/调度、B10 service总线与B11旧IM/发布等混合项继续独立未完成。保留IM并发偶发未定、原生profile/image-input/add-dir/review不支持，真实外部模型/慢网/权限/dynamic图像/OAuth/远端MCP、物理音频/设备及其他平台/最低Node未验边界。详见[B4完成矩阵](./B4-completion-matrix.md)。

2026-11-18 GitHub 同步：已按用户请求将 main 6045b53 与 codex/pnpm-workspace 2c0edc8 原子推送到 origin 同名分支，远端完整 hash 已读回核对，上游跟踪已设置。未执行强推、分支合并或活动安装切换；未提交的 AGENTS.md 与 cc-viewer-alignment 文档仍保留本地。

2026-11-18 提交整理：用户选择按两阶段压缩，原 main 34 笔合为 `6045b53`，原新结构工作树 11 笔合为 `2c0edc8`。两阶段文件树均与原末端完全相同；未切换活动目录、未推送。原提交与43笔专项实施证据保留在 archive 引用中，见 [45条完整映射](./local-commit-consolidation-2026-11-18.md)。此次不重复运行测试，后文1161/1161等为原实现批次验证。

本目录用于持续追踪 cc-viewer 功能向 cx-viewer 的对齐工作。建议先阅读规划，再根据逐提交台账开展各批次核验和实施。

2026-11-17：B0 已完结；专项累计 43 笔独立实现。B1.2 本轮新增 3f81fbc 全库离线验 key、8732a33 明确用途的损坏证据、0122f7e 无损 key 修复、20ce331 现场留存命令。候选备份 key 必须认证每条当前记录，才允许只替换 key；保留当前 source/store 精确字节及备份后新增/更新的其他配置凭据。坏密文、缺失库、不匹配候选或无记录可证明时拒绝写入，可显式保存私有损坏证据；有损整库回退尚未启用，产品选择待回复。最终全量 1161/1161、0 skip、无失败钩子，构建、npm 680 文件预览和实际 tarball 的默认只读/修复/重启/字节保留/坏库拒绝/现场留存通过。auth/proxy/IM 迁移及 36d0697 配置恢复保持，auth 按已确认范围回退整份 preferences。首次迁移前快照可能无 key，真实验收需在迁移后追加含新 key 的正常快照。B1.2 尚待回退策略选择与真实环境验收，再推进 B2–B10。A1 6287d2a 已主线，A2 3b15a6d 及后续实现在 codex/pnpm-workspace 工作树。活动全局实例与真实凭据未停止、切换、迁移或恢复；GUI、真实模型 CLI/DingTalk 网络、Windows/Linux、签名/公证、全局升级、最低 Node/远端 CI、高负载与断电未验收。见 [key 修复](./B1-key-repair.md)、[验收矩阵](./B1-acceptance-matrix.md) 和 [工程交接](./A1-A2-engineering.md)。

| 阶段 | 进度 |
| --- | --- |
| B0 | 已完结：337 条台账、归属与迁移准入复核；产品验收由各实施包负责。 |
| B1 | 本地实现与隔离安装验收完成（b549125）；保留现场并拒绝覆盖策略已确认，真实用户/目标环境验收仍待。 |
| B2 | 已完成：2026-11-19用户验收收口 |
| B3 | 已完成并推送main：[7c3d849](https://github.com/weiesky/cx-viewer/commit/7c3d849b9e7acda1c974077843406c23627dbdcb)；1410项通过，见[B3完成矩阵](./B3-completion-matrix.md) |
| B4 | 实施中（第5/12工作包）；最新源码1575项/构建通过；E56原生压缩提示已验；E55浮动输入区/scrollbar源码已验，新安装286项通过，GUI待；E53中断分叉与缓存修复的最终GUI复验待连接恢复，Context差异及剩余候选继续，见[B4实施](./B4-implementation.md)。 |
| B5–B10 | 尚未逐包完成，按台账独立核验 |
| B11 / 工程前置 | A1 6287d2a 已主线；A2 3b15a6d 已提交工作树并通过本地验证，当前全局实例未切换。 |

pnpm/workspace 已按用户选择前置实施，先稳定结构，再继续功能对齐；见 [提交、边界与验收](./A1-A2-engineering.md)。

- [B4 AppServer评估](./B4-appserver-proposal.md)：用户已选择的执行器评估、实际CLI本机合成验证、最小方案与尚待准入。
- [B4候选矩阵](./B4-candidate-matrix.md)：主索引/交叉索引并集66条，逐子项记录，不整体勾选混合提交。
- [B3提交合并记录](./local-commit-consolidation-2026-11-20.md)：原30笔完整映射、可恢复备份、实际聚合hash与GitHub推送回执。
- [B3完成矩阵](./B3-completion-matrix.md)：完成条件、交叉候选处置、最终验证与未覆盖环境。
- [B3渐进分片](./B3-sharding.md)：13笔独立映射、格式适配、2001轮基准和Safari证据。
- [B3实施与证据](./B3-implementation.md)：四笔hash映射、源码依据、最终验证与基准/剩余边界。
- [B3历史交接](./B3-handoff.md)：原实施入口；B3已收口，当前下一包B4，以上述完成矩阵为准。
- [本轮提交压缩映射](./local-commit-consolidation-2026-11-19.md)：原63笔提交、备份与main聚合范围。
- [B2完成矩阵](./B2-completion-matrix.md)：六项完成条件、80候选及产品/GUI待办。
- [B2 SDK状态与取消复核](./B2-sdk-state-review.md)：启动取消窗口、协议差异、getContextUsage清理不适用及残余场景。
- [B2 会话与同名日志隔离](./B2-session-isolation.md)：分笔提交、用户决策、组件/SDK/HTTP/真实shell/安装产物验证及GUI边界。
- [工程前置实施与交接](./A1-A2-engineering.md)：提交、工作树、产物验证及未验证事项。
- [A2 逐文件路径映射](./A2-path-map.json)：把 B0 候选定位到新源码结构。
- [对齐规划](./cc-viewer-alignment-plan.md)：基线、工作包、依赖、验收和风险。
- [B1 配置与凭据实施拆分](./B1-config-implementation.md)：数据保护、凭据运行时、备份/迁移实施和验证证据。
- [IM 迁移入口与中断续跑](./B1-im-migration.md)：显式应用、空 secret、共享库保留及实际打包验证。
- [无损 key 修复与损坏现场留存](./B1-key-repair.md)：匹配备份前提、只读证明、显式修复、拒绝边界和真实产物验证。
- [B1 验收矩阵](./B1-acceptance-matrix.md)：已验证、已验证拒绝、未实现与目标环境未验收的区分。
- [共享库恢复范围](./B1-recovery-scope.md)：下一笔方案与 已确认的整份偏好回退范围。
- [Proxy 迁移入口与中断续跑](./B1-proxy-migration.md)：当前配置与 .bak 独立版本、显式应用、回执及恢复边界。
- [Auth 迁移入口与恢复边界](./B1-auth-migration.md)：默认只读检查、显式应用及中断续跑说明。
- [B0 高优先级人工复核候选](./B0-priority-audit.md)：上游明确标注优先级或安全关键词的候选及本地复现风险，仍需人工核实。
- [B0 冷加载与回合中刷新复核](./B0-cold-ingest-review.md)：异常注入、首轮 snapshot/live 隔离验证、复现探针及 B3 待办。
- [B0 尚未对照的提交](./B0-open-commits.md)：按时间列出尚无本地代码对照的条目及统计口径。
- [B0 上游完整提交说明](./B0-upstream-messages.md)：逐条保留上游提交正文，避免混合提交内容被标题省略。
- [B0 交叉候选索引](./B0-cross-index.md)：按时间列出全部提交的多个工作包候选。
- [B0 逐提交文件与测试证据](./B0-commit-file-evidence.md)：每条提交涉及的上游测试及本地候选路径。
- [B0 pnpm 与 monorepo 专项](./B0-pnpm-monorepo.md)：上游方案、提交链、当前差异与迁移验收。
- [B0 血缘与基线记录](./B0-commit-lineage.md)：提交血缘、重复补丁和基线测试。
- [完整时间线与工作包索引](./cc-viewer-alignment-commit-index.md)：全部提交按时间顺序排列，并按工作包索引。
- [逐提交台账](./cc-viewer-alignment-commit-ledger.md)：上游提交、改动路径和待核验的本地映射。
- [能力盘点](./cc-viewer-alignment-inventory.md)：按功能主题归纳的初步清单。

每完成一批，应在台账中记录结论、对应的本地提交、验证结果及未覆盖风险。台账中的自动分类和路径匹配是待核验线索，不应直接作为移植结论。

2026-11-19 iOS追加补证：隔离iPhone16e/iOS18.6 Simulator移动Safari的软键输入、网页触控Enter/Up/保持键盘展开、20×60→37×60及scratch切回保留输出通过。CUA drag/scroll未观察滚动位移，原因未定；指针跨项落点/物理单多指惯性仍待。不是物理真机通过，无后续代码改动。
