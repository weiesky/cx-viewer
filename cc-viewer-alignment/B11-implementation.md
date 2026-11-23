# B11 实施：安全交互、IM、跨平台与工程收尾

固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1`，实际源码 `/tmp/cxv-cc-viewer-research-20261122`；起点main `a3fbc0f`，分支 `alignment/b11-engineering-safety-platforms`。42主/193交叉去重201候选，完整hash/第一父文件足迹见[B11索引](./B11-candidate-index.json)。索引仅待审范围，不能据标题或B0文档代替实际源码。B1–B10已验子项复用并保留跨批次范围。

工程结构选择已通过提问工具提交：此前A2只授权最小workspace；Changesets与core/content拆包尚待选择，不据时间流逝视为同意。先做不依赖此选择的修复。原生审批/reviewer、独立任务AppServer、常驻transport不变、Ask默认关、后端TLS密码门和代理重试排除保持。不得停止/重启用户7008或其他实例。

## E1 — npm发现的安全argv与私有prefix回退

- 实读上游6bd3b80e58e4c160697f296ed885b22a57f1b5a0实际findcc diff、冻结最终getGlobalNodeModulesDir/candidates/infer完整源码，以及本地findcx全链与CLI三个入口。B10已迁buildNpmRootCommand/parseNpmRootOutput，复用它们；旧发现入口仍execSync shell字符串且无超时/失败回退。
- 本笔迁原execFileSync固定argv、Windows cmd.exe真实可执行文件、10秒上限、stderr隔离、npm告警末行解析和无npm的候选回退。仅品牌/路径适配；workspace父目录不是node_modules，不将packages误当全局npm根。测试上下文禁止机器路径回退，保留显式npm夹具入口，不执行真实模型或修改全局安装。
- 14/14、0skip（当前macOS），含5项发现与9项真实隔离CLI恢复回归；真实临时npm进程验证warning输出/失败/缺失后的私有prefix，Windows分支参数在POSIX断言，不冒称Windows实际执行。Windows不运行POSIX shell夹具。日志/tmp/cxv-b11-npm-root.log。Electron fallback/Native二进制选择留下一笔。

## E2 — Electron Node缺失回退与即时失败状态

- E1 `259df3a`。复读6bd3b80e58e4c160697f296ed885b22a57f1b5a0 main实际diff、固定最终resolveNodeExecPath/createTab/fork error/send完整调用，核后续monorepo与17ba更新标记；本地完整createTab/worker与runtimeRoot已核。迁原resolver，Windows只取存在的.exe；无外部Node则用Electron自身+ELECTRON_RUN_AS_NODE。fork error清30秒timer并立刻显示原error状态，dead IPC的send EPIPE记录而不掩盖原故障。保留本地worker stdio/诊断/精确runtimeRoot，无UI布局变化。
- Electron7/7、0skip：VM执行实际完整生产函数（不是镜像逻辑/源码needle），覆盖Windows多行where/.cmd拒绝/路径不存在、fallback env清理与真实EventEmitter错误→error、send同步EPIPE不崩；原runtime路径5项继续通过。首轮fixture把undefined当默认参数导致“非Electron”场景失败，改用null后通过，未改产品门。
- 本机node_modules/electron仅npm壳，实际Electron.app运行库缺失，真实Electron-Node/PTY探针发现binary不存在，尚未运行；不能把参数/VM测试当真机Windows或Electron GUI。所需环境：安装当前锁定Electron运行库，ELECTRON_RUN_AS_NODE=1启动同一Node/PTY探针；预期输出pty=true，下一轮继续尝试隔离准备。用户实例未动。

## E3 — Windows原生PATH的.exe筛选与Codex launcher兼容

- E2 `1218d22`。已读ef64e1562197ff0589d6d136258c572b05b1f2a2实际优先级diff、6bd后最终pickSpawnableLookupResult/resolveNativePath全函数、本地Npm→native→PTY/SDK三CLI入口，并读已安装@openai/codex 0.142.5完整wrapper相关路径：bin/codex.js由Node显式执行，再spawn平台binary。
- 迁Windows where多行只收.exe、常见路径.exe后缀与测试环境机器路径屏障；允许node_modules内原生binary，npm JavaScript入口仍由Node执行。Codex没有Claude的CodeFuse版本pin/配置选择链，不复制Claude优先级：保留既有npm launcher优先，避免无证据更换用户引擎版本。
- 首轮直接套“拒绝所有realpath .mjs”的Claude条件导致6项CLI恢复夹具失败；追踪发现本地支持独立POSIX可执行shebang .mjs，该能力不可回退。收窄到node_modules内需Node的JS入口，Windows仍强制.exe，16/16、0skip恢复；初轮失败日志另存/tmp/cxv-b11-native-discovery-first-failure.log。Windows含模拟platform与真实临时exe文件解析，不冒充Windows运行。
- E2真实运行库下载已尝试：隔离/tmp、使用锁定Electron包及其checksums，网络connect ENETDOWN，未获得Electron.app；复现脚本/tmp/cxv-b11-prepare-electron.cjs，错误/tmp/cxv-b11-electron-prepare.log。需要可访问官方Electron下载源；独立迁移继续，不标实机通过。

## E4 — npm 12产物JSON兼容

- E3 `1c92a35`。实读bacfe559fe773a39b8a26c81687baeecb749c147实际parser/workflow diff与冻结最终npm-pack-json完整文件，追踪本地pack:dry-run→assemble→npm输出。迁原npm<=11数组/npm12按包名object/直接entry三种解析与错误摘要，旧清单检查复用统一parser。原注释要求恰好一个包，但数组分支默收第一项；最小补齐length===1并回归，防多包报告被误当本包。
- 6/6、0skip；build/组装与实际npm pack预览774通过（新增parser文件），不是实际npm12平台实跑；上游tarball全清单门与CI待下一笔。日志/tmp/cxv-b11-pack-json.log、/tmp/cxv-b11-pack-build.log、/tmp/cxv-b11-pack-preview.log。无UI/用户实例变化。

## E5 — 完整tarball稳定路径契约门

- E4 `3e75471`。实读3b5103bb9e16b9e833ad2dd68feca5db787c2c76实际diff、bb8095c7fb最终real-pack替代dry-run修复、冻结verify-tarball-contract与parser全文件，追踪本地assemble/pack/生产安装路径。迁原真实临时tarball、稳定路径baseline、dist/index引用资产与voice-pack结构校验、明确--write再生成，不按上游Claude路径照抄。
- 最小适配：本地assemble脚本用process.execPath直接执行，复用E4 parser；Windows npm经真实cmd.exe/固定quote argv（参数级，未实跑）。575稳定路径与B10已验773文件完整比对：无删除，仅E4 parser新增，Vite hash资产排除于稳定路径但仍检查HTML引用实际入包。
- 实际--write/正常verify通过；创建自有临时文档后真实pack明确报新增路径并exit1，清理后assemble恢复无残留。日志/tmp/cxv-b11-tarball-contract.log与/tmp/cxv-b11-tarball-drift.log。尚未接远端CI，不把本地门当远端通过；无产品行为/用户实例变化。

## E6 — IM配置JSON先验与已有无损partial更新复核

- E5 `af5eb3d`。实读01ff6d85e8aa565c81b6b3c3c92f7e24c06c53a7 enabled-only read/merge/write与nonobject修复diff、冻结imConfigPost及本地路由/配置完整读写/凭据锁。native saveDingTalkImConfig已有锁内merge，enabled-only不会清appKey/白名单/secret，无须重写。
- 发现本地JSON reader允许null/array/primitive进入config，可能先保存再在applyProcess访问处报错；按本地B1严格门在保存前返回400 INVALID_CONFIG，避免无效body触发写入/进程控制。比上游把无效输入当{}更严格的必要信任边界适配，原生凭据损坏拒写保持。
- 路由/实际配置文件19/19、0skip，新增真实Readable→JSON reader→handler的5种nonobject全部400、零save/stop；已有partial/空secret/密文/进程语义回归。原UI保存/对话启动停止留下一笔，未调用真实钉钉或用户worker。

## E7 — 原IM重连状态与配置唤醒

- E6 `62cc7a3`。实际diff与完整冻结源码核出两个窗口前仍有效依赖：05287627e54a54fb5426c1492d5b06c64a45ca9a三态派生、3734b75d8eb85e371ec1a2df721cc3502e2ee377配置变化唤醒。为补齐B11 IM调用链单列补充依据，不混作201候选新增计数。迁原imConnState、ImStatusChip/原CSS与18语言重连词条；imTr本地已有，直接复用。成功保存广播cxv:im-config-changed，保留原native串行配置队列，旧worker无connectionState仍兼容。
- Web804/804、0skip，原13项状态矩阵加实际组件hook验证未配置不轮询、配置事件重唤、reconnecting优先于旧connected/lastError、卸载清定时器。helper/CSS精确上游字节，组件仅ccv事件→cxv；原琥珀点/减少动态效果CSS保持。尚未做浏览器视觉验证，不称GUI通过。
- 翻译初次正则跨过单行JSON对象而多取相邻词条，提交前发现并用JSONDecoder精确提取18项单词条，复验后才提交；未保留额外平台翻译改动。原IM保存/对话启动停止UI下一笔，用户实例未动。

## E8 — 原IM独立保存/对话启停控件

- E7 `e364136`。已读01ff6d85e8aa565c81b6b3c3c92f7e24c06c53a7两个完整原组件/实际diff、冻结调用与CSS，复核native配置/worker状态链。原settings actions中恢复Save（applyProcess:false），原drawer徽标旁恢复Start/Stop+Popconfirm、平台归属/卸载守卫与配置事件。Conversation CSS恢复原gap且与上游精确字节；18语言原控件文案逐对象复制。
- 必要native保留：本地配置变更串行队列、字段默认值、实际worker/连接判据与30秒启动窗口（本地BOOT_WINDOW=30秒）、独立IM日志SSE和原生Responses→conversation归一化。不能照搬Claude body.messages或全局local-log路径。新控件沿原位置，无另造布局；不复制同文件其他skill导入改动进本笔。
- Web806/806、0skip/build通过。实际组件callbacks验证Save改字段但enabled不变/不驱动进程，Stop确认前零请求、确认后仅enabled/applyProcess patch且变为Start。初轮简化descriptor漏真实fields与Drawer.title遍历、antd toast DOM夹具不足，改真实registry/遍历title/替换纯toast后通过，产品未因此改布局。
- 主入口审计另发现本地ImConversationModal从未挂到Header，旧chip仍直开设置；本笔仅组件级通过，不称完整功能完成。下一笔读原Header引入diff并恢复挂载/事件，随后实际浏览器核看。未启动真实钉钉/用户worker。

## E9 — 恢复原Header对话记录挂载

- E8 `e7bc503`。实读0b3995a3e36d9aed7a9a5ba77b05fae74bdd3c5b引入diff、ee5d9f20后续与冻结最终完整Header/Drawer/CSS；按最终保留Configure打开设置时的原抽屉。恢复chip和Electron im action打开平台记录，Messaging菜单仍打开设置；恢复原Loading与portal中文件链接防误导航守卫。
- Web807/807、0skip/build通过，新增实际Header回调验证两个入口不串；无布局重排。浏览器前实际HTTP发现/api/im/dingtalk/logs返回SPA HTML，原本地独立日志SSE也不支持native V2；本笔仅入口验收，完整记录链未通过，下一笔复用既有V2 reference transport补齐，不能把可打开视作可读记录。临时实例21140独立HOME/日志，无真实模型或钉钉请求。

## E10 — IM原记录入口的native V2完整读取链

- E9 `ccaf4bd`。读冻结最终packages/app/server/routes/im.js imLogs与完整原抽屉读取、native materializer/project-id/reference transport/projection调用。原接口按最新独立worker会话返回locator；本地复用已验证的V2列表、cwd碰撞身份及同一reference snapshot/object投影，不另造SSE物化协议、不接管主工作区流。日志列表只有DingTalk可用，worker继续只允许capability状态端点；无日志返回null。关闭/切平台中止原生fetch。
- 后端13/13（新增2项实际V2磁盘archive与同名cwd碰撞、JSON/未知平台/worker门），Web807/807、0skip/build通过。隔离双浏览器8配置22图实际通过：桌面A明/B暗/390窄屏PC的保存、native archive读取/投影、文件链接不误导航、确认后Stop/Start、重连；真实Mobile原上游没有IM入口，核其菜单保持缺席，未擅加入口。查看明暗/窄屏图；样式原字节，无重排。
- 初轮Playwright拦截未匹配apiUrl附带instance查询而等不到chip，改为pathname匹配；后续误假设Mobile共用Header，核完整最终Mobile无IM后改验原入口缺席、另验窄屏PC。以上仅夹具修正，未为测试改变产品布局。证据[B11-gui.json](./B11-gui.json)、[截图](./B11-gui/)，脚本/tmp/cxv-b11-gui.mjs。status/Start/Stop是受控响应，Save和V2链是真实隔离HTTP/磁盘；未连真实DingTalk、不启动用户worker。sender profile与落盘自动通知仍待独立补链，不称全IM完成。

## E11 — IM落盘自动刷新

E10 `b7deaf4`。实读b1b6aaa9原watcher/server/AppBase diff、eeb8a315 V2演进与冻结最终watcher及SSE派发；沿原惰性ensure/250ms合并/平台轻量通知/停止释放，适配native编码项目目录和session/parts层级。Node20原生recursive fs.watch只在记录接口访问后启动，不读或广播内容，不动主reference订阅。第一项目不存在时观察日志根并按精确项目过滤，随后收敛到该项目。

后端14/14、Web807/807、0skip/build通过；实际文件事件覆盖第一目录、嵌套分片、新session、无关文件忽略及释放。初轮只接受jsonl漏新目录唯一事件，且无效manifest导致ensure失败阻止通知；按原目录事件语义补齐目录变化与异常隔离后通过，失败日志保留。真实隔离双浏览器另2配置2图：实际LogV2Writer追加到fs.watch/主SSE/抽屉纯刷新，无手动刷新和模型或DingTalk请求，见[B11-live-gui.json](./B11-live-gui.json)。其他OS未实际执行。sender profile仍待补。

## E12 — 原页脚无数据门与普通GitHub链接

E11 `664cd75`。实读9eb178145bb218e0a84d806f350ac84f7287a537/cdabb274540ed25618c60d430f96866ad4309d4f实际diff、冻结完整App/AppBase/UsageWindowPill及CSS和本地native用量解析/endpoint来源。按原布局去star状态和外部请求，OAuth无真实用量不渲染占位，历史页不显示live用量；geo只有实时官方endpoint且已见用量才挂载。Codex官方来源复用既有OpenAI/ChatGPT判断；保留原生billing多窗口和plan metadata适配，不复制Anthropic头。删除原18语言waiting死词条及muted样式，不另造组件。

Web807/807、0skip/build通过；双浏览器另2配置2图确认无数据时无pill、GitHub普通文字且无geo/star外部请求，见[B11-footer-gui.json](./B11-footer-gui.json)。真实官方订阅额度触发未在本笔制造模型调用，沿既有解析测试；新源码需正常重启才进入用户已运行后端。

## E13 — 冻结fast-uri安全pin进入workspace锁

E12 `7868d63`。实读5c468c042eeca2c3dc1ee300d1d022f145f22160、9255663e33c76d106835cf8b801be09b04175882、cda9ed326d0f8332a3e2bea97dd1db3f29ac7e08的manifest/lock实际diff与本地完整依赖声明。native无adm-zip（ZIP沿JSZip），不引入不用的库；fast-uri仍3.1.3，由AJV进入Electron构建链。原4.1.2覆盖迁到pnpm-workspace，pnpm10.34.9真实重建锁，仅该pin/integrity/引用变化，未手写lock。

全新/tmp/cxv-b11-clean-workspace-r3gkx4he四workspace冻结锁安装（ignore-scripts）通过，实际AJV解析到fast-uri4.1.2，跨URI schema引用正确/错误输入判定通过。/tmp/cxv-b11-fast-uri-verify.log及clean-install.log。当前仓库旧npm式node_modules仍有3.1.3构建残留；未强制重装正在使用的用户安装树，不能称其已被清除；使用新构建需按锁重新安装。此项只证明对应冻结pin落实，不宣称全依赖无漏洞。

## E14 — 原macOS临时钥匙串密码修复

E13 `2105b01`。实读f20efc13710a4f855a659e03903d6122d03b7122全部patch/manifest/workflow/test diff、冻结最终与实际安装app-builder-lib完整createKeychain/importCerts调用。当前锁/安装已是26.15.3但漏原补丁；复制同版原补丁，pin builder防无意升级，pnpm生成patch hash与所有引用。证书导入仍用P12密码；ACL只用随机临时keychain密码。签名前执行原installed-dependency VM门，不调用真实security命令或读用户证书。

原测试在未修复依赖上2项如期失败；新冻结隔离安装与当前构建依赖均2/2通过，Electron全9/9、0skip。当前旧npm式node_modules已按同一patch最小修正，原单文件备份/sha位于/Users/sky/.codex/backups/cx-viewer/B11-20261123，未整体重装或重启用户实例。原patch精确应用无fuzz；新pnpm冻结安装证明可复现。初次复制锁早于生成结束导致fixture配置不符，等pnpm完成再重装后通过；不把首次失败记通过。真实签名/公证和Electron GUI未运行，下载运行库仍另有ENETDOWN记录。

## E15 — PR CI与发布前真实产物门

E14 `d628715`。复读3b5103、bb8095、f20efc、62012025cb/f3db3ed9a2冻结CI及本地唯一npm-publish调用。新增PR/分支CI：Ubuntu Node20/22/24冻结安装、显式node-pty rebuild、签名依赖门、先build再测试与真实tarball；macOS/Windows Node24做发现/报告/launch/sign定向合同，不冒充真实GUI。无安装zsh步骤，沿冻结后续修复；真实zsh环境未因此伪造。现有发布verify也改先build，release:check改先build再test/pack/合同，避免fresh checkout缺dist。OIDC由publish显式携带原本默认的latest，无额外dist-tag操作。本仓库无Homebrew tap/后续bump job，不增造外部发布。

真实build与576路径contract通过；新增仅E11 watcher路径，余575无变化。初次contract按预期拒绝最后一行App源码晚于dist，重建后通过；YAML两workflow结构解析、当前macOS定向17/17、0skip通过。首次全量Electron9/Web807通过，app1720中1项失败：perm-bridge夹具继承宿主bypass，native defer预期被旁路；非产品回归，下一笔隔离夹具后再跑app与integration。未触发远端CI/实际发布，不称远端通过。

## E16 — 宿主权限环境与原生审批夹具隔离

E15 `cc94f5a`。首次全量的defer测试继承宿主CXV_BYPASS_PERMISSIONS=1，实际生产桥按既有bypass优先规则正确返回allow，夹具却期待native defer。读本地完整perm-bridge/测试调用，参照ea8c5e39e07dabce557e9a9439effdd8cb95b69f的宿主隔离约束，仅令共享夹具默认bypass=0，显式bypass场景仍可覆盖；不改变生产审批、publish hard gate或用户配置。

强制宿主bypass=1的8/8通过；重新跑全部app1720/1720与integration215/215、0skip。加首次已通过的Electron9/Web807，本轮全量2751/2751、0skip，初次失败日志仍保留/tmp/cxv-b11-full-first.log，修复后两日志app-after-isolation/integration-after-isolation。仅夹具改动，无需重复已通过Web/构建。

## E17 — 原本地轻量产物漂移门

E16 `ab72113`。实读71cee60794ccdab9eb5eaeef5e84a9e52a54019e实际diff和冻结verify-tarball-drift全文件，复核native assemble与package.files。迁原pretest轻量文件集合门，映射本地lib/src/server/lib/content/IM/scripts与复制的electron/public/docs，不新增core/content包。真实tarball门仍权威；此门不声称验证dist hash或bin导出。

552已覆盖源码路径与576稳定baseline一致。实际自有docs临时文件触发added拒绝，暂加同一不存在路径到baseline触发removed拒绝；finally恢复baseline精确原字节并清夹具，正常门再次通过，日志/tmp/cxv-b11-drift-negative.log。根test与integration入口均接线。无产品变动，沿E16全量2751已通过，不重复无关套件。

## E18 — 冻结云同步契约与原生凭据边界文档

E17 `bd735d8`。实读b1fe5c09a6/9adf4ef539、964ce756b6/384dee8025文档演进及739f49a6de/565613bbea后续凭据根回退，核固定中英文契约与native配置路径、vault、auth、profile/workspace角色链。迁中英文云端对象/6个接口/云端优先与离线只读/S2密文方向，显式标文档-only、无客户端/端点/上传，未实施云服务或改变本地写入。

必要native说明：Codex模型字段、仅subagent角色、无通用prefs fork、启动冻结的双owner根、完整v1:AES-GCM+kind/ref认证、configuration-state/任务与恢复证据不上云。上游中文漏定时任务剥离，本地两语一致补齐；userId不等于鉴权。README只加文档入口，不制造其他18语不存在的README。实际pack baseline578仅新增2文档，轻量554源码门通过；无代码行为变更，沿E16全量2751。未把拟定契约当可用API。

## E19 — 空IM白名单提示的必要原生纠偏

E18 `377f23b`。复核01ff6d85原18语警告与本地完整onInbound、runDingTalkImMode：原生空白名单接收所有可达发送者，没有上游首个会话绑定；独立worker固定workspace-write/network=false且approval=never。E8照搬的首群绑定文案不实，现仅改18语同一词条及fallback为“任何可向此机器人发消息的人均可驱动其本地会话、无审批”，保留原位置和建议白名单，不改变权限/连接/接收逻辑。Web807/807、0skip；无新测试或界面重排，最终build/GUI随后统一复验。

## E20 — 原IM发送者昵称的完整读取链

E19 `72eb2ec`。补读ee5d9f2068ea184bf836d53d07efc9756aa225cc原sender map/adapter引入diff、固定完整im-senders、resolveAndPersistSender、imSenders路由/ChatMessage映射；钉钉免费senderNick、无头像/contacts请求保持。native现有IM marker以随机nonce绑定精确回包，不能改成staffId；将同一nonce映射到昵称，保持注入文本、授权和严格终态比对原样。该有界本地元数据缓存最多500个近期turn昵称，旧记录无缓存时沿原中性外部用户，不复制Claude身份/引擎逻辑。

复用私有目录/原子写/同一文件锁，读有512KiB上限及严格UTF8、拒绝链接/硬链接；名字128字符并剥控制字符，不执行HTML。只在已授权、非重复、被接受消息的arm阶段记录；失败不阻断递送。senders接口本地敏感门，远端403。35/35、0skip，实际callback昵称→native nonce、500上限/权限/链接保护/原相关回归通过。build/579包合同/555源码门通过；当前源码双浏览器8配置22图重验通过，真实私有map/API→Fixture Sender显示，旧profile待补标记可核销。Save/日志真实HTTP，启停仍受控；未调用钉钉/模型/contacts或用户worker。证据[B11-gui.json](./B11-gui.json)与更新截图。

## E21 — 新生产安装、Electron staging与最低Node实跑

E20 `86c291a`。复用原installed probe，增加B11发现/JSON/权限隔离及全部IM用例，未把dev依赖带入生产。全新真实pack+omit-dev安装1195/1195、0skip；全部778包文件与211 Web资源精确字节一致，B1.2安装回归和隔离CLI相对cd正常，未调用模型。见[B11-installed.json](./B11-installed.json)。新后端全app1724/1724、0skip；加已验Electron9/Web807/integration215，各套件最新结果共2755/2755。

针对96003517387ddc5c98130d7016ddeb6a9dad5bd3与6bcf5e5ab3，读原打包/metadata修复及本地完整assemble，使用独立已冻结安装的四workspace夹具部署production Electron staging，不改用户stage。778文件全部存在且字节精确一致，manifest无差异、src/utils全部入包、依赖无逃逸软链，见[B11-electron-stage.json](./B11-electron-stage.json)。只验runtime staging，不冒称Electron.app。

通过临时npm cache准备实际Node20.12.0（包声明最低版本），在新生产安装上实际启动隔离server/HTTP并正常stop，另45/45、0skip覆盖发现/pack/PTY/CLI恢复/IM nonce与sender，见[B11-node-floor.json](./B11-node-floor.json)。仅当前macOS架构定向，不冒称最低Node全量或其他OS。再次尝试隔离官方Electron35.7.5运行库，55秒下载期限耗尽，仍未获binary，错误/tmp/cxv-b11-electron-prepare-retry.log；真实GUI/签名/公证、其他OS继续未验。

## E22 — 当前旧式构建树的安全pin一致性

E21 `270b17f`。E13的新锁和新安装已为fast-uri4.1.2，但当前旧npm式构建树仍3.1.3。按同一已授权冻结pin，仅替换该未跟踪构建依赖：先在相邻临时目录准备新冻结安装的39文件，原3.1.3目录原样移入/Users/sky/.codex/backups/cx-viewer/B11-20261123/fast-uri-3.1.3，替换异常可回滚；没有整体重装node_modules。新39文件逐字节一致，当前实际AJV解析4.1.2、URI引用正反输入通过；现有keychain2/2继续通过。见[B11-local-build-dependencies.json](./B11-local-build-dependencies.json)。

已运行进程的模块缓存不会因此重载，未停止/重启任何用户实例；不声称内存中旧模块被替换。产品代码/锁未增加变化，2755及新安装1195仍有效；非全依赖安全审计结论。E13“本机旧构建残留”到此已落实文件系统纠正，历史记录保留。

## E23 — 原OIDC发布时tag选择与失败回退

E22 `13a824e`。复读3fa5717865eebad60ee92af80b482c97728233f4及2049aef95e/5b544c6ee1/90b41358f9实际workflow演进，补齐E15此前只显式latest的剩余：发布时原地带tag，若已存在更高stable则走patch并保留latest；registry失败沿源假设本版最新，最后publish失败仍使任务失败。采用原固定grep/sort版本比较，不引入另一个版本库或OIDC dist-tag操作。原probe在GHA继承-e时可能因registry错误早退，本地给仅探测pipeline显式||true，不放宽publish退出。

直接从实际YAML取run，真实bash -euo pipefail执行，受控npm记录argv：新版本/同版本/更高stable/查询失败/仅更高prerelease五场均通过，0skip，无外部发布。原有Node矩阵/真实包门不变；当前registry只读证据至1.1.20，无上游cc-viewer误发版本沿用。运行产品代码/778包未变；各套件最新总计2760（新增5条integration用例），远端CI与实际发布仍未执行。

## E24 — 设置页徽标补齐原三态共享调用

E23 `7397fd2`。最终caller复核发现E7的imBadgeModel已接chip/drawer，设置页renderBadge仍是旧复制分支，会被connected旧值/lastError遮住重连。复读05287627及冻结完整ImPlatformSettings renderBadge，改为原共享helper/Tag输出，删除重复判断；没有新状态模型、CSS或布局变化，原生启动/保存串行队列保持。

新增实际组件hook回归：ready+reconnecting+旧connected+旧error仍warning/重连/端口，Web808/808、0skip/build通过。双浏览器另2配置4图实际核设置与记录抽屉一致显示重连，私有昵称链仍可读；控制连接状态、无DingTalk/模型请求，见[B11-settings-state-gui.json](./B11-settings-state-gui.json)。各套件最新合计2761；前端变动后的新产物字节验证在下一轮统一重验，不沿用旧Web字节结论。

## E25 — 可选昵称缓存争锁立即退让

E24 `8c972fe`。沿ee5d9f20“身份缓存失败不得影响递送”的完整caller回看：E20复用的withFileLockSync默认等待30秒，虽捕获失败，仍可能把可选元数据变为消息注入前的阻塞。最小设置该缓存锁timeoutMs=0：空闲仍锁内合并/原子写，繁忙立即保留旧缓存并返回false，原生nonce/白名单/消息投递不变，不删其他进程的有效锁。

36/36、0skip。新增真实子进程夹具持有有效活PID锁，2.5秒外层期限内立即返回false，缓存字节/原锁不变，防回归成30秒等待。其余35项实际sender/adapter/bridge/route继续通过。最终build/真实包与完整安装随后重验，不沿旧Web字节或旧backend代码冒认当前包已验。

## E26 — 当前产物重验、201候选范围账与工程选择交接

E25 `da2515c`。最终build/真实tarball579稳定路径/555源码门通过；对E24/E25后新包重新完整安装与执行，1196/1196、0skip，全部778包/211Web精确字节。隔离Electron production staging也重新部署并复核778全文件字节（含manifest）一致；实际Node20.12新安装再启动/HTTP/stop和46/46定向通过。最新套件Electron9/Web808/app1725/integration220共2762/2762、0skip。双浏览器合计14配置30图，限制见各JSON；不是实际DingTalk连接、真机或Electron GUI。见[B11验证回执](./B11-validation-2026-11-23.json)。

本轮第二次全app曾与installed probe的prepack并行，后者会重组共享packages/app/dist，导致API base-url静态资源一场读到SPA HTML。读真实HTTP测试/assemble确认共享目录竞争后，等pack结束再完整串行重跑app1725全通过；未改产品或把HTTP测试加重试掩盖问题。初次失败/tmp/cxv-b11-final-app.log保留，通过日志final-app-serial.log；之后源HTTP测试不可与build/pack/assemble并发。integration220和新安装1196均通过。

201候选均记录明确第一父路径/diff SHA256/stable patch ID及范围处置；修正18个merge原先空足迹。74条纯版本/历史/changeset/star元数据经语义JSON核对，4对cherry-pick经patch-id相同证明；13个merge按既有功能scope分配，未把混合整条计作全完成。其余复用B1–B10或本轮有证据的native适配/不适用/用户明确排除；见[B11候选矩阵](./B11-candidate-matrix.md)。这不是靠hash代替行为验证，也不声称未适用的Claude功能已经实现。

尚待用户工程选择的5条：20ccfb7304 content、7d83b5deff Changesets、047db59b80 core、729b886893对应硬边界门、f9467bfc83关联内部重组；A1/A2最小workspace已授权，不从未答的选择推导进一步抽取授权。保留单npm发布包，原生reviewer/审批、AppServer/常驻transport、Ask默认关、30分钟run上限、TLS密码门与retry排除均不重复询问。工程方向确定后再核销5条，不标B11完成。

当前7008只读PID97674/普通PTY/队列可用，version-info旧式1.1.20；未停止/重启用户进程，新后端仍需正常重启。已核身份后只停止自有21140/PID32225夹具并确认端口关闭，见[清理回执](./B11-fixture-cleanup.json)。26笔小步提交保留，E1–E25完整hash/tree见[本地映射](./B11-local-commits-2026-11-23.json)，本笔仅证据/进度，不重写提交历史、不创建新PR。README/规划/AGENTS与台账均同步。

## 工程选择已确认（E26后）

用户通过选项明确选择“引入 Changesets”与“继续抽取 core/content”。此前待定方向已解除；按该选择实施5个候选，不再询问既有权限/目录方案。保留单一cx-viewer发布包，原生行为/界面不重设计。

## E27 — 上游Changesets A3落地与隔离发版演练

E26 `0821edc`。实读7d83b5deffb3d84a0f86ae4df3aaffba4c00d171的实际配置/依赖diff、047后修正与冻结最终config；迁Changesets3.0.0和privatePackages.version/tag=false、plain internal version依赖豁免。仅cx-viewer patch changeset，实际app版本仍1.1.20；不创建tag、不发布。保留已授权pnpm10.34.9；Changesets3的版本管理要求Node22.11+/24，发布runtime Node20.12保持。CI只在Node24核release plan。

当前legacy node_modules不能整树重装以免破坏用户已缓存PTY helper路径；新dev-only工具安装到稳定的node_modules/.cxv-b11-tools并链接changeset命令，不触碰既有runtime依赖。锁由pnpm生成。实际root changeset status成功，独立/tmp完整模拟version仅把cx-viewer1.1.20升1.1.21并生成CHANGELOG/消费changeset，三个private版本原样，源app仍1.1.20；见[B11-changesets-rehearsal.json](./B11-changesets-rehearsal.json)。下一步内容包、core与导入门；此笔未改运行代码，沿E26 runtime回归，最终全新冻结workspace安装再验新图。

## E28 — 私有content源与安装内回退

E27 `57a90c2`。按20ccfb7304实际diff与冻结完整路径/组装调用，把原生concepts、ultraAgents、imSkills的310文件逐字节移入@cxv/content；无原生IM预设目录则不虚构。开发用带私有包身份与sentinel的内容源探测，安装回退同名包内副本；原生system-prompt-templates保持。旧目录仅取消跟踪、保留组装副本，不删除用户已运行后端需要的路径。同步生成器、概念API、IM技能与相关测试调用；资产文本/布局不变。

content7/7、app调用46/46、目录概念3/3、0skip，build与真实pack通过。310文件与迁前hash、组装副本逐字节一致，见[B11-content-file-map.json](./B11-content-file-map.json)。发布原路径无删除。files从server/lib改为完整server，新增_paths并同时修复已被server.js真实Worker调用但此前漏发的raw-sidecar-worker，共581稳定路径/557源码门。完整新安装与Worker实例将在最终重验，不把路径存在当执行通过。最初安全用例从错误cwd调用产生失败，按正常app工作目录重跑46通过；Mac临时路径realpath仅修测试夹具。下一步core抽取和边界门。

## E29 — 原生共享core与私有bundle

E28 `ffb4e6b`。按047db59b80及冻结manifest/exports/包名caller，把Web实际跨入app的28模块传递闭包抽取为@cxv/core；无Node/外部依赖。72处生产caller用包名，内部相对导入。AST仅替换说明符，28模块函数体逐字节不变，见[文件映射](./B11-core-file-map.json)。原28发布路径保留薄转导出，兼容已安装调用与运行实例的后续import，不复制实现。单cx-viewer发布，以plain0.0.0与bundledDependencies带入私有core；Web声明开发依赖，pnpm链接plain工作区版本；不升级pnpm或整体重装活动node_modules。

Web808/808、core28/28同实例契约、定向PTY/CLI11/11、完整app串行1721/1721、0skip；build、610稳定路径/585源码门通过，恰增加29个bundle文件，无旧路径删除。初次完整app模拟安装夹具遗漏core的2场失败已修真实bundle夹具；另1场CLI连接拒绝在定向和完整串行重验通过，首次日志保留。全新隔离六workspace冻结安装通过；该严格依赖图真实pack后再独立生产npm安装，809全文件/211Web字节一致，安装侧28别名同实例与3内容路径回退通过，见[安装回执](./B11-core-installation.json)。此处安装runtime整套未跑，最终结构完成后另行重验。下一步IM/Ask/proxy内部归组与边界门；初查原生V2 summary/materializer一处静态循环须拆，不以白名单放行。

## E30 — 原生IM/Ask/proxy归组与兼容入口

E29 `e6c0f9b`。复读f9467bfc83实际rename/导入/CLI锚点/钩子与18语言文档diff；迁原生对应14模块到lib/im、ask、proxy，15生产caller改新相对路径。原生无ask-store/reaper、通用多平台IM与已排除retry/stats，故不新建空实现；现有adapters与log-v2复用。保留14个旧路径薄入口（权限脚本re-export同样执行原top-level），保护现存hook与公开物理路径；只改原生IM worker相对CLI锚点深度，不改函数体/默认权限/30分钟上限。映射与说明符/位置适配见[文件证据](./B11-lib-group-file-map.json)。

ensureHooks复用已有准确命令替换/幂等逻辑，指向新ask/perm-bridge，旧钩子下次正常启动自愈；18份原有设置文档只替换该路径。143/143、0skip，覆盖两路径实际权限子进程、旧hook升级/幂等/第三方hook保留、IM worker真实CLI锚点断言及IM/原生请求/托管默认关/代理诊断。build、真实pack624/599源码门通过，仅增加14实现路径、无原路径删除。下一步拆原生V2循环并落AST边界门，最终全套和生产安装再验。

## E31 — V2扫描下沉消除静态循环

E30 `dafc659`。047/729边界门要求静态循环硬失败；原生session-summary使用materializer扫描，而materializer又调用summary重建。沿完整扫描、摘要及调用链，将原有扫描与引用物化函数原样下沉archive-scanner；唯一函数名适配是内部readJson以readArchiveJson导出供两侧复用。summary改向下层，materializer保留scan原导出与所有公开调用；磁盘校验、顺序、预算/锁/损坏/尾部语义不变，提取区块证据见[JSON](./B11-scanner-extraction.json)。

66/66、0skip，实际V2物化/摘要/分片/并发/重启水位/CLI恢复与归档HTTP通过；build、真实包625/600源码门通过，仅新增scanner，无路径删除。AST初查530源文件，已无静态循环或hard规则违规；14个原生跨层/跨子系统现有边待下一笔写明确理由与收缩规则，未用例外放行静态循环。完整全套/安装最终重验。

## E32 — 冻结AST边界门与原生精确棘轮

E31 `7d1da80`。实读729b886893/047及冻结完整gate、夹具、例外与文档；移植Acorn/JSX解析、R0–R8/CLS、静态/动态SCC和STALE棘轮，路径匹配native根运行模块、lib与server/lib、log-v2，忽略组装资产副本和测试。core纯度内置硬拦Node/外部import，补自循环与未扫描content逃逸/相对core绕包夹具；不以字符串正则扫描prompt里的伪import。

530源文件、14精确例外、0违规；无静态/动态循环例外。14边为8个native SDK/PTY/日志启动及文件信任源R5、6个IM复用V2锁/项目/归档R3，逐边写明原因/日期；静态环、Web越界、core依赖与组合根规则不能豁免。26/26门正反夹具、integration246/246、0skip；build/真实包626/601源码门通过。root所有现有pretest入口与CI已接线，机器依赖读各包实际清单，发布runtime不新增dev依赖。5个工程候选从待实施更新为按native子项落地，README/规划同步；下一轮完整新产物验收，未称B11完成。

## E33 — 桌面stage私有core实体化

E32 `5892034`。最终严格六workspace的真实Electron production deploy触发可移植性门：唯一逃逸链接是stage/node_modules/@cxv/core指向工作区，不能冒认旧E26 staging结论。按已读047完整桌面组装diff，把私有core的package.json与src实体复制进一次性stage；验证包身份，只替换自有stage内链接/目录，不改dev依赖树，不放宽原有逃逸检查。

重新真实deploy通过，全部825发布文件（含29个core文件与manifest）逐字节一致，395依赖链接无逃逸；stage使用独立HOME真实后端启动/HTTP/stop通过，Electron定向9/9。见[stage回执](./B11-electron-stage.json)与[启动JSON](./B11-stage-runtime-boot.json)。没有Electron GUI/签名/公证结论。E32正常root pnpm test已2820/2820、0skip，E33仅影响组装器并重跑受影响桌面与实际stage；完整生产安装与浏览器/最低Node最终数据在下一笔统一记录，不重复无变化的全部套件。

## E34 — 最终新结构验收与本地收口

E33 `7ce46a0`。完整正常root pnpm test：Electron9/content7/core28/Web808/app1722/integration246，共2820/2820、0skip；严格六workspace冻结安装/build/AST门、真实tarball626稳定路径/601源码门通过。重新实际生产npm安装1197/1197、0skip，B1.2/安装CLI相对-C通过；全部825包/211Web逐字节一致，严格构建与当前工作区也825全一致；安装28别名同实例与3内容路径回退通过。最终仍验证core28原函数体hash、310当前内容源/组装副本字节，不把E28迁时hash误当E30改过18文档后的内容hash。

桌面stage825字节/395链接/独立server启动保持E33实际验证；当前新生产安装在实际Node20.12.0重新独立启动/HTTP/stop和46/46定向通过，最低Node完整套件未跑。Changesets六workspace重新按全部当前changesets真实version演练，app仅升1.1.21、五私有单元不变、源app仍1.1.20、无发布。详见[最终JSON](./B11-validation-2026-11-23.json)与[完成矩阵](./B11-completion-matrix.md)，E26旧检查点另存，不冒用旧产物结论。

重新Chromium/WebKit合计14配置30图，保存/真实V2/私有昵称/磁盘追加SSE、原手机无IM入口、设置重连优先级及无配额页脚通过，非预期pageerror0；状态/启停仍受控，不是外部DingTalk连接。最初按live→settings顺序复用夹具，live输入省略原nonce导致后续昵称断言超时；修复累计输入夹具后新建私有实例，完整14配置重跑通过，产品代码未为此更改。主设置与深色抽屉图再次核看，保留原布局。

只停止已核脚本身份的自有GUI进程并确认21140端口关闭，当前7008仍PID97674/普通PTY/队列可用，未重启用户实例；后端须正常重启才加载。本地实施与可用环境验收完成，201候选均有范围处置、无待工程选择项；不把未验目标环境计通过。E1–E33完整hash/tree与E34说明保留，34笔不整合不推送不创建新PR；下一步B11 PR交付及Windows/Linux/真实Electron GUI/外部真实环境验收。README/规划/AGENTS/逐提交台账与候选矩阵同步。
