# B2：SDK 状态与取消链路复核（2026-11-19）

**2026-11-19 收口：用户明确认为B2已可验收，要求合并本地提交并推送main。B2现已完成，转入[B3准备](./B3-handoff.md)。下文未覆盖项仍未验证，保留为后续环境补验；旧检查点中的“未完成/待设备”是用户验收前状态，不再是当前收口阻塞。**

当前目标仍为固定上游快照`74cd752d`；不是跟随上游HEAD迁移。当前本地基线`8246408`，当前验证状态与剩余环境边界见末尾持续收尾记录及完成矩阵。

| 上游提交 | 当前结论 | 证据与边界 |
| --- | --- | --- |
| `bc669f59cc` | 部分适配，继续核验 | 已读完整330行SDK状态测试；本地使用Codex `Thread.runStreamed`生命周期和按实例SSE `streaming_status`，不引入Claude的`system/session_state_changed`与`requires_action`协议。当前SDK/连接/registry定向24/24通过；原有真实HTTP/WS/SSE覆盖同名双目录的运行/中断/完成/重连快照、关闭、队列和晚到代次；本轮192f63d新增代理启动期间取消、子进程不得启动、旧队列丢弃与后续输入可继续的回归。尚未完成不响应中断的子进程、原生审批恢复与真实GUI等价验收，不能标整条完成。 |
| `ad369d2856` | **不适用（当前Codex SDK 0.142.5链路）** | 该diff只清理Claude active query的`getContextUsage()`请求race定时器；当前Codex公开`Thread`为`id/run/runStreamed`，`Codex`为`startThread/resumeThread`，没有该control RPC；本地sdk-manager/sdk-adapter/server也没有`_collectContextUsage`、`_activeQuery`或`CTX_USAGE_TIMEOUT_MS`。没有创建无调用方的定时器模块。上下文用量采集/血条刷新仍需按其他上游条目独立核验，这个结论不覆盖`ec14cd0234`等能力。 |

## 本地取消窗口与修复

原来`sendUserMessage`先设queryBusy并等待捕获代理，直到代理ready后才创建AbortController。用户在该等待中发送interrupt只能清空队列，返回false；等待随后结束仍执行原提示。实际SDK+fake Codex的新回归修改前失败，证据`/tmp/cxv-b2-sdk-startup-interrupt-red.log`：`false !== true`。

`192f63d`将当前turn的AbortController及running状态提前到异步启动前；复用现有代理ready/3秒超时race加入AbortSignal，拒绝后清理计时器及abort监听，不停掉仍属于此常驻会话的代理。client/thread创建与runStreamed纳入既有catch/finally，创建前及调用前检查signal，并保留generation隔离。用户interrupt清队列、及时结束等待、发出既有`Error: Turn interrupted`和idle；没有启动fake Codex的`spawned`标记，随后同一实例的新提示成功。init/stop使旧代次失效，迟到异常和finally仍不得投到新会话。

这不是将上游10秒grace timer移植到Codex，也没有宣称已解决不响应SDK中断的原生子进程。Codex SDK自身spawn接收signal并调用child.kill；实际失联/不响应取消与强制回收应另做受控复现，再决定实现，不能仅清UI busy冒充任务已停止。

## 验证

- 命令（app目录）：`env CXV_TEST=1 CXV_LOG_DIR=tmp node --test tests/sdk-manager.test.js tests/sdk-session-registry.test.js tests/sdk-workspace-connections.test.js`，最终24/24，`/tmp/cxv-b2-sdk-startup-interrupt-focused-final.log`。
- 源码全量1253/1253、0 skip、无失败hook：`/tmp/cxv-b2-sdk-startup-interrupt-full.log`。构建`/tmp/cxv-b2-sdk-startup-interrupt-build.log`。使用fake Codex，没有真实模型网络或用户凭据迁移。
- 初轮focused两项旧代次断言被脚本误改成预期running，业务实际仍正确返回空数组；恢复原来的空数组断言后24/24通过。只有stop-startup用例按新的先running语义调整为仅收到启动前true、没有任何teardown后的迟到帧。首轮`...focused.log`不计通过。
- `ad369d2856`完整diff：`/tmp/cxv-b2-context-timeout-upstream.diff`；`bc669f59cc`完整diff：`/tmp/cxv-b2-session-state-upstream.diff`。本地已安装的`node_modules/@openai/codex-sdk/dist/index.d.ts`中Thread/Codex声明及`dist/index.js`的spawn/AbortSignal链路已读取。当前 SDK 是仅ESM导出的包，用`import.meta.resolve`定位；CJS `require.resolve`探测失败不视作SDK不可用。

最终682文件安装产物：`/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-runtime-nq1uv95c/result.json`；202Web文件逐字节一致、运行时55/55、B1.2与隔离CLI启动通过，详见[B2本轮交付](./B2-session-isolation.md)。真实Codex、浏览器/设备GUI、Windows/Linux、最低Node/远端CI及高负载仍未验收。

## 2026-11-19：队列基础与连接活性

`7dbf4ec`映射上游`1aca9b5f8f`队列基础部分；每实例独立队列ID和queued/dispatching快照，50条满额显式拒绝，不静默丢弃；WS握手重放当前状态。重置、关闭/重开不会复用旧队列。定向27/27，全量1256/1256、0 skip、构建通过；日志`/tmp/cxv-b2-queue-foundation-{focused,full,build}.log`。前端待发恢复、删除/send-now和回执尚未完成，不标整条完成。

`07caca3`映射上游`ec14cd0234`terminal活性与发送保留子项；服务器25秒应用心跳、连接关闭清理timer，前端10秒拨号期限，收到心跳后45秒静默期限/5秒巡检、前台宽限、单调时钟及连接身份校验；旧服务器没有ping不启用idle期限，避免重连环。发送失败保留草稿/附件；typed-interrupt保留原文并与新草稿合并，不自动重放。服务停止清理terminal WS。后端定向17/17、实际组件/time/browser API fixture4/4；全量1262/1262、0 skip、构建通过，日志`/tmp/cxv-b2-ws-liveness-{server-focused,web-focused-final,full,build}.log`。上下文fetch/时间戳修复仍按B8后续核对，不标整条完成。

受控不响应中断复现：官方SDK与自有临时fake可执行文件忽略SIGTERM，interrupt=true但turn未settle、busy=true；只对fixture自身PID清理后结束。证据`/tmp/cxv-b2-stubborn-child.log`，未操作真实模型。已询问仅Viewer拥有的实例子进程超时回收方案；Stop保留/清空待发队列也待用户选择，当前保持既有清空行为。

GUI：浏览器host不可用；独立Chrome新标签操作期间CUA报告用户切换活动页，重查后为真实项目页，已停止。临时隔离服务pid14953已SIGTERM清理。fixture和native截图均不算浏览器交互通过，仍需独立可用浏览器窗口及双浏览器/移动端验证。复现环境：启动`/tmp/cxv-b2-completion-gui.mjs`，读取新生成info，用其临时实例URL进入；预期可排序/切换同名工作区、保留后台任务、重连队列和移动终端滚动，切勿复用旧PID/实例。

用户授权B2全部完成后合并本地commit并提交GitHub；整理时保留原commit归档和上游映射，当前尚未整理/推送。

## 2026-11-19：权威队列界面、接收回执与真实原生SDK重试修复

- `3a6ea4e`映射`1aca9b5f8f`接收回执：立即或入队接收不等待整个回合结束，回执只发原客户端，带实例和有界requestId；满队列拒绝也关联原requestId。定向27/27、全量1262/1262、构建通过。
- `b3922ef`映射该提交界面/重连：最新queue-state缓存给晚挂载组件；客户端发送ID区分重复文本，队列快照保留requestId以恢复丢失回执；按权威ID替换乐观输入。拒绝恢复原文并保留较新草稿，不自动重放；UltraPlan用现有解析器显示用户任务。全量1265/1265、构建、新683文件安装59/59通过。
- `94d4558`仅移除指定待发消息：服务端按握手实例与ID定位，错误ID/其他实例/缺失/派发中拒绝，其他相同文本和当前任务不动；界面等待权威快照才消失。定向后端11/11，额外派发锁回归4/4，组件8/8，全量1267/1267、构建；683文件安装60/60通过。`285e51f`补compact布局的状态/移除入口，组件9/9、完整Web188/188、构建通过。
- `b03a24f`映射`cdf05bf8ee`/`ee3545344e`的B2恢复终态子项，不是完整手动重试/进度功能。真实Codex0.169.0首次503且provider.request_max_retries=0时，会发`error: Reconnecting...1/5`后成功；原实现写最终500并抑制后续成功回答。修改前实际二进制失败证据`/tmp/cxv-b2-native-sdk-retry-notice-red.log`，fake SDK回归也失败（500!=200）。现在暂存流error，turn.completed成功优先，turn.failed/迭代结束/异常才持久失败；不添加Viewer自动重试、不按字符串伪造计数。覆盖恢复成功、最终失败、仅error后正常退出及非零退出，失败只记一次；代次及取消语义保留。SDK/队列/registry22/22，全量1269/1269、0 skip、构建通过。日志`/tmp/cxv-b2-sdk-retry-{focused-final,full,build}.log`。

### 真实Codex二进制与本地模拟响应

可复现：`node cc-viewer-alignment/probes/b2-native-sdk.mjs /Users/sky/.npm-global/bin/codex`；使用真实Codex0.169.0及官方SDK0.142.5、独立HOME/CODEX_HOME、仅本地模拟Responses端点，无真实模型请求。最终6请求通过同名双目录隔离、首次503后成功、队列派发、原生thread跨回合续接和普通取消；证据`/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-native-sdk-sN9R6A/result.json`、`/tmp/cxv-b2-native-sdk-retry-final.log`。前面不注入503的5请求也通过，缺失resume的appserver协议补证见[完成矩阵](./B2-completion-matrix.md)。最初mock误把实际请求的web_search工具交给Chat转换器，导致mock500，已改为只用转换器生成固定文本响应；这几次fixture失败不计产品通过。

SDK0.142.5类型注释将error描述为unrecoverable，但真实0.169的上述流证实其可先于恢复成功，因此以最终生命周期结算，不能只依赖旧类型注释。

### 最终安装与未完成边界

`/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-runtime-tp5qevuz/result.json`：npm实际tarball683文件，干净HOME production安装，关键后端源码和202Web资产逐字节一致；运行时61/61、B1.2回归、相对--cd隔离CLI启动通过。`/tmp/cxv-b2-sdk-retry-installed.log`。fake Codex安装检查与真实二进制本地mock补证分开报告，均不声称外部真实模型/凭据迁移通过。

移除已完成；Stop保留暂停还是清空、Codex“立即发送”中断当前turn后的适配，以及忽略中断子进程的回收策略仍待用户选择，未擅自实施。GUI连接再次复查browsers=[]/host unavailable，没有操作实际项目页；移动触控/软键盘/双浏览器仍未验收。B2不是整包完成，也未执行后续commit合并/推送。

## 2026-11-19 持续收尾：取消监管、队列控制及实际浏览器补缺

用户再次明确要求持续到B2完成，不再停在选择题；采用已沟通的完整对齐适配，不等待旧问卷。`14c39d4`用官方Codex SDK的可执行路径覆盖保留其参数构造，通过POSIX sh/Node自有wrapper继承原始管道，转发SIGTERM，5秒后只向自己创建的detached子进程组SIGKILL，busy直到真实退出。不会扫描/猜测其他实例PID。顽固fake与兄弟实例并发、后续输入恢复通过；SDK/registry/所有权19/19，全量1270/1270、0 skip、构建通过，真实Codex+本地Responses6请求通过。Windows保留原SDK路径，不宣称已解决该平台强制回收。

`671547d`映射1aca9b5f8f/1e0edc00f3：Stop保留并暂停已接收队列；立即发送原子选择一项，打断当前Codex回合，真实结束后优先运行选中项，原backlog保留；重复/竞争派发与跨实例ID拒绝，Stop在派发前取消窗口把选中项放回队首；新明确输入或立即发送解除暂停。关闭/reset仍显式清空。暂停队列也禁止resume无声覆盖。移除仍只删指定尚未派发ID。后端20/20、全量1274/1274、0 skip、构建通过。

`c11609f`映射d7f355ba89/1aca9b5f8f：真实Chrome运行中刷新复现首条提示消失，新增按实例activeInput及随机epoch快照，重放给晚挂载消费者；按requestId替换本端乐观输入，跨通道落盘延迟中仍显示，精确回合时间戳回声后清理，新incarnation清旧服务权威提示而不丢新草稿。前端19/19、后端最终14/14、全量1276/1276、构建通过。初轮旧测试把派发快照次数断言为1，新activeInput产生第二份合法快照；改成所有观察到的派发均拒绝移除，不把固定帧次数当产品语义。

`a8df3db`修复实际Safari暂停队列刷新不可见：WS快照先于cli-mode HTTP返回时原先被sdkMode=false过滤；现在先存范围正确的快照，sdkMode到达触发渲染。完整Web192/192、构建通过，实际Safari刷新两条暂停消息及操作按钮恢复。

`8246408`修复停止后继续的历史前缀：失败assistant已被界面显示，却未进入SDK合成累积历史，下一回合位置时间戳错位、送出的提示残留。失败内容现在加入下一请求同一前缀；SDK/队列/registry25/25，最新全量1277/1277、0 skip、构建通过。日志分别`/tmp/cxv-b2-owned-*`、`/tmp/cxv-b2-queue-control-*`、`/tmp/cxv-b2-active-prompt-*`、`/tmp/cxv-b2-early-queue-*`、`/tmp/cxv-b2-error-prefix-*`。

实际GUI通过原生CUA操作独立Safari新标签与Chrome新标签，不操作已有真实项目页。已观察同名A/B并发，输入只在各自页面，A Stop后B仍运行；排序按钮/Enter键、focus恢复和刷新顺序保持；运行中B提示刷新后仍在；两条队列Stop后显示暂停，刷新后保留。继续验收优先派发/历史/关闭与移动布局。当前fixture root `/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-completion-gui-CTzZlE`、port20210、pid96371，只含synthetic fake Codex；此PID仅当前fixture，后续操作前重新核实info。上一fixture pid37519已清理。

## 2026-11-19 最新状态：实际拖动、规范时间戳及预期差异

`fb53455`映射eb2e9703a2：实际Chrome/WebKit输入中原生HTML拖动未重排，新增鼠标/笔pointer capture、6px移动阈值、当前nav内目标检查、拖后click导航抑制、cancel/lost capture清理；touch不拦截、不误排序，原生HTML MIME作为无pointer环境回退并附标准text/plain opaque实例ID，不传cwd。路径用LTR bdi包裹并从尾部省略，实际Chrome截图能区分one/same与two/same。实际Chrome拖动后B移至第一、URL/活动实例和运行任务保持；组件5/5、完整Web193/193、构建通过。

`467fbf3`映射B2回合身份/1aca9b5f8f/cdf05bf8ee相关历史子项：实际跨浏览器冷读取显示SDK旧回合时间戳被后续carrier覆盖，给合成Viewer消息保留_sdkTimestamp，并在冷热session投影优先采用；现代SDK Viewer历史恢复保留规范时间戳和显式_sdkFeedback，原生Codex仍仅用threadId和新提示，不把该Viewer显示数组交给模型。冷/热真实投影及精确pending回声测试2/2，SDK/恢复/registry/队列32/32，最后全量1281/1281、0 skip、构建通过；真实Codex0.169/SDK0.142.5本地模拟Responses6请求再次通过，`/tmp/cxv-b2-sdk-times-native.log`。

最终安装`/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-runtime-nw7d2hk5/result.json`：685文件实际tarball、全新HOME生产安装，后端源码/202Web文件精确字节一致，launcher保留可执行权限，运行时66/66、B1.2和隔离相对--cd启动通过。日志`/tmp/cxv-b2-sdk-times-{full,build,installed}.log`。

实际GUI root `/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-completion-gui-kGOp0d`曾跑Safari A、Chrome B及Chrome A三个独立页面；选择second queued立即发送，实际顺序为中断原回合→selected回复→first回复，无末尾重复占位。B持续运行；Chrome A冷加载完整历史无多余pending。仍待移动布局/实际历史选择与关闭GUI；未把桌面模拟当真机触控/软键盘通过。尝试进入mobile=1时CUA30秒超时重置；恢复后Chrome当前为其他真实活动项目，未继续对其操作。已对自有pid61134核实进程命令并SIGTERM，fake任务/服务清理完成。

用户最新提示“当前与预期存在差异”，但没有描述具体项；已用异步问题请其给出当前表现与预期表现。原B2完成和随后合并/推送目标保留；不以通过测试替代预期确认，也不把其他工作包的混合提交整体标完成。最新代码HEAD467fbf3，仅本地。


## 2026-11-19：按用户预期接入Header（b280d00）

用户明确多工作区交互应在Header。复用现有SdkWorkspaceTabs及其scope/排序/关闭/恢复逻辑，移除Header下方独立栏；桌面作为AppHeader中间弹性区域，替代重复当前项目标签，保持40px行高（粗指针56px）；移动端在Header内换行，选择器页也有Header。SDK Electron原隐藏Header需保留工作区入口，故仅非SDK继续隐藏。

Web195/195，构建通过：/tmp/cxv-b2-header-{web,build}.log。实际Chrome截图显示与菜单/扫码/终端/网络同排，切换A→B→A保留原记录；Safari打开历史列表、关闭A后B保持运行/停止按钮及原URL通过。后续用户切换到真实活动页，工具拒绝继续操作，重查后不再发送动作；完整恢复/移动布局/真机仍待，未以局部通过冒充整体验收。隔离服务pid22126，临时HOME路径见/tmp/cxv-b2-completion-gui-info.json，没有使用真实凭据或外部模型。


## 2026-11-19：Header后续、GUI恢复和缓存作用域（02349c2 / f870f2d / 4fb7ade / d10ceae）

02349c2保留原Header被替代标签所承载的别名功能，复用useProjectAlias/ProjectAliasEditor，编辑按钮在Tabs外侧，不把button嵌进role=tab。f870f2d对窄屏隐藏直接排序/关闭按钮，并提供独立操作菜单；历史入口改图标，触控目标44px；菜单打开和选择均阻止冒泡，排序焦点回到操作按钮，单工作区也可关闭。Chrome400px实际菜单将A移到前面后URL/当前B任务不变；320px最终max-width/间距需复测，不把中间截图视为通过。

4fb7ade修正GUI观察到的前一同名工作区缓存游标被带到后一实例。旧路径只作为knownCursor提示，服务端会拒绝/重新校验，未观察到跨实例内容显示。现在active与readonly快照key同时包含实例、代理base path、档案及limit，旧共享key不复用，token不进入key。实际IndexedDB fixture验证保存A再载B为空、token旋转不影响同实例、其他路径/档案/limit/缺失实例不复用。初轮测试的mock.property无法创建不存在的全局属性、后续期望漏了现有summaries归一化，均修正fixture后通过；原失败日志保留。

Safari独立窗口通过：A关闭后重开（重开由fixture HTTP准备），裸resume=1自动打开picker，点击继续对话重载原记录，新提示只执行一次且calls.jsonl显示原gui-native-A-fe6a4b82-ca8b-4b52-a9d5-1e2d1c3c7480；B持续hold不受影响。移动=1的打开/关闭终端、关闭后刷新保持关闭已实际通过；桌面模拟不等于物理软键盘/多指触控。

最终源码1283/1283、0 skip：/tmp/cxv-b2-header-cache-full.log；构建/tmp/cxv-b2-workspace-cache-build.log。685文件新生产安装、202Web逐字节、运行时66/66、B1.2、相对--cd启动通过，结果/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-runtime-hb1f53e4/result.json。无真实凭据/外部模型。d10ceae将GUI fixture纳入仓库，启动HTTP200、两同名不同实例及临时目录检查通过，不等同GUI通过。余项与环境要求见B2-gui-acceptance.md。

GUI还观察到SDK的/clear被作为文字发送，属于尚未实施的原生命令/上下文控制B4；不将其作为“已对齐”的清空能力。SDK现代历史恢复的显示反馈仍不是模型消息注入。


### 后续实际GUI补证（同日）

可重复fixture d10ceae 的Safari页面通过pwd定位到临时one/same，stty size返回14 60；用原生窗口菜单缩短可视高度后返回5 60，保持固定60列且更新行数。随后从Header关闭当前A，URL回退精确B且mobile=1保留；关闭最后B返回workspaces=1选择器；点击A常规启动，恢复稳定A实例URL，默认scratch关闭。未使用真实模型/凭据。

Chrome再次30秒超时并重置CUA kernel，重连约26秒后是其他活动页面；窗口选择被工具的活动变化保护拒绝。Safari边缘拖动未改变窗口宽度，部分返回windowNotFoundAtPosition，不能算320px复测通过。剩余窄屏最终CSS、多scratch tab/滚动与真机边界保持未验收；参考B2-gui-acceptance.md。临时服务完成后按已核对的自有PID清理，不操作其他活动实例。

## 2026-11-19 最终源码纠偏检查点

前文保留历史审计时点，当前以B2-completion-matrix.md、migration-code-first.md与B2-gui-acceptance.md为准。Stop暂停/立即发送和POSIX监管已按用户持续推进授权落实，不再等待旧问卷；Windows强制回收未实现。

复核84e65cddc629e8b442e866c303883444901d5c19实际diff：Claude token streaming与turnActive分离不能照抄成Codex token-idle。当前_queryBusy从runStreamed启动一直保持到完成/失败/真实取消退出，工具静默不因无token变idle；scoped SSE晚连重放active由sdk-workspace-connections真实连接覆盖。14c39d4监管自有POSIX进程组，不声称Windows同等监管、审批producer/完整retry完成。无getContextUsage RPC结论仍有效，B8不因此完成。

3cbd71e修复真实GUI发现的关闭事件先卸载Header、轮询记忆丢失：既有reattachedTo随SSE/WS发送，AppBase先更新URL，其他实例/历史/退役回调忽略。桌面双端回退与Safari mobile=1保留参数通过；共享历史确认恢复、原native thread续发、无重复通过。最终1295/1295、0 skip、构建、685文件新安装/202Web字节、66/66、B1.2/CLI通过。真机软键盘/多指、虚拟键真实触控和最终指针跨项落点仍未通过，设备问答待，B2未整包完成，未压缩/推送。

2026-11-19 iOS追加补证：隔离iPhone16e/iOS18.6 Simulator移动Safari的软键输入、网页触控Enter/Up/保持键盘展开、20×60→37×60及scratch切回保留输出通过。CUA drag/scroll未观察滚动位移，原因未定；指针跨项落点/物理单多指惯性仍待。不是物理真机通过，无后续代码改动。
