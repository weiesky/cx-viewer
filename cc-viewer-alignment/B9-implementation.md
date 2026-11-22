# B9 实施：定时任务与授权

2026-11-23 启动；分支 `alignment/b9-scheduling-authorization`，起点 `cb40a55`。固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1`，研究副本 `/tmp/cxv-cc-viewer-research-20261122` HEAD 已核。14 候选按子项审阅，不将基础库完成等同整包完成。

用户本轮选择：保留现有 Codex 原生权限与审批代理；迁入问答托管可选项，默认关闭，显式开启才生效。不迁入上游未设置用户三秒自动批准默认值，不暗中启用完全免审批。

## E1 — cron 与结构化时间模型

上游 `177b85df2cab3358dfec08cfc5591da29e27a8d1` 的真实新增 diff、固定最终 cron/schedule-model、store claim/computeNext、scheduler tick 与 executor 调用链已读；这两个叶子文件在该提交至固定基线间没有后续修改。按最终源逐字迁入 `packages/app/lib/{cron,schedule-model}.js`，只调整测试 import 为本地布局，无新依赖、后台启动、UI 或 CSS。

保持本机时区、五字段 cron/DOM-DOW OR、DST 春跳跳过/秋回只触发一次、严格大于上次时刻、一次任务至少未来60秒、七天窗口内最近一笔漏跑与确定性 jitter 语义。24/24、0skip 通过，包括隔离 TZ 子进程与八天睡眠窗口的 fake-time 枚举。仅算法验证，不冒称真实睡眠/调度/执行已通过。本地 `01c36c5`。

## E2 — 偏好接口与私有文件边界

上游 `451ef48d6a7dc73347d49e3d2d13cf8fafccad8f` preferences/file-policy/im-deny/PTY/json-store/project-prefs/config-backup 实际 diff、固定最终及本地 preferences/auth/credential-file-policy/nativeStatePolicy/HTTP 回包链已核。本地已用同一偏好锁、strict UTF-8 和原子0600写，且文件浏览/IM共享策略已拒绝整个原生日志树，直接复用；不另搬整套 json-store 或弱化本地损坏拒写为上游宽容恢复。为后续独立历史文件给现有IO加显式 file 参数；拒绝链接/非普通源。普通偏好GET/POST均剥离任务，POST不能植入/清空；私有文件策略补运行历史、旧存储及临时/损坏/锁残留，并延续硬链接/描述符/祖先保护。现有配置备份已包含整份preferences，不重复实现；本地无项目偏好fork，不虚构fork链。

30/30、0skip：真实隔离HTTP读写、原任务逐字保留、同名项目fixture可读、私有文件与硬链接被拒、显式历史IO不改全局prefs、链接拒写、并发与损坏/注入写失败、auth迁移/凭据回归通过。日志 `/tmp/cxv-b9-e2-tests.log`。首次两次写测试/脚本路径误设为相对package cwd，未生效；更正绝对patch后才执行最终30项，不把旧测试结果算新实现验证。无UI/CSS或真实任务执行。本地 `52be9a0`。

## E3 — 独立运行历史与幂等

实读 `451ef48d6a7dc73347d49e3d2d13cf8fafccad8f` 新增runs-store实际diff/完整最终实现与store finalize/reclaim调用；后续至固定基线未再修改该文件。迁入每任务20条、id/claimRunId幂等、终态查询、任务删除清历史。复用E2私有原子IO/同名文件锁，未引入另一套json-store。历史损坏先0600保留原字节再恢复；链接/IO失败不自愈覆盖。补上游normalize返回新对象未写回的实际边界，并防御原型属性任务键，读取也执行20条上限。

11/11、0skip，含真实两Node进程并发追加、损坏字节单份私有保留、cap/幂等/独立任务/错误形状恢复/异常键。日志 `/tmp/cxv-b9-e3-tests.log`；未接调度器，无UI/CSS。本地 `fd58be8`。

## E4 — 原始任务提示/模板快照/附件组装

上游 `2914d6479d2845e0b193ba1c09aa6667c66850a6` 实际 diff 的core模板迁移、store/executor附件字段与组装、原UltraplanPanel/控制器调用已核；固定最终 assembleScheduledPrompt 与本地 buildLocalUltraplan/buildCustomTemplate 逐段对照。复用现有 `packages/app/src/utils/ultraplanTemplates.js`，增加上游none分支和组装函数，不搬Claude模板正文/另建core包。自定义专家保留快照、附件路径带引号、原始输入不被回写或重复包裹。只迁纯组装，无UI/CSS；实际附件上传与缺失校验留执行接线。

23/23、0skip，包括既有18语言生成模板资产与native指令wrapper不变。日志 `/tmp/cxv-b9-e4-tests.log`。本地 `74e0997`。

## E5 — 严格任务定义、跨进程认领与恢复

实读 `177b85df2cab3358dfec08cfc5591da29e27a8d1` 新增store完整diff、`451ef48d6a7dc73347d49e3d2d13cf8fafccad8f` 存储拆分完整diff、`2914d6479d2845e0b193ba1c09aa6667c66850a6` 附件后续diff与固定最终store。迁入preferences.scheduledTasks v1/旧文件只读、50项限制、暂停/恢复不补暂停期、七天只补最近一次、一次任务认领即解除计划、终态CAS/历史先落盘/失败留claim、死PID/过期/boot代际恢复。复用E2同步偏好临界区（执行不持锁）、E3历史和现成isProcessAlive；不新增第二种锁。任务记录可保存精确instanceKey/engine/transport，按cwd计限，原生精确身份接线留executor/API。修复固定上游实际跨字段拒绝前已改schedule/mode的问题：先克隆合并，成功才替换任务，拒绝不半写。

store38 + runs11 = 49/49、0skip；真实两个存活Node进程竞争仅一方认领、普通偏好写不丢claim、一次完成不重触发、时间回跳不重放、死PID与中途终态落盘恢复、坏prefs逐字保留、历史写失败保留claim、拒绝编辑前后字节相同通过。日志 `/tmp/cxv-b9-e5-tests.log`。只有fake时间与存储/进程竞争证据，不冒称真实睡眠/模型/后台执行。本地 `afca0b6`。

## E6 — 调度循环、启动/停止与能力过滤

核 `177b85df2cab3358dfec08cfc5591da29e27a8d1` 初始scheduler、`451ef48d6a7dc73347d49e3d2d13cf8fafccad8f` 启动延后/legacy保护实际diff、`7a0ba39edf6a0b54ca7a425e0f08ab410e515407` 轮询测试修复与固定最终。迁入10秒tick、20秒启动宽限/5分钟ready窗口、能力过滤失败拒绝认领、异常收容、手动执行、每cwd1/全局2个本进程spawn上限。补手动Run now同样验证执行归属，事件带cwd/精确instance供原SSE路由；空store启动不新建任务key，停止取消延后sweep且校验boot代际。未接server生命周期，不会启动用户任务。

12/12、0skip，覆盖真实循环驱动的fake到期任务、不可执行/抛错不认领、运行/终态事件、spawn cap、legacy只读、空启动零写、刚启动即停止不扫旧claim。日志 `/tmp/cxv-b9-e6-tests.log`；实际native运行及真实睡眠仍未验。本地 `a6a6d4f`。

## E7 — 精确SDK/PTY派发与执行前文件检查

沿已读177初始executor、451/291后续，实读 `5ee6739cbaba22a6a6d341c020bb7d54c493e5d0` 精确anchor修复实际diff，固定最终executor与本地SDK send/onAccepted/queue和PTY factory全链。任务只向所存instanceKey且cwd匹配的原生实例派发，不以同cwd/active sibling兜底；PTY复用strictAnchor队列，Claude kind替换为codex。SDK只传已解析instance，复用onAccepted标记dispatched（不等完整回合），同时接住后续Promise拒绝；queue预检和并发满队列异常均拒绝假派发。默认真实stat/access确认cwd/附件仍存在且可读；缺失不派发。spawn保留原接口默认权限参数，实际隔离native能力尚下一笔。

25/25、0skip：SDK/PTY假协议、身份缺失/失效无兜底、接受与完成分离、满队列竞态、实际删除附件/目录零发送、模板原始输入。日志 `/tmp/cxv-b9-e7-tests.log`。未接server、不冒称真实CLI已执行。本地 `0aa73e2`。

## E8 — 独立原生SDK执行与审批归属

实读177 SDK独立query实际diff、固定最终runEphemeralTurn/spawnEphemeralSession/审批origin/宿主并集以及本地SDK factory、两transport、native审批、proxy、日志与原生进程树全链。复用createSdkSession生成未注册临时会话：新线程/独立proxy和归档，不切active、不动常驻SID/队列；仅审批帧映射至任务owner实例，保留子SID、executionInstanceKey与scheduled-task origin。重连快照/答复按owner精确查临时会话并集，外实例不能答。默认on-request/workspace-write/不扩目录与网络，显式inherit接口才保留宿主模式；普通task route不会自行开启inherit。30分钟上限、预取消零启动、超时/外部取消/全局stop清自有会话与审批，等待transport退出才释放记录。新会话受管指令仍由已有native链处理，不另拼系统提示。没有UI/CSS变化。

26/26、0skip：真实Node原生协议fixture新线程、宿主bypass不继承、resident状态逐字不变、审批origin/重连/所属答复、失败/预取消/100ms超时/取消后PID消失，以及现有SDK/AppServer/审批/顽固自有进程树回归。日志 `/tmp/cxv-b9-e8-clean-tests.log`。首次fixture把现有失效anchor抛404误断言false，改按真实合约；首次原回归漏设置CXV_TEST/CXV_LOG_DIR导致只读watcher不退出，仅终止本轮自有三个测试PID后以项目clean环境重跑通过。当前没有真实模型/原生Codex二进制producer或活动7008验收声明。本地 `150d393`。

## E9 — 定时REST与精确视图权限

实读177 route/start完整实际diff，451敏感shape/legacy/独立history、291附件更新及固定最终routes，核本地auth/strict body/SDK和PTY解析/SSE调用。复用既有管理员证明、Origin拦截、UTF-8/大小限制与精确workspace resolver，迁入七条原API合同；定义/历史按cwd隔离而非basename，客户端不能指定真实cwd/engine/继承权限。创建用已解析instance；显式保存可在同cwd重绑当前精确实例，隐藏spawn模式的PTY保存不会改其SDK绑定。跨cwd ID拒绝，读返回no-store、claim只派生running、非admin列表仅摘要。用户未选择放宽权限，不开放body.permissionMode。SSE沿现有精确视图路由，server生命周期尚未接。

41/41、0skip：真实HTTP双同名SDK实例创建/读/更新/删/历史/预览/手动运行、失配body和query、伪造project/路径/engine、跨站/跨Origin、拒绝编辑字节保留及存储/私有接口回归。此轮run使用明确标识的假executor，确认未启动脚本marker。首轮测试误造runs&id路径而收到既有首页HTML，改正URL后通过，未更改产品路由掩盖测试错误。日志 `/tmp/cxv-b9-e9-tests.log`。本地 `423b381`。

## E10 — server生命周期、原队列与隔离HTTP/WS/SSE执行

沿177实际server接线diff/固定最终_initScheduledTasks及本地server启动/停止、SDK/PTY scope/queue/readiness链复用：只在非IM CLI进程启动timer，工作区未launch不认领；SDK任务限定所属引擎/cwd/实例，独立spawn可由绑定boot cwd执行，PTY只走所存实例的factory队列和当前native session anchor。spawn能力来自真实launch-config，普通PTY隐藏spawn；stop先停tick、取消并等待自有临时SDK，再等已启动任务终态持久化，不重置常驻SDK。SSE按精确实例过滤；用共享纯协议fixture减少重复脚本。

16/16定向、0skip：真实HTTP自动到期/手动spawn、原生协议进程/结果、WS审批重连与答复、邻实例SSE无消息、未launch不执行、stop终态落盘且常驻SID不变；普通PTY用真实createPtySession+进程适配fixture，实际原queue输出正确bracket paste/Enter且boot零写、关闭目标无兜底。不是实际Codex二进制/外部模型或物理终端。PTY首轮等待3秒短于既有3秒rescue+250ms settle，改用5秒deadline轮询后通过，未改队列时序。

本检查点完整 `env -u CXV_BYPASS_PERMISSIONS pnpm test` **2350/2350（5+716+1414+215）、0skip**，日志 `/tmp/cxv-b9-e10-full-test.log`；定向 `/tmp/cxv-b9-e10-tests.log`。未build/GUI/新安装，不将后端接线算B9整包完成。本地 `6f8aab4`。

## E11 — 原嵌入式专家面板、时间文案与事件订阅

实读291完整UltraplanPanel/CSS/controller实际diff、177/451/291原modal与菜单/SSE diff、固定最终完整modal/面板/CSS及本地host/SettingsContext/上传链；后续18bd核最终图像后缀。按源迁嵌入模式/120px textarea/隐藏原header/send、空模板/附件20上限、IME组合期不提交和可选onSend；保留原cxv尺寸storage/CSS namespace，其余组件及CSS精确相同，hash见[B9-E11-source](./B9-E11-source.json)。复用原controller fallbackVariant、原时间描述和18语言109个schedule字段/空模板字段；补本地执行前目录/附件缺失的18语言原因。订阅按project+instance隔离同名工作区。已有antd安装dayjs1.11.21，显式声明同版本直接dev依赖并offline链接，无新下载/服务。

Web729/729、0skip，真实组件回调覆盖嵌入/原popover、空模板不误切、附件满禁上传/粘贴、组合输入不发/可选发送，以及时区描述/18语言/pubsub异实例与退订。build通过。日志 `/tmp/cxv-b9-e11-web-tests.log`、`/tmp/cxv-b9-e11-build.log`。尚无modal入口或GUI视觉完成声明；首次补本地原因的Python stdin编码失败未写入，改用apply_patch后完成全部验证。本地 `9524474`。

## E11a — 关闭结果等待位置纠正

复核177原stop链与本地E10 diff时发现，批量定位将waitScheduledTaskRuns插入普通workspace-stop路由，误引用该路由没有的deadlineAt；异常被局部报告捕获，完整测试未暴露，而_doStop未实际等待结果。删除误插块，在_doStop已有remaining预算内正确等待。新增执行gate未释放时drain不得完成、释放后终态CAS/claim清理才完成的行为测试。

26/26、0skip（真实HTTP/native协议关闭、scheduler gate及普通PTY完整路由回归），日志 `/tmp/cxv-b9-e11a-tests.log`。E10“等待终态”先前仅有原语/快执行证据，不再以旧完整测试作正确关闭接线的充分证明。本笔 `fix(schedule): await run finalization in the actual server shutdown path`。

## E12 — 原定时任务弹窗与native异步边界

沿177/451/291实际modal/CSS diff与固定完整最终组件，迁原860px Modal、已有任务才出现的260px列表、标题旁新建、默认空模板、六种时间/五个once快捷按钮、仅SDK显示spawn、编辑时enabled、历史/原操作和discard确认。`ScheduleTaskModal.module.css`与固定基线逐字相同，无布局/样式扩展。只在必要native边界用本地模板import、显式instance API及history resolver；同名instance变化同样清草稿/列表并丢旧响应，旧run响应不覆盖新选中；save token同步去重且旧请求不清新请求状态，上传以实例/选中任务/开关epoch钉扎，离开后不添进另一份草稿；关闭/切scope取消旧preview。原history只给SID不能调用本地精确resume，先复用既有50条SDK archive列表查row再走原确认，深历史精确查询下一笔补，不冒称此边界已完整。

Web731/731、0skip、build通过；组件是实际esbuild加载的callback测试，覆盖once快捷时间、raw/none保存、同步重复保存只一POST及同名instance旧列表丢弃。首轮测试未stub antd toast DOM导致createDocumentFragment缺失，限定test toast adapter后通过，未改生产toast。日志 `/tmp/cxv-b9-e12-web-tests.log`、`/tmp/cxv-b9-e12-build.log`。此笔尚无入口，因此生产build不会以此证明modal可达；GUI留入口联测。本地 `50055dd`。

## E13 — 持久附件的精确cwd路径

核291原modal持久persistPath约束、固定上传/原始图像fallback完整链与本地上传/文件策略。发现既有持久目录只用basename，同名工作区共享目录且文件名仅Date.now，无法给B9延迟执行保证原附件。必要native适配：复用原目录/预览结构，仅在temporary和persistent下加cwd SHA256子目录；文件名加随机后缀、0600独占创建、持久副本COPYFILE_EXCL。预览/fallback只找当前cwd子目录，旧版直接叶路径只读兼容，不搜兄弟hash、不迁移或删除旧附件；新跨scope路径明确403。原descriptor/no-follow/private inode校验继续，不改UI/CSS。

34/34、0skip：真实HTTP两个同名目录并发上传同名附件，目录和字节独立/0600，跨scope临时与持久路径403、删临时后只找所属持久副本，以及auth/普通PTY完整回归。首轮期望403而通用外根返回400，已在专用上传路径明确403后重跑；不是数据泄露。日志 `/tmp/cxv-b9-e13-tests.log`。本地 `a8f1a31`。

## E14 — 原生历史精确SID打开

核177原modal的Open session → onResumeSession、固定最终与本地AppBase确认/restore、SDK archive发现/身份校验完整链。沿原API加可选sessionId过滤：先在已验证cwd/project/source/rootThread候选中按SID匹配，再应用recent limit；非法SID拒绝、缺失/兄弟scope不回退。modal用该精确查询取file+instanceKey后调用既有确认/恢复，不直接按SID猜路径或用最新archive代替。原按钮/布局/CSS不改。E12最近50条的暂态限制已移除。

App9/9、Web733/733，0skip：真实archive文件中recent limit=1时仍能精确找旧SID/不读同名邻cwd/无目标不回退/非法ID拒绝，HTTP运行fixture回归；实际modal回调证明以正确file、instance、SID交原resume确认，以及base/token编码。日志 `/tmp/cxv-b9-e14-app-tests.log`、`/tmp/cxv-b9-e14-web-tests.log`。真实native跨进程resume与GUI尚待整链验收。本地 `2035c7e`。

## E15 — 原菜单入口与运行通知

复核177实际ChatInputBar/ChatView/TerminalPanel/AppBase diff及固定完整host；保持上游Upload之后的定时任务行、手机原平铺行、共享modal与原icon。只按本地实际传参使用resumeInstanceKey/projectName并以精确instance remount，不引入上游多channel架构。SSE沿既有source/URL/instance/project守卫进入原pubsub与runId去重终态toast；running/dispatched/skipped保持静默。CSS不变。

Web735/735、0skip、生产build通过；真实组件回调验证两个host精确scope/关闭/历史页禁入口，实际SSE listener验证异实例/旧source无通知、重复终态一次、失败原toast。初轮fixture未暴露TerminalPanel、随后未遍历Popover.content导致测试失败，仅修正harness访问后通过。日志 `/tmp/cxv-b9-e15-web-tests.log`、`/tmp/cxv-b9-e15-build.log`；尚不将callback或build算GUI验收。本地 `83c6e73`（`feat(schedule): connect original menus and scoped run notifications`）。

## E16 — 默认关闭托管模型与native答案形状

实读608完整picker/server helper、SDK/PTY/WS/controller实际diff与固定完整实现，后续无改动。迁18语言Recommended/否定词/跳过Other/全问可答才托管，以及严格number分钟、null关闭/0立即、最大1439、绝对deadline+1秒buffer、取消与replay。沿本地现有全局preferences，不凭空引入上游project fork子系统。native逐question ID转string[]，重复题文不互相覆盖；question或ID为__proto__仍是数据，不改变prototype。默认没有设置不会启动timer，尚未接执行桥/UI。

39/39、0skip（原picker/state行为加native重复题文、prototype键、自由输入不托管），日志 `/tmp/cxv-b9-e16-tests.log`。首轮遗漏本地error-report路径适配，修正import后通过。本地 `9da6264`。

## E17 — 原生SDK Ask托管及所属临时会话取消

沿608原SDK生命周期/WS实际diff及本地native approvals/ownsThread/ephemeral投影完整链：所有权通过后才发布期限并托管；全问可答且显式启用才将Ask等待窗口扩至原24h，默认手动/权限原5分钟保持。pending先于instant resolved；手动、turn结束/native resolved、close均清timer。单题取消只销托管，不答题、不改全局，replay保留取消/绝对期限。常驻与临时SDK都按所属anchor查找，不扫描其他宿主；仅原审批投影附加ask-auto-cancel。

15/15、0skip：虚拟时间10分钟+buffer/手动优先/取消/replay/所有清理；自由输入与权限不托管；真实Node原生协议临时进程0分钟自动选第二Recommended且常驻SID不变；实际HTTP/WS spawn Ask取消后仍pending、再手动答完成。首轮取消entry缺autoCancelled使helper误走state分支，及实际WS投影未转发ask-auto-cancel均由测试发现并修正。日志 `/tmp/cxv-b9-e17-tests.log`。不是实际Codex二进制/GUI。本地 `a79f24b`（`feat(ask): host native SDK questions with scoped cancellation`）。

## E18 — 普通PTY的原生问答桥托管

沿608原PTY/WS/reaper与本地app-server relay/精确owner/disconnect/stop完整链，复用同一托管模型。默认仍仅在线GUI认领；显式启用且全问可答才可离线认领/断GUI继续托管。单题取消保持manual并重连replay取消标志，所有删除清timer。Codex显式autoResolutionMs原生期限继续优先，不被10分钟托管延后；无原生期限的托管最多原24h。legacy hook仍沿原手动兼容，不为无ID旧协议制造自动答案。

25/25、0skip：真实HTTP/WS离线立即选Recommended、无选项不接管、取消后手动胜出、保留原生30ms fallback、断GUI继续、同名PTY邻实例不能取消/读replay，以及完整PTY路由回归。新增fixture最初多留两条WS触达既有连接上限，补自有socket关闭后通过；未放宽生产限制。日志 `/tmp/cxv-b9-e18-tests.log`。本地 `7b1b96f`（`feat(ask): host native PTY questions without changing protocol deadlines`）。

## E19 — 原托管档位与设置入口

沿608实际QuickAutoApproveRows/各设置host/AppBase/autoApproveOptions/icon/i18n diff、固定完整组件与本地prop链，迁原Plan后Ask行及0/10/20/30分钟/关闭档位、原help与18语言7字段。保留Codex reviewer整行，不引入上游权限自动放行/三秒默认。三个既有设置位置沿原宽度/顺序；null默认与显式关闭正确hydrate，UI -1只在落盘前转null。帮助仅将上游工具名替换native request_user_input，不改说明规则；CSS不改。

Web742/742、0skip、build通过；原选项转换测试及真实组件回调验证默认off、0和null分别提交、复用PreferencesForm原Select。新测试最初未遍历root数组，随后en Off撞Plan Off，限定Ask fragment后通过，未改生产行为。日志 `/tmp/cxv-b9-e19-web-tests.log`、`/tmp/cxv-b9-e19-build.log`。倒计时/单题取消UI尚待下一笔；本地 `9904c92`（`feat(ask): add original opt-in hosting controls`）。

## E20 — 原倒计时、单题取消与缓存刷新

按608原controller/AskQuestionForm/ChatMessage/ChatView/ApprovalModal实际diff和固定完整组件/CSS，复用原绝对时间helper、独立倒计时与25行CSS（无布局重排）；仅展示、到点不由客户端作答。meta从原生pending权威传至inline/portal/fallback；原session cache FULL/INCREMENTAL刷新askMetaMap/pendingAsk。原生必要适配：metadata同时保存requestId/itemId，queued卡取消自己的request，不猜队头；断线取消缓存重发、发送throw仍保留、旧replay不复活、终态清latch、dispose回收。原权限/Plan执行计时不变。

Web757/757、0skip、build通过：时钟跳5分钟/visibility校准、只点取消才回调、无客户端自动提交、实际native卡取消queuedID、两个pending通道的批处理/断线重放/远端取消/ID复用，以及真实session FULL/INCREMENTAL cache更新。既有meta精确断言新增权威字段后同步更新。日志 `/tmp/cxv-b9-e20-web-tests.log`、`/tmp/cxv-b9-e20-build.log`。原spawn运行上限30分钟保持，因此30分钟托管可能先遇spawn上限；未擅延长任务运行，未以此宣称长等待真实验收。GUI待验。本地 `68465c1`（`feat(ask): render original hosting countdown and native cancel flow`）。

## E21 — Other文本框原生自动填充标记

读3d4完整diff、固定完整AskQuestionForm与后续608/1b3变更；本地选择引用守卫已沿1b3保留，缺少四个密码管理器opt-out。只在原Other Input补autoComplete/data-1p-ignore/data-lpignore/data-form-type，不改文本、焦点或布局。Web758/758、0skip，实际组件检查四标记及原onChange写入。日志 `/tmp/cxv-b9-e21-web-tests.log`。未宣称实际Chrome/Safari/第三方密码管理器不弹提示。本地 `671c4f1`（`fix(ask): preserve upstream Other input autofill hints`）。

## E22 — 实际Codex双transport与本轮完整检查点

本机Codex0.169.0、隔离HOME/CODEX_HOME与本机合成Responses，实际12请求：exec及AppServer各经真实任务HTTP inject/spawn、所属原生SID不被spawn覆盖、精确任务archive，再跨已停止临时进程实际resume该SID并继续原对话。AppServer原生request_user_input验证0分钟选第二Recommended、10分钟单题取消仍pending后手动First完成，常驻SID不变。原生工具执行关闭，无外部模型。回执[B9-native-scheduled](./B9-native-scheduled.json)，可复现脚本[probe](./probes/b9-native-scheduled.mjs)。首次probe拼错query拿SPA HTML，改为顺序await/正确query后完成，未改生产API；自有进程已退出，stop日志有既有stats worker terminate code1提示。

本轮完整clean-env `pnpm test` **2443/2443（5+758+1465+215）、0skip**，build通过，日志 `/tmp/cxv-b9-final-full-test.log`、`/tmp/cxv-b9-final-build.log`。这仍不是GUI/新生产安装或真实睡眠/外部模型验收；B9继续中。本地 `cb5b5f2`（`test(schedule): verify actual native execution and archive restoration`）。

## E23 — 新生产安装与包内运行验证

93a17实际diff仅增tarball baseline两条Claude模块；本地已有package.files包含完整native lib/src，无须照抄不存在的Claude路径。扩既有隔离安装probe为B9额外16套件及原生协议fixture，真实npm pack→全新npm --omit=dev安装→859/859、0skip；全部747包文件及211Web逐字匹配，B1.2凭据回归/相对--cd隔离CLI启动通过。新依赖dayjs仅构建时使用并已进Web，不新增后端运行依赖。回执[B9-installed](./B9-installed.json)，日志 `/tmp/cxv-b9-final-pack.log`、`/tmp/cxv-b9-final-installed.log`。

未发布npm、未改全局软链、未重启活动7008或其他用户进程；浏览器验收另记。本地 `bf35be4`（`test(schedule): verify fresh production install and packaged runtime`）。

## E24 — 原定时功能说明

实核177 README实际diff、451/291后续定义/历史/模板附件修正及固定最终段落，接回本地已有根README Features原位置。仅按已验native事实改为精确workspace、cxv、Codex on-request/workspace-write与无目标不改投；本仓库没有上游18语言README源，不新造一套翻译目录。原package README由assemble同步，不直接编辑生成文件。纯文档不新增测试；后续最终pack/安装需重验新README字节。本地 `4292dcb`（`docs(schedule): describe aligned native scheduling behavior`）。

## E25 — 实际原生权限证据纠偏：独立任务固定AppServer

E22后进一步检查实际rollout发现exec独立任务原生turn_context.approval_policy为never，不能以SDK threadOptions或假协议已收on-request证明原生权限兑现。实读当前SDK0.142.5参数序列化（确实传approval_policy）与现有exec适配/原生源码研究，Codex exec无头策略覆盖为Never（本机0.169实证；研究0.171 exec/src/lib.rs对应ConfigOverrides也显式Never）。先前口头归因“SDK强制”应精确为“SDK调用的native exec无头策略”。

通过提问工具由用户明确选择“仅独立任务用AppServer，常驻保留原transport”。沿既有独立session路径在校验传入transport后固定appserver，不改常驻默认exec或其权限；继续原on-request/workspace-write/禁network与owner审批投影。失败不回退到exec。27/27定向、0skip；增加exec宿主未启动/未替换、独立子进程确实发原生审批及可deny的manager行为。实际Codex再跑12本机请求，两个宿主的独立任务均从native rollout逐字核on-request/workspace-write/network=false，并再次实际resume/Ask取消手动。最终[B9-native-scheduled](./B9-native-scheduled.json)已更新，probe增加原生policy断言防回退。

日志 `/tmp/cxv-b9-e25-tests.log`、`/tmp/cxv-b9-e25-native.log`。代码复核只作必要native适配，不加新界面；下一步重跑完整/产物与最终GUI。本地 `96fe83a`（`fix(schedule): preserve native approvals through isolated AppServer runs`）。

## E26 — SDK/普通PTY双浏览器及原布局验收

E25后正常关闭并重建自有SDK夹具，未碰用户7008；Chromium159/WebKit27.2共6配置/16图。原菜单→空表单→空模板/上传实际持久附件→once五快捷按钮→独立运行/历史→暂停→dirty discard→同名兄弟空列表；原第三级联用键盘选择10分钟，实际SDK问答倒计时→单题取消→手动First→modal关闭，均无pageerror。430px手机宽度沿原CSS上下堆叠、无横向溢出。原860px Modal/260px列表/16px gap源码与computed对照，ScheduleTaskModal CSS与固定基线逐字同hash；已实际看桌面/手机/Ask/普通PTY截图，未用测试通过替代视觉核对。

普通PTY复用B7真实node-pty/runtime+受控原生协议fixture，两个引擎分别验证原terminal toolbar及隐藏terminal后composer入口、原生instance、SDK独立选项不出现、Run now进入原PTY队列及history.dispatched、同名兄弟空列表；此GUI夹具只证明队列接受，不把parked队列当模型已执行。见[B9 GUI](./B9-gui.json)、[PTY GUI](./B9-pty-gui.json)与[B9-gui](./B9-gui/)。探索脚本最初未等动画/React提交、使用AntD虚拟option role与overlay下按钮、WebKit hover后click反切，均纠正等待/原键盘操作后通过；失败图留/tmp未列为通过图，不改生产布局或hover行为。

E25后完整2443/2443、0skip、build与新生产安装859/859、全部747包/211Web精确字节及README字节已复验，回执[B9-installed](./B9-installed.json)已刷新。日志 `/tmp/cxv-b9-gui-final.log`、`/tmp/cxv-b9-pty-gui.log`、`/tmp/cxv-b9-e25-full-test.log`、`/tmp/cxv-b9-e25-build.log`、`/tmp/cxv-b9-final-installed-after-policy.log`。实际native PTY模型执行补验另记。本地 `f3ad7be`（`test(schedule): verify original menus and hosting in both browsers`）。

## E27 — 实际CLI/native PTY定时注入

复用B7实际CLI/node-pty/Codex桥夹具，仅改自有端口/metadata及正常on-request/workspace-write启动参数。首次warmup未到模型：实际TUI停在原生Hooks review，截图确认后核隔离HOME内hooks.json唯一command指向本仓库perm-bridge.js，才在这个隔离TUI信任生成hook并关闭review；未操作用户现有配置/窗口。随后warmup和定时任务各1个精确末条用户prompt请求，另有2个native后台标题请求，共4本机Responses。HTTP Run now→原队列→实际native模型请求，任务history dispatched且原SID保持；native rollout再次核on-request/workspace-write。不是只看队列接受，也不将标题请求重复算定时派发。

见[B9-native-pty](./B9-native-pty.json)及两个原生PTY probe；日志 `/tmp/cxv-b9-native-pty.log`。初次失败、环境要求与原生hook确认步骤均保留于本节。无外部模型、无真实工具执行；全链输入为本机合成任务。E25后最终pack:dry-run747再次通过（`/tmp/cxv-b9-final-pack-after-policy.log`）。本地 `232350b`（`test(schedule): verify actual native PTY task delivery`）。

## E28 — 本地工作包核销与交接

14候选按B9子项逐项核销，第一父diff SHA/完整文件清单、原CSS逐字hash及用户权限/transport选择已存[B9源审计](./B9-source-audit.json)。28笔实施/验证原始本地提交（E1–E27含E11a）与上游完整hash映射保留；本笔仅维护核销/进度元数据，不自引用自己的commit hash。未执行squash、PR、merge或npm publish。当前B9本地完成，B10未启动；[完成矩阵](./B9-completion-matrix.md)、[候选核销](./B9-candidate-matrix.md)、[最终回执](./B9-final-2026-11-23.json)为最新入口。

最终clean-env 2443/2443、0skip；build/pack747与E25后全新安装859/859、747包/211Web及README字节通过。实际SDK12本机请求、实际PTY两主+两标题请求、双浏览器6配置16图已分别实证，不混淆协议夹具/外部模型/队列接受。三组自有fixture正常退出、各自cwd无残留进程，见[B9清理](./B9-cleanup.json)。用户活动实例未停止/重启，未验环境/30分钟上限见完成矩阵；用户现用后端正常重启才生效。
