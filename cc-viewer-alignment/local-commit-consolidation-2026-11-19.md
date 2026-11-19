# 本地63笔提交合并与B2收口（2026-11-19）

用户明确验收B2，要求本地commit合为一笔提交到main并推送GitHub；同时更新进度，准备B3。此操作只压缩本地未进入远端main的范围，不改写既有远端main历史。

## 聚合范围与可恢复证据

- 原远端main/新提交唯一父提交：`6045b5324edf7d15f2daaa86ce66371e69098eda`。
- 原本地末端：`e8396e4c42bad5eff3e49847a793b5b59665bc90`，共63笔（包含A2结构前置、B1.2收尾与B2）。
- 聚合目标：本文件所属的main提交；不在自身文件中写入自引用hash。最终完整新hash与远端读回结果保存在本地consolidation.json，交付回复提供GitHub链接。
- 原历史归档引用：`refs/archive/b2-closeout/20261119T053055Z/main`；原对象仍可git show。
- 本地备份：`/Users/sky/.npm-global/lib/node_modules/cx-viewer/.git/local-consolidations/20261119T053055Z`，含before.bundle、progress-before.tar.gz、status-before.txt及consolidation.json。
- 进度文档备份SHA-256：`f64b5eb815e6f025dabae161fa6bfd9572165db34057e4d334244c1714ee2fe7`。
- bundle已验证，保留原63笔完整hash/主题；归档引用和备份仅本地，不额外推送其他分支。

## 文件树与验证口径

聚合提交复用原应用代码、测试、依赖和工程文件，差异仅限AGENTS.md与cc-viewer-alignment的进度/证据文档和已有探针入库；最终执行逐路径差异核验。此前未跟踪的专项台账、引用文档和复现探针一并纳入，避免GitHub上B3交接出现缺失链接。

B2最后代码验证为1295/1295、0 skip、构建和新生产安装/202Web字节/66运行时/B1.2/隔离CLI通过；本轮只检查文档链接/探针语法与Git树，没有冒充重跑应用测试。用户接受的指针/物理多指等未覆盖项仍见B2记录。

推送只针对refs/heads/main，使用正常快进推送；推送前复核远端基线，推送后读回完整hash确认。其他本地工作树/分支及活动Viewer实例不切换。

## 原提交映射

下列所有原提交均映射到本文件所属的main聚合提交；上游hash→原本地hash继续保留在提交台账和迁移规范中。

| 原提交 | 原主题 |
| --- | --- |
| `2c0edc8378adf605527fae7f8681cd61f1055895` | refactor: adopt pnpm workspaces and offline credential recovery |
| `b549125c1e7b7add69ed80541384d1819da0ab92` | test: verify B1.2 recovery in isolated production install |
| `a09428254be9ac57dcd74091e6afa59014ec58f3` | fix: isolate stale SDK turns after session reset |
| `44a80e76082bbfca3e31992b485ec52274683f1f` | fix: scope SDK capture proxy lifecycle to its owner |
| `a00ed8a55a1623ba67ac7b3fa4f033f4fc6d90e0` | refactor: isolate resident SDK sessions by workspace directory |
| `12d218813e39b59ae21d2683f6a88c8d6aba125a` | fix: bind captured SDK requests to their proxy workspace |
| `c3e3e6b01160728aab347c78b77bf8733ffb9806` | fix: preserve workspace logs when project names collide |
| `06fac6f813757fc314085ce10097ebba7bf76fc8` | feat: reuse SDK launch configuration across workspaces |
| `6b982c8f53d0eaade678244e22d0223a9250f477` | fix: keep SDK Viewer authentication bound to its boot workspace |
| `14c3ae5773a607fa51b7ff5072a30a0555e4b45d` | feat: bind SDK controls and live events to each connection |
| `7415615aa3084e9f36bffa3d9803d14c63dfc85f` | feat: route SDK workspace lifecycle and HTTP views by instance |
| `818fff8e83a45c01e7996f213c63bdf81918e20a` | fix: isolate SDK image notifications by workspace |
| `597ff7ae159aeb4c3b999dd80d3e4d1a40901bf6` | feat: carry SDK workspace identity through browser navigation and caches |
| `c9a3e65d361cee72352550159aacd4e02ed9f355` | test: retry transient Git fixture directory cleanup |
| `d39d3a83a328d54bfb6103ceaf4b5d7b653384a1` | feat: add SDK workspace tabs and enable scoped chat controls |
| `b1b3c7a7c2a053713438555810d9aa9b58288a43` | fix: bind SDK scratch shells and shutdown to workspace instances |
| `20d7a297a1a78b65983bc94abb8698389aeeca00` | fix: preserve user text when classifying command metadata |
| `a9197c29bd695fc75a4195ad700816ff15b077b7` | feat: render scoped SDK scratch panels on desktop and mobile |
| `afd5103dd16f6cbff1b6e26e8bdaf62d3f44156d` | fix: restore SDK scratch panel state after desktop refresh |
| `2d95017de64af53c1417ab1d457b38b763556c97` | feat: validate SDK history and guard asynchronous session restoration |
| `cac3aa1f373a882634aa1d382c3793f506122da2` | feat: expose workspace-scoped SDK history restoration over HTTP |
| `87796f8249e797ae1365316f06da1e15d05c327b` | feat: resume SDK conversations from scoped workspace history |
| `dc5989ad61e37759fbca9e9b7774925707674180` | test: verify resumed history survives live publisher reattachment |
| `9a1f1c1bbe3c6b2e0945a86e9b5461d676fedb19` | fix: reuse shared resume parsing in SDK arguments |
| `8b14ef2ef916db4ffb0ca39e85340a6de4dafdd9` | feat: resume SDK CLI sessions from scoped Viewer history |
| `0dce135a160c7676ca583f7f8b218d569f916800` | fix: measure phone terminal layout from its visible container |
| `cef007067c3f8a652e41887941ac887554a57e28` | fix: share mobile terminal touch scrolling with scratch shells |
| `3d66bb6448d4946df735f7cc7d2ef7f21daef86b` | fix: use phone resource limits for scratch terminal output |
| `d4bc6076c244f4aee02dc297327422517ee35138` | feat: persist SDK workspace tab ordering across polls and reloads |
| `192f63ddd9077ba8a194b7f6533e16486e8a3f06` | fix: honor SDK interruption while the capture proxy is starting |
| `7dbf4ecca328b6a5c3305ec32c90328033432310` | feat: publish instance-scoped SDK queue snapshots and dispatch state |
| `07caca354d08792d2ce7868b29f45ce43aaa0614` | fix(ws): recover silent terminal connections and preserve failed sends |
| `3a6ea4ecdd23f75a299d46f0b3c67adfa75acb6e` | fix(sdk): acknowledge accepted messages and correlate queue rejections |
| `b3922ef6537cebf81af959b8d512909af7edfa91` | feat(chat): restore scoped SDK queues and rejected drafts |
| `94d45588bc66dffdf76fd28bb89c8d4a86b63c6a` | feat(sdk): remove queued messages by scoped identity |
| `285e51f3b73ad3e9d08651d2d12dc00da4e57a7d` | fix(chat): keep queue actions on compact-summary messages |
| `b03a24fea9927eb1067e8a852bc8ac17237aad83` | fix(sdk): preserve successful turns after retry error notices |
| `14c39d454f0ab1fdc9043feee7d1cd88eee95872` | fix(sdk): bound cancellation of owned Codex processes |
| `671547d82dcd78e1cab50a474e56cf9eec5a9924` | feat(sdk): park stopped queues and send selected messages now |
| `c11609fc3e303b195762a3d3a2535b3df78062a2` | fix(sdk): replay active prompts across refresh and client attachment |
| `a8df3dba80a7ec9f7467f0e1c98c500650eedda2` | fix(chat): retain SDK queue snapshots during mode discovery |
| `8246408f6193e466afe2a6f0a298f35d1eb1308f` | fix(sdk): retain terminal errors in continued conversation history |
| `fb53455881cda67f41ddbcc2d04d2480a9b90f51` | fix(workspaces): support pointer sorting and distinguish path suffixes |
| `467fbf3c683fc7142926d226a98426608f531be4` | fix(sdk): preserve canonical turn timestamps across history projection |
| `b280d003c44a1bfb6d050c3bea1b646b1cf14155` | fix(workspaces): integrate workspace controls into the header |
| `02349c23b3b24aea581d0a984269a9c0f8eee43e` | fix(workspaces): preserve project aliases in header workspace controls |
| `f870f2dcee06aa74ce402bffff65444e5791f97f` | fix(workspaces): keep header actions accessible on narrow screens |
| `4fb7adefef850308427cf0adbac13d32ad8acb58` | fix(workspaces): scope persisted snapshots to the viewed instance |
| `d10ceae81c738cb9c861b812bdf5c4e1565ebf47` | test(workspaces): add a reproducible isolated GUI fixture |
| `c05cbf09336c9c20f3b8ef93be22639dfeddeff5` | docs(workspaces): record GUI acceptance and remaining device checks |
| `d10684db3faf7ed2c5423f2c437ad1d33c8aca9a` | docs(alignment): require migration from baseline PR source and styles |
| `77d4ad55b76eda50ee1fa151b9a2c46da11dea87` | fix(web): port baseline Header workspace pills and drag sorting |
| `7d17f24e0d75abf4a885f1e5042042ed51c24f1f` | fix(web): restore baseline shared new-workspace picker modal |
| `fbd581799bb330d8e7744eda7cc04a266d672e7a` | fix(web): restore baseline history menus and mobile workspace entries |
| `e05109d412167776e48971fc3e4f72695314aeec` | fix(web): switch SDK workspace views without document navigation |
| `35e8d3047c19ad0e0187759c147cfe39d1cb21a7` | fix(web): restore baseline scratch panel hierarchy and phone rail |
| `43ed8552e57374ab492975cbda8391ac8dab1d4e` | fix(web): adapt baseline workspace copy to Codex and local templates |
| `82e25e7448150aa7d17f1b7a1a0152d0bcfd1019` | fix(web): port baseline queued-message rows above composer |
| `11b0885ddd8c759245a1aa7f6229a98cdfe8e442` | fix(web): repair viewed SDK workspace after a remote close |
| `d53f4ead85a9837576ba8831e88c298dd213c1ec` | fix(web): keep live queue controls outside conversation role filters |
| `765aafde984e02a3332f1cf652c323c86426bc0e` | fix(web): use Codex in baseline queued-input hints |
| `3cbd71e6889af991079881e5f6113a809a59929d` | fix(workspaces): repair scoped views before SDK close teardown |
| `e8396e4c42bad5eff3e49847a793b5b59665bc90` | docs(alignment): record final B2 browser and iOS acceptance evidence |
