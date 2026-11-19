# B2：SDK 会话、捕获归属与同名日志基础层

**2026-11-19 收口：用户明确认为B2已可验收，要求合并本地提交并推送main。B2现已完成，转入[B3准备](./B3-handoff.md)。下文未覆盖项仍未验证，保留为后续环境补验；旧检查点中的“未完成/待设备”是用户验收前状态，不再是当前收口阻塞。**

## 2026-11-19 续轮：工作区排序与启动期间取消

当前仍为B2（第3/12包），严格整包完成1/12；逐笔验证并提交，没有整体搬入上游大型混合提交。

| 本地提交/决议 | 上游映射与实际交付 |
| --- | --- |
| `d4bc607` | `eb2e9703a2`顶部排序子项。按cwd稳定instanceKey保存同源全局`cxv.sdkWorkspaceOrder.v1`，poll保留手工顺序、新项追加、只使用新鲜live行，旧/重复ID不产生标签。复用原生HTML拖拽与内部MIME上传隔离；移动按钮为rc-tabs role=tab与close的兄弟节点，支持键盘/触控、端点禁用、焦点回填、读屏提示和粗指针44px目标。storage事件同步其他页面；存储拒写仍保留本页内存顺序。不改变当前会话、URL、回合、关闭或历史恢复。 |
| `192f63d` | `bc669f59cc`状态等价审查发现的本地缺陷。接受回合后即拥有AbortController/running；代理ready/3秒超时race加入signal，interrupt及时结束等待、清旧队列、发出既有中断反馈及idle，不启动Codex子进程；finally清理监听/timeout，代理保留供后续输入复用；reset/close的generation隔离保留。 |
| `ad369d2856`不适用 | 完整diff仅Claude activeQuery.getContextUsage请求timer的unref/clear；当前Codex SDK 0.142.5公开接口及本地manager无此RPC，不新增死模块。上下文采集/血条刷新仍按其他条目核验，见[状态复核](./B2-sdk-state-review.md)。 |

验证：

- 排序纯逻辑5/5：`/tmp/cxv-b2-tab-order-focused.log`；实际React组件+hook/browser fixture及纯逻辑最终**9/9**：`/tmp/cxv-b2-tab-order-components-verified2.log`。覆盖同名cwd区分、不导航/无POST、按钮端点/焦点、poll新鲜状态/追加、重新构造恢复、取消/外部/关闭源拖拽无效、storage同步/清除、拒写时内存顺序，以及内部drag不触发上传。不是挂载DOM/原生drag/读屏器验收。
- 排序阶段源码全量**1252/1252、0 skip、无失败hook**（workspace5+web179+app864+integration204）：`/tmp/cxv-b2-tab-order-full.log`；构建`/tmp/cxv-b2-tab-order-build.log`。既有恢复探针`node cc-viewer-alignment/probes/b2-sdk-resume-ui.mjs`通过：`/tmp/cxv-b2-tab-order-resume-components.log`，CLI picker/恢复去重/草稿附件/只读保护保持。
- 取消先红：`/tmp/cxv-b2-sdk-startup-interrupt-red.log`（原行为interrupt返回false，随后仍执行）。修后定向**24/24**：`/tmp/cxv-b2-sdk-startup-interrupt-focused-final.log`。真实SDK+fake Codex确认无spawned标记/无原生thread、旧队列不执行、状态true→false、后续同实例输入成功；既有同名双目录HTTP/WS/SSE重连/中断/关闭/恢复/代次测试同时通过。
- 最终源码全量**1253/1253、0 skip、无失败hook**（5+179+865+204）：`/tmp/cxv-b2-sdk-startup-interrupt-full.log`；构建`/tmp/cxv-b2-sdk-startup-interrupt-build.log`。命令`env -u CXV_BYPASS_PERMISSIONS pnpm test`、`pnpm run build`。
- 最终**682文件tarball**及全新HOME生产安装：`/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-runtime-nq1uv95c/result.json`；同目录pack/install/runtime/b12-regression/cli-boot日志，汇总`/tmp/cxv-b2-sdk-startup-interrupt-installed-final.log`。关键源码/**202Web文件逐字节一致**，串行运行时**55/55**（含新取消用例）、B1.2合成凭据及隔离CLI相对--cd启动通过。fake Codex，无真实模型网络。排序阶段`cxv-b2-runtime-3bwbfxum`54/54只覆盖d4bc607，不代替最终产物。

过程留证：排序fixture最初漏CSS loader，随后给冻结React element附字段，最后after hook先还原window再卸载；修正fixture的loader、旁置元数据与清理顺序后9/9。失败日志`/tmp/cxv-b2-tab-order-components{,-final,-verified}.log`不计通过，产品未为绕过fixture错误而放宽行为。取消首轮focused误将两项新代次空状态断言改为true，恢复原断言后24/24；见[状态复核](./B2-sdk-state-review.md)。新取消用例修改前的失败是真实产品缺陷。

本轮CUA库存仍browsers=[]及`The browser access host is unavailable`。未导航活动Chrome页、未启动GUI测试服务，没有GUI通过证据。可复现环境沿用`/tmp/cxv-b2-gui.mjs`（独立HOME/日志、fake Codex、同名双cwd）：连接可用浏览器后开两个同源instance URL，拖动标签或用Tab/Enter/Space及移动按钮排序，等poll、刷新、新增/关闭工作区；预期顺序保持、焦点/当前高亮正确、各cwd/回合不串，另一页仅同步顺序、不跳工作区，外部文件上传仍正常且排序不出现上传遮罩。桌面/手机/平板、深浅色、真实触控/读屏/拖动仍待。

下一步继续SDK取消/失联/审批恢复及其余B2差异。`eb2e9703a2`其余目录树/Markdown/恢复等子项，`bc669f59cc`的Claude requires_action/无result grace等场景仍待；不响应SDK中断的原生子进程须另做受控复现，不能仅清UI busy冒充停止。不标整条混合提交或B2完成。两笔只在本地，未操作活动全局实例或真实凭据。

## 2026-11-19 续轮：手机终端容器尺寸与共享触控滚动

当前仍为B2（第3/12包），严格整包完成仅B0即1/12；本轮三笔是独立子项，均先验证、后提交，再进入下一笔。

| 本地提交 | 上游映射与实际交付 |
| --- | --- |
| `0dce135` | `99256ac1d8`固定60列/软键盘尺寸子项与`a3cc12619f`约2秒重试子项。复用主终端既有60列策略，抽取共用容器测量和生命周期管理；主PTY与scratch手机分支用实际host的clientWidth/clientHeight，监听ResizeObserver和visualViewport.resize（缺失回退window.resize）。隐藏tab不轮询，显示后refit；渲染器40次×50ms有界重试；新测量取消旧排期，卸载断开observer/viewport及取消帧/定时器，迟到回调检查终端身份。主PTY仅首次测量建立geometry-ready和既有bootstrap，后续变化仅sendResize；桌面/平板仍用fit。 |
| `cef0070` | `99256ac1d8`共享触控及`2ea5181df8`多指anchor修复子项。主终端原有像素累积/rAF批处理/惯性滚动抽成共用helper，并接入scratch手机和平板；使用xterm公开scrollLines。多指或主触点变更重置anchor、速度及积压，touchcancel刷剩余但不惯性，长按后不复用过期速度；卸载取消动画并移除四种触摸监听，捕获到的迟到回调也不再读已dispose的renderer。 |
| `3d66bb6` | `99256ac1d8`手机scratch资源预算子项：直接复用TerminalWriteQueue既有highWaterBytes/trimTargetBytes选项，手机用1MiB/256KiB，iOS手机scrollback从1000限制为200；桌面/平板保持本地既有预算。沿用已有trim→resync-request重放通道，未更改服务端或持久日志。 |

验证与产物：

- 第一笔定向7/7：`/tmp/cxv-b2-mobile-layout-focused.log`；全量**1235/1235、0 skip**（workspace5+web162+app864+integration204）：`/tmp/cxv-b2-mobile-layout-full.log`；构建`/tmp/cxv-b2-mobile-layout-build.log`。真实组件方法探针`/tmp/cxv-b2-mobile-layout-components.log`。
- 第二笔定向含前项15/15：`/tmp/cxv-b2-mobile-touch-focused.log`；最终全量**1243/1243、0 skip、无失败hook**（5+170+864+204）：`/tmp/cxv-b2-mobile-touch-full.log`；最终构建`/tmp/cxv-b2-mobile-touch-build.log`。命令`env -u CXV_BYPASS_PERMISSIONS pnpm test`、`pnpm run build`。
- `node cc-viewer-alignment/probes/b2-scratch-ui.mjs`，最终`/tmp/cxv-b2-mobile-touch-components-final.log`：真实React/Mobile/TerminalPanel/ScratchTerminal类，desktop/phone/pad三模式；验证scratch初始化时的触控接线、实际refit/resize消息、主PTY只bootstrap一次、手机键盘缩高后60×20、桌面/平板仍fit、卸载清理，以及既有按instance存储/tab/keybar/关闭检查。实际Mobile构造默认关闭、overlay关闭集合含terminal且全部false；没有新增移动端刷新持久化。浏览器事件/尺寸由fixture提供，**不等同挂载DOM、CSS、真实触摸或设备软键盘验收**。
- 第三笔为低影响配置适配，没有新增镜像配置的单测。实际组件队列连续四段300KiB输出：手机触发既有resync-request，desktop/pad保持既有较大预算；desktop/Android phone/iPhone/pad四模式fixture均通过，`/tmp/cxv-b2-mobile-budget-components-final.log`。最终源码全量仍**1243/1243、0 skip、无失败hook**：`/tmp/cxv-b2-mobile-budget-full.log`；构建`/tmp/cxv-b2-mobile-budget-build.log`。iOS200行策略尚未真机验证，合成burst不是高负载验收。
- 最终实际**682文件tarball**与全新HOME生产安装：`/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-runtime-7qtbslcv/result.json`；同目录pack/install/runtime/b12-regression/cli-boot日志，汇总`/tmp/cxv-b2-mobile-budget-installed-final.log`。关键服务端源码和**202个Web文件逐字节一致**；串行运行时**54/54**、B1.2合成凭据回归与隔离CLI相对--cd启动通过。使用fake Codex，不是实际模型网络/真实迁移/高负载验收。

上游核对：固定快照仍是`74cd752d`，本地`/tmp/cxv-cc-viewer-research`；已读`99256ac1d8`相关组件/共享工具与后续`a3cc12619f`、`2ea5181df8`对应diff。`1bfc1585e8`明确只持久化桌面App开关，Mobile保持原有默认关闭与互斥行为；没有依据桌面提交擅自增加移动端全局开关持久化。两条后续提交含slow-upstream/composer/task等混合变化，本轮只映射明确子项，不标整条完成。`99256ac1d8`的移动scratch输出水位/iOS scrollback策略由第三笔补齐；其余适配及真实设备验收仍保留部分状态。前两笔的安装证据`cxv-b2-runtime-hzui9tw8`只覆盖到cef0070，最终版本以上述7qtbslcv为准。

实例化限制：本轮重新调用CUA库存，仍返回browsers=[]及`The browser access host is unavailable`，未操作活动Chrome页面；没有GUI通过证据。可复现环境沿用隔离fake Codex服务`/tmp/cxv-b2-gui.mjs`（专用HOME/日志、同名双cwd），连接可用浏览器后分别打开带instance的URL及`&mobile=1`/`&ipad=1`；打开终端、增加/切换/关闭tab、打印足够滚动行、单指拖动/多指过渡/系统取消，再用真机软键盘开关及横竖屏检查底部keybar、60列和可见行；另一工作区/另一客户端输出不得串线。桌面/平板保持fit、深浅色/键盘访问、SDK聊天输入与scratch命令并存仍需GUI复验。本轮没有启动GUI测试服务、迁移真实凭据、切换活动实例或推送。

## 2026-11-19 续轮：CLI恢复与网页选择器接线

用户“继续”确认前轮推荐的两项产品选择：仅当前工作区Viewer SDK档案，缺失拒绝；不带ID的resume打开网页历史选择器。`9a1f1c1`先独立修正SDK参数解析（见下一节），`8b14ef2`再完成CLI启动接线，映射`3079040494`/`a84385b5a8`的恢复子项，仍不等同两条上游提交或B2整包完成。

CLI在注册工作区、启动HTTP/浏览器及模型前，用只读project-id解析和共享Codex invocation识别目标，复用readSdkResumeHistory严格校验。指定ID精确命中当前cwd/project；--last优先现有项目latestSessionId所指SDK档案，再按创建时间/序号选择当前cwd的可恢复SDK档案。缺失、其他cwd、非SDK、无效ID、坏元数据、无法定位的latest指针及损坏目标拒绝，不通过选择旧档案掩盖错误；--all/--include-non-interactive明确拒绝。SDK不可用时恢复命令报错，不降级PTY放宽范围。

抽出server.restoreSdkSessionFromHistory供HTTP与CLI共用，保留flush、异步活动/生命周期复核、完整input及成功末条助手回复、配置/权限/回调、file pin及定向receipt事件。CLI先初始化、恢复并pin，再启动HTTP，故首条新回合前snapshot已指向指定旧档案；保存恢复前的initialPrompt，防止reset清掉，且只发送一次。系统审批配置须插入--前，避免作为字面prompt发给模型。裸resume打开带resume=1的网页URL，禁止启动提示回合（包括带--profile等选项值的情况）；已有Tabs以此打开Modal，关闭时移除resume参数，保留instance/token/base；切换工作区也移除该一次性参数。不扫描原生-only Codex会话，后续真实native线程是否仍可用需真实模型验收。

验证：

- 参数解析定向20/20：`/tmp/cxv-b2-sdk-args-focused-final.log`。CLI+HTTP定向12/12：`/tmp/cxv-b2-cli-resume-focused-final2.log`；选档6/6：`/tmp/cxv-b2-cli-resume-selection.log`；最后picker保护5/5：`/tmp/cxv-b2-cli-resume-picker-final.log`。
- 最终源码全量**1228/1228、0 skip**：`/tmp/cxv-b2-cli-resume-full-final2.log`（workspace5+web155+app864+integration204）。构建：`/tmp/cxv-b2-cli-resume-build-final.log`。所有最终源码均已覆盖，不以早期安装结果代替最终版本。
- 当前环境实际运行独立CLI进程、真实SDK和fake Codex子进程、HTTP、fake浏览器open：相对-C与配置夹在命令/ID间；同名另一cwd即使同thread ID也不串；旧档案先于新turn可见；continue归一化--last；精确新prompt一次及模型/sandbox保留；累计input保留旧问答；裸resume不执行模型；缺失/外部/非SDK/非法选项拒绝且未注册工作区/开浏览器；坏尾/坏manifest拒绝并字节保留。
- `node cc-viewer-alignment/probes/b2-sdk-resume-ui.mjs`，日志`/tmp/cxv-b2-cli-resume-components.log`：真实组件方法及hook-state fixture检查URL打开picker、取消关闭、移除参数且保留instance/token/base，既有恢复去重、只读页及草稿/附件/缓发保护仍通过。不是挂载DOM/Modal portal或GUI点击验收。
- 最终安装`/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-runtime-q86vai7m/result.json`（汇总`/tmp/cxv-b2-cli-resume-installed-final.log`）：实际682文件tarball、全新HOME生产安装；关键源码（含cli-args）及202Web文件字节一致；串行运行时**54/54**、B1.2合成凭据回归、隔离CLI相对--cd启动通过。fake Codex，无真实模型网络。

失败留证：`/tmp/cxv-b2-cli-resume-focused.log`初次fixture用macOS /var临时路径播种，但子进程process.cwd为/private/var，严格cwd检查正确拒绝；仅将fixture根解析为真实进程路径，产品身份仍为path.resolve，无realpath合并。`...focused-final.log`暴露真实bug：自动审批配置追加在--后，初始prompt多出-c文本，已移入--前，后续12/12和全量通过。最终又为裸picker加不可自动发送的显式保护，并重跑全量/构建/新安装。旧预保护安装`.../cxv-b2-runtime-_bkta65f`仅为过程证据，不作为最终版本验收。

GUI再次查询返回`The browser access host is unavailable`、browsers为空；没有操作活动Chrome页面。待用户可连接浏览器时，用上述隔离HOME/日志与fake Codex、当前workspace历史播种，启动`node packages/app/cli.js --sdk -C <cwd> resume`，预期自动打开仅该cwd历史Modal，取消/恢复后URL不再带resume=1；恢复后继续一次、刷新、草稿/附件、同名另一页不受影响及桌面/手机/平板样式仍需真实DOM/触控验收。真实模型还需被恢复的原生Codex线程存在和可用凭据。本轮未操作活动全局实例或真实凭据；提交暂留本地。下一步继续B2移动开关/固定列/触控/软键盘与双浏览器验证。

## 2026-11-19 续轮：CLI策略确认与共享参数解析

用户“继续”确认仅当前工作区Viewer SDK档案（缺失拒绝）及裸resume网页picker。首先复用cli-args.parseCodexInvocation/stripResumeInvocation替换SDK重复的resume扫描；配置夹在命令和ID之间不再把ID当提示词，--之后保留字面提示词且不解析-C。本地提交`9a1f1c1`，定向20/20，`/tmp/cxv-b2-sdk-args-focused-final.log`；初次新断言误用空字符串而既有API返回null，已纠正后重跑。映射3079040494/a84385b5a8恢复子项，CLI历史实际接线仍待；未标整条或B2完成。

## 2026-11-18 续轮：恢复水位专项已具备与CLI策略待定

`dc5989a` 仅新增`packages/app/tests/log-v2-resume-watermark.test.js`，没有运行时代码变更。已完整阅读上游`bd32d02884`的live-feed、测试、changeset及history diff：其缺陷是旧目录重新attach时suppressExisting读到了当前EOF，把上次观察后、attach前的新turn和新conv文件吞入历史；修复保存旧字节水位、抑制到该水位，再把之后的数据live转发。

当前架构已具备对应语义：`timeline-watcher.createPublisher`以快照cursor.throughSeq/timelineBytes构造检查点（显式seed或按throughSeq重建），`transport.readV2WireCommitsFromCursor`仅从cursor.timelineBytes读取严格连续后缀，注册后立即pump关闭snapshot/subscribe竞态。空闲发布者释放后，新发布者仍从客户端快照水位恢复；不把当前EOF当作已经消费的水位。新thread的输入/对象ref通过同一提交帧送给客户端reducer。故复用已有实现，不复制上游_seenSizes/conv文件结构。

新4项实际文件/worker/独立进程回归矩阵：冷历史及idle释放后重挂，分别带/不带seedCheckpoint。另一个Node进程复用同一档案写入累计主会话输入及新子线程，并在attach前退出；没有任何后续写入可以“救回”首次后缀。验证只收到水位之后两笔提交（无历史重放），真实reducer+内容对象还原精确等于源主/子条目；之后追加一笔，再验证序列无重复。定向19/19（含既有transport），全量1221/1221、0 skip，证据`/tmp/cxv-b2-resume-watermark-{focused,full}.log`。上游条目记**已具备（附证据）**；这是对恢复live语义的核验，不等于B2整包或GUI通过。

安装证据`/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-runtime-8jnfegdm/result.json`，实际682文件tarball和全新生产安装，关键源码/202个Web文件字节一致，新回归与既有SDK/认证/生命周期运行时47/47，B1.2合成凭据回归和隔离CLI相对--cd启动通过。运行时未变，无需重跑已有Web构建；npm pack/prepack保护及产物检查通过。未操作GUI、真实模型或活动实例。

CLI只读审查：`cli.js`把归一化参数传给SDK私有解析器；`sdk-manager`显式忽略--last，裸resume没有picker，指定ID也没有复用Viewer历史seed。共享`cli-args.parseCodexInvocation/stripResumeInvocation`已具备selector/参数位置识别能力，应复用而非新写解析器。当前原生Codex-only会话是否可恢复、缺Viewer档案时如何处理，以及裸resume是否开网页picker，属于用户AGENTS.md要求先问的产品方向。已通过问题工具询问两项，仍待回复，**不得将超时/未答视为同意**；未开始依赖这些选择的CLI行为变更。推荐当前工作区仅Viewer SDK档案（缺失报错）及网页选择器，用户选择优先。等待期间完成本独立水位专项。

工作包计数已按用户状态问题说明：B0–B11共12包，当前第3包B2；严格整包完成仅B0即1/12。B1为本地实现/隔离验收通过，真实用户迁移未验收，不算整包完成。不能将本地提交笔数或当前阶段序号当337条上游提交的完成比例。

## 2026-11-18 续轮：SDK历史列表、恢复HTTP及前端入口

| 本地提交 | 对应范围 |
| --- | --- |
| `afd5103` | 上游`1bfc1585e8`桌面SDK面板开关刷新恢复；默认关闭、独立全局偏好，与主PTY/嵌套scratch解耦。 |
| `2d95017` | `3079040494`/`a84385b5a8`恢复基础层：只读完整SDK档案、精确cwd/线程、busy保留及异步活动/生命周期租约。 |
| `cac3aa1` | 同上恢复HTTP子项：`GET /api/resume-sessions`、`POST /api/resume-session`按URL/启动实例解析。body实例冲突、跨cwd历史、不完整/坏库、过期实例拒绝；原生线程ID拒绝`--last`/`-c`等CLI选项形值、控制字符、路径及synthetic ID。恢复不执行模型回合；下次输入走SDK原生resumeThread。 |
| `87796f8` | 同上前端子项：标签栏最近50条历史入口、运行中/当前会话按钮状态及错误反馈，原地更新档案；HTTP/SSE共用resumeId去重，事件仅投递所属实例。保留已挂载聊天、未发送草稿与附件；取消旧缓发和已提交占位，清旧缓存时取消尚未完成的旧写入，异步hydrate须匹配恢复代次。只读历史页不因另一浏览器恢复而改成live，显式“继续对话”才切换。 |

HTTP恢复先flush已有日志写入，再由基础层读取/复核；用恢复文件pin保证第一条新模型消息前，snapshot/live已指向选定旧档案。关闭/stop-all清pin；SDK线程变更时pin失效。旧live订阅经既有active-file检查发出`CXV_LOG_V2_ARCHIVE_CHANGED`，前端重建，不把另一工作区内容带入。应用沿用启动owner认证、模型/权限/回调与可执行文件；未改配置/凭据。

源码验证：最终 **1217/1217、0 skip、无失败hook**，`/tmp/cxv-b2-resume-ui-full-final.log`；构建`/tmp/cxv-b2-resume-ui-build-final.log`。HTTP阶段定向23/23，全量1213/1213；UI定向web5/5、服务端7/7。后端真实SDK+fake Codex/HTTP/WS/SSE证明：两个同名cwd各列自身档案；非法body/冲突/陈旧anchor/跨cwd拒绝；busy保队列；切换前的snapshot/live改绑；旧订阅reset；恢复后的累计input保留旧问答而排除另一新会话，另一工作区线程不变；坏尾拒绝并保留字节；事件receipt仅投给所属实例。证据`/tmp/cxv-b2-resume-http-{focused-verified,full-verified,build-verified}.log`、`/tmp/cxv-b2-resume-ui-{web-focused,server-focused}.log`。HTTP首轮列表为空的失败保留在`/tmp/cxv-b2-resume-http-focused.log`：调用方传canonicalCwd而helper读cwd，已显式适配后重跑，未将失败计通过。

组件状态探针：`node cc-viewer-alignment/probes/b2-sdk-resume-ui.mjs`，证据`/tmp/cxv-b2-resume-ui-components.log`。真实AppBase/ChatView类及React，使用浏览器API fixture，验证跨实例过滤、HTTP/SSE去重、只读页不自动跳转、显式恢复清只读URL且保留token、卸载后迟到事件拒绝；草稿/附件保留、缓发取消、旧pending提交清理及恢复epoch触发更新。初次fixture缺少DOM style/getAttribute/createElement，补充fixture后通过；未改变产品代码以绕过该环境缺口。该探针不等于Modal点击、实际DOM/触摸/尺寸或GUI验收。

最新安装证据：`/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-runtime-rch104x2/result.json`，同目录tarball、pack/install/runtime/b12-regression/cli-boot日志。682文件，全新生产安装，server/SDK/adapter/history/存储关键源码及202个Web文件逐字节一致，串行运行时 **43/43**，B1.2合成凭据回归与隔离CLI相对--cd启动通过。fake Codex，不是实际模型或真实用户凭据迁移。

本轮GUI入口重新查询仍报`The browser access host is unavailable`，没有操作既有Chrome页面，也没有新增GUI通过证据。复现环境：独立HOME/CODEX_HOME/CXV_LOG_DIR、SDK+fake Codex、可连接的桌面浏览器及同名双cwd，先由`packages/app/tests/sdk-workspace-connections.test.js`复现两会话/恢复HTTP与live流程，再在隔离Viewer使用带instance URL打开“历史会话”，检查当前标记、busy拒绝、恢复/继续输入、同名另一页不受影响、草稿/附件保留、关闭modal、刷新、桌面/手机/平板/深浅色和键盘/触控。真实模型验收还需原生Codex会话实际存在及可用凭据；本轮未调用真实模型来探测这些条件。

以上为本地恢复链路实现/隔离验收，`3079040494`/`a84385b5a8`仍部分实施。CLI启动`resume <id>`/`--last`尚未复用该历史恢复链路；需专项复核，不能将浏览器恢复测试等同CLI恢复通过。`bd32d02884`的feed suppression水位修复也仅有相邻恢复场景证据，尚待读完整diff和专门复现，不标已对齐。

## 2026-11-18 续轮：SDK历史恢复基础层

`2d95017` 仅SDK恢复基础层，映射`3079040494`/`a84385b5a8`恢复子项，尚无HTTP/列表/可见恢复入口。复用V2 resolver返回已验证project/session身份、现有reader worker背压流及SDK初始化；严格模式拒绝不完整尾部，普通历史浏览保持原有容错。仅同cwd/project的source=sdk、非synthetic原生根线程可载入；校验每个SDK主记录身份，重建最后累计input及成功助手输出，不把Error反馈当native回复。读取前后档案/manifest/时间线身份变化拒绝，canonical数据只读。

`resumeSdkSession`在加载前拒绝busy；registry对象+generation/activity revision在加载后复核，新消息（即使已完成）、中断、重置、关闭重开使旧请求失效。应用时复用初始化更新proxy/generation并保留配置、权限、可执行文件和回调，线程切换不发送模型回合，下一次输入使用SDK原生resumeThread，显示历史不会被新回合的累计input截断。

定向31/31、全量1211/1211/0 skip、构建，日志`/tmp/cxv-b2-resume-foundation-{focused-final,full,build}.log`。定向首轮未设置CXV_TEST，所有业务断言通过但StatWatcher/后台writer MessagePort阻止退出；诊断`/tmp/cxv-b2-resume-handles.log`。只终止75111/75134/86631本轮测试进程，按npm test使用的CXV_TEST=1/CXV_LOG_DIR=tmp重跑完成，未为此改变运行时代码。最终安装`/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-runtime-uwklrw65`，682文件、关键源码/202Web字节一致，41/41、B1.2/CLI通过；fake Codex原生resume参数及历史/同名隔离/队列/迟到拒绝通过，真实模型/原生Codex会话可用性与GUI未验收。

## 2026-11-18 续轮：桌面SDK面板刷新恢复

`afd5103` 适配上游`1bfc1585e8`：单独保存全局SDK面板开关，默认关闭；构造时恢复，Header及右侧按钮共用持久化setter。与主PTY terminalVisible及原生嵌套scratch-open解耦，存储不可用不妨碍UI切换。移动端overlay互斥状态不包含在该上游提交内，本笔未扩展为移动端刷新恢复。

定向5/5，全量1203/1203、0 skip、构建通过，`/tmp/cxv-b2-scratch-persist-{focused,full,build}.log`。全新生产安装目录`/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-runtime-lzs0ag49`，681文件、关键源码及202Web产物字节一致，串行运行时33/33+B1.2及隔离CLI相对--cd启动通过。新查询CUA环境仍报The browser access host is unavailable，未操作既有Chrome页；GUI未验收。源码/安装通过不标真实交互完成。

## 2026-11-18 续轮：SDK scratch可见面板

`a9197c2` 复用TerminalPanel原有scratch标签组，抽出共用渲染分支，无重复实现主PTY功能。SDK分支跳过主xterm初始化、主WS订阅和resize周期任务；桌面Header/侧边按钮打开scratch，手机和平板仅由Mobile overlay挂载；切换模式强制重挂，避免异步SDK检测复用主PTY实例。手机横向tab轨道及44px触摸目标、虚拟键发送当前scratch标签；tab支持方向键/Home/End和aria控制关联。关闭面板仅断开视图，shell沿用既有后台/idle语义；关闭工作区仍由b1b3c7a精确回收。

scratch tabs/active/open/height的原生嵌套状态按页面instance加后缀，旧无实例存储保留；SDK可见面板的开关当前仍仅页面state，刷新默认关闭，独立上游`1bfc1585e8`尚待适配。SDK聊天输入及文件路径插入、上传目标不因scratch打开而走主PTY；不把scratch shell输入当模型消息。

对照并部分适配上游`efc7f8eab1`的SDK scratchOnly/输入并存、`2be5bb23f6`的工作区分组和`99256ac1d8`的Mobile单宿主/手机可见/keybar。上述提交还含floating composer、恢复、触控滚动/固定列/软键盘布局等其他内容，尚未逐项实现或验证，不标整条完成。模型SDK/工作区上游`3079040494`/`a84385b5a8`也仍部分实施。

验证：`/tmp/cxv-b2-scratch-ui-full.log`全量 **1201/1201、0 skip**；`/tmp/cxv-b2-scratch-ui-build-verified.log`构建通过（最后仅补CSS容器收缩约束）。组件级探针 `cc-viewer-alignment/probes/b2-scratch-ui.mjs`，运行`node cc-viewer-alignment/probes/b2-scratch-ui.mjs`；证据`/tmp/cxv-b2-scratch-ui-components.log`。使用真实React/组件类，三种模式都验证不初始化主PTY、按实例恢复tabs、当前tab虚拟键、键盘选tab、关闭panel及保留旧存储。该探针省略CSS、DOM/MutationObserver使用fixture，不是GUI验收，也未验证真实xterm尺寸、触摸滚动或软键盘。

探针构建时发现已有`classifyUserContent`会在command元数据路径给const重赋值。独立`20d7a29`改为可重赋值声明，新增最小回归先红后绿；定向command/UltraPlan **10/10**。日志`/tmp/cxv-command-classification-{red,focused}.log`，最终全量包含该用例，安装后的真实分类函数也通过。此为本地前置缺陷修复，不凭此新增任何整条上游对齐结论。

最新最终安装目录 `/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-runtime-q5zvwny2`，681文件tarball及全新生产安装，关键源码含scratch/contentFilter字节一致，202个Web文件逐字节一致；串行运行时 **33/33**，B1.2回归及隔离CLI相对--cd启动通过（同目录result.json/runtime.log/b12-regression.log/cli-boot.log）。全程fake Codex，未触真实模型或凭据。此前并发安装ready超时仍保留在lnuhwc0q/runtime.log，串行成功不能等同高负载通过。

真实GUI限制及可复现步骤沿用下节标签页记录：host不可用，Chrome未确认停留隔离页，没有GUI通过证据。待验证顶部切换、发送/取消、scratch打开/关闭/刷新、双浏览器同名目录、桌面/手机/平板、深浅色、键盘/触摸/软键盘。临时测试服务已清理，活动实例未操作。

## 2026-11-18 续轮：scratch shell实例归属

`b1b3c7a` 对齐 `a84385b5a8` 的关闭/scratch清理子项及 `3079040494` 的会话隔离前置：scratch WS与主WS共用可信实例解析；无实例仍绑定启动cwd，空/过期实例拒绝。shell按(instanceKey, scratchId)复用，打开目录取握手绑定而非全局active；关闭单实例同时回收它的shell与连接，stop-all回收全部。PTY动态加载尚未完成时关闭会取消启动，不生成迟到shell；旧shell退出/finally及旧WS的kill不能删除或杀死同ID替代shell。前端scratch握手携带页面instance，并保留token、base path及id。未更改原生PTY模式无实例接口。

新增4个回归在修改前均失败，修改后定向 **20/20**；全量 **1200/1200、0 skip**、构建通过。证据 `/tmp/cxv-b2-scratch-{red,focused,full,build}.log`。真实HTTP/WS覆盖同名双cwd、相同scratch id、默认启动绑定、关闭一方另一方继续、关闭发生在loader await、全部停止与重开。

实际681文件安装目录 `/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-runtime-lnuhwc0q`，关键源码字节一致。首轮并发runtime.log出现SDK fake子进程5秒ready超时、最终28/33；该次不通过。安装SDK文件与源码依赖hash相同；同目录单跑连接6/6（`/tmp/cxv-b2-scratch-installed-sdk-diagnose.log`）。同一个安装包串行重跑 **33/33**（runtime-serial.log）、B1.2回归及隔离CLI相对--cd启动通过；result.json记录最终结果。未以修改产品代码或延长断言来掩盖超时；并发安装测试的时间敏感性仍需后续目标环境复核。

真实node-pty而非stub：独立临时HOME、SHELL=/bin/sh、同id两个同名目录分别执行pwd并检查输出；同实例重连复用；关闭A后B继续执行printf。源码及上述安装目录都通过，证据 `/tmp/cxv-b2-scratch-real-{source,installed}.log`、可复现脚本 `/tmp/cxv-b2-real-scratch.mjs <app目录>`。不涉及模型或网络。

GUI未增加验收；SDK移动端仍需把主PTY替换为scratch面板，桌面可见入口与按实例的scratch tabs持久化也待。以上仅基础归属/生命周期完成，不等于所有scratch UX或整条上游完成。

## 2026-11-18 续轮：顶部工作区标签页

用户选择顶部标签页。新增 `d39d3a8`：已有工作区显示名称及完整 cwd，可切换、打开选择页、确认关闭指定 instance；切换保留后台回合。关闭当前实例跳转服务端返回的存活实例，无存活实例回选择页；关闭后台实例保留当前页。SDK 无实例根入口先规范到启动实例再恢复缓存。源码跟踪时发现桌面/移动端主动排除了 SDK WebSocket，现已启用同一条已按实例绑定的输入/审批连接。工作区列表提供当前实例与 busy 状态，关闭后的旧 URL 可检测工作区选择模式。

独立测试维护提交 `c9a3e65`：首轮业务断言通过但 Git after-hook 出现 `ENOTEMPTY`，该次不记全量通过；使用 Node rmSync 原生 maxRetries/retryDelay 处理瞬时清理竞争，移除固定等待。定向 Git29/29；重跑全量 **1195/1195、0 skip、无失败 hook**，构建通过。证据：`/tmp/cxv-b2-tabs-full.log`（首轮失败）、`/tmp/cxv-b2-tabs-full-final.log`、`/tmp/cxv-b2-tabs-build-verified.log`；标签页定向导航/缓存7/7、SDK服务端12/12。

最终681文件tarball及全新生产安装：`/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-runtime-b0_6ms2v/result.json`，同目录 runtime.log、b12-regression.log、cli-boot.log。关键源码字节一致，运行时28/28、B1.2合成数据回归和隔离CLI相对--cd启动通过；使用fake Codex，没有真实模型网络。覆盖此前尚未重装的818fff8/597ff7a及本轮代码，后文旧安装证据仅为历史。

本轮GUI尝试：浏览器host仍不可用；原生Chrome导航后未观察到隔离页，前台出现既有页面，未继续操作该页面。专用测试服务20140已清理；fixture `/tmp/cxv-b2-gui.mjs`、日志`/tmp/cxv-b2-gui-tabs.log`，本轮数据目录`/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-gui-3ihazF`。GUI未通过，不能将组件构建或HTTP测试当作GUI验收。复现：启动独立HOME/fake Codex的fixture，按打印的instance URL打开，测试同名双目录发送、后台切换、分别关闭及刷新，再测移动视口/深浅色/键盘；预期各自cwd/历史/回复/队列不串线。

上游`3079040494`/`a84385b5a8`仍部分实施。下一笔scratch终端归属及关闭生命周期，然后恢复与完整GUI验收。

## 2026-11-18 续轮：工作区、连接及浏览器基础接线

| 本地提交 | 交付 |
| --- | --- |
| `06fac6f` | SDK 启动模板复用，继承模型/权限/可执行文件/回调，排除首目录的恢复 ID、初始提示和 cwd；同目录 launch 复用正在运行的回合与队列；参数与 config key 校验。 |
| `6b982c8` | 用户选择整个 Viewer 统一登录，并固定使用启动工作区生效配置。HTTP 与 WS 共用 Cookie；切换不换密码；修改启动 owner 密码仍使 Cookie 失效，其他目录的密码不接管本 Viewer。 |
| `14c3ae5` | WS/SSE 绑定握手实例，未带 instance 的旧连接绑定启动 cwd；未知/空/冲突/关闭 anchor 拒绝，无活跃实例回落。按实例过滤状态、进度、上下文及通知，SSE 重连补对应状态，发送错误在聊天界面提示。 |
| `7415615` | SDK 工作区 launch/reuse/close/stop-all；文件/搜索/Git/AGENTS/统计/快照/live 等按请求实例读取；保留各实例恢复状态；删除日志保护全部存活实例；坏日志元数据拒绝且撤销新会话；相对 --cd 统一到启动身份。 |
| `818fff8` | 图片上传/移除通知只投递同工作区其他连接，身份冲突拒绝。 |
| `597ff7a` | SDK launch 后导航至带 instance 的页面；HTTP/WS/SSE 携带 instance，保留 token 与 base path；显式实例不被覆盖。相同项目名的会话缓存、移动端缓存元数据按页面实例分开；旧无实例缓存保留。 |

用户确认：SDK 多工作区使用**统一 Viewer 登录**；统一配置 owner 是**启动工作区原本生效的项目或全局配置**。切换不切换密码；没有迁移或删除其他工作区密码。每次认证仍重读启动 owner，权限配置修改仍失效旧 Cookie。

源码最终全量 **1192/1192、0 skip**，构建通过。分笔证据：

- 启动模板：定向13/13、全量1182/1182，`/tmp/cxv-b2-launch-{focused,full,build}.log`。
- 认证归属：定向22/22、全量1183/1183，`/tmp/cxv-b2-auth-scope-{focused,full}.log`。
- 连接：定向22/22、全量1185/1185、构建，`/tmp/cxv-b2-connections-{focused,full,build}.log`。
- HTTP/lifecycle：定向20/20后新增真实 V2 live 验证，全量1188/1188、构建，`/tmp/cxv-b2-http-{focused-final,full,build}.log`。最初测试把名称分配顺序写死为 B 必须带摘要，实际直接 SDK fixture 未先保留启动目录时 B 先取得可读名；改为符合 CLI 的初始化并验证两个绑定各自稳定，没有强行指定某一路径必须取得可读名。
- 图片：全量1188/1188、构建，`/tmp/cxv-b2-images-{full,build}.log`。
- 浏览器请求/缓存：最终 `/tmp/cxv-b2-browser-scope-full-final.log`、`/tmp/cxv-b2-browser-scope-build-final.log`。包含 URL/base path/token/显式空 anchor 与 IndexedDB API fixture 的同名双实例数据及缓存清理隔离。

真实 SDK + fake Codex、实际 HTTP/WS/SSE 验证了各自回合和中断、同名文件读写/搜索/Git、V2 snapshot/live、停止/关闭及坏存储拒绝；live 测试覆盖一秒 active-file 轮询期间另一实例切换/写入。没有调用真实模型。

安装证据：`/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-runtime-et66u7if/result.json`，同目录 runtime.log、b12-regression.log、cli-boot.log 和 tarball。681 文件全新生产安装，server/cli/SDK/proxy/存储关键源码字节一致，运行时 **28/28**、B1.2 双 owner/迁移/备份/认证/修复/拒绝及隔离 CLI 相对 --cd 启动通过。CLI 验证使用独立 HOME、fake npm/codex/open，未执行模型回合。**这份安装证据截至7415615，最后两笔818fff8/597ff7a尚未重新打包安装复验。**

GUI 尝试：浏览器工具报告 `The browser access host is unavailable`，随后使用本机 Chrome 准备验证；导航操作返回 `This application session has been explicitly stopped by the user for this turn`，按要求停止 GUI 操作，没有把 GUI 标为通过。准备的临时服务 `/tmp/cxv-b2-gui.mjs`，数据目录 `/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-gui-180sXq`，专用端口20140、fake Codex，无真实凭据。服务已发送 SIGTERM 清理，证据 `/tmp/cxv-b2-gui-info.json`、`/tmp/cxv-b2-gui.log`。恢复验证时需新启动隔离服务，在桌面浏览器打开其带 instance URL，发送测试提示，确认回复与 calls.jsonl 都属于所选实例，再测双标签/切换/关闭/刷新及移动端；实际结果尚待。

2026-11-18。本轮在当前 `main` 目录继续开发，四笔分别验证后独立提交。没有重启活动实例、迁移真实凭据或推送远端。

| 上游条目 | 本地提交 | 本轮交付 |
| --- | --- | --- |
| `3079040494` / `a84385b5a8` 生命周期前置 | `44a80e7` | 捕获代理由独立 owner 管理；取消异步启动立即结束等待；旧代理的停止、迟到 close 和模型观察不污染新实例；全部存活端口参与自转发和代理配置排除。 |
| 同上，会话基础层 | `a00ed8a` | 每个规范化 cwd 独立持有 SDK client/thread、队列、历史、generation、代理及回调；稳定 instanceKey，提供 list/attach/close 和精确 anchor；同名歧义返回 409，陈旧实例不回落到活跃项目。 |
| 同上，真实请求归属 | `12d2188` | 使用 Node AsyncLocalStorage 将捕获请求绑定到可信代理 owner；落盘归属不受随后切换的全局目录或请求体/请求头伪造目录影响，不改动实际上游请求体。 |
| 同上，存储兼容前置 | `c3e3e6b` | 既有日志目录保留；新路径发生名称冲突才分配“项目名--路径摘要”。复用现有项目 manifest、文件锁及原子写；工作区日志统计按绑定读取。 |

两条上游提交仍为**部分实施**，不能把基础层测试通过写成产品端多工作区已经可用。前一笔 `a094282` 的旧回合隔离继续保留。

## 用户已确认的决策

- 同一个目录再次打开时复用该目录的常驻 SDK 会话，切换目录保留后台会话。显式 `initSdkSession` 用于初始化/重置，切换应使用 `attachSdkSession`。
- 仅发生冲突的新路径增加日志摘要，已有目录和档案保持原位。没有执行存量日志迁移，也没有统一重命名全部项目。

SDK 身份使用 `path.resolve(cwd)`，不使用 realpath 合并符号链接拼写；instanceKey 为路径摘要。SDK 的 `--cd` 在注册身份前解析，确保执行目录和日志目录一致。低层 writer 对同一 projectId 绑定其他 cwd 仍然拒绝；运行时在其上增加带锁的冲突分配。摘要绑定会在重启后复用；原始同名项目被删除时，已存在的摘要目录仍保持稳定。长名称的摘要后缀遵守现有编码长度限制。

损坏 manifest、已有会话但缺失项目 manifest、项目/manifest 符号链接及摘要绑定不符时拒绝分配，不通过换个目录掩盖损坏。

## 已执行验证

| 批次 | 结果与证据 |
| --- | --- |
| 代理 owner | 定向 40/40；全量 1169/1169；构建、680 文件预览。`/tmp/cxv-b2-proxy-{focused,full-final,build,pack}.log`。 |
| SDK 会话 | 定向 8/8；全量 1173/1173；构建。`/tmp/cxv-b2-sessions-{focused,full,build}.log`。真实 SDK 驱动 fake Codex 子进程，覆盖同名双目录并发、各自队列/历史/代理/回调、关闭一方保留另一方、稳定重开、陈旧/歧义 anchor 与 `--cd`。 |
| 捕获归属 | 定向 11/11；全量 1174/1174；构建。`/tmp/cxv-b2-capture-{focused,full,build}.log`。真实本地 HTTP 经代理、拦截器、V2 pending/completed 落盘。 |
| 同名日志 | 定向 41/41 后补长名称边界；最终全量 **1179/1179、0 skip**。`/tmp/cxv-b2-storage-focused-final.log`、`/tmp/cxv-b2-storage-full-final2.log`。六进程竞争、重启读取、原 manifest 字节保留、损坏/缺失/符号链接拒绝及同名工作区各自日志计数通过。 |
| 最终构建与安装 | `/tmp/cxv-b2-storage-build-final2.log`。实际 **681 文件** tarball 在全新目录生产安装，关键源码逐字节一致；安装后运行时 **19/19**、B1.2 回归通过。证据见下。 |

完整命令：

```sh
env -u CXV_BYPASS_PERMISSIONS npm test
npm run build
npm run pack:dry-run
```

定向 `node --test tests/...` 应在 `packages/app` 运行；部分旧 registry fixture 依赖该 cwd。最初从仓库根目录直接运行这些 fixture 时出现模块路径错误，纠正 cwd 后通过，未修改产品代码来规避测试。

最终安装产物及结果：

- `/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-runtime-zegjh1_f/result.json`
- 同目录 `cx-viewer-1.1.20.tgz`、`pack.log`、`install.log`、`runtime.log`、`b12-regression.log`。
- B1.2 取证结果目录：`/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b12-acceptance-hsbbiec7`。仅含合成凭据；双 owner 迁移及迁移后备份、只读预览、新进程运行、HTTP 登录/坏 key 拒绝、key 修复保留后续字节、整份 preferences 恢复保留其他 owner、坏密文拒绝与私有取证均通过。

## 实例化失败与修复证据

初次同名双代理 HTTP 测试两个请求均到达上游，但四次日志 revision 中仅两次成功；writer 报 `CXV_LOG_PROJECT_ID_COLLISION`，第二 cwd 被原始项目名绑定拒绝。证据 `/tmp/cxv-b2-capture-debug.log`。据此确认冲突方案后实现 `c3e3e6b`，最终同名双代理四次 revision 分属两个档案，工作区列表各显示自身的一份日志。

复现条件：临时 LOG_DIR、两个不同路径但相同 basename、真实本地 HTTP 上游、两个带各自 owner 的捕获代理。修复前第二个路径写入失败；修复后已有目录保留、新路径使用摘要目录，两组 pending/completed 分别落盘。请求体和头中伪造的 cwd 不影响归属。

打包最初被现有“源码晚于构建”保护拒绝；最后一次服务端变更后重新执行构建，再由实际 npm pack、全新生产安装和运行时验证通过，未绕过构建检查。

## 下一步与未验证范围

CLI指定ID/--last/裸resume恢复、移动固定列/触控与输出预算、顶部排序及代理启动期间取消均已完成对应本地子项与隔离安装验证。下一步继续SDK取消/失联/审批恢复及剩余B2差异；浏览器可连接后补真实拖动/触控/软键盘、键盘/读屏、同名双工作区与双浏览器验收。ad369d2856不适用不等同上下文能力完成，相关混合提交与B2仍部分实施。旧无实例缓存升级、真实native线程/模型、真实迁移/DingTalk、Windows/Linux、最低Node/CI、签名/升级、高负载/断电仍待；串行55/55不等同高负载验证。提交仅本地，未操作活动实例或真实凭据。

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

2026-11-19 最新检查点见B2-completion-matrix.md与migration-code-first.md：已逐笔纠正基线UI，3cbd71e远程关闭事件回退修复通过真实桌面/移动双浏览器；1295/1295、构建、新安装66/66与字节检查通过。iOS模拟器补证软件键盘/网页Enter/Up、20×60→37×60通过；连续拖动工具在原生主屏幕也无位移，人工指针/单多指验收待，不标整包完成或提前压缩推送。
