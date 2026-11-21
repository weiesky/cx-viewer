# B7 输入体验、导航和 Skills 实施

固定上游`74cd752d99caf122e750216d2af3bb9f467c4de1`，本地起点main `8968935417f4f26a79f84f5be3daad1234eba6d9`，分支`codex/b7-input-navigation-skills`。用户本次明确“开始执行B7”，取代上一轮暂不启动的边界。本轮按独立改动逐笔验证/提交，未授权以B6交付流程自动推送B7或合并main。

21条主索引与72条交叉索引去重为74候选，见[初始索引](./B7-candidate-index-2026-11-21.json)。这是定位清单，不是已实现清单；逐笔核真实diff/完整相关调用链/CSS、后续修复/回退，复用已完成范围，混合提交不整体勾选。B7正在实施，尚未完成。

<a id="e1"></a>
## E1 普通PTY的独立生命周期

- 上游依据：PR #145 `eb2e9703a2837550a9bf2a62a8bb5d20fac7f723`实际`packages/app/server/pty-manager.js` diff，固定最终per-instance记录、spawn/ensure/close/resolve及workspace launch链；原HeaderProjectSwitcher/NewProjectButton、共享弹窗/启动调用及普通PTY缺口记录已核。最终上游将单例字段改为每实例记录，普通工作区启动不能杀旧会话；本地原spawnCodexUnlocked却会kill旧PTY，故不能仅解除Header的sdkMode门槛。
- 最小必要适配：复用本地B3已验TerminalScreenModel/current-screen-cut、64KiB实时帧、resume gate、spawn代次与相关sequential ACK，将原生命周期封装为createPtySession；原模块导出仍指向默认实例，现有CLI/WS/IM接口保持。18个函数体及辅助逻辑除export/缩进/实例返回对象外逐字一致，见[机械封装校验](./B7-E1-pty-body-2026-11-21.json)。不移植Claude专用参数/头部、旧scrollback或另一套屏幕模型，无UI/CSS变化。
- 验证：32/32、0skip（原PTY/helper安装/真实HTTP-WS/SDK连接及新增隔离3例），构建通过；两真实本机shell PTY各自cwd、同时读写、A关闭后B继续输入通过。fake还覆盖屏幕/监听/geometry隔离、取消A在途spawn不使B失效、A取消写队列而B照常完成。命令`env -u CXV_BYPASS_PERMISSIONS CXV_TEST=1 node --test ...`，日志`/tmp/cxv-b7-e1-regression-final.log`、`/tmp/cxv-b7-e1-build.log`。
- 保留一次测试环境纠正：最初直接node运行未设包标准CXV_TEST=1，SDK用例断言跑完但写入worker相关清理进程未退出；在未修改的8968935隔离工作树也复现70s不退出，不能归因于本笔封装，也不声称已修异步写入清理。按package test环境重跑32项正常退出。活动7008仍普通CLI/PTY，未停止它；测试均自有HOME/假模型或本机shell，不调用真实模型。
- 本笔只是生命周期基础，“＋”入口/多工作区launch/路由尚未修复，普通模式待纠偏状态保持；下一笔接精确实例身份和独立启动协调，再接完整Codex bridge及视图链。本地commit为本节所在独立提交。

<a id="e2"></a>
## E2 普通TUI的独立AppServer bridge

- E1本地`f03e84d`。沿E1实际普通CLI启动→startProxy→startAppServerBridge→TUI --remote完整启动/双向帧/清理链继续核查，发现本地bridge也持有单例native child、proxy/upstream socket、thread/turn/RPC/raw、监听与reviewer字段。上游PR #145的多PTY身份/保留原会话不能通过共用一个Codex bridge实现，故这是有具体代码依据的native最小适配，不搬Claude头部协议或改transport。
- 将原bridge状态与15导出函数封装为createAppServerBridge；原模块导出保留默认实例，现有CLI、App logger和测试入口保持。原函数体/辅助逻辑机械去export和缩进后逐字相同；额外以已安装Babel parser核对E1的85处及E2的590处字符串/template/regex AST字面值均不变，避免缩进误改多行字符串，见[封装校验](./B7-E2-bridge-body-2026-11-21.json)。
- 55/55、0skip（原bridge/coordinator+新增3例）及构建通过。实际两个本机HTTP/WebSocket代理及fake native子进程同时启动，native cwd/thread不同，RPC编号相同，停止A后B仍ready且响应ping；parser断言thread/turn/RPC/会话文本/loop/reviewer互不改写，raw sidecar按各自目录隔离。所有测试临时目录，不启动真实模型。
- 日志`/tmp/cxv-b7-e2-tests.log`、`/tmp/cxv-b7-e2-build.log`。本笔不接“＋”入口、实例路由或运行时配置，整体仍待纠偏；下一笔注册/启动协调将组合E1/E2已有实现。源码未设计新UI/CSS；本地commit为本节所在独立提交。

<a id="e3"></a>
## E3 普通PTY的精确实例注册与启动协调

- E2本地`eefaa81`。实际核对PR #145原多PTY map/随机instanceKey、ensurePtyForCwd同cwd在途互斥、killPtyFor/killAllMain及固定最终完整ensure/关闭分支；本地SDK registry可作身份/默认scope边界参考，但不复用SDK协议或把普通TUI改成SDK。
- 新增内部createPtyWorkspaceRegistry，组合E1的PTY实例和后续E2 runtime。随机18字节身份不从cwd推导；同名目录只能用精确instance选择，未知/空/对象/名字一律拒绝，不隐式回退；无参读绑定boot实例而不跟随另一个浏览器启动操作。显式关闭才可终止对应PTY，关闭boot后不偷偷读其他目录。
- 同cwd并发launch只执行一次并复用存活实例；失败只清自己，取消在途launch通过AbortSignal通知owner，晚到runtime再次清理且不复活；清理失败保留记录供相同key重试。launcher未配置/非法path或args不创建幽灵条目。API/GUI尚未接入，本笔不改变活动实例或权限策略。
- 9/9、0skip（新增registry6例及E1隔离3例）和Node语法检查通过；无前端调用/资源变化，不重复构建。日志`/tmp/cxv-b7-e3-tests.log`。下一笔组合独立proxy/bridge/runtime并接服务端精确路由。当前上游合并启动argv可能继承boot绕过审批参数，已通过选项工具向用户明确提出弹窗权限优先/严格上游继承两方案；该依赖决策未回复前不实施相应权限继承逻辑，独立工作继续。
- 本地commit为本节所在独立提交，普通模式“＋”及完整新工作区行为仍未修复，不计完成。

<a id="e4"></a>
## E4 native bridge 在途启动取消与失败清理

- E3本地`6c0f180`。组合普通PTY新工作区前继续追完整startAppServerBridge→找端口→spawn→readyz→WS listen→stop链，发现原函数未消费AbortSignal，且spawn error未接入启动失败路径。取消新工作区会让native child继续启动，E3晚到清理无法及时阻止这个阶段。
- 新回归先在E2原实现实跑失败：native就绪延迟1000ms，PID已创建时取消，原start仍成功返回，`assert.rejects`确实失败；finally按返回runtime停止自有child，无真实模型。日志`/tmp/cxv-b7-e4-before.log`。
- 原启动函数增加可选signal，就绪fetch/循环检查归属AbortSignal；就绪前native error/exit中止启动；整个启动异常统一走同一stop清理。stop同时退役所属WS clients/server与native child，移除abort监听；已启动正常路径与原入口保留。不新增UI、不改变transport/权限规则。此为本地Codex bridge的生命周期必要适配，关联PR #145保留其他工作区存活语义，不声称上游Claude模块含相同patch。
- 最终64/64、0skip（bridge/日志coordinator/registry），build通过；新增取消后实际native PID回收、预先abort不启动、ENOENT由启动Promise拒绝而非未处理child error。双proxy停A保留B回归保持。日志`/tmp/cxv-b7-e4-final-tests.log`、`/tmp/cxv-b7-e4-build.log`。本次fake native响应正常SIGTERM；忽略终止/完整子树回收及最终runtime组合仍需后续验收，不以该病例冒称全场景通过。
- 尚未接新建入口/完整路由，权限继承选项仍待用户回复；独立实施继续。本地commit为本节所在独立提交。

<a id="e5"></a>
## E5 PTY的每工作区环境与fallback保留

- E4本地`fb757ee`。继续核原CLI spawn→PTY env→resume失败fallback→shell fallback链：E1虽已隔离进程/屏幕状态，原spawn仍只复制全局process.env，后续独立workspace无法持有自己的proxy/editor/cwd/原生启动环境。
- spawnCodexRequest增加仅内部调用的env对象，默认仍process.env；先校验对象再变更代次或替换存活进程。每PTY保存其可信环境副本，resume fresh fallback沿用，shell fallback沿用viewer EDITOR注入前的环境并保留原端口清理。不会修改调用方env或process.env；HTTP启动body不开放env/可执行文件控制。
- 25/25、0skip（PTY/registry/真实HTTP-WS）及Node检查通过，含新增A/B环境隔离、resume失败继续A环境、shell不携带A viewer-only EDITOR、非法env不能杀B。原双真实shell回归保持；日志`/tmp/cxv-b7-e5-tests.log`。没有前端变化，不重复构建；完整runtime/GUI还未接入。
- 本笔只传递显式内部环境，不决定新工作区继承哪些boot argv或权限；该用户选项保持待决，独立工作继续。本地commit为本节所在独立提交。

<a id="e6"></a>
## E6 用户选定：新工作区权限以弹窗为准

- E5本地`35b6dce`。用户已通过选项工具明确选择“以新建弹窗为准（推荐）”，不自动继承当前会话绕过审批参数；既有授权持续有效，后续不重复确认。该选择取代E3–E5的待决状态。
- 上游workspace launch实际把workspaceClaudeArgs与launchExtraArgs直接拼接；原本地对应_workspaceCodexArgs也整批拼接，可能带入旧cwd/resume/初始提示和权限参数。按明确决策增加内部buildPtyWorkspaceLaunchArgs，复用原buildWorkspaceCodexArgs生成弹窗的续接/危险模式参数；仅从boot继承模型及model_provider/reasoning/verbosity设置，其余使用新工作区自己的原生配置。不会改写当前进程的原argv或切换transport。
- 不继承boot profile、cwd、add-dir、remote、approval/sandbox配置或旧turn输入；模型config不接收多行追加配置。picker仅接受原弹窗实际生成的危险模式/成对resume --last参数，拒绝重复/不完整/其他命令或cwd更改，避免接口body越过已选权限与身份语义。该边界是Codex适配和用户明确方案，不声称严格复制上游argv拼接。
- 原CLI parser及独立PTY环境、新增四项argv测试均通过，结果见`/tmp/cxv-b7-e6-tests.log`；本笔尚未接CLI/HTTP调用，无UI变化，不把参数helper当新建入口已完成。之后组合runtime和精确路由。本地commit为本节所在独立提交。

<a id="e7"></a>
## E7 组合独立PTY workspace runtime

- E6本地`5eb20a0`，该笔17/17通过。继续按原CLI完整proxy→原生bridge→TUI --remote及配置/OTel/清理链组合，不复制Claude启动协议；新增内部startPtyWorkspaceRuntime复用原createProxy、E2 bridge、E1 PTY和既有argv/OTel/capability工具。调用方提供已按E6选定的args，不自行决定权限继承。
- proxy捕获绑定可信cwd/instance；native entry追加_instanceKey并以冻结cwd/instance/projectId写入。相同native RPC问答编号增加workspace前缀，resolve/cancel/release只接受本owner前缀，不把其他工作区问题发给当前native。reviewer值校验，OTel token只经环境、工具子进程scrub保持，启动配置不修改process.env；child bypass marker严格由该次明确args决定。
- runtime组合所有者的proxy/bridge/PTY，启动Abort和失败统一停止；native bridge可按原CLI行为回退direct TUI或由requireAppServerBridge明确拒绝。HTTP/CLI入口尚未接，服务器仍使用原boot链；本笔不假装完整多工作区产品已完成。
- 12/12、0skip（runtime2+registry6+argv4）及Node检查通过。真实本机双HTTP capture proxy、双WS native假子进程，TUI为测试stub：A无bypass/B显式bypass互不改环境，伪造实例header不改可信捕获owner；native同编号77分别claim，A不能答B，A停止后B仍ping及HTTP请求；在途取消不会spawn TUI且capture proxy关闭。原Native transcript确实到各自writer，非空断言。日志`/tmp/cxv-b7-e7-final-tests.log`。
- 首次探针断言完成但遗漏关闭interceptor原有profile watcher导致不退出，已用现成_stopProxyProfileWatchForTests并await写入清理修正fixture；初次日志`/tmp/cxv-b7-e7-tests.log`不计完整通过。未为测试修改生产watcher。无前端变化，不重复构建；真实TUI/完整启动API/GUI及进程树边界仍待后续。本地commit为本节所在独立提交。

<a id="e8"></a>
## E8 精确native会话日志选择，禁止同cwd回退

- E7本地`9ce6094`。核PR #145及后续`a84385b5`实际events diff、固定最终完整冷读链与events-instance-live-empty回归：存活新实例无会话应为空，不能显示绑定项目/其他实例的日志。Codex本地V2 runtime指针缺失却会回退project latest，故普通实例接线前必须提供严格选择。
- 复用findActiveV2SessionFile及原reader worker，增加可选exactSessionId：仅返回精确project/canonicalCwd/sessionId的有效archive，缺失/空/非法身份返回null；forceHealthyScan恢复也不跨会话。异步缓存键区分严格/旧模式及session身份，原boot非严格调用保持。无新日志协议、无UI变化。
- 18/18、0skip（完整materializer测试），新增同cwd A/B日志、project latest B、精确A/缺失/空、错误cwd、worker缓存及恢复不回退。日志`/tmp/cxv-b7-e8-tests.log`。后续服务端才消费此选项，不声称入口已完成。本地commit为本节所在独立提交。

<a id="e9"></a>
## E9 普通PTY的HTTP/主终端/scratch精确路由

- E8本地`8b51f11`。沿已核PR #145固定最终workspace/PTY精确解析、独立stream与关闭语义接入本地；保留B3屏幕快照/逐帧/ACK协议与SDK原分支，不移植Claude旧scrollback。新可信configurePtyWorkspaces仅供bootstrap，返回内部registry；真实CLI尚未调用，HTTP launch仍未启用新runtime。
- 请求cwd、项目名/统计/日志/原文件预览/主题命令/terminal-recovery按精确PTY身份；原SDK选择链复用E8严格native日志选项。未知/空/关闭身份拒绝，未带身份固定boot。WS握手固定PTY及scratch cwd，后续body不能换owner；主终端全部输入/顺序队列/监听/屏幕/geometry/fallback来自所属PTY，移动尺寸与活跃客户端按owner分组。全局stop统一关闭所属registry。
- 23/23、0skip（原terminal及完整SDK真实HTTP/WS回归含30秒slow请求）；新增普通路由夹具最终3/3，精确HTTP文件内容、同名目录A/B输出/输入/屏幕/尺寸及同scratch id不同cwd进程通过。日志`/tmp/cxv-b7-e9-final-tests.log`、`/tmp/cxv-b7-e9-routing-final.log`。前两次夹具修正空日志原404断言/默认120x30不重复resize，并设置WORKSPACE_MODE避免重复自动启动，初次不计通过。无UI变化。
- 本笔尚未处理Ask/loop广播归属、CLI组合启动或“＋”入口，因此不启用真实新工作区。下一笔完善runtime事件归属，再接launch。B7未完成；本地commit为本节所在独立提交。

<a id="e10"></a>
## E10 native问答和运行事件按PTY owner隔离

- E9本地`cf62c3e`。继续核固定上游server的scope广播、loop/debounce固定scope、context reconnect以及本地request_user_input完整claim/timeout/replay/resolve/cancel/disconnect链。复用原消息/面板，不新增问答协议；E7已加实例前缀的RPC问答现在由所属runtime处理。
- pending native问答保存冻结scope及对应bridge，只有该owner在线GUI才能claim；HTTP pending/WS作答取消/自动答案/清除广播/无GUI交还TUI均按owner。A有GUI不阻止B交回TUI，B伪造A问题ID不能回答。旧boot bridge兼容。
- loop键加入instance，开始只取消自身旧end timer；SSE控制/usage/context/streaming及terminal通用消息按精确owner投递，未知producer不回退boot，普通图片通知沿握手scope。global streamingState不能涂改其他PTY的turn，原插件loop边界保持。
- 19/19、0skip（普通路由5例、原native问答5例、terminal9例）正常退出，日志`/tmp/cxv-b7-e10-final-tests.log`。实际HTTP/WS/SSE覆盖同编号native问答、跨owner伪答/取消、pending重连数据、关闭全部B GUI时仅B交还、相同session/turn ID的loop及跨workspace debounce不互相取消、通用WS通知及未知owner拒绝；原问答timeout回归保持。无UI/CSS变化。
- 普通CLI组合/launch及旧permission hook身份环境仍待接线，入口尚未启用；B7未完成。本地commit为本节所在独立提交。

<a id="e11"></a>
## E11 每PTY权限hook身份与reviewer隔离

- E10本地`7ba9c36`。实读本地ensureHooks→PermissionRequest→perm-bridge→HTTP long-poll→WS作答全链。原hook只携带Viewer端口，无法区分多PTY；原global reviewer也会错误使B按A的auto_review跳过手动界面。这是native适配必须修的真实调用链，不迁移Claude hook环境。
- E7 workspace child环境加入可信CXV_INSTANCE_KEY；perm-bridge校验并附到请求URL，非法身份不能降级为boot请求，保护发布命令原fail-closed保持。pending permission保存请求scope，展示/超时/关闭及WS答复都按owner。无身份旧boot hook兼容。
- 各runtime保存实际reviewer状态，选定实例GET/POST及hook自动defer查自身；修改B只调B bridge、只通知B，保存用户偏好沿用原行为供未来launch。direct fallback不能谎报热更新成功。native问答不回退已移除的旧PreToolUse hook。
- 24/24、0skip（perm-bridge/原问答/reviewer/普通路由/runtime）及扩展普通路由7/7通过，日志`/tmp/cxv-b7-e11-final-tests.log`、`/tmp/cxv-b7-e11-routing-final.log`。覆盖真实permission子进程带实例URL、A不能答B权限、B user reviewer确实手动等待而A auto_review仍defer、B修改不调用boot updater/不通知A；runtime子环境身份断言保持。UI/CSS无变化。
- CLI/launch仍未接；全进程树关闭及最终GUI仍待验，B7未完成。本地commit为本节所在独立提交。

<a id="e12"></a>
## E12 普通CLI接入独立workspace启动与关闭API

- E11本地`07d6a06`。按PR #145原workspace launch/ensure/精确close与本地完整CLI启动接线：原boot默认PTY/bridge保留（IM既有监听不改到另一个实例），boot成功后trusted配置E3 registry，新工作区通过E6选定argv与E7独立runtime启动。每目录projectId及每instance raw目录明确；模型/日志/原native问答/loop回调接原工具。
- /workspaces列表、launch、精确close/stop-all及cli-mode明确ptyMode，SDK仍false；启动B不initForWorkspace/改全局cwd，不杀A。同cwd并发复用；登记失败只回收本次新建实例。关闭只清所属PTY/bridge/scratch/WS/SSE、pending权限/问答与loop timer，关闭boot后无参操作拒绝，不偷偷绑定B；stop-all保留launcher供显式再次新建。系统prompt capability按实际runtime查询，不借用boot的能力。
- 13/13、0skip（普通路由9例、CLI shutdown注册与真实父子shutdown回归）正常退出，日志`/tmp/cxv-b7-e12-final-tests.log`。覆盖真实HTTP launch合并在途同cwd、同名A/B不被kill、输入到新PTY、按key关闭及原会话存活、关闭boot无参不回退、stop-all后显式新建成功。该launch病例的TUI/launcher为stub，E7双真实native/proxy测试独立通过；不把此处冒称真实CLI全链/GUI通过。
- 本笔普通CLI启动后已配置新路由，但前端“＋”仍待解除sdkMode门槛并验收；完整native进程树清理仍需补验。B7未完成，本地commit为本节所在独立提交。

<a id="e13"></a>
## E13 普通Header“＋”入口与原workspace界面复用

- E12本地`5b8c87f`。实读固定上游HeaderProjectSwitcher/NewProjectButton/SortableProjectTabs完整分支、原共享NewProjectModal→WorkspaceList→DirBrowser、CSS及后续直接启动修复。普通模式复用现有原样式组件，AppBase读取ptyMode并按实例URL切换；不伪设sdkMode，不把PTY换成SDK，不增加/重排UI。mobile原新建菜单解除只限SDK门槛；SDK resume modal仍仅SDK。返回工作区选择页只切视图，不调用stop-all。
- 95/95、0skip组件回归及build通过。新增普通PTY明确验证“＋”/页签可见、SDK history隐藏、launch后仍sdkMode=false，返回选择页不终止进程。初次新增夹具误用局部walk/helper与未draw，修正后`/tmp/cxv-b7-e13-final3-tests.log`通过；最终构建`/tmp/cxv-b7-e13-final-build.log`。
- 真实普通CLI＋实际Codex app-server/TUI＋node-pty，在自有HOME/CODEX_HOME/本机模型fixture运行。Chromium159.0.8154.6与WebKit27.2实测“＋”16×16 dashed、打开/取消、新建同名B、两PTY存活、B精确文件、切回A原stream不变、sdkMode=false，6图与[result](./B7-pty-gui/result.json)；18组plus/tab CSS规则与固定上游声明全同，见[CSS回执](./B7-E13-workspace-css.json)，本笔无CSS改动。
- 探针前几次修正本机profile缺wireApi、AntD图标参与按钮名称、已有boot instance导致URL等待提前结束、WebKit默认中文；最终明确en-US、隔离国家查询，并从精确boot URL开始，`/tmp/cxv-b7-e13-gui8.log`零pageerror通过。未将无参页面导航取消导致的WebKit网络日志归类为业务通过；未执行外部模型，native仍停在其原hook信任或更新提示，故此处只验入口/进程/视图，不冒称真实模型问答或hook信任已验。活动7008未重启。
- 普通“＋”源码缺口已纠偏；真实mobile入口/窄split主PTY输入及其余74候选、进程树强回收仍待后续，B7整体未完成。本地commit为本节所在独立提交。

<a id="e14"></a>
## E14 native bridge强制回收与CLI在途退出等待

- E13本地`a0de5a2`。沿E4尚未验的stop→native wrapper→工具子进程检查，新增真实父/工具子进程都忽略SIGTERM的回归，在原实现实跑失败（stop返回后PID仍在），日志`/tmp/cxv-b7-e14-before.log`。
- native在POSIX独占process group；spawn即保存原进程身份Promise。stop去重并返回清理Promise，复用已有process adapter/稳定身份树终止与terminateWithEscalation：先温和组终止，超时强杀自身组及已捕获仍匹配的子树；正常退出也检查残留组，未知/替换PID不作新目标。生产宽限受全局10s退出期限约束为最多5s，CXV_TEST为200ms。
- E7 runtime/boot adapter等待native stop；普通CLI取消启动signal并等待在途bridgeStartup，启动中退出不再继续spawn TUI；失败spawn清理也等待native stop，避免父进程退出过早截断强杀计时器。PTY本身的强回收另验，不以native病例代替。
- 69/69、0skip（原bridge全量、日志coordinator、独立bridge/runtime/registry及CLI shutdown）和build通过，日志`/tmp/cxv-b7-e14-final-regression.log`、`/tmp/cxv-b7-e14-build.log`。新增真实父/子忽略终止后均ESRCH，原取消/ENOENT、双bridge停A保B保持。初次中间实现遗漏身份赋值导致新增例仍失败，补齐后全部通过，不计中间版本。未在其他OS验证。
- E13自有CLI GUI夹具已停止；停止前捕获5个自有进程身份，正常宽限后残留0，没有停止活动7008。此前GUI的profile/语言/等待夹具修正均已保留记录。B7其余输入/导航/Skills与完整PTY树仍待继续，本地commit为本节所在独立提交。

<a id="e15"></a>
## E15 主PTY强回收与自然退出后的残留工具清理

- E14本地`94e788a`。真实node-pty父/工具子进程同时忽略SIGHUP/SIGTERM，在原killPty实跑失败（返回后PID仍在），日志`/tmp/cxv-b7-e15-before.log`。复用E14现成回收函数，移到shutdown.js为单一stopOwnedProcessTree，不复制另一套终止协议。
- 每PTY在spawn/fallback shell时保存身份，主动关闭和自然退出都退役所属组；屏幕/监听/ACK/代次立即退役，返回Promise供registry/runtime/CLI等待。再次spawn/resume fresh/shell fallback先等自身退役，A不等待或取消B。清理失败保留所属process记录以供显式重试；runtime/native缓存失败后也允许重试。
- forkpty在exec之前可能已被ps读取，命令会从父进程变成目标程序；仅用完整commandHash会误判自己的组为替换进程。组所有权核对可信spawn的PID+出生startId，捕获的后代信号仍使用原完整稳定身份；管理其他Viewer进程的sameProcessIdentity没有放宽。真实shell与自然退出后残留child两例覆盖这个必要边界。
- 89/89、0skip（原PTY/terminal/bridge/shutdown/registry/runtime/精确HTTP路由），额外最终PTY6/6、build通过，日志`/tmp/cxv-b7-e15-regression.log`、`/tmp/cxv-b7-e15-pty-complete.log`、`/tmp/cxv-b7-e15-build.log`。真实普通CLI再启动A/B，精确关B回收3个进程、A保持，退出后10个自有进程残留0，见[实际关闭回执](./B7-E15-real-cli-close.json)。
- 保留中间失败：修正fork-before-exec身份前存在清理不完成；重叠调试期间一次Node原生cjs_lexer SIGABRT（`/tmp/cxv-b7-e15-pty-final.log`），未证明其根因，后续独立20/20、89/89、最终6/6及真实CLI未再现，不宣称已修V8；最终全量/新安装继续复核。未将中间错误/挂起日志计为通过。自有旧测试和CLI夹具已按捕获身份停止，无7008重启。
- 仍需scratch生命周期/环境及B7输入布局、Prompt Nav、Skills候选与最终验收；B7未完成。本地commit为本节所在独立提交。

<a id="e16"></a>
## E16 原composer十二行上限及完整后续高度修复

- E15本地`8f624ae`。实读`791a5e18f8b9d6445fde737dab42e0d47d74a07e`真实diff、`3bd2aa96961379537a8ccfb50667cab4b2335aa9`混合提交的autosize子项、`2ea5181d`后续border-box/pad修复与固定最终helper、焦点/input/发送/语音/引用调用及CSS。原本地仍MAX_LINES6/136px，且JS减padding造成高度偏小。
- 原样迁入固定最终resizeChatTextarea及MAX_LINES12；桌面/Pad CSS max268px，测量前中和min-height并恢复，避免focus/后续ghost floor残留。手机保留原whole-box160px行为；未新增或重排输入区、未整批搬混合提交。ghost/话筒等其他差异另笔处理。
- 95/95、0skip组件回归，build通过（`/tmp/cxv-b7-e16-tests.log`、`/tmp/cxv-b7-e16-build.log`）。Chromium159.0.8154.6/WebKit27.2各desktop/pad/phone共6场6图，真实普通CLI后端，桌面关闭原主PTY面板后在原输入框填16行；desktop/pad 268px、可滚动且16行内容保留，短焦点58px→失焦37px，宽屏原card1000px；手机inline/computed160px原分支保持（现有0.6布局缩放后实际rect96px），不误将CSS尺寸当物理尺寸。见[GUI回执](./B7-composer-height/result.json)。
- 初次GUI夹具修正AntD图标参与Terminal按钮名称与phone既有缩放尺寸断言；最终`/tmp/cxv-b7-e16-gui3.log`6场零pageerror。pad/phone为仿真，不是真机/IME/物理键盘验证；未发外部模型请求。上游12行及后修子项完成，其余B7继续。本地commit为本节所在独立提交。

<a id="e17"></a>
## E17 原ghost两行钳制及工具栏出血修复

- E16本地`e4a33bd`。实读混合提交`3bd2aa96961379537a8ccfb50667cab4b2335aa9`完整ChatInputBar JSX/CSS子diff、固定最终ghostRef/useLayoutEffect/ResizeObserver、PTY early-return再挂载、焦点/语音临时文本链。该提交标题是CI下载重试，但本笔仅迁其B7 UI子项，不把CI/整条混合提交勾选。
- 原样加入两行ghost clamp、按实际clientHeight提起两行输入floor（desktop/pad58px、phone92px）、observer清理与terminal/sdk依赖，原textareaWithGhost overflow:hidden阻止遮挡工具栏；voice interim max-height按原100%随父盒裁切。复用E16已迁的min-height中和与border-box后修；未另造布局。10组相关CSS选择器声明与固定上游全同，见[CSS回执](./B7-E17-ghost-css.json)。
- 95/95、0skip和build通过（`/tmp/cxv-b7-e17-tests.log`、`/tmp/cxv-b7-e17-build.log`）。双引擎各desktop/pad/phone共6场12图，实际生产ChatView受控注入长建议（不是声称模型实际生成），两行钳制/清空回37px/原toolbar不被覆盖，desktop主PTY打开再关闭后observer重挂正确；另用模拟SpeechRecognition事件验原voice preview父盒裁切与toolbar间隔，不调用实际麦克风或音频服务。见[GUI回执](./B7-ghost/result.json)。
- 夹具修正xterm隐藏textarea误选、stop按钮真实译名；voice的max100%按原CSS包含padding的外盒可能高于父盒，最终验证可见裁切区域及toolbar间隔，不错误声称外盒恒等父盒。最终`/tmp/cxv-b7-e17-gui-final3.log`6场零pageerror。物理设备/音频/IME仍未验。B7 Nav/Skills/队列及其余候选继续；本地commit为本节所在独立提交。

<a id="e18"></a>
## E18 Prompt Nav原徽标、语言缓存与producer归属

- E17本地`c22bfa0`。实读`aa584229562d8a511023e10a79119424b0e56d52` PromptNav/utils/ChatView/CSS与`caaab3d12fd8ea8849d4264a1b9f1ed5d15e1ec0`实际后修，固定最终helper/渲染/会话与native Plan/Ask生成链。本地只有普通用户/compaction导航，缺Plan/Ask/UltraPlan和稳定指纹。
- 复用原扫描/标题/80字符/排序/逐卡导航、三款徽标、同bubble唯一key和内容/角色过滤/窗口/语言指纹；assistant归属和时间读displayTs producer而非下一请求carrier。native仅使用已有toolNameAliases的update_plan/request_user_input，不注册Claude工具；缺Plan标题时用Plan标签，不谎称native非交互计划需要审批。原B3无内容compaction和按conversation/thread而非内部epoch分Session的规则保持。
- 103/103、0skip及build通过（`/tmp/cxv-b7-e18-tests.log`、`/tmp/cxv-b7-e18-build.log`）。新增native卡片交错/同bubble多卡/producer跨会话归属/空流式标题/原型工具名拒绝/80字符/原compaction保密/语言指纹与真实render缓存等。3组CSS及两key各18种翻译与固定上游一致，见[CSS/语言回执](./B7-E18-prompt-nav-css.json)。
- SDK native-protocol隔离fixture（fake Codex子进程，无外部模型）实跑多轮普通输入→提问取消→原UltraPlan模板，Chromium159/WebKit27.2两场6图，Plan/Ask/UltraPlan实际徽标和Ask滚动producer正确；通过实际语言Select的焦点/ARIA活动项键盘选择中文，标题/徽标缓存刷新。见[GUI回执](./B7-prompt-nav/result.json)，最终`/tmp/cxv-b7-e18-gui5.log`零pageerror。普通CLI真实入口已由E13验收，此处不冒称fake SDK为真实Codex模型运行。
- 初始fixture只发turn/plan/updated，对应SDK任务HUD/清单文本，不是Plan卡；按现有native协议补plan item后再验。语言Select最初指针选项在视口外/未聚焦时活动项不同，最终用真实聚焦combobox与ARIA项键盘路径验证，不声称该指针路径已通过。Nav更多/用户Prompt汇总与最终composer位置另笔处理；混合提交其他范围不整条勾选。B7未完成，本地commit为本节所在独立提交。

<a id="e19"></a>
## E19 原UserPrompt更多入口、三视图与txt导出

- E18本地`64eead2`。实读`96f3a7a44e014192000378b974ea757f194d08e9`实际diff、完整UserPromptsModal/segment parser/CSS和固定最终组件，并追踪现有native投影/compaction/mainAgent过滤。迁入原more按钮与汇总弹窗，Original/Context/Text、去重、时间、折叠和txt下载保留原行为；CSS/parser逐字节一致，见[B7-E19源码回执](./B7-E19-prompt-modal-source.json)。
- native必要适配仅复用既有normalizeConversationEntry的只读副本和Master/title排除，不从body.instructions收集；native input_text规范化，developer/system、covered compaction与工具结果不进入用户汇总。防御空/畸形输入，React原文本渲染保留。没有新增后端接口或布局。
- 107/107、0skip及build通过（`/tmp/cxv-b7-e19-final-tests2.log`、`/tmp/cxv-b7-e19-final-build.log`）。实际组件验证私有指令/压缩/neutral Responses排除、关闭不扫描、原记录不变、重复历史去重、字面markup惰性。初始测试误用整体以user_instructions起首而没有可独立正文块的输入，现有过滤本来就不回收该形态；修正真实分块夹具，未放宽生产过滤。
- Chromium159/WebKit27.2，SDK native-protocol隔离fixture两场6图：真实more点击、三视图、context折叠、txt下载内容、字面img不执行、未发草稿保持，见[GUI回执](./B7-user-prompts/result.json)，`/tmp/cxv-b7-e19-gui3.log`零pageerror。GUI使用显式b7_context测试折叠，不将已被native SDK预处理的UltraPlan宣称为原完整scaffold；结构压缩/私有指令边界由组件回归另验。初次探针发送后过早等Send导致popover被流式更新关闭，改为等新assistant及稳定发送态；失败图片不计通过。
- 原composer入口迁位、mic及余下B7交互另笔继续；本地commit为本节所在独立提交。

<a id="e19a"></a>
## E19a 英文空计数单位的局部修复

- E19本地`8b0e6e1`。截图人工复核发现标题显示`4ui.promptCountUnit`：固定上游同样用空en单位和`|| key`翻译函数，这是原缺陷而非漏迁。仅在该弹窗标题把回退键名还原成原本意图的空单位，不改全局翻译规则或界面结构。
- 107/107、build、双引擎三视图/下载/草稿重验通过（`/tmp/cxv-b7-e19a-tests.log`、`/tmp/cxv-b7-e19a-build.log`、`/tmp/cxv-b7-e19a-gui.log`）；[6图回执](./B7-user-prompts/result.json)更新并检查标题不含键名。悬浮导航在more后仍是原hover行为，下一笔随原composer controlled popover迁移关闭。B7其余继续，本地commit为本节所在独立提交。

<a id="e20"></a>
## E20 原composer PromptNav位置与mic迁位

- E19a本地`a6e1d6a`。实读`8f1d345309b10c289ee14825fea8d24f07eb534f`实际diff及固定最终ChatInputBar/ChatView/共享predicate/CSS，确认其后没有该输入区后修。按原布局：desktop live SDK或隐藏主PTY时，头像进composer左栏、mic进右栏proxy/send之间；显示主PTY/readonly保留侧栏hover，phone/pad保留原移动入口和左侧mic。predicate和16px圆头像CSS精确一致，见[源码回执](./B7-E20-composer-nav-source.json)。不将不同的ProxyChip门槛合并，不迁混合提交ActiveAgents子项。
- 共用E18同一内容/producer定位，controlled click popover在选目标/more时关闭，布局失效清open标记，SDK scratch展开仍保留composer；单一mic元素避免重复状态。109/109、0skip与build通过（`/tmp/cxv-b7-e20-tests.log`、`/tmp/cxv-b7-e20-build.log`）。
- Chromium159/WebKit27.2各SDK/普通PTY/pad/phone，8场14图，实际点击定位/more关闭、SDK scratch展开、PTY显示/隐藏入口切换、两移动布局mic原位置，零pageerror，见[GUI回执](./B7-composer-nav/result.json)，`/tmp/cxv-b7-e20-gui4.log`。mic为SpeechRecognition布局shim，不是物理音频验证；pad/phone仿真。初始点击早于历史hydrate，补等actual assistant稳定后通过。
- GUI同时实证原uncontrolled textarea在主PTY显示时unmount，回到composer草稿为空；固定上游同一缺陷，没有把它记为草稿保留通过。下一笔作局部数据丢失修复，之后继续Skills和剩余候选。B7未完成，本地commit为本节所在独立提交。

<a id="e21"></a>
## E21 主PTY切换的未发送草稿保留

- E20本地`1d7d416`。沿真实失败追踪ChatInputBar的PTY early-return和uncontrolled textarea：DOM卸载前没有保存值，上游同缺陷；这不是迁位predicate问题。仅在组件本地ref保存卸载前文本/选区方向，重挂载恢复并调用既有resizeChatTextarea；不存磁盘、不跨workspace组件，不添加UI。SDK scratch仍在同一textarea，原发送清空路径照常。
- 109/109、0skip与build通过（`/tmp/cxv-b7-e21-tests.log`、`/tmp/cxv-b7-e21-build.log`）。E20同一GUI探针将空草稿边界改为实际两行文字+backward选区保存断言；Chromium159/WebKit27.2各普通PTY/SDK/pad/phone共8场14图全通过，`/tmp/cxv-b7-e21-gui.log`，[回执](./B7-composer-nav/result.json)。包含主PTY开关两行原文与选区3–12 backward完全恢复；其余导航位置/弹窗/scratch回归通过，未发外部模型。
- 本笔是有真实数据丢失依据的局部修复，不是界面重设计。Skills及其余B7候选继续，本地commit为本节所在独立提交。

<a id="e22"></a>
## E22 Active Skills原作用域分行

- E21本地`e8a0b0d`。实读`d906edb3de840208944bbca9d33ec037bdeb6bc5`完整scope parser/渲染/CSS/i18n差异、固定最终scope分支及唯一后续CachePopover context usage改动，追本地原生skills API→AppHeader→LiveTagPopover→CachePopover完整链。native API已输出user/project/plugin权威source，直接复用；只补merge保留source、原group helper与三行，不造另一个目录扫描器。
- 原name去重/描述回退、disabled/builtin过滤、历史API失败的单行fallback、native既有告警计数保持。3组CSS、group函数与固定上游一致，三key原18语种照迁，见[源码回执](./B7-E22-skills-source.json)。RoleFilterBar/TaskHUD玻璃样式已存在，本笔不重复改写；不把整个混合提交勾选。
- 104/104、0skip与build通过（`/tmp/cxv-b7-e22-tests2.log`、`/tmp/cxv-b7-e22-build.log`）。新增实际组件验证三label/chips及禁用builtin排除，纯函数验证同名覆盖后source、历史description、unknown归global及不改输入。初次组件夹具未提供必需memory三态prop，补null后通过，未改生产契约。
- 在自有SDK隔离HOME/项目/plugin cache写3个SKILL.md及原生plugin manifest，实际/api/skills明确三source；Chromium159/WebKit27.2打开Context Management，三行与plugin描述hover通过，2图零pageerror，见[GUI回执](./B7-skills-scope/result.json)，`/tmp/cxv-b7-e22-gui3.log`。首轮探针误断言短label，第二轮点击早于hydrate/hover状态关闭，最终等待真实历史后走原hover通过；失败不计。无用户目录写入或外部模型调用。
- 仍需slash/PTY忙队列及其他候选逐项核验和最终全量/新安装，B7未完成，本地commit为本节所在独立提交。

<a id="e23"></a>
## E23 原生技能元数据只读接口

- E22本地`5fa171f`。实读`67ceb5b7f0dcb7027843ef8d5e1cd2b5b4d1a506`完整菜单/helper/CSS及SDK supportedCommands/生命周期diff、固定最终和后续无菜单变更；追本地SDKtransport→manager→HTTP精确view。Claude supportedCommands不能照抄；本机Codex0.169生成schema有skills/list（cwds/forceReload）与真实SkillMetadata。
- 用户通过选项工具明确选择保留`/`入口、选中后填Codex原生`$技能名`，不展示Claude专用内置命令。该选择持续有效，前端后续接入。此笔只接元数据：现有活跃AppServer child上read-only skills/list，菜单读取不初始化进程/thread/turn；exec/普通PTY暂返unsupported由后续真实文件fallback，不伪造SDK支持。
- /api/skill-commands绑定既有requestSdkView精确instance，未知/关闭不回退；transport校验唯一匹配cwd、代次/停机、2MiB/2048条上限，只输出实际enabled、安全token/绝对path/合法scope元数据。原生权威空表保持空，不能用filesystem fallback复活native已禁用技能。未添加任意RPC或目录选择能力。
- 53/53、0skip（原transport/manager/queue+新增inactive不spawn、scope/unsafe/bounds结构、retired控制读）及真实HTTP/WS12/12、Node语法检查通过（`/tmp/cxv-b7-e23-tests.log`、`/tmp/cxv-b7-e23-http.log`）。HTTP验证新接口inactive/exec unsupported、活跃精确路径及关闭404；无前端资源变化，不重复构建。
- 实际Codex0.169在新自有HOME/CODEX_HOME和`.agents/skills`项目创建fixture，initialize→skills/list读到repo技能，再skills/config/write仅禁用自有fixture→list明确enabled=false→投影排除；没有thread/start或turn/start，child退出ESRCH。见[原生回执](./B7-E23-native-skills.json)，`/tmp/cxv-b7-e23-native3.log`。首次探针断言失败是macOS /var与/private真实路径差异，改用canonical自有root后通过，不更改生产作用域比较。
- 新菜单/真实文件fallback及完整PTY忙队列尚待实施，B7未完成，本地commit为本节所在独立提交。

<a id="e24"></a>
## E24 补实际原生项目.agents技能根

- E23本地`712134e`。E23真实RPC发现项目`.agents/skills`，而原filesystem fallback只列项目`.codex/skills`。追getProjectSkillRoots→listSkills/managedRoots→toggle/delete与target-scope完整调用，后者已复用同一列表及项目policy，不需要新增allowlist或另造resolver。
- 只在既有项目根数组加`.agents/skills`/`skills-skip`，独立store `project-agents`；旧.codex顺序、默认导入位置和global/plugin owner保持。28/28、0skip（skills API、target-scope、target-files）通过，日志`/tmp/cxv-b7-e24-tests.log`，新增同名两根必须path、开关仍在原根、隔壁cwd拒绝、删除不碰旧根。无Web资源变化，不重复build。
- 用实际Codex0.169在新隔离HOME同时放项目.agents和.codex两技能，真实skills/list两者都发现，禁用实际.agents fixture后enabled=false并投影排除；无thread/turn和外部模型，child已退出。见[两根原生回执](./B7-E24-native-skill-roots.json)，`/tmp/cxv-b7-e24-native-path.log`。这是原生目录差异的最小适配，不凭规划虚构新源。
- 接下来迁原slash菜单，用户/入口选择保持；完整B7仍未完成，本地commit为本节所在独立提交。

<a id="e25"></a>
## E25 原slash技能菜单与Codex原生调用语法

- E24本地`a7bd8a7`。沿E23已读原`67ceb5b7f0`/`3c77d9a8ed`与固定最终完整菜单组件/CSS/helper、ChatView触发/键盘/选择/提交/生命周期链；原component和CSS逐字节照迁，原/触发函数一致、6key各18语种复用，见[源码回执](./B7-E25-slash-source.json)。不新增菜单位置或重新设计交互。
- 用户已明确选`/`打开菜单、选中填Codex原生`$name `而不自动发送。实际native skills/list替代Claude supportedCommands；native system/admin按原builtin行、plugin/user/repo按personal行，保留实际原生name，不伪造plugin alias/Claude builtin说明。PTY/exec/未活跃/控制失败回退现有真实SKILL.md；path:null占位builtin与disabled不展示，同名合并避免重复React key。成功原生空列表权威，不用FS复活已禁用项。
- 上游原顺序键盘/Tab/Enter选择、Escape关闭、无匹配继续普通发送、IME不干扰、5s失败冷却、scope/代次失效及卸载防旧结果回写保留。原native SDK的scratch开时composer仍可见，菜单同一可见性门槛；重开刷新元数据。原$技能消息与图片组合保持技能文本在前，原引用/上传缓发/typed interrupt路径复用。
- 最终110/110、0skip及build通过（`/tmp/cxv-b7-e25-tests.log`、`/tmp/cxv-b7-e25-final-build.log`）。新增实际ChatView键盘只填不发、scratch可见/主PTY隐藏键盘门槛、IME、native空表、scope URL、旧结果、失败重试；纯函数验证原触发/实际system与plugin分组/真实文件过滤/不发明命令/同名与$图片组合。初始既有112/112另独立通过，未混成同一计数。
- Chromium159/WebKit27.2各SDK/实际普通CLI-PTY/phone仿真共6场6图，/开菜单、SDK native-protocol catalog（fake Codex子进程）、PTY实际文件fallback、过滤/Tab或点击填$、无匹配/Escape通过；SDK明确断言选择不发，用户随后Enter的原生协议text等于$原文。见[GUI回执](./B7-slash-menu/result.json)，`/tmp/cxv-b7-e25-gui.log`零pageerror。不将fake模型输出声称为真实Codex技能执行；真实catalog/disabled在E23/E24已另验，实际模型加载待后验。
- 本轮仅按捕获身份停止旧自有SDK fixture54192（2子进程残留0），新自有SDK fixture38260/20560运行；活动7008及自有普通CLI未重启。B7普通PTY忙队列、scratch环境/回收、剩余74候选与最终全量/新安装仍待继续，本地commit为本节所在独立提交。

<a id="e26"></a>
## E26 scratch shell隔离父进程协调/权限/采集环境

- E25本地`e915edf`。实读固定最终scratch-pty-manager完整创建/env/回连/退出/删除与`2be5bb23f6`实际diff、后续无额外scratch变更；追本地openScratchPty→精确handshake/cwd，以及普通CLI全局OTel与新workspace childEnv。原scratch复制process.env，能继承boot bypass和协调端口，不能以已隔离cwd冒称环境已隔离。
- 复用原前缀清理（本地CXV_/CXVIEWER_）和原生OPENAI_BASE_URL对应上游模型proxy剥离。native最小必要适配：OTel配置已在父进程注入私有采集token，复用已有header解析/去重逻辑抽withoutOtelTraceAuthHeader，仅删除自己的头，保留tenant等用户header。无process.env修改、无新增HTTP输入或UI。
- 初始11/11、scratch+原runtime+OTel安全/配置完整回归通过，日志`/tmp/cxv-b7-e26-tests.log`、`/tmp/cxv-b7-e26-regression.log`，最终数量见该日志末尾。新增实际spawn-options断言父bypass/instance/editor/未来前缀/模型proxy均剥离、普通env和其他OTel头保持、父进程完全不变；OTel既有配置/认证回归保留。该新增spawn为node-pty接口stub，不声称实际shell已运行该环境；进程树强回收下一笔补真实PTY。无Web资源变化，不重复build。
- B7仍在实施，普通PTY忙队列、scratch强回收、剩余候选及最终全量/新安装未完成；本地commit为本节所在独立提交。

<a id="e27"></a>
## E27 scratch真实进程树回收与退出等待

- E26本地`fa76df3`，E26安全回归最终17/17、0skip。实读固定最终scratch的killPtyTree/自然退出/maybeReap与本地kill、idle cleanup、WS kill、精确close/stop-all、全服务shutdown完整链；复用E15现成stable identity + stopOwnedProcessTree，不造第二套信号规则。
- scratch spawn即捕获身份，主动kill和自然exit都退役所属组/后代；session立即不可写/移出活动表，cleanup Promise去重，失败保留retiring记录可重试；同key重新启动先等自身退役，其他instance不被等待或终止。killScratchPty保留原bool兼容，session.kill返回完成Promise。HTTP exact close/stop和服务退出等待实际资源，服务停止时scratch与主workspace并行清理并受原总deadline约束。
- 在E26原scratch模块隔离副本上运行同一真实node-pty新测试，主动关闭和自然exit两例都因残留PID失败，`/tmp/cxv-b7-e27-before.log`；修复后2/2通过`/tmp/cxv-b7-e27-real.log`。真实shell→Node parent→Node child同时忽略SIGTERM/SIGHUP，关闭/自然退出后所有本组PID ESRCH、同id另一个workspace继续输入，真实shell的boot bypass为空，未发模型请求。
- 最终37/37、0skip（scratch unit/真实树、普通精确路由、terminal WS、SDK HTTP/WS）通过，`/tmp/cxv-b7-e27-regression2.log`，Node语法/差异空白检查通过。第一次回归发现等待未完成loader会让原“关闭后再释放导入”夹具挂起：尚未创建任何进程的pending只标取消，并在spawn前强校验，不等待不可控导入；实际已创建资源仍必须等待。旧自有回归62181及1子进程按捕获身份结束，未计通过；修正后37项正常退出。
- 无Web资源改动，不重复GUI/build。普通PTY忙队列、其余74候选和最后全量/新安装仍待继续，B7未完成，本地commit为本节所在独立提交。

<a id="e28"></a>
## E28 原普通PTY忙队列核心

- E27本地`fa7cd3c`。实读`dafe2bce374df1daf3e81526a4b42c9189e620f0`引入、`1aca9b5f8f207903a7516a8036a7fa590808ca16`恢复/dispatching后修、固定最终647行核心及45原测试、后续scheduled strict-anchor与原resume函数；追本地已有sequential ACK/250ms bracket submit及IM入口。原本地只有SDK权威队列，不能拿它代替普通PTY能力。
- 迁入原FIFO/50条上限、queued→dispatching→成功删除/失败原位恢复、send-now focus→50ms ESC→最多2s安全轮询、Stop停放、下一轮重新启用、过期busy 3s救援、取消代次、精确scope广播与严格目标失败。每PTY一个factory，复用native原粘贴builder/控制字符处理与既有错误记录；不复制全局active busy状态，不添加Claude plaintext resume，native沿用B3生命周期。
- 30个共享函数body AST与固定上游一致，仅_safeToInject的kind字面claude→codex；新factory隔离自身队列/计时器，粘贴依赖用已安装原生实现，并堵C1/嵌套paste delimiter。见[源码校验](./B7-E28-queue-source.json)。无UI/CSS改动。
- 原45/45迁入回归通过，新增双factory停止/计时器/dispatch/FIFO/旧完成隔离及原生控制字节/嵌套delimiter，两组加现有粘贴builder共50/50、0skip，日志`/tmp/cxv-b7-e28-original-tests.log`、`/tmp/cxv-b7-e28-tests.log`。此处为注入式核心测试，不声称真实普通CLI/GUI忙队列已通过；服务端精确owner/IM互斥与UI下笔接，B7未完成。本地commit为本节所在独立提交。

<a id="e29"></a>
## E29 普通PTY队列精确WS/原生安全状态接线

- E28本地`9ee483f`。实读固定最终server queue-message/remove/send-now/clear/suppress/重连与turn-end链，追本地main-WS handshake所有者、native bridge pending RPC/turn/响应存档、PTY shell fallback、CLI boot/new runtime和工作区关闭。每个精确registry instance只建自己的队列，原header与UI本笔不改。
- 序列写绑定捕获的PTY对象，enqueue anchor由服务端当前native session构造，不能借消息body切工作区；旧session拒绝、断连/未就绪/裸shell不接收队列输入，运行中原生approval（含TUI未交GUI的问题）阻止注入。新增内部getAppServerInputState只报告连接/活动/未答数量，resolved request存档不计pending；主PTY状态显式codex/shell，fallback不可冒充Codex。
- WS回放和状态/拒绝广播只到本owner；Stop只停放，明确send-now可重新提交；whole-turn原生状态替代跨tool闪烁的单HTTP streaming；等待审批结束后原轮询再提交。相同实例native session变化清旧队列，PTY退出/关闭/stop-all/服务退出销毁自己的定时器。新UI将使用ptyQueueAvailable能力标记，未接前端不算可见功能完成。
- 117/117、0skip通过（原bridge全量、实际双bridge native-protocol代理、PTY/runtime、精确HTTP/WS、45原queue+新增隔离、terminal WS），`/tmp/cxv-b7-e29-final-tests.log`；新实际HTTP/WS病例10/10，`/tmp/cxv-b7-e29-routing.log`。覆盖A/B忙队列隔离、回连重放、Stop停放、native pending gate、B先Send now而A保持、250ms两块原粘贴、跨key/旧SID拒绝及只清A保B。该路由TUI/native state为stub；双bridge实际进程/WS证实connected/active/stop关闭，仅假native协议，不声称模型执行。
- 初始新增getter测试发现原bridge保留responded请求用于存档，不能直接用Map.size计未答；按真实.responded语义修正后全117通过。实际双bridge测试finally改等待原stop Promise再清临时目录，避免旧测试结束清理过早。Node语法/差异空白检查通过，无Web变化不重复build。
- 当前只接web queue→IM pending单向阻挡；IM→web双向mutex和前端原队列/placeholder仍下笔继续，B7未完成。本地commit为本节所在独立提交。

<a id="e30"></a>
## E30 普通web队列与IM双向注入互斥

- E29本地`1d889f1`。实读原im-bridge-core的activeInjection完整turn锁/anyActiveInjection与本地DingTalk arm/drain/marker精确归属/commit释放/stop链；原生本地没有该共享锁。E29已使web队列等IM pending，此笔补反向，避免只验证单向。
- 复用queue已有dispatch/_injecting状态只读暴露isDispatching；IM增加内部可注入probe（旧调用默认允许），真正共用boot PTY时查原生connected/active/pending与本owner web dispatch。IM被阻挡时原项留队列，100ms轻量unref重试，释放后继续，stop/空队列/已拥有IM turn均清retry；不给其他工作区加全局锁。没有外部IM发送/权限产品变更或UI改动。
- 70/70、0skip通过（IM原测试、原PTY queue与精确HTTP/WS），`/tmp/cxv-b7-e30-final-tests.log`。新增闭环：native web忙→IM停放→web dispatch占用→web实际turn忙→IM获锁→web后续停放→精确IM commit释放→web继续，及stop后旧retry不能再探测/写。测试使用假adapter/注入式writer，不宣称真实钉钉网络或模型并发已验；既有IM偶发边界保持。
- 初始闭环测试在已有100ms poll未到期时即断言第二次写，按原poll语义等待后通过，未为测试取消生产安全等待。Node语法/差异空白通过，无Web资源不重复build。下一笔接原queue气泡、send-now/remove/负反馈与placeholder；B7未完成。本地commit为本节所在独立提交。

<a id="e31a"></a>
## E31a 真实普通CLI暴露的合成会话URL身份纠偏

- E30本地`2d26452`。E31普通队列UI验收中，真实Codex0.169收到自有本机SSE回复，但网页会话区为空；追bridge→V2→normalize→isMainAgent/shouldExclude，证实合成turn沿用真实api.openai.com URL，命中B2已有Master传输veto。假SDK fixture的codex://地址未覆盖此问题，旧测试不能代替实际CLI证据。
- 用户通过提问工具明确选择：合成AppServer会话使用`codex://app-server/turn`，真实HTTP继续Master。仅改原生合成turn producer，删除不再使用的URL拼装与imports；codex事件清洗保留新turn的原生主/子agent身份。未放宽原HTTP过滤、未改变请求路由、未迁改历史记录或UI布局。该笔为原生差异适配，对应原PTY/输入基线`eb2e9703a2`，不把此修复当整条混合提交完成。
- 91/91、0skip：完整bridge、双实例protocol进程、native projection、frontend分类回归，`/tmp/cxv-b7-e31a-final-tests.log`。新增实际producer输出→MainAgent谓词/只读投影断言及原HTTP仍排除；原subagent/title测试保持。首次断言选中另一现有root fixture，其答文为root answer，纠正测试期望后全通过。
- 专用真实CLI新HOME/CODEX_HOME、自有本机HTTP/SSE模型服务，Chromium159实际Enter→Codex0.169→本机POST→原生agentMessage→网页用户/助手各一行；原生辅助标题独立过滤。见[原生回执](./B7-E31a-native-transcript.json)、[截图](./B7-native-transcript/chromium-native-reply.png)。本机服务仅返回合成文本，不声称外部模型、工具或技能执行已验。
- 之前夹具`CXV_TEST=1`使proxy跳过interceptor/profile初始化，dummy key的默认外部请求超时；loopback global URL又被既有readOriginal过滤，均为失败尝试不计通过。修正夹具为实际初始化后请求均到本机profile。按捕获身份先后回收自有父27356/64466/21324/41962及其3/3/4/3后代，残留0；生产7008/PID72817保持。新自有fixture仍运行供E31后续验证。
- 普通队列UI仍未提交/未验完，74候选与最终整体验收继续，B7未完成。本节所在独立commit为本地实现映射。

<a id="e31b"></a>
## E31b 被动原生历史预览不能认领工作区主线程

- E31a本地`069c667`。E31满队列追加验收时核真实双工作区，发现A/B都报告A的sessionId。B的实际raw证据显示：native TUI先发thread/start，再thread/read全局历史A；read结果seq36早于自身start结果seq41，旧rememberThreadResponse把A设为_mainThreadId。原双factory fake协议测试没有覆盖该实际顺序，已有queue GUI不能代替native root归属证明。
- 追完整client/server解析、remember/hydrate、主/子线程身份、registry→exact V2读取链。复用已有RPC context Map标记thread/read；非本实例已认领的主/子线程只保留原始协议转发，不hydrate或选主线程。已归属线程read仍能补历史；被动read标记跨新线程reset保留到响应，错误响应清理；测试重置清空。没有按cwd猜测线程、没有丢原生RPC或改变UI/CSS，原合成URL/标题/subagent策略保持。对应`eb2e9703a2`原并行主PTY的native必要适配，不算混合提交整条完成。
- 56/56、0skip通过（完整bridge、双实例实际protocol进程、runtime、精确HTTP/WS），`/tmp/cxv-b7-e31b-final-tests.log`。新增先请求A预览→开启B→A晚返回不能认领/发PRIVATE A、B own start、后续A read不能污染、own B read可补历史。Node语法/差异空白检查通过；无Web资源变化。
- 停止自有fixture父76815及5后代，捕获身份校验残留0，生产7008/PID72817保留。新真实Codex0.169隔离fixture重新暖A，再launch同名B；实际Chromium159/WebKit27.2各1场1图，A/B sessionId不同、B exact archive404空、B无A用户/助手、A保原SID。见[真实归属回执](./B7-native-owner/result.json)、[修复前原始顺序](./B7-E31b-before-owner.json)，`/tmp/cxv-b7-e31b-native-gui.log`。raw诊断仍忠实含原生TUI主动读取的历史预览，不把它当B的语义会话。
- 上一fixture的E31六场18图队列行为已通过，但本笔后需再加“真实SID不同”强断言复验；满队列Chromium已恢复多行草稿，后续WebKit单行即时输入只留在TUI草稿而未发model，原因尚待独立复现，不计通过。E31仍未提交，B7仍未完成。本节独立commit为本地实现映射。

<a id="e31"></a>
## E31 原普通PTY队列条、负反馈恢复与真实原生验收

- E30 `2d26452`；验收暴露的两个原生前置缺陷已独立提交E31a `069c667`、E31b `a1d7fb7`。实读原`dafe2bce37`、`1aca9b5f8f`完整ChatView提交/typed Ask取消/队列/Stop/重连、固定最终及`1e0edc00f3`placeholder后修；核原最终optimisticQueueBubbles只在SDK模式渲染，未给普通PTY新增假用户气泡。上游临时checkout Git元数据失效，重新clone并detach同一`74cd752`，复核队列CSS块精确相同，见[源码回执](./B7-E31-queue-source.json)。
- 复用B4已有原队列条/两行文本/Remove/Send now/CSS，普通PTY的busy Enter接E29精确owner队列，Stop先停放再走原中断。ptyQueueAvailable来自实际registry能力；桌面/手机共享入口，localLog/历史slice不显示队列控件；SDK既有队列不改。原PTY只有当前dispatching项禁用操作，不把SDK“单dispatch禁用所有Send now”移来。
- native必要适配为requestId：原输入记录暂存完整文本，权威snapshot/ack精确核销；服务端拒绝完整回填，多React更新同批次也不丢；断连不自动重发，待确认原文保留，精确重放再核销，不另造30s PTY placeholder。server queue item/snapshot/target-gone负反馈带相关ID，拒绝同样盖本owner stamp；其他工作区帧忽略。server-owned anchor与原生安全注入检查保持。
- 最终169/169、0skip（实际组件callbacks/原pending echo、原queue核心、精确HTTP/WS）通过，`/tmp/cxv-b7-e31-final-tests.log`；新增busy提交、原文恢复、批处理拒绝、断连保留、相关重放核销、外来实例忽略、Stop顺序和动作禁用，HTTP新增真正snapshot/reconnect requestId往返断言。build通过`/tmp/cxv-b7-e31-final-build.log`；初始夹具错误直接赋只读socket getter，改为真实共享Context；antd静态toast为DOM外测试stub且计次数，最终无吞异常。
- E31b后的真实Codex0.169/node-pty/AppServer、本机canned SSE服务：Chromium159/WebKit27.2各desktop/pad/phone共6场18图，强断言A/B真实SID不同；busy入队、没有提前用户气泡、删除、刷新重放、B真实WS空队列、Stop停放、Send now、turn结束自动发送、实际native用户回显唯一均通过。队列CSS clamp2/radius16或phone21/无视口溢出通过，phone/pad仅仿真。见[主GUI回执](./B7-pty-queue/result.json)，`/tmp/cxv-b7-e31-owner-final-gui.log`。
- 两引擎各1场1图真实服务端50条容量满拒绝：busy来自真实native多行提交；本owner WS填满50项，GUI额外多行输入被拒完整恢复，Stop/clear后原文仍在，50填充项未进入model。见[满队列回执](./B7-pty-queue-rejection/result.json)，`/tmp/cxv-b7-e31-rejection-final-gui.log`。总8场20图零pageerror，仅本机合成模型回复，不声称外部模型/物理设备/真实IM网络通过。
- 失败探针均未计通过/移到`/tmp/cxv-b7-e31-failed-probes`：pad脚本误切终端；WebKit第二页未固定locale；geo首源未stub及CORS，现三源统一stub；Node WS初缺Origin被正确拒绝。另一次WebKit单行即时输入留在TUI草稿没有发model，现以原有多行原子路径验证满队列，此单行50ms路径仍待独立复现，不把改夹具当生产修复。E31b前已过的旧六场不替代最终含真实SID断言的新六场。
- 当前普通忙队列子项完成并独立提交；SDK Send now状态chip、窄split、editor精确owner、74候选完整闭合/额外发现的原split混合子项、全量/新安装仍继续，B7未完成。本节所在commit为本地映射。

<a id="e32"></a>
## E32 原窄split会话最小宽度与横向滚动

- E31本地`135438c`。实读`2914d6479d2845e0b193ba1c09aa6667c66850a6`完整提交信息与ChatView CSS diff、固定最终split/chatSection/terminalPanelWrap、实际JS拖动/持久化/初始宽度/终端切换完整链；核后续`96f3a7a44e`/`975313773a`/`2e09d30192`均未修改这两块规则，geometry/controller也无后修。原B0将该大型混合commit分到B4/B9/B11，漏了实际B7 split子项；保留原74索引候选来源，另在候选JSON追加有源码依据的additionalSourceScopes，不冒称索引原本包含它。
- 只将`.splitContainer`和`.chatSection`两完整块按固定最终逐字节恢复：overflow-x:auto/overflow-y:hidden，chat min-width:280px。原拖动计算/终端宽度与导航、手机分支不重写，无新依赖/新布局。见[精确源码回执](./B7-E32-split-source.json)。
- 改前真实CLI Chromium159/WebKit27.2均复现：1440窗口会话526px/终端624px；缩900后会话变0px，split overflow hidden。改后宽窗口仍526/624无横滚；900时会话280px、split scrollWidth1194>900；横滚294px可见完整终端右边界，终端开关保未发送草稿/原native SID，恢复1440后横滚归0。双引擎各4图共8图零pageerror，见[GUI回执](./B7-narrow-split/result.json)；改前两引擎JSON与截图保留在该目录before子目录。没有向模型提交输入。
- build通过`/tmp/cxv-b7-e32-build.log`，before/after探针日志`/tmp/cxv-b7-e32-before.log`、`/tmp/cxv-b7-e32-after.log`，差异空白检查通过。纯CSS迁移未新增镜像测试，验证使用真实浏览器尺寸/滚动/开关行为。本节只完成混合提交的窄split子项，不涵盖定时任务/IM等其他工作包。
- 下一步继续原SDK排队状态chip、editor精确owner、单行50ms异常复现和候选逐子项/最终全量与新安装；B7未完成。本节独立commit为本地映射。

<a id="e33"></a>
## E33 原SDK Send now行内状态与有界占位核销

- E32本地`d9a5905`。实读`1aca9b5f8f`/`1e0edc00f3992edbeb47208e7326977101344f1b`实际diff、固定最终optimisticQueueMessage helper、点击/queue-state/dispatch/rollback/30s sweep/三个渲染分支及ChatMessage labelSuffix/CSS完整链；本地B4已有服务端activeInput/epoch和labelSuffix基础，复用它们，不把普通PTY也加SDK占位。
- 原Send now仅SDK显示的用户占位与行内Sending状态、3个timeout方法体、4个共享helper函数、占位JSX体均与固定最终相同（[源码回执](./B7-E33-sdk-chip-source.json)）。显式点击后暂显；server dispatching→移除或回滚、实际新用户回显、换scope/epoch、断连/卸载核销；原30s有界兜底。既有status CSS原封复用，无新增CSS或位置。
- Codex最小适配：只统计实际native用户message，不推测Claude系统steering/_ccvQueuedPrompts；URL精确instance/native resume/服务端epoch绑定，历史slice与用户role可见性复用本地pending门槛。既有activeInput在source占位期间隐藏重复副本；它本身结束/替换时也按权威ID核销，不能因回显不在当前窗口而常驻。只清SDK临时占位，普通PTY队列镜像在历史pin期间保留，回live仍可见。无backend/API/模型消息变更。
- 最终130/130、0skip（helper、新真实组件回调/原native pending echo、完整SDK队列回归）及build通过，`/tmp/cxv-b7-e33-final2-tests.log`、`/tmp/cxv-b7-e33-final-build.log`。覆盖旧同文不误ack、跨sessions一条回显只消费一条、旧queued镜像不提前清、dispatch成功/rollback、scope/history gate、30秒边界、断连、native activeInput结束无孤儿以及历史切片不丢普通队列镜像。SDK回归中的throwing callbacks日志为原断言夹具预期，130项均正常退出。
- 实际SDK manager/HTTP/WS/browser，fake-native子进程仅控制hold/1200ms dispatch延迟，无外部模型：Chromium159/WebKit27.2各desktop/phone仿真4场8图，Sending位于原labelRow、11px/原6px间距，ack后消失、accepted用户行唯一、刷新无ghost、B无泄漏、wire仅一次。见[GUI回执](./B7-sdk-queue-chip/result.json)，`/tmp/cxv-b7-e33-verified-gui.log`。WebKit phone缩放后margin计算为5.989583px，保留原6px CSS并以0.1px容差核验，非改设计。初始reload探针未等冷加载便断言0行，改等真实用户行；失败图移到/tmp，不计通过。
- 按捕获身份停止自有旧SDK fixture38260及1后代，残留0；新70738/20560继续供后续隔离验收。真实普通PTY及7008均未重启。下一步editor精确owner、单行即时输入异常、74索引及新增源码scope完整审计/全量/新安装；B7未完成。本节独立commit为本地映射。


<a id="e34"></a>
## E34 外部编辑器精确工作区归属与原生往返

- E33本地`1ebd97a`。实读固定最终`server/lib/ccv-editor.js`全文、`routes/files-fs.js`三editor路由及历史（helper从e3ca28c52d迁移后无后修），核`eb2e9703a2`原多工作区接线、TerminalPanel→ChatView→FileContentView/保存返回和本地CLI→PTY env→helper完整链。原广播所有终端、仅UUID全局状态不满足本地精确owner边界；沿用原500ms轮询、30min超时、原编辑器/绿色返回条/CSS，不增新界面。
- helper打开/轮询均携已存在CXV_INSTANCE_KEY；服务端以[exact instance, editor UUID]保存，复用既有scope路由、管理员门槛、严格UTF8 body及fileBrowserAccess原策略。body不能改owner，foreign status/done为404，同UUID不同owner独立；关闭/退出清本owner，未知会话不再假成功。校验helper参数/端口/key，不扩大文件白名单。真实Codex Ctrl+G在boot CODEX_HOME或新工作区自身`.codex/editor`建文件，现有目录策略已支持，无需新增tmp目录或copyback机制。
- editor-open只到本owner；重连/resync只重放本owner未完成会话。ChatView同UUID回放不重挂文件/覆盖dirty draft；TerminalPanel补精确frame检查，未锚定旧boot行为保持。helper消失owner的4xx明确失败，避免无效等待30分钟。原HTTP helper未改TLS行为，真实TLS未验。
- 124/124、0skip及build通过，`/tmp/cxv-b7-e34-final-tests.log`、`/tmp/cxv-b7-e34-build.log`。包括实际Node helper open/poll、固定boot/32/36hex、Unicode引号路径、端口/key异常、404退出；实际HTTP/WS双owner隔离/重放/重复UUID/伪造body/策略拒绝，以及真实组件callback保留dirty/fileVersion。初始路由探针遗留8个WS触达既有连接上限，补测试清理及CLOSED deadline后通过，未放宽生产上限；仅回收捕获身份的自有测试父83279/85472及各1后代，残留0。
- 最新真实Codex0.169/node-pty/AppServer、独立HOME、本机模型夹具：Chromium159/WebKit27.2各A/B两个工作区，共4场8图，实际Ctrl+G→真实helper子进程→原MDX编辑→切终端触发回放保dirty→UI Save→返回→helper退出→原生TUI采用已保存草稿，foreign done拒绝/另一页无通知均通过，model调用增量0。见[GUI回执](./B7-editor-owner/result.json)，`/tmp/cxv-b7-e34-gui.log`；截图已实看。初始探针误认B临时文件也在boot CODEX_HOME，实际B使用自身`.codex/editor`，按实际owner可信目录修正断言；失败图移/tmp，不计通过。B原生更新菜单只Escape跳过，未升级全局Codex。
- 自有旧PTY fixture30281及5后代捕获身份回收残留0，新93478/93479供后续验收；生产7008/PID72817未触碰。单行即时输入异常、74索引及追加源码子项完整审计、最终全量/新安装仍待，B7未完成。本节所在独立commit为本地映射。


<a id="e35"></a>
## E35 原生单行即时输入被当粘贴的复现与最小适配

- E34本地`c1c23dc`。回读固定最终ChatView._sendUserMessageImmediate完整SDK/普通分支及`2e09d30192`quote/multiline改动，原普通单行发送text后50ms发CR，多行已有250ms原子bracket paste。追本地builder/相关seq/ACK/失败恢复/服务端串行写完整链，不另造发送或重试机制。
- 真实Codex0.169 Chromium159，36字符短句成功，随后846字符纯单行失败：wire明确text→50ms CR，5秒内无模型请求，截图原生TUI将CR留作草稿换行。见[改前回执与图](./B7-native-singleline/before/result.json)，`/tmp/cxv-b7-e35-before.log`。之前WebKit满队列后的偶发因此取得独立原生复现；不推断所有历史失败根因相同。仅对自有草稿Ctrl+C一次清除，未发失败文本、未退出CLI。
- 普通文本（含单行）复用既有相关seq/250ms bracket paste/ACK/失败恢复；native slash保原交互路径，SDK wire不改，无新UI/CSS/依赖。必要差异来自实际native paste batching，避免把Claude的50ms假设直接当Codex可靠提交。原多行quote、preset、忙队列的builder继续共用。
- 最终197/197、0skip与build通过，`/tmp/cxv-b7-e35-final-tests.log`、`/tmp/cxv-b7-e35-build.log`。新增短/长/中文/skill文本单事务与失败原文恢复、原slash路径。扩大回归同时发现E31改名后6条测试仍调旧_renderSdkQueueBubbles，E33权威activeInput结束核销后1条仍期望常驻；逐项核实际流后更新为现有方法/结束无孤儿断言，并补Send now组件setState fixture，未删除队列动作/重放/同文ID/拒绝断言。初跑143/150不计通过。
- Chromium159/WebKit27.2 × A/B两个真实SID，短/846(844)字符长句/中文各重复2次，共24次实际native→本机canned SSE→用户回显，全部成功、每次wire只有1个原子事务、最后两native SID不变；4场4图见[回执](./B7-native-singleline/result.json)，`/tmp/cxv-b7-e35-after.log`。双引擎各加1场满50队列拒绝：busy由单行实际提交产生、额外单行完整恢复、无假用户、填充未入模型、Stop/clear保草稿，2图见[满队列回执](./B7-native-singleline-rejection/result.json)，`/tmp/cxv-b7-e35-rejection.log`。两组pageerror为0，仅本机合成回复，不声称外部模型或真机输入法通过。
- 74索引及追加源码子项完整审计、普通workspace-mode/Electron入口核查与最终全量/新安装继续，B7未完成。本节所在独立commit为本地映射。


<a id="e36"></a>
## E36 原会话渲染窗口800/400/300与展开步长300

- E35本地`eef0c49`。逐候选实读`20e6573b7c351fa710933ea58a36359fc01f4fb4`实际diff，核固定最终四常量及git -G后修记录；追build→_applyMobileSlice→导航timestamp/target偏移→handleLoadMore→原滚动补偿，非按提交标题直接修改。发现本地仍400/240/150、步长100，属于实际未迁缺口。
- 仅四个数字按最终源码恢复：桌面800、Android400、iOS300、每次展开300，保留原裁剪/导航/滚动/虚拟化算法，未新增UI。见[源码回执](./B7-E36-render-window-source.json)。固定最终另有后续local-log自动扩窗分支，本笔不声称该独立scope已迁完；B7后续审计继续，不把常量迁入当所有只读加载行为完成。
- 109/109、0skip及build通过，`/tmp/cxv-b7-e36-tests.log`、`/tmp/cxv-b7-e36-build.log`。新增实际ChatView回调：1200项保尾800/offset400，加载前300后1100/offset100，再次全量1200；timestamp映射/scroll target同步重算不丢导航。纯常量迁移未为每数字写镜像测试；Android/iOS数字精确源码校验，不宣称千行手机真机/新GUI性能通过。候选JSON开始按本笔明确scope记录闭合，其余候选仍待逐项核。
- 入口审计补充：本地runCliModeWorkspaceSelector定义未被argv分派调用，上游测试亦注明同名旧函数不可达；不为死入口扩建新registry。Electron tab-worker为每标签独立server/PTY，原PR145明确chat-tab隐藏死“＋”并由外层多tab管理，不能把普通CLI原Header“＋”能力冒充Electron已验。Electron实际GUI仍归后续平台包/现有未验边界。
- 剩余候选源码闭合及最终全量/新安装仍待，B7未完成。本节所在独立commit为本地映射。


<a id="e37"></a>
## E37 原桌面composer上传入口收纳与hover修复

- E36本地`7931e9e`。实读`a2be00c45b71be0faf6b8bf1e1e93916b9cc1eb7`与`3cf3e9585f9f93cb59b021a81d789c8f4ef5e528`完整入口diff、固定最终ChatInputBar两个菜单分支/上传file input→runUpload→附件、quickMenuHoverIntent/sharedChrome CSS。发现本地仍独立上传圆钮，不能凭已迁CSS/上传后端宣称该布局已对齐。
- 固定最终Upload顶级行（含后修hover cancel+collapse）逐字迁入桌面四芒星菜单第一行，去独立圆钮；原手机/pad平铺菜单、picker/upload/paste/drag/附件原链不改，无新增CSS。未迁入同位置后续B9 scheduled row，不将混合源码整批搬入。见[源码回执](./B7-E37-upload-menu-source.json)。
- 110/110、0skip及build通过，`/tmp/cxv-b7-e37-tests.log`、`/tmp/cxv-b7-e37-build.log`。实际hook回调验证旧按钮不存在、展开AgentTeam后hover Upload清expandedKey、点击先关菜单再触发file input、无HTTP副作用。初始探针将英文Quick settings大写/未来Quick Prompts标签当当前值而失败；按现有真实文案/DOM修正，未改生产文案凑测试。
- Chromium159/WebKit27.2各ordinary desktop、SDK desktop、SDK phone/pad仿真，共8场8图，桌面Upload确为首行/13px、hover清级联、真实filechooser事件、选择空列表后菜单已关，phone/pad原平铺入口保持；零pageerror、无文件上传或模型提交。见[GUI回执](./B7-composer-upload-menu/result.json)，`/tmp/cxv-b7-e37-gui.log`；已实看桌面/phone图。终端工具栏同类入口是另一个候选，下一笔独立处理。
- 74候选源码审计与最终全量/新安装仍待，B7未完成。本节所在独立commit为本地映射。


<a id="e38"></a>
## E38 原主终端工具栏上传入口收纳

- E37本地`c9753dc`。实读`a336d3919f585712a1dcc608515e29589c0621f5`完整有效diff、固定最终TerminalPanel主/手机/scratchOnly分支、persistent file input→handleFileUpload→onFilePath/image-upload-notify、_qmHover与sharedChrome完整链。与E37一样，本地原主终端仍有独立上传圆钮；scratch-only返回分支不适用该入口。
- 原终端四芒星Upload顶级首行（包含先关Popover/清expanded再点persistent input、hover cancel）逐字迁入并去独立圆钮，复用全部原样式/上传及附件路径，手机原虚拟键分支不新增上传。见[源码回执](./B7-E38-terminal-upload-source.json)。未迁同位置B9 scheduled行，无新UI/权限决策。
- 111/111、0skip及build通过，`/tmp/cxv-b7-e38-tests.log`、`/tmp/cxv-b7-e38-build.log`；实际TerminalPanel render/callback验证旧入口不存在、Upload首行、pending hover取消、file picker观察到Popover已关、hidden input仍接handleFileUpload。Chromium159/WebKit27.2各desktop/pad仿真4场4图，原生终端实际菜单/hover、pad点击展开后hover清级联、persistent input真实filechooser打开/取消均通过，native双SID保持，零pageerror/无上传/无模型提交。见[GUI回执](./B7-terminal-upload-menu/result.json)，`/tmp/cxv-b7-e38-gui.log`，已实看pad图。
- 剩余候选源码审计与最终全量/新安装仍待，B7未完成。本节所在独立commit为本地映射。


<a id="e39"></a>
## E39 原快捷指令18语言共享标签

- E38本地`92caf8e`。实读`9967ebdbc2ea8e3ffded222ab2d2b7f708348697`实际diff/固定最终18语言字典，git -G确认无后续替代，核ChatInputBar/TerminalPanel共享ui.terminal.agentTeam调用。原本地仍各语言字面AgentTeam，现逐字恢复原“快捷指令”/Quick Prompts等本地化词条；ui.terminal.agentTeamCustom及preset/command数据不改。
- 该笔仅共享字典一个块，18词条与固定上游精确一致，见[源码回执](./B7-E39-quick-prompts-source.json)，build通过`/tmp/cxv-b7-e39-build.log`。低影响纯文案未新增镜像测试/反复GUI；E37/E38图片是各自提交时的历史AgentTeam文案，不冒称新文案截图。
- 74候选源码审计、发现的独立local-log扩窗scope与最终全量/新安装继续，B7未完成。本节所在独立commit为本地映射。


<a id="e40a"></a>
## E40a 只读归档加载不得被boot工作区补锚重定向

- E39本地`cf8aa3c`。E40只读长日志GUI反复暴露WebKit pageerror；追真实requestfailed/stack/两次snapshot，定位B2本地`41d95af5`的project-name回调：无instance即location.replace加boot key，虽然preserveLogfile，却取消了在途只读快照并重新加载全页。只读文件不是live workspace owner，原固定基线的logfile分支独立读取，不需要这种补锚。已读AppBase mount→project-name→loadLocalLogFile、WorkspaceRoot/scope与SDK tabs，未放宽未知live scope回退。
- 只在已有补锚条件增加`!logfile`；live未锚定页依旧补boot instance，明确只读文件保持原URL。E40未提交的自动扩窗补丁先保存到/tmp并撤离，两者独立验证/提交，未把前置缺陷藏入渲染功能。
- 111/111、0skip及build通过，`/tmp/cxv-b7-e40a-tests.log`、`/tmp/cxv-b7-e40a-build.log`。实际原生格式V2只读fixture经HTTP/object投影，Chromium159/WebKit27.2各1场1图，原无instance文件URL保持、main navigation仅1次、snapshot仅1次、用户内容出现、零pageerror，见[GUI回执](./B7-readonly-url/result.json)、[改前诊断](./B7-E40a-readonly-before.json)，`/tmp/cxv-b7-e40a-gui.log`；已实看WebKit图。无模型请求/写入用户数据。此前取消的快照在旧实现最终也能渲染，不夸称旧版必然空白。
- E40自动扩窗仍未提交/未验完，下一步恢复补丁继续；其余候选与全量/新安装继续，B7未完成。本节所在独立commit为本地映射。


<a id="e40"></a>
## E40 原只读会话逐帧自动扩窗

- 前置E40a本地`839119c`已独立修复只读补锚重载；E39 `cf8aa3c`。E36最终源码复核发现local-log独立渲染行为未迁，沿git -S/-G追溯`80ced6a99694f2f861ebecacea68b95f6387c106`实际ChatView diff及固定最终（后仅monorepo迁移）。该旧混合release不在74索引并集，候选JSON另增additionalSourceScopes，不能冒称原B0已覆盖它，其他workflow/release子项不计本包。
- 逐字复用_maybeScheduleLocalLogAutoFill、constructor/rAF销毁/DidUpdate接力，原非虚拟桌面/iOS/pad按现有300步长逐帧扩展，原Virtuoso只读输入免DOM窗口裁剪；只读自动加载显示原spinner，live仍手工按钮。复用已有CSS和handleLoadMore滚动补偿，不增加新加载器/后台全量拉取；native V2 HTTP分页及已选有界读取策略不改，仅展开已加载的rows。见[源码回执](./B7-E40-readonly-render-source.json)。
- 112/112、0skip及build通过，`/tmp/cxv-b7-e40-final-tests.log`、`/tmp/cxv-b7-e40-final-build.log`。实际class回调1500rows：800→1100→1400→1500，每帧仅1任务，到尾停止，live不自动调度、卸载后旧callback不扩窗；现有111项继续通过。
- 自有LogV2Writer生成1个native格式V2 entry内1050行用户/助手，经真实HTTP snapshot/object→前端投影；Chromium159/WebKit27.2各desktop/phone/pad仿真，共6场6图。非虚拟5场1050节点全量自动可达、无手工按钮；Chromium forced-phone走Virtuoso，1050输入仅挂20节点，正常滚动可达第0行；WebKit phone明确iPhone UA仿真走iOS非虚拟分支。零pageerror/无写入/无模型提交，见[GUI回执](./B7-readonly-render-window/result.json)，`/tmp/cxv-b7-e40-final-gui.log`；已实看iPhone图。不声称1050条独立native模型消息/物理设备或所有归档无限加载通过。
- 初始WebKit只读重定向造成取消snapshot pageerror，已由E40a独立真实修复；失败图移`/tmp/cxv-b7-e40-failed-probes`，旧两轮不计通过。当前scope完成，仍发现普通PTY的原任务HUD尚未接native plan snapshot，下一步独立核该缺口；74候选和最终全量/新安装继续，B7未完成。本节所在独立commit为本地映射。


<a id="e41"></a>
## E41 原普通PTY任务HUD与精确native计划快照

- E40本地`57c3be4`。实读`1c5fadafbf730e1e4a0639d238809dfefd710347`原HUD、`bf2d6f2ad8fba572239cc8ee9ccc7d22f4b6d6ab`圆点/新prompt清理、后修`01ff6d85e8aa565c81b6b3c3c92f7e24c06c53a7`详情Popover、`d906edb3de`玻璃样式、`0cde7d1df8f15fdbac23be941e367e5d577159de`SDK/failed链及固定最终组件/CSS，追本地B4 SDK快照/bridge native turn-plan/registry/runtime/CLI/WS→HUD全链。发现普通PTY没有原任务条，并非CSS已迁就已可用。
- 原TaskProgressHud DOM/Popover/SVG/颜色/位置和整CSS复用，CSS40规则/整字节与最终上游相同（[源码回执](./B7-E41-task-hud-source.json)）。普通bridge只投影已认领root的当前turn/plan/updated，native inProgress→既有in_progress；每factory快照只读复制，子线程/旧turn/无效状态不替换root，原生已接受新turn清空，失败/中断未完成项为failed，连接/进程/stop退役清空。未复制Claude hook/客户端全局taskStore，也未从native goals伪造计划。
- 复用既有sdk-task-snapshot组件协议，CLI boot/新runtime都接；广播及新网页连接回放盖精确PTY owner，错cwd/key/已关闭scope丢弃。主PTY新连接/刷新重放本owner，SDK原链不改；HUD与原输入条同位置，ordinary live启用，历史/readonly仍隐藏，无新CSS/可见控件。
- 226/226、0skip及build通过，`/tmp/cxv-b7-e41-final-tests.log`、`/tmp/cxv-b7-e41-build.log`。包括完整bridge/双实际proxy子进程/runtime/真实HTTPWS/SDK任务及native manager/真实React callbacks；新增双factory root/child/旧turn隔离、native replacement/复制防改、失败/新turn，runtime回调精确key，WS跨工作区拒绝与重连回放。初始回归77/78因旧断言要求SDK-only；后97/98因任务回调赋值误落测试reset而漏了实际start，均实修后全226通过；未删隔离/安全断言。
- 独立fake-native JSON-RPC子进程+实际node-pty/startPtyWorkspaceRuntime/bridge/server（不冒充真实Codex执行）：Chromium159/WebKit27.2 × desktop/pad/phone仿真6场12图。原1/3进度/三个圆点/展开原清单、A刷新回放、child不替换root、B独立计划、A完成/中断只隐藏A、新turn清理B均通过，零pageerror。见[GUI回执](./B7-pty-task-hud/result.json)，`/tmp/cxv-b7-e41-gui3.log`，已实看desktop/phone图。早期探针误用无三角符号的Expand文本、pad误开终端后等隐藏composer，均为夹具失败不计通过。
- 实例化限制：已读当前实际Codex0.169本机canned模型请求tools，未列update_plan；本轮未强制启用native feature，未取得实际模型发turn/plan/updated的证据。受控native协议验证不能记为实际模型/计划工具执行通过。复验条件：native自身对root当前turn发出该事件后应按上述原HUD显示/更新；native没有事件时保持不显示。该限制不阻断其余候选审计，现有外部模型/真机边界保持。
- GUI后按捕获身份回收自有fixture97177及4后代，残留0（/tmp/cxv-b7-e41-retired-fixture.json）；初次清理脚本误给adapter.signal传PID被类型检查拒绝，修正传identity后正常完成，未触碰别的进程。普通真实93478/93479、SDK70738和生产7008保持。剩余候选完整闭合/全量/新安装继续，B7未完成。本节所在独立commit为本地映射。
