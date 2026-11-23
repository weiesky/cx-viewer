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
- 当前进度：2026-11-23 B9/B10已通过[PR #12](https://github.com/weiesky/cx-viewer/pull/12)合并main（代码提交`d829772`，第11/12工作包完成）。当前分支26笔未合并提交（B9两笔+B10二十四笔）已备份并整合为`da60ff2`；原始/整合/远端/合并tree完全相同，252文件路径/状态/blob逐一核对。旧PR #11已关闭，由#12覆盖，无重复合并；实际无PR checks/分支Actions runs，不冒称远端CI。按本轮要求合并后才更新进度文档，见[整合与合并](cc-viewer-alignment/B9-B10-consolidation-and-merge-2026-11-23.md)及[完整原映射](cc-viewer-alignment/B9-B10-original-commits-2026-11-23.json)。最终2713/2713、0skip/build/pack773，新安装1096/1096、773包/211Web精确字节/B1.2/安装CLI通过；B10双浏览器14配置34图、13原组件/CSS/模板精确字节及原B9 native证据保持，本轮只整合历史与更新进度，产品内容未变。固定74cd752；B10 12候选按子项核销，B11目录/Activation/content与平台范围保留，下一步B11。后端HTTPS密码门、原生权限/reviewer、独立任务AppServer、常驻transport不变、Ask默认关、代理重试排除持续有效。自有fixture均退出，7008及其他用户实例未由代理停止/重启，正常重启才加载后端。真实全局升级/发布下载、Electron GUI/签名、其他OS/最低Node、真实DNS/LAN-TLS、外部模型、真机/触控/音频/IME/密码插件、长等待/睡眠及历史IM偶发未验，30分钟独立run上限保留。
- 普通工作区入口纠偏（2026-11-22）：B7 E12/E13已恢复普通PTY registry与原Header“＋”，经真实CLI双引擎启动/切回原会话验证；E31队列经真实原生8场20图验证。B8 E16只读复核活动7008/PID38260已具ptyMode=true/ptyQueueAvailable=true，sdkMode=false；该API核对不替代活动实例GUI验收。历史[缺口记录](cc-viewer-alignment/B2-pty-workspace-entry-gap-2026-11-21.md)与[B7实施](cc-viewer-alignment/B7-implementation.md)保留。
- 当前运行入口（2026-11-23只读核对）：全局bin/cxv仍指向本仓库packages/app/cli.js；7008当前PID97674，API为sdkMode=false/ptyMode=true/ptyQueueAvailable=true，version-info仅1.1.20，尚无B10新身份字段。代理未停止/重启它或任何其他用户实例；不得将dist/npm链接等同已加载新后端。SDK页面地址仍待用户提供，历史见[入口与重启交接](cc-viewer-alignment/B6-runtime-entry-2026-11-21.md)。
- 每次完成本专项的一轮迭代后，同步更新本标记，写明已完成内容、当前工作包、下一步以及阻塞或未验证事项；同时在提交台账中记录对应上游提交、本地实现和验证结果。保持本段为最新状态，不追加过时的进度记录。
- 持续推进约定：用户要求持续推进到 B0 台账中的提交全部对齐，遇到需要产品、权限或迁移方案决策时再询问；不得将部分子项实现等同整条提交完成。
- 用户后续授权（2026-11-23，最新明确）：当前分支所有未进main的本地commit合为一个，PR到main，由代理自行合并，合并完再更新进度文档。本轮26笔已备份整合，PR #12已合并main d829772、旧#11关闭，随后更新本进度。此前B7/B8合并授权已完成；独立任务AppServer/常驻transport不变、Ask托管默认关、后端TLS密码门持续有效；活动7008及其他用户实例不由代理停止。
- 迁移提交约定：按用户要求小步迁移，每笔只处理一个独立改动，验证通过后单独提交，再进入下一笔；保留上游 hash 与本地 commit 映射，不把混合提交整批搬入。
- 实例化验证约定：每轮实施后先在当前环境尝试；若无法跑通，记录失败原因、可复现步骤、预期结果和环境要求，交由用户验证，不阻塞可独立推进的后续工作。不得将未完成的实例化验证标为通过。
