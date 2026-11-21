# B5 实施：文件操作与搜索

2026-11-21，B5已完成（第6/12工作包）。E1–45独立实施/审计，E46汇总；最终1781/1781、0skip/build/pack712，真实安装487/487、必需源码/204Web字节/B1.2/CLI通过。以下逐笔记录保留当时检查点与失败，不把历史待办当当前状态；最新见[B5完成矩阵](./B5-completion-matrix.md)和[最终回执](./B5-final-2026-11-21.json)。固定上游74cd752d99caf122e750216d2af3bb9f467c4de1；B4经PR #4合并288faea，B5原收口时尚未远端交付；其后用户授权1commit/1PR自行合并，见[B5整合记录](./B5-local-commit-consolidation-2026-11-21.md)。

## B5.1 E1 已有 stdin EPIPE 防护复核

上游 `96c477d582f45f6ba102a083de9c9f0c4a07cad2` 实际diff、固定最终server helper与 `/api/files` 调用链已读。原实现 `ecc1048` 已随B2聚合提交 `41d95af` 进入main（见B1-config-implementation.md第十三笔），本轮复用，不重复改生产代码。`lib/exec-with-stdin.js` 已监听stdin error、同步end失败、spawn error/close、一次性settle，并clearTimeout；退出码1仍返回stdout。当前server目录列表按requestProjectDir解析，git失败降级为普通文件列表。

验证：Darwin arm64 / Node24.14.0，包目录执行 `env -u CXV_BYPASS_PERMISSIONS CXV_TEST=1 CXV_LOG_DIR=tmp node --test --test-reporter=tap tests/exec-with-stdin.test.js tests/auth-server.test.js`，**24/24通过、0 skip**，日志 `/tmp/cxv-b5-e1-tests-package.log`。首跑误从仓库根目录执行，auth静态资源fixture相对cwd与server包目录不符而失败；保留日志 `/tmp/cxv-b5-e1-tests.log`，按正式包脚本工作目录复跑，不为测试修改产品。覆盖4MiB提前退出、非零正常输出、缺命令、超时、真实HTTP注入stdin EPIPE/缺git后列表和后续鉴权请求继续服务。本笔无DOM/CSS/功能变化，未重跑GUI/全仓/安装；Windows保持未验证，不以此认定整个B5完成。

## E1时的下一笔（历史记录）

迁入 `bd50636219e086ba082ab4bb36e5c0b6a996172e` 的搜索worker后端。已读取实际diff、固定最终code-search/search-worker、现有search路由与凭据策略；前端虚拟结果/导航和后续a6b82整合单独迁移。worker必须继承父进程冻结及当前私有路径，保留项目realpath与打开后descriptor校验，不能因线程环境不同放宽隔离。


## B5.2 E2 搜索 worker 后端

上游 `bd50636219e086ba082ab4bb36e5c0b6a996172e` 实际后端diff、完整code-search/search-worker与固定最终版本已读；该后端之后仅有A2路径整理，无后续功能回退。直接迁入一次一任务的Worker、结果/错误协议、invalid_regex适配、64文件/4MiB让出节奏、cap/时间预算和取消终止。前端虚拟化/导航、a6b82搜索嵌入及history/发布仍独立，不将混合提交整条勾完。

必要本地适配：保留原isPathContained、凭据路径与打开后descriptor/inode检查、O_NOFOLLOW/O_NONBLOCK、rg正向glob过滤。导出既有策略路径的只读快照给worker，包含启动时冻结凭据与原/当前配置路径，防止threadId或setLogDir造成策略走偏。fs monkeypatch不跨isolate，原descriptor-race测试改执行实际导出的runNodeScan，真实Worker另验完整私有目录与硬链接拒绝。settle移除AbortSignal监听。

先按上游把git ls-files也移入worker，真实挂起fake Git探针证明abort后子进程仍存活；不能回退既有资源回收。最小修正为将原异步gitListFiles抽入search-candidates.js、继续由父进程持AbortSignal/8秒timeout，把清单交worker；所有同步遍历/读取/正则仍在worker。改后同一探针childAliveAfterAbort=false，加入真实PID回收回归。无新依赖、无UI/DOM/CSS改动。

验证：最终定向 **73/73、0 skip**（`/tmp/cxv-b5-e2-tests-final.log`），含真实loopback搜索路由、忙碌交替正则下并发HTTP和客户端断开后可再次搜索；全量 **1596/1596（5+332+1047+212）、0 skip**、build与pack:dry-run **704文件**通过（`/tmp/cxv-b5-e2-release.log`）。早一轮1595全量与中间基准保留，不冒充最终版本。新增策略测试首跑使用Darwin系统tmp路径调用setLogDir，原API只允许home或/tmp故未切换；修正fixture为获准/tmp、验证原/现两个目录，不改产品限制。worker测试生成脚本首跑工作目录错误已重执行，无生产影响。

受控基准：384文件/103243776字节，实际searchCode与并发loopback健康HTTP同进程，3轮前后对照。旧主线程最大loop延迟79.69–84.34ms、HTTP96.64–108.25ms；最终worker版本loop6.91–10.77ms、HTTP2.72–13.50ms，扫描390–395ms→405–417ms。该结论是此合成夹具的响应性改善，不是外部网络/全部平台或无限规模承诺。原数据与必要适配见[B5 worker回执](./B5-search-worker-2026-11-21.json)，可复跑 `node cc-viewer-alignment/probes/b5-search-benchmark.mjs`。

下一笔迁入原搜索结果虚拟化/键盘导航和固定最终嵌入布局，保持原布局/CSS及现有精确instance URL接线。B5整体仍实施中。

E2新生产安装：704文件、204Web资源精确字节、364/364运行时、B1.2合成回归和隔离CLI相对--cd启动通过；复用并扩展b3-installed-check探针覆盖三个搜索模块、策略模块及五组实际搜索测试。安装路径及结果已入worker回执；临时HOME/fake Codex、无真实模型网络。


## B5.3 E3 原搜索虚拟结果与键盘导航

E2本地commit `f14c914`。本笔同一上游 `bd50636219e086ba082ab4bb36e5c0b6a996172e` 前端子项，已读完整实际diff、FileRow/MatchRow/flatten/replace调用链、完整CSS和后续eb2e9703/a6b82最终组件。先独立迁虚拟列表、原previous/next/Enter/Shift+Enter/Arrow导航、搜索中提示/engine badge；代码除ccv→cxv既有storage namespace外逐字等于该上游提交，CSS逐字一致，复用已安装react-virtuoso。三条新词条18语言直接迁入；保留当前既有单花括号模板。a6b82嵌入/控件重排随后单独迁，本笔仍为中间状态，不声称最终布局对齐。

Web332/332、0skip及构建通过（`/tmp/cxv-b5-e3-{web,build}.log`）。实际隔离WebKit27.2：20文件/2000匹配仅挂载36个结果行；Enter首行、ArrowDown跨未挂载区域至index40、Enter打开真实文件、同名另一工作区B标记不出现在A搜索，通过且0pageerror。截图已实际核看，回执[B5搜索UI](./B5-search-ui-2026-11-21.json)。首次默认浏览器缓存缺失，指定B4缓存后Chromium headless-shell页面target crashed；继续以WebKit完成验收。首次空fixture/英文定位不成立，向本机fake Codex发一轮seed后按实际中文入口完成；未修改产品以满足定位器。Chromium/响应式与固定最终嵌入视觉继续E4，非物理设备通过。本笔未重复后端全量/安装，最近完整检查是E2的1596/364。


## B5.4 E4 固定最终搜索嵌入布局（含已选择保留的基线缺陷）

E3本地 `a2a4ec0`。上游 `a6b82f16dff7991670ca8bdf3f01c6ae6f0d5d4b` 实际diff、完整SearchPanel/FileExplorer/ChatView调用链及两份完整CSS、eb2e9703的作用域演进已读；固定最终搜索组件仍有效。迁入标题栏放大镜、原树下半嵌入位置/控件重排、刷新保持开启/查询、50%默认与35–80%分界、指针捕获与拖动中关闭清理、搜索/分界拒绝导入/移动、Escape回原开关焦点，以及打开结果的祖先展开/编辑器释放和替换后重载。未把原搜索rail另留一份。

SearchPanel最终组件仅ccv→cxv既有命名/ID、复用本地B2精确instance URL代替Claude project/instance body参数两处必要适配；其完整CSS逐字等于固定源码，SHA256 `707831e627934467f6a3edd7bc8400e6ac7cd68d664b9759d54005f4e2003577`；FileExplorer搜索嵌入CSS块逐字一致 `97f941eb355404a92467ddf1eb28f0b75d80d2a073617a6636b07e3b6c56e9d5`。现有B2页面切换按instance重挂载、取消旧搜索，沿用当前search/replace授权与mounted guard；不另建第二工作区路由。

验证：Web **334/334**（含实际ChatView控件回调/开启恢复、关闭、编辑器释放、祖先持久化归属与替换后viewer刷新），完整 **1598/1598（5+334+1047+212）、0 skip**，build、pack:dry-run704文件通过。实际Chromium159（完整程序，避开此前headless-shell target crash）及WebKit27.2桌面：2000匹配仅15/16DOM、跨虚拟区index40、结果展开祖先、刷新恢复且不抢焦点、80%限幅、drop无导入/移动、替换取消字节不变/确认真实写入、同名B文件保持、拖动中关闭清cursor/userSelect均通过，0pageerror。可复跑[B5 GUI probe](./probes/b5-search-gui.mjs)，复用获准的临时Playwright；不是仓库新增依赖。纯定位器/无关地理网络/错误prop断言的修正详见回执，未据此改产品。未重复安装验收，最近新安装检查仍是E2的364运行时/204精确Web资源。

**iPad已知缺陷，用户选择保留：**834×1194、iPad UA+ipad=1的实际WebKit完成相同操作/刷新/拖动/替换且0pageerror，但确认全部替换返回后mobileCLIBody.scrollLeft从0变243（scrollWidth1668），文件树x从41变-202，截图左侧裁切。逐阶段定位到替换确认后，原SearchPanel/CSS与Mobile容器/平移overlay相关样式相同；原生/antd焦点滚动的精确内部触发尚未完全隔离，不能宣称iPad视觉全通过。交互工具明确选择“保留并登记基线缺陷”；**不加overflow/焦点补丁，不把操作断言通过充当完整视觉对齐**。此已知限制保留在[B5搜索整合回执](./B5-search-embedded-2026-11-21.json)及原截图。桌面已核布局与iPad缺陷分别记录；物理设备/其他浏览器版本仍未验。

下一笔共享文件菜单和原应用内文件浏览器；B5尚未整体完成。


## B5.5 E5 原流式文件下载后端

E4本地 `123f06a`。已读 `ba3eee8fd5520b0a6ce66ebd6da749fc8cb120b5` 实际route/UI diff、固定最终fileDownload→fileDownloadWithRoot、ab1b89ee13作用域修复及当前server鉴权/精确instance/read policy/raw全链。迁入GET/HEAD attachment、无预览大小上限、原application/octet-stream/Content-Length/RFC5987文件名，使用现有Node stream而非整文件Buffer。UI远程菜单下一笔接；target外部文档根保持独立，不能用editorSession切换下载权限。

必要适配：root复用当前requestProjectDir及resolveFilePath(false)，不复制Claude home读白名单；HEAD和GET都先验证真实目标/打开后descriptor/inode和凭据策略，原始fd交createReadStream(autoClose)/stdlib pipeline。请求断开或读取失败销毁流并关闭所属fd，避免把失败报成成功空文件；复用既有debug-gated reporter。文件名中RFC5987的额外保留字符编码，空格/引号/换行实测还原一致。本笔无UI/DOM/CSS变化、不加依赖。

真实loopback定向 **49/49、0skip**（7个新下载回归及原file-api/credential policy/auth-server/SDK工作区连接），build通过。12MiB超过预览上限仍精确SHA256、HEAD空正文、同名A/B/stale及绝对兄弟路径/editorSession/hostile Origin拒绝、symlink/private hardlink/打开后替换拒绝且fd关闭、64MiB稀疏下载客户端断开清理、注入read error中断连接且后续服务正常，见[B5下载回执](./B5-file-download-2026-11-21.json)。初次测试文件写入命令工作目录错误未生成文件、仅旧9项执行；已纠正并实跑新用例，不计作通过。未重复全量/安装/远程GUI，最近全量仍E4 1598；Windows/Linux/最低Node未验。

接下来原共享菜单/远程下载入口及原文件浏览器。用户已选择保留E4的pad确认替换横滚缺陷，不再改动该基线行为。


## B5.6 E6 原共享项目菜单、远程下载入口与文件树行高

E5本地 `958027e`。已读 `865604d68e05e62aaebf8de7a04afa9a9f1e999d` 全实际菜单/组件/CSS diff与完整handler/builder、固定最终演进；`ba3eee8fd5520b0a6ce66ebd6da749fc8cb120b5` 的远程文件下载gate、`7830664780a5c16219edbb7e79662ad0ad27db9b` 原26px行高修复同时核定。将项目菜单的原builder/handler迁入共享模块，树行、Header及根空白共用，保留原顺序、inline rename、确认、失败throw保留重试与服务端返回路径；复用已有clipboard fallback。remote-only文件项按preferences._isLocal===false增加原下载入口；目录/未知偏好/本地不闪现下载。新增column blank filler时同时带入其上游后续flex-shrink:0修复，防止引入已知行高压缩；相关treeContainer/treeBlankArea/treeItem CSS来自固定最终原块。原应用内浏览弹窗/target菜单差异仍下笔，不将865整条勾完。

必要实例适配：上游后续ab1b按project/instance绑URL；本地apiUrl默认取当前页面URL。Modal.confirm可超出工作区子树生命周期，故factory创建时冻结现有apiUrl结果，迟到确认不能把A路径投给切换后的B。复用原精确instance/无instance boot路由，不另造身份表，不改可见弹窗。组件真实回调覆盖有/无instance时后续切B仍向原URL写、403失败不回调且可重试、归一化路径、目录/根危险项与remote gate。

验证：Web **337/337**，完整 **1608/1608（5+337+1054+212）、0skip**、build/pack704通过。新生产安装 **371/371运行时**、704文件/204Web精确字节、B1.2与隔离CLI通过。实际WebKit27.2和Chromium159：82树行全26px且容器确有overflow，根空白新建、inline rename、删除取消字节保持；A删除确认打开后通过真实History API/popstate切到同名B，确认仅删除A、B同名canary精确保持；本地隐藏下载、模拟remote偏好显示原项，使用真实E5下载端点与浏览器download event得到同名/精确字节。菜单截图已逐张核看。remote仅模拟_isLocal位，未假称真实LAN/远程传输或物理设备通过。主页面pageerror最终为空，第二页的完整全局错误监控不另声称。

GUI首轮遇到旧菜单退场/新菜单定位与选中行scrollIntoView抢时序、danger默认按钮样式、自动拥有的BrowserContext不可开第二页，以及整页导航取消请求的WebKit诊断；全部原失败日志保留。最终probe在初始导航前建文件、使用明确BrowserContext、等待原菜单motion/选中行定位完成、远程态开第二页并本地stub地理查询，**没有为自动化修改产品菜单、焦点或CSS**。可复跑 `CXV_PLAYWRIGHT_MODULE=<已批准临时模块> PLAYWRIGHT_BROWSERS_PATH=<其隔离缓存> node cc-viewer-alignment/probes/b5-search-gui.mjs chromium menus`（webkit同理）。详见[B5菜单回执](./B5-file-menus-2026-11-21.json)。E4 pad替换横滚按用户选择继续保留。

下一笔为原文件浏览器及其安全前置，继续按子项提交，不标B5整体完成。


## B5.7 E7 Codex 原生凭据/配置的文件工具拒绝前置

E6本地 `0508ad3`。读取固定完整file-access-policy、`7a75e1be81b3e90f55f8888c423e66e05c1cde64` 实际shared read/write guard diff、祖先策略 `253f7f67fe6aef1995f810c44c6bdcb99cf261f3` 及本地getCodexConfigDir→config.toml/backup、file-api/editor/raw/download/search链，确认原基线显式拒绝Claude OAuth/settings，而本地此前只保护CX Viewer凭据/配置。

最小必要Codex适配：在已有credential-file-policy的可信根目录列表中加入原生auth.json、.credentials.json、config.toml和既有后缀备份；目录来自本地实际CODEX_HOME/CODEX_CONFIG_DIR helper及默认~/.codex，保留启动/当前两个owner，避免换目录后放掉原配置。只枚举文件名与stat/inode，**不读取、不改写真实Codex凭据内容、不触发迁移**。复用当前lexical/canonical/private inode/祖先mutation和E2父进程→Worker路径快照。项目中的同名fixture、原生AGENTS和skills不因泛文件名规则误拦；专用Codex配置API不通过文件工具，不变更其读写实现。原全局allowlist/敏感history目录/target root与授权仍单列待迁，本笔不是整套policy或7a75整条完成。

合成临时HOME先红（1通过/3失败，`/tmp/cxv-b5-e7-red.log`）后绿。最终定向 **49/49、0skip**，含启动/当前/默认原生owner/备份、显式editor read/write拒绝和原字节保持、Native目录祖先拒绝、symlink/hardlink别名、真实Worker及真实HTTP content GET/POST/raw/download/list/search拒绝，auth端点继续服务。完整 **1613/1613（5+337+1059+212）、0skip**、build及pack704通过，见[B5原生文件策略回执](./B5-native-file-policy-2026-11-21.json)。本笔无DOM/CSS变化，无新GUI需要；没有重复新安装（最近E6 371/204Web），Windows/Linux/最低Node等边界保持。

下一笔文件浏览/编辑所需二进制与编码保护，再接原项目文件浏览器；B5继续实施中。


## B5.8 E8 原二进制下载页与 UTF-16 只读保护

E7本地 `8009214`。读取 `f96811cddb3f1f5516ef7823bcc2a36d142a95e3` 实际diff、固定binary-sniff/内容路由、完整FileContentView/CSS/UnsupportedFilePreview、真实调用方，核对后续20313b/18bd742仅扩展B6分派而未替换本子项。直接迁入35行sniff、原415 `{reason:binary,size}`、BOM UTF-16 LE/BE可靠解码/只读标记、原UnsupportedFilePreview DOM/完整CSS与10词条18语言，及原AbortController卸载/换文件取消守卫。CodeMirror只读、MDX回退旧预览、隐藏保存与Ctrl+S/dirty守卫均来自固定最终实现。未开放B6格式dispatcher。

必要本地适配：沿用精确instance apiUrl与已验证私有路径/descriptor防护，保留404 onFileMissing恢复回调；sniff读取同一已验证fd且限5MiB。现有写端点只会输出UTF-8，故同时防御直连/迟到POST：O_RDWR打开后按原fd定位读取并验证，二进制/UTF-16/超过预览上限的现有文件在truncate前拒绝，原字节保留。定位读取不改变fd偏移，普通短/长覆盖、新文件/空文件/ANSI/多语言UTF-8回归通过。不新增可见设计；外部editor下载仍不放宽项目范围。

验证：定向 **28/28**（原sniff8+新4及文件/private/native/download回归），完整 **1625/1625（5+337+1071+212）、0skip**、build及pack705通过。实际Chromium159/WebKit27.2：LE/BE/Markdown两视图只读、无MDX/保存POST，二进制不挂编辑器且真实download字节一致；截留旧binary响应后换文本，取消保护无旧结果覆盖；普通UTF-8仍编辑保存一次，B同名canary保持。四张原截图已逐张核看，Unsupported CSS逐字等于固定源码SHA256 `0ec69c3b53a51094d7eaa9f038a5be86b83669fac98d8b0906383792f65e95d8`。探针首轮的工作目录/视图保持/原翻译定位及SVG图标accessible name问题已纠正，未为自动化改产品，日志保留；详见[B5编码回执](./B5-file-encoding-2026-11-21.json)。新安装首轮90秒超时不算通过；180秒限时受控重跑最终392/392运行时、705文件/204Web精确字节、B1.2及隔离CLI通过（新临时HOME/fake Codex，无真实外部模型）。既选pad横滚缺陷保持；B5整体/完整f968/B6等不计完成。

下一笔原共享文件分类/主题图标及项目浏览弹窗；target/拖放/全端点与Git子项仍待。


## B5.9 E9 原文件分类、共享SVG与主题色

E8本地 `4d18c42`。核对 `a278d68954bc41150533177f8e1bbfec320d00a2` 与 `637fbb0218d0963b35308cbcd6288bdc3578c133` 实际diff、完整分类/图标源码、桌面FileExplorer/GitChanges与两处移动端调用链/完整组件CSS；核对91a523/f968/20313/18bd742后续分类/Windows basename与subtitle字形。固定最终fileIcons.jsx/fileTypes.js逐字迁入，原dark/light两段35行CSS逐字一致（哈希见回执），移除MobileFileExplorer/MobileGitDiff的重复图标/颜色，复用原shared模块。当前树/Git行DOM、尺寸与已有布局不另调整；B6格式路由没有随分类一并打开。

Web **352/352（15个原分类用例）、0skip**，build/pack705通过；新生产安装705文件与204Web资源精确字节通过，使用已有安装probe的artifact-only分支避免无后端改动时重复运行392项。最近全量/安装运行时仍是E8的1625/392，未冒充本笔重跑。实际Chromium159/WebKit27.2桌面、WebKit390×844手机触控/UA仿真，分别核验文件树/Git两表面16种文件的14px/2stroke、每类原字形、未知类型仅文档母形、Office三种颜色不同，light/dark即时切换无重挂载。12张截图/计算样式留存，6张代表截图已实际核看；手机滚动到对应条目再截图，未拿屏外DOM断言冒充可见截图。probe仅直接切data-theme验证CSS token，不等同整套主题设置流程或物理真机验收。

首轮Git定位选中行尾还原按钮，手机按钮exact accessible name忽略图标标签，修正为原图标span/可见文本后通过；未为探针改产品。见[B5图标回执](./B5-file-icons-2026-11-21.json)。a278/637本文件图标范围已核；后续混合提交只计分类/字形子项，B6预览仍待。E4 pad缺陷按用户选择保留。下一笔原项目浏览弹窗与共享导入/移动依赖，B5仍实施中。


## B5.10 E10 原共享导入链路与异步归属

E9本地 `f7bfa97`。先读 `365af800e58f34a57b2339cf705f56390874f20b` 实际importFiles/FileExplorer抽取diff、固定完整importFiles/fileMove/fileDropTarget/useFileDropTarget与调用方CSS，及 `ab1b89ee133664c9f2c0e3e17ada8711180f4dc5` viewed-scope后续diff。本笔仅将既有外部导入/目录扫描迁入原共享importFiles模块，FileExplorer按原handleImportFiles注入刷新；不一次带入移动/弹窗/全局drop zones，混合项继续待迁。目录reader连续批次、32层cap/OS文件过滤、平铺fallback、>1000确认、3并发、原部分失败/成功提示和server-normalized回调保持。

必要scope适配：原后续withViewParams显式绑定project/instance，本地apiUrl默认在调用时读取当前URL。故在首次扫描/确认await之前一次性冻结已有apiUrl('/api/import-file')，每文件只追加编码dir，不能扫描半途、批量确认后或并发后续任务重查B的URL。原token/base path与无instance启动视图语义保留，不引入第二身份源。DOM/CSS未变。

验证：Web **357/357、0skip**，含5个实际共享函数边界用例：有/无instance延迟扫描后切B仍保留原归属；1001文件取消无上传/确认最多3并发且全部A；网络/403部分失败不误报全成功、只有实际成功才刷新；101条reader跨批排空/嵌套路径/OS过滤/深度cap。build及pack705通过。实际Chromium159/WebKit27.2：合成browser drop触发真实组件，挂起entry.file扫描，通过真实History/popstate A→B后再放行；真实multipart API返回A/search-fixture/nested/delayed.txt，中文原字节精确，B无新文件，0pageerror。不是原生OS拖拽手势通过；不新增视觉截图或冒充DOM布局变化。回执[B5共享导入](./B5-shared-import-2026-11-21.json)。前端抽取后未重复后端全量/安装运行时，最近完整E8 1625/392和E9新安装705/204Web字节分别保留。

下一笔原共享移动/区域drop守卫与项目浏览弹窗；外部target/root、Git子项及完整B5仍待。pad已知缺陷保持用户选择。


## B5.11 E11 原共享移动与拖回根契约

E10本地 `6db909f`。读取 `365af800e58f34a57b2339cf705f56390874f20b` 实际fileMove/FileExplorer/blank dragover/files-fs diff与固定最终完整move路由、`ab1b89ee133664c9f2c0e3e17ada8711180f4dc5` 精确view演进。本地存在两处原缺陷：后端!toDir拒绝空根，空白节点stopPropagation阻断dragover默认接受。迁入原共享fileMove/guards、原允许toDir==''、原移除空白dragover阻断，并使用固定最终join(toDir,name).replace返回POSIX相对路径，避免根移动后得到`/name`。该返回行的历史祖先a3b850完整hash见回执，非新增B0候选。

必要适配：仍通过本地精确instance apiUrl立即发起，不复制Claude scope；对fromPath补string类型拒绝，防止非字符串触发500。既有realpath/private mutation/EXDEV no-overwrite/逐项安全校验保留，不因原抽取退回较弱写入策略。DOM/CSS不变；弹窗与portal区域drag守卫下一笔独立。

定向API **30/30**（5新move+既有auth/private/EXDEV/file-api）、Web **358/358**；最终完整 **1651/1651（5+358+1076+212）、0skip**、build/pack705通过。真实HTTP覆盖文件/目录移根、POSIX返回/尾斜杠目录、typed400/missing404、冲突409/自身子目录400且保原字节、symbolic escape/private hardlink、同名A/B/URL优先body hint及stale拒绝。测试文件首次命令cwd不符未生成，纠正后实跑5项，旧输出不计新用例证据。

实际Chromium159/WebKit27.2使用Playwright原生HTML dragTo手势：子目录文件→根空白→另一目录，真实move API两次返回相对路径，A原字节精确/B canary保持，0pageerror。此处不是E10的合成drop；仍不假称外部OS手势/物理设备。见[B5共享移动回执](./B5-shared-move-2026-11-21.json)。本笔新生产安装397/397运行时、705文件/204Web精确字节、B1.2及隔离CLI通过（临时HOME/fake Codex，无真实外部模型网络）。

下一笔原项目浏览弹窗及所需portal/区域drop守卫；外部target/root策略、聊天/PTY拖入、Git子项、全端点与跨平台继续未完成。B5仍是第6/12工作包实施中，pad已知缺陷遵用户选择保留。


## B5.12 E12 原共享 HTML 预览及相对资源身份

E11本地 `d49ff82`。读取865604d6实际共享HtmlPreviewModal抽取diff、ab1b89ee实际path-scoped预览/routes diff、固定完整modal/fileRaw及本地鉴权→SDK view→raw descriptor链。原本地iframe已生成path URL，但后端只支持query路由，资源不能正确工作；query scope也不能随浏览器相对URL继承。迁原共享modal，原header/body/iframe sandbox和布局保持，路径每段编码，HTML的CSP按固定源码设sandbox allow-scripts/connect-src none/form-action none，原CSS/JS/text/font MIME补齐。

必要Codex适配：沿用原view/<project>/<instance>/路径形状，SDK精确instance已足够，允许project空；不复制Claude workspace根解析。路径scope在既有SDK resolver之前解出，未知instance拒绝、非空project不符/与query scope冲突拒绝，不能退回boot；path-style不接受editorSession bypass。原origin/auth/descriptor/private和上传图片根策略保留。

28API/358Web、0skip、build/pack705通过；真实HTML/HEAD、相对JS/CSS、旧query兼容、陈旧/冲突scope、编码错误/NUL/真正编码slash traversal/private别名覆盖。原始遍历探针被URL自动归一化得到404，修成编码slash后实际400，不计旧探针通过。实际Chromium159/WebKit27.2：A启动后History切B，HTML/JS/CSS都带B路径身份，脚本和CSS生效，parent/storage拒绝、fetch被CSP阻止，0pageerror；WebKit首轮在初始mount前切URL的fixture时序已修，无产品补丁。回执[B5 HTML](./B5-html-preview-2026-11-21.json)。未重跑后端全量/安装，最近E11 1651/397仍单列；真实LAN/token-only相对资源鉴权未验，不声明通过。下一笔原项目浏览弹窗，target/zone/Git等仍待。


## B5.13 E13 原项目文件浏览弹窗

E12本地 `6d9ccf1`。核对865604d6/365af800实际新增组件与共享hook diff、5aa5728b本地/远程统一入口、ab1b scope演进、dd23单击树文件及c29已根路径修复，读取固定完整FileBrowserModal/CSS/调用链。原左树+图标网格、240px树宽、原Modal尺寸/蒙层/toolbar/crumb、缩略图与fallback、选中/keyboard、缓存失效/失败重试/空态/重开回根、shared menu+导入+移动和500ms hover hook整体复用。完整CSS逐字相同SHA256 `d42e085de0796ab003cc838405078353dc5bbc3d7715a0f32f0856de44d8973d`。FileExplorer header原文件夹图标按5aa同时在本地/远程打开弹窗；OpenFolderIcon原覆盖回调/键盘与既有log目录默认行为保留。portal guard按原target.closest而非“任何modal存在”，防隐藏portal永久拦截。

必要Codex适配：withViewParams只传原生精确instance，apiUrl既有当前view/base/token继续为唯一默认来源；按既有WorkspaceRoot重挂载边界冻结本实例。复用E6静态确认URL冻结、E10导入起始scope与E11移动/原生凭据策略。固定可选target分支保留在原组件中，但外部入口/API/写范围本笔未接通，不以它计完成。纯previewKind共用分类已迁；B6分派不随之激活，isSystemOpenFile只抽取旧判定并保留既有PDF系统打开兼容，B6统一策略仍待。没有为本地协议重新设计DOM/CSS。

最终完整 **1657/1657（5+361+1079+212）、0skip**、build/pack705通过；新生产安装 **400/400运行时、705文件/204Web精确字节、B1.2与隔离CLI通过**（临时HOME/fake Codex）。新增组件回调覆盖portal不上传背景、原图标pointer/Enter/Space不请求OS、显式native instance优先当前URL且不按同名project寻址。

实际Chromium159/WebKit27.2桌面与WebKit834×1194 iPad仿真：原folder入口/无OS请求、SVG被动缩略图、目录/已根路径树单击文件不重复prefix、弹窗内编辑保存只写A、toolbar文件上传、toolbar拒绝外部drop、原生HTML grid→目录→root crumb移动、500目录失败→retry空态、关闭后新文件重开回根、新建/modal重命名、删除确认在A→B后仍只作用A且B canary保持，通过且0pageerror。6张原截图逐张核看（桌面宽1200，pad受原antd max-width为802，CSS树宽240不含边框）；首轮probe把动画/border算进内容宽度、重复收起已自动展开祖先，修正定位/等待图片解码后通过，未为自动化改产品。详见[B5项目浏览回执](./B5-project-browser-2026-11-21.json)。此pad子项通过不抹去E4已选择保留的替换横滚缺陷。

下一笔全局drop zones、文件/文件夹/Git引用拖入与Git显示/刷新，外部target与完整文件授权策略仍待。B5尚未整体收口。


## B5.14 E14 原桌面分区拖放反馈

E13本地 `d23fac0`。读取365af800实际App/AppBase/ChatView/FileExplorer diff、固定最终handlers/CSS、ea995后续内部引用拒收演进与本地Mobile上传分流。迁入原dragZone状态、Layout属性、chat/terminal两个原mask、文件侧栏原绿色outline、dragend/drop清理与桌面非响应区门禁；Mobile原全屏路径和drop时捕获分流保持。Codex工作区标签内部拖动排除继续复用；drop前捕获zone采用原365顺序，避免依赖React异步setState时序。原mask CSS逐字迁入，不新增布局。

366Web/0skip、Web构建与服务端静态组装通过。实际Chromium159/WebKit27.2：聊天原遮罩、文件栏独立outline、取消清除、header/portal/internal move无上传、聊天实际multipart及字节/精确instance均通过，0pageerror；4截图均实际核看。外部Files为合成事件，未声称OS手势/物理移动端。首两轮GUI因仅构建Web未组装服务静态仍加载旧页面而超时；已补组装，最终probe等原目录加载、modal退场及React mask提交再drop，未为自动化修改产品。测试首轮fixture误用undefined/缺ok已纠正，不算通过。回执[B5区域拖放](./B5-drop-zones-2026-11-21.json)。无后端生产修改，未重复1657完整/400新安装（最近E13），下一笔文件/目录/终端引用及Git；完整B5与target策略仍待。


## B5.15 E15 原文件/文件夹引用拖入聊天和终端

E14 `f498f6b`。已读ea995f38833b20201b47ebd2c13ec5e54e24aa95和beaa2e86f2dfa451a2044348c6c14fa874419e6f实际diff、最终fileDragDrop、聊天附件→原生SDK发送、普通PTY/scratch输入/WS归属和涉及CSS；后续B6图像扩展/B7引用chip、prompt-nav等保持独立。迁原双MIME标记+copyMove、copy不误触move、原composer反馈/文件夹图标与路径压缩、附件去重20项cap、控制字符拒绝、POSIX/cmd/PowerShell/fish转义、paste framing、关闭/alt screen门禁、drop/dragend清理。原协议模块仅适配既有ptyChunkBuilder实际路径，其余逐字一致；原新增反馈CSS逐字相同，哈希见回执。

必要native适配：WS已由唯一精确instance URL和WorkspaceRoot重挂载绑定，不新增Claude project body身份。SDK scratchOnly wrapper在接触主PTY getter前返回，普通drop增加原连接OPEN门禁；scratch独立shell继续保留。原pending Enter改共享quote helper并过滤拒绝项，不发送回车。现有apiUrl图像预览已带精确instance，不复制Claude项目查找。无新增可见布局。

最终 **1675/1675（5+379+1079+212）、0skip**，build/pack705通过。新安装artifact-only 705文件/204Web精确字节通过，运行时未重复E13的400。新增原8项纯协议和5项组件行为回归覆盖无上传/取消、目录语义/去重cap、危险字符、闭连接/alt screen/framing与SDK主通道隔离。首轮输入栏测试fixture缺useLayoutEffect已补齐，不改产品。

实际Chromium159/WebKit27.2原生HTML dragTo：文件/目录→composer、重复去重、危险引用拒绝、未发送前不上传不移动；一次提交实际fake Codex仅收到A的原路径附件一次。文件/目录→实际zsh scratch WS得到两次仅路径输入，无CR/LF、无模型新调用、A/B原字节保持，0pageerror。4截图均实际核看；只确认本笔附件条/拖放，split变窄后截图发送钮右缘裁切现象登记到仍待B7输入栏核验，不冒充整个窄栏视觉通过。普通主PTY本笔为实际组件回调验证，未新增主PTY GUI/物理设备声明。

探针修正：原终端按钮含图标可访问名，改用原展开title；xterm当前使用DOM renderer，等实际running WS state代替假设canvas；回复后的/api/log-v2/objects是已有只读POST，明确列作附带读取，未放宽文件上传/移动断言。所有失败日志保留。回执[B5路径引用](./B5-file-references-2026-11-21.json)。下一笔Git无upstream/行数/拖入/刷新，target/root与全端点授权仍待，B5尚未完成。


## B5.16 E16 无 upstream 的原本地提交回退

E15 `2747f20`。读取d85820431363b750e522be204e122636d6682aea完整实际后端/UI/翻译diff和完整GitChanges/gitApi/getUnpushed→route→diff调用链/CSS；核对2e176行数和a30d后续超时修复，后两笔独立。迁原无upstream/无remote/陈旧upstream/detached的HEAD --not --remotes回退及同range截断计数，原commits.length显示门禁和18语言tooltip。保留现有SAFE_REF拒绝..、quoted Unicode/rename路径解码与logError元数据，不降级既有路径安全；本笔不改rename语义/行数/作者/刷新样式。

实际API/原端点 **32/32、0skip**，379Web及完整构建组装通过；合成真实Git覆盖无remote全历史、remote已达排除、detached、陈旧upstream、unborn/非repo、cap/totalCount/Unicode。首次测试误从根目录传包内tests路径未执行，已按package cwd实跑，不算通过。实际Chromium159/WebKit27.2：真实无remote A/B各2提交、原section/tooltip与展开文件、真实History A→B只显示本实例提交，0pageerror；4截图已核。当前截图仍含旧作者列/文件数量徽标，为后续779/2e176待迁中间状态，不计最终Git视觉收口。见[B5 Git回退回执](./B5-git-fallback-2026-11-21.json)。最近完整/安装分别E15 1675/705精确artifact、E13 400运行时，本笔未重跑；后续行数/原作者/冲突/拖入/刷新和target策略继续。


## B5.17 E17 原逐提交行数与真实文件状态

E16 `7feaab8`。读取2e17699fd752faedd74a354956cd0c175a8181bc实际完整diff、最终getUnpushed/StatBadges/GitChanges/gitApi/CSS、GitDiffView及当前getGitDiffs/route完整相关链，核对后续作者/刷新演进。迁原name-status与numstat按hash合并、--no-renames真实A+D路径、失败仍保列表、共享+n/-n/零行有文件回退数量/空提交无徽标；删原commitFileBadge CSS。保留本地quoted Unicode路径解码/SAFE_REF/logError及工作树capped提示（shared pair可选capped），不删除已有准确性边界。

必要兼容适配：本地此前已支持rename新路径对比旧内容，直接按上游A+D列表会让旧路径在现有-M diff map中被丢弃。保留已有新路径R对比并仅补oldPath→D映射，使两端都可读；列表与行数仍严格原A+D语义。此处是现有diff兼容保留，详情新路径内容比原基线多保留旧版，不冒称逐字相同；没有新增可见界面。

34Git/API、379Web、0skip与完整构建组装通过，含真实Unicode修改+2/-1、rename两端各3行/原字节、binary/mode-only0行/empty0文件、原路径安全/恢复回归。实际Chromium159/WebKit27.2真实A/B各5提交：行数、binary文件数/empty无徽标、A+D展开及实际旧/新diff、view切换归属通过，0pageerror，4截图已核。旧作者列仍挤压subject/右侧徽标，为下一笔779删除作者的原后续修复；本笔中间截图不认定最终Git布局对齐。回执[B5 Git行数](./B5-git-stats-2026-11-21.json)。未重复全量/新安装，最近E15 1675/705 artifact与E13 400运行时仍分列；B5作者/冲突/引用/刷新、target全策略继续未完成。


## B5.18 E18 原 Git 提交行移除作者

E17 `ea25ffd`。7797672148114a3e097b10d0d568562cc0118f5f实际完整diff/固定最终CommitRow/CSS及调用链已读。产品仅删除原一行作者span，保留后端author字段/hash/subject/time/行数与文件数回退，不新增CSS。完整构建组装通过；不为此一行低影响删展示另写镜像测试，也不假称重跑379Web/34API。

实际Chromium159/WebKit27.2再次核验A/B各5提交、作者消失/原行数和binary/empty徽标/展开两端diff及view隔离，0pageerror；4截图已核，subject和两侧计数不再被作者挤出。见[B5 Git提交行回执](./B5-git-author-2026-11-21.json)。全量/安装仍E15/E13，冲突红色/引用/刷新及target与整体B5未完成。


## B5.19 E19 原未合并状态红色

E18 `30b046e`。ccf74880a592b0d61b01b7faa5058dc6839dcb0d完整实际diff及固定最终STATUS_COLORS、server porcelain→gitApi→tree→badge链已核。仅迁原UU/AA/DD/AU/UA/DU/UD七项#f14c4c，与D同红；不擅改Mobile（原提交未改）。无DOM/CSS新布局。

build/组装通过；实际git update-index --index-info构造七种真实未合并索引，先用git status实证全部代码，再由真实精确instance HTTP读出，在Chromium159/WebKit27.2逐行验证原badge文本和rgb(241,76,76)，0pageerror，2截图已实际核看。不是mock状态或普通M/U改色，不声称执行真实开发仓库冲突；未为常量映射写镜像测试/重复全量。见[B5冲突徽标回执](./B5-git-conflicts-2026-11-21.json)。下一笔Git引用/刷新及既有tool刷新核验，之后target/root和全端点策略；B5仍未完成。


## B5.20 E20 原 Git 文件/目录/提交引用

E19 `78cfb74`。a2f5cd4b43fa8f8003e60774b5c71160e6de509e完整diff、最终GitChanges/ChatView/shared协议、完整相关CSS与后续5fc刷新已读；24c4f60b5480aefa9b26d635d68700f5de5f4ffe相对a2f在Git三文件及ChatView无额外diff，B4审批混合不重复迁。原TreeDir+payload/rename guard整个块、CommitRow和gitWorkspacePath逐字复用；原drag CSS逐字相同，哈希见回执。原菜单顺序新增两种无拖动入口；native沿用既有附件/路径回调与精确WS消费者，无新身份来源/布局。

384Web/0skip、build/组装通过；实际组件行为覆盖嵌套repo路径、原菜单替代、RM/C禁止拖动、伪目录dragstart拒绝、full hash不误用subject或展开。首次测试用React.Children克隆后的对象身份排除目录失败，改按实际role区分并选正确菜单，未改产品。

实际Chromium159/WebKit27.2真实根/嵌套Git：原生HTML文件/目录/提交→composer，sub前缀正确/full hash、实际rename row不可拖/伪目录取消、菜单附件去重/路径载入、三种引用→真实zsh scratch只输入路径不Enter，原A/B文件精确保持，无新增模型/上传/移动，0pageerror；4截图已核。E15已登记窄split发送钮裁切继续B7待核，不计整体窄栏通过。见[B5 Git引用回执](./B5-git-references-2026-11-21.json)。最近全量E15 1675/安装运行时E13 400未重复。下一笔原刷新按钮/既有tool刷新及scope收口，target/root全策略仍待，B5未完成。


## B5.21 E21 原手动刷新按钮与请求完成反馈

E20 `1161998`。5fc4c752297c7df9f581c913aa2a1852a0b27a38实际完整diff、最终两组件与完整相关CSS/ChatView refreshTrigger链已读；核对eb2e9703a2837550a9bf2a62a8bb5d20fac7f723原readJsonOrThrow/错误原因及清除前置。迁原Button text/small+ReloadOutlined、手动ref/Promise finally/仅手动旋转/disabled，原两块CSS逐字相同SHA256 `43f017de7ade3164e23ed8563e3338a7d455817d17dda3172a6220d74b20d396`。原文件树错误原因/18语言及重试setError(null)一起补齐；native精确apiUrl与WorkspaceRoot边界保持，既有focus/visibility自动刷新回调另命名autoRefreshCallbackRef，避免和原boolean ref撞名，不让自动刷新点亮手动loading。

384Web/0skip、完整build组装通过。提取按钮JSX首次误在内层ReloadOutlined自闭合处截断，构建失败已保留并改完整原块后通过，未算首次为通过。实际Chromium159/WebKit27.2：挂起真实root刷新直到回应/新A文件仅A、500原error原因与下一次重试清理、自动focus刷新不旋转；Git挂起status和log两请求，单独放行status后仍转、两者都完成后停，0pageerror。4原截图已核，见[B5刷新回执](./B5-refresh-2026-11-21.json)。

**原CSS声明16×16，实际基线24×16：**首GUI把声明当实际尺寸而失败。已用固定源码的原Button JSX、原CSS与原LIGHT_THEME_CONFIG独立构建渲染，使用两边相同Antd5.29.3（上游lock亦相同）；两引擎原片段/本地都24×16，icon-only宽度selector优先级高于单类refreshBtn，高度16生效。保留原源码，不补更强selector，不把注释当渲染事实。后端/全量/新安装本笔未重复，最近E15 1675和E13 400保持独立。接下来Git异步/确认scope及既有tool增量有效历史核验，再做target/root全授权；B5未完成。


## B5.22 E22 Git异步请求和撤销确认固定原工作区

E21 `0a5c45d`。已核ab1b89ee133664c9f2c0e3e17ada8711180f4dc5、eb2e9703a2837550a9bf2a62a8bb5d20fac7f723实际scope diff、完整GitChanges/gitApi和桌面/Mobile检测链及WorkspaceRoot精确重挂载。复用native apiUrl，在首await/确认前冻结完整base/token/instance URL；repo参数仍原编码。静态确认框在旧子树卸载后可完成原A撤销，但不刷新B。无新身份源、DOM或CSS。

389Web/0skip、build/组装通过；覆盖有/无instance、反代前缀、延迟失败回退、旧确认403重试。实际Chromium159/WebKit27.2挂起真实A两repo列表JSON，切B后再释放，后续4请求均A且不污染B；再开A嵌套文件撤销确认后切B，实际POST/字节仅A恢复，B保持，无旧子树刷新。最初探针拦到ChatView检测而非panel请求，随后在modal下点导航被正确遮挡，均修正探针后最终通过，未改UI。

完整release尝试失败：app1083/1084，sdk-cli-resume fixture只等opened存在而未等URL写完，读到空串导致Invalid URL；5core/389Web通过，未跑到后续integration/build/pack，不能计完整通过。下一笔单独修测试就绪竞态再全量/新安装；本笔独立389Web与双引擎行为证据已通过。见[B5 Git归属回执](./B5-git-scope-2026-11-21.json)。target/root完整策略、全候选审计及B5整体仍待。


## B5.23 E23 CLI验收就绪竞态与发布重验

E22 `8a35d54`。已读完整SDK CLI resume fixture/fake open和实际等待调用链；只把既有state.wait判定从opened存在收紧为URL非空，避免shell先创建文件后printf写入间隙被误认ready。无生产CLI变更/无新增镜像测试。新安装探针增加已有Git stats/fallback/endpoints三文件，共437项。

最终1690/1690（5+389+1084+212）、0skip、build/pack705通过。真实tarball新安装705文件/204Web精确字节，437/437安装运行时、B1.2回归和隔离CLI相对-C启动通过；fake Codex，无真实模型调用。回执[B5发布重验](./B5-runtime-recheck-2026-11-21.json)。E22失败日志保留不覆盖；本笔为独立测试修复与验收，不等于整体B5完成。下一笔原Git超时，再核tool有效演进和target完整授权。


## B5.24 E24 原Git命令10秒预算

E23 `7865e00`。读取a30d8c92a7a56803d501ea50775f9993c96a19d5实际git-diff diff、完整当前getUnpushed/getGitDiffs/原生blob预检与rename链；恢复原GIT_TIMEOUT_MS=10000替代3/5秒，原log8秒保留。原生已存在cat-file与rename补充调用使用同预算，不删大小/路径/字节保护。

37真实Git/API、0skip通过；临时PATH wrapper仍执行真实Git，仅rev-parse延迟3200ms和show延迟5200ms，实际提交列表/旧新字节均正确，实证旧3/5秒窗口之外可完成。首修改命令误用包cwd下repo相对路径未写入，旧检查不计本笔，正确root修改后37再次实跑通过。不为常量迁移写镜像测试/改UI或重复全量，最近E23 1690/437保持独立。见[B5超时回执](./B5-git-timeout-2026-11-21.json)；a30d混合SSE不在此整条重计，target/总审计仍待。


## B5.25 E25 既有工具刷新与有效历史核验

E24 `6ba4304`。按梯级复用已有B3 `7c3d849b9e7acda1c974077843406c23627dbdcb`，不重写生产代码。已读0c7195b68967f3c92a84b5ea5e0c271672c798e0实际git commit正则、08809f6e69315476690c62bbe238bd5c199b338d增量diff、082673509ec6407bb835fa8992440eb13a6cf1c2反向diff、其后0cbb5452887476d3838c772e9fcd04cf3d01ce63再次引入及c29af25e64d3491fe7c58dc80bf859eda7831ba4缓存裁剪。固定最终并非全量扫描：持久toolUseMap+两阶段WeakMap增量+尾条重扫+session真变化重置+FIFO payload同步裁剪已在本地。

Codex必要差异已有证据：原生shell_command/apply_patch/exec嵌入patch、body.input，游标保存数组引用+length以覆盖同对象等长/缩短数组替换。完整controller、commandValidator、ChatView挂载/check/reset/dispose链已核；9既有行为检查/0skip通过，含commit成功一次/失败与status不刷、1000旧前缀不重扫、尾部补result、跨源两pass、等长替换、20001→15000释放payload。无DOM/CSS变更/无新GUI声明，最近完整/安装E23 1690/437独立。回执[B5工具刷新审计](./B5-tool-refresh-audit-2026-11-21.json)。c29文件树根路径另E13已核；混合会话/审批/service及发布不整条重计。下一笔target外部目录与原allowlist全策略，B5仍待。


## B5.26 E26 外部目标文件策略前置（尚未接线）

E25 `762df84`。566ade13/7a75e1be/208f1348实际后端diff、完整最终target-scope/read/write路由与file-access-policy及本地file-api/registry/native AGENTS和skills消费者已读。新增原策略前置模块，敏感prefix/filename表逐字一致，沿用原read→shared verdict、write最近存在祖先32层/悬空link拒绝/重建候选/敏感目录根拒绝算法；尚未启用任何target端点或改变既有file API。

必要native适配：复用原生credential guard，不读auth/config/历史内容；Codex自定义/默认/启动owner和.agents技能根、精确server cwd与注册工作区；原生sessions/archived_sessions/shell_snapshots/history/session_index/SQLite及raw_memories和Viewer浅层V2归档不得借通用文件接口绕过专用scope/内存API。Viewer原始日志目录全读写拒绝，已存在的scoped图片响应仍保留独立descriptor链，待接线逐端点核验。原生没有上游cache失效hook，按请求新建roots快照、目录列表复用，防LOG_DIR或外进程registry变更后沿用旧roots。原目录结构依据本地V2 writer/memory接口与OpenAI rollout/session_index/shell_snapshot/state源码，链接见回执。

9策略+既有凭据回归/0skip通过：HOME无总授权，project fixture豁免、AGENTS/技能可读，原生/Viewer数据与别名不读不写，hardlink、symlink、悬空新leaf、外进程registry/log-dir变化。首检查发现尚不存在auth.json.new不在readdir列表而漏拒，已补新候选名规则并扩SQLite/history变体后通过。回执[B5目标策略前置](./B5-target-policy-2026-11-21.json)。本笔没有界面变化、不声称已接线/GUI/完整target通过；最新全量/安装E23 1690/437独立。接线前需核对remote-admin语义差异，再迁原target read/write与AGENTS/skills入口；整体B5未完成。


## B5.27 E27 原批量文件存在性探测

E26 `67aa5da`。6880f773实际filesExists/probeFileExists diff、最终eb2视图scope修复与完整markdown renderer→ChatView observer→/api/files-exists链已读。本笔仅后端原boolean oracle：50项/每path1024字符/body256KiB，missing/denied/目录统一false，无原因或文件字节。原生复用已有strict UTF8 body reader与requestProjectDir精确query身份快照（body不能改实例）、现有project-contained file resolver和E26单批roots快照，不提前扩绝对路径跨工作区权限，也不启用外部target或改editorSession。

42HTTP/文件回归、0skip通过，含同名A/B、body反抢身份、原生历史hardlink/symlink、traversal/目录/不存在一致false、50/51/类型/长度/JSON/NUL/body413与hostile Origin403，原auth/content/download/HTML隔离回归通过。见[B5存在性回执](./B5-files-exists-2026-11-21.json)。本笔无UI不计GUI，下一笔原Markdown链接/候选渲染/实际DOM验证；权限选择待答时不推进依赖的target接线，其他独立项继续。最新全量1690/安装437早于E26/27，未假称重验；整体B5仍待。


## B5.28 E28 原Markdown文件链接与代码路径

E27 `6a75814`。6880f773实际renderer/ChatView/CSS及eb2后续view scope diff、完整五模块/marked→DOMPurify→observer→batch→原viewer链已读。原href/codepath分类器、codespan renderer逐字迁入；原27行反馈CSS逐字一致。原链接/图片/代码优先级、50项分批/200项排空、负缓存30秒/并发去重、键盘和dispose保持。native复用sdkWorkspaceScope完整tuple缓存/迟到守卫，首await前冻结整URL而不引入Claude body身份；file://无href补role/link/tabindex及键盘委托，保持可达性而不改布局。原memory专用禁网络/媒体renderer仍保留限制。

429Web、完整1737/1737（5+429+1091+212）、0skip/build/pack707通过。新安装707文件、204Web精确字节、444/444运行时、B1.2/隔离CLI通过，fake Codex且无模型网络。实际Chromium159/WebKit27.2：清洗后的本地/file URI链接、Enter/Space打开、205不存在项分批排空不自旋、非路径仍普通code、同名B不复用A only-a存在性/真实文件读均精确归属；4截图已实际核看，0主页面pageerror。见[B5 Markdown回执](./B5-markdown-files-2026-11-21.json)。

**行号冷开原缺陷单列，未记滚动通过：**400行文件从code :123首次打开，画面停第一行。已完整编译固定上游FileContentView+global CSS/真实core模块，在两引擎独立挂载，并以官方临时npm tarball加载上游lock的wrapper4.25.9/basic4.25.9/view6.41.0/state6.6.0/language6.12.3/lint6.9.5；与本地wrapper4.25.11/view6.43.6都scrollTop0、首行MARKDOWN_A_LINE_1。保留原实现，不把只滚动误当移动光标或宣称行号已实际滚动。临时依赖未改repo lock/deps。

探针失败保留：最初错误假定caret移到行3、未等关闭动画/viewport；原隔离编译需实际monorepo exports和UTF8响应；WebKit初始boot前reload会取消请求，改等待已验证代码和API清空；发现依赖漂移后追加原版本实证。均不为自动化改变产品。remote target权限仍交互待答，target接线等待；Git持久开关及全候选总审计继续，B5未完成。


## B5.29 E29 原Git面板开关持久化

E28 `258566c`。649f853e实际ChatView diff、固定最终constructor/_setGitChangesOpen/nav/panel关闭/被动文件跳转和后续a6b搜索嵌入调用链已读；不复制上游AST镜像测试。原IIFE恢复（默认关、phone恒关、pad可恢复、文件树优先避免双开）及setter/主动关写盘/被动关不改意图/待刷新消费迁入；仅ccv_存储key适配既有native cxv_，无CSS/DOM变更，嵌入搜索保持原当前链。

431Web/0skip与干净build/组装通过。实际Chromium159/WebKit27.2均验证桌面打开→刷新恢复、X主动关闭→刷新仍关、Markdown打开文件被动关仍保true、两个storage都true时树优先、文件树主动互斥关写false、同名B仅本实例提交；额外独立pad/phone上下文验证原恢复门禁，0pageerror。无布局变化不另造截图；见[B5 Git持久回执](./B5-git-persistence-2026-11-21.json)。

首替换脚本用非行锚点计数而断言中止，未写产品，新测试对旧实现两项失败；早发build被“源码比构建新”保护拒绝，已等待旧构建结束后干净重建，最终检查单列，不把早轮算通过。最新全量/安装仍E28 1737/444，本笔未重复。649其他混合B2/生命周期等独立，不计整条完成。下一笔Git清理重试和剩余候选分类；remote target权限待答/接线未启用，整体B5仍待。


## B5.30 E30 原Git fixture清理重试

E29 `38e68a1`。7a0ba39edf6a0b54ca7a425e0f08ab410e515407完整Git测试差异和定时任务poll差异已核。本笔只在native三套真实Git fixture复用node rmSync原maxRetries5/retryDelay100；已有stopViewer await保留，原来已3/50的HTTP fixture统一原预算。37既有真实Git/API检查/0skip通过，不新增镜像测试或产品代码/不做无关build/GUI；定时任务尚未实施，poll/清理归B9独立未完成。见[B5 Git清理回执](./B5-git-cleanup-2026-11-21.json)。最新完整/安装仍E28 1737/444，E29 431Web/build/双引擎恢复门禁独立，target权限待答及总审计继续，B5未完成。


## B5.31 E31 候选分流和本轮发布重验

E30 `ceda946`。47条候选已保留真实first-parent diff hash/父提交/路径足迹，并对仍空白的交叉候选按实际diff归属，不靠标题；足迹是追溯材料，非全部混合子项实施证明。7f7直接启动复用B2；上传菜单/hover/ghost为B7，归档/音频/字幕和新图像MIME为B6，研究/发布/CI/footer展示为B11独立待办。3bd不能只按CI标题处理；6880的strict技能导入/ZIP双层大小校验和IM/Electron与Markdown不混算。两merge按真实父及相关B5实际差异核对：2cd多出的memory估算非scope，672 Mobile4行为审批倒计时。完整表见[B5交叉审计](./B5-cross-package-audit.md)。

最终1739/1739（5+431+1091+212）、0skip/build/pack707通过；新安装707文件/204Web精确字节、444/444运行时/B1.2/隔离CLI通过。此快照含E29/30，早于下一笔未接线target-scope前置；见[B5候选审计回执](./B5-candidate-audit-2026-11-21.json)。B5 target身份/原目录/菜单编辑与content/raw/download及外部editor授权总接线仍待，remote admin交互未答前不启用依赖入口。保留冷开行号原缺陷/用户已选pad横滚与其他未验边界。并未把B5或其他工作包标完成。


## B5.32 E32 未接线的目标身份与导航根前置

E31 `47ebed4`。复用已完整读取的7a75 target-scope原实现：kind+id/source+targetPath重建root、project/home/config/target导航、relative path32层/2048字符门禁、write同navigation root而非擅收target子树。native必要差异仅AGENTS.md/codex-md与现有base64url不透明id、server-owned既有discovery条目参数（非client body/root）、真实listSkills({cwd})及其默认.codex/plugins/cache所有者、给policy传冻结cwd；不从lib反向import server，不建第二身份源。

15目标/策略/既有凭据检查0skip（6目标case）通过：真实project/.codex/.agents/plugin技能发现、自定义CODEX_HOME下plugin实际owner、plugin manifest越界拒绝、registered祖先target-only fallback、伪id/伪root不扩权、home/config导航不等于HOME授权、写scope保留整导航根、traversal/drive/NUL/depth限制。原生已有祖先AGENTS detail可能在allowlist外，folder仍403；身份不构成目录白名单豁免，未擅扩根。见[B5目标scope回执](./B5-target-scope-2026-11-21.json)。

此笔与remote管理员选择无关，只建未接线前置；既有端点/入口不变、无GUI/新全量声明。最近E31 1739/707/444早于新增模块；下一笔先把既有native凭据祖先mutation guard组合进新write策略，再待权限回答接原target读写/UI。B5未完成。


## B5.33 E33 原生受保护owner/祖先写边界与本轮重验

E32 `19d0f34`。7a75原写保护/目录递归边界与native已有credential-file-policy.assertMutationPath完整链复核后，复用现有 `41d95af54189cfaa9d0816244ec1ae7366d43939` 的祖先保护，不重写验证器：新write verdict同时组合assertPublicMutationPath和native-state ancestor guard，避免rename/delete owner或祖先后丢失路径保护。LOG_DIR除当前owner亦保留启动owner，目录切换不能让原浅层V2归档从通用文件工具露出。安全新child仍允许，原整navigation root语义不变；不读真实凭据/历史内容。

16目标/策略/凭据检查0skip；最终1746/1746（5+431+1098+212）、0skip/build/pack708通过。真实tarball新安装708文件、204Web精确字节、451/451运行时、B1.2回归和隔离CLI启动通过，fake Codex、无真实模型网络。见[B5 owner保护回执](./B5-target-owner-guard-2026-11-21.json)。本笔无Web生产变更，未重复既有E28/E29双引擎GUI或新造截图，不把纯检查当视觉对齐。

**B5仍未完成。** 不依赖管理员选择的策略/身份/导航根前置已准备并验证；交互问题仍待回答，target端点/原AGENTS和技能入口尚未启用。下一步按选定边界接原read/write、共用content/raw/download与外部editor授权总审计，再做自然HTTP/双引擎GUI和整包汇总。[具体权限差异与两方案](./B5-target-permission-boundary.md)已写清；不把普通鉴权放行、空密码或静态资源访问当管理员，也不自行改变native认证设置的本机管理边界。原pad横滚用户已选保留、:123冷开原缺陷未记滚动通过、B7窄split与原未验边界继续单列。

## B5.34 E34 接线前权限与文件调用链审计

E33本地 `ef3cb51`。继续核对566ade13/7a75e1be/208f1348在固定快照中的完整 target 路由、共用内容/raw/download、管理员/同源辅助函数及 native 对应链路。识别并记录 action=allow 非管理员证明、无Origin的cross-site分支、客户端editorSession外部路径放宽、E5项目限定下载与原allowlist差异，以及休眠target UI的原Claude身份/未接线菜单和预览器。见[权限边界接线表](./B5-target-permission-boundary.md#e34-接线前调用链核对2026-11-21)。

本笔只更新审计与当前标记；无生产代码、无新测试/构建/GUI声明，最新通过证据仍E33 1746/451。用户本轮“继续”未指定两个权限方案之一，交互问题保持待答；不自行扩大远程权限，亦不擅自选仅本机作为基线差异。B5未完成，选择后继续实际端点、原入口和实例化验收。

## B5.35 E35 原目标目录读取与已选远程管理员边界

E34 `c27fd53`。用户通过 request_user_input 选择按上游启用远程管理员；后续需要用户选择时使用提问工具直接列项。读取566ade13/7a75固定完整targetFiles/listTargetDirectory、is-admin/same-origin及native认证/会话/作用域链，迁原目录返回、祖先memo、5000条cap、逐项过滤和home导航。必要适配仅codex-md既有服务端身份、冻结request cwd与native策略；管理员证明复用timing-safe token及有效期/generation/context已校验session，排除空密码/static放行及无Origin cross-site。native认证设置和内部bridge未扩权。

21目标/策略/凭据定向和38认证/HTTP/WS检查各0skip通过（有重叠，不相加为全量）；日志/tmp/cxv-b5-e35-target-final2.log及/tmp/cxv-b5-e35-auth.log。真实HTTP以非loopback Host测试remote判据，未声称真实LAN或TLS密码登录。首次复制误带重复options参数/原error-report路径、fixture id未realpath导致404，均在最终检查前修正，失败日志保留。无Web变更/新GUI/build/整包声明。共用content/raw/download、写端点、原入口继续实施，B5未完成。

## B5.36 E36 共用内容/raw/download与target保存

E35 `d6681ef`。按7a75e1be/208f1348固定最终content GET/raw/download/POST完整链迁入target身份、整navigation root写域、missing-leaf多层新文件保存；采用用户已选目标管理员和同源门禁。复用E26策略及native descriptor检查，保留原生凭据/历史/alias、二进制/UTF16拒写、读取大小上限及E5流下载/断开语义；POST改用既有严格UTF8 byte-limit reader，cwd/discovery在await前固定，body实例不重定向。

33文件API/真实HTTP定向0skip（/tmp/cxv-b5-e36-files-final.log）：target远程鉴权/GET/HEAD/精确字节、editorSession伪造拒绝和allowlist、target+editor不能逃root、native保护既有/缺失名及inode替换无截断、UTF16/binary字节保留、A延迟正文同时B读取与正文冒充B仍只写A通过。保留native默认项目请求严格instance-contained（原上游普通绝对路径只看全局allowlist）的已有跨工作区隔离；external访问仅显式target或已验admin的editorSession，下载不能借editorSession单独扩根。既有上传/持久图片仍走独立scope+descriptor，不给一般target历史目录豁免。尚无新增UI/GUI/全量声明；目标文件系统菜单端点与原入口后续，B5未完成。

首次文档记录命令因stdin非UTF8报错，生产代码及33检查已完成；补齐记录后合入同一提交，不将失败命令算作验证。

## B5.37 E37 原target菜单文件系统端点

E36 `481dc72`。读取7a75e1be真实新增diff、固定完整target-files-fs/target-scope/os-open及native对应系统调用；迁入原7个菜单POST、完整navigation root相对路径、双方rename策略/子树检查、symlink拒绝、case-only临时hop回滚和protected目录删除守卫。复用native冻结cwd/discovery、已选管理员及严格正文读取；所有策略传入请求cwd，系统打开函数按原模块共享给项目与target。必要保护适配：create使用native既有wx避免并发覆写；子树扫描无法读取时fail closed，不按原catch静默通过；name类型验证不交给500。

29目标/策略/凭据/移动检查0skip（/tmp/cxv-b5-e37-fs-final.log）：完整创建/rename/delete字节、整navigation root操作、protected子树/owner/alias和symlink拒绝、递归检查EACCES保留目录、无效name/正文/10MiB限制、鉴权先于malformed body、remote有效token写入；OS操作仅拦截child_process argv验证，未启动真实应用，不声称其他平台实际通过。首轮误按1MiB写测试，现有MAX_POST_BODY实际10MiB，已修正重验。无UI/新GUI/整包声明；下一笔按原位置接AGENTS/技能入口与菜单预览链，B5未完成。

## B5.38 E38 原AGENTS/技能目录入口、菜单和预览链

E37 `6eea43c`。按566ade13/7a75e1be实际diff及固定完整Header/Mobile/MemoryDetailModal/SkillsManagerModal/FileBrowser/FileContent/menu/apiUrl/CSS接回原入口，codex-md既有不透明id为必要身份适配；保留native memory链接限制、插件描述键盘按钮和exact-instance remount。原FileBrowserModal整CSS字节相同，标题8px gap及skill folder CSS原块复用；不改布局。项目/target菜单复用原执行器并保留native确认前冻结URL；target缩略图、ImageViewer、binary下载及HTML均携带身份。

真实GUI发现HTML主文档可开但opaque sandbox的相对CSS/JS被目标跨站门禁403；HTTP曾通过未计GUI通过。native坚持默认项目隔离，不能照搬上游无target身份的全局allowlist raw URL。采用目标/视图路径及仅raw GET/HEAD可用的HMAC只读凭据，绑定认证context；登录session授予的凭据还校验原session有效/未撤销，不含登录cookie，不扩大auth配置或bridge，也不放开普通跨站读取。保留原CSP。首轮targetInfo漏带凭据亦已纠正；后续双引擎实际CSS/JS200、蓝背景和脚本标记均通过。

Web434/434、认证/文件/HTML 51/51、0skip及build通过。cap补充前1764完整0skip是单列历史检查，未冒称最新全量；最近安装仍E33，尚待本轮新安装。实际Chromium159/WebKit27.2各desktop/phone/pad/模拟remote偏好8场：AGENTS标题Enter入口、原目录与敏感过滤、文本编辑保存/重命名字节、SVG、HTML相对资源、project skill Space入口、跨同名B后原静态确认只删除A且B字节保留，均通过且页面错误为空；模拟remote另实收下载文件精确字节，不等同真实LAN。26原图已以4张临时QA拼图全部核看并保留原图hash。初轮探针popover双触发、动画/边框尺寸、同名关闭按钮/图标参与按钮名称、WebKit切换时序均有失败日志；最终等待原动效及B就绪/drain，无为探针修改产品样式。

详见[B5目标浏览器回执](./B5-target-browser-2026-11-21.json)。B5未完成：继续其余文件端点授权总审计、user/plugin补验及全量/打包新安装；B6格式、B7技能导航/原生不支持项和已登记原基线缺陷保持独立。

## B5.39 E39 旧项目文件工具的原生状态旁路收口

E38 `c7ef277`。按566ade13原私有历史策略、7a75e1be写边界及E26/E33已迁native owner，追完项目列表/搜索Worker/RG/replace/导入/移动/创建/删除/OS打开和AGENTS/技能元数据调用链。合成红测实际发现普通项目入口仍列出/搜索native sessions、SQLite、Viewer owner和hardlink，create也可落入sessions；因此组合现成策略到旧入口，未另建权限体系。搜索传父进程nativeRoots快照，保留原credential descriptor检查；native普通单链接文件验证当前路径与fd inode，不逐文件递归全历史，hardlink继续使用已有inode拒绝。补历史备份名称枚举及元数据读callback，专属image/voice/IM根保留原服务语义；IM server-owned roots只沿用既有credential读取守卫，不给通用文件接口豁免，B11既有边界不据此称完成。

57目标/原生保护/Worker/元数据/voice定向0skip，另99搜索/替换/Worker与49旧HTTP/WS回归分别通过（重叠不累加）；最终1772/1772（5+434+1121+212）、0skip、build/pack712通过。真实tarball新安装478/478，712包文件、必需源码及204Web字节一致，B1.2与隔离CLI通过。首次全量13失败包含旧夹具把公开项目置于私有LOG_DIR owner内及IM测试误写URL；移动夹具日志到独立子目录、隔离HOME/CODEX_HOME并保留原断言后通过。两次修正命令工作目录错误未写入，随后以绝对路径修正并实跑，失败记录不计通过。

新7个HTTP/实际FS病例覆盖native历史/备份/SQLite/Viewer owner和aliases过滤、两搜索引擎、显式replace不改字节、native父目录创建/rename/move/delete拒绝、multipart缺失保护名拒绝、OS argv拦截、单链接private fd替换拒绝、专属IM元数据及toggle可用而通用file-content拒绝。source-owner布局修正不是放宽生产策略。无Web生产变更，E38原CSS/26图为独立视觉证据，无新GUI冒称。见[B5旧入口保护回执](./B5-native-file-tools-2026-11-21.json)。

B5尚未完成：已读ab1b固定最终代码，普通项目case-only rename、delete guard及symlink目录类型仍有未迁差异，下一笔逐项处理；user/plugin folder补验亦继续。其余工作包与原基线缺陷、真实外部/物理/其他平台边界不变。

## B5.40 E40 Project case-only rename

Previous E39 `f66e728`. Read actual ab1b89ee133664c9f2c0e3e17ada8711180f4dc5 diff, complete frozen files-fs rename and later7a75 (unchanged branch), native menu/Explorer callers and existing renameSyncWithRetry. Ported canonical-equality case-only temporary hop, rollback and normal rename retry. Only temp prefix adapted to .cxv; native frozen instance and credential/history/ancestor guards retained; no UI/CSS change.

Real host HTTP/FS red returned409 and failed transient EBUSY. Final19/19,0skip (file-move/native-state/file-api; /tmp/cxv-b5-e40-rename-final.log) covers file/directory casing, exact A/B bytes, lock retry, second-hop rollback restoring original name/bytes without leftovers, conflict/stale-instance/private-alias refusal. Actual Windows/NTFS and other filesystems remain unverified. Latest full/install remain E39 1772/478. Initial docs heredoc failed encoding before writing, so this entry was amended into the same commit. Next: ordinary delete guard, symlink listing types and user/plugin GUI; B5 incomplete.

## B5.41 E41 Original project deletion guards

Previous E40 c912829. Read actual a1c7ff20f532101dcb7029fc07314740632312ed protected-directory normalization diff, 15b1f44d7026e7978276fc6f7b49e88c9aec8be4 lstat/re-realpath diff, frozen full files-fs deletion and later ab1b/7a75, plus native menu and mutation policy. Ported original lstat symlink refusal, case/separator protected segment check, platform sep and final directory realpath containment. Existing native owner/ancestor checks retained. Prior native test expected public symlink deletion200; updated to baseline400 and asserted link and target survive. Rename/move in-root link behavior stays separately tested.

Real HTTP red observed symlink deletion200. Final55/55,0skip (file-move/native-state/auth-server/target-files; /tmp/cxv-b5-e41-delete-final.log), including injected actual FS directory-to-outside-link swap after final lstat with both held/outside canary bytes preserved, protected casing and literal backslash segments, normal file/dir exact-instance delete, and target/native/auth regressions. No total TOCTOU-elimination claim, no Windows execution claim. No UI/CSS/full/install rerun; latest full/install remain E39 1772/478. Source audit also found the old EXDEV lstat refusal missing; next independent steps cover that and symlink listing, then user/plugin GUI.

## B5.42 E42 Original EXDEV symbolic-target guard

Previous E41 445a90c. Read actual 15b1f44d7026e7978276fc6f7b49e88c9aec8be4 diff, complete frozen files-fs move and native cpSync filters/credential policy and callers. Restored original lstat refusal of symbolic mutation targets on EXDEV, and explicit dereference:false for recursive copy. Existing native COPYFILE_EXCL/force:false/errorOnExist and per-entry frozen-scope/private checks retained. No normal same-filesystem link migration change.

Actual HTTP/FS red copied a public symlink instead of refusing400. Final40/40,0skip (/tmp/cxv-b5-e42-exdev-final.log; file-move/native-state/auth-server) verifies forced EXDEV refusal with link/target preserved, ordinary file/dir copy+source removal, nested symlink identity, and private descendants refusal. EXDEV is fault injection on this host, not a real second-volume/Windows pass. No UI/CSS/full/install change; latest full/install remain E39 1772/478. Next: original symlink directory classification, platform-separator boundary audit and user/plugin GUI.

## B5.43 E43 Original directory-symlink listing types

Previous E42 8fb8a7c. Read actual2055145feacec37e020adde6f90f769ff6183939 diff, frozen full files-fs listing, native Explorer/Modal directory expansion and unchanged CSS. Ported original Dirent.isSymbolicLink + stat target type/fallback. Existing native exact project containment and credential/history per-entry filters retained. Native dangling links remain filtered by existing policy (minimum protection adaptation), rather than exposing an unusable entry; one broken link cannot fail the whole response.

Actual HTTP red classified in-root directory alias as file. Final41/41,0skip (/tmp/cxv-b5-e43-alias-final.log, file-move/native-state/auth-server); real FS directory alias expands via /api/files, file alias stays file, private/dangling aliases absent, outside directory navigation400. No UI/CSS/full/install rerun; E39 full1772/install478 remains historical latest. Next platform-separator containment audit and user/plugin GUI.

## B5.44 E44 Platform separator containment

Previous E43 2d2af5a. Read actual a1c7ff20f532101dcb7029fc07314740632312ed file-operation containment diff and frozen full files-fs routes. Replaced remaining7 hardcoded slash boundaries in import, move self/descendant, reveal/open, create file/dir and OS terminal with imported native path.sep, exactly as upstream. Delete was already migrated E41; other modules retain their existing dedicated scope guards.

57/57,0skip existing actual HTTP/FS auth/target/import/move/native regressions (/tmp/cxv-b5-e44-separator-final.log). No implementation-mirroring tests added; no Windows runtime claim. No UI/CSS/new full/install run; latest full/install remain E39 1772/478. Ordinary files-fs known deltas now covered; user/plugin GUI and final B5 scope matrix next.

## B5.45 E45 Native skill navigation ancestors and user/plugin GUI

Previous E44 aeddcbe. Re-read566ade13/7a75e1be actual target listing/scope diff and full chain, native .agents roots/discovery, original SkillsManager/Browser/CSS. Actual Chromium GUI and HTTP red showed .agents root row missing and parent navigation refused although its discovered skill opens. Added a listing-only exception for directories on the exact server-resolved target ancestry, only when outside-allowlist is the refusal and existing credential/native owner policies permit metadata. No general parent allowlist, content/raw/download/mutation policy or UI/CSS change; sibling entries still filtered, parent writes403. Target identity remains service-owned.

35/35,0skip target/scope/policy/native checks; actual Chromium159.0.8154.6 and WebKit27.2 keyboard user/plugin folders, .agents tree/crumb navigation, private sibling filtering and exact file bytes all pass, empty page errors. Six original PNGs inspected together plus a full user screenshot, hashes in B5-target-sources receipt. Logs /tmp/cxv-b5-e45-ancestors-{red,final}.log and /tmp/cxv-b5-e45-sources-{chromium,webkit}-final2.log. Initial GUI red retained; no layout changed for the probe. Final release/install aggregation follows separately; B5 not yet complete.

## B5.46 E46 最终验收与工作包收口

E45 `d1faf28`。对齐冻结上游74cd752d，47条主/交叉候选均保留实际diff足迹、范围结论和其他工作包归属；E39–45补齐最后发现的旧文件工具native保护、普通项目原fs守卫和user/plugin祖先导航。没有将部分子项、原缺陷或未验环境计作整条混合提交完成。

最终实际执行 `env -u CXV_BYPASS_PERMISSIONS pnpm release:check` 退出0：**1781/1781（5+434+1130+212）、0skip、build/pack712通过**。随后真实tarball新安装 **487/487**，必需源码与全部204Web文件精确字节、B1.2及隔离相对cd CLI通过，安装目录`cxv-b3-runtime-40h1cp33`。日志与SHA256见[B5最终回执](./B5-final-2026-11-21.json)。E46仅文档/回执，无验证后的生产源码变化；无需重复跑同一检查。

原FileBrowser整CSS与固定原稿字节相同；E38八场/26图加E45 user/plugin两场/6图的32张原图hash再核一致，原图均有既有视觉核看记录。其他搜索/项目浏览/编码/上传移动/Git/Markdown实际GUI保留各笔原回执，不冒称本笔全重跑。已选pad横滚和完整原组件复现的冷开行号缺陷保持；真实LAN/TLS、外部模型、物理/其他平台及主PTY新GUI等边界明确列于[B5完成矩阵](./B5-completion-matrix.md)。

**B5工作包已完成（第6/12工作包）**。45笔独立实施/审计精确hash见[本地映射](./B5-local-commit-map-2026-11-21.json)，本笔为独立E46收口提交；未压缩、推送、创建PR或合并B5，未切换全局实例。B6留待下一个会话执行，本会话不启动。后续需要用户选择时继续通过提问工具列项，已有授权/方案不重复询问。
