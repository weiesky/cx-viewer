# cc-viewer 第二轮增量对齐计划（2026-11-24）

11月24日调查已完成，用户随后明确启动B12；**B12现已完成本地实现与隔离验收，下一包B13**，见[完成矩阵](./B12-completion-matrix.md)和[回执](./B12-validation-2026-11-24.json)。按用户“最后一轮对齐之后”的要求，以旧上游固定快照为下界，不能用本地B11完成日期筛掉11月17日至22日的新增改动。旧B0–B11的已交付、必要适配与未验收事项保留。

## 固定范围与调查结论

| 项目 | 本轮证据 |
| --- | --- |
| 旧快照 | `74cd752d99caf122e750216d2af3bb9f467c4de1`，1.9.29，2026-11-16 23:21:08 +08:00 |
| 新快照 | `d3c1f7fbf47c0424226acbe064ab4135e7ebe3cd`，源码包版本1.9.35，HEAD为11月23日star-history图表更新 |
| 最新行为链 | `09807265`于11月22日修复同cwd冷挂载WS串流，PR #179合并`f0c23018`；发布提交`16bf86e2` |
| 范围算法 | `git merge-base --is-ancestor OLD NEW`通过；`git rev-list OLD..NEW`固定可达集合差，不用作者时间筛选 |
| 总量 | 25笔：17笔含功能/修复、5笔纯发布、1笔changeset、1笔merge、1笔图表；净变更123文件、+8819/-585 |
| 本地调查起点 | `4cb1a4c`，分支`feature/sdk-model-switch-2026-11-24`；包含模型切换`8227874`、上下文回跳`e9f0017`、套餐用量`b61814f` |
| 上游只读研究副本 | 新快照`/tmp/cxv-cc-viewer-delta-20261124`；旧快照副本仍停在74cd752，不切换用户工作树 |
| PR核对 | #177、#178以squash进入main，#179为merge；唯一open PR #128更新于9月15日且未合并，不计入本轮 |

直接来源：[固定比较范围](https://github.com/weiesky/cc-viewer/compare/74cd752d99caf122e750216d2af3bb9f467c4de1...d3c1f7fbf47c0424226acbe064ab4135e7ebe3cd)、[PR #177](https://github.com/weiesky/cc-viewer/pull/177)、[PR #178](https://github.com/weiesky/cc-viewer/pull/178)、[PR #179](https://github.com/weiesky/cc-viewer/pull/179)。逐笔处置见[25笔增量台账](./upstream-delta-ledger-2026-11-24.md)，完整hash、双时间、消息、父提交、逐文件候选与PR正文见[机器索引](./upstream-delta-2026-11-24.json)。

本轮已读取行为提交diff、关键最终源码和本地链路：更新下载/重启、复制按钮、memory scope、定时导航及其调用、审批默认值、文件浏览器导航工具/API、原生代理快照、Git分支、workspaceLaunch/菜单和同cwd实例改动。**这是范围调查，不替代每笔实施前对完整组件、CSS、调用链、测试及后续修复的再次定位与阅读。** 调查阶段无产品测试结论；后续B12已完成2862全量、build、真实生产安装及CLI更新链路验证。其余包与浏览器/活动GUI仍未据此核销。

## 执行边界

- 本轮用户已要求调查最新上游，新增范围另冻至d3c1f7f；旧B0–B11仍按74cd752核销，不追写成旧批次已覆盖新代码。
- 继续遵守[源码优先迁移规范](./migration-code-first.md)：原入口、DOM、布局、CSS和交互优先；Codex协议/权限/身份适配逐处说明。测试通过与视觉对齐分别记账。
- 每笔一个独立改动，验证后单独提交，并补上游hash→本地commit映射；同一混合上游提交可拆到多包，完成一部分不核销整条。
- 普通实现只记`cx-viewer` patch changeset；不自动运行version、不套用上游1.9.x版本号。当前单npm包、core/content私有包和边界门保持。
- 活动实例的运行状态沿最近回执，未在本轮重新探测；不停止/重启用户7008或其他用户实例。产物/全局软链更新不等于后端已加载。隔离实例验收不能替代活动GUI。

## 工作包与顺序

建议次序：**B12 → B13 → B18 → B14 → B15 → B16 → B17 → B19已授权部分 → B20**。B13/B18虽依赖较少，实施仍逐笔推进。D1/D2不阻塞其他独立子项，未决部分单列，不能宣布全部对齐。

| 包 | 上游依据 | 本轮要对齐的结果 | 当前状态 |
| --- | --- | --- | --- |
| B12 更新下载与重启 | `06be1ce6`、`03aad20b`（#178） | release tarball允许重定向并保持摘要验证；仅自更新重启交接当前访问token，页面恢复连接 | 已实施9943faf/f014bf9并通过隔离验收 |
| B13 原界面细节与复制 | `f8d06c72`、`2476d7b5`、`72f0393c`、`db741d5e`；`a87b61f5`/`73b9a1d1`的UI子项 | 输入区按钮顺序/22px头像、Markdown复制、暗色菜单对比度、快捷图标/透明代理chip/移动专家编辑器 | 待分笔迁移 |
| B14 记忆目录浏览 | `bdf4257f`、`495931df` | 原记忆文件夹图标打开应用内浏览器，根目录锚定记忆目录 | 需Codex目录与访问策略适配 |
| B15 定时任务导航 | `a87b61f5`、`73b9a1d1` | 左侧原时钟入口、待执行列表/倒计时、点击定位任务，保留草稿与SSE更新 | UI待迁；默认值D1单列 |
| B16 文件浏览器增强 | `2c322981`（#177） | 前进/后退、地址栏、网格/列表、目录偏好、名称/大小/时间排序和名称过滤 | 待分层迁移，依赖B14范围约定 |
| B17 活跃代理刷新恢复 | `cb7d59e1` | 刷新后恢复本会话活跃代理，首轮水合不误清；原箭头尺寸同步 | 原生重连能力部分已有，先实例化查缺 |
| B18 Git当前分支 | `8dddb8a1` | 单仓库顶部信息行、多仓库标题chip、detached/未知区别及长分支省略 | branch数据已具备，显示与三态待迁 |
| B19 路径菜单与工作区入口 | `b8d5924b`、`4a5ea59b`、`6f904397`、`09807265`（#179） | 类型化复制路径、文件夹新建工作区、Electron IPC；同cwd并列会话/写侧与冷挂载隔离 | 可拆普通入口；同cwd部分受D2约束 |
| B20 元数据、打包与验收 | 5笔release、`e7313de7`、`f0c23018`、`d3c1f7fb`及行为提交内元数据 | 完整台账、依赖/许可/边界/实际tarball与目标环境回执 | 元数据已登记，最终验收待各功能实施 |

### B12：先修可独立复现的更新问题

1. 下载：本地`packages/app/lib/update-job.js:downloadRelease`改前为`redirect:'error'`；E1已提交9943faf并通过真实重定向验证。复用原fetch改动，保留URL校验、超时、进度、摘要验证、失败清理与原安装保护。隔离HTTP fixture验证30x到真实tarball、错误摘要/重定向失败；不执行真实更新。
2. 重启：读完整`launchRestart → restart-helper → restartFromHelper → cli → server ACCESS_TOKEN`。改前本地`getAccessToken`已存在，但cli未传入、服务端每次随机；E2已提交f014bf9。采用上游严格32位小写hex、0600交接文件、helper读入即删、错误脱敏、子进程env读即删；仅内部交接使用CXV命名。保留TLS密码门与手动启动token轮换，不转交OTEL token或其他凭据。
3. 验收：真实隔离helper启动/安装失败恢复、旧页面token恢复、非法token回退随机、env不进入后续Codex/shell、文件权限与清理、日志无token。对应现有`update-job.test.js`、`restart-helper.test.js`、`update-routes.test.js`及最小必要集成用例。

### B13：按原组件逐笔迁移

拆成输入区顺序/头像、复制按钮及文档调用、暗色Dropdown、快捷图标、ProxyChip、移动编辑器与embedded输入框等独立改动。复制按钮必须采用`72f0393c`最终版本：复用现有`terminalClipboard.copyTextToClipboard`，含LAN HTTP回退、键盘和反馈计时器清理，接入ConceptHelp与参数文档弹窗。沿用上游CSS，保留本地Codex模型/推理强度选择器与现有phone/Electron可见性适配。18语言只按实际词条迁入；审批文案不能暗示本地已有未支持能力。

验收覆盖桌面/phone/pad、明暗、键盘、HTTP剪贴板、快速复制/卸载及与原布局截图对照；纯外观低风险项不新增镜像实现的测试。

### B14：复用Codex真实记忆边界

上游链路为`CachePopoverContent/LiveTagPopover/AppHeader/Mobile → FileBrowserModal(kind:memory) → target-scope → memoryDirFor(cwd)`，后续`495931df`修复根锚定/首次创建。**Codex本地目录为`getCodexMemoryDir() = CODEX_HOME/memories`，不是Claude的每项目encoded-cwd目录。** 本地`codex-memory.js`还明确排除`raw_memories.md`、限制根文件与可导航子树；不得因为引入通用目录浏览器而放开这些限制或整个Codex配置目录。

先列只读浏览/已有编辑权限与上游语义差异，再接原图标与原浏览器；不复制Claude目录编码器。验证空目录、已有目录、非法目标、symlink、越界、敏感文件隐藏、不同工作区身份、桌面及Mobile入口。若上游通用写入需要扩大本地既有记忆权限，该部分另列决策，不随浏览能力自动开启。

### B15：定时导航与审批策略分开

迁最终`ScheduleNavButton`、原CSS、`scheduleNav`及`ChatView`接线，复用本地`scheduledTaskEvents`和既有API。随后迁`ScheduleTaskModal.initialTaskId`一次定位、滚动及SSE不覆盖脏草稿的守卫。保留上游pending过滤、server clock offset、倒计时和过期reload节流。

本地API已经按精确实例工作；组件异步响应、订阅与卸载守卫同时核`project + instance`，不能只按项目名过滤。验证无任务不显示、创建/删除SSE更新、服务器时钟偏差、过期任务、定位目标、编辑草稿、切实例迟到响应。**权限、Plan、Ask默认值不随这个UI包改变**，见D1。

### B16：先API边界，再原浏览器

1. 从#177实际diff迁后端`size/mtimeMs`、共享排序与向后兼容默认排序，分别落到本地`server.js`项目列表及`lib/target-files.js`目标列表；无需上游route文件重构。
2. 地址栏绝对路径解析复用本地`/api/resolve-path`和`target-files-fs.js`，沿上游admin+same-origin、长度/控制字符、realpath.native与containment，叠加本地credential/file-access-policy；不可成为文件存在性探针。
3. 迁原`fileBrowserHistory`、`fileBrowserPrefs`、`fileBrowserFilter`与完整FileBrowserModal/CSS/调用。偏好是**每tab sessionStorage**，不是跨tab全局偏好；目录cache按排序隔离、历史随rename/delete重映射，切scope退役旧请求。
4. 验收项目/AGENTS/skill/记忆目标、前后退快捷键、地址文件定位与错误提示、排序空值/目录置顶、过滤Unicode、损坏storage、导航中rename/delete、切实例与快速连按。保留本地预览、下载、上传、拖动、敏感路径策略。桌面/窄屏/明暗截图按原CSS核对。

### B17：先复用已有恢复链路

本地已有`lib/sdk-appserver-agents.js → sdk-manager.getSdkAgentState → server.js WS连接首帧 → TerminalWsContext.lastAgentState → ChatView`；`sdk-workspace-connections.test.js`含重连代理快照一致、异实例不收、完成后为空。**这些是已读的源码与既有测试定义，本轮没有重新运行。**

先用隔离原生AppServer代理场景验证浏览器整页刷新、首帧早于sdkMode水合、切实例、恢复历史、结束/关闭和不可用状态；不存在缺口的子项附证据记“已具备”，不引入第二套taskStore。若仍有真实刷新空窗，再按原生thread/instance/代次做最小有界恢复，不能把缓存的旧active状态覆盖权威完成/不可用快照；上游保留空快照seed的Claude语义不直接套用。CSS的chevron 14px/phone18px/pad14px另笔迁移。未启用AppServer时不能编造原生子agent事实。

### B18：复用已有Git数据

本地`gitApi.fetchAllRepos`已从`git-log-unpushed`取得branch，仍用`branch || null`合并了未知与明确detached。迁上游undefined/null区别和原BranchChip/BranchRow、repoName最小宽度、18语言。单仓库放顶部、多仓库放各repoHeader，保持原只读样式，不增加切分支动作。

验收正常/长分支、detached/空仓库、旧服务器无字段、接口失败、单/多仓库、干净仓库与无upstream；保留本地在首次await前冻结所有实例URL的隔离修复。

### B19：按真实混合diff拆分，处理D2前不动同cwd语义

`b8d5924b`不只是标题中的复制文案，还含`workspaceLaunch`、WorkspaceList/ChatView/App/Mobile回调和Electron IPC基础。先迁移去掉copyRelativePath与按文件/文件夹区分文案，再抽取现有启动链路供侧栏/弹窗入口复用，Codex续接仍用`buildWorkspaceCodexArgs`/原生resume，不发送Claude `-c`。

普通其他目录的启动/复用入口可以独立核验；当前根的forceNew、同cwd双PTY/SDK、空视图导航、writer/session ownership、resume 409与并发占位、关闭邻会话等必须作为依赖链审查。上游`6f904397`将SDK registry从cwd改为instanceKey，直接冲突本地“每cwd一个常驻SDK会话”；**不在只迁菜单时顺手开启**。D2未决时保留该子项待决策，不把整个混合commit标完成。

若后续选择同目录多会话，至少覆盖：两客户端/同目录两实例的send/Stop/队列/审批/上下文/模型/额度/调度、resume归属与并发、关闭只退役目标、WS首帧以及SSE冷加载/归档历史隔离。PR #179正文明确只修WS控制帧，SSE cold-load/history是后续项；不能把这笔上游修复当作全通道已解决。

### B20：最后核销与实际产物验收

5笔release、1笔changeset、1笔merge、1笔图表在台账独立登记；`03aad20b`内的1.9.33也登记。`f0c23018`自动merge tree已与实际树核对一致，只引入`09807265`，不重复迁移。图表非运行时功能；上游发布版本不写进本地版本。

各功能子项完成后：更新映射/状态/AGENTS/主入口，执行适当定向测试、`pnpm run verify:boundaries`、`pnpm run verify:tarball-drift`；最终统一`pnpm run release:check`并验证真实tarball新安装、dist精确字节和独立启动。新增源码/文件/依赖必须同步实际打包与边界清单，不以dry-run代替实际产物。

GUI覆盖按相关批次桌面/phone/pad、明暗、至少可用目标浏览器；活动GUI须在用户正常重启后单独验收。旧Windows完整运行、Electron GUI/签名/公证、真实外网/IM、物理触控等继续列未验，不由本轮文档或API读取核销。

## 两项与既有决策冲突的内容

| 编号 | 上游新增行为 | 既有本地决定与本计划处置 |
| --- | --- | --- |
| D1 审批默认值 | 权限默认免审批(-1)、Plan默认60秒、Ask默认5分钟；Ask选项改0/1/5/10/关闭 | 本地使用Codex原生reviewer，Plan默认关、Ask托管默认关。保持既有决定；可独立评估1/5分钟显式选项和文案，旧20/30分钟持久值不能静默丢弃。没有新选择前不切默认值、不放宽沙箱/TLS门。 |
| D2 同cwd多会话 | 当前根forceNew产生兄弟会话，registry按instanceKey；两实例独立写日志和恢复 | 用户此前明确每目录一个常驻SDK会话。登记为待产品/迁移决策；先推进独立子项。若保留单会话，逐条记录不适用范围和隔离复核；若采用并列会话，先补全身份/所有权/恢复方案再迁入口。 |

上述是待决策范围，不是新增授权；本轮调查没有改变策略、启动会话、迁移凭据、更新用户配置或重启活动进程。

## 本轮检查与下一步

已验证：上游远端HEAD与fetch结果、基线祖先关系、25笔集合/分类/123文件统计、PR合并关系及merge tree。文档检查已通过：25条唯一commit与Git集合一致、台账25行、分类/统计一致、1777处本地文档链接可解析，`git diff --check`通过；机器索引记录回执。调查检查点见5496ad5；B12后续已有两笔实现提交、2862/2862全量、build与生产安装/真实更新链路回执，未推送/发布。

B12已完成本地对齐及隔离验收，下一步按B13开始逐笔实施；每笔先完成源码阅读、隔离复现、必要适配、功能/视觉验证和单独提交，再回填台账。D1/D2保持明确待决策，不阻塞独立工作。
