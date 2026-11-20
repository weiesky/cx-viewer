# B4 实施：Agent 生命周期、任务与状态反馈

2026-11-21，实施中，第5/12工作包。固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1`；B2/B3已收口。本页仅记录已核实子项，不将混合提交整体标完成。

## B4.1 Codex SDK 任务权威快照与重连

上游依据：`0cde7d1df8f15fdbac23be941e367e5d577159de` 的SDK任务HUD relay、`2914d6479d` 的任务表及连接重放子项。已读实际diff、固定快照sdk-manager `getSdkTaskSnapshot`、server WS连接重放，以及sdkTaskTracker/TaskProgressHud完整源码与CSS。后者在固定快照仍有效；`975313773a`改进活跃代理卡，不替代任务HUD。完整上游hash见本笔commit trailers；本地提交 `61c3d78`。

本地：`packages/app/lib/sdk-manager.js` 的 `getSdkTaskState` / `_upsertItem` / reset与error边界，`packages/app/server.js` 的已授权WS握手。复用现有按instance的 `_currentItems`，不复制Claude后台任务表、hooks或增量协议；最新todo_list为整份替换，发送全量 `sdk-task-snapshot`，空列表同样权威。已有generation守卫拒绝旧执行器事件，已有WS scope同时约束instance/cwd；按精确实例重连读取，未知或歧义实例沿用拒绝策略。

必要协议适配：本地 `@openai/codex-sdk@0.142.5` 的实际 `dist/index.d.ts` 中 TodoListItem只有 `{text, completed:boolean}`，不是Claude的task_started/task_updated。已完成映射completed，未完成映射pending，不推测当前步骤/owner/耗时/子Agent；取消或失败后未完成项按上游stopped/failed语义映射failed。成功结束仍未勾选的步骤保持pending，下一prompt清空旧批次；历史resume不复活旧执行任务。快照返回新对象，外部修改不影响SDK记录。本笔无UI变化，原聊天todo文本与日志格式保持。

验证：Darwin arm64 / Node v24.14.0；`CXV_BYPASS_PERMISSIONS=0 CXV_TEST=1 CXV_LOG_DIR=tmp node --test packages/app/tests/sdk-task-state.test.js packages/app/tests/sdk-manager.test.js packages/app/tests/sdk-session-registry.test.js packages/app/tests/sdk-workspace-connections.test.js`，29/29通过、0 skip，日志 `/tmp/cxv-b4-tasks-server.log`。真实loopback HTTP/WS+正式SDK运行fake Codex：同名A/B任务分离、WS连接在任务中重放、未知实例拒绝；另覆盖替换列表/旧ID最新更新、错误/中断、无任务新prompt、resume、重置代次和快照不可变性。不是外部模型或真实捕获事件验收；GUI/生产安装/其他平台尚未验证。

## B4.2 原任务 HUD 与 SDK 快照接线（fab7d5f）

上游：`1c5fadafbf730e1e4a0639d238809dfefd710347`（原组件与composer位置）、`bf2d6f2ad8fba572239cc8ee9ccc7d22f4b6d6ab`（进度点/新输入重置）、`01ff6d85e8aa565c81b6b3c3c92f7e24c06c53a7`（详情Popover）、`d906edb3de840208944bbca9d33ec037bdeb6bc5`（玻璃样式）、`0cde7d1df8f15fdbac23be941e367e5d577159de`（失败态/HUD）、`2914d6479d2845e0b193ba1c09aa6667c66850a6`（重连边界）。已读各笔实际组件/CSS diff及固定快照的TaskProgressHud、taskStore、sdkTaskTracker、ChatView inputStack/WS接线；最终CSS仍保留上述演进，不迁入975313773a已删除的活跃代理头像过滤机制。

直接迁移固定快照 `TaskProgressHud.jsx` 的DOM/逻辑与完整CSS、18语言7个词条；CSS SHA256 `0123f963458f1bec09d8518bda4d4d66b1e47d0284efebad1bec046fc3115554`，逐字一致。位置保持Workflow HUD和排队条之后、ChatInputBar之前；保留进度点、详情Popover、折叠、creation order、全部终态自动隐藏、读屏状态行、减弱动画与三层响应式规则。

必要适配只有数据所有权：本地B2切换会重挂载按instance的ChatView，故将其现有WS快照直接以snapshot prop交给原HUD，替换模块级store订阅，DOM/CSS未重排。提前到达的快照不依赖sdkMode发现时序，URL精确instance与卸载守卫拒绝异作用域/迟到消息；Provider按原queue-state缓存模式保留最新全量任务快照给晚挂载消费者，并在断线/替换时清空。历史文件、pin在旧会话时隐藏live任务；角色筛选不改变composer任务操作区域。未复制Claude hook或task delta tracker。

验证：Web **260/260、0 skip**；全量 **1417/1417（5+260+946+206）、0 skip**，构建通过。新用例执行实际ChatView/Provider/HUD（受控React hook宿主），覆盖模式晚发现、空快照/未知状态、断线清空与重播、跨instance/卸载、折叠/creation order/终态隐藏、角色筛选与历史pin。首跑新增文案断言因测试宿主语言为英文而失败，已将断言限定为两种正确翻译，未改产品文案；最终通过日志 `/tmp/cxv-b4-tasks-{web,full,build}.log`。

真实Safari隔离实例 `cxv-b4-tasks-gui-nHUNQU`，由当前构建、临时HOME和正式SDK驱动fake Codex。实际页面输入hold tasks → composer上方显示✓1/3、A任务、1个勾选点和2个待处理空圈；展开显示原序3行及完成/待处理标签；刷新恢复；点同名B隐藏A清单、切回A恢复；`mobile=1`强制移动布局显示，停止后清单清除。两张实际截图已核看，不能等同窄视口、物理触控或真实模型通过；详情Popover实际打开、浏览器自然断线恢复尚未验收。原生AX click/Expand对任务chevron未触发展开，截图坐标点击成功；没有为工具另改交互。最初Safari新标签载入被用户窗口变化保护拒绝，重新读取state后仅在自有20320页完成操作。自有fixture进程已停止，未改真实用户日志/凭据。

可复跑 `node cc-viewer-alignment/probes/b4-tasks-gui.mjs`（交互终端，输出两个精确实例URL；stdin JSON可send/release/interrupt/tasks/disconnect）。无需外部模型网络。最终新生产安装689文件、202个Web资产及关键源码精确字节一致，148/148运行时、B1.2合成回归、隔离CLI相对--cd启动通过；结果见[B4任务安装回执](./B4-tasks-install-2026-11-20.json)，临时目录 `cxv-b3-runtime-bghm86vy`（复用B3通用安装探针）。无真实用户日志转换或外部模型调用。

## 接下来

任务HUD当前只接SDK公开todo_list，普通App Server的update_plan、活跃Agent卡、慢请求/重试失败和其余B4候选继续核对。Codex SDK 0.142.5的公开ThreadItem没有Claude task_started等后台代理事件；普通TUI路径已有App Server bridge的collabAgentToolCall和子线程身份记录，但两者不是同一wire契约。后续按实际协议决定适配，不从文本/工具结束推测子Agent已结束。

## B4.3 用户选择后的 App Server 评估

用户在交互中选择“评估 App Server 适配”，尚未选择生产执行器启用范围。已完成[源码依据、最小适配方案及准入](./B4-appserver-proposal.md)，主45条与交叉55条并集66条建立[候选矩阵](./B4-candidate-matrix.md)。本轮没有更改生产执行器。

可复跑真实0.169.0 AppServer stdio + 正式SDK0.142.5的本机合成Responses探针，7次请求全部本地。两进程同名隔离、A/B独立轮次、真实计划inProgress与文本delta、精确turn中断、失败终态、进程重启后原生thread/resume通过；正式SDK真实todo_list快照也通过（completed/pending/pending），补足B4.1/2此前仅fake CLI的协议证据。没有外部模型调用或子Agent启动；子Agent状态目前仅schema/基线源码，不能据此记活跃卡完成。结果见[B4 AppServer回执](./B4-appserver-compat-2026-11-20.json)。仅新增probe/文档，沿用fab7d5f的1417项及生产安装148项结果，不宣称本笔重跑全量。

## B4.4 E1 现有 exec 执行器边界

用户已选择“渐进实现并验证”：保留exec默认、新增显式App Server选择，允许临时目录/本机合成服务驱动的受控子Agent协议测试；此决策持续有效，不重复确认。本笔先将已有Codex构造、SDK原生thread和POSIX supervisor接线原样移入 `lib/sdk-exec-transport.js`，manager仍负责proxy等待、队列、消息投影、代次与AbortSignal；未切生产传输或更改UI。上游生命周期/快照依据仍为2914d6479d/975313773a，具体Codex执行器边界是必要协议适配，不照搬ClaudeSDK。

SDK/队列/实例/历史/CLI/进程所有权与proxy针对回归 **53/53、0 skip**，日志 `/tmp/cxv-b4-exec-extraction.log`；真实0.169.0本机合成兼容探针在抽取后再次通过（含正式SDK真实todo_list），日志 `/tmp/cxv-b4-exec-extraction-real.log`、临时目录 `cxv-b4-appserver-compat-AHpcrO`。本笔没有重新宣称全仓/产物验证；后续执行器完成后做最终构建、新安装和完整回归。

E1本地提交：`c65f3f9`。

## B4.5 E2 独立 stdio RPC 客户端

新增 `lib/codex-appserver-client.js`，每个闭包只拥有一个stdio Codex子进程和自己的RPC/服务器请求表，无监听端口或全局线程表。限定帧/写队列16MiB、并发请求128；超时/Abort清除对应请求与监听，迟到response不重新派发；server request与client request同ID不冲突。JSON错误、超大帧、EPIPE或进程退出关闭所有待办；无消费者的服务器请求返回不支持错误，不批准。stderr只排空，不保留提示词/凭据。POSIX关闭自己进程组，父进程退出后仍对原组发KILL清理抵抗TERM的后代，不触及别的实例。

本笔仅建立并验证客户端，尚未接入SDK manager或公开CLI选择。上游2914d6479d的生命周期/快照及975313773a活跃卡依赖的Codex最小协议适配；不直接复制原TUI bridge的模块级运行态。

客户端 **5/5、0 skip**，日志 `/tmp/cxv-b4-appserver-client.log`：真实Node子进程覆盖双实例/请求ID碰撞、超时/取消/迟到帧、非法JSON/大帧/早退/缺失执行文件、默认拒绝服务器请求及POSIX抗TERM后代回收。兼容探针已改为调用这个实际客户端，真实Codex0.169.0本机合成7次请求再次通过（计划/流式/中断/失败/重启恢复），日志 `/tmp/cxv-b4-appserver-client-real.log`、临时目录 `cxv-b4-appserver-compat-18f0N3`。没有子Agent或外部模型调用；无UI变化，不重跑未受影响的视觉与全量。下一笔接per-instance执行器、事件映射和显式选择，已有exec路径继续默认。

E2本地提交：`a071323`。

## B4.6 E3 独立执行器与真实子线程证据

新增 `sdk-appserver-transport.js`，只建立未公开接入manager的执行器模块；默认exec、现有生产路径与UI保持。保留native thread/turn身份，把根线程的计划、文本/推理delta、工具、usage与终态映射成现有SDK事件契约；子线程原始事件仅交独立观察者，不混进MainAgent。turn/start响应前的通知暂存有界，知道权威turnId后才投影，旧turn/子线程不影响根终态。中断先取得原生turnId再发精确interrupt；启动回复不确定/断线时关闭自己进程，绝不自动重发输入。事件队列16MiB/1024项，未消费结束会终止所属执行器。

源码依据：已读固定AppServer bridge的完整item/turn转换、SDK manager/adapter真实调用链、正式SDK0.142.5的配置argv序列化和当前0.169生成schema。原生JSON配置曾验证启动/简单续发有效，但进一步真实Agent探针发现：在thread/resume重复传nested config后，后续请求可丢掉整个工具集。生产模块因此**使用启动配置argv，并且不在thread/start/resume重复写config字段**；保留原生cwd/model/sandbox/approvalPolicy参数。SDK配置序列化未导出，按其现有TOML值语义最小适配；null/非有限数/函数/原型键拒绝，绝不宽松回退权限。故障可用 `node cc-viewer-alignment/probes/b4-appserver-compat.mjs --agents --thread-config` 复现，预期spawn前声明缺失而拒绝；正常模式不使用该诊断选项。中间失败回执/请求保留临时 `cxv-b4-appserver-compat-YwrGXd` 等目录，不记通过。

用户明确允许后的真实受控子Agent：本机合成模型向正式Codex发送其实际声明的 `multi_agent_v1.spawn_agent`（namespace由现有Chat适配器恢复），没有外部模型请求、没有仓库任务委派。root回合已completed时child仍在等待本机响应；原生spawn输出为pendingInit，不能当完成。原连接自动收到子线程生命周期；只用 `thread/read` 获取昵称/parent身份，无需resume子线程；释放本机响应后收到child自己的turn/completed。完成证据来自原生通知，不从spawn工具结束或root结束推断。子Agent取消/复用/嵌套仍待。

客户端+执行器 **12/12、0 skip**，日志 `/tmp/cxv-b4-appserver-transport.log`。真实0.169.0执行了实际生产模块（尚无公开入口），本机合成15次请求验证文本/计划completed→in_progress→pending、取消后续发、重启原生resume、原SDK真实todo_list与上述child独立终态，结果[B4真实子线程/执行器回执](./B4-appserver-agents-2026-11-20.json)，日志 `/tmp/cxv-b4-appserver-transport-real.log`、目录 `cxv-b4-appserver-compat-iK9AYs`。没有宣称manager接线、归档/权限/图片、浏览器或活跃卡已经完成。下一笔接manager并保留原archive、审批与队列安全，再公开显式CLI选择。

E3本地提交：`f401587`。

## B4.7 E4 manager、队列与双向归档恢复

manager内部可显式选择transport=appserver，默认仍exec；尚无公开CLI/HTTP选择入口。配置不支持值在注册实例前拒绝；有在执行/排队任务的实例拒绝切换传输，不能因失败重发输入到另一个执行器。reset/resume保留已选择kind并释放旧实例拥有的stdio进程；原代次、proxy等待、队列回执与process ownership继续复用。计划中的in_progress只在AppServer已证实的原生计划中使用，exec的未完成boolean仍不猜执行中。

sdk-adapter承接原生工具/协作的codex_tool原始输入输出，子线程正文不混到MainAgent；主日志继续保持source=sdk、metadata.sdk=openai-codex-sdk、精确cwd/thread/instance，再附transport来源，旧历史校验规则不放宽。上游依据仍为0cde7d1df8/2914d6479d任务状态与重连、975313773a代理卡的协议前置；没有整条完成结论。

SDK/CLI/所有权/队列/工作区/新客户端与原生manager **66/66、0 skip**，日志 `/tmp/cxv-b4-manager-integration.log`。真实Codex0.169.0/正式SDK0.142.5、本机合成21次请求：实际manager的原生计划/usage/正文、exec/native队列隔离、取消park、同线程send-now与忙碌切换拒绝通过。用真实V2 writer与readSdkResumeHistory生成并读回合成归档，exec→AppServer、AppServer→exec均保留原生threadId及原显示历史后仅发送新输入成功；未转换真实用户日志。结果[B4 manager/归档回执](./B4-appserver-manager-2026-11-20.json)，日志 `/tmp/cxv-b4-manager-archive-real.log`、目录 `cxv-b4-appserver-compat-SeoxaX`。

当前AppServer服务器请求仍由执行器显式拒绝（不会自动批准或静默悬挂），request_user_input沿用现有禁用策略；**审批路由/重连/取消、结构化图片与完整选项兼容补齐前不开放CLI入口**。本笔不冒充这些未完成项通过，下一步补审批准入及图像结果保留，然后公开显式渐进选择。

E4本地提交：`820c662`。

## B4.8 E5 原生审批与问答的实例归属

本笔是已确认AppServer渐进适配的准入子项，非新增界面。源码依据为固定上游 `84e65cddc6` 的attach恢复、`2914d6479d2845e0b193ba1c09aa6667c66850a6` 的按会话重连边界及现有Codex TUI bridge完整服务器请求/问答投影链路；审批描述函数原样抽到 `codex-server-request.js` 复用。现有AskQuestionForm、审批组件的DOM/CSS没有重设计。

每个实例/进程代次独占待审批表，浏览器使用随机native_标识，与原生RPC数值/字符串ID和工具卡itemId分离。根线程精确匹配；子线程必须经只读thread/read逐层证明原生parent属于该根，同cwd不足以授权；循环/超深/异代拒绝。命令/文件批准映射accept或acceptForSession，受availableDecisions限制；permissions只授予原请求profile，超时/取消不授予权限。未知服务器请求拒绝，容量/超时有界。重连重放同一待办，结束/中断/重置/断线释放所属请求，旧nonce无法响应重启后复用的RPC ID。

原生request_user_input沿用现有表单；按question id保留多选数组，取消发送空answers，不虚构答案。根问答先投影待答工具卡，结果进入原SDK消息/工具归档契约；子问答不混入MainAgent正文。exec仍保留原禁用flag，native可以服务其真实问答请求。服务端和Provider给晚挂载/重连消费者重放；卡片别名只作渲染绑定，后端不接受可猜的itemId替代随机请求标识。

验证：全量 **1443/1443（5+264+968+206）、0 skip**，日志 `/tmp/cxv-b4-approvals-full.log`；之后成功回执分支修正由真实HTTP/WS回归 **8/8** 验证，日志 `/tmp/cxv-b4-approval-ws.log`。真实loopback WS测试覆盖command/file/permissions、问答答复/取消、断线重连、同名工作区拒绝代答、原生ID重复、只出现一次正确成功回执；单测覆盖权限profile、超时、原生主动解决、所有权未决时清除、不可变快照、UI发送失败无授权。最终新生产安装694文件、202 Web资产和关键源码逐字匹配，170/170运行时（覆盖最终修正）、B1.2合成回归及隔离CLI相对--cd启动通过，见[B4审批安装回执](./B4-approvals-install-2026-11-20.json)。

真实Codex0.169.0/SDK0.142.5+本机合成25次请求通过，含真实原生问答答B/空answers取消、实例拒绝代答及tool_use/tool_result归档，见[B4审批协议回执](./B4-appserver-approvals-2026-11-20.json)。仍未产生真实命令/文件/permissions审批，相关协议覆盖来自fake stdio+真实manager/HTTP/WS；无外部模型网络、真实用户凭据或日志操作。

Safari实测当前构建+隔离fake native CLI：刷新恢复同一待答；B提交返回原生B答案；取消返回空answers；命令审批拒绝返回decline。GUI发现并修正随机RPC标识与工具卡不相等导致的双表单挂载，以及服务端成功后误报拒绝的条件分支；复验仅一份表单、无错误提示。截图已核看，未改布局/CSS。可复跑 `node cc-viewer-alignment/probes/b4-tasks-gui.mjs --native-asks`；最终隔离目录 `cxv-b4-tasks-gui-tntmHO`、自有进程83221已停止。未宣称窄视口/物理移动端、自动托管或所有原生审批真实模型验收。

构建首次因并行期间后端输入更新时间晚于Web index被assemble防旧产物检查拒绝；冻结产品源码后重建通过，未绕过检查。下一笔为图片结果保留与完整选项准入，再开放显式CLI；活跃卡、慢请求/错误等B4其余子项继续，不整体标B4完成。

E5本地提交：`6102667`。

## B4.9 E6 结构化工具图片准入

复核上游 `fc68e850f23ad28a453eb5219c8113c7165086f9` 图片链的实际diff、当前ToolResultCore/Builder/View与原生bridge的appendToolResultMessage；本地已有安全图片解析/预览/大图预算，直接复用，不新建渲染器或修改DOM/CSS。Codex0.169生成schema的MCP result.content和dynamicToolCall.contentItems分别使用MCP image/data/mimeType与inputImage/imageUrl，不能当字符串JSON交给图片提取器。

SDK adapter将通过原有安全解析器的图片块规范到已有source/input_image形态；保留数组里的文字与其他内容，普通文本/对象/无有效图的数组沿用原JSON。manager工具结果进入canonical transcript时保留结构化块；TOOL行仍保存完整原始MCP结果（含structuredContent）及native item。dynamicToolCall使用其真实工具名/arguments/contentItems，保留rawItem；SVG、无效base64、file/javascript URL不扩大支持范围。

针对SDK/原生manager/传输 **20/20**，原图片pipeline/UI约束与历史 **18/18**、0 skip，构建通过；日志 `/tmp/cxv-b4-native-images.log`、`/tmp/cxv-b4-image-pipeline.log`、`/tmp/cxv-b4-images-build.log`。真实Codex的隔离本机MCP返回1px PNG，原生工具输出及主会话结构化tool_result同时保留；不以fake事件代替该协议验收。MCP fixture声明真实readOnlyHint/idempotent等属性，仅返回固定图，没有shell/网络/仓库操作。

探针发现旧SDK参数解析把数组 `-c mcp_servers.fixture.args=[...]` 当字符串，导致配置加载失败；E6未扩大到选项解析，失败样本 `cxv-b4-appserver-compat-DXkgmk`/`FiO3AD` 保留。当前MCP验证使用临时CODEX_HOME/config.toml的原生数组；下一独立笔在原生路径把配置交回Codex原生解析。MCP无只读标注时被never策略拒绝，样本 `mSbMPn` 保留，未自动放宽审批。真实dynamicToolCall图片、图像浏览器新GUI、其他平台仍待；已有图片UI布局未变化，不宣称重新验收。

最终真实CLI+本机MCP/合成模型 27次本地请求通过，连同此前计划、问答、归档双向恢复及真实child独立终态一起验证，见[B4图片协议回执](./B4-appserver-images-2026-11-20.json)，临时目录 `cxv-b4-appserver-compat-KNLZMc`。没有外部模型请求；本笔不重新宣称全仓测试/生产安装已重跑。

E6本地提交：`3576cf8`。

## B4.10 E7 原生配置/选项边界

这是已确认原生执行器的必要Codex差异适配，不把新的Claude上游候选勾完。读取实际Codex0.169 app-server --help、生成ThreadStartParams/AskForApproval schema、SDK参数解析/工作区默认值/恢复链路和E3配置序列化后，原生-c覆盖值直接作为argv交Codex解析，不再被旧SDK标量解析/二次引号改变。数组、内联表、转义和TOML原生literal fallback保持；已有exec路径继续原行为。原生配置不重复写thread/start/resume JSON，避免E3已证实的工具丢失。

工作区启动继承原生配置覆盖值，不继承初始cwd/resume/prompt；新覆盖值在继承值之后，显式thread参数保持优先。原生-c model不被继承-m遮蔽；--search的派生配置在原生覆盖值后生效。resume保留原覆盖值。新增处理--enable/--disable，保留--之后字面提示词。参数/配置键校验在注册实例前执行。

原生目前支持-m/--model、-C/--cd、-s/--sandbox、-a/--ask-for-approval、-c/--config、--search、--enable/--disable，以及现有skip-git/bypass/full-auto兼容入口。0.169原生schema只接受untrusted/on-request/never，旧full-auto在原生模式映射workspace-write/on-request，exec原行为不动。不支持的--profile/--image/--add-dir/review及未知选项明确400，不能静默成为提示词；--add-dir尚不能可靠合并持久配置的writable_roots，因此要求使用Codex原生配置，不宣称完整选项对等。

SDK/原生传输/工作区/HTTP/WS回归 **77/77**；最终补充空key/非法sandbox边界 **16/16**，0 skip；构建通过。日志 `/tmp/cxv-b4-native-options.log`、`/tmp/cxv-b4-native-options-final.log`、`/tmp/cxv-b4-options-build.log`。真实Codex本机27次请求通过，新增直接-c传MCP args数组和--disable，原来E6加载失败的同类参数在原生路径成功加载真实MCP图片；问答、计划、队列、双向归档恢复及真实child独立终态仍通过，见[B4原生选项回执](./B4-appserver-options-2026-11-20.json)，目录 `cxv-b4-appserver-compat-0cPnn5`。

没有修改用户配置、真实日志或默认执行器，没有宣称exec数组解析/真实profile/图片输入/追加目录等兼容已完成。下一笔开放显式CLI选择并完成隔离启动/恢复/安装验证；活跃代理卡和B4其余子项仍待。

E7本地提交：`400a27b`。

## B4.11 E8 显式渐进入口与最终安装检查

按已确认方案开放 `cxv --sdk --sdk-transport=appserver`，支持分开的--sdk-transport appserver和显式exec；--sdk/-SDK未选择传输仍exec。CLI传输选择透传既有launchConfig，新工作区继承，历史恢复继续原生threadId与SDK archive契约。原生不可用时明确失败，不悄悄切PTY。所选传输没有新增UI开关/布局。

复用cli-args的已知带值选项表，Viewer标记在--之前提取，-c/-m等的值不误识别；--之后完整保留作字面prompt。缺值、非法传输、重复选择、无--sdk的传输标记明确拒绝。原生参数预检在注册工作区、开浏览器和执行模型之前完成。README记录入口与实际支持范围，profile/image-input/add-dir/review仍按E7明确拒绝，不宣称全CLI对等。

全量 **1449/1449（5+264+974+206）、0 skip**，构建通过；日志 `/tmp/cxv-b4-native-cli-full.log`、`/tmp/cxv-b4-native-cli-build.log`。真实子进程CLI测试 **7/7**（含已有exec默认）：原生精确历史选择先恢复后发送、-c数组原样传递、--后同名标记不剥离、新工作区继承传输、原SDK历史前缀保留，以及非法参数在副作用前失败。日志 `/tmp/cxv-b4-native-cli-final.log`。测试fixture首跑因覆盖脚本遗漏shebang及错误假设launch响应含transport而失败，已分别恢复真实可执行fixture和从正式sessions API检查；没有据此改产品API。

实际生产CLI+真实Codex0.169的本机合成 **28次请求通过**：--sdk --sdk-transport=appserver在临时HOME启动，浏览器打开操作由自有stub截获；真实请求B4 PUBLIC CLI到本机模型并正常settle，sessions API核对所选传输/cwd/thread。其他原生计划/问答/MCP图像/受控child及双向归档探针同次通过。见[B4显式CLI回执](./B4-appserver-cli-2026-11-20.json)，目录 `cxv-b4-appserver-compat-h0pUja`，日志 `/tmp/cxv-b4-native-cli-real.log`。没有外部模型或真实用户配置/日志操作。

最终全新生产安装694文件、202 Web资产及关键源码精确字节一致，**183/183运行时**（含正式SDK CLI恢复/新原生CLI测试）、B1.2合成回归与隔离相对--cd CLI启动通过，见[B4原生CLI安装回执](./B4-native-cli-install-2026-11-20.json)，日志 `/tmp/cxv-b4-native-cli-installed.log`。

当前不是B4收口：下一独立笔为原生子Agent权威生命周期快照，再按固定975313773a原ActiveAgentsBar的DOM/CSS接卡片；慢请求/错误/其他候选继续逐项读取。真实命令/文件/permissions审批、真实dynamic图片、子Agent取消/复用/嵌套、外部慢网/模型、物理设备和其他平台仍未验证。没有推送GitHub。

E8本地提交：`65729db`。

## B4.12 E9 原生子Agent权威生命周期与重放

重新读取固定 `975313773a2edfcd0f8f640cdfe4c1681048f954` 实际组件/样式/ChatView diff、最终ActiveAgentsBar/activeAgents/sdkTaskTracker与真实0.169子线程帧。原基线按真实任务生命周期显示、只读、不再头像过滤；本笔先实现其原生数据前置，没有迁入卡片UI。

新增实例/传输代次所属 `sdk-appserver-agents.js`，只保存已证明属于根线程且有原生subAgent.thread_spawn身份的子线程。使用原生nickname/role，无文本前缀猜名或默认teammate判断。成功spawn回执仅可seed pending，own turn/started才运行；root结束、idle、等待工具或spawn工具结束不能替子Agent宣布完成。own turn/completed/closed才移除活跃行，旧turn终态/重复spawn不能复活或结束新轮次。实际子Agent工具started决定标签，原生startedAt秒转毫秒决定计时；快照/连接不重置开始时间。新root prompt只重置根任务，不清后台child；reset/断线关闭原代次表，迟到metadata不能复活。

状态表256条（优先回收终态）、历史turn tombstone64，所有权工作队列1024/16MiB，只排生命周期字段，不留子正文/图片；超限available=false并清不完整活跃表，不干预模型执行。WS精确已授权实例连接重放 `sdk-agent-snapshot`，exec得到空表。子正文仍不混入MainAgent。

单元/原生manager/传输/真实HTTP/WS **25/25**、最终更新的HTTP/WS **8/8**，0 skip，构建通过，日志 `/tmp/cxv-b4-agents.log`、`/tmp/cxv-b4-agents-ws.log`、`/tmp/cxv-b4-agents-build.log`。覆盖后台child在root idle后仍活跃、快照不可变、真实WS断开重连时间/昵称不变、异实例无child行、精确child终态、嵌套/复用/中断（后3者仅合成）、异根/非agent fork拒绝、所有权未决清除与有界失败。

真实Codex+本机MCP/模型 **33次本地请求通过**，新增实际manager子Agent：root已idle，child执行本机固定图MCP工具后继续等待；快照原生昵称Pauli、原生启动时间与实际fixture.image工具标签正确，另一个实例无child；再跑root下一轮，child仍在；释放child响应后自己的terminal使活跃表消失。该处重放时间断言来自manager getter，不冒充真实CLI+浏览器重连；真实WS重连来自上述fake native CLI+正式HTTP/WS。见[B4子Agent状态回执](./B4-appserver-agent-state-2026-11-20.json)，目录 `cxv-b4-appserver-compat-nFA7sD`，日志 `/tmp/cxv-b4-agents-real.log`。

仍未验证真实child中断/复用/嵌套、外部模型或物理/其他平台；本笔没有卡片GUI、全仓/新安装重跑宣称。下一笔按原DOM/CSS迁ActiveAgentsBar，最终再做完整构建/安装和Safari验收。

E9本地提交：`d04fd15`。

## B4.12a 全量回归的测试回执时序修正

E10卡片实现和Safari验收已完成，当前仍未提交。首次并行全量 backend 979项中9项失败，原始日志保留 `/tmp/cxv-b4-agents-ui-full-first.log`。根因两处：默认拒绝测试在建立订阅前可能已经收完reply-seen，固定30ms不能证明收到回执；工作区SSE测试直接取下一条stream-progress，有时先取到SDK自动todo进度，首例失败后其余依赖已关闭工作区的用例连带失败。没有据此改生产逻辑。

测试fixture新增只读last-server-response回执，原生stdin顺序证明默认拒绝已收到且全程无subscriber；SSE inbox按type+测试marker匹配，真实SDK自动进度仍留在队列，最终scope断言继续验证不串实例。针对 **13/13、0 skip**，日志 `/tmp/cxv-b4-receipt-tests.log`。本笔只提交测试和记录；E10产品/UI改动仍待最终全量/新安装验证后单独提交。

回执测试修正本地：`61e1701`。

## B4.13 E10 原活跃代理卡与实例快照

固定上游 `975313773a2edfcd0f8f640cdfe4c1681048f954` 的实际diff、最终ActiveAgentsBar/完整CSS、activeAgents、sdkTaskTracker与ChatView调用链均已核对；2914d6479d的旧头像/聚焦版本已被替换，不搬回旧交互。复制最终卡片的全部渲染DOM、折叠、读屏、1s时钟和完整CSS；CSS逐字相同，SHA256 `52762ae1a8ab4629913b5680d3091e90a4c695848bb315f428a3e2c122a58a27`。const visible以后的组件源码逐字相同（包括Row），SHA256 `e92526d912357dd79592188400d28abd5a280bb08631153f57af2437338f670f`，见[源码核对回执](./B4-agent-card-baseline-2026-11-20.json)。原18语言标题词条直接迁入。

必要适配只有数据所有权/身份：snapshot prop替换Claude模块级taskStore和提示词join。E9已证明原生线程名称/父身份/开始时间，故不再猜Agent/Task工具描述前缀，不杜撰Teammate。Provider沿用task缓存模式给晚挂载消费者重放并在断线/换socket清空；ChatView按精确instance/卸载状态拦异作用域。卡片仍放对话右上、空/有记录两个分支，40px/48px折叠占位直接抄原CSS；角色筛选/历史pin/本地历史时隐藏，结束自动隐藏，无avatar过滤。

Web **267/267**；最终全量 **1457/1457（5+267+979+206）、0 skip**，构建通过，日志 `/tmp/cxv-b4-agents-web.log`、`/tmp/cxv-b4-agents-ui-full.log`、`/tmp/cxv-b4-agents-ui-build.log`。真实组件/hook宿主验证顺序、pending不显示工具/时间、running显示实际工具/耗时、折叠释放计时器、只读行、空/有消息分支、角色/旧历史互斥和断线快照；首跑测试宿主未open Provider却预期watchdog，已让fixture按真实连接状态启动，未改产品代码。全量时序失败另见B4.12a，重跑最终全部通过。

真实Safari当前构建+隔离fake native CLI `cxv-b4-tasks-gui-r2PrO4`：右上340px原卡片显示Native Child/fixture.read/持续耗时；header折叠与展开；角色筛选隐藏、关后恢复；同名B不显示A、切回恢复；root下一轮不清child；刷新1m9s而非归零；mobile=1强制布局显示；真实stopViewer/startViewer断线后自动重连仍为1m46s；释放child自己的terminal后自动隐藏。实际截图已核看。最初页面是旧fixture遗留bundle，仅自动重连换了instance，完整刷新载入当前hash后完成验收，没有据此改产品。自有47661已停止，没有外部模型/真实用户日志操作。宽桌面+强制mobile不冒充窄视口或物理移动设备，真实Codex producer证据来自E9本机33请求，不能冒充本GUI用了外部模型。

最终全新生产安装695文件、202 Web资产及关键源码精确字节一致，**188/188运行时**、B1.2合成回归及隔离相对--cd CLI通过，见[B4卡片安装回执](./B4-agent-card-install-2026-11-20.json)，日志 `/tmp/cxv-b4-agents-ui-installed.log`。

仍不整体勾选975313773a/2914d6479d的混合提交或B4。对照接线时确认现有RoleFilterBar仍为旧内联布局，未达到d906edb3de的浮层玻璃样式，已记待纠偏；这笔只接卡片互斥，不顺带重排角色条。下一独立笔修正该已知样式差异，然后继续错误/重试/慢请求等候选。真实child中断/复用/嵌套、真实命令/文件/permissions审批与dynamic图片、外部模型/慢网、物理/其他平台仍未验。

E10本地提交：`f29f9b3`。

## B4.14 E11 角色筛选玻璃浮层纠偏

实施前读取 `d906edb3de840208944bbca9d33ec037bdeb6bc5` 实际diff及固定快照完整RoleFilterBar组件/CSS、ChatView接线/补偿规则，并核对975313773a后续卡片互斥。组件DOM/筛选逻辑本已相同，复用；CSS恢复position:absolute顶部浮层、41px高度、原--bg-glass/blur20px/saturate180%与实色chip；ChatView补原withRoleFilter滚动区41px padding，并采用原先角色条优先/代理卡次之的互斥class选择。

完整RoleFilterBar CSS除已有Codex单色avatar颜色规则外与固定快照逐字相同；该规则/组件data-model-monochrome来自本地既有Codex图标适配，未新增界面。见[样式回执](./B4-role-glass-2026-11-20.json)。没有重排按钮或修改交互，也不把Active Skills scope等d906混合子项标完成。

Web **267/267、0 skip**，构建通过，日志 `/tmp/cxv-b4-role-glass-web.log`、`/tmp/cxv-b4-role-glass-build.log`。Safari当前构建+隔离fixture `cxv-b4-tasks-gui-4Sy98C`：角色条浮于对话顶部、41px占位不遮第一行、chip可选Codex隐藏用户、滚动长对话时条保持顶部；打开角色筛选隐藏子Agent卡，关闭恢复Native Child/fixture.read/持续耗时。两张实际截图已核看；自有20547已停止。没有真实模型/日志操作；本笔仅3个产品样式/接线文件，不重复宣称全仓或新安装重跑，沿用E10检查点1457/188的范围。

E10标记的角色条待纠偏项已修复；下一独立笔继续错误/重试/慢请求等B4候选的源码核验与最小适配。


E11本地提交：`9e35157`。

## B4.15 E12 scratch 输入区原始状态与可见性

实施前读 `9dbf4e295a08e472c0b15cfb66de1cc80c77cfa3` / `3d65bedcd1b47a8de7f0ff1bdfec3a11efbc9fa0` 实际diff、后续ChatInputBar历史及固定快照有效guards/hooks/ChatView调用链；完整本地组件与CSS、App的开关/portal链路亦已读取。B2 `41d95af54189cfaa9d0816244ec1ae7366d43939` 已通过给子组件强制false保留SDK输入区，但也屏蔽了真实terminalVisible驱动的录音abort和测量effect。现按基线传入真实terminalVisible及独立sdkMode，仅早退和ctxBarSlot采用 `terminalVisible && !sdkMode` 门控；原录音/测量effects保持原始信号，没有新增DOM或CSS。

同步复核 `1bfc1585e833d037a7dab6fe23e5a8c0aac48c08` 实际diff与最终App：B2全局 `cxv_sdkScratchOpen`（必要品牌key适配）、默认关闭、存储失败回落、Header与右侧箭头共用handleToggleTerminal均已实现。复用既有sdkScratchOpen与2项存储测试，没有重写或更换偏好key。该独立功能的运行行为已核对，changeset/history发布元数据仍按B11处理。

Web **267/267、0 skip**，构建通过，日志 `/tmp/cxv-b4-composer-web.log`、`/tmp/cxv-b4-composer-build.log`。Safari载入当前构建+隔离fixture `cxv-b4-tasks-gui-iCbUwe`：Header展开真实scratch zsh，输入框/上下文0%条均保留；刷新仍展开，输入框可编辑；清空测试草稿并关闭，再刷新仍关闭。截图已核看，自有59710已停止。没有执行shell命令或采集语音；真实录音abort未实例化验证，源码分支逐字同上游。见[核验回执](./B4-scratch-composer-2026-11-20.json)。本笔未重跑全仓/新安装，不扩大E10检查点1457/188的覆盖范围；B4错误/重试/慢请求等继续。


E12本地提交：`8d6dafd`。

## B4.16 E13 按所属实例广播最终失败

实施前读取 `9b1bb4e729473360cbe60e508f0558a702370a08` manager/CLI/server实际diff，及固定快照_notifyQueryError/_notifyTurnError、84e后续重试分类和主动中断豁免；追踪本地CLI→registry→exec/native→_processEvent/_emitErrorEntry→WS完整链路。现复用已有实例broadcastWs与严格sdkScopeMatches，不复制上游另一套全局onQueryError callback。最终失败从会话closure携带cwd/sessionId/instanceKey广播；还没建线程时sessionId=null，不能借活动实例身份。archive无callback时仍广播且terminal只标一次，原durable error entry/_sdkFeedback保留。原SDK临时error/retry notice仍等terminal，后续成功不会误报警；真实AbortSignal标识的主动Stop不弹sdk-error，历史仍记录中断。

针对 **24/24、0 skip**，正式HTTP/WS实例化包含在内：两条同名连接，创建线程前进程code7与turn.failed都只到所属socket，使用同socket barrier证明无异实例漏报及重复；native失败无archive callback仍一次；原临时retry后成功/失败/进程退出、主动exec/native中断、任务/代次回归通过。日志 `/tmp/cxv-b4-error-frames.log`；构建日志 `/tmp/cxv-b4-error-frames-build.log`。没有添加新UI、重试按钮或重发输入；持久错误条、可重试事实分类/慢请求继续后续独立笔，不整体勾选9b1或84e，也不宣称外部模型/慢网验收。


E13本地提交：`0d5732d`。

## B4.17 E14 原持久错误条与合成反馈投影

先读 `9b1bb4e729473360cbe60e508f0558a702370a08` 全部ChatView/manager/CLI/server实际diff，`88995a10461973689656841a8476ee4e6c60281b` 宽度、`ee3545344eff8c9969f6de63631d2181844cbfb0` recovering、84e后续重试及固定快照最终渲染/CSS；同时追踪本地三个messageList分支、输入/UltraPlan/send-now路径、componentDidUpdate、完整conversationEntryNormalize/时间戳/归档前缀链。先迁独立非重试错误展示；retry/recovering仍待协议事实，不迁一个不能兑现的按钮。

复用原_clearSdkErrors/_renderSdkErrorAnnouncer/_renderSdkErrors的基础DOM/计数/时间实现，加入最终版本title/aria-label；最多3条不同错误，同文移尾并×N计数。完整sdkErrorStack/Empty/Row/Count/srOnly/Ts CSS与固定快照逐字相同，800px上限、20px侧留白、12px字体/6×12 padding等不重设计，见[源码回执](./B4-error-row-baseline-2026-11-20.json)。原18语言ui.sdkError逐字迁入。所有列表分支尾部渲染、固定挂载最新错误读屏区；stickyBottom才跟随。明确发送成功、队列send-now、会话/视图边界清除；自动queue-state/streaming running不清除。必要差异：本地已采用实例keyed根和严格URL/socket路由，继续此已验证边界，不复制上游宽松basename守卫；没有发送成功时保留错误说明和草稿。输入区仍是现有普通文档流，floating-composer属于其他待核候选，未复制不适用的空状态overlay spacer。

首轮Safari发现旧SDK合成 `Error: …` 助手反馈与错误条重复，未把截图记作最终通过。归档/续接必须保留该Viewer反馈与累计位置，故在既有conversation投影处只为明确_sdkSource/status>=400/stop_reason=error/error.message结构打上既有_sdkFeedback，ChatView跳过此标记。原始request/detail/归档字节、累计messages及时间/前缀不删除或重排；已有后续_sdkFeedback同样不伪装模型输出。若前条真实assistant碰巧同文，不重标或吞掉它；正常模型以Error:开头仍展示。没有按文本猜失败。刷新和历史视图中仍按原错误条清理约定，不恢复失效失败操作；原始失败在网络详情/归档中保留。

最终Web **270/270**，末笔渲染/前缀针对 **26/26**；全量 **1462/1462（5+270+981+206）、0 skip**，构建通过。日志 `/tmp/cxv-b4-error-ui-web.log`、`/tmp/cxv-b4-error-ui-targeted.log`、`/tmp/cxv-b4-error-ui-full.log`、`/tmp/cxv-b4-error-ui-build.log`。真实组件执行验证去重/顺序/上限/作用域/最新读屏、空与有消息尾部、失败发送保留/成功发送与恢复清除、真实模型错误文字不隐藏、Viewer反馈不重复；投影无原始数据突变且历史前缀/时间戳回归通过。

Safari当前构建+隔离fake native CLI `cxv-b4-tasks-gui-GbnuHs`：空对话底部原错误条、重复×2/最多3条、B-only错误不落A、从输入框发送清旧、native真实传输failed终态显示当前行、切工作区清理通过。纠正反馈投影后重新加载当前bundle并再发失败，等待SSE入库/Stop消失，截图确认只有800px错误条、没有合成助手重复气泡；自有92755已停止。没有外部模型请求或真实用户日志操作；窄屏/物理设备、真实模型失败恢复仍未验，不扩大GUI范围。9b1/889功能子项已核对，changeset/history等发布元数据仍归B11；ee354重试中隐藏整行与84e重试/probe仍待。

最终全新生产安装 **695文件、202 Web精确字节、190/190运行时**、B1.2合成回归与隔离相对--cd CLI启动通过，见[B4错误条安装回执](./B4-error-row-install-2026-11-20.json)，日志 `/tmp/cxv-b4-error-ui-installed.log`，目录 `cxv-b3-runtime-s7xkvc97`。下一笔核实Codex原生失败/重试事实，保持无自动重发、无按文本推断。


E14本地提交：`ba06166`。

## B4.18 E15 原生错误事实与轮次身份保真

继续以固定 `84e65cddc629e8b442e866c303883444901d5c19` 实际manager diff/最终_notifyTurnError、RETRYABLE_STATUS、_retryInterruptedTurn/server directed rejection为前置；Codex无同一Claude api_retry字段，先核实实际二进制与完整本地transport数据流再适配。0.169自身生成的ErrorNotification schema只有error/threadId/turnId/willRetry，没有attempt/max结构字段；TurnError包含codexErrorInfo/additionalDetails/misalignment。真实探针用隔离HOME与loopback Responses本机503，request_max_retries=0、stream_max_retries=1：一次503后成功确实有willRetry=true、结构化responseStreamDisconnected.httpStatusCode=503；持续503最终failed，其结构化错误为httpConnectionFailed.httpStatusCode=503。不能只支持responseTooManyFailedAttempts或解析“Reconnecting... 1/1”来猜协议。

本笔原生transport保留error对象/willRetry及thread_id/turn_id，最终failed保留原生status和整个TurnError，不再只剩message；原根线程/精确turn过滤、preaccept排队与已有SDK事件shape继续。只添加结构字段，不推断retryable、不重发任何输入、不新增UI。本机真实400经实际模块后仍能读到codexErrorInfo=other、willRetry=false及同轮次ID，成功/中断也有真实ID；exec未变。误对齐风险（次数字段缺失）已通过交互工具询问用户文案选择，未在答复前改自动重试行。

针对 **24/24、0 skip**、构建通过，日志 `/tmp/cxv-b4-error-metadata.log`、`/tmp/cxv-b4-error-metadata-build.log`。真实Codex0.169/SDK0.142.5本机 **27次请求通过**，无子Agent、无外部模型，见[原生错误回执](./B4-appserver-errors-2026-11-20.json)，目录 `cxv-b4-appserver-compat-uL4kH4`，日志 `/tmp/cxv-b4-errors-real.log`。其中503恢复/耗尽各2次请求，测试没有以文案解析验证次数。其他计划/问答/隔离/中断/双向归档回归同次通过，不重新宣称MCP图片/child/公开CLI验证。上一笔E14全量1462/新安装190仍是对应提交检查点，本笔未重复全仓/新安装或GUI，因为尚未改变UI。下一笔按已证实字段建立错误/重试管理，再接原UI；活性probe和慢请求仍待。


E15本地提交：`41e379f`。

## B4.19 E16 最终失败的原生事实分类

沿用已读固定84e实际diff/最终RETRYABLE_STATUS与_notifyTurnError，以及E15实际0.169 schema/503帧，读取本地完整_executeTurn/_processEvent/_emitErrorEntry/重置及正式WS路由后，把分类限定在本轮原生turn。收到自己的turn.started才记原生ID；只有同thread/turn的willRetry=true证明发生过原生重试。最终failed必须是同一轮、带明确网络CodexErrorInfo（四种原生HTTP/stream变体）且状态为null或上游原Set的429/500/502/503/504/529，才把retryable=true写入所属sdk-error；不按错误文本/次数字符串猜测。401、未知other、非法状态、只看到最终失败或外轮retry均不可重试。每轮reset清观察记录，已成功/主动中断不遗留错误。最终原生TurnError同时保留在原durable response.error，原message与_sdkFeedback契约保留。exec和无原生终态的进程级失败仍无捏造分类。

本笔只提供错误帧事实，不实现重试操作、不自动重发、不改UI。针对 **29/29、0 skip**，构建通过：七种分类/轮次间重置、真实exec/native流程、正式HTTP/WS同名隔离与既有审批重连回归。日志 `/tmp/cxv-b4-error-classification.log`、`/tmp/cxv-b4-error-classification-build.log`。真实Codex+loopback **32次请求通过**，实际manager503重试耗尽带503/真实turnId/retryable=true；另一个503先失败后恢复不报警，后续真实400(other)不可重试，轮次ID不同，raw TurnError已进归档；同次计划/问答/中断/双向归档通过。见[分类回执](./B4-appserver-failure-classification-2026-11-20.json)，目录 `cxv-b4-appserver-compat-5CIHUV`，日志 `/tmp/cxv-b4-error-classification-real.log`。没有子Agent/外部模型网络或真实日志操作；真实手动续接/其余审批等不据此标通过。

下一笔在已证明的失败身份上实现上游手动continue契约；自动重试显示文案的交互选择仍待用户答复，不擅自采用一种。没有据此标84e整条或B4完成，最近全量/新安装检查点仍为E14的1462/190。


E16本地提交：`2eaa414`。

## B4.20 E17 SDK整轮loading复用审计与新发现

核对固定 `c4529a6ed7a81c7ddd4564915735a06e123890ab` App/AppBase/Mobile/ChatView实际diff和最终84e的Stop/heartbeat/stale修复。上游为Claude单API间隙另建turnActive；本地B2 `41d95af54189cfaa9d0816244ec1ae7366d43939` 的_executeTurn从运行前到finally整轮发送active/idle（包含工具/审批等待），startStreamingStatusTimer在SDK直接return，因此SDK不会被单API inactive灭灯。SSE connect从精确instance的getSdkStreamingState重放，AppBase活跃即亮/idle延迟2s，ChatView和Stop共用uiStreaming。此子项已存在，按复用阶梯不另建第二套turnActive/30s计时器；PTY/活动探测/lost-result仍是其他子项，不能整体标c452或84e。

Safari当前构建+隔离exec fixture `cxv-b4-tasks-gui-ZX7AIz`：hold首次任务后无后续SDK输出，至少 **138848ms** 后才释放；A busy=true、同名B busy=false，B没有Stop；切回A、刷新、强制mobile=1都保留Stop。静默时输入queued during quiet B4进入服务端队列；释放后两条各发一次、队列清空/Stop回发送、两实例最终idle，见[复用回执](./B4-turn-loading-reuse-2026-11-20.json)。自有48596已停，无外部模型或真实用户日志操作；不宣称窄屏/物理设备/真实长时间模型运行。已有正式HTTP/WS与native长等待结构回归见E9/E16，本笔仅审计无产品修改，未重跑测试/构建。

验收同时发现**待纠偏**：第二条入库后实时streamingLiveItem仍残留，显示重复回复与cursor；Stop已正常变发送，连续两次AX检查仍在。原始final V2 snapshot保留于fixture根quiet-final-snapshot.jsonl（SHA在回执），该发现不能被loading通过掩盖。本地stream-progress handler检查final仅在收到帧时，rAF/startTransition提交与V2最终条目之间存在未核竞态；这里只记录观察和初步线索，不将线索当已证实根因。下一独立笔优先重现实测并对照固定上游数据流纠正残留浮层，再继续手动重试/慢请求；自动重试文案选择仍待用户。


E17本地提交：`3c72b4a`。

## B4.21 E18 最终条目与实时浮层统一清理

E17发现后，读取固定AppBase._onStreamProgress/_flushPendingEntries源码、相关原diff（5c28d4c50a952110c32b04922cee56bdf9bd8560按channel迁移前后均保留“final entry清overlay”的契约），并核对7641实际改动是lost-result/attach buffer，不把它误认成本修复。追踪本地控制SSE→rAF/startTransition、V2_live→投影→_flushPendingEntries、V2首次快照→_runSseColdIngest→_commitColdIngest完整流程。

有两个独立时序但属于同一最终提交契约：收到流式帧时尚无final，绘制前/React transition重放时final已存在；以及首次会话尚无archive时，stream overlay已绘制，随后V2重试快照一次冷提交最终条目，原冷入口未清overlay。先用真实bundled AppBase宿主分别写复现，修改前均失败，日志 `/tmp/cxv-b4-overlay-race-before.log`、`/tmp/cxv-b4-overlay-cold-before.log`。仅补rAF检查的首轮虽全量1464通过，Safari `cxv-b4-tasks-gui-lOV4vR`仍复现，故没有标修复完成；再补冷入口并重跑最终验收。该失败记录保留，测试通过不代替GUI结果。

最终实现只在两个实际state commit处复用既有“相同timestamp且!inProgress即已最终化”判据：流式低优先级更新使用functional setState现场判断；冷提交也在functional updater原子清除对应overlay。若是另一个仍运行回合，保留实时内容；不按全局idle或固定超时隐藏，不删除归档/回复、不改DOM/CSS/按钮位置。沿用现有workspace keyed生命周期与V2授权。这是Codex/V2接线的必要清理纠偏，不是整批搬5c28/7641混合提交。

最终Web **272/272**，全量 **1465/1465（5+272+982+206）、0 skip**，构建通过；日志 `/tmp/cxv-b4-overlay-race-web.log`、`/tmp/cxv-b4-overlay-final-full.log`、`/tmp/cxv-b4-overlay-race-build.log`。实际类方法涵盖final在rAF前/transition应用前提交、已绘制overlay后final清理、冷基线含匹配final、不同仍运行轮次保留；沿用冷闸/分页/恢复/实例等全量回归。源码约束测试随atomic updater改为检查新结构，没有降低“React基线提交后才live-ready”约束。

Safari当前构建+新隔离exec fixture `cxv-b4-tasks-gui-czJRdq`强制mobile=1：从空archive启动hold，输入第二条进入队列，释放后等待首次V2冷快照与自动续发落盘，最终截图仅两条持久回复各一次，无第三气泡/残留cursor，Stop回发送。截图已实际核看，自有83521已停；初次失败fixture72383亦已停。见[最终清理回执](./B4-overlay-settlement-2026-11-20.json)。没有外部模型/真实日志/物理设备验证。E17待纠偏浮层项现已修复；自动重试文案仍待用户交互选择，手动续接/活性probe/慢请求等继续，不整体标B4或混合提交完成。

最终全新生产安装 **695文件、202 Web资产精确字节、191/191运行时**、B1.2合成回归和隔离相对--cd CLI通过，见[最终浮层安装回执](./B4-overlay-install-2026-11-20.json)，日志 `/tmp/cxv-b4-overlay-final-installed.log`，目录 `cxv-b3-runtime-15imaom5`。


E18本地提交：`9e7a83a`。

## B4.22 E19 按原失败轮次手动续接（36af884）

实施前重新读取固定 `84e65cddc629e8b442e866c303883444901d5c19` 实际diff/最终RETRY_CONTINUE_PROMPT、_retryInterruptedTurn、server directed rejection及完整本地_executeTurn/错误分类/重置/队列/WS入口与ChatView active-input/历史渲染链。沿用原continue指令（包括原内部sentinel），不重发原始输入；仅原生路径已经观察到同轮重试且最终网络错误可重试时记录失败。手动操作须指定精确turnId，核对sessionId/代次且实例idle/队列空；陈旧/不可重试/切历史/重置/异实例及busy拒绝。启动同步占busy，重复点击不入队，不偷换active实例。所有新输入开始都会替代旧失败资格。

继续指令仍进原生thread和原canonical累计归档，附服务器所属_sdkRetryOf；activeInput附retryOf；ChatView仅隐藏带此结构标记的内部用户指令及其乐观气泡，不按用户文本前缀隐藏普通输入。沿用E14既有投影边界，不改DOM/CSS。原生turn.started才广播recovering的真实新turnId，成功终态广播recovered并引用旧retryOf；失败仍原sdk-error，用户中断广播有作用域的rejected。WS复用sdkActionAnchor，拒绝仅回发起端；没有UI按钮/自动重试状态条改动。

针对 **21/21**（SDK/native/历史）、正式HTTP/WS **10/10**、Web **273/273**、0 skip，构建通过。日志 `/tmp/cxv-b4-manual-retry.log`、`/tmp/cxv-b4-manual-retry-ws.log`、`/tmp/cxv-b4-manual-retry-web.log`、`/tmp/cxv-b4-manual-retry-build.log`。覆盖同线程单次continue、重复点击、auth/陈旧/新输入/重置/恢复/队列拒绝、原记录保留、隐藏元数据与同名WS隔离。测试首轮误取最后tool_result为原用户消息、空history触发原有保护，已修fixture断言与合法历史，未放宽产品校验；日志保留manual-retry-receipt-first。

真实Codex0.169+loopback **33次请求通过**：503失败后明确手动续接只增加1次本机请求，同一thread，原失败turn与新恢复turn lineage精确、duplicate拒绝，原SDK/问答/计划/双向归档回归继续通过；见[续接回执](./B4-manual-retry-2026-11-20.json)，目录 `cxv-b4-appserver-compat-HSuM9a`，日志 `/tmp/cxv-b4-manual-retry-real.log`。没有外部模型或真实用户配置/日志操作，不冒充GUI重试按钮/真实child/其他平台已验。

用户本轮已在request_user_input中明确选择**显示Codex原文**，自动重试条将保持原位置/CSS直接展示原生message，不解析次数或杜撰max。该选择替代此前等待文案的状态；下一独立笔接原重试/恢复DOM、原recovering整行隐藏与终态清理。全量/新安装检查点仍为E18的1465/191，本笔不重复宣称。


## B4.23 E20 原重试按钮与状态行（124ca25）

实施前重读固定 `84e65cddc629e8b442e866c303883444901d5c19` 实际 ChatView/manager 重试 diff、完整 handler/发送/回执/渲染/清理调用链、`ee3545344eff8c9969f6de63631d2181844cbfb0` 整行隐藏修复及 `88995a10461973689656841a8476ee4e6c60281b` 最终宽度。直接迁移原 retry/error DOM、按钮、恢复提示、15s UI 兜底和五组18语言词条；整个 sdkRetryRow/Btn CSS 逐字一致 SHA256 `4bee4b9cf19fb55fdfbf153168f37de31c45b0a5b6cd648bac7486c2d4d13b10`，rows.map 至 render 结束逐字一致 `c4ab28a2198bf888bcb17dad572f364e32cb32a11efa2b61fc5a7a4d8adf66c8`。恢复时隐藏整条失败行，成功按 retryOf 清除该失败，最终再次失败恢复按钮及合并计数。

Codex 必要适配：依用户已选“显示 Codex 原文”，自动状态只用本轮原生 willRetry=true 的原 error.message，不解析/捏造 attempt/max；自动成功也发送同轮 recovered。中断清理进度，15s 仅复位 UI，不终止模型。沿用严格实例路由，迟到其他轮次 settlement 不清当前进度；context facade 可能返回 false，复用现有 sendTerminalSocketMessage 处理 false/throw 并只回滚点击行。没有新增入口、重排布局或改变默认 exec。

针对真实类方法 Web27/27、native9/9；最终全量 **1473/1473（5+276+986+206）、0 skip**，构建通过。初次 Web 断言误期望 JSON 保留 undefined 字段已纠正；首轮全量旧 WS 测试误取自动 retrying 为 rejected，改为明确 phase 匹配，产品协议未降级。日志 `/tmp/cxv-b4-retry-ui-{web-target,native,full,final-full,final-build}.log`。首次 pack 因 CSS 末尾空行清理后未重建，被原新鲜度保护拒绝；重新构建后再验安装，保留原失败 pack.log。

真实 Codex0.169/官方SDK0.142.5+loopback **33次请求通过**，见[B4重试协议回执](./B4-retry-ui-protocol-2026-11-20.json)，目录 `cxv-b4-appserver-compat-flNjm6`。manager 原自动原文“Reconnecting... 1/1”与同轮成功、503耗尽+同thread单次手动续接、400排除、计划/问答/双向归档回归通过。Safari 自有 `cxv-b4-tasks-gui-T9zWrX` 实际输入失败→点击重试→整行隐藏/原恢复提示→释放后单份续接回复；切另一同名实例验证原自动重试文案→释放后提示清除、Stop回发送。已核看截图与AX；首次过期AX索引点击失败后刷新索引成功，未改控件。GUI fixture pid83873已停止。没有外部模型、真实用户日志/配置操作，未据此标真机或其他平台通过。

全新生产安装 **195/195**、695文件/202 Web资源精确字节、B1.2合成回归及隔离相对--cd CLI通过，见[安装回执](./B4-retry-ui-install-2026-11-20.json)，日志 `/tmp/cxv-b4-retry-ui-final-installed.log`。

B4仍有活性探测、慢请求、Skills/Context/MCP等候选待逐子项核验，66候选不能整体勾选；本笔只完成重试UI/原生状态链。


## B4.24 E21 慢上游请求后端与重连快照（f7b13af）

实施前读取 `6b340326c6a43d5020b74ec1d20ae6c8f44cbe4d`、`2ea5181df8c2d4e8385b76ca4507b74b8e409231`、`a3cc12619f441e2ab04885ad85a4ce99901fc1d9`、`919fded8456a518eb667a105b0550fd6d42cb978` 实际 proxy/server/UI diff、固定最终完整 handleLlmApiRequest/slow listener/replay/helpers，以及 `b01ff6f502c24749eec12c9872919e943ce9e1af` 测试修复。保留最终契约：30s 等首个响应体字节（响应头不算）、逐请求唯一身份、首字节/无body/错误/取消/断连/关闭 settle 一次；只对模型流量，不提示 discovery/health/compact 等 utility。

本地复用每实例 createProxy 的 captureContext 与 callback 边界，不新增跨层全局 listener 或按 projectName 猜所有权。代理只在 SDK callback 存在且实际 POST 模型路径时启用计时，以原生 TransformStream 观察响应体首字节并保持背压/字节，错误 body 同样观察；无 callback 的普通代理不改流。用户 body/headers 不能伪造 cwd/instance。manager 保存所属会话的未决请求快照，generation 重置清空且拒收旧回调；server 在已授权 WS 握手时只回放该实例、等待时长按开始时间重算。请求状态不拿整轮 idle 代替；子请求同属实例时各有独立 requestId。尚未迁入 UI，不能计慢请求整项完成；不声称能观察绕过本捕获代理的自定义 provider 流量。

真实 HTTP 代理/生命周期/写入 **9/9**，正式 SDK child→本机 HTTP→独立代理→manager→WS **11/11**，0 skip；构建通过。原生产30s阈值实测 **30094ms**，headers 已发而 body 未到仍通知；同名隔离、并发 requestId、重连同请求/已解决不回放、错误 body/abort/proxy stop/utility/回调异常均通过。日志 `/tmp/cxv-b4-slow-{proxy-final,ws-final,backend-build}.log`。初次新测试使用已被前序 stop-all 关闭的 sibling；第二次因前序保留 sockets 加新重连触发原每IP8连接上限；已修 fixture 所有权/清理并保留 first/limit 日志，没有放宽生产保护。首轮挂起的自有 test parent22948/child22950已TERM清理。没有外部模型网络或真实用户数据，GUI待下一笔原提示接线。


## B4.25 E22 原慢请求提示与完整清理（7a50079）

沿用B4.24已读真实四次diff与最终源码，迁入原 `_renderSlowUpstreamToast/_armSlowUpstreamTick/_stopSlowUpstreamTick/_clearSlowUpstreamToast`，完整helper逐字SHA256 `20f05bd54e56c320a07a7072a905d954702ab3bfd9c65e69e422569bfa9346d6`。原message.open info/key/duration90、最早未决等待、5s tick、按requestId解决、18语言原文保留；无新DOM/CSS。切换、Stop、WS close/open、卸载共用清理；普通后续输入或整轮idle不误清仍在等待的子请求。

必要适配：本地共享TerminalWsProvider可能先于ChatView接到server回放，沿用已有snapshot机制缓存未决请求、解决时删除、连接退役清空，晚挂载重新计算等待时长。严格原实例URL守卫；无效/负等待时长规整。首次GUI发现返回工作区时 SDK false→true/project null→当前值 的异步hydration清掉刚回放通知，未接受初版；新增真实类回归，限定在离开已建立身份时清理，仍保留真实切换/恢复/本地日志清理。最终Safari返回和整页刷新均保留当前请求，不用测试通过替代GUI结论。

针对Web最终 **30/30**；最终全量 **1480/1480（5+279+990+206）、0 skip**，构建通过，日志 `/tmp/cxv-b4-slow-ui-{hydration,hydration-build,final-full}.log`。首轮全量有既有 `dingtalk-im-credentials` 双进程变更的 DINGTALK_SECRET_UNREADABLE 偶发失败；正确cwd定向7/7、连续5轮（35项）及最终全量均过，未修改凭据代码或放宽保护，保留 `/tmp/cxv-b4-slow-ui-{full,credentials-correct-cwd,credentials-stress}.log`。另首次定向命令从repo根运行导致子进程相对import找不到lib，已纠正cwd；不把该环境失败记产品回归。原偶发失败原因尚未定位，继续保留调查边界。

全新生产安装 **199/199**、695文件/202 Web精确字节、B1.2合成及隔离相对--cd CLI通过，见[安装回执](./B4-slow-upstream-install-2026-11-20.json)，日志 `/tmp/cxv-b4-slow-ui-final-installed.log`；包含新增proxy首字节/取消测试与真实30s SDK/WS重连用例。Safari自有fixture实际30s后提示、45s递增、切出清理、返回76s、刷新87s回放、首字节释放后提示收起/Stop回发送/单份最终回复均过；见[GUI回执](./B4-slow-upstream-gui-2026-11-20.json)。旧初版返回丢提示的观察保留；修复后重建并强制刷新实际bundle再验证。fixture47891已停止，没有真实用户日志/配置及外部模型网络操作。

6b340/919fde的慢请求功能子项已完成本机核验，changeset归B11；2ea518/a3cc仍含composer/触控等其他包子项，不整体标完成。下一步按B4真实职责核对候选的已复用覆盖与剩余活性/状态能力。


## B4.26 E23 首轮 MainAgent 请求分段自动展开（a51bd1a）

读取 `7a2dd6162e1465071a755606d77de22d7c0caa90` 实际 diff、固定最终 requestExpand/DetailPanel/ContextTab、JsonViewer/CSS和后续 helper 历史（未再改该helper），并追踪本地 classifyRequest→getRequestExpandNode→stripPrivateKeys→renderBody→JsonViewer.shouldExpandNode。Codex input/instructions 对应 Claude messages/system，复用本地已有同一 collectAll/expandRefs，仅补原首轮 MainAgent 的全部 instructions 数组递归展开；未重复抽模块、未改DOM/CSS。后续多轮、response、非数组 instructions、无关tools保持原策略；直接 OpenAI Responses 按本项目既有规则为Master，不放宽身份判定来套MainAgent策略。

Web **279/279**与构建通过，日志 `/tmp/cxv-b4-request-expand-{web,build}.log`。按字面提取实际组件方法、使用真实classifier的受控验证通过，见[方法回执](./B4-request-expand-2026-11-20.json)，日志 `/tmp/cxv-b4-request-expand-method-final.log`；覆盖全部分段/嵌套、无关节点、response/多轮/字符串边界，不宣称DOM/GUI通过。初次整组件Node探针缺少window/document listener，未运行；后续方法fixture最初误用应分类为Master的直接OpenAI地址，已改成真实SDK codex://sdk语义，未改classifier。失败日志保留。全量/安装仍是E22检查点1480/199，本笔不重复宣称。

同提交的Context SDK说明不能原样迁移：上游以Claude特定前缀判断两段合并并建议TUI；本地sdkToJSONLEntry默认instructions是“You are Codex”占位值，真实HTTP捕获另有来源。已通过交互工具请用户选择：沿用原位置并说明占位事实，或略过Claude专用说明；未答前不加这条界面文案。因此7a2dd整条仍未记完成，changeset归B11。


## B4.27 E24 真实子线程中断、复用与嵌套验证（62b8ea9）

沿用固定 `975313773a` 已读活跃代理生命周期契约，实施前重读本地完整 sdk-appserver-agents 与 transport 的 recursive ownsThread/readThread、真实回执及既有迟到/复用/嵌套测试。只扩充隔离协议探针 `--agent-lifecycle`，不改生产代码、UI、默认transport或用户配置。执行器仍为真实Codex0.169，模型是本机Responses合成端点；不是仓库任务委派/协作子代理。

本次 **38次本机请求通过**，见[真实生命周期回执](./B4-agent-lifecycle-2026-11-20.json)，目录 `cxv-b4-appserver-compat-orG0q6`，日志 `/tmp/cxv-b4-agent-lifecycle-real.log`。用生产 createSdkAppServerTransport、createSdkAppServerAgents 与实际 recursive ownsThread 直接处理真实通知，clientFactory仅接出同一真实RPC客户端用于受控child指令。root completed时child仍active；按该child精确turnId发interrupt，收到原生interrupted后才移除；同threadId下一turn恢复active，重放先前捕获的旧terminal仍不能结束新turn；释放本机响应后以child自己的completed收口。

隔离探针显式 `agents.max_depth=2`：root生成child，child生成grandchild；root与中间child完成时grandchild仍在等本机响应。生产ownsThread/readThread经真实parent链证明两个层级，任意无关ID拒绝；只有grandchild自己的terminal使快照清空。12份生产跟踪器快照与完整真实帧另存临时目录；未将spawn回执/父结束当子结束。等待中的真实control thread/read往返1ms（只证明该次RPC可达，不等同已有活性看门狗）。默认深度/权限/沙箱未改。此前E3/E9“真实child中断/复用/嵌套未验”的边界由本笔在本机受控范围补齐，物理/跨平台或外部模型不因此通过。

对应transport/agents定向 **13/13** 用例通过，日志 `/tmp/cxv-b4-agent-lifecycle-target.log`；本笔无生产变更，不重复运行E22全量1480或E23Web279/构建。仍待真实command/file/permissions审批、dynamic图像、原生活性/丢结果恢复评估及各候选剩余子项；SDK占位说明继续等待已发交互问题。


## 收口审计：下一轮明确缺口（2026-11-20）

- `bc669f59cced8ab8fddfb487a7f1121320ed8b64` 实际测试与固定最终 session-state 用例已读：push/result、requires_action、重复去重、重连快照、切历史、interrupt/grace/death，以及后补10s heartbeat/旧idle。对照本地 buildStreamingStatus→manager._sendStreamingStatus→server.setSdkStreamingState→SSE streaming_status，running/idle/断线快照/取消及代次隔离已有B2/E17/现有测试覆盖，不为Claude同名WS帧再造另一条状态源。但不能把这些折算为活性探测、丢result恢复或整条候选完成；requires_action来自本地原生审批表，不能伪造SDK缺失的CLI状态帧。
- `ef5fc8b168` 真实diff和固定 server `_emitAgentLoopBoundary` 初读定位到独立 `agent_loop_start/end` 与 `onAgentLoopStart/End` 插件钩子，SDK由cli显式接线，前端还消费语音事件。本地当前SDK用整轮streaming_status驱动loading，AppBase已有turn_end语音消费者，但本地server/SDK检索未发现对应独立边界生产者。这是**待完整源码复核/迁移的真实缺口**，不能凭loading正常把ef5整条勾完；下一笔先读完该提交全部有效差异、CLI/manager/voicePackPlayer/设置组件与CSS，再实施。
- `84e65cddc6` 活性探测/丢result部分仍待。E24实际thread/read在本机等待请求中1ms返回，仅证明该次真实control RPC可达；不能等同已实现10min idle / 3min复探 / 连续失败判定，也不能把普通慢模型或无法提供探测的exec强行判死。须先按原完整watchdog/lost-result调用链核对Codex控制面语义，保留不确定输入不自动重放的已有约束。
- `7a2dd6162e`首轮JSON子项a51bd1a已完成；SDK占位说明仍等待已发交互选择。当前无文案授权推定、不重复提问。
- 66条是跨包候选，不是66项B4全量新功能。Skills/输入/Prompt导航归B7，模型/Context/profile归B8，自动答题和-2权限选择归B9，插件生命周期完整产品归B10，发布元数据归B11；**只有完成实际diff逐子项核对后才更新归属/覆盖**，不能仅按这些标题将候选整批移出B4或记完成。

以上为缺口审计，无生产改动，不重复测试；本轮最新生产检查为E22全量1480/安装199，E23微调Web279/构建，E24协议38本机请求与13定向。IM并发测试偶发失败继续保留原因未定的边界。无推送。


## B4.28 E25 SDK回合边界与插件parallel hook（f2c87f6）

上游 `ef5fc8b1689ac56ec67fd2d797f5577cdb2dd99f` 实际cli/manager/server/plugin diff，固定最终_emitAgentLoopStart/End、result/death/teardown调用点、server_emitAgentLoopBoundary与CLI双处wiring已核；后续固定历史未替换边界helpers。此笔只迁SDK真实边界/SSE与现有JS插件parallel hook，未整包迁activity/语音/服务插件或Claude result.origin协议。

复用本地每cwd会话/代次和真正executor stream，只有runStreamed接受后开始；排队/移除或代理启动期间未交付取消没有边界。终态success/error/interrupted、无终态进程结束(session-ended)、会话替换/关闭均一次结束；原生重试notice、工具与子线程通知不能结束根turn。沿用上游logical turnId/turnStartedAt，scope/end callback由记录捕获，旧代次不能通过新callback结束新回合。回调抛错隔离；resume/启动模板保留wiring。

server原名agent_loop_start/end、onAgentLoopStart/End，必要适配仅用本地sendSdkEvent精确instanceKey+cwd路由，附原mode/project/instance字段供后续原voice消费者；不按全局当前目录回退。CLI公开路径真实接线；原插件loader增加两种parallel声明。PTY/独立服务插件事件总线与语音消费者仍待，不把混合ef5整条标完成。

针对SDK/native/queue **26/26**（新增启动未交付边界断言另以manager6/6通过）、正式HTTP/SSE/WS+真实加载JS插件 **11/11**、0 skip，构建通过；日志 `/tmp/cxv-b4-loop-{backend-target,startup-final,backend-ws-final,backend-build}.log`。SSE两同名作用域各一对，A中断不影响B成功；实际plugin.start写回执后故意throw，插件异常不能破坏turn/后续end。恢复/代次/队列/迟到/取消继续通过；没有GUI变化。

真实Codex0.169/SDK0.142.5、本机合成 **34次请求通过**，见[边界回执](./B4-loop-boundary-2026-11-20.json)，日志 `/tmp/cxv-b4-loop-backend-real.log`。真实manager各接受回合一对logical ID/时间，含503耗尽/手动恢复/400/interrupt；真实公开CLI启动→本机请求→完成产生同scope一对原插件回执，证明CLI launch template接线。未操作真实配置/日志或外部模型网络。E22全量1480/安装199仍为此前广覆盖检查点，本笔不重复宣称。


## B4.29 E26 语音包服务端前置链路（dc88897）

E25本地提交为 `f2c87f6`。核对原语音消费者时发现本地已存在VoicePackSettings/播放器/两套内置录音，但四个 `/api/voice-pack/*` 端点及approvalModal深合并缺失；仅增加agentLoop事件会让原面板持续404。此笔先恢复该独立前置，不新增或改排界面。上游依据为 `eec2d1673aa527572ce9764c7092227e9a3831df` 的实际manager/server diff、`372dfd670a72d7ba39fa6b62bf4815b1ae763e7b` 的完整双包/manifest修复、重构后的固定最终manager/routes/preferences/prefs-store；核对8cb4770b及36df32b7后续差异。原设置组件、事件表、播放器和CSS调用链已核。

迁移完整音频manager与四条路由：原JSON列表形态、manifest描述文件名、UUID上传/魔数/2MB、删除、Range206/416、ETag304及缓存策略。偏好GET只读reconcile；POST在既有带锁严格读/原子写内部调用原mergeApprovalModalPrefs，部分事件更新保留其他审批字段/音量/绑定并过滤未知key。内置三国/Butler选择不自动迁移。

必要适配：本地没有上游core包/路由表，使用现有app dist/public位置与单个handleVoicePackRoute；上传复用现有readMultipartUpload，不另写解析器。沿用本地既有loopback+Host+Origin管理门禁（远程分享token只可播放），不擅自引入36df整批远程管理授权。读音频复用既有readPublicFileSync的O_NOFOLLOW/私有inode政策，文件有2MB上限；拒绝根目录symlink、非文件/超限与私有hardlink，上传wx/0600。Range语法完整匹配，未支持的suffix/multi-range仍按原416。未增加第三方依赖。

真实隔离HOME/LOG_DIR的完整HTTP服务器验证 **5/5** 新用例通过：两包每个原事件音频精确字节/Range/ETag；真实multipart→列表→播放→偏好绑定→部分更新→删除→只读及落盘reconcile；伪造/超限/无boundary/未知路径；跨域拒绝、带有效token远程Host可读不可写；文件/目录symlink与私有hardlink拒绝。连同认证/偏好回归 **33/33、0 skip**，构建通过，日志 `/tmp/cxv-b4-voice-api-{target,build}.log`。首次两次测试有测试文件语法/变量替换笔误，修正后最终通过；不属于产品失败。无UI/CSS变动，不声称GUI/实际扬声器/新安装或全量重跑。

下一笔继续原agentLoopStart/End默认关闭的设置行、SSE消费、turnId去重/旧turn_end抑制及原录音；活性/丢result仍待。未推送，B4仍未收口。


## B4.30 E27 原回合语音设置与播放（c841dc7）

前置E26为 `dc88897`。依据 `ef5fc8b1689ac56ec67fd2d797f5577cdb2dd99f` 实际AppBase/voicePackPlayer/core事件表/manifest/i18n diff，重读固定最终三个boundary handlers、scope guard及settings完整组件/CSS；ef5之后相关播放器/事件表/CSS没有后续变更。保留原EVENT_KEYS顺序、默认/locale三种每回合音均null，直接使用既有设置渲染循环生成原两行；迁入18种原词条、两份原12394字节WAV与manifest，结束复用各包原turnEnd MP3。四份资产与固定源码逐字节一致，原CSS仅仓库名注释不同，产品样式无改动。

消费者沿用原agent_loop_start/end、per-turn dedupe与1500ms/same-session旧turn_end抑制；只有现有player返回true（接受/排队）才记抑制，不把返回值夸为扬声器确实可闻。新回合重置旧抑制；未启用/拒绝播放保留旧路径。必要适配为本地按SDK实例挂载根组件而非上游channel.vm：记录归根实例，捕获source/URL instance，旧连接/切视图/历史/卸载及外来scope忽略；使用E25真实turnId/turnStartedAt拒绝旧回合，已完成turn迟到start不复活。不再添加loading writer，复用E17已验的SDK整轮状态来源。PTY producer/service event bus/activity仍不计完成。

实际AppBase+原播放器+原settings fixture新增 **5项**，该文件 **35/35**：默认及locale不启用/原行value/onChange；按ID重复/旧end抑制/跨session保留；未启用cue不吞旧end/新turn清抑制；旧epoch/不同ID/foreign scope/旧source/改URL/历史/卸载/坏JSON均不误响。新5事件真实音频HTTP回归 **5/5**，构建通过。初次设置测试有require早于浏览器fixture及React.Children.toArray key前缀两处测试fixture错误，修正后35通过。

最终受控全量 `env -u CXV_BYPASS_PERMISSIONS pnpm test` **1494/1494（5+284+999+206）、0 skip**，日志 `/tmp/cxv-b4-loop-voice-full-final.log`；构建 `/tmp/cxv-b4-loop-voice-build.log`。首轮普通pnpm test继承宿主CXV_BYPASS_PERMISSIONS=1，perm-bridge原生review测试走bypass而失败1项；已读实际测试/生产分支并明确打印该环境值，未改权限逻辑，完整受控重跑通过。E22 IM偶发原始边界保留，本轮未再触发。

新生产安装 `cxv-b3-runtime-slv__kjp` **701文件、204 Web资源精确字节、208/208运行时、B1.2合成回归、隔离CLI相对--cd启动通过**，日志 `/tmp/cxv-b4-loop-voice-installed.log`；覆盖新manager/routes/events/merge模块和实际音频HTTP用例。首次pack因注释修改后的源码mtime晚于构建被assemble的旧产物门禁拒绝，重建后全新目录成功，未绕过门禁。

Safari当前构建显式刷新，隔离 `cxv-b4-tasks-gui-A4tLHF`：原偏好面板两新行均禁用；GUI选三国内置并试听，刷新重新打开保留；实际输入本机fake exec回合，开始WAV/结束MP3各有浏览器bytes=0-1及完整范围206回执；任务和停止/发送状态正常，未另发旧turnEnd请求。强制mobile=1原偏好布局显示同5行/绑定，桌面/移动截图已核看，不能等同窄视口/物理设备或扬声器可闻。原legacy重复抑制来自实际AppBase/player测试，不把无legacy producer的本GUI当全链证明。CUA地址输入曾被无关自动补全替换，已用明确loopback URL粘贴恢复；未为工具改UI。详见[语音回执](./B4-loop-voice-2026-11-20.json)，自有55173已停止；没有真实用户日志/凭据或外部模型请求。

B4仍未收口：下一笔按原84e65cddc6/ef5源码核对原生活性/丢result，随后逐项补候选覆盖/跨包归属。SDK占位说明继续等待此前交互选择；无推送。


## B4.31 E28 原生缺失终态通知恢复（70ab160）

E27本地提交为 `c841dc7`。实施前读取 `84e65cddc629e8b442e866c303883444901d5c19` 的实际manager diff与固定最终_armLostResultBackstop、idle门控、入站seq/terminal/teardown调用链，并核对 `ef5fc8b1689ac56ec67fd2d797f5577cdb2dd99f` 后补的post-arm activity失效守卫。上游依赖Claude无turnId的idle，5s后直接记lost-result失败；本地Codex原生thread/status/changed同样没有turnId，但已安装0.169 schema与**实际只读RPC**证明可获取带精确turnId/status的原生持久记录。此笔只处理缺失通知，活性探测另笔。

必要适配：保留5s宽限，仅本run实际turn/started之后的本root idle可arm；宽限后发 `thread/turns/list {threadId,limit:1,sortDirection:desc,itemsView:full}`，不使用已被原生schema弃用的整线程includeTurns=true，也不读全部历史。只有exact原生turnId且completed/failed/interrupted/full items才通过既有processFrame→manager终态链补收，保留原item/错误/usage路径。读取失败、未加载/summary、仍运行、旧turn或不在最近页均不推测终态、不重放输入、不杀子进程。用run对象/client身份/activitySeq及signal守卫请求前后；任何新活动/更替/停止都不能让旧结果结算新turn。请求10s有界，结束/重复arm abort在途read；pending原生审批park，最后reply/serverRequest resolved重arm。同步完成interrupt后不再新建已无用grace timer，旧client回调不能删新连接复用的RPC id。

新增4项（含成功/失败/中断三种恢复）与原native manager/approvals/queue共 **38/38、0 skip**，构建通过，日志 `/tmp/cxv-b4-lost-result-{target,build}.log`。涵盖完整记录/精确ID、无提前读取、同输入不重发、旧idle/活动/新running/foreign root失效、无结果/旧turn/summary/进行中/拒绝不误收、审批停放/重arm、read期间取消仍interrupted。无DOM/CSS变化，不重跑或扩大E27 GUI证据。

真实Codex0.169/SDK0.142.5，本机合成 **24次请求通过**，目录 `cxv-b4-appserver-compat-mKgWcY`，日志 `/tmp/cxv-b4-lost-result-real.log`，见[缺失通知恢复回执](./B4-lost-result-2026-11-20.json)。实际clientFactory只拦掉两个真实turn/completed，其余原生帧/RPC不改；生产transport接收真实idle，分别5408ms/5230ms后以原生最近一轮full记录恢复相同turnId/回复/usage，同thread下一轮正常。两条对应用户输入各仅1个模型请求，无输入重放/外部模型；原始帧与结果保留临时目录。另用E25自有旧fixture真实线程验证metadata-only+单turn full page，0模型请求。旧CLI若不支持分页RPC则保持不误收，本笔不声称已验证最低CLI/平台。

下一笔原生10min/3min/连续两次控制面超时活性检测；exec SDK没有控制面RPC，不能按沉默判死。仍需核exec流自然结束却缺终态的显式失败、其余候选与跨包归属。最新完整检查点仍E27 1494/安装208；本笔38/构建/真实24是增量证据，未假报已重跑全量/安装。SDK占位说明待此前交互选择；未推送，B4未收口。


## B4.32 E29 原生活性探测与延迟重建（d9747d0）

E28本地提交为 `70ab160`。本笔重新读取固定 `84e65cddc629e8b442e866c303883444901d5c19` 实际activity probe diff及完整_arm/_clear/_runActivityProbe、_recoverFromStuckTurn、_startTurn延迟teardown、入站消息计数/失败重置与interrupt路径；核对 `ef5fc8b1689ac56ec67fd2d797f5577cdb2dd99f` 审批停放/最后settle重arm修复和最终调用链。本地Codex SDK exec没有可用控制RPC，不按静默强制判死；只对已显式选择的native AppServer补同语义。

原阈值10min静默、首次超时后3min复探、每次真实RPC10s、连续两次无应答。使用**每次新发出的**thread/read metadata-only RPC，绝不把ownsThread/readThread缓存或初始化promise当活性。有效回复/远端numeric JSON-RPC错误证明控制面响应并清零；本地abort/send异常不能冒充远端回复。根线程真实活动重置失败/epoch并取消旧read；精确run/client/seq/turn及signal/approval guard防止旧超时结算新回合。旧turn/started/completed在任何活性统计前按真实ID拒绝；审批pending时停表/取消旧read，最后回应或原生resolved后重arm。结束/关闭取消全部定时与在途请求，真实长模型/工具等待不会因沉默单独失败。

两次超时后仅将owned client标suspect，走既有turn.failed→持久错误条/精确sdk-error/单次手动续接，并发一次reason=turn-stuck的agent loop end；不在判定时kill或重放输入。下一次授权提交才stop旧owned client并按原threadId恢复；保留既有队列规则和默认exec。manager沿用原手动retry入口/忙/ID/代次守卫，以transport产生的明确control-unresponsive标记而非文本识别提供retryable。旧client订阅被identity guard隔离，不影响新代次。

新增4项，连同E28/native manager/approval/queue **42/42、0 skip**，日志 `/tmp/cxv-b4-activity-target.log`；覆盖无限静默+可达RPC、远端RPC错误仍可达、两次真实无应答才判定且不kill/不重发、活动到来使旧read超时失效/失败数归零、两个审批逐个resolved只在最后恢复探测；原失终态5s及取消继续过。

真实Codex0.169/SDK0.142.5合成 **26次本机请求通过**，目录 `cxv-b4-appserver-compat-Pf5Ud9`，日志 `/tmp/cxv-b4-activity-real.log`，见[活性回执](./B4-activity-2026-11-20.json)。实际生产manager+transport；只将10min/3min等待的clock手动前进，10s请求超时为真实墙钟。模型被本机端点hold时，真正thread/read1ms返回且回合保持active；由隔离wrapper记PID并用ps确认真实AppServer命令后，只SIGSTOP自有7094。第一次10001ms仍active，第二次10002ms后turn-stuck；PID/本机hold请求仍存活，原输入仅1次。SIGCONT恢复自有进程，实际retryInterruptedTurn一次true/重复busy；这时才重建为7747，同原native thread，续接请求仅1次/成功，不重放原输入。原始帧/entries保留临时目录；所有自有进程已正常清理。E28两个实际丢通知恢复也在本次同时复验通过。未把加速长idle等同墙钟13min实跑，未操作真实用户进程或外部模型。

最终受控全量 **1502/1502（5+284+1007+206）、0 skip**，构建通过，日志 `/tmp/cxv-b4-activity-{full,build}.log`。新生产安装 `cxv-b3-runtime-jksrwqr9` **701文件、204Web精确字节、216/216运行时、B1.2合成回归及隔离相对--cd CLI启动通过**，日志 `/tmp/cxv-b4-activity-installed.log`。此笔无DOM/CSS，GUI仍按E27实际检查范围，不冒充新GUI/扬声器或跨平台通过。IM旧偶发边界保留，本轮未再触发。

下一步核exec流自然结束却缺终态的显式失败，以及PTY边界生产者/候选实际diff逐子项归属；service插件事件总线归B10但需证据映射后才记归属，不能整条勾完ef5/84e。Context SDK占位说明仍待此前交互回复。B4未收口、无推送。


## B4.33 E30 exec自然结束缺终态与部分回复保留（d5a79db）

E29为 `d9747d0`。重读固定 `84e65cddc629e8b442e866c303883444901d5c19` 及ef5最终_onResidentDeath：iterator自然结束时若仍有接受回合，应报session-ended失败、一次loop end并停放队列，不可静默idle。已读本地完整_executeTurn/真实SDK exec transport/runner、_processEvent/助手/工具累积、error持久入口及队列send-now取消链。SDK exec每回合独立子进程不能直接复用Claude resident-query death，因此仅在当前代次迭代器耗尽且尚无终态时走既有错误入库，沿用原“Agent SDK session ended before the turn completed”错误事实与session-ended边界；不添加沉默计时或虚假成功/自动重试。

迭代耗尽/实际传输异常且无终态时停放未发送队列；已接受输入不返队、不重放。显式Stop/send-now触发的Abort沿用原授权状态，不由异常停放覆盖。已读到的部分助手文字/思考也需保留：上游wire已逐帧持久，本地合成架构须在错误快照前补当前未完成的text/reasoning，再复用_flushPendingAssistantContent；完成项ID集合防止已在工具前flush的回复重复，随每turn清空，不把未完成工具伪作成功。错误反馈仍复用既有DOM/CSS及去重入口。

SDK/native/queue定向 **27/27、0 skip**，日志 `/tmp/cxv-b4-eof-target.log`：增加自然0退出空流/部分回复用例，原通知后成功/真实终态失败/非零退出保留；新增hold→EOF停放→显式新prompt恢复backlog且不重发原输入。首次target发现新停放覆盖send-now的Abort授权（立即发送未执行），已修正为仅非主动Abort停放；另暴露item.updated尚未进入pending助手缓存，已补精确未完成文字/思考收集后最终通过，不掩盖初次失败。

最终受控全量 **1503/1503（5+284+1008+206）、0 skip**，构建通过，日志 `/tmp/cxv-b4-eof-{full,build}.log`。新生产安装 `cxv-b3-runtime-9jgol6o9` **701文件、204Web精确字节、217/217运行时、B1.2合成回归、隔离相对--cd CLI通过**，日志 `/tmp/cxv-b4-eof-installed.log`。

Safari隔离fixture `cxv-b4-tasks-gui-lg99wW`：页面发送hold eof fixture与saved backlog，释放自有fake Codex让其正常0退出而无终态，部分回复只一份、原错误条出现、Stop回发送、backlog标已暂停。刷新仍有部分回复和原待发条；显式fresh prompt后backlog各完成一次，无残留cursor，最终发送按钮idle。calls.jsonl精确3条原输入/新输入/待发输入，没有重发。截图已核看，见[exec退出回执](./B4-exec-eof-2026-11-20.json)。自有36477已停止，无真实用户日志/凭据/外部模型。

**本次GUI新暴露未收口项**：刷新后原错误条消失（部分回复/暂停队列仍在），所以不能把刷新当失败UI恢复通过。下一笔先核上游错误条的完整来源/恢复和本地合成反馈过滤；不得仅凭持久JSON与测试把这项标完成。首次尚无规范条目时inflight部分文字未在AX观察到，本fixture不计流式paint验收。其后再处理PTY边界与候选映射。SDK占位说明继续等此前交互选择，B4未收口、无推送。


## B4.34 E31 错误条刷新行为源码判定（审计，无产品改动）

重读 `9b1bb4e729473360cbe60e508f0558a702370a08` 实际完整ChatView diff，固定最终constructor、sdk-error分支、_clearSdkErrors及_renderSdkErrors；完整检索最终server的SDK attach replay与manager最后失败缓存调用点。原sdkErrors初始[]，仅当前页面消费sdk-error WS时写入；无历史错误回放/从规范日志hydrate入口，attach只回放pending/slow/init/skills/session/context/mcp/task/queue。所谓persistent明确指页面内尾部保留、发送/切会话/视图清除，未承诺跨页面刷新恢复。因此E30观察“刷新丢错误条”**按固定基线源码是一致行为，先前‘待核缺口’判定已解除**；并不把源码对照伪称真实上游浏览器重跑。

本地错误原始内容仍在规范response.body.error，部分回复及暂停队列按E30恢复；不为了‘持久’字面自行加跨刷新状态/新UI或重播旧toast。保留E30原始观察，并在回执baselineAudit中记录核对结果。无需产品新实现/复跑测试，沿用E30 1503/安装217与GUI实际范围。下一笔普通TUI桥接路径原回合边界，再核候选的跨包归属；SDK占位说明仍待此前选择，B4仍未整体收口。


## B4.35 E32 普通TUI真实回合边界与加载恢复（9d4d437）

E31本地为 `a0da408`。重读 `c4529a6ed7a81c7ddd4564915735a06e123890ab` / `ef5fc8b1689ac56ec67fd2d797f5577cdb2dd99f` 的实际diff、固定server _setTurnActive/_emitTurnEnd/防抖/停止/attach、AppBase turn_active/streaming/voice、ChatView loading/停止与CSS，并核84e最终状态修复。本地普通Codex没有Claude UserPromptSubmit/Stop生产者，按证据最小适配为实际TUI WS连接的turn/start RPC成功回执开始、精确threadId+turnId终态结束；历史、未接受RPC、已知子线程、外来/旧终态不触发。连接ID隔离相同RPC号，捕获旧callback，teardown只结束所属回合，快终态先于ack仍只一对。

服务端保留原事件/JS插件名、普通正常结束默认10s静默防抖与新回合取消旧尾声，agent_loop_end先于同ts的legacy turn_end；明确中断/session-ended即时结束。turn_active与加载即时升降沿独立于延迟语音；API间隙500ms轮询沿用整轮active。普通SSE重连只回放当前active、不重响开始通知。服务启停后从桥接快照静默恢复；修正既有_stoppingPromise不复位导致重启后拒绝事件的问题。前端继续现有单一isStreaming、原DOM/CSS/Stop，按既有连接/视图/项目守卫处理turn_active，不影响SDK来源。

原定向34桥接/36Web/8真实HTTP-SSE-插件已过，真实TUI又发现临时thread_title把全局线程状态清掉：实际原生帧在根终态前发送ephemeral=true/threadSource=thread_title的thread/start。仅此明确内部标题线程不重置用户运行态、不触发loop开始；追加保留原prompt/reply的回归后桥接 **35/35**。标题请求本身的规范身份/分类另行审计，不能把loop过滤当整个分类完成。

真实Codex0.169公开普通CLI、真实node-pty/TUI/AppServer桥接、本机合成模型3请求（正常/标题/hold）通过；根回合各只有一对插件回执，正常尾声 **10004ms**，第二轮原生Escape→interrupted即时，两个用户输入各1次。隔离HOME/配置/凭据，首次新钩子审阅选择继续而不信任，未扩大权限。早先夹具等待页/过早session-ended失败原始记录保留，修正后不掩盖失败。见[普通TUI回执](./B4-pty-loop-2026-11-20.json)及probes/b4-pty-loop-real.mjs。

Safari合成PTY夹具（生产PTY manager/parser/writer/server）已观察：无API输出期间Stop、页面刷新/服务启停后仍active、回复实时出现并刷新保留、原生终态后Stop/页内spinner均消失；正常插件延迟约10s。初始夹具缺sessionId、默认直连URL被既有Master规则排除、Stop发Escape但适配器只收Ctrl+C，均为夹具问题，已修正可复现脚本；当前GUI中断用原生终态注入，不冒充按钮全链通过，按钮写Escape与真实TUI Escape终态分别有证据。所有自有进程已停止，不声称新音频可闻/物理mobile/外部模型。

修正后完整 **1511/1511（5+285+1011+210）、0 skip**，构建通过；日志 /tmp/cxv-b4-pty-loop-{full,build,bridge,web-target,http,real}.log。新生产安装 `cxv-b3-runtime-tucxfijb` **701文件、204Web精确字节、220/220运行时、B1.2合成回归与隔离相对--cd CLI通过**，包含桥接源码安装字节核对，日志 /tmp/cxv-b4-pty-loop-installed.log。下一笔身份/规范投影（含临时标题）及66候选实际diff逐子项归属；service插件总线仍需B10证据映射，SDK占位说明仍等此前选择，B4未收口、无推送。


## B4.36 E33 原生身份优先与规范代理标签（53126f5）

逐文件读 `f3a8413db9f99691ef94f54279cedc2913e0c1f0` 实际agent-id/writer/adapter/meta-rows/live-feed/assembler/contentFilter/requestType/identityHeal/ChatView与回归diff，核固定最终core分类/identityHeal及迁移后的调用链。原修复的核心是wire身份优先于SendMessage工具/提示词启发式、列表/对话同用持久标签、已给出的名字不可被窗口启发式降级。Codex不提供x-claude-code-agent-id/cc_is_subagent，因此不复制该协议解析器或新造Teammate；B2已有真实native thread来源→subAgent/subAgentName持久字段，沿阶梯复用。

本笔仅三处：明确_appServerSource/_sdkSource且subAgent=true时，不让继承的团队指令/send_input启发式改成Teammate；带规范_v2Descriptor的轻量/投影代理行沿用服务端SubAgent/Teammate身份标签；identityHeal保留已有规范Teammate名字，未命名/旧日志仍按原回退。原直接OpenAI Master否决继续最高优先。必要差异：本地规范摘要没有上游meta-rows Pass B的相邻请求lookahead修正，故只复用代理身份标签，Preflight/Plan等仍用既有全体相邻正文路径，不盲信不具备前提的摘要。既有subAgentName/teammate摘要已持久，无需新增格式/头/CSS/控件。

定向 **52/52、0 skip**：原生两种producer继承团队指令/通信工具仍SubAgent、明确外部Teammate保留、规范身份/旧日志回退/Master与lookahead隔离、已有命名不降级及未命名可升级；含原V2对象投影/摘要/normalize回归，日志 /tmp/cxv-b4-agent-identity-target.log。另把E24真实Codex捕获128帧回放到**生产桥接→interceptor writer→规范档案→冷wire→LogV2Archive→共享分类**，11条规范记录中3条子代理均保持SubAgent与已有spawnAgent标签，不冒称恢复了协议未带的nickname；见[身份回执](./B4-agent-identity-2026-11-20.json)和probes/b4-agent-identity-replay.mjs。只读旧自有fixture，写入新隔离日志，无模型/用户日志；文件watch已显式关闭。

完整 **1514/1514（5+286+1013+210）、0 skip** 与构建通过，日志 /tmp/cxv-b4-agent-identity-{full,build}.log。新生产安装 `cxv-b3-runtime-p5sd1lji` **701文件/204Web精确字节/238运行时/B1.2/隔离CLI通过**，新增安装后的分类回归并核requestType源码字节，日志 /tmp/cxv-b4-agent-identity-installed.log；无DOM/CSS改变，不把E32 Safari证据扩大为新视觉验收。下一笔明确临时标题的规范分类，再继续候选逐子项归属。f3a发布版本/history元数据仍归B11，不整体勾选混合提交；B4未收口、未推送。


## B4.37 E34 原生临时标题保留为Synthetic（7d2642f）

E32真实TUI暴露的ephemeral/thread_title线程已不触发loop，但规范记录仍可能冒充用户会话。本笔先读 `4455bef641c171701fdd6d0251826c139d2e0ff9` 的实际分类/RequestList/17项回归与后续 `4384b7ca67c60c0680a6dba370c1b2d7c5a67c31` 共享过滤修正、固定最终Synthetic whitelist/ChatView过滤/RequestList tagMuted及CSS，再追本地bridge完整body/identity→写者prompt摘要/重建→wire摘要→AppBase投影/会话合并/ChatView与网络列表。原语义是内部标题可网络检查、灰色Synthetic:Title、不冒充用户输入；不能直接把Claude标题正则改成新的宽泛文本猜测。

用原生真实帧已证明的 **ephemeral=true + threadSource=thread_title** 识别临时标题。提取最小无平台依赖的共享谓词，复用E32 reset/loop守卫；桥接保留类型到既有body.metadata，明确非主/子Agent，规范角色用既有auxiliary；共享分类沿原Synthetic:Title，轻量摘要保留两项安全源提示，对话投影/会话合并按类型排除。实时writer与摘要重建都不把它的输入计为用户prompt/root-main活动，实际native turn仍如实计数、全部原始/网络记录保留。直接OpenAI Master规则仍优先；无标记的旧日志/同文用户请求不按文本改类、不转换真实日志。没有新UI/CSS/协议外虚构状态。

定向 **99/99、0 skip**，涵盖精确身份/反例用户/缺源标记、Master保留、桥接原prompt/reply不被标题重置、摘要安全字段、实时与重建无标题用户prompt、物理turn仍1、对话投影不入MainAgent。首次真实复验 `cxv-b4-pty-loop-real-FBGFxS` 发现通用摘要仍把auxiliary根输入计prompt，已补live/rebuild同一过滤并保留失败事实；不要把物理turns=1误称错误。最终真实公开Codex0.169普通CLI **3本机模型请求（用户/标题/hold）**，原边界各一对、10001ms尾声、Escape即时结束，标题canonical/Synthetic摘要/userPrompts=[]/rootMainEvents=0及当前用户archive不被替换均通过。见[临时标题回执](./B4-native-title-2026-11-20.json)。

Safari对该真实自有日志使用当前源构建：普通会话只见B4 PTY SUCCESS与真实夹具回复；历史标题对话显示“暂无 MainAgent 对话数据”，网络原灰色 **Synthetic:Title** 与body仍可检查。无原生PTY运行/真实用户日志/外部模型；只读历史验证，自有viewer90031已停止。初次viewer夹具使用/var符号别名导致项目上下文不同，已改realpath与真实CLI一致后通过，不改产品项目边界。

修正后完整 **1519/1519（5+286+1017+211）、0 skip**，构建通过；日志 /tmp/cxv-b4-native-title-{target,full,build,real}.log。新生产安装cxv-b3-runtime-llizwj7q：702文件/204Web精确字节/279运行时/B1.2/隔离相对--cd CLI通过，新增身份与摘要回归及源码字节已核，日志 /tmp/cxv-b4-native-title-installed.log。下一步66候选实际diff逐子项归属与剩余B4状态恢复核验；Context SDK占位说明仍待此前选择；B4未整体收口，无推送。


## B4.38 E35 原审批最小化重放规则（e5bb92b；当时切工作区待核）

读 `469a995ad8d6222f2fb092a7c1c3d5bb8fe7b349` 实际AppBase/ChatView/approvalDismissal/测试diff与固定最终版本，核 `c29af25e64` 后补未知reason不得吞真实审批的guard；完整追本地global modal、kind:id最小化、AskFlow重复帧、WS清理与WorkspaceRoot的keyed卸载。发现_setApprovalKind无条件删除同kind最小化ID，与上游真实结束/不同ID才wipe的规则不一致。

原approvalDismissal helper与8项测试逐字复用，AppBase同ID/null→ID/空槽clear保留；真实ID→null/不同ID清对应kind；只有reason=view-switch是合成clear，未知reason真实payload仍显示。增加实际AppBase方法循环ask/ptyPlan，检查引用保持、异kind隔离/真实clear与未知reason，不加新UI/CSS。

定向 **45/45（8原policy + 37真实组件组）、0 skip**，构建通过，日志 /tmp/cxv-b4-approval-dismissal-{target,build}.log。Safari隔离fake AppServer fixture `cxv-b4-tasks-gui-en3vgI`：真实待答→最小化→生产getSdkPendingApprovals两次相同ID重放，仍只有重新打开按钮/inline问题，不重弹。AskFlow自身也会去重；真实AppBase方法用例另外覆盖旧无条件wipe，二者不混为同一层验证。

**实际未收口项**：同名工作区A→B→A后模态重新打开。WorkspaceRoot按URL scope卸载整个SettingsProvider/App，minimise Set随根消失；上游channel内存态保留，不能只搬view-switch reason便宣称修完。下一笔按精确实例恢复仅UI最小化标记，保留原根卸载与旧callback隔离，不缓存审批操作闭包。自有viewer11047暂留下一笔GUI，回执见[B4-approval-dismissal-2026-11-20.json](./B4-approval-dismissal-2026-11-20.json)。最近完整/新安装检查点仍E34 1519/279，不冒充本笔重跑。B4未收口、无推送。


## B4.39 E36 精确实例的页面内审批最小化恢复（f3cdb9e）

沿E35已读469/c29与固定最终完整AppBase/ChatView/ApprovalModal/WorkspaceRoot、SDK pending replay及导航调用链实施。上游channel.vm保存当前页面内UI状态，本地已验的B2严格SettingsProvider按URL scope卸载不能回退：保留既有根卸载/HTTP-SSE-WS绑定，改在稳定WorkspaceRoot的useRef内只存每个精确live instance scope的最小化字符串ID集合。AppBase新根拿独立Set副本，真正pending内容与handlers仍来自本实例新连接；同名/历史/已退休回调不能串用，真实结束与关闭当前实例清缓存，页面刷新清空，原判定helper不变。页内有界64scope/每scope256 UI ID，不写偏好或存储，不缓存审批对象/操作回调，不新增控件/CSS。

新增实际WorkspaceRoot+AppBase集成回归：A/B相同id隔离、A离开后迟到回调不擦choice、历史视图无cache、返回只有ID无pending/handler、真实resolve/显式forget清除、整页刷新重置。与原policy共 **46/46、0 skip**；完整 **1529/1529（5+296+1017+211）、0 skip**，构建通过，日志 /tmp/cxv-b4-approval-scope-{target,full,build}.log。

Safari在E35同一自有fake AppServer fixture明确刷新新构建：A原问题自然5min取消后，以新问题重新最小化→B；B新问题独立正常弹出并可自行最小化；返回A仍仅重开按钮/inline问答，未重弹。点重开、选A并提交到本机fake CLI，回复明确含choice A；下一条新问题正常弹出。原模态布局已看截图；自有11047已停止。没有真实权限批准/外部模型/用户日志。E35原始A→B→A失败事实保留并链接此修正，见[实例最小化回执](./B4-approval-scope-2026-11-20.json)。

新生产安装cxv-b3-runtime-wibrk1qu：702文件/204Web精确字节/279运行时/B1.2/隔离相对--cd CLI通过，日志 /tmp/cxv-b4-approval-scope-installed.log。469功能子项已核；history/发布元数据按B11继续，不把c29的其他混合文件/性能子项勾选。下一步按B0人工归属与实际diff逐子项复核66候选和剩余审批/状态恢复。SDK占位说明仍待此前选择，B4未整体收口、无推送。


## B4.40 E37 每轮SDK思考保留复核（5c92723；复用，无运行时代码）

读 `d89aa3b9af9703c2c350dcfa14eefbcd3215ecc5` 实际AppBase/ChatView/responseThinking/sessionMerge/sessionManager/viewStateCache diff、固定完整匹配/锚点/歧义拒绝/LastResponse过滤与测试，并追本地SDK completed-item→pending flush→累计历史→规范读写→normalize/sessionMerge→ChatMessage thinking合并/折叠与CSS。上游Claude SDK会从下轮请求剥掉已返回thinking，所以要另存响应、按producer锚点显示回补；本地SDK经理自己维护累计历史，completed reasoning本来就进入assistant历史，工具前flush及终态响应也已保留。遵循已有实现优先，不复制295行显示回补器/另一份thinkingRequests。

新增一个真实官方SDK+隔离fake CLI的两回合回归：首轮THINK_FIRST在第二次body.input仍一份，第二次response只有THINK_SECOND；写入生产LogV2Writer并冷读后，经真实normalize/sessionMerge得到两轮thinking/answer各一份；input/response内容未被改写。与既有含工具间隙/中断/失败的SDK测试共 **7/7、0 skip**，命令 `env -u CXV_BYPASS_PERMISSIONS CXV_TEST=1 CXV_LOG_DIR=tmp node --test tests/sdk-thinking-history.test.js packages/app/tests/sdk-manager.test.js`，日志 /tmp/cxv-b4-thinking-history-target.log。

Safari默认exec夹具90NfZG（51848）与AppServer夹具IHx0t7（57194）分别两轮：展开后思考one/two各一份、对应回复各一份；刷新冷加载后再次展开仍完整，原思考折叠布局已核。两种均为官方SDK/本机合成CLI事件，不冒称真实外部模型。自有进程已停，见[思考保留回执](./B4-thinking-history-2026-11-20.json)。原生夹具初次误把Responses summary对象用于AppServer，出现object Object；核实际0.169 schema要求string[]后仅修夹具，重建隔离目录再过，不为非法形状扩展生产transport。

初次混跑SDK定向命令漏app测试env，6项完成后profile watcher未退出，已终止自有45881并按上面隔离命令重跑；新测试也显式关闭fixture watcher。初版“不变”断言把既有_timestamp来源标记也算内容改写，已缩为真正input/response内容保护，未因测试断言误改产品。没有真实模型请求。最近完整代码/构建/安装检查点仍E36 **1529/702文件/204Web/279运行时**，本笔无生产源码变动，不重复冒充重跑。

d89的本地SDK每回合思考功能已按现有链路验清；上游Claude专用响应丢thinking补偿缓存没有相同前提，未增加无必要副本；发布/研究文档子项仍分别记账，不整条混合完成。下一步首轮终态代次/冷加载附着窗口及其余66候选逐项证据归属。B4未收口，无推送。


## B4.41 E38 首轮终态与冷载附着窗口（c8b6afd；复用，无运行时代码）

已读7641f5181af91a3ca06912d687a8dee678bfb85d实际sdk-manager、attach-buffer、events、meta-rows改动与固定最终有效路径，核bde02443后续UTF-8字节/背压drain修复；追本地SDK run/client所有权、精确thread/turn过滤、缺终态回查，以及LogV2快照游标→对象handle→live route→共享publisher注册/重放/背压整链。无UI/CSS变动。

上游Claude result没有turn ID，故以epoch代替可吞下一轮结果的tombstone计数；本地原生结果带精确ID，已在归属判定后才处理retry/terminal，不需要引入近似FIFO欠账。新增回归先真实走缺终态回查，再开始不同ID的下一轮：旧结果永不来、旧terminal/error/item迟到两种均不结束/污染新轮，当前retry和终态各自保留，只执行两次显式输入，健康child不重建。E28真实Codex丢两次terminal并在同thread继续的证据另见B4-lost-result回执，不冒充本笔新跑。

上游临时attach buffer用于无持久重放的广播；本地B3已经按规范timeline游标建立快照与实时衔接。新增生产writer/snapshot/object handle/live route实例化用例：seq2/3在订阅前落盘，seq4在首帧背压时追加，最终严格只收到2/3/4各一次。现有确认游标回退、初始注册pump、共享publisher同步注册+ring重放、失败关闭/重连、队列上限reset保持。

定向47/47、完整1532/1532（5+296+1019+212）、0 skip。首次全量继承CXV_BYPASS_PERMISSIONS，权限桥一项走bypass分支而失败；保留原日志，清该变量后完整重跑通过，不为测试环境修改权限产品。日志见 /tmp/cxv-b4-first-turn-guard-{target,full,full-clean}.log。无生产源码变动，构建/新安装仍引用E36 702文件/204Web/279运行时，不冒充重跑。见[B4-first-turn-guard-2026-11-20.json](./B4-first-turn-guard-2026-11-20.json)。

7641的两个功能子项已核，研究/格式说明/发布history等B11独立记录；不把整条混合提交勾选。下一笔核dd870审批同批pending/resolved残留，以及其余候选归属。Context分类面板协议差异已通过交互工具询问，等待选择期间推进独立项。B4未收口，无推送。


## B4.42 E39 服务端结束问答的同批状态清理（3e31052）

源码依据dd8709356b的实际askFlowController/ChatView/server与测试diff，固定最终controller完整terminal/routing/cancel调用链、后续历史无该文件修复；追本地ChatView真实host回调、AskQuestionForm/ApprovalModal原渲染与meta计时器。上游界面/CSS未改，本笔也不改布局。仅处理问答terminal子项，plan/permission和全局广播放宽分别待核。

先用延迟updater、整批提交后callback的host复现：新7项全部失败，原13项通过。SDK/hook resolved/timeout与远端cancel在pending同批到达时，旧getState读不到新head，导致模态残留。按原源码迁入_resolveAskById函数式匹配与_syncAskRouting提交后同步；cancel同样在updater内计算队列推进，callback才清meta/切路由。Codex必要适配是保留transport request ID与transcript itemId两套真实标识，清已结束head/queue两套meta，提升下一项保留itemId；resolved本地答案也在同一最新state中取pending questions，防同批省略questions时丢掉卡片答案。真实回答不被取消sentinel覆盖。

7项新用例覆盖SDK/hook四终态/remote cancel、队列中项先结束再head结束、外来id无影响、幸存下一项路由/双meta，以及hook只给answers时从pending补真实question。定向20/20、全量1539/1539（5+303+1019+212）、0 skip，构建通过。Safari自有合成AppServer夹具ZRCjWJ：正常pending模态可见；通过生产resolveApproval回答A，native回复入库且模态自动关闭；下一条新问题正常打开，点取消后回复answers为空且模态关闭。浏览器未伪称稳定制造同批时序，该竞争条件由确定性回归证明。自有16712已停，无真实审批/外部模型流量。

新生产安装cxv-b3-runtime-au2wctr6：702文件、204Web精确字节、280/280运行时、B1.2与隔离相对--cd CLI通过；日志 /tmp/cxv-b4-ask-settlement-{red,target,full,build,installed}.log，见[B4-ask-settlement-2026-11-20.json](./B4-ask-settlement-2026-11-20.json)。dd870其他子项继续分别核，未把只按id广播审批答案到所有工作区的策略直接带入本地严格scope；B4未整体收口，无推送。下一步plan/permission终态子项、Context差异待交互选择及候选证据归属。


## B4.43 E40 计划/权限终态与固定连接范围（f1c1970）

继续dd8709356b27c7ce3321269fc68466f051c613bf已读实际ChatView/server diff、固定完整pending/terminal/queue/render与原ApprovalModal/ToolApprovalPanel调用；不改UI/CSS。迁入原plan terminal函数式最新state匹配、权限terminal的String ID归一、空id guard、无匹配不更新/重复terminal不推进下一项。无id旧permission timeout仍只清当前已绑定范围，不更改审批权限或自动批准设置。

真实bundled ChatView（完整构造与_onTerminalWsMessage）增加三项，延迟整个React batch再提交：数字0↔字符串0、同批pending/resolved或timeout、外来id、重复旧terminal、队列下一项保留；修前3红/原38绿，修后与AskFlow共61/61。Codex update_plan仍只提供进度，不凭Claude ExitPlanMode建立不存在的原生审批；本笔plan是既有兼容消费者的合成WS回归，不冒充真实原生plan RPC验证。

核上游全局terminal广播是为可变化view stamp避免漏close。本地server只有upgrade/connection时设置cxvSdkSession、严格sdkScopeMatches与sdkActionAnchor不允许换scope，WorkspaceRoot也按scope重建连接；native approvals pending与terminal均携同一个closure scope。故保留现有固定连接路线，无需把含question/answer的terminal发给所有兄弟工作区。强化真实HTTP/WS原生审批重连测试：同名其他实例不会收到pending/resolved/timeout；独立定向1/1通过。既有未知/歧义/跨实例回答拒绝继续。此为实际调用链差异，不将原改动直接放宽成本地信息泄漏。

完整1542/1542（5+306+1019+212）、0 skip，构建通过；全量后仅加强上述测试断言，再单独跑1项，未更改运行时。新生产安装cxv-b3-runtime-stv_9bhb：702文件/204Web精确字节/280运行时、B1.2/隔离相对--cd CLI通过。Safari自有fake AppServer F1kELH：真实permission pending卡片→生产resolveApproval拒绝→本机native回复decision:decline→卡片清除；自有37953已停，无执行shell/外部模型/真实授权。日志 /tmp/cxv-b4-approval-terminal-{red,target,full,scope,build,installed}.log，见[B4-approval-terminal-2026-11-20.json](./B4-approval-terminal-2026-11-20.json)。

dd870问答/计划/权限terminal功能已按本地协议核验，全局广播按固定scope证据保留隔离；history/changeset等B11不整体勾选。下一步继续原plan门控/Context协议差异及66候选逐子项证据收敛。Context面板选择待回复；B4未整体收口，无推送。


## B4.44 E41 SDK不得派生PTY计划审批/发送击键（b58d2b6）

读51c23e9090f349b983a2dba52c738c559da5bf1b实际ChatView/ChatInputBar改动，核91b0055f2d后恢复SDK计划设置、282306a950后原结构化modal及固定最终三个PTY守卫；追本地componentDidUpdate→onPendingPtyPlan→AppBase global modal、两击键sink和input WS消费，原生bridge/transport plan映射与interactionOwnership/ChatMessage只读判定。不为Codex update_plan重建Claude ExitPlanMode审批，也不搬后来已撤的hidePlan设置。

本地真实turn/plan源已有codexTurnPlan/nonInteractive，正常计划不会触发审批；但旧状态/兼容调用仍能从SDK派生PTY modal，且两个sink无SDK guard。按最终有效源码加!sdkMode modal条件和两sink early return，共三守卫，无DOM/CSS改动。真实bundled ChatView生命周期先以stale-plan复现红；修后pendingPtyPlan保持null、无bubble；两sink在读取PTY transport前返回（用抛错getter证明未触及），原生只读计划既有回归继续通过。定向43/43，全量1543/1543（5+307+1019+212），0 skip，构建通过。

Safari自有合成native AppServer kt6zZ8：真实transport输入plan item与turn/plan更新，计划正文/两个已完成步骤及回复正常显示，无审批控件；刷新冷读仍完整且无审批。自有63573已停；不是外部模型或Claude实际审批验证。新生产安装cxv-b3-runtime-ykyv9r8a：702文件/204Web精确字节/280运行时、B1.2/隔离CLI通过。日志 /tmp/cxv-b4-plan-guard-{red,target,full,build,installed}.log，见[B4-plan-guard-2026-11-20.json](./B4-plan-guard-2026-11-20.json)。

51c23的三个最终有效PTY守卫子项已核；原inline结构化plan与后续auto-approval/版本元数据按真实协议分别核，不将混合提交整体勾选。下一步候选路径重组/B2/B3既验项逐子项归属；Context面板与先前SDK占位说明选择仍待回复。B4未整体收口，无推送。


## B4.45 E42 f946目录重组候选归属（81e7189；审计，无运行时改动）

完整核f9467bfc838a6ef724c0f7144e0ef302e1256523的94文件实际变更：8个代码文件内容原样移动，49个代码文件经真实相对路径解析/新目录映射后只改specifier，剩余35个代码对（11运行时/24测试）逐对读取实际diff，另2个为changeset与tarball列表。原路径与新路径pair比较避免只指定新文件时git把rename误显示整文件新增。

剩余差异均是路径引用/注释与测试定位：ensure-hooks生成路径加ask子目录；im-process-manager多一层父目录仍解析到packages/app/cli.js；server/sdk-manager/adapters只换imports和相关注释；测试更新join/newURL/源码正则等路径。核固定74cd752d新hook/worker路径仍存在。changeset声称18语言文档，但本笔实际文件清单无该locale文档diff，不凭描述增加完成数。

B0/B2既定归属B8/B11经源码复核成立：本笔不增加B4会话、审批、Agent或loading行为，不为目录形态重复改本地已安装的lib结构；B11仍须对包内路径、hooks遗留路径修复、worker启动和本地独有模块逐项迁移验收，B8依赖引用也未宣称完成。候选仅解除“B4未知功能”状态，整条不勾选。见[路径核验明细](./B4-path-layout-audit-2026-11-20.json)。

本笔只有证据/归属文档，无运行时/DOM/CSS变动，不重复测试或构建；保留E41完整1543、生产安装702文件/204Web/280运行时及既有边界。下一步B2/B3既验会话/冷载候选逐子项归属与剩余B4功能核查；Context两项交互选择待回复，B4未整体收口，无推送。


## B4.46 E43 恢复历史的首条新消息附着验证（13bd023；复用，无运行时改动）

读bd32d02884082a6d15f2b213855537e667cdefd0实际live-feed改动及固定最终_snapshotSizes/受限seed/新增conv epoch cap0/follow-up live read/eviction/stat失败水位链；核后补b23c1373分片轮换必须无suppression重新附着。原缺陷是在再次跟随旧历史目录时把当前EOF以前都当旧历史抑制，吞掉恢复后的第一条新消息。本地B3规范timeline单游标按已确认snapshot之后seq重放，没有此suppressed-to-EOF分支，复用现有writer、handle、publisher机制。

强化真实HTTP恢复集成：同名A/B与A新旧thread，选择旧档案后snapshot立即指旧会话；先完整跑完continue restored A（全部写入旧档案），再用写入前冻结的cursor/handle建立新SSE。无需再取snapshot或刷新，即收到seq高于冻结水位、sessionId严格为旧档案的v2_commit，无reset；B会话仍独立，后续累积input含旧前缀与新prompt、不含A新thread内容。旧live因archive变化reset、坏尾部拒绝原验证保留。这是官方SDK+本机fake CLI/真实HTTP-SSE，不冒称真实外部模型或本笔Safari验证。

初版并发submit/attach与wire/object套件41/41通过，但并不强制“写完才附着”；为精确覆盖原缺陷，改为完整写完才附着后再跑HTTP整文件11/11、0 skip通过。日志 /tmp/cxv-b4-resumed-live-{target,http}.log，见[B4-resumed-live-2026-11-20.json](./B4-resumed-live-2026-11-20.json)。只有测试/证据改动，不重复构建/新安装，最近完整检查点仍E41 1543/702文件/204Web/280运行时。

bd32恢复首条新消息live功能子项已按B3现有实现补齐直接证据；发布history归B11，不勾整条。下一步B2既验多实例/关闭/移动scratch候选状态回填，再继续其余B4子项；Context两项选择待回复，B4未整体收口，无推送。


## B4.47 E44 已验B2边界与后台task relay归属回填（884b620；文档，无运行时改动）

本笔为既验结果回填，不声明重新迁移或本轮重读307/a30/a843/992全部大型diff。依据用户已验[B2完成矩阵](./B2-completion-matrix.md)、[B2逐笔源码/验证](./B2-session-isolation.md)、[原提交保留映射](./local-commit-consolidation-2026-11-19.md)及B3/B4后续证据，把候选占位状态拆成已验子项与未处理混合项，B2/B3原结论不重新授权或反复验收。

| 候选 | 已验或本轮核定范围 | 保留范围 |
| --- | --- | --- |
| 3079040494 | B2 registry/恢复/CLI、14c3ae5连接与7415615生命周期；B4 E4显式native常驻 | 默认exec按用户渐进选择，Claude resident query不能直接复制；其他子项不整条完成 |
| a84385b5a8 | B2稳定instance/同名/关闭/恢复；3cbd71e真实桌面移动远端关闭回退；E5原生审批所有权/清理 | 其他平台/物理设备边界不改写 |
| a30d8c92a7 | B2固定握手scope/迟到回调；B3真实mux和cursor | Git diff/B5及其他混合项继续 |
| 0a9ad5d767 | 验a843为merge祖先、combined diff无新增手工resolution文件；B2已记录此merge入口 | 分支的独立后续提交依各自台账，不把merge当新增功能或整体完成 |
| 99256ac1d8 | B2原手机父层/44px rail、60列/双shell/缩高/关闭刷新及E12 composer可见性 | 真实物理触控/跨平台保留；不加新的SDK手机界面 |
| bc669f59cc | 先前已读状态测试；B2/E17整轮，E25边界、E28–30终态/活性/审批等待，E32普通TUI | 用既有SSE/精确turn源，不伪造Claude同名帧或另加第二状态源；平台/元数据独立 |

另实际读d6cab4869a的task relay处理分支、完整_normalizeSdkTask及固定最终normalize/快照说明：四个task_*是后台Agent生命周期，两种status词汇/patch/usage/skipTranscript并存；不能将todo checklist当作它的实现。E9/E10原生活跃child生命周期/原卡片、E24真实中断/复用/嵌套按实际native事实适配；不存在的Claude字段不伪造，exec仍无可证明child表。原提交同时含resident query、恢复切换、live-empty等大量变化，相关B2/B3只引用已验子项，仍不宣称整条完成。

无源码/DOM/CSS与测试变动，未重跑测试/构建/新安装；最近完整检查点E41 1543/702文件/204Web/280运行时，E43附加HTTP11已验。下一步剩余输入/Context/MCP/自动化等候选按实际diff拆分；Context面板和SDK占位说明两项交互选择待回复，B4未整体收口，无推送。


## B4.48 E45 发布说明与提示资产边界（ea3b128；源码审计，无运行时改动）

实际读取23e4273a37全部7文件diff：只删除5个changeset、增加CHANGELOG和1.9.25→1.9.26版本；0d067a1b7c只有history.md新增8行。均无运行时/UI行为，B11独立处理；release文字提到-2/3s/1M不能当作功能已迁入或改变本地默认权限的授权，也不直接复制上游版本号。

72c059f6b9实际13文件为六preset增加no-wait段、新GLM5.3完整74行/manifest及测试期望6→7。核固定最终manifest/Qwen3族名与7份teammate段、后续Kimi后台等待纪律/async no-poll等演进索引；这是模型prompt选择/渲染/内存占位资产，须B8按最终loader、别名、覆盖/禁用规则实施，不把初版prompt文本当B4原生后台生命周期。原生Agent事实已由E9/E10/E24/E33核定；未增加不存在的Claude Task/SendMessage/日志扫描接口，也未把prompt写入当前运行模型。

134a0de7ac实际41文件中的ultraplanTemplates字符串与code-expert JSON只有content变动已读：TeamCreate/TeamDelete改为Agent(name)并调整P0/P1/P2 review流程；18语言app/content文档和双份JSON镜像逐份字节相等。i18n除review文案还混入ui.permission.autoApprove.countdown，不能只按标题忽略该项。模板/文档分别留B7/B11、计时文案随B9真实producer核，未迁入本地；Codex原生有昵称的subAgent仍是subAgent，不能按该Claude提示“有name=Teammate”改B4身份分类。后续92ed9bc7/2914模板演进仍需B7核固定最终内容，不凭本笔文字审计宣称整条或所有语言视觉验收。

本笔仅归属/源码事实记录，无运行时/DOM/CSS、模型配置或权限变化，不重跑测试/构建/安装。检查点保持E41完整1543/702文件/204Web/280运行时与E43 HTTP11。下一步输入/Context/MCP/自动化混合候选实际B4边界；两项Context交互选择待回复，B4未整体收口，无推送。


## B4.49 E46 终端WS保活与重连输入保留（27b6ac5；复用，无运行时改动）

读ec14cd0234实际TerminalWsContext、terminal-ws-ping/server启动停止、ChatView队列park/恢复及Context provider/reducer差异，核固定最终相关WS文件无后续替换；追本地完整Provider/socket timer/send/cache、服务端ping与stop terminate、ChatView close/open/queue receipt链。只核B4通用WS/输入保留，Context专用15s fetch/未来ts水位不混为通过。

已有实现逐项具备：建连立即ping/每25s、10s握手截止、5s检查/45s无入站/2s重连、每新socket清pingSeen、旧回调身份守卫、前台恢复宽限、server停止先terminate旧连接并清timer。消费者不用ping帧的wall-clock ts，本地使用monotonic now测入站，不需要为了字段名复制另一套时钟。固定scope下原子retire直接执行一次close逻辑，不依赖失效socket能否触发onclose；迟到事件不能动新连接，原已验约束保持。

上游另存parked queue是因为原close会清整个队列；本地B2已验SDK accepted queue与未确认pendingInputs不在close清理列表，草稿/附件也不清，server queue-state按request ID权威对齐。无需再复制一份parked表或重发不确定输入。新增真实Provider+ChatView/合成socket计时器整链：两条分别已接受/回执未到，ping后46s触发半开retire→2s重连；两类输入、草稿和附件保留；新socket无输入重发；两次相同权威snapshot最终恰好两个server ID且未确认本地行清除，无重复。

现有握手黑洞、旧socket迟到、版本错配无ping、前台宽限、失效send、服务器ping清理与新的半开用例合计32/32、0 skip，日志 /tmp/cxv-b4-ws-keepalive-target.log；见[B4-ws-keepalive-2026-11-20.json](./B4-ws-keepalive-2026-11-20.json)。本笔无生产源码/DOM/CSS变化，不重复构建/安装，最近完整E41 1543/702文件/204Web/280运行时；新测试不冒称已跑全仓1544。没有新物理NAT/休眠/真实Safari半开证据，原验证边界保留。

ec14通用WS/输入保留功能已核，Context的provider/reducer仍随待选择面板独立处理，不整体勾选混合提交。下一步剩余输入/MCP/审批自动化候选的实际B4边界；Context两项选择待回复，B4未整体收口，无推送。


## B4.50 E47 原生MCP状态控制服务（8b59016）

实施前读133bc219df实际MCP collector/export/HTTP route/WS attach及前端原McpStatusTab、纯view reducer/完整CSS和调用位置，核固定最终组件无后续替换；本笔仅服务端前置。核真实0.169生成的ClientRequest/ListMcpServerStatusParams/Response schema：mcpServerStatus/list可带threadId复用该thread连接，runtimeStatus/serverInfo/tools是真实控制面字段。未为默认SDK exec猜测配置文件等同连接状态。

原生transport仅已有client+nativeThread可读，未启动/替换/疑似失活返回inactive，不因面板拉进程/建thread/发turn。真实threadId读取full inventory并跟nextCursor；一个10s AbortController总截止、finally清timer，循环cursor/128页/1024服务器/16MiB整页预算拒绝不完整快照；读完仍要求同client。显式runtimeStatus映射原connected/failed/needs-auth/pending/disabled，null/cancelled/未知为unknown，不能仅因有工具或OAuth信息宣称connected；保留原生字段/服务版本，tools字典转原数组。

manager按实例/会话代次记录原sdk-mcp-status快照，HTTP /api/sdk-mcp-server-status只用既有requestSdkView；WS只发当前scope/重连补推，reset发servers:null；所有外部快照为副本，默认exec明确unsupported，native未运行inactive，控制失败不走sdk-error/模型重放。没有新DOM/CSS。

新增原生分页/未知状态/无启动/坏页/循环cursor/旧client/10s总截止四用例，结合真实HTTP-WS共32/32；最终close补充断言单独1/1通过：读取精确实例、审批等待时仍可控制查询、同名兄弟无状态帧、复制不可变、五次重连补推、stop先发null再删除registry，旧ID随后404。初版误把关闭后getter/HTTP期待为null/inactive，违反已有严格ID契约；保留首次full及安装ftx9z7iz失败，修正测试为SDK_SESSION_NOT_FOUND/404，无产品回退。修正后完整1548/1548（5+308+1023+212）、0 skip，构建通过。

真实Codex0.169/官方SDK0.142.5、本机Responses/MCP stdio夹具l2CYjP共22模型请求；新增MCP查询本身未增加任何模型请求，真实runtimeStatus connected、fixture版本0.0.0/1工具，inactive读取和exec unsupported已验。新生产安装cxv-b3-runtime-ldi5bnni：702文件/204Web精确字节/284运行时、B1.2/隔离CLI通过。日志与原生完整快照见[B4-mcp-service-2026-11-20.json](./B4-mcp-service-2026-11-20.json)。所有自有探针结束；没有真实OAuth/远端MCP/外部模型。

下一笔按原位置/组件/CSS迁MCP面板，补默认exec诚实不可用态及原生GUI验证；133其model chip、Context fetch等混合项继续单列。两项Context交互选择仍待回复，B4未整体收口，无推送。


## B4.51 E48 原MCP状态面板（2ad4e0d）

上游133bc219df78920cdc3a5cb56f48cbe067e467e5，服务前置8b59016。沿用E47已读实际diff、完整组件/调用链/CSS与固定最终核验，直接迁SdkMcpStatusTab及纯view reducer，保留useReducer稳定dispatch和原mount/手动刷新/重连拉取，不恢复无限fetch旧实现。面板仍在Network详情Context之后，原列表/状态Tag/版本/工具数/错误区、Empty和刷新按钮；CSS与固定74cd752d逐字相同，原16词条及必要unsupported说明全部18语言齐全。

最小Codex适配：默认exec的真实unsupported单独显示“当前 SDK 执行方式不提供 MCP 状态”，沿用原Empty布局，不将未实现的读取当未启动/已连接；App传sdkMode、DetailPanel更新守卫，原active-tab存在检查复用本地request/context选择器，防SDK关闭后留在不存在页签，也不凭空增加Codex Raw。无新权限自动化/模型请求。

纯reducer/实际组件定向58/58，覆盖原stale/clear/空列表、unsupported及SDK开关/工具行/Raw回退。新增实际bundled DetailPanel断言替代两处只匹配activeKey源码形状的旧正则；初次full-final及full-accepted失败记录保留。最终全量1561/1561（5+321+1023+212）、0 skip；构建通过。一次i18n缩进修正后旧产物被合法prepack时间守卫拦截，未绕过，重建。最终新生产安装cxv-b3-runtime-fis5gnxy：702文件/204Web精确字节/284运行时、B1.2/隔离CLI通过。

真实Safari自有native夹具uk3A2d：原位置显示connected/needs-auth/failed/disabled/unknown、版本1.0.0/1工具/错误行；已核截图原样式。A首次只查1次、手动刷新2次、服务WS重连3次；同名B只显示B状态，首次1次、页面刷新2次，A仍3次，没有无限拉取或额外模型轮次。默认exec夹具5DNW36显示准确不可用说明，打开面板前后CLI总调用均1。自有80975/90288已停止。GUI为正式SDK/本机fake stdio，不冒充真实OAuth/远端MCP；实际Codex原生MCP证据另见E47。

见[B4 MCP面板回执](./B4-mcp-panel-2026-11-20.json)。133的MCP服务、面板及其稳定dispatch子项已验；model chip、Context与发布文档混合项不整体勾选。下一步继续剩余B4子项实际diff核销；Context分类面板与SDK占位说明两项交互选择待回复，service总线归B10待核。B4未整体收口，无推送。


## B4.52 E49 模型chip按固定最终位置接入（08db381）

上游133bc219df78920cdc3a5cb56f48cbe067e467e5的原sdkModel lift/chip diff与完整调用链，及后续c66b5fe2ed6e855f0610127eba3de96ac821adea实际迁位/slot/CSS/ProxyModal diff已核。固定最终位置为输入框Enter提示和发送按钮之间；Header仅PTY终端打开时留代理入口。核后续model相关变更及最终AppBase resume/workspace清空、ChatView/PC/Mobile传参；ProxyChip/helper自身迁位后无后续变更，未照搬已被替代的初版Header-only布局。

迁原ProxyChip结构/只读SDK Tag、键盘可达代理Tag、输入slot及其收缩/220px上限、PC/iPad/phone/Electron gates；ProxyChip CSS及sdkModelChip helper逐字一致，5个修改的输入CSS规则逐字一致。原ui.sdkModel 18语言齐全。原iPad drawer body portal、closed inert/aria-hidden一并迁入，保留手机原树/visualViewport边界，复用既有代理弹窗、保存回执/失败处理。

最小协议适配：Codex已有可信_model和按实例streaming_status/首次SSE快照，故空闲也带model，AppBase直接消费，不伪造Claude sdk-init或增加控制查询；同source/精确instance/卸载守卫，resume/workspace清空，未知不显示。实例切换沿用B2 keyed根卸载边界。现有代理契约尚无角色分配或official-default字段，保留现有已选profile可见条件及compact主标签/tooltip，不接虚构的sub/team摘要；B8角色代理仍待。只读历史不显示live chip，不改代理权限/路由默认值。

定向64/64、完整1564/1564（5+323+1024+212）、0 skip，构建通过；新增实际组件覆盖proxy优先/只读model/Enter打开与callback关闭、Electron/history隐藏，真实AppBase覆盖idle/同名隔离/旧source拒绝/resume清空，manager覆盖读idle模型不发turn及结束保留。新生产安装cxv-b3-runtime-6hieftzm：702文件/204Web精确字节/285运行时、B1.2/隔离CLI通过。

Safari自有ld7cMz：A初始空闲即fixture-A、刷新仍A；同名B仅fixture-B。隔离API写本机synthetic代理后原slot显示主代理及模型、打开既有Modal；强制ipad=1原slot存在，截图确认drawer跨整个内容视口；mobile=1无输入chip。总CLI调用0，不因读状态/开面板启动模型。自有45218已停，未触及真实凭据或外部模型。Pad drawer坐标关闭未取得可确认结果，不记GUI关闭通过；组件close callback已验，实际物理设备/窄视口/PTY GUI回退仍未新验。见[B4模型chip回执](./B4-model-chip-2026-11-20.json)。

133的model chip子项与c66输入slot迁位已按固定最终核验；Context/发布文档、角色代理等混合项继续分属处理，不勾整条。下一步核剩余审批/自动化与输入混合候选的B4归属；Context两项交互选择仍待，service总线按B10待核。B4实施中，无推送。


## B4.53 E50 权限hook超限请求体纠正（1ca16df）

上游2847027b548c8eefde55fd7910639bc8d623e429实际运行时diff已读：approval-policy、PreToolUse bridge/新PermissionRequest bridge、ensure-hooks、SDK canUseTool与ask-perm路由；核固定最终permHook超限guard仍有效、无后续替代。新桥/守卫文件后续187583787d仅文案承认-2层级，策略消费者仍属独立B9核查。测试/发布元数据未因此整体计为迁入。

本地仍有原缺陷：超1MB后data回调反复writeHead/end，end继续JSON/审批流程；实际HTTP红测产生两次ERR_HTTP_HEADERS_SENT，多字节超字节预算但少于100万字符的请求进入长等待，0/1失败保留。按上游停止后续处理的有效行为，复用现有readStrictUtf8JsonBody(req,1_000_000)替换本路由的重复字符串读取；超限/无效UTF-8/坏JSON在注册审批、timer、WS帧前拒绝一次，错误响应检查headersSent。现有reader按bytes有界，不为此另写parser；按仓库reader既有语义排空超限请求后答413，正常审批/原reviewer和forceManual判据保留，无DOM/CSS或权限策略变化。

真实loopback HTTP/WS覆盖分块ASCII、声明长度、多字节UTF-8超限、无效编码/JSON；每次后续GET正常且无perm-hook-pending，随后正常小请求收到真实pending、WS拒绝返回HTTP200/deny。定向21/21、最终完整1565/1565（5+323+1025+212）、0 skip，构建通过。新生产安装cxv-b3-runtime-t_iah_z9：702文件/204Web精确字节/285运行时、B1.2/隔离CLI通过；另在该新安装包复制并执行实际HTTP套件5/5，直接验证产物的此路由。详见[B4权限请求体回执](./B4-perm-body-2026-11-20.json)。没有模型网络、真实命令执行或新GUI验收。

284的目录自动信任不是B4生命周期等价项：Claude Read/Glob/Grep、updatedPermissions.addDirectories、PreToolUse→PermissionRequest和Codex原生command/file/permissions请求是不同协议。本地既有Codex PermissionRequest和E5原生精确请求/可用决定/profile约束保留；自动目录授权按B9、hook安装维护按B11继续，不能凭本笔安全修复勾整条或开启新自动化。下一步其余审批/输入混合候选实际B4子项核销；Context两项交互选择仍待，service总线归B10待核。B4未整体收口，无推送。


## B4.54 E51 计划审批协议与候选范围核定（df9952f；源码审计，无运行时变动）

核91b0055f2d实际SDK canUseTool的instanceKey、WS replay/attach/cancel、ChatView作用域/计时器/resolve/sink与pure target；核282306a950实际PlanApprovalForm全文、ApprovalModal fallback/portal、ChatView权威pending id/消息与LR/缓存/handler及PC/Mobile移除旧底部面板。大diff按文件/段补读，不用最初截断输出当完整依据。原新增PlanApprovalForm与planAutoApprove helper至固定74cd752d字节未变；后续208f1348在fallback接server wall-clock countdown，6081仅在ApprovalModal增加ask hosting props，不是新的计划批准producer。旧91的SDK底部ToolApprovalPanel已被282替换，不再迁入失效形态。

另在隔离HOME实际运行codex-cli0.169.0 generate-ts --experimental（生成成功，0模型请求），完整ServerRequest共11种method，无计划审批method；ThreadItem.plan只有id/text，turn/plan/updated是threadId/turnId/explanation/plan通知。上游审批原始producer则是Claude canUseTool('ExitPlanMode')等待_allow/deny；它不是Codex update_plan/原生plan报告。计划内容不因展示完成而等于请求批准，也不能按工具名相似新增SDK批准操作。原生已由E41按codexTurnPlan/nonInteractive只读展示，并守住两个PTY sink；没有把一般item/tool/call扩成从未注册的ExitPlanMode生产者。

通用B4功能对应已有直接证据：B2/E5精确实例请求表/代次nonce/重连，E35–36最小化，E39–40最新state终态与ID归一，E41 SDK/PTY隔离及原生计划live/冷读GUI。继续复用这些实际native能力，不新增并行作用域匹配或更宽松的无instance回退。倒计时/取消/自动决策与定时授权仍B9；发布/无关终端测试维护按B11单列。本笔只核范围，不把原生缺少的Claude专属请求记为已迁GUI，也不勾整个91/282混合提交。

[原生schema哈希及逐项范围回执](./B4-plan-protocol-audit-2026-11-20.json)保留11method/三份schema SHA256、实际生成路径和PATH alias警告。没有源码/测试/DOM/CSS变化，未重复跑测试/构建/安装；最近运行检查点仍E50完整1565/构建/安装285+额外HTTP5。下一步其余输入/SDK混合候选核销；Context两项选择待回复，B4仍实施中、无推送。


## B4.55 E52 斜杠菜单混合提交的SDK生命周期归属（6d15490；源码审计，无运行时变动）

读取67ceb5b7f0实际SDK manager115行/server46行、AppBase5行与projectKeyFromCwd全文/CLI setter。新增supportedCommands拉取按resident query去重、init skills白名单过滤、10s超时/旧query拒绝/finally清timer、sdk-skills缓存/reset/连接与attach重播；服务端加exact instance stamp，AppBase修正sanitized project与原始cwd basename比较。核固定最终_loadSupportedCommands完整函数仍保持上述语义；84e65后续生命周期reset保留缓存，并明确supportedCommands/init是缓存，不能作为真实活性探针。67为3c77d9a8ed合并祖先，combined diff无新增手工resolution，不将merge算新B4行为。

本地B2 keyed实例根/固定WS、B4 E5/E40精确归属/代次、E46重连已有验证，以instance为身份而不比较原始目录basename与sanitized项目名，不为形态一致另写第二套projectKey匹配。E29已采用真实thread/read控制面探测，未误用缓存技能列表证明存活。新技能metadata的owner/重连原则沿用现有机制，但未声称sdk-skills snapshot或菜单已接入。

实际官方SDK0.142.5 Thread声明只有id/runStreamed/run，无Claude supportedCommands方法；E51生成的真实Codex0.169 schema包含skills/list（cwds/forceReload）及skills/changed，故原生技能列表可在B7/B8按真实来源继续接入，不归为“Codex没有技能能力”。菜单UI、技能命令过滤/替换/权限与fallback留B7/B8，发布说明/CLI安装维护B11；不能把通用生命周期复用等同整条菜单或merge完成。见[B4技能scope审计回执](./B4-skill-scope-audit-2026-11-20.json)。

本笔无运行时/测试/DOM/CSS更改，未新跑测试/构建/安装，最新仍E50完整1565/构建/安装285+额外HTTP5。下一步其余输入队列/SDK full-surface等混合候选B4子项；Context两项交互选择仍待，B4未整体收口、无推送。


## B4.56 E53 中断分叉后的排队prompt保留（实现已验，最终GUI复验待）

本地提交322f47e。上游dafe2bce37的实际sessionMerge diff及固定74cd752d最终完整分叉分支已读；后续d7已知全量/response保留、d89会话身份、1aca排队展示字段均未替代该分支。先追本地完整merge、normalizer、AppBase实时/冷载与ChatView缓存调用链。旧fallback只追加newMessages[curLen..]，会在中断partial占据旧尾部时跳过落在curLen-1的新用户prompt。三个红测（实际AppBase live/cold及累计历史）均复现：保留旧partial、漏queued user、却显示后续reply。

先迁原最长公共前缀截断/追加，89定向、完整1568/构建/首安装lv94z72j均通过，但Safari自有MvmJVu的生产adapter→writer→live链仍只显示旧partial和新reply，未接受为完成。进一步追实际ChatView session cache：same session+same messages array+length增长会直接复用原prefix气泡；WeakMap工具缓存亦按数组身份。本笔最小必要适配为仅在L<curLen（既有prefix被改写）时复用现有slice创建存活prefix，再追加权威尾部；普通append保留数组，不增第二套revision或缓存机制，也不改DOM/CSS。原LCP结果语义保持，数组身份在改写时改为失效信号。

新增实际cached ChatView红测后修复通过，覆盖数据正确但气泡陈旧的真实缺口；初版测试抽取器漏读user的text prop，修正抽取后红测精确复现旧partial/漏prompt。最终定向91/91，完整1570/1570（5+328+1025+212）、0 skip，构建通过；新生产安装z6xncts1：702文件/204Web精确字节/285运行时、B1.2/隔离CLI通过。最初LCP-only的1568/产物和GUI失败保留，不冒充最终版本检查。

最终Safari复验在修正构建后连续两次报Sky Computer Use native pipe startup failed，未获得最终正确气泡结果；不是通过。自有90869已停，CLI/模型调用0；原GUI是合成累计快照，经正式SDK adapter/真实writer送入页面，不冒称真实Stop点击/外部模型。复跑：构建后启动probes/b4-tasks-gui.mjs，打开打印的A URL，stdin发{"action":"merge-step","step":1}观察旧partial，再发step2；预期queued user/reply各一次、旧partial消失，刷新仍同。需可用CUA原生连接或人工浏览器。详见[B4中断合并回执](./B4-interrupt-merge-2026-11-21.json)。

只处理dafe的消息保留子项；SDK/PTY队列、IM注入与orphan checkpoint等混合项继续逐项核销，未整条完成。B4仍实施中，Context两项选择待回复，无推送。


## B4.57 E54 立即发送先清理被中断的原生审批

实际读取dafe2bce37 SDK中断/立即发送、server/CLI接线、PTY chat-queue/IM导出及orphan checkpoint diff，核后续1aca9b5f派发选中/接受/暂停/重置与固定最终_sendQueuedNow→_interruptTurn({keepDispatch:true})→_cancelAllApprovals。本地Stop已有clearThread，但sendQueuedNow只abort；旧审批会在中断回执前仍可重放/批准。新增真实native stdio双实例红测，立即检查pending确实未清（1/1失败）；只在原appserver busy分支复用既有clearThread一行，再abort，保持选择锁/队列/旧ID和策略边界，不新增UI/CSS或另造审批清理机制。

28/28定向、完整1571/1571（5+328+1026+212）、0 skip，构建通过。双同名目录隔离native子进程实例验证：无效queue id不影响原审批；有效立即发送同步移除旧pending并发原scoped timeout，迟到allow失败；另一实例pending仍在；后续input只发一次、同thread续接、queue清空。使用本机fake stdio，不执行实际shell命令/外部模型；浏览器工具此前native pipe连接失败，本笔没有新增GUI通过记录。新生产安装1t48zxa3：702文件/204Web精确字节/286运行时、B1.2及隔离CLI通过，见[B4立即发送审批回执](./B4-send-now-approval-2026-11-21.json)。

队列其余子项按真实范围记账：B2既有权威ID/50上限/移除/Stop暂停/立即发送/重连快照和原inputStack队列条继续复用，本轮先复跑既有21项、补缺陷后28项。后续1aca的所有pre-push接受/恢复细节不凭标题整体勾选；PTY chat-queue含原Claude kind、idle poll/IM mutex/严格anchor等，本地Codex PTY忙队列尚未证明对齐，保持待核。

orphan checkpoint补丁在固定core仍有效；本地保留的batch helper确实仍跳过，但完整入口追踪发现ImConversationModal当前无挂载、DingTalk route matcher没有该组件依赖的logs/senders，独立/api/im-log只流原始旧记录且不调用该helper。当前B4主历史走B3 V2，未走旧delta。故不新增未接通的第二重建API，也不把该缺口当已修；在B11 IM接通实际日志生产/列表/消费时一并修复和验收。B10为服务插件/反代，不能混记IM归属。E53最终GUI、PTY/其他混合候选、Context两项选择仍待，B4未整体收口、无推送。


## B4.58 E55 固定最终浮动输入区与滚动条留白（实现已验，GUI待）

本地提交060afe3。

核efc7f8eab1实际App/Mobile、ChatView/TerminalPanel及CSS diff，追后续117ee25d滚动条bleed/透明padding不截拖拽的真实修复，核固定最终完整高度/scrollbar observer、三种列表尾部和CSS。原输入区仍为relative文档流，本轮迁为原absolute渐变浮层、等高spacer与stickyBottom偏移；空/加载（含错误条）、桌面列表和Virtuoso footer三处均加原spacer，避免底部回复或错误被覆盖。ref→mount/update/Virtuoso scroller callback→ResizeObserver→CSS变量→unmount清理按原调用链迁入；classic gutter用offsetWidth-clientWidth，overlay保留原12px探测回退，ChatInputBar双类selector和wrapper pointer-events原样，保留原Pad/手机规则。

完整measurement helper、inputStack CSS区块及input-card开头逐字等于固定上游，SHA256见[B4浮动输入区回执](./B4-floating-composer-2026-11-21.json)。没有新布局方案或Codex协议特例；保留现有B3日志/分页、B4严格身份和已选composer内容。此共享布局此前在B2/B7混合候选延期，本笔为SDK surface/空态错误条补齐基线；不把全部B7 prompt-nav/输入功能标完成。

两项红测先复现缺少测量/overlay实现；50/50实际组件检查通过，覆盖120→248高度变化（队列/HUD/多行共享边界）、经典滚动条宽度、scroller替换卸旧observer、overlay probe清除、空/加载与有消息末尾占位、卸载CSS/observer清理。完整1573/1573（5+330+1026+212）、0 skip，构建通过；新生产安装s0nutgg9：702文件/204Web精确字节/286运行时、B1.2及隔离CLI通过。组件测试不充当真实布局通过。

本轮再次实际尝试Safari native选择，仍报Sky Computer Use native pipe startup failed，未进入页面。GUI几何/拖拽滚动条、phone/pad、E53最终分叉重放仍待工具恢复或人工验收；回执保留可复跑命令和预期，不把浏览器连接失败写成通过。下一笔继续efc7 SDK compact/launch/protocol子项与剩余候选；Context两处已汇总交互选择待回复。B4仍实施中，无压缩/推送/PR。


## B4.59 E56 原生压缩完成提示（源码/实例已验，GUI待）

按efc7f8eab1原SDK compact producer、ChatView/CSS/i18n diff及固定最终10条保留/仅显示最新/原composer位置核对，并追后续生命周期reset；实际Codex0.169隔离生成的ThreadItem.contextCompaction仅有id，无Claude compact_metadata前后token。追本地native normalizer→processFrame根thread/turn校验→manager完成项去重→WS精确实例→ChatView，未按token下降或助手文字猜压缩已结束。

在现有_completeToolItem完成项去重后，仅对appserver的真实contextCompaction类型发原sdk-compact生命周期帧（带当前cwd/instance/session/turn）；不发压缩请求、不增模型输入、不改canonical history。UI复用原banner完整DOM/CSS/18语言，未知计数不显示，保留10条仅显示最新；加入本地既有精确instance/卸载守卫，显式SDK resume清旧提示。原banner/CSS SHA256见[B4压缩提示回执](./B4-compact-notice-2026-11-21.json)。默认exec公开SDK没有该item契约，不凭同名工具或文字伪造；其既有捕获和历史压缩记录保持。

原生及Web各1红测先复现无提示；63/63定向、完整1575/1575（5+331+1027+212）、0 skip、构建通过。实际本机fake stdio双同名实例：外thread/turn丢弃、重复completed只发1、原始TOOL仍只入1、兄弟实例0、无pre/post token字段；实际ChatView15次限10、只渲最新原slot、异实例/卸载拒收、resume清空。最后将语言相关断言改成数字/箭头断言，避免翻译中的字母k误判，实际该用例复跑通过。新生产安装6_pzxhk6：702文件/204Web精确字节/287运行时、B1.2/隔离CLI通过；没有真实模型/真实自动压缩或新增浏览器通过，E55已观察的native pipe故障边界保留；另尝试浏览器inventory亦报The browser access host is unavailable，未发现可用浏览器通道。

下一步继续efc7 launch/protocol剩余实际diff、自动审批混合候选B4/B9归属及Context待决项，E53/E55/E56 GUI仍待可用浏览器。B4未整体收口；用户已授权完成后将当前main全部待提交改动合为一笔并创建目标GitHub main的PR，不在完成前压缩/推送，不直接合入main。


## B4.60 E57 混合候选的生命周期与输入/代理/自动化边界（源码审计，无运行时变动）

逐项证据见[B4混合候选回执](./B4-mixed-scope-audit-2026-11-21.json)，明确本轮完整/部分阅读范围，不把部分SDK diff当整笔UI迁移。add350实际全部改动只在既有ProxyModal角色分源区按sdkMode隐藏Teammate行/徽章；本地尚无该B8区域，不能为隐藏不存在的行新建角色功能，也不能把角色代理标完成。后续B8接入必须带原gate；本地native子Agent仍按E9/E24/E33真实身份。

8f1d345实际prompt-nav迁位/Popover开关复位/共用内容、ChatInputBar两处mic互斥及CSS、pure predicate已读，属于B7输入/导航；E55共享浮动输入区不等于本笔导航已迁。混入的活跃计数修复要求非空promptSnippet，并扫描所有Agent/Task工具块解析嵌套代理名；Codex已用native thread Map及真实parent链/nickname，每个内部工具仅更新同一thread，不按description伪建任务。复用E9/E10/E24及现有nested身份测试/真实fixture，不用Claude snippet门槛隐藏有效Codex child。8f是ac56 merge祖先，combined diff无新resolution，不重复计功能。

c29所有运行时diff已核：审批unknown reason与按slot synthetic clear已由E35/E36的既有keyed scope覆盖；LRU清理toolUseMap的实际代码和20001→15000测试已在B3 7c3d849，本轮回填事实，不重复实施。FileBrowserModal本地不存在，rooted tree path归B5待；原convSeqs单遍扫描属于上游旧存储通路，本地保持B3规范快照/cursor，不另加同名重建器。

5e501后台SDK/auto helper/server/ask-perm实际diff已读：instanceKey缺失、仅实际resolve才广播关闭复用E5/E39/E40/E54；deadline/取消重播/300s上限/N+1s/默认3秒属于B9策略，不能因本轮迁入而改变默认审批。6081 SDK等待/托管重播及完整153行helper已核，null关闭与0立即/分钟上限1439/取消托管但保持题pending均归B9，选答案与计时UI尚未完整迁验；187 SDK -2分支/helper及publish例外已核，目录授权/hook/UI仍独立，不把显式完全免审混成生命周期等价项。三笔完整UI/策略验收均未声称完成。

本轮无源码/测试/DOM/CSS变化，未重复跑运行检查；最新仍b276e7f：1575源码/287安装、构建及702文件/204Web字节通过。Context两项交互选择、Safari native与browser host不可用、E53/E55/E56 GUI、efc7 launch/protocol及剩余候选继续，B4未整体完成，未压缩/推送/PR。

## B4.61 E58 SDK exec 启动参数不再静默丢弃

上游efc7f8eab199a04f3b8dcb660a5bfde593138f66 full-surface启动子项要求参数进入真实SDK字段/转发链。核实际CLI/SDK/launch-config与固定最终，追本地CLI→resume picker→parseSdkCodexArgs→registry→official SDK0.142.5；官方CodexOptions/ThreadOptions没有任意extraArgs/profile/image/review转发能力。默认exec此前静默忽略未知flag，并将其值误当prompt；显式exec后的已支持参数也被整体当输入。

本笔复用现有parser与错误码，两个transport都在替换旧session/开浏览器/写workspace/模型前拒绝未知及缺值参数，无新增profile展开或CLI转发。真实首subcommand exec/e只跳过该词，后续支持的model/config正常解析；review子命令拒绝，普通句子中的review/exec保持文本，--后的内容严格原样。原bare resume picker测试去掉此前被静默忽略的profile，并单列CLI提前拒绝检查，保留原picker覆盖。

2项红测先复现；35/35定向通过，最终缺值守卫补强后2/2相关用例复跑通过；完整1578/1578（5+331+1030+212）、0skip及构建通过。新生产安装4ukn9qex：702文件/204Web精确字节/290运行时、B1.2/隔离相对cd CLI通过；实际fake-child证明所选model/config与literal prompt正确传递，非法参数不产生child且旧实例保持。见[B4启动回执](./B4-sdk-launch-2026-11-21.json)。未发生真实模型流量；既有GUI待验仍保留，本笔无UI变化。

用户已明确两项Context方案：SDK说明保留原位置并准确区分Codex占位/真实HTTP捕获；Context分类保留上游入口但明确明细不可用，现有用量条保持。下一步逐笔实施，不再重复询问。其他efc7混合子项/PTY/Context与GUI尚未整体收口，不压缩/推送/创建PR。前笔E57本地7af2a85。

## B4.62 E59 SDK 占位说明原位适配（76bff2c为前笔E58）

按用户已选方案实施7a2dd6162e1465071a755606d77de22d7c0caa90剩余说明子项。复读实际ContextTab diff和固定最终完整说明分支，追后续c185只改Step概念，核本地完整ContextTab解析/accordion/选中/原文/RenderBlock链与separator/markdown CSS；SDK适配器sdkToJSONLEntry实际以You are Codex填缺省instructions，并顶层标_sdkSource；B3 request-summary保留该标记。未照抄Claude两段捕获或TUI完整保证。

DetailPanel仅把严格true的_sdkSource传入ContextTab；只有明确SDK来源且instructions恰为现有缺省占位才在原系统指令section末尾追加原separator+markdown，不改raw/body或模型输入，不改CSS/布局。18语言准确说明本字段占位、未捕获完整系统指令，以及真实HTTP独立请求体捕获。真实HTTP同文本、字符串伪标记、SDK自定义实际指令均不误加说明；默认exec与appserver经同一adapter。

实际组件红测先复现无separator；52/52组件检查、完整1579/1579（5+332+1030+212）、0skip及构建通过。真adapter→DetailPanel→ContextTab props/原section→选择后内容区→切原文均执行，原文保持You are Codex，无fetch/控制/模型请求；非SDK与真实指令变体不加说明。新生产安装85bb4dif：702文件/204Web精确字节/290运行时、B1.2及隔离CLI通过。见[B4说明回执](./B4-sdk-notice-2026-11-21.json)。

E23 a51bd1a首轮分段展开加本笔说明覆盖此候选两个子项；文案已按用户选择，仍未新增GUI通过。CUA两个通道已观察不可用，实际浏览器需工具恢复或人工验收；不将组件通过记成视觉通过。下一笔Context分类原入口明确不可用，现有用量条保持；B4与其他混合候选未整体收口，无压缩/推送/PR。

## B4.63 E60 原 Context 分类入口与准确不可用态（实现已验，GUI待）

按用户明确选择，保留04d05a58240132f057eeef6e830794190b10bc04原SDK-only Context Usage入口，置于Context后、MCP前，沿原wrapper/antd惰性挂载与模式变化回退。复读该笔SDK/route/CLI/server/App/DetailPanel实际diff，读固定最终完整SdkContextUsageTab、共享Provider222行、最终route、原居中CSS；追133bc219稳定dispatch、9c36b5分类颜色/滚动、5ee共享Provider与ad369计时释放/ec14 fetch deadline等实际相关子项。

官方SDK0.142.5 Thread只有run/runStreamed/id；已生成的原生ThreadTokenUsageUpdatedNotification仅last/total输入/缓存/输出及modelContextWindow，未提供Claude get_context_usage的system/tools/memory等分类。不能把累计token或已有声明估算成分类。故仅复用原无usage时居中Empty+secondary Text分支与逐字.center CSS，18语言原tab标签；新18语言准确说明分类不可用及现有用量条继续用已记录token。无分类图/伪数值/无效刷新按钮，也不为不存在的数据源新增Provider/控制route/WS快照/10s timer/15s fetch。原Palette/grid滚动等需真实usage的分支不创建空壳；共享memory/schedule等其他混合范围不声称已全读/迁完。

真实组件红测复现缺少入口，55/55实际DetailPanel/ContextTab等边界检查通过，含18语言、原Empty/secondary结构、SDK-only/模式变化有效activeKey、重复展示无fetch或模型控制。原有token/cached/plan用量7/7定向回归；现有血条源码保持，未改353K既有合同或接入分类Provider。完整1579/1579（5+332+1030+212）、0skip、构建通过；新生产安装m9b0az2f：702文件/204Web精确字节/290运行时、B1.2/隔离CLI通过。见[B4分类回执](./B4-context-unavailable-2026-11-21.json)。

04队列50上限/B2权威拒绝继续复用，waterfall hook维护归B11；133 MCP/model原迁验继续，Context无限fetch在本地无请求的已选适配中不产生；ad369只有不存在的getContextUsage定时器释放，不添加空timer以迁移；9c palette/grid无Codex真实分类，保留明确不可用；5ee血条按用户选择保持，memory与其他混合范围独立；ec14通用WS E46已验，专用fetch/ts水位无数据源不照搬。上述是明确适配/不适用边界，不将混合提交整体勾选。

实际GUI仍受此前已观察的native pipe startup failed与browser access host unavailable阻断；重连后可用隔离SDK fixture打开请求详情→上下文用量，预期位于Context/MCP间、居中明确不可用、切PTY/离线不出现、原用量条不变，无控制请求。组件检查不替代该视觉验收。下一步PTY/efc7剩余范围和代理/窗口候选；B4未整体收口，无压缩/推送/PR。E59本地f0bfc21。

## B4.64 E61 角色代理与模型窗口候选的实际范围（源码审计，无运行时变动）

3cc05b496dd2c0535df492455001b2524d091ef4全部运行时diff已逐段读完：interceptor-core角色阳性判别/normalize/merge/resolve、interceptor原子写/双watch/official dormancy/URL-auth-model-effort改写、proxy同源选路和retry profile、PTY环境剥离、preferences校验、AppBase/PC/Mobile props、AppHeader与ProxyModal完整改动及CSS、V2 writer/adapter/meta/live和V3行透传。核固定最终interceptor-core角色helper仍保留；后续17df的header-only身份、E33已核的f3a wire身份及E49最终ProxyChip、E57 add350 SDK隐藏需作为B8同一真实路由链评估，不能只搬一个classify函数。

本地rg精确查proxyRole/proxyRoles/roleIds/classifyProxyRole，无生产角色路由/设置表；代理当前按实例profile选源，原生child按真实thread/parent/来源头身份归属（E9/E24/E33），不是Claude billing/system/argv。3cc新增的每角色source分配、存储/休眠、路由/鉴权和统计元数据属于B8模型/代理切换，尚未迁入；B4身份只复用已验真实协议。不因为B4候选索引出现该笔就新增无后端的角色行，亦不把角色代理判作已完成或永久不适用。对应配置/统计字段须在B8生产源同时接入，B3不补空proxyRole。

3a2159219b0d02858bb385ebc12a5009397b7b36全部7文件实际diff已读，固定最终规则及后续17df DeepSeek别名/6363 Kimi别名实际diff已核。该笔改变的是上游用户约定：未知但有名字→1M，缺失→200K，已知family与显式后缀保持，并影响自动校准/Workflow徽章。不是后台Agent/turn状态producer。追本地完整context-rules、context-watcher、computeContextPercent与两个Workflow调用，血条353000既有契约，helper仅Workflow 1M标签；Codex原生modelContextWindow保留raw但不据未知名称推真实容量。用户此次明确保持现有用量条，故B4不引入上游别名或1M默认；共享模型能力标签规则归B8待迁验，不能将未采用的1M策略记为完成，也不宣称现有200K估算是真实全部模型规格。

本笔只补源码范围/归属证据，见[B4代理与窗口回执](./B4-role-window-scope-2026-11-21.json)，无产品/测试/DOM/CSS变更，不重复跑检查；最新仍E60 f825be3：1579源码/290安装、构建、702文件/204Web精确字节及B1.2/CLI通过。下一步真正未核的PTY忙队列与efc7剩余scope；B4未整体完成，GUI故障与外部/物理平台边界保留，无压缩/推送/PR。

## B4.65 E62 SDK 主 WebSocket 的 PTY 消息门控

继续核efc7f8eab199a04f3b8dcb660a5bfde593138f66完整server实际diff，发现本地缺少原SDK no-main-PTY门控：主WS只在sdk-*或perm答复分支返回，普通input/input-sequential仍落到spawnShell/全局PTY输入。已追完整upgrade鉴权→SDK精确handshake→主消息分支、独立scratch handler、pty-manager spawnShell/写入与测试seam；不是凭原先B2/Scratch通过推断所有SDK消息都已隔离。

在已校验消息形状后直接迁入原四种SDK-only no-op：input、input-sequential、resync-request、resize。SDK正常控制/问答照旧，scratch独立WS不经过该门控；普通PTY分支保持。仅3行门控，无新模块、配置或UI。

实际loopback HTTP/WS红测先证实1次隐藏main-shell spawn；用隔离fake PTY loader，四种消息后同socket错误scope控制作处理屏障，修后0spawn/0mainPTY/0sequential回执；原SDK同名实例控制、scratch真实fake-shell创建/写入/关闭和普通PTY实例检查一并22/22通过。完整1580/1580（5+332+1031+212）、0skip、构建通过；新生产安装znsc0qsh：702文件/204Web精确字节/291运行时、B1.2与隔离CLI通过。见[B4 SDK门控回执](./B4-sdk-pty-gate-2026-11-21.json)。没有执行shell命令、真实模型/凭据或用户日志操作。

本笔为efc7原SDK边界遗漏的实际修复，不能归成无变化审计。其余PTY忙队列原B0/规划B7归属与efc7混合子项将写收口矩阵；B4未整体完成，GUI仍待浏览器通道恢复/人工验收，无压缩/推送/PR。E61本地6f8f1e1。

## B4.66 E63 剩余混合范围与收口矩阵（待最终 GUI）

继续读efc7完整SDK manager/CLI/server/SDK adapter、approval-policy/perm bridge、身份与kv helper、spawn resolver实际diff；此前launch-config完整321行已核，补读comment-free格式化PTY语义diff（删旧promptpin流程抽同一helper/launchSettings优先），contentFilter格式化diff只增加Claude SDK身份条件。结合E33真实身份、E5/E35–41审批/重放、E13–22失败与原生整轮边界、E49模型、E52技能scope、E55浮层、E56压缩、E58启动及E62门控逐项映射。保留Codex sdkToJSONLEntry→pushSdkEntry→B3规范writer，因为原生/exec事件不是Claude loopback的同一报文；不能照搬删掉synthetic持久化导致Codex正文丢失，也不把该占位记录说成完整HTTP（E59已准确说明）。剩余Claude提示词pin/资产与hook策略归B8/B11，未整体勾选efc7。

dafe原341行queuehelper、原CLI/IM共享paste导出、ChatView输入/原气泡与server接线实际diff已读，追固定最终queue核心前606行/1aca dispatch slot与FIFO恢复、strictanchor/确认target gone/Stoppark/代次保护；后段Claude /resume注入API不作为本次实现阅读完成声明。本地确实没有chat-queue，普通PTY输入直接write，getPtyState也无原kind语义，不能假定Codex原生队列等价；回查原B0 cross与规划B7“排队发送/立即发送/中断”，明确归B7未迁。B4对应两项中断缺陷E53/E54已修，SDK队列B2复用；orphan旧IM仍B11缺口，不混记已完成或协议永久不适用。

整理[B4收口矩阵](./B4-completion-matrix.md)：列实际B4范围、5组最终GUI复验、真实协议未验边界与其他工作包未迁项。最后再次实际尝试CUA inventory仍apps/browsers空，native pipe startup failed及browser host unavailable并存；按工具要求结束该CUA段，没有进入页面、无新GUI通过。G1分叉/立即发送、G2浮层/滚动条、G3压缩、G4原位说明、G5分类不可用仍待连接恢复或人工验收。

本笔仅补审计/矩阵，无生产/测试/DOM/CSS变化，未新跑检查；最新E62 34fdb58的1580源码/291安装、构建及702文件/204Web精确字节等证据保持。B4未整体收口，后续1commit/1PR既有授权持续有效，未压缩/推送/PR。


## B4.67 E64 PR 预检与末尾空行清理

用户要求继续后实际重试CUA inventory，仍apps/browsers空，native pipe startup failed与browser host unavailable并存；没有GUI通过，不改变G1–G5状态。独立核对后续PR准备：fetch origin main成功，GitHub repo/API均确认weiesky/cx-viewer默认main与e268ec0039f26276c9aa75d0a5a95b3aa26d2b62；在本笔前HEAD94ec764时远端领先0、本地69笔，远端main为本地祖先，GitHub无现存open main PR。保存完整hash/文件清单与描述草稿到/tmp/cxv-b4-pr-{commits.tsv,files.tsv,body.md}，未创建分支或修改远端。真正收口时仍须重新读取远端范围，不能把本次快照当永远有效。

完整差异git diff --check查到codex-server-request.js末尾多1空行。本地E5 6102667提取的共享描述模块完整97行已复读；TUI/SDK共享调用关系沿用E5原证据，本笔只删最后1个LF，逐字断言确认其余所有字节相同；这是本地预检清理，不新增上游功能迁移映射或改变native审批协议。node --check与整个origin/main差异空白检查通过，既有审批6/6回归、构建通过；新生产安装289e7o01：702文件/204Web精确字节/291运行时、B1.2及隔离CLI通过。原完整1580/1580结果来自E62 34fdb58，本笔未重复跑完整源码套件，也未这样声称。见[B4预检回执](./B4-pr-preflight-2026-11-21.json)。

本笔后清单会重新导出包含这笔commit；并未压缩/推送/创建PR或直接合入main。B4仍待G1–G5最终GUI，既有单commit/单PR授权保持，不重复询问。

## B4.68 E65 最终 GUI 数据驱动补齐（后端就绪，GUI未通过）

用户要求持续推进到B4全部完成后再次实际尝试CUA inventory；apps/browsers仍空，native pipe startup failed/browser host unavailable。另直接调用文档支持的createBrowserTab(iab,隔离本机URL)也返回browser access host unavailable；两次CUA段都按工具要求结束，未观察到页面。CUA工具文档要求使用其他浏览器自动化技术须用户明确指定，已通过交互工具请求是否允许临时/tmp Playwright（不改项目依赖/不接真实数据）；本笔记录时未收到该选择，未安装或使用其他浏览器自动化。

复用完整既有b4-tasks-gui.mjs（临时HOME/双同名工作区/fake native stdio/真实manager与HTTP/WS/V2 writer），补G3真实native item生产分支compact fixture：外thread一份+自身同id重复两份，正常完成回复，无pre/post数值；补G4 context-entry三个固定变体SDK缺省、自定义实际指令、HTTP形状来源无_sdkSource。三个变体保留当前root thread/cwd，便于在同一会话选择记录；HTTP形状仅合成数据记录，不声称真实HTTP模型捕获。未改生产组件、CSS、协议或应用操作流程。

实际启动正式服务与fake child后，真实WS证明compact仅所属A收到1、B收到0、无发明token数；规范materializer冷读三个变体证明_sdkSource为true/true/false，instructions分别You are Codex/GUI actual custom instructions/You are Codex。先前一次检验脚本未处理TOOL entry缺少body.input而报错，改成空串兜底后实际复跑通过；是探针断言错误，不改生产代码。

同一fixture实际WS跑permission GUI_G1_HOLD_2→排队thinking fixture GUI_G1_FOLLOWUP_2→send-now，旧审批按真实perm-hook-timeout关闭，旧id答复报SDK_APPROVAL_NOT_PENDING，B未见该id，回合settled；规范存储确认前一次后续prompt一份且回复保留。初次脚本误等perm-hook-resolved超时，复读E54既有源码/测试后改为真实timeout取消事件并换新requestId复跑通过，不记初次通过。本轮node --check/差异空白检查通过；只有探针/文档变化，不重复构建/1580全量/291安装，也不声称新GUI通过。

源码/安装最新仍E62/E64回执。初始fixture cqLesR已停止，最终fixture c8KQZp用于待验；probe命令/回执见[B4 GUI准备](./B4-gui-readiness-2026-11-21.json)。G1–G5仍未整组实际GUI复验，B4未完成、未压缩/推送/PR。

## B4.69 E66 最终实际 GUI 验收与 B4 完成

用户已通过交互明确指定临时Playwright（回答“是”），并进一步明确要求B4完成后整合本地commit、创建main PR、自行检查并合并。使用/tmp隔离安装Playwright1.65.1与官方Chromium159.0.8154.6/WebKit27.2，未改项目依赖；复用E65原fixture，实际操作生产页面，无生产DOM/CSS/协议变化。G1–G5全部完成，详见[B4完成矩阵](./B4-completion-matrix.md)与[最终GUI回执](./B4-final-gui-2026-11-21.json)。

两引擎均确认分叉live/刷新各一份新prompt/reply、旧partial消失；实际待审批→入队→Send now→旧审批关闭与兄弟隔离、刷新保留；原压缩banner只最新/无造token，原恢复列表确认后清空；SDK说明原位置与Raw不变、自定义/HTTP形状不误标；分类原入口/不可用文案和零控制请求。Chromium实际HUD/队列159→197px、空态错误、长回复尾部、classic scrollbar11px匹配与鼠标拖动0→2472；WebKit desktop/phone390/pad834的多行与末尾/占位/横向边界通过。普通PTY和新窗口本地日志隐藏SDK tabs，离线composer不存在。

12张原始截图约1.22MB已纳入evidence，逐张哈希保留并核看关键画面。自动化初次定位误认inline审批为dialog、忽略图标/Pin可访问名、漏跟随Open新tab、headless默认隐藏scrollbar、误把原渐变bleed理解为wrapper缩窄、Node REPL跨realm断言等已按实际DOM/源码纠正并复验，均非生产缺陷；不把这些失败次数记作通过。合成HTTP形状/设备仿真与真实外部模型/物理/平台边界完整保留；源代码测试的10条上限不冒充15条视觉观察。自有浏览器与4fixture全部停止。

最终合并前release:check实际完成：1580/1580（5+332+1031+212）、0skip，构建与pack:dry-run通过；日志/tmp/cxv-b4-final-release-check.log。最近E64新安装291运行时/702文件/204Web精确字节、B1.2/CLI通过，本轮无生产代码变化不重复声称新安装。B4（第5/12工作包）已完成，66条混合候选的B5/B7/B8/B9/B10/B11未迁子项不整体勾选。下一步按最新授权保留原始commit/hash映射，合为一笔、创建main PR、自行审查实际检查状态后通过PR合并；不直接推main。
