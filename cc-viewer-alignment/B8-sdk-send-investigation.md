# B8 SDK 面板发送无回复

用户2026-11-22报告cxv --sdk下面板无回应，优先于其余B8迁移。CLI默认exec，确实经已安装@openai/codex-sdk0.142.5的Codex→Thread.runStreamed调用实际Codex0.169；不是ClaudeSDK替代。

## E8 — 显式传入官方SDK baseUrl

完整读CLI.runSdkMode、sdk-manager初始化/派发、sdk-exec-transport/runner/launcher及已安装SDK dist的baseUrl→openai_base_url序列化与spawn/env实现。旧transport只覆盖OPENAI_BASE_URL环境变量，未传baseUrl；完整生产CLI（非CXV_TEST）+隔离HOME/临时cwd+实际Codex+本机合成Responses端点：浏览器WS消息收到accept/native thread，但30秒内上游0请求，只有原生WS→HTTPS回退连接错误。旧B2原生测试使用显式custom provider，因此没覆盖默认provider入口。

本笔由官方SDK baseUrl选项显式设置本次owned capture proxy地址；不改全局配置/认证/默认transport/沙箱。真实CLI再启动后1次POST /v1/responses并收到SDK_REAL_NATIVE_REPLY、turn成功/agent_loop_end与streaming_status false。后续同thread再次发送2次累计请求成功。6/6针对测试通过，新增真实SDK生成argv断言，要求env与显式openai_base_url一致。日志/tmp/cxv-b8-sdk-fix-tests.log。

实际GUI还暴露原始API抓包和SDK规范化记录并行造成会话重复与加载态残留，尚不将本笔称为完整修好；下一笔跟踪并保留网络明细、修复聊天投影。截图与WS原始数据在自有临时根cxv-b8-sdk-cli-JKNgmE；探针[b8-sdk-cli-fixture.mjs](./probes/b8-sdk-cli-fixture.mjs)可复跑；仅合成回复，无外部模型/工具、未读取用户凭据。旧首次UI strict locator误把瞬态重复视为“无回应”；以实际请求/原生turn事件核定接收成功，重复显示独立修。

## E9 — SDK wire 与聊天/恢复记录分离

实际完整CLI/UI继续复现，确认原始代理抓包与SDK合成transcript双producer：本机/ChatGPT/第三方端点的raw记录不受现有api.openai.com-only聊天排除规则保护；raw请求header携带native session-id，先占SDK manifest（source=proxy），合并累计输入造成重复，并阻断“仅SDK归档”的恢复检查。

SDK controller的可信captureContext增加sdkTransport标记，createProxy显式保留（不接受HTTP header/body标记）；原raw正文/明细留Network，聊天统一排除此标记。V2 coordinator给这些raw行分配按runtime/project/instance隔离的synthetic:sdk-wire辅助归档，原始分类不改，辅助identity不推进主会话/latest恢复指针；SDK事件独占原生thread归档。未重写旧用户日志。

54/54定向测试、完整2184/2184（5+702+1262+215）、0skip，build与pack724通过。实际官方SDK0.142.5/实际Codex0.169/完整生产CLI、独立HOME与本机合成Responses端点，双引擎连续发送、回Send、每turn单份回复及刷新检查；原始4请求与SDK4turn分离、原生SDK恢复解析/latest指针核对。GUI最终回执见[B8-sdk-gui/result.json](./B8-sdk-gui/result.json)，探针[b8-sdk-send-gui.mjs](./probes/b8-sdk-send-gui.mjs)。

探针初期未等root自动绑定instance导致WK填入草稿被初始scope切换清掉；改等精确instance URL后再操作，未为测试改产品切换协议。WebKit对页脚ipwho.is/ipapi.co定位请求及reload取消中的snapshot有access-control pageerror，记录navigationAborts，SDK异常不忽略。旧baseline probe以显式provider绕过默认OpenAI endpoint，不足以验证本次修复，未冒称其已覆盖。真实外部模型/用户现用SDK实例仍待地址确认与正常重启；代理未停止7008或ccv SDK进程。

## E13S — 默认API-key与自定义网关的API路径

在真实SDK baseUrl修复后的默认登录路径补验中，发现旧proxy fallback原始base为api.openai.com（无/v1），而实际SDK从根capture URL发送/responses；此前设置了/v1原始base的夹具未覆盖此组合。另有/v1基址与/v1请求前缀重复风险。

本笔默认API base补/v1，复用现有profile路径重叠合并函数（只新增export，不重写）组装SDK/Electron上游URL并保留请求query。OAuth与显式PTY redirect路径保持原协议。36/36、0skip，含真实本地HTTP→禁止外网的MockAgent：默认API-key的/responses与/v1/responses均精确送/v1/responses；自定义/openai/v1网关两个前缀均只拼一次。原OAuth/redirect/lifecycle/profile/SDK用例通过。仍无用户真实外部模型通过声明。

## 当前运行实例核对

B8 E16只读GET 7008 /api/cli-mode为cliMode=true、sdkMode=false、ptyMode=true、ptyQueueAvailable=true，lsof监听PID38260。7008当前是普通PTY实例；此前另有ccv --sdk进程，未停止或重启。已用选项询问用户故障页地址，尚无答复；实际用户实例/外部模型仍未验，现有运行后端须正常重启才加载本轮修复。全局bin软链正确与网页dist更新不能单独证明后端已换。

## E28 — 显式AppServer模式

真实default provider/env-only探针30秒0请求；本轮补与官方SDK exec baseUrl一致的显式native openai_base_url argv，修后真实Codex主2/子1请求与两种所属线程证明均通过。见B8-E28-default-appserver-{red,route}.json。该结果不代表用户既有实例已重启或外部模型可用。
