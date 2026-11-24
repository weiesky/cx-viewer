# 基线迁移规范：以 PR 实际代码为先

**当前阶段（2026-11-19）：B2保持用户验收收口，B3已实施首轮四笔独立修复并建立初始基准，见[B3实施](./B3-implementation.md)。以下纠偏历史与未覆盖验证保留，不将部分子项等同整包完成；源码优先约束继续适用。**

## 用户明确约束（2026-11-19）

本任务是基线对齐，不是重新设计产品。用户明确指出：PR 中有代码，必须优先参考代码，不能看着规划文档自由发挥；目前的界面样式已出现明显偏离。此约束适用于当前 B2、此前已迁移内容的复核，以及后续全部工作包。

## 证据优先级与实施顺序

1. **先读目标 PR 的实际 diff、涉及的完整源码、调用方和 CSS，再写实现。** 核对修复、回退及后续提交在固定快照中的最终有效代码，不能只看 PR 标题、提交说明或历史文档。PR 原始改动和最终有效版本都要可追溯。
2. 第一轮B0–B11冻结上游快照为 `74cd752d99caf122e750216d2af3bb9f467c4de1`。2026-11-24用户明确要求调查新增更新，第二轮另冻至 `d3c1f7fbf47c0424226acbe064ab4135e7ebe3cd`，只覆盖旧快照之后的25笔，见[增量计划与边界](./upstream-delta-plan-2026-11-24.md)。新只读源码在 `/tmp/cxv-cc-viewer-delta-20261124`，旧74cd752副本`/tmp/cxv-cc-viewer-research-20261122`保持；临时目录不可用时按各自完整hash重新获取，不擅自继续追随HEAD、不把新范围混记成旧批次完成。
3. 读取本地真实数据流，优先迁移或复用上游现成组件、结构、样式和交互。文档、任务矩阵和测试只用于索引与核验，不能替代源码，也不构成新布局、新入口或新交互的设计授权。
4. Claude/Codex 的协议、会话所有权、安全与现有兼容能力确需适配时，改动限定在必要边界，并记录具体技术原因。不能以“功能等价”“更方便”“依赖更少”或“适配 Codex”为由任意改变用户可见行为、布局、视觉层级或样式。
5. 保持基线中的入口位置、单/多工作区形态、尺寸、间距、字体、颜色、边框、状态反馈、关闭与恢复交互、响应式行为。不能用另一套组件的默认外观替换基线，再把新外观当验收标准。基线已有的安全与无障碍要求必须保留；必须补足的适配采用最小改动并单列说明。
6. 基线不存在的产品/视觉扩展不纳入本次迁移。必要且无法由源码或已有用户决策确定的重大差异，先列出原代码、差异、影响及方案，再向用户澄清；不能先做一版自己的设计再要求用户接受。
7. 一次只处理一个独立改动，保留上游 hash → 本地 commit 映射。验证既包含功能，也包含与基线源码/样式的对照；测试通过、构建通过或 GUI 能操作，均不等于视觉/交互已对齐。
8. 发现已经迁移的代码偏离基线时，将该子项恢复为“待纠偏/待核验”。先追溯引入提交，逐项纠正；保留已验证的隔离、安全和数据保护能力。不得整批回退未核清的代码、掩盖历史偏差，或将未验收项标为完成。

## 每笔迁移的最小记录

| 项目 | 必须记录 |
| --- | --- |
| 上游依据 | PR、完整 commit hash、后续替代/回退关系及固定快照中的有效版本 |
| 实际代码 | 上游文件、组件/函数、CSS 选择器、相关调用链 |
| 本地改动 | 对应文件与 commit，哪些直接迁移、哪些复用、哪些是必要适配 |
| 差异理由 | 具体协议/API/身份/安全/兼容限制；没有代码或用户决策依据的设计改动不计对齐 |
| 验证结论 | 功能与视觉分别报告；基线行为、当前行为、对照方法、未验证事项 |

## B2 首批已确认偏差（d10684d审计时点）

已读取固定快照中的以下实际代码，而非仅依赖文档：

- [PR #145 / eb2e9703a2837550a9bf2a62a8bb5d20fac7f723](https://github.com/weiesky/cc-viewer/commit/eb2e9703a2837550a9bf2a62a8bb5d20fac7f723)，并核对后续在固定快照中的有效实现。
- [AppHeader.jsx](https://github.com/weiesky/cc-viewer/blob/74cd752d99caf122e750216d2af3bb9f467c4de1/apps/web/src/components/dashboard/AppHeader.jsx)：`HeaderProjectSwitcher`、`HeaderProjectTabs`、`SortableProjectTab`、`NewProjectButton` 及 Header 调用位置。
- [AppHeader.module.css](https://github.com/weiesky/cc-viewer/blob/74cd752d99caf122e750216d2af3bb9f467c4de1/apps/web/src/components/dashboard/AppHeader.module.css)：`.projectTabsStrip`、`.projectTab`、`.projectTabActive`、`.projectTabName`、`.projectTabIdx`、`.projectTabClose` 及状态圆点/圆环样式。

| 实际基线 | 本地实现及引入记录 | 处理状态 |
| --- | --- | --- |
| `HeaderProjectSwitcher` 在 2 个及以上工作区时显示标签条，否则为当前项目文字与独立加号 | `d39d3a8` 引入始终显示的 Ant Design editable-card Tabs；`b280d00` 后移入 Header，但没有恢复基线形态 | 77d4ad5已恢复，当前GUI与边界见B2-gui-acceptance.md |
| `.projectTab` 为 28px 高、12px 字号、12px 圆角的单行标签；名称与不收缩的同名序号分开，路径在 title 中 | 本地双行名称/完整路径卡片、不同尺寸和布局 | 77d4ad5已恢复上游尺寸/结构/CSS；旧卡片截图不计对齐 |
| 拖动排序，选中/hover/focus 时显示关闭控件，关闭使用 `Popconfirm` | `d4bc607`、`fb53455` 等采用常驻前后排序按钮；`f870f2d` 再增加窄屏菜单，关闭使用 `Modal.confirm` | 77d4ad5已迁入dnd-kit/Popconfirm；键盘与关闭GUI通过，指针跨项落点未验 |
| Header 内复用现有项目区及既有历史入口；最终代码注释和调用链明确历史入口已迁至快捷设置 | 本地额外常驻历史按钮、移动 Header 换行和粗指针高度覆盖 | fbd5817已恢复快捷历史/移动菜单并移除额外Header行；新版恢复GUI通过 |
| 实例隔离及同名消歧由真实身份确定 | 本地 SDK 每 cwd 常驻会话、scope、队列、缓存及进程所有权修复 | 保留并核查必要协议适配，不能因纠正视觉而误回退隔离/安全能力 |

以上仅是首批已确认问题，尚未完成整个系统的视觉审计。此前 1283/1283、构建、安装产物和 GUI 操作记录仍为真实运行性证据，**不再用作“界面已按基线对齐”的结论**。B2 的 UI 完成条件重新以基线实际代码为准；未满足前不标整包完成，不执行依赖 B2 完成的提交压缩和推送。

## B2 纠偏 1：Header 标签与拖动（2026-11-19）

上游依据为 PR #145 `eb2e9703a2837550a9bf2a62a8bb5d20fac7f723` 及固定快照 `74cd752d99caf122e750216d2af3bb9f467c4de1` 的 AppHeader/样式、resumeSessions.applySameNameIndex。迁移单工作区文字、多工作区 28px 标签、独立同名序号、PointerSensor 4px 激活、水平/父容器约束、Popconfirm 和 Header 左侧项目区位置；删除 editable-card、常驻排序箭头、窄屏额外菜单及 Header 高度覆盖。直接复用上游四个 dnd-kit 包的版本。

必要适配：API 与身份仍使用 SDK registry 的稳定 instanceKey；保留别名兼容。关闭确认加完整 cwd，关闭按钮可聚焦且 focus-within 显示；排序保留 Alt+左右键与读屏播报，不增加可见控件，不占用 Enter/Space 的切换行为。此笔仍用现有 URL scoped SDK 连接切换，后续核查上游纯视图切换；历史常驻按钮、加号弹窗和移动入口尚待下一笔，不能据此标 B2 完成。

验证：12/12 针对测试（身份、排序/持久化、当前点击无操作、关闭不激活邻标签及回退、单工作区形态）；恢复组件探针通过；前端构建通过。逐字对照固定上游 CSS：newProjectPlusBtn 区块 SHA256 `1230d50530d4ec4f37c85d0e16ce0998860cdbf32f13de185316d6ad5839389a`；projectTabsStrip 至 projectTabClose:hover 区块 `246299b334c62c45ebee4c5361ecc6af0ae785afd0a63f64a0b635035880c3e0`。GUI、触控及整包验收尚未完成。

## B2 纠偏 2：共享新工作区弹窗（2026-11-19）

读取固定快照 NewProjectModal → WorkspaceList → DirBrowser 全链路及 CSS，并核对 `7f7f78e2d8`（目录树一步启动）、`a07464187c`（弹窗底部留白）的真实 diff。按原组件迁移 1080px 弹窗、embedded 透明底与底部20px、共享表格/前5行展开、树状目录与一步启动、玻璃模态样式和文案。Header 加号不再跳到整页选择器，取消保留下方会话；本地工作区页面复用同一选择器，不另造 B2 专属卡片。

必要适配限于启动边界：Claude `-c` 替换为现有 buildWorkspaceCodexArgs 的 `resume --last`；返回的 SDK instanceKey 交 AppBase 按 scoped URL 打开，不影响其他常驻实例；Loading 使用已有 Codex 品牌 SVG；Electron 的 cxv-ws-popup 名称保留。未迁入 Claude 参数或重写本地参数解析。

验证：8/8 组件测试，包括目录选择直接 POST launch、无 add 二次确认、历史行 Codex 续接参数、弹窗取消无导航及启动后关闭；前端构建通过。尚未 GUI 验收，移动入口随后按上游 Mobile 菜单接线；纯视图切换仍待复核。

## B2 纠偏 3：历史入口与移动 Header（2026-11-19）

实际读取固定快照 ResumeSessionsRow → ResumeSessionsPopover/ResumeSessionsList → resumeSessions.mapResumeRow → AppBase.handleResumeSession，以及 QuickAutoApproveRows、两个菜单宿主、Mobile 的菜单与弹窗。注意源码旧注释声称历史在权限/Plan之间，但最终有效代码是 `isLastRow && middle`，故按真实代码接在现有审批项之后、AgentTeam之前，未按过时注释自行排版。

直接迁移共享列表结构、状态SVG、相对时间、最多5条、级联样式、HistoryIcon、确认对话框和移动菜单入口；移除 Header 常驻历史按钮及移动端额外标签行。CLI 裸 resume 复用相同列表弹窗。必要适配：SDK列表字段映射 sessionId/createdAt/file，恢复按精确 instanceKey/file 调用本地已验证的归档恢复；确认后重新核对 URL scope，缺失/异工作区拒绝，取消和迟到请求采用 AbortController。列表增 Enter/Space 可达性；Codex 不存在的 Claude PTY /resume 指令未迁入。

验证：13/13 针对测试（含按实例5条懒加载、当前项无操作、确认前无写入、确认时换scope不发送）、恢复探针及前端构建通过。自有临时HOME/fake Codex fixture `cxv-b2-workspace-gui-A50ws6`：Chrome实际打开并取消共享新工作区表格弹窗；Safari实际发送与收到A回复、快捷设置审批项→历史→AgentTeam顺序、历史列表当前项、强制mobile=1菜单与共享历史弹窗通过。截图已实际核看，关键标签/列表CSS来自固定源码。Chrome后续操作被用户活动窗口切换保护拒绝，未对真实7009实例操作；原生Safari继续成功。此次 mobile=1 仍为桌面窗口，不能记作窄屏/真机软键盘或触控通过。纯视图切换、scratch及完整验收继续。

## B2 纠偏 4：工作区页内视图切换（2026-11-19）

读取固定快照 AppBase.handleActivateChip → attachMainPty / _activateScope / writeViewedWorkspace，以及本地 main → SettingsProvider → AppBase → TerminalWsProvider、SSE/cache 与 scratch 生命周期。标签切换改用 History API + popstate，同一页面内切换精确 instance；当前项不操作，浏览器后退/前进恢复 scope。新建成功和当前实例关闭回退复用此路径，不再 location.assign。只切客户端视图，既有 SDK/native thread 与 scratch 所有权留在服务器，不发送启动/停止指令来实现切换。

必要协议适配：本地 SDK 的 HTTP/WS/SSE、配置与缓存按初始化 URL 绑定，故以 WorkspaceRoot 的 keyed SettingsProvider 复用现有整棵工作区组件的 mount/unmount 清理边界，采用 flushSync 确保旧连接先退役。没有复制 Claude 的 PTY attach/通道协议，也没有绕过已验证的连接隔离。与上游原位 _activateScope 的区别是客户端工作区子树会重新挂载，未发送草稿和临时附件不跨实例携带；服务端队列/历史/进程保留。缓存和 scratch 的旧模块级实例常量同时纠正：scratch key 固定在每个组件构造时，缓存 key 固定在每次异步操作开始时；写入代次按实例独立，旧请求过期不会清掉新实例缓存。旧 SettingsProvider 的迟到响应不能更新全局语言/配置目录，旧 AppBase 不能恢复旧作用域偏好或标题。

验证：19/19 针对测试、全量构建通过；Safari在自有fixture实际A→B切换、向B发送、浏览器返回A显示原历史；HTTP registry及fake Codex调用日志确认A/B各自cwd/native thread稳定，两条输入分别送到目标实例，未停邻会话。全量首跑因外层环境 CXV_BYPASS_PERMISSIONS=1 导致既有 perm-bridge reviewer用例得到bypass结果（未改其实现）；明确用0的受控测试正在补跑。触控/软键盘仍待，不能据此宣称真机通过。

## B2 纠偏 5：scratch 布局按源码复原（2026-11-19）

实际核对固定快照 TerminalPanel 的 scratchOnly 分支、TerminalPanel.module.css 的 scratchWrap/scratchOnlyPanel/scratchOnlyPhone/scratchPanes、ScratchTerminal.sendVirtualKey、mobileTermLayout 与 mobileTouchScroll。恢复上游父级 scratchOnlyPanel/scratchOnlyPhone、面板 flex/min-height、手机44px横向标签与 sticky 加号；移除先前将 phone modifier 放在 scratchWrap 自身的替代结构。scratchWrap 至 scratchPanes 区块逐字与上游一致，SHA256 `c9c7c33932a12150bf9f453eb2610fd514dfae82cdc833594b7d835cd72b4dd0`。保留已验证的实例身份、键盘可达性，以及固定列观察器/触控回调的清理守卫；数学公式、60列、5–100行、惯性阈值与上游对照，未另改外观。

验证：纠偏4受控全量1292/1292（5+206+877+204）、0 skip；本笔纯布局后Web206/206与构建通过。Chrome320×828截图确认Header/输入区无旧双行卡片；最终scratch点击未取得可验证结果，随后用户窗口变化保护拒绝，Safari也已切到真实站点，未继续操作真实页面；IAB host不可用。最终scratch布局及真机仍待，按新版 B2-gui-acceptance.md 留可复现步骤，不用旧截图/组件探针充当通过。

## B2 纠偏 6：上游文案的必要 Codex/模板适配（2026-11-19）

复核新迁入的原始 i18n 数据与本地 t()，发现固定上游使用双花括号、本地使用单花括号；将本轮新词条占位符转换为本地既有格式，避免恢复确认残留花括号及“查看更多”计数不替换，不改写整个翻译引擎。新增恢复确认断言验证真实名称插值。

工作区帮助保留上游结构及内容，品牌改为 Codex/CX Viewer；删除“所有读写限定在该目录”“只能看到该目录”的权限保证。实际 SDK 启动继承 Codex sandbox/审批策略，cwd 本身不是权限边界，不能机械复制 Claude 文案冒充隔离保证。18种语言同步移除这两段不成立的描述，未添加新布局或安全设置入口。13/13组件测试及构建通过；恢复确认、历史及目录scope的既有验证继续有效。

纠偏5产物补证：全新生产安装685文件、202 Web资源与打包源码字节一致，安装后66/66运行测试、B1.2回归及隔离CLI相对cd启动通过（fake Codex，无外部模型网络）。本笔文案重建后产物需做最后字节复核；B2剩余GUI/真机仍按验收清单，未压缩或推送。

## B2 纠偏 7：队列条回归输入框上方（2026-11-19）

继续审计固定快照 ChatView 的 queuedMessages/optimisticQueueMessages 两条真实展示路径、inputStack位置与queueBubble CSS，核对 `1aca9b5f8f`/`1e0edc00f3`。发现本地将所有队列项映射为 ChatMessage + Ant Button/labelSuffix，与上游“待发队列条在composer上方、已派发乐观消息才进聊天区”的结构不符，已纠正。排队条直接迁移原DOM、移除×/立即发送按钮、两行截断和高度上限；沿用输入卡片配色，派发项使用主色边框，并非额外设计蓝色卡片。

保留服务器权威的SDK按ID回执/移除/立即发送/暂停语义，暂停状态由现有语义标签说明；有派发握手在途时SDK不接受另一立即发送，因此保留对应禁用守卫，不复制Claude队列wire协议。未改变已派发消息的持久回执与乐观去重。队列文本直接渲染为原文，避免紧凑摘要/UltraPlan ChatMessage解析隐藏操作。

验证：12/12真实队列/连接回调测试、Web206/206和构建通过；覆盖相同文本不同ID、派发期间禁用、SDK模式晚发现、重连和拒绝恢复、原文摘要不吞操作。队列CSS块逐字匹配固定源码，SHA256 `b5bc230cafea7a3aa9f8e8b1372ef6e364bb0e8808e7667fb3a589cb23bf474f`。此版实际GUI与最终scratch仍等待稳定隔离窗口，不引用旧布局GUI作为通过。

## B2 纠偏 8：其他客户端关闭当前实例后的视图修复（2026-11-19）

读取固定上游 AppBase.handleLiveProjectsChange 的 dead-view recovery 与 handleCloseProject 回退分支，并核对本地 /api/workspaces 在旧URL实例关闭后仍能返回存活列表。补齐Header轮询的视图修复：只有本客户端已见过并确认存活的精确实例后来消失，才按原逻辑切到存活实例或选择器；从一开始就未知的实例URL不会静默退到另一个项目，历史只读URL也不被轮询改写。修复只用History API，未发送spawn/stop命令或将同名视为同实例。

14/14组件测试与构建通过；覆盖已知实例消失后的精确回退、全关回选择器、未知初始URL不fallback以及过程中无写请求。双浏览器最终关闭GUI尚待，不将回调fixture当GUI通过。

## B2 纠偏 9：角色筛选不隐藏队列操作（2026-11-19）

对照上游 inputStack 队列条不属于聊天消息筛选的实际结构，移除沿用旧 pendingBubble 的 user role 筛选条件；只按SDK模式显示服务端队列。新增实际ChatView.render断言：只显示assistant时队列仍可操作，native/只读视图不显示SDK队列。13/13连接/队列测试通过，未改wire协议。

## 本轮源码映射

| 本地 | 固定基线代码依据 |
| --- | --- |
| `77d4ad5` | PR #145/eb2e9703a2，AppHeader胶囊、dnd-kit、CSS及同名编号 |
| `7d17f24` | eb2e9703a2、7f7f78e2d8、a07464187c，NewProjectModal/WorkspaceList/DirBrowser |
| `fbd5817` | eb2e9703a2、649f853e5e后续有效代码，ResumeSessionsRow/List、审批菜单middle和Mobile |
| `e05109d` | eb2e9703a2、a84385b5a8，handleActivateChip及SDK必要scope重挂载 |
| `35e8d30` | 99256ac1d8、a3cc12619f、2ea5181df8，scratchOnly父结构与手机rail |
| `43ed855` | 上述源词条，本地t模板与Codex cwd/权限事实适配 |
| `82e25e7` | 1aca9b5f8f、1e0edc00f3，composer上方原生队列条 |
| `11b0885` | eb2e9703a2、a84385b5a8最终handleLiveProjectsChange，已知死实例视图修复 |
| `d53f4ea` | 1aca9b5f8f、1e0edc00f3，inputStack队列条独立于消息角色筛选 |
| `765aafd` | 上述queueHint原词条的Codex品牌适配 |
| `3cbd71e` | eb2e9703a2、a84385b5a8最终close/rebound链路，SDK停止事件先修复URL |

映射只覆盖本地已实施的独立子项；大型混合提交的B3/B4/B7/B8等部分不据此整体记完成。

## 最终文案核对与验证检查点（2026-11-19）

实际400px队列GUI暴露原样迁移的queueHint仍写Claude；仅将该词条18种语言的品牌替换为Codex，保持原结构/占位符/样式。Web208/208与构建通过。此前最终受控全量1294/1294（5+208+877+204）、0 skip；生产新安装685文件、202Web字节一致、66/66、B1.2及隔离CLI通过，目录cxv-b2-runtime-ozq0l1vz。此微小文案重建后将重新检查最终tarball资产字节。最新GUI与未通过项见B2-gui-acceptance.md；仍未声明B2整包完成。

## B2 纠偏 10：停止事件先于Header卸载的回退（2026-11-19）

真实双浏览器复现：Safari关闭A后，Chrome先消费SDK的workspace_stopped，沿用旧PTY分支清空状态并卸载Header；后者轮询的seenInstance随卸载丢失，页面留在选择器且URL仍指向已关闭A。11b0885单独组件轮询测试没有覆盖这条真实事件顺序，不能当成完整修复。

重新读取固定上游AppBase.handleCloseProject及workspace_started的reboundAffectsView链路：关闭端与其他客户端应共享服务器的存活实例选择。复用本地closeSdkSession现有reattachedTo，将它随精确scope的停止SSE/WS发送；AppBase在旧通用停止清理前先走SDK关闭处理，更新History API URL并复用现有卸载边界。不同实例、只读历史和已卸载回调不导航，最后实例回workspaces=1；不新增轮询或UI。Header轮询仍保留作为丢失事件时的已知实例修复。

验证：真实HTTP/SSE/WS7/7、实际AppBase/Header15/15；最终全量1295/1295（5+209+877+204）、0 skip与构建通过。新fixture cxv-b2-workspace-gui-HlIXQ8：Safari关闭A后Safari/Chrome URL均切到B、显示单项目形态；从共享表格重新启动A；移动共享历史列表选择旧项，确认正确插值后恢复，续发成功并回idle。calls.jsonl仅2条，续发argv携带原gui-native-A-821b691f-1b31-44df-aca5-3305a7ef3122，无重复首条。685文件全新生产安装、202Web精确字节、66/66运行时、B1.2及隔离相对--cd启动通过，结果cxv-b2-runtime-4qwtjnw0/result.json。日志/tmp/cxv-b2-close-event-{web,server,full,build,installed}.log。未使用外部模型网络。

## iOS模拟器追加验证（2026-11-19）

发现已安装Xcode/iOS18.6后创建隔离iPhone16e，用原生CUA启动Safari访问自有fixture B。实际软键输入pwd/stty size、网页触控Enter/Up通过，Enter不收起键盘；展开20×60、收起37×60；新scratch空shell、切回旧shell保留输出。仅补充验收证据，无代码变更；不重复运行已通过全量。CUA拖动/scroll未产生可确认位移，原因未定；最终指针跨项落点与物理多指惯性仍未通过。详见B2-gui-acceptance.md，不把模拟器等同真机。

拖动对照：同一CUA drag在隔离iOS原生主屏幕也无法翻页（仍第1/2页，光标停起点），故不能提供可靠的连续拖动/多指验收。保留基线实现，等待人工/可用设备补验，不再为工具另造交互。模拟器已退出并清理自有设备，原自动启动的既有设备恢复Shutdown。


## B4 角色筛选条纠偏完成（2026-11-20）

E10读取975313773a最终卡片接线时，确认本地RoleFilterBar.module.css仍为旧flex内联行（41px、solid背景），而固定d906edb3de以后为玻璃浮层，并由ChatView.withRoleFilter给滚动区补41px。E10仅迁原ActiveAgentsBar及互斥，不把该差异当视觉通过。E11已读取d906实际diff/完整组件/CSS与后续975313773a接线，并恢复浮层/玻璃/41px补偿；CSS仅保留既有Codex单色avatar规则，267/267、构建与Safari筛选/滚动/代理卡互斥通过。该待纠偏项已修正，对应Skills scope等混合内容仍未整体完成。


## B4 E17/E18：最终入库后实时回复残留已纠偏（2026-11-20）

隔离Safari exec fixture cxv-b4-tasks-gui-ZX7AIz 长静默139s后释放并自动续发队列，Stop已回发送且manager idle；第二轮持久回复之外仍有一份实时回复和cursor，两次AX检查确认。已有loading复用通过不代表此UI通过。记录见B4.20与B4-turn-loading-reuse-2026-11-20.json；下一笔先追踪真实stream-progress→rAF/startTransition与V2 final入口，不先重设计或删除历史。

E18完成：先分别复现rAF/transition延迟和V2冷基线两条路径，再在state提交时按精确final判据清理。初次rAF-only全测过而GUI失败，未接受；最终1465/1465/构建及新Safari首次建档+自动队列两条各一次、无残留cursor通过。原始失败与最终证据见B4.21；不扩大为B4整体完成。
