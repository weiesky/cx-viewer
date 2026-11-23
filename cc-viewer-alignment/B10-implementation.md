# B10 实施：服务插件与反向代理

固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1`，实读目录 `/tmp/cxv-cc-viewer-research-20261122`。从 B9 `231a8a7` 建立独立分支 `alignment/b10-services-reverse-proxy`；B9 PR #11 实查仍 OPEN、未合并。本轮不合并 B9、不停止或重启用户实例。

主索引5笔、交叉9笔去重12候选，见 [候选索引](./B10-candidate-index.json)。索引是待核范围，不表示已完成；`08809f6e69`/`082673509e` 必须按最终树核，merge不重复搬。B8已明确排除代理重试配置/统计，B10不恢复；原生审批、独立任务AppServer和常驻transport既有选择保持。

## E1 — 目录插件 manifest

- 上游：`58493d1c859f0875395b34bf2e21ebe7a01ee5db` 的实际第一父 diff，以及固定快照 `packages/app/server/lib/plugin-manifest.js` 全文件；已核 loader 的 file/dir 扫描→manifest→runtime，以及 plugin-services 路由/文档。后续 loader timeout、agent-loop、revert/reintroduce另逐笔处理。
- 本地：`packages/app/lib/plugin-manifest.js`；提交 `feat(plugins): migrate directory service manifest validation`。直接迁移名称/前缀、realpath包含、panel子目录/同目录CSS、配置默认值及main/helper/panel指纹，不执行插件代码。适配既有error reporter路径；保留CCV外部插件协议并额外阻止覆盖CXV运行变量，含大小写保护。
- 验证：`CXV_TEST=1 CXV_LOG_DIR=tmp node --test packages/app/tests/plugin-manifest.test.js`：8/8，0skip。覆盖非法清单、路径/符号链接越界、保留变量和指纹变化。无UI/CSS变更，无GUI结论。
- 当前仅manifest可用，loader/runtime/proxy/panel/base URL/更新重启仍待；不能将此子项计作584整笔或B10完成。

## E2 — 目录扫描与hook兼容

- E1本地 `9e19ba4`。上游 `58493d1c859f0875395b34bf2e21ebe7a01ee5db` loader实际diff及完整最终文件，核后续 `77b61bd571c5a31c1d071025b8254a3c4c3a9593` 仅审批hook15秒超时、`ef5fc8b1689ac56ec67fd2d797f5577cdb2dd99f` agent-loop hooks与回退血缘。
- 本地 `packages/app/lib/plugin-loader.js`，本笔 `feat(plugins): load directory plugins alongside legacy hooks`。迁目录扫描、用户优先/重复校验、禁用目录不执行main、缓存指纹复用、generation/事件dispatcher与结构化entries；复用本地voiceInput/capabilities/moduleVersion及单文件mtime热重载，避免上游旧单文件实现回归既有能力。bundled路径适配现有包布局，diagnostic复用现有reporter。
- 19/19、0skip（manifest8+loader11）；真实临时模块测试禁用main、错误隔离、更新重导入、语音capability兼容与超时回退。仅加载协议，没有接管Codex原生审批；服务启动/面板/GUI尚待。

## E3 — 服务子进程与host SDK

- E2 `48f0f90`。上游58493d1c859f0875395b34bf2e21ebe7a01ee5db新增plugin-host.mjs与plugin-service-manager.js实际diff/完整最终源码及调用契约已读。迁detached loopback服务、每次nonce/secret、0600配置、锁/健康握手、PID归属后停止、孤儿清理与限额退避；没有启用任何用户插件。
- 本地lib同名文件；本笔 `feat(plugins): migrate supervised service child processes`。外部CCV_PLUGIN协议与/__ccv/health保持兼容；内部fetch标记改本地x-cx-viewer-internal、防测试意外spawn变量改CXV_TEST_ALLOW_PLUGIN_SPAWN、CXV保留环境阻断适配；主进程OpenAI/Codex/token不继承。
- 21/21、0skip：真实临时host子进程HTTP密钥/健康身份与SIGTERM退出；管理器fake spawn/kill验证配置mode、PID/nonce错配不误杀、异常/超时/退避。Windows环境测试仅对象输入，不是Windows实际运行。主server生命周期接线、实际detached supervisor重启与父死退出留后续。

## E4 — 同端口HTTP/WS代理模块

- E3 `ce970ae`。实读58493d1c859f0875395b34bf2e21ebe7a01ee5db新增plugin-proxy实际diff/完整最终408行与runtime调用。迁流式HTTP/POST/SSE、WS字节隧道、过载/headers超时/卸载清理、host token/cookie/authorization剥离、独立secret与Location/cookie Path处理。
- 本笔 `feat(plugins): migrate streaming HTTP and WebSocket proxy`。error-report路径适配；阻断本地cxv_auth覆盖并保留ccv_auth保护，剥离本地内部header；源码复核发现非101 WS失败响应原样转发cookie，因此该分支复用已有rewriteResponseHeaders，避免失败握手绕过同一凭据边界。没有新增UI/协议。
- 10/10、0skip，实际临时HTTP/SSE/POST/WS隧道、卸载断开及原始101/403握手测试；额外验证cookie/authorization/internal header不泄漏，403同样限制cookie/Location。主server路由尚未挂载，非真实反代/TLS通过。

## E5 — base URL/path纯工具

- E4 `469ec8a`。上游 `57c732d0371bc34417e75a6bd106e1a3fde90f99` 新base-url/最终base-path、`439179221296fcc2ca1beb0ffce69c13a336b56f`反斜杠/C0/query-only修复及runtime cookie wire-prefix实际diff/完整源码已读。
- 本笔 `feat(proxy): migrate public base URL and encoded path utilities`。复用上游解析/优先级/对外URL与wire编码剥离，环境名适配CXV；旧base-path同样拒绝//前缀，避免注入跨源base。没有改变Host/Origin放行策略，server/CLI/HTML/登录/二维码/翻译随后接线。
- 50/50、0skip纯工具测试；literal {token}、全部编码大小写变体、相邻路径防误剥、非法URL回退、端口/IPv6、scheme优先级通过。不将纯函数通过视为反向代理已支持。

## E6 — 生命周期编排与真实detached服务

- E5 `4987837`。58493d1c859f0875395b34bf2e21ebe7a01ee5db runtime实际新增diff与完整最终源码、ef5fc8b168 agent-loop映射、57c732d037 wire-cookie修复已读。按原实现迁单flight队列、generation/epoch、abort订阅清理、限时activate/deactivate、重启/卸载/停止守卫与live service handle。
- 本笔 `feat(plugins): migrate service lifecycle orchestration`；仅reporter/debug和本地CXV_IM_WORKER===1适配，IM worker不启动服务。未接主server，也没有把Claude审批resolver搬到Codex。
- 23/23生命周期/竞态/mount测试、另1/1真实detached集成，均0skip。后者实际load→spawn→loopback健康→HTTP剥token/不继承OpenAI凭据→WS回显→服务自行崩溃→新PID自动重启→改源码reload→手动restart→shutdown；4个实际PID均已不存在，lock/config清零。小HTTP宿主是夹具，不能等同主server认证/GUI验收。

## E7 — 面板静态资源与目录删除

- E6 `2efb987`。已读58493d1c859f0875395b34bf2e21ebe7a01ee5db的plugin-panels新增全文件、plugin-manager删除函数实际diff及最终routes/plugins完整管理链。
- 本笔 `feat(plugins): migrate panel assets and validated directory deletion`。panel描述符/指纹URL/真实状态、静态子目录/扩展名/realpath/source隔离、ETag/HEAD/错误无SPA回退与受限目录删除按原代码迁入；仅error reporter路径适配。调用方停服务后才删目录的接线仍下一笔。
- 21/21、0skip，实际HTTP资源、HEAD/304、路径/符号链接/源码拒绝及目录删除失败保留通过。没有挂载前端React面板，不作视觉结论。

## E8 — 主服务器管理/代理/生命周期接线

- E7 `2aa0c34`。实读58493d1c859f0875395b34bf2e21ebe7a01ee5db server实际diff、最终plugins/plugin-services路由和本地HTTP认证→精确workspace→插件/文件路由、start/stop及三个WS消费者。按原意接reload/restart/dir-delete/静态panel/manifest与统一生命周期，重复start仅一个宿主/服务。
- 本笔 `feat(plugins): connect service lifecycle and authenticated server routes`。保留本地mtime/语音module端点、上传启用与disabled偏好清理；Codex原生审批不接Claude resolver，ctx.interactions/pty未伪造。HTTP/WS使用现有凭据与同源门；CLI无Origin WS继续要求显式token；插件写/代理/local-url必须admin且拒绝cross-site。迁原Host allowlist/坏Host400边界，测试虚拟远端Host需显式列入白名单。
- 服务配置包含secret，故复用B1/B5私有文件策略保护plugins-runtime及hardlink/祖先，避免新服务配置被通用文件工具读走。这是新增秘密载体的必要边界适配。
- 主server实际15/15服务测试+21/21认证回归，另26/26 SDK登录/target-files/voice回归，全0skip；覆盖真子进程、重复start、HTTP/SSE/POST/WS、panel/source边界、崩溃换PID、reload/禁用/删除与秘钥文件别名。初轮root目录直接跑auth的静态fixture因cwd错误失败，改正确packages/app目录后通过；首轮包全量1617/1625，8失败均为4份旧fixture未声明虚拟Host，已显式配置白名单并针对复验。此记录不声称最终全量已重跑。
- base URL尚仅工具，TLS反代scheme/path/HTML/CLI/登录链、React UI/GUI及更新功能仍后续；用户7008/其他实例未停止或重启。

## E9 — 原React面板运行时/加载协议

- E8 `df7893c`。实读58493d1c859f0875395b34bf2e21ebe7a01ee5db panelRuntime/panelLoader/pluginPanels完整原模块及PanelHost→PluginPanelModal→Header/Mobile原调用和CSS；本地React18/antd5已安装，resolveLocalized/errorReport/apiUrl复用。
- 本笔 `feat(plugins): migrate remote React panel runtime and loader`。保持window.CCV共享依赖和同步注册/loadId/tombstone握手、等待取消/样式清理、5秒manifest缓存/失败保留、localized title及API/WS URL，未另造iframe或布局。相对imports加.js以使用原生node:test，资产URL额外拒绝反斜杠/C0防跨源路径。
- 25/25、0skip，实际模块+受控DOM脚本执行夹具覆盖成功/超时/中止/迟到旧脚本/错误归属/注册上限、CSS释放及缓存。没有复制镜像源码断言测试；尚未接宿主或证明实际浏览器渲染/视觉。

## E10 — 原面板UI/菜单与双浏览器验收

- E9 `108487c`。58493d1c859f0875395b34bf2e21ebe7a01ee5db原Header/Mobile/PluginModal/AppBase/CSS实际diff、固定最终完整宿主组件/原菜单链已核；复用已装React18/antd5及本地exact instance。PanelHost/原CSS/PluginPanelModal/panelIcons/PluginModal/原CSS/MobileDrawerCloseButton共7文件与固定上游精确字节相同。
- 本笔 `feat(plugins): connect original remote panels and management UI`。保留上游1100px/manifest宽度、原menu管理之后动态项、pin描述符、共享依赖、错误边界/重试/关闭释放样式、移动全屏无zoom/desktopOnly/焦点恢复/Escape。原18语言440行新增文案与Vite同端口开发代理迁入；project/instance仅适配本地native projectName与当前URL精确instance，不新增布局。
- Web785/785、0skip，真实组件callbacks共133项（新增menu开关/retry/pin与modal关闭卸载/宽度及归属），生产build/组装通过。
- 临时Playwright按既有授权，实际Chromium/WebKit × A浅/B深桌面/手机仿真共6配置10图，全部实际核看；7原组件/样式精确源码对比与截图hash见[B10 GUI回执](./B10-gui.json)、[截图](./B10-gui/)。真实同端口服务Ping、原共享React hooks/antd、panel渲染故障边界/重试、关闭清CSS与mount/cleanup配对、插件管理重启通过。0非预期pageerror；故意fixture渲染故障单列，不混作未知错误。初轮缺省Playwright缓存路径、错误按钮文案/未等动画与未限定移动dialog导致harness失败，修正脚本后通过，没有因此改产品UI。
- 自有21040/PID59555已正常SIGTERM并确认退出，用户实例未动。真机/触控/IME、真实模型、baseURL/TLS/引导更新不在该GUI证据范围。

## 已确认后续选择

2026-11-23提问工具用户选择「保留现有密码策略」：B10迁反代path/base URL/Token/WS，密码登录仍要求后端HTTPS；不得信任X-Forwarded-Proto来启用密码登录或Secure Cookie，按原生安全门保持。用户随后要求继续。

## E11 — 反代HTTP/WS/base/登录路径与公开URL

- E10 `5841ccb`。实读57c732d0371bc34417e75a6bd106e1a3fde90f99的server/auth/misc/i18n实际diff及最终全链，439179221296fcc2ca1beb0ffce69c13a336b56f编码/跨源修复；本地三个upgrade消费者和HTTP认证/静态/私有文件链逐一接线。
- 本笔 `feat(proxy): connect runtime base paths and public access URLs`。统一safeParse仅剥一次编码前缀、HTTP/SSE/mux/terminal/plugin WS共享路径、根与深链base/JS注入、公开Host合并与QR链接、原18语言告警与single-pass插值。getBasePath拒绝外国/反斜杠/C0前缀；保留本地token编码/exact instance及所有私有读策略。host SDK的callParent复用原拼接并消除base尾斜杠+API首斜杠造成双斜杠，实际子进程验证。
- 用户选择落实：仅显式配置的公开Host采用声明的浏览器origin协议；密码登录/secure cookie仍只看后端TLS，不信任转发头。普通loopback既有本机例外不变；没有移植Claude认证方式。
- 92/92主server/URL/认证/服务回归、另38/38编码/session/{token}前缀下真实服务/HTTP/WS/SSE/cookie Path/callParent和URL矩阵；Web786/786、0skip/build组装。18语言literal {token}不被二次替换；HTML与登录脚本的</script>边界在真实HTTP响应与VM执行验证保持原路径。初轮SSE fixture漏token及误用本地登录错误字段导致2失败，修正fixture后通过，没有放宽认证。
- CLI打印/自动打开的三个入口留下一笔；本轮未将HTTP/WS协议测试等同真实TLS反代浏览器或LAN通过。

## E12 — CLI公开URL/前缀与安全打开

- E11 `0c247bb`。57c732d0371bc34417e75a6bd106e1a3fde90f99 CLI实际diff/三个本地启动流（PTY、SDK、workspace selector）与最终source已读；SDK resume picker查询必须与native历史恢复保持。
- 本笔 `feat(proxy): align CLI public URLs and browser opening`。三个入口复用原base配置/external builder；本地/网络打印带同一prefix，公网含本机token，SDK picker追加resume=1。原shell字符串打开改上游spawn argv方式并复用一个私有helper；保留PTY/IM的noOpen，识别restart helper所需CXV_NO_OPEN，不动native启动参数/transport。
- 11/11、0skip：实际隔离CLI原生/exec resume回归、signal注册与公网picker打开实证；PATH内自有open脚本捕获完整url，literal {token}/自己的token/picker均保留，打开不触发模型。没有启动真实OS浏览器或验证Windows命令执行。日志/tmp/cxv-b10-cli-base.log。

## E13 — 更新检查改为只报告

- E12 `570da90`。已读6e3c93cd7ca52fc096df431957b3df7724f06605与17ba9be7b5f4cceb9c5c9371683b05fb258220c7更新checker实际diff/最终文件；迁稳定版本/渠道/忙实例检查，检查不执行安装。保留Codex流量与原auto_update配置门，显式用户检查允许覆盖，CODEX_HOME复用原配置读取器。
- 5/5隔离测试，私有临时HOME/CODEX_HOME、注入registry，无真实网络/全局安装；渠道、忙实例、无效版本及设置门通过。引导下载/重启尚未接线。

## E14 — 隔离TLS终止代理实证

- E13 `ffc4067`。本笔仅验收记录，未改产品。真实loopback HTTPS终止代理→HTTP后端21040，公开/session/{token}编码前缀；Chromium/WebKit各桌面/手机共4配置8图，逐一核看。插件Ping、wss回显、base/公开URL、错误/重试、关闭释放与管理Restart通过，0非预期pageerror。
- auth实测secureTransport=false/remotePasswordLoginAvailable=false，转发HTTPS没有放宽后端TLS门，符合用户选择。仅自签证书loopback代理，不声称LAN/真实DNS/密码插件/真机通过。自有fixture PID56243正常退出已核实，用户实例未动。见[B10反代GUI](./B10-proxy-gui.json)与[8图](./B10-proxy-gui/)。

## E15 — 可校验下载/安装作业与异步锁

- E14 `3f562ca`。6e3c93cd7ca52fc096df431957b3df7724f06605新作业实际diff/完整文件、17ba9be7b5f4cceb9c5c9371683b05fb258220c7加固diff与最终async-file-lock/update-instances/npm root辅助源码已核。迁原下载/真实进度/SRI/超时/单flight/跨进程锁、直装npm root/CLI/version二次验证，不绕过源码工作区unsupported_layout。
- 最小适配：本地路径/CODEX_HOME/CXV端口范围7008–7099；复用已有PID存活函数。原CLI固定CXV_WORKSPACE_MODE=1，因此它不再被误当独立selector而跳过全部实例探测；旧版version-only响应保守视为同类实例。私有argv/state/readiness/tgz继承既有文件/硬链/祖先保护。
- 代码审查发现原exclusive open失败仍删除同名文件、restore覆盖其他活进程owner，分别增加已创建标记与alive owner门，保留已有数据/所有者。
- 31/31、0skip：上游下载/锁/状态机加本地回归；真实隔离子进程超时，以及私有临时prefix内synthetic无依赖包实际offline npm install→版本/cli核验通过。没有访问官方registry或修改真实全局安装。主server/UI/重启仍下一笔。日志/tmp/cxv-b10-update-core.log。

## E16 — 更新管理路由/重启助手与native退出接线

- E15 `d962e7d`。6e3c93cd7ca52fc096df431957b3df7724f06605 CLI/server/router实际diff、17ba9be7b5f4cceb9c5c9371683b05fb258220c7 helper readiness/recovery加固及完整最终源码已核。本地signal coordinator/PTY/SDK cleanup调用链已追踪。
- 原helper的私有argv配置/readiness token/有界wait/安装失败记录并恢复旧CLI迁入；去掉导入时冗余注册signals（只保留真实main执行守卫）。三CLI入口在ready后注册handler，IM worker不注册；收到明确restart才启动helper，readiness成功后向自身SIGTERM，复用原10秒正常退出而不另造cleanup。保留原argv/cwd与CXV_NO_OPEN。
- 管理路由复用native显式admin与originAllowed，原same-origin门叠加；SSE update_progress与version-info渠道/进程身份/可重启/正常实例接入。旧checker available只通知不安装，用户实例不被代理停止。
- 27/27 helper/router/私有搜索/实际CLI回归，另22/22真实main认证（新增四API跨站/无admin/未就绪拒绝及version-info）；全0skip。真实fake CLI子进程恢复cwd/argv/exit7，失败恢复、helper启动失败、私有文件搜索/替换边界通过。尚未做真实生产包替换或UI验收。日志/tmp/cxv-b10-update-runtime.log与/tmp/cxv-b10-update-server.log。

## E17 — 原版引导更新UI与双浏览器

- E16 `7649484`。已读6e3c93cd7ca52fc096df431957b3df7724f06605 App/AppBase/UpdateModal/i18n实际diff与17ba9be7b5f4cceb9c5c9371683b05fb258220c7后续修复/完整最终文件/CSS。迁原560px弹窗、四渠道、真实byte百分比、单调状态、重启二次确认、进程身份恢复/16分钟有界poll与18语言；仅品牌/包名/Native事件链适配。UpdateModal CSS/updateProgress与上游精确相同，组件仅cc-viewer→cx-viewer差异，无新移动入口。
- Web790/790、0skip/build组装通过。上游纯函数/翻译覆盖迁入，真实组件callback覆盖渠道、25%字节、只在确认onOk才调用重启；不复制镜像源码断言。
- Chromium/WebKit×桌面浅/深共4配置16图，实际逐一核看；手动渠道、下载25%、确认前0次restart、确认后一次且409恢复原弹窗通过，0pageerror。真实隔离main/UI，下载/重启API响应由Playwright受控；后端实际offline安装和失败恢复另见E15/E16，不将GUI夹具称真实全局升级。初轮夹具updatedAt=1被正确拒为旧状态，修正时间戳后通过，无产品放宽。见[B10更新GUI](./B10-update-gui.json)。
- 首轮最终全量仅helper测试失败：上游夹具在launch写config之前就spawn读配置，竞争时ENOENT/ready超时。已定位，下一笔改夹具spawn时机后复跑，不冒称此全量通过。自有GUI fixture已发正常SIGTERM，用户实例未动。

## E18 — 修正helper测试自身的启动竞争

- E17 `6691512`。上游restart-helper第一项测试先spawn读config，再调用launch写config，单跑可碰巧成功，全量并发暴露竞争。本笔仅把真实夹具spawn放到launchRestart调用spawnImpl时才执行，与生产顺序一致，未改产品超时或readiness门。6/6、0skip通过；最终全量随后重跑。

## E19 — Electron渠道身份与动态插件pin

- E18 `a974111`。实读58493d1c859f0875395b34bf2e21ebe7a01ee5db tab-bar实际diff/完整pin渲染→原Header动作链，以及17ba9be7b5f4cceb9c5c9371683b05fb258220c7 main/pty-manager实际diff与本地完整spawn env。迁两处原意：tab子server标CXV_ELECTRON_TAB供version-info识别Electron渠道，Codex PTY不继承此标记；原生tabbar对动态plugin-panel pin回退已有插件图标。无重排/新增UI。
- main语法检查及PTY6/6、0skip，实际spawn参数中marker被剥且父环境不被改。未运行Electron GUI/签名打包，不用Node夹具冒充桌面验收。

## E20 — 孤儿服务清理完整身份校验

- E19 `4883317`。复核58493d1c859f0875395b34bf2e21ebe7a01ee5db完整cleanupStaleServiceLocks发现注释要求nonce/pid匹配，实际仅校验health PID。最小补齐已有配置/锁/健康name与nonce相等、ok=true后才发信号，避免PID复用或旧generation误杀。
- 19/19、0skip；新增真实loopback HTTP健康返回错name/错nonce/全匹配，kill仅注入记录，未向真实外部PID发送信号。全匹配才SIGTERM/有界等待/SIGKILL，错配零signal；原服务真实生命周期E6/E8保持。

## E21 — 补齐目录main的beforeRequest实际调用

- E20 `b363407`。最终调用链审计发现loader虽然已识别beforeRequest，本地server旧registerRoute机制没有执行它；不能把模块测试算主server功能。已复读58493d1c859f0875395b34bf2e21ebe7a01ee5db最终beforeRequest→dispatch全链，迁原waterfall/handled/500返回。
- native必要顺序：既有认证/Host/敏感管理门与精确workspace解析之后、legacy pluginRoute/普通业务路由之前执行，防止新hook入口先于原生scope校验。服务代理和管理端点保留已有专用认证门。
- 17/17真实主server服务集成、0skip：新增目录main hook处理真实HTTP端点；其余HTTP/WS/SSE/关闭/重启/删除回归。未把Claude审批hook接入原生Codex。

## E22 — 使用文档/原面板构建模板

- E21 `fb59b22`。复读58493d1c859f0875395b34bf2e21ebe7a01ee5db与57c732d0371bc34417e75a6bd106e1a3fde90f99实际文档diff、固定最终service/base URL全文、hooks及模板。迁中英service/base URL文档和4个原panel模板文件（精确字节），README沿既有插件介绍加入入口；按native调用实际情况写明PTY/interactions=null、无internalToken、审批不接Claude resolver、敏感路由优先与后端TLS密码门。
- 原hooks文档的Claude PTY/审批描述不冒充本地能力；中英hook说明仅列已接native生命周期、registerRoute/voice兼容。未另造18语言README、未搬上游发布版本。更新文档明确失败时尝试旧CLI恢复，不承诺npm部分写入后的文件系统回滚。
- 原template实际esbuild成功，临时目录/tmp/cxv-b10-template-MUFML0，无依赖安装；build/组装通过。生产包文档字节由下一笔安装核验。

## E23 — 最终全量/全新生产安装与精确产物

- E22 `55f75e4`。pack必需清单纳入服务/反代/update运行文件与使用文档，扩既有隔离安装probe为B10核心21套件；原npm单包形状不变。
- 最终clean-env全量2713/2713（Electron5+Web790+app1703+integration215），0skip；build/组装与pack773通过。新目录实际npm pack→npm --omit=dev安装：1096/1096、0skip，全部773包文件/211Web逐字相同；B1.2迁移/修复/损坏保护和安装CLI相对--cd启动通过。未触发模型。
- 首次B1.2 probe虚拟Host viewer.invalid被新白名单403，显式列入该夹具白名单后通过，没有放宽产品认证。为避免重复已过的1096项，probe增加--resume：复验全部包与测试字节相同后才复用runtime.log，再实际跑B1.2和CLI；首次resume日志含npm stderr导致JSON尾部解析失败，改JSONDecoder.raw_decode处理有日志的JSON段，之后通过。
- [安装回执](./B10-installed.json)、[清理](./B10-cleanup.json)。三组自有浏览器fixture均确认原进程已退出，21040无监听；7008只读为PID97674/普通PTY/队列可用，version-info尚无新更新身份字段，未冒称现用后端已加载。全局软链/用户进程未由本轮切换、停止或重启。

## E24 — 候选核销与完成交接

- E23 `4059848`。主5/交叉9去重12候选逐项核销；原工具目录/Activation与content抽包按既有B0/A2归属保留B11，不把移交标为已实现。088/082净tree与第一父相同已实证，PR171不重复计算；有效agent-loop重提、B8慢恢复及用户排除项分别说明。
- 13组件/CSS/原模板与固定上游精确字节，UpdateModal只替换包名的比对通过。最终2713/2713、0skip/build/pack773、新安装1096/1096及773包/211Web通过；本笔仅证据/进度文档，无产品代码变化，不重复同内容测试。
- 24笔按要求分别提交；完成矩阵、候选完整映射、台账与AGENTS/规划/README同步。B9 PR #11仍OPEN，未合并；B10未推送/建PR。下一步审阅交付与B11，所有未验环境保持单列。
