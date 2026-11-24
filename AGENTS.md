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
- 当前进度：2026-11-24 B11后SDK模型切换已完成本地实现和验证：原输入条胶囊接入实际Codex executable的分页model/list和动态思考强度；exec以公开resumeThread续接原线程，AppServer按原线程turn/start更新，精确instance/revision隔离，生成与待发队列期间禁用，旧代次/并发写入拒绝，SSE重连与刷新保留当前模型/强度。最终隔离全量2842/2842、0skip/build/533边界/603源码/628稳定tarball路径通过；真实CLI0.169.0+SDK0.142.5+独立Chrome验证Astra/high→Sol/high同会话续发和刷新，使用loopback模拟回复，未调用外部模型。首轮既有logger-bootstrap PID0失败、错误cwd复测及浏览器探针失败均保留，正确cwd独立3/3与最终全量通过。见[本轮实施](cc-viewer-alignment/SDK-model-switch-2026-11-24.md)与[回执](cc-viewer-alignment/SDK-model-switch-2026-11-24.json)。当前为B11后SDK模型选择维护；下一步正常重启后的活动验收及既有目标环境验收。用户活动实例未重启、旧归档与全局Codex配置未改，未发布npm/未运行version；Windows/Electron GUI/WebKit/真机未验。既有phone/Electron入口可见性和显式代理profile编辑器保留。此前SDK上下文与启动警告已经PR #14合并main fcbaf59，见[SDK上下文](cc-viewer-alignment/SDK-context-usage-2026-11-23.md)与[启动警告](cc-viewer-alignment/SDK-startup-warnings-2026-11-23.md)；B11经PR #13合并main 3a4bf40（12/12工作包），见[B11完成矩阵](cc-viewer-alignment/B11-completion-matrix.md)与[最终回执](cc-viewer-alignment/B11-validation-2026-11-23.json)。原生reviewer/AppServer/常驻transport/Ask默认关/TLS密码门/retry排除与30分钟run上限保持。
- 普通工作区入口纠偏（2026-11-22）：B7 E12/E13已恢复普通PTY registry与原Header“＋”，经真实CLI双引擎启动/切回原会话验证；E31队列经真实原生8场20图验证。B8 E16只读复核活动7008/PID38260已具ptyMode=true/ptyQueueAvailable=true，sdkMode=false；该API核对不替代活动实例GUI验收。历史[缺口记录](cc-viewer-alignment/B2-pty-workspace-entry-gap-2026-11-21.md)与[B7实施](cc-viewer-alignment/B7-implementation.md)保留。
- 当前运行入口（2026-11-23 B11只读）：全局bin/cxv仍软链本仓库packages/app/cli.js；7008监听PID97674，cliMode=true、sdkMode=false、ptyMode=true、ptyQueueAvailable=true，version-info仅旧式version=1.1.20。代理未停止/重启该进程或其他用户实例；新dist/npm链接不等于新后端已加载，须正常重启才加载后端。活动实例GUI不由API读取替代。见[B11只读回执](cc-viewer-alignment/B11-active-entry-readonly.json)；历史[重启交接](cc-viewer-alignment/B6-runtime-entry-2026-11-21.md)保留。
- 每次完成本专项的一轮迭代后，同步更新本标记，写明已完成内容、当前工作包、下一步以及阻塞或未验证事项；同时在提交台账中记录对应上游提交、本地实现和验证结果。保持本段为最新状态，不追加过时的进度记录。
- 持续推进约定：用户要求持续推进到 B0 台账中的提交全部对齐，遇到需要产品、权限或迁移方案决策时再询问；不得将部分子项实现等同整条提交完成。
- 用户后续授权（2026-11-23，最新明确）：用户本轮要求代码PR到main并由代理自行合并；SDK两项修复已整为4a56de7，经PR #14合并fcbaf59，合并后更新文档。此前B11授权与完成记录：本次变更合为一个commit，PR到main，由代理自行合并，合并完成以后更新文档。本轮B11原34笔已备份整合为539822e，PR #13已于2026-11-23T07:19:32Z合并main 3a4bf40，随后更新本进度；原始映射/已验bundle保留。此前B9/B10 PR #12交付不混记；独立任务AppServer/常驻transport不变、Ask托管默认关、后端TLS密码门持续有效；活动7008及其他用户实例不由代理停止。
- 迁移提交约定：按用户要求小步迁移，每笔只处理一个独立改动，验证通过后单独提交，再进入下一笔；保留上游 hash 与本地 commit 映射，不把混合提交整批搬入。
- 实例化验证约定：每轮实施后先在当前环境尝试；若无法跑通，记录失败原因、可复现步骤、预期结果和环境要求，交由用户验证，不阻塞可独立推进的后续工作。不得将未完成的实例化验证标为通过。

- B11工程方向（2026-11-23用户选项确认）：引入Changesets，继续core/content私有包与相应边界门；单cx-viewer npm发布包保持。版本记录使用cx-viewer patch changeset；版本工具仅在发版准备时运行version，先提交版本再建同版tag，不因普通实现自动改实际app版本。
