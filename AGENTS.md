## Before writing code

the agent stops at the first rung that holds:

1. Does this need to exist?   → no: skip it (YAGNI)
2. Already in this codebase?  → reuse it, don't rewrite
3. Stdlib does it?            → use it
4. Native platform feature?   → use it
5. Installed dependency?      → use it
6. One line?                  → one line
7. Only then: the minimum that works
   The ladder runs after it understands the problem, not instead of it: it reads the code the change touches and traces the real flow before picking a rung. Lazy about the solution, never about reading.
   Lazy, not negligent: trust-boundary validation, data-loss handling, security, and accessibility are never on the chopping block.

## Proactive communication

1. Use `request_user_input` to clarify user intent whenever the request is ambiguous.
2. Do not act unilaterally. Any major decisions or directional choices must be communicated using `request_user_input` to avoid going further down the wrong path.
3. Don't do anything that goes against the user's intentions; always focus on the user's prompt.
4. 用户要求后续问题必须通过提问工具列出选项，让用户直接选择，不用正文问句或仅提示另行回复；需要当场确定的选择优先使用 request_user_input。既有授权与已选方案持续有效。B3已明确授权自主迁移并选择渐进启用，不重复确认。

## cc-viewer 功能对齐进度

- 源码优先迁移约束（2026-11-19 用户明确）：这是基线对齐，不是重新设计。每笔实施前先读固定基线 PR 的实际 diff、完整组件/调用链与 CSS，核对后续修复/回退；规划文档不能替代代码依据。保持上游布局、样式与交互，Codex 差异仅作有证据的最小必要适配；不得自行新增或重排界面。已偏离的实现须恢复待纠偏状态，测试通过不等于视觉对齐。详见[源码优先迁移规范](cc-viewer-alignment/migration-code-first.md)。
- 专项入口：[cc-viewer-alignment/README.md](cc-viewer-alignment/README.md)；任务与依赖见[对齐规划](cc-viewer-alignment/cc-viewer-alignment-plan.md)，逐项状态与证据见[提交台账](cc-viewer-alignment/cc-viewer-alignment-commit-ledger.md)。
- 当前进度：2026-11-24 已按用户授权通过[PR #15](https://github.com/weiesky/cx-viewer/pull/15)合并main `8a63f94`：13笔原始提交保留，head/merge tree一致，push/PR两轮10/10 CI成功，合并后同步本地main并更新文档；见[合并回执](cc-viewer-alignment/PR15-delivery-2026-11-24.md)。SDK实时工具CR两项P2已修复并分别提交：7af2d75（字符串池完整相等校验，防预览/正式结果碰撞错值）、5ab4adc（过程结果尾部预览，完整卡片5000字符/简洁弹层50行及长行500字符）。全量2868/2868、0skip/build/536边界/605源码/630稳定包门通过；双浏览器4场12图覆盖长输出/等长碰撞、完整/简洁、重连/替换/停止/隔离，0外部模型请求。原817e698实时进度与f805768验收保留，最新见[CR修复](cc-viewer-alignment/SDK-live-tools-CR-2026-11-24.md)与[回执](cc-viewer-alignment/SDK-live-tools-CR-2026-11-24.json)。已PR合并；未发布/version，未重启用户实例或改全局Codex配置/旧归档；正常重启后端并刷新才一起生效。Windows/Electron/真机/活动GUI未验，当前下一包仍B13。B12已完成本地对齐与隔离验收：上游06be1ce6→9943faf（下载重定向），03aad20b行为子项→f014bf9（私有token重启交接、三CLI入口共用接线及真实CODEX_HOME交接文件保护）。最终全量2862/2862、0skip/build/536边界/605源码/630稳定tarball通过；新生产安装829全文件字节一致及82/82通过，真实SDK CLI→HTTP→helper→自有prefix npm更新和损坏包失败恢复均通过，旧token200/匿名403，恢复轮询分别reload/restored，自有端口已关闭、0模型turn。见[B12完成矩阵](cc-viewer-alignment/B12-completion-matrix.md)、[实施](cc-viewer-alignment/B12-implementation.md)与[回执](cc-viewer-alignment/B12-validation-2026-11-24.json)。当前下一包B13；第二轮仍冻至d3c1f7f，D1审批默认值/D2同cwd多SDK会话沿既有决定，不自行启用。密码登录仍为独立内存会话、重启后需重登；活动GUI、Windows/Electron/WebKit/真机及PTY/选择器各自真实重启未验。大包下载既有WriteStream监听器告警仅留线索，未在本包修复。已PR合并；未发布/运行version，未重启用户实例或改全局Codex配置/旧归档。此前SDK套餐b61814f、上下文e9f0017、模型8227874、PR #14合并fcbaf59、B11 PR #13合并3a4bf40保持；原生reviewer/AppServer/常驻transport/Ask默认关/TLS门/retry排除与30分钟run上限保持。
- 普通工作区入口纠偏（2026-11-22）：B7 E12/E13已恢复普通PTY registry与原Header“＋”，经真实CLI双引擎启动/切回原会话验证；E31队列经真实原生8场20图验证。B8 E16只读复核活动7008/PID38260已具ptyMode=true/ptyQueueAvailable=true，sdkMode=false；该API核对不替代活动实例GUI验收。历史[缺口记录](cc-viewer-alignment/B2-pty-workspace-entry-gap-2026-11-21.md)与[B7实施](cc-viewer-alignment/B7-implementation.md)保留。
- 最近运行入口回执（2026-11-24 SDK用量维护时只读；本轮CR修复未重测）：全局bin/cxv软链本仓库packages/app/cli.js；7008监听PID14189，cliMode=true、sdkMode=true；新/api/sdk-plan-usage仍SPA HTML fallback，活动后端尚未加载该接口。代理未停止/重启该进程或其他用户实例；新dist/npm链接不等于新后端已加载，须正常重启才加载后端。活动实例GUI不由API读取或隔离Chrome替代。见[最近回执](cc-viewer-alignment/SDK-plan-usage-2026-11-24.json)；历史[B11只读回执](cc-viewer-alignment/B11-active-entry-readonly.json)与[重启交接](cc-viewer-alignment/B6-runtime-entry-2026-11-21.md)保留。
- 每次完成本专项的一轮迭代后，同步更新本标记，写明已完成内容、当前工作包、下一步以及阻塞或未验证事项；同时在提交台账中记录对应上游提交、本地实现和验证结果。保持本段为最新状态，不追加过时的进度记录。
- 持续推进约定：用户要求持续推进到 B0 台账中的提交全部对齐，遇到需要产品、权限或迁移方案决策时再询问；不得将部分子项实现等同整条提交完成。
- 用户后续授权（2026-11-24，最新明确）：用户要求代码提交GitHub、PR到main并由代理自行合并；已通过PR #15合并8a63f94，保留13笔原始提交，10项远端CI成功，合并后更新文档。此前2026-11-23授权与交付：SDK两项修复已整为4a56de7，经PR #14合并fcbaf59，合并后更新文档。此前B11授权与完成记录：本次变更合为一个commit，PR到main，由代理自行合并，合并完成以后更新文档。本轮B11原34笔已备份整合为539822e，PR #13已于2026-11-23T07:19:32Z合并main 3a4bf40，随后更新本进度；原始映射/已验bundle保留。此前B9/B10 PR #12交付不混记；独立任务AppServer/常驻transport不变、Ask托管默认关、后端TLS密码门持续有效；活动7008及其他用户实例不由代理停止。
- 迁移提交约定：按用户要求小步迁移，每笔只处理一个独立改动，验证通过后单独提交，再进入下一笔；保留上游 hash 与本地 commit 映射，不把混合提交整批搬入。
- 实例化验证约定：每轮实施后先在当前环境尝试；若无法跑通，记录失败原因、可复现步骤、预期结果和环境要求，交由用户验证，不阻塞可独立推进的后续工作。不得将未完成的实例化验证标为通过。

- B11工程方向（2026-11-23用户选项确认）：引入Changesets，继续core/content私有包与相应边界门；单cx-viewer npm发布包保持。版本记录使用cx-viewer patch changeset；版本工具仅在发版准备时运行version，先提交版本再建同版tag，不因普通实现自动改实际app版本。
