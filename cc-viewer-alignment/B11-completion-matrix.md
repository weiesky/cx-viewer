# B11 完成矩阵：安全交互、IM、跨平台与工程收尾

**状态：2026-11-23已合并main（第12/12工作包）。** 原分支基于main `a3fbc0f`；34笔原始提交备份后整合为1笔 `539822e`，[PR #13](https://github.com/weiesky/cx-viewer/pull/13)于07:19:32 UTC合并为 `3a4bf40`，最终候选/远端/merge tree一致。远端CI修正18条路径均折入该单笔提交，原始tree只与首轮精确整合tree相同。见[完整34笔映射](./B11-original-commits-2026-11-23.json)、[整合与合并记录](./B11-consolidation-and-merge-2026-11-23.md)；本轮进度更新在合并之后执行。

固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1`；42主/193交叉去重201候选，逐项原始diff/路径/patch-id、原生子项处置见[索引JSON](./B11-candidate-index.json)和[候选矩阵](./B11-candidate-matrix.md)。这是范围核销，不能将混合上游整笔、其他工作包或目标环境整体算作通过。版本/历史元数据不复制上游版本号；实际版本仍1.1.20。

| 范围 | 原生实现与映射 | 验证与边界 |
| --- | --- | --- |
| npm/Windows/Electron发现与启动 | E1–E3，固定argv、私有回退、exe过滤、Electron内置Node回退与IPC错误清理 | 实际解析/进程夹具、Electron9；保留Codex显式JS启动优先级，Windows定向合同已过；完整运行/Electron GUI未验 |
| 实际tarball/源码漂移/发布 | E4–E5、E15、E17、E23，npm旧/12 JSON、真实包布局门、Node/OS CI、OIDC tag选择与探测失败回退 | 626稳定路径/601源码门、实际YAML bash5场；PR远端10检查成功；未实际发布 |
| IM安全与原组件完整调用链 | E6–E11、E19–E20、E24–E25，非对象配置拒绝、三态、保存/启停、抽屉/V2日志/监听、真实白名单文案、私有nonce昵称缓存与争锁退让 | 实际HTTP/私有磁盘/V2/SSE、权限子进程、双浏览器；连接状态和启停受控，无真实DingTalk/模型请求 |
| 页脚/配额/文档与安全依赖 | E12–E14、E18、E22，原无星GitHub、无数据占位移除、cloud文档合同、fast-uri4.1.2与mac keychain补丁 | 原生UI/依赖与锁/实际安装代码夹具；cloud仅文档不新增上传能力，未实际操作签名钥匙串 |
| Changesets | E27 `57a90c2` | 真实status与六workspace隔离version只升cx-viewer1.1.20→1.1.21，5个私有单元版本保持；源版本不变、未发布 |
| 私有content | E28 `ffb4e6b` | 310原资产迁时字节一致、3实际路径探测/回退、4技能测试归属content；E30仅18份原设置文档换hook路径，安装仍原资产路径 |
| 私有core与测试边界 | E29 `e6c0f9b` | 实际28模块纯闭包/72生产caller；函数体不变，28旧路径薄兼容；私有bundle29文件，安装28别名同实例。A2已分配的原生测试复用，core/content契约随代码所有权运行 |
| lib归组 | E30 `dafc659` | 14实际IM/Ask/proxy实现、15caller、worker CLI锚点、旧hook自愈/幂等及两路径权限执行；不存在的外来store/reaper/多平台或排除retry/stats不虚构 |
| V2解环 | E31 `7d1da80` | 共用archive-scanner下沉，原存储/物化函数体不变；66真实归档/摘要/分片/并发/CLI/HTTP通过 |
| AST硬边界 | E32 `5892034` | 530源/14精确R3-R5例外/0违规，26正反夹具、STALE收缩；core Node/外部导入、Web绕包、自循环硬拦，无静态/动态循环例外 |
| 桌面core实体化 | E33 `7ce46a0` | 实际deploy先拦住core工作区逃逸链接，再按上游复制真实文件；825全文件字节、395链接边界、独立server启动/HTTP/stop与Electron9通过 |

最终完整正常 `pnpm test`：Electron9、content7、core28、Web808、app1725、integration246，合计 **2823/2823、0skip**；最终代码重新build与真实pack通过。严格六workspace冻结安装/边界门、626稳定路径/601源码门通过；全新生产npm安装 **1237/1237**，全部 **825包文件/211Web** 与严格构建和当前工作区精确字节一致，安装28别名同实例、内容回退、CLI相对-C与B1.2回归通过。实际Node20.12.0在当前macOS独立启动/HTTP/stop及 **93/93** 定向通过，未跑最低Node完整套件。桌面stage重新部署825字节/395链接/独立启动通过。详见[最终回执](./B11-validation-2026-11-23.json)、[生产安装](./B11-installed.json)、[桌面stage](./B11-electron-stage.json)与[最低Node](./B11-node-floor.json)。

双浏览器Chromium/WebKit：IM桌面同名A浅/B深/窄PC/原手机菜单8配置22图，设置与抽屉重连2配置4图、磁盘追加到drawer2配置2图、页脚无配额/geo/stars2配置2图，共 **14配置30图**。原Mobile无IM入口保持；桌面窄视口另验。保存/V2/昵称映射/日志更新走私有真实HTTP/磁盘，状态/启停受控；非预期pageerror为0。图与JSON位于[B11-gui](./B11-gui)。先前续写夹具丢nonce导致后续昵称断言超时，修夹具并新建私有实例完整重跑；不是改产品适配测试。

首次失败与修正保留：继承bypass测试夹具、源HTTP与prepack重组dist竞争、合成安装夹具漏core、一次CLI连接拒绝、桌面core逃逸拦截与GUI夹具顺序问题；最终通过与历史日志分别列在验证JSON，不掩盖失败，也不把旧检查点当新产物验证。E26旧回执单独保留。

用户既有选择保持：原生权限/reviewer、独立任务AppServer、常驻transport、Ask托管默认关、后端HTTPS密码门、代理retry配置/统计与off watchdog排除、独立run30分钟上限。cloud不新增运行能力；不迁三秒权限默认。

未验：Windows完整运行、Electron GUI/签名/公证、最低Node完整套件、真实DingTalk/外部模型、LAN-TLS/真实DNS、长等待/睡眠、物理手机/触控/IME/音频/密码插件、历史IM偶发、真实全局升级/registry失败部分写入及用户凭据迁移。Ubuntu全套与macOS/Windows定向合同现已远端通过；Windows有1个POSIX专用夹具跳过，不等同全OS运行验收。自有GUI夹具已核身份关闭；7008仍PID97674普通PTY，用户实例未停止/重启，正常重启才加载后端。下一步补齐这些目标环境验收。
远端CI收口：Ubuntu Node20/22/24全套与macOS/Windows定向合同共10/10 SUCCESS，见[CI回执](./B11-remote-ci-2026-11-23.json)。修复detached Changesets基线、目标OS路径、Node20 WebSocket夹具、实际进程退出等待、凭据锁释放/原子替换竞争与CLI stdout时序；确定性红测和压力复验保留。最终211个Web文件与E34 GUI产物逐字节相同，沿用14配置30图，不冒称本轮重跑浏览器。
