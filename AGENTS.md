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
- 当前进度：2026-11-22 B8进行中，分支 `alignment/b8-proxy-model-prompts`，固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1`。E1–E4专家资产/模型别名与实际native fresh/resume/fork钉扎完成；E10已按用户选择对齐独立UltraReview自动修复P0/P1、评估P2；E11–E13（aa86dbf）完成7组默认启用的原生适配preset、原管理UI/CPU菜单、私有CAS禁用/物化与新thread注入。E13全量2202/2202、0skip，键盘后Web712/双引擎、实际Codex0.169共15请求逐字验证、build/pack735；480px上游模式标签截短保留，不算完整窄屏视觉通过。E14（498d771）补显式native基础指令/指令文件优先，12定向及实际Codex两请求通过；E15（a91a008）逐字迁最终Kimi头像/K3/K4边界，build和双引擎主题资产预览通过。E16最终检查点2205/2205、0skip/build/pack735，全新生产安装656/656、735包文件与211Web全部精确字节、B1.2/隔离CLI通过；首轮继承bypass变量的单项失败已记录并按既定clean env重跑，未改权限逻辑。用户明确排除代理重试配置与统计，E5–E7已撤回，不再迁入。SDK无回应已补官方SDK baseUrl、独立wire归档/聊天去重与默认/custom API路径（bdf4f60/c6195b6/f11e058）；实际CLI双引擎收发/刷新及恢复通过，路径另36定向，用户实际地址/外部模型仍待。54候选继续按子项核销；用户最新选择只在新会话生效（E17 515dc6c）：保留native resume/fork指令钉扎，不迁代理层提示词热切换；E18修正CXV/OTel内部参数落在字面--之后，21定向及实际native exec红/绿验证通过，提示文本逐字保留；用户已选无GUI继续完整注入适配；E22已按用户选择接原生窗口/本轮用量，50定向/Web712/build、实际native7请求和两引擎GUI通过；SDK exec窗口缺失显示未知。E19核0.171稳定版与本机0.169，实际5请求窗口475000↔258400/覆写裁剪通过，普通90%原始窗口、可用95%、后台实验65%分开，见[B8容量调研](cc-viewer-alignment/B8-codex-context-research.md)。E20补无GUI受管指令准备模块，18定向及实际native exec7请求（覆盖/追加/profile/手动文件/fresh-resume-fork）通过，E21完整CLI接线已过25定向/实际7请求及自有探测中断清理，完整2215/2215、0skip通过；用户已选角色分源按原生能力渐进，主/子启用需证明所属线程、SDK exec不可用、隐藏Teammate；E23状态与E24后端路由已落地，58定向及实际native主2/子1请求双归属证明通过，E25 API/能力门与工作区新session模型选择已过35定向、实际CLI8请求，E26原UI/CSS块/紧凑标签已过Web715/完整2228、0skip/build和双引擎8最终图，SDK exec Sub禁用明确；E27补子代理wire模型不污染root身份，33定向通过；E28补显式SDK AppServer native endpoint，实际default provider红30秒0请求→绿main2/child1和双归属证明通过；E29补77b61控制SSE十次耗尽后30秒持续恢复/首次连接watchdog，Web716/0skip与不重放草稿通过；E30已核销54候选的B8子项（混合B9–B11单列保留），E31最终2232/2232、0skip/build/pack737，新安装685/685及全部包/Web字节、B1.2/隔离CLI通过；最终真实默认SDK双引擎4请求/idle/发送恢复/刷新/归档恢复通过。功能验收已过，整合/PR合并仍下一步，合并后更新整包完成及B9准备。未停止活动7008（外部已重启为PID38260）；exec/显式AppServer渐进与既有权限选择保持；353K旧决定已被原生动态窗口选择替代。真实模型遵循、物理设备/音频/IME、真实LAN/TLS、其他OS/最低Node未验保持。见[B8实施](cc-viewer-alignment/B8-implementation.md)、[候选矩阵](cc-viewer-alignment/B8-candidate-matrix.md)；B7/PR #8/原51笔见[B7完成矩阵](cc-viewer-alignment/B7-completion-matrix.md)。
- 普通工作区入口纠偏（2026-11-22）：B7 E12/E13已恢复普通PTY registry与原Header“＋”，经真实CLI双引擎启动/切回原会话验证；E31队列经真实原生8场20图验证。B8 E16只读复核活动7008/PID38260已具ptyMode=true/ptyQueueAvailable=true，sdkMode=false；该API核对不替代活动实例GUI验收。历史[缺口记录](cc-viewer-alignment/B2-pty-workspace-entry-gap-2026-11-21.md)与[B7实施](cc-viewer-alignment/B7-implementation.md)保留。
- 当前运行入口（2026-11-22只读核对）：全局bin/cxv软链本仓库packages/app/cli.js；7008由外部重启为PID38260，本轮只读API为普通PTY模式。代理未重启/停止该进程，也未停止ccv --sdk实例。用户报告SDK页面的准确地址仍待答复，既有运行进程须正常重启才加载本轮后端修复；不得将新dist或npm链接等同已加载新后端。历史见[入口与重启交接](cc-viewer-alignment/B6-runtime-entry-2026-11-21.md)。
- 每次完成本专项的一轮迭代后，同步更新本标记，写明已完成内容、当前工作包、下一步以及阻塞或未验证事项；同时在提交台账中记录对应上游提交、本地实现和验证结果。保持本段为最新状态，不追加过时的进度记录。
- 持续推进约定：用户要求持续推进到 B0 台账中的提交全部对齐，遇到需要产品、权限或迁移方案决策时再询问；不得将部分子项实现等同整条提交完成。
- 用户后续授权（2026-11-22，最新明确）：B7验证后整合所有本地commit，创建面向main的PR并由代理自行核差异/实际CI后合并；合并完成后再更新本地进度文档。已按此顺序完成51笔整合及PR #8，原hash映射/备份保留。B8已启动；用户2026-11-22追加授权：B8完成后整合本地commit、提main PR、自行核差异/实际CI后合并，再更新文档并准备B9（不提前执行B9）；临时Playwright隔离GUI授权保持，活动7008/PID72817不由代理停止。
- 迁移提交约定：按用户要求小步迁移，每笔只处理一个独立改动，验证通过后单独提交，再进入下一笔；保留上游 hash 与本地 commit 映射，不把混合提交整批搬入。
- 实例化验证约定：每轮实施后先在当前环境尝试；若无法跑通，记录失败原因、可复现步骤、预期结果和环境要求，交由用户验证，不阻塞可独立推进的后续工作。不得将未完成的实例化验证标为通过。
