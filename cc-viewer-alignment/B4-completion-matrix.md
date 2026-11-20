# B4 完成矩阵

2026-11-21，固定基线74cd752d99caf122e750216d2af3bb9f467c4de1。**B4工作包已完成。** 用户明确指定临时Playwright后，E66完成G1–G5实际Chromium/WebKit页面验收，并通过最终release:check。这里完成的是B4生命周期/反馈范围，不把66条混合候选等同66条完整迁移，其他工作包未迁项继续单列。

## 已核 B4 功能范围

| 范围 | 本地证据 | 验证结论与限制 |
| --- | --- | --- |
| 任务权威快照/原HUD | E1–2，61c3d78/fab7d5f，B4.1–2 | 整份替换、失败/中断/新prompt清理、精确实例/重连；实际组件/合成实例及当时GUI已记原证据，exec未完成todo不猜in_progress |
| 原生Agent身份/独立终态 | E3–11/E24/E33–34 | 实际Codex child thread/parent/nickname、嵌套/中断/同线程复用、原活跃卡；不按工具描述或Claude标记伪建Agent |
| 审批/问答归属与重连 | E5/E35–41/E50–54 | 随机请求标识、真实决策范围、首个终态、最小化与迟到保护；fake stdio/HTTP/WS和已记GUI，真实command/file/permissions及dynamic图片仍保留原未验边界 |
| 整轮活性与AgentLoop | E17/E25/E28–32/E44 | 权威turn接受/终态、工具间隙不误灭、原生探测/缺终态恢复、普通TUI十秒尾声；JS插件/语音设置与fixture验过，物理音频未验 |
| 失败/重试/慢请求 | E13–22/E28–29/E38/E43/E46 | 原错误行/恢复隐藏、单次续接、请求ID首字节/关闭清理、冷热/WS恢复与半开watchdog已验，真实外部模型慢网未验 |
| SDK scratch与模型/MCP surface | B2/E12/E47–49 | 原scratch并存、MCP原面板及固定最终模型chip，既有Safari桌面/强制phone/pad证据保留；角色分源B8未完成 |
| 中断后的会话分叉与缓存 | E53 322f47e | 实际AppBase live/cold/ChatView重放已验；E66 Chromium/WebKit实际live与刷新已复验，见G1 |
| 立即发送取消旧原生审批 | E54 576abb5 | 先clearThread再abort、双同名实例HTTP/WS红绿已验；E66两引擎实际审批预抢与刷新通过，见G1 |
| 原浮动输入区/滚动条 | E55 060afe3 | 固定最终helper/CSS逐字、三尾部spacer/observer清理已验；E66实际多行/HUD/队列/尾部与11px原生滚动条拖动通过，见G2 |
| 原生压缩完成原提示 | E56 b276e7f | 真实item类型、根turn/去重、10条仅最新/原slot已验，未知token不造数；E66两引擎原slot/恢复清理通过，见G3 |
| SDK启动参数 | E58 76bff2c | 未支持/缺值提前拒绝，exec后原生model/config正常解析、literal --保持；CLI/SDK/fake child通过 |
| 原位准确SDK占位说明 | E59 f0bfc21 | 用户已选方案、18语言、严格来源/缺省文本、真实HTTP与原文不误标；E66两引擎原位/原文与来源边界通过，见G4 |
| 原Context分类入口 | E60 f825be3 | 用户已选原SDK入口/原居中不可用态、18语言、0控制请求；现有用量条保持；E66 SDK原入口/空态及PTY/离线隐藏通过，见G5 |
| SDK主通道拒绝PTY消息 | E62 34fdb58 | 红测隐藏shell1次→0spawn，四种消息no-op，scratch独立通道/普通PTY回归通过 |

详细实施、原命令、上游/本地映射见[B4实施](./B4-implementation.md)与[66条候选矩阵](./B4-candidate-matrix.md)。源代码、协议差异和其他工作包归属须看对应条目，不能把本表“已核范围”外推到整笔混合提交。

## 最终 GUI 验收（E66 已通过）

CUA inventory和直接iab创建此前均不可用；用户通过交互明确回答“是”，指定临时Playwright后，以/tmp独立安装Playwright1.65.1、Chromium159.0.8154.6、WebKit27.2访问隔离fixture。实际运行生产UI/manager/server/writer，保存12张原始截图及哈希，见[B4最终GUI回执](./B4-final-gui-2026-11-21.json)。没有改项目依赖或生产DOM/CSS以通过测试。

| 项 | 实际操作与结果 | 状态 |
| --- | --- | --- |
| G1 中断/立即发送重放 | Chromium/WebKit均执行分叉替换→刷新；queued prompt/reply各1、旧partial0；B等待审批时入队并点击Send now，旧审批关闭，A不出现B输入，刷新仍各1 | 通过 |
| G2 浮动输入区 | Chromium HUD159px→加队列197px，占位/CSS同高；空态错误位于输入区上方；长回复末尾高于浮层。显示原生滚动条时gutter/CSS均11px，实际鼠标拖动scrollTop0→2472，渐变只绘制calc(100%-11px)，gutter命中scroller。WebKit desktop、多行、phone390px/pad834px均验证占位/末尾/无横向溢出 | 通过 |
| G3 压缩提示 | 两引擎实际scoped完成事件仅在原composer slot显示一条，无未知token数；兄弟实例0；通过原Session history→Resume确认操作恢复旧会话后清除提示 | 通过 |
| G4 占位说明 | 两引擎SDK详情系统指令原slot显示准确占位/HTTP说明，切Raw只见You are Codex；自定义实际指令及HTTP形状记录同文本均无说明 | 通过 |
| G5 分类不可用 | 两引擎顺序Context→Context Usage→MCP，原居中Empty与准确不可用文案、无刷新控件；反复切换0次分类控制请求。Chromium普通PTY与新窗口打开的本地日志仅Request/Response/Context，离线无composer；现有用量条保持 | 通过 |

原始截图：[分叉刷新](./evidence/B4-final-gui-2026-11-21/webkit-g1-merge-reload.png)、[审批预抢刷新](./evidence/B4-final-gui-2026-11-21/webkit-g1-send-now-reload.png)、[原生滚动条](./evidence/B4-final-gui-2026-11-21/chromium-g2-classic-scrollbar-drag.png)、[HUD与队列](./evidence/B4-final-gui-2026-11-21/chromium-g2-hud-queue.png)、[phone多行](./evidence/B4-final-gui-2026-11-21/webkit-g2-phone-multiline.png)、[pad多行](./evidence/B4-final-gui-2026-11-21/webkit-g2-pad-multiline.png)、[压缩提示](./evidence/B4-final-gui-2026-11-21/webkit-g3-compact.png)、[SDK说明](./evidence/B4-final-gui-2026-11-21/webkit-g4-sdk-notice.png)、[分类不可用](./evidence/B4-final-gui-2026-11-21/webkit-g5-context-unavailable.png)。

边界：使用合成HOME/日志与fake Codex stdio子进程；HTTP变体是合成的捕获形状记录，不声称真实模型HTTP捕获。phone/pad是WebKit设备仿真，不是物理设备；10条提示保留上限来自既有实际组件测试，视觉核验只确认最新一条。仍保留真实外部模型/慢网、实际command/file/permissions/dynamic图像、OAuth/远端MCP、物理音频/设备、Windows/Linux/最低Node等原未验边界，不扩大为跨平台全通过。所有自有临时浏览器和4个fixture均已停止。

## 明确保留给其他工作包的未迁子项

| 实际子项 | 归属与现状 |
| --- | --- |
| dafe/1aca的普通PTY忙队列、dispatching/FIFO恢复、strict anchor、IM互斥/Stoppark | 原B0 cross与规划B7输入体验；本地不存在chat-queue、PTY仍直接input，不支持当已完成。B4只完成E53分叉/缓存及E54 native审批取消；SDK既有权威队列B2复用，不等于完整PTY产品能力 |
| 旧IM orphan checkpoint重建 | B11当前旧IM消费入口未接通，主历史B3规范V2已验；不得把未修旧helper说成已完成 |
| efc7的提示词pin/launch-config/settings/model解析资产 | B8/B11；完整launch-config及PTY抽取差异已读，Codex不照搬Claude flags/settings/env；本地受支持参数E7/E8/E58及原resume B2复用 |
| slash技能菜单、prompt-nav/mic迁位/触控输入细节 | B7/B8尚未迁验；原生skills/list真实存在，不能伪造Claude supportedCommands |
| 每角色代理分源/元数据、模型1M默认/alias/preset | B8未迁入；E33真实身份与已选固定353K血条保持，不将策略变化记作生命周期完成 |
| 自动审批deadline/答案托管/-2默认、定时任务 | B9未迁验，保持现有请求/用户策略，不由本次生命周期修复暗中开启 |
| service event bus/反代 | B10；既有JS插件事件E25/E32不等于服务插件体系完成 |
| 发布/国际文档/hook维护、文件树与memory | B11/B5按原台账继续；本轮不整批搬混合提交 |

## 当前自动化与发布门槛

E62 34fdb58：22/22定向，完整1580/1580（5+332+1031+212）、0skip，构建通过。新生产安装znsc0qsh：702文件与204Web资源精确字节一致，291/291运行时、B1.2及隔离相对cd CLI通过。详见[B4门控回执](./B4-sdk-pty-gate-2026-11-21.json)。E64预检只删共享native request描述模块末尾1个多余LF，其余字节逐字相同；node语法/整个main差异空白检查、6项审批回归及构建通过，新生产安装289e7o01同样702文件/204Web精确字节/291运行时、B1.2/CLI通过，见[B4预检回执](./B4-pr-preflight-2026-11-21.json)。1580完整源码仍为E62结果，未声称本笔重跑。

E66最终执行env -u CXV_BYPASS_PERMISSIONS pnpm run release:check：1580/1580（5+332+1031+212）、0skip、构建及pack:dry-run全部通过，日志/tmp/cxv-b4-final-release-check.log。本轮GUI未产生生产代码变更，E64新安装702文件/204Web精确字节/291运行时证据继续有效。

用户最新已授权：B4完成后，将当前main相对GitHub main全部待提交改动合成一个commit，创建目标main的一个PR，自行检查差异/CI后通过PR合并。接下来保留原始hash映射/备份再执行，不绕过PR直接推main。仓库当前仅有tag/release触发的npm-publish工作流，不能把没有PR工作流说成CI已跑过；按实际GitHub检查状态及本地release:check评审。
