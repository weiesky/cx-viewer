# B7 本地提交整合与PR交付记录

2026-11-22。用户明确要求B7验证结束后整合全部本地commit，面向main创建PR并自行合并；合并后才更新本地进度。已严格按此顺序完成。

- 起点：main `8968935417f4f26a79f84f5be3daad1234eba6d9`。
- 原末端：`61a36aeacd223a724045613f245bd3c5f0f93e48`，共51笔。
- 整合commit：`5b1c39710978d8069facfeda5542b8f384731cca`。
- [PR #8](https://github.com/weiesky/cx-viewer/pull/8)实际MERGED，合并时间2026-11-22 01:58:58（Asia/Shanghai），main `89a8d9dc508b1a9d79ac218bc870e20c4750187c`。
- 原末端、整合、GitHub精确head和合并main的tree均为`335a5be70f5fb7a86dd12648a72223fcfa6141d8`，没有借整合改生产内容。
- 恢复分支：`backup/b7-raw-20261122`；外部bundle和完整原hash清单：`/Users/sky/.codex/backups/cx-viewer/B7-20261122-015726`。bundle已由git bundle verify校验；可从该备份恢复原始51笔，不依赖远端feature分支。

验证为最终完整release:check2181/2181、0skip/build/pack723及新生产安装634/634、B1.2/隔离CLI、全部723包文件/211Web字节。GitHub实际statusCheckRollup为空，仓库只配置release/tag workflow，未冒称PR CI通过。因在线diff超过300文件、GraphQL仅100文件，改分页API核全322文件及GitHub远端tree；CLEAN/MERGEABLE后以--match-head-commit精确保护合并。原始51笔与整合tree相同，无需将同一代码重复测试伪称新验证。

PR合并完成后，才更新本地AGENTS、README、规划、台账和E42–E48记录，增加完成矩阵及B8交接。此后变化仅进度/证据文档，在本地main单独提交，未推送文档或直接推main，未再次发布npm或重启7008。自有普通/SDK夹具已按身份退役，残留0。平台/模型/真机未验限制见[完成矩阵](./B7-completion-matrix.md)。

## 原始提交映射

所有下列提交整合到`5b1c397`，原上游依据留在对应commit message和[B7实施](./B7-implementation.md)；机器可读全hash见[映射JSON](./B7-original-commits-2026-11-22.json)。

| 原始commit | 内容 |
| --- | --- |
| `f03e84dd5cb3d7da742d826a08e602e339021516` | refactor(alignment): isolate B7 main PTY lifecycles |
| `eefaa816b31512ca4ddf4bce4f32da4fd0cd3c87` | refactor(alignment): isolate B7 native TUI bridge state |
| `6c0f18011233bd9e611ea5d5832f6cab63a9bf81` | feat(alignment): coordinate B7 exact PTY workspace instances |
| `fb757ee0901e2c8fbf1f31f521898280a3aa2cf7` | fix(alignment): cancel B7 native bridge startup safely |
| `35b6dce07fed4d3207ed80614a24c829fcc82929` | fix(alignment): retain each B7 PTY workspace environment |
| `5eb20a06de1166b01b50344fbeee5941d87984c9` | fix(alignment): honor B7 workspace picker permission choices |
| `9ce6094095269943a200b81976a1a3944610538b` | feat(alignment): compose B7 isolated native PTY runtimes |
| `8b51f119fb8e1bb46249a478e9b6814da1e9ceb5` | fix(alignment): pin B7 native archive reads to exact sessions |
| `cf62c3eed8d2b97395bfb35cdcc6285ca7865afc` | feat(alignment): route B7 terminal views by exact PTY owner |
| `7ba9c363c9f2ee7af8530d4a1dad16ddb524d8c0` | fix(alignment): isolate B7 native questions and runtime events |
| `07d6a0654dc786d14758365f84ad73eca2647abf` | fix(alignment): bind B7 permission hooks to each PTY runtime |
| `5b8c87f148e6560a3a41ac46b49c3cbc5145757f` | feat(alignment): enable B7 independent ordinary CLI workspaces |
| `a0de5a230fffc9de612abf8a7ceb3e1aa1015ee5` | fix(alignment): expose B7 original workspace entry in ordinary mode |
| `94e788ac1c4f6ce99c3194359d3ee01c115e6d3d` | fix(alignment): reap B7 owned native bridge process trees |
| `8f624ae68791239cdf646c2a1db9ee7a2f0f90b6` | fix(alignment): await B7 owned PTY process tree cleanup |
| `e4a33bd92de8d0ad3e04ae1a690745c4aebbb341` | feat(alignment): restore B7 twelve-line composer sizing |
| `c22bfa0f8a8d34f6ef8d83eaa8a42910cb373a4f` | fix(alignment): restore B7 original suggestion clipping and floors |
| `64eead24238aa07e09d76b923055e2d26ece1e28` | feat(alignment): restore B7 native prompt navigation cards and cache |
| `8b0e6e1b70147128427c1d4cc8b64173ff790815` | feat(chat): restore original user prompt summary and export |
| `a6e1d6a94e387137a3634e7dc4bde1d0232fcadc` | fix(chat): keep empty prompt count unit out of the title |
| `1d7d4167ec7d82639d03637aa8bdffc1cb078a62` | feat(chat): align composer prompt navigation and mic positions |
| `e8a0b0d4349d412a108ef907a3a385f678aa0a8e` | fix(chat): preserve unsent draft across main terminal toggles |
| `5fa171f0575736f47d1f21ee0793b3fbe74976b4` | feat(chat): align active skill scope rows with upstream |
| `712134eec0ea7387f119ffea4950d324ce477009` | feat(skills): read the owned native App Server skill catalog |
| `a7bd8a7895aa3a2c0b405258b2b9dfefe091de0a` | fix(skills): include native project agents skill roots |
| `e915edff19cbc13fda02cb9f1c99292e50bbde16` | feat(chat): align slash skill menu with native Codex skills |
| `fa76df3774e50b5c2fc30455bfc68a3ba6a3df21` | fix(terminal): isolate scratch shell coordination and trace environment |
| `fa7cd3c7e2a2790b4c59afcd9ab40b0134096399` | fix(terminal): await owned scratch process tree cleanup |
| `9ee483f08e6851687162280255ce8c8566f416a0` | feat(terminal): migrate the isolated native PTY busy queue core |
| `1d889f103e88ad37635edff44719fd469fa9eb74` | feat(terminal): bind busy queues to exact native PTY owners |
| `2d26452f04e4b6c8c578c9ed1cad84c46bf6b4b0` | fix(terminal): coordinate native web and IM injection ownership |
| `069c667b0979ba540535aa281e112682f910e4e4` | fix(terminal): identify native transcripts separately from HTTP captures |
| `a1d7fb75f9712235dc67fec6eaf0ed00e4b8d7ba` | fix(terminal): keep passive native history reads out of workspace ownership |
| `135438cdb693a2ca4f10823a2408b69da7623e25` | feat(chat): restore ordinary PTY queue controls and rejection recovery |
| `d9a59056d35672bd818221a1c9d35693ef8bda76` | fix(chat): restore baseline minimum width for narrow terminal splits |
| `1ebd97a84eb391bea936ac9b98df026db940c2d9` | feat(chat): restore bounded SDK send-now status placeholders |
| `c1c23dc3e715f2a107dabe40ebb6e38110f4fd0d` | fix(editor): isolate native editor sessions by exact workspace owner |
| `eef0c498d1841e5c95956e292ba4750b9096b822` | fix(chat): submit native single-line text through settled paste transactions |
| `7931e9eaff55c91fe6c09ced714eac00ffd7b723` | fix(chat): restore baseline conversation render window sizes |
| `c9753dcf5e9ccc4668cd37712ac77de668353347` | fix(chat): restore baseline upload entry in composer quick menu |
| `92caf8e3a1e388614340f0197b1b9765362b99f8` | fix(terminal): restore upload entry in baseline quick menu |
| `cf8aa3c0e20328d0eb6e06ce0f9cf4d4e36c2a25` | fix(i18n): restore localized quick-prompt menu wording |
| `839119c5e06cd1d36d91890b889fa23e457d71a3` | fix(history): preserve readonly file URLs during boot workspace discovery |
| `57c3be426e27c0712ccefaec233d642d6db04f14` | fix(history): restore progressive readonly conversation expansion |
| `e00d2b370bedf0974b020c4f103e8dce59e94e33` | feat(chat): restore ordinary PTY task HUD from owned native plan snapshots |
| `0996ef4e8d5da4b68e2a8fc77e679d51f1e847df` | feat(chat): align minimal tool runs with native identities |
| `3c3ac0ca46ffe574f9625fd07dd604fb561a3738` | fix(chat): omit zero-segment assistant bubbles |
| `99ffd120b56d8253a268f0ca9d1fc7d868e2b96f` | test(pty): include process helpers and await owned transcript |
| `bbbe1ecef97f3d5c27f6774a6eb6f55eecff2b07` | feat(header): persist original menu pins in preferences |
| `af52809fa63a484a31e869d86f5b6a1c35e9984d` | test(pty): publish process fixtures atomically |
| `61a36aeacd223a724045613f245bd3c5f0f93e48` | test(package): verify B7 runtime in fresh production installs |
