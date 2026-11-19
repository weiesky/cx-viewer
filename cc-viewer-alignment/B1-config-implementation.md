# B1 配置与凭据实施拆分（B1.2 本地验收完成，真实验收待执行）

B0 已按用户确认的迁移准入范围完成，见 [交接](./B0-handoff.md)。按用户要求，每笔限定一个独立改动，验证后提交，再推进下一笔；不整体 cherry-pick 上游混合提交。

## 工程前置交接（2026-11-17）

用户在 fa25aaa 凭据检查点选择先稳定结构。A1 6287d2a 已主线，A2 3b15a6d 已在独立工作树提交；全量 1102/1102、npm 与 macOS Node payload 通过。proxy/IM 显式迁移已在 packages/app 完成，共享库可读时的按配置恢复也已实现，无损 key 修复和坏库现场留存已实现，已于2026-11-18确认保留现场并拒绝覆盖、不提供有损整库回退，本地安装验收由b549125补齐，真实用户/目标环境验收尚待。旧记录保留当时路径，当前定位见 [A2 映射](./A2-path-map.json)，源码/产物位置及失败边界见 [工程交接](./A1-A2-engineering.md)。当前全局实例及真实凭据未切换，B1.2 未整体完结。

## 已完成：450affb — preferences 损坏保护

- 上游来源：`4c5e633e68` 的严格 mutation guard 能力。上游初版 preferences 默认仍容错覆盖；本地依据 B0 已复现的数据丢失风险，对 updatePreferences 启用严格读取，**不是原样移植全部 json-store kernel**。
- 本地提交：`450affb`（`fix(preferences): preserve unreadable configuration on updates`），仅 4 个文件：`lib/preferences.js`、`server.js`、`tests/preferences.test.js`、`tests/auth-server.test.js`；产品逻辑只涉及前两个文件。
- 在现有锁内拒绝损坏 JSON、非对象根、非法 UTF-8、不可读路径和悬空链接，禁止运行 updater，保留原内容。真正缺失时仍可初始化，普通只读调用保持兼容，原有锁和原子替换复用；POST `/api/preferences` 返回 409 / `PREFERENCES_UNREADABLE` 并提示恢复原文件。
- 新增测试先红后绿，覆盖原内容保留、失败释放锁、恢复后可写、两进程 40 次更新、0600、原子 rename 失败及临时文件清理、真实 HTTP 409。隔离快照 `/tmp/cxv-b1-preferences-r8pic1dc` 运行 `env -u CXV_BYPASS_PERMISSIONS CODEX_HOME=<临时目录> npm test`：**997/997 通过，0 skip**；`npm run build`、`npm run pack:dry-run` 通过，预览 1000 文件。借用现有 node_modules，不等于全新安装；日志留在隔离目录的 full-test.log / build.log / pack.log。
- 本笔不迁移认证字段、注册表、密钥加密或共享 kernel。畸形密码读取的放行风险仍待下一笔修复，不能将这笔提交理解为 B1.1 全部完成。其他更新入口的错误展示亦随对应迁移核验。
- 恢复：损坏文件由用户从备份或人工修复后再保存，应用不会自动覆盖它。代码可单独 `git revert 450affb`；这也会恢复旧的损坏覆盖行为。没有升级用户配置格式或运行数据迁移。GUI、Windows/Electron、跨平台仍未验证；悬空链接单测在 Windows 明确跳过，需目标环境补测。

## B1.1 保存安全与鉴权

已完成第二笔 `dc883f3`：适配上游 `739f49a6de` 的不可读密码保护及 `565613bbea` 的同作用域修正。畸形 Base64、非法 UTF-8、字段/容器损坏和 preferences 不可读均不再当作空密码；HTTP、WS、登录和旧 session 统一保护。锁内禁止覆盖目标作用域中不可读的密码，全局损坏仍允许建立独立项目覆盖，显式空密码与有效 Unicode/BOM 密码保持兼容；不涉及凭据加密。API 409 暴露机器码和恢复提示。本地 3 个产品文件及 2 个测试文件，隔离快照 `/tmp/cxv-b1-auth-3_qd60ih` 全量 **1000/1000、0 skip** 通过；包含实际 HTTP/WS 和可用 LAN 地址联测，未启动真实模型。GUI/TLS/跨平台仍未验证，读取失败后从备份修复或明确选择继承配置；不是自动重置密码。

1. lib/preferences.js：在写锁内区分文件不存在与读取/解析/类型损坏；更新失败时保留原文件并向调用者传播错误。阅读所有 readPreferences 的兼容要求，避免把只读场景和写场景混同。
2. lib/auth.js、lib/auth-routes.js、server.js：区分明确空密码和非空但不可解码的存储值；为全局与项目覆盖传播不可读状态。HTTP 和 WebSocket 都必须按其现有信任策略处理；拒绝覆盖目标作用域中不可读取的密码，并允许不存在覆盖项时创建独立项目密码，不能把全局损坏误判为项目密钥损坏。确保本地管理者有明确恢复路径；不要改变已有有意无密码配置。
3. workspace-registry.js、server.js：工作区注册表损坏时禁止覆盖；保存失败抛出并由 workspace API 正确返回失败；审查锁过期、锁文件所有权及并发语义，不在未证实前替换全部锁。
4. tests/preferences.test.js、tests/auth.test.js、tests/auth-server.test.js，以及现有工作区 API 测试：加入损坏内容、失败不覆盖、写错误传播、非 loopback HTTP、WS、显式空密码、项目覆盖和多进程竞争回归。全部使用临时日志目录与合成密钥。

执行先测试再改最小实现；隔离环境运行相关测试和既有全量基线。真实实例无法启动时记录命令、原因、预期和交由用户验证。

## B1.2 凭据迁移准备

第四十笔 3f81fbc 提取与运行时共用的纯数据解析/认证，用候选 key 离线认证全部记录，只返回数量（定向12/12，全量1145/1145）；第四十一笔 8732a33 在私有快照原语中隔离 damaged-store-evidence-v1 用途，保存坏 key/store 精确字节、缺失和哈希，但不宣称可解密，普通恢复拒绝（定向25/25，全量1148/1148）。第四十二笔 0122f7e 完成无损 key 修复：必须显式 root/backup/source，默认纯只读，候选须认证每条当前记录且非空才可应用；先保存损坏证据，持真实 store 锁重验，原子替换 key 并同步目录，保持 source/store 字节、其他 owner 最新凭据与回执。healthy 重试持锁复核/同步目录，不再生成证据；支持并发、外部变化拒绝、rename/目录 fsync 失败和硬退出续跑，新增11项，全量1159/1159。第四十三笔 20ce331 补损坏现场 CLI，默认仅存在/字节数预览，显式保存不改 live，新增2项（含坏UTF8/坏库/短key/缺失/用途隔离/参数和别名）。最终全量1161/1161（5+142+811+203），无失败钩子/0 skip；构建及npm680文件通过，实际tarball默认检查、key修复/幂等/新进程/备份后新owner与secret保留、任意坏记录拒绝和明确取证通过。日志 /tmp/cxv-b1-key-repair-Dyhfyq6i，本轮全部检查直接通过，没有失败后隐去。首次迁移前快照可能无key，真实验收需追加迁移后含新key快照；完整有损回退当时未启用；2026-11-18用户已确认不提供该能力。真实实例和凭据未动，见 [key修复](./B1-key-repair.md) 及 [B1验收矩阵](./B1-acceptance-matrix.md)。


第三十八笔 43150d4 修正原有 readiness 两项测试的过短时限（100ms→2s，延迟建锁宽限50ms→1s），只增加调度余量，原有断言保留，定向6/6。第三十九笔 36d0697 完成 live 库可读时的 auth/proxy/IM 快照恢复，按用户本轮明确选择恢复整个 preferences（含主题等非认证字段）。复用现有迁移器在私有暂存区解码/验证旧快照，将目标凭据重绑现有 live key，保留其他 owner 后续密文，不整库覆盖；每次 apply 先验证安全快照，复用源锁、原子替换/目录 fsync 与回执，支持损坏源 JSON、缺失配置的显式空状态及失败/硬退出重试。当前 key/store 丢失或坏密文会拒绝，完整库损坏恢复尚待专项方案。恢复15项，最终全量1144/1144（5+142+794+203）、无失败钩子/0 skip，构建与 npm677文件通过；实际 tarball 解包后三类预览/apply、新进程检查、整份偏好回退、其他配置后续凭据和 live key 保留通过。初次全量793/794为上述旧 readiness 超时；修正后两次全量通过，最后新增 key-only 拒绝边界后也重跑全量及构建。最初恢复测试误以为 auth 读取不可读会抛错，修正为 passwordUnreadable 状态断言；未把失败写成通过。日志 /tmp/cxv-b1-proxy-migrate-FYgGvqHS/recovery-*。真实实例及凭据未动，下一步完整共享库损坏恢复方案、B1 真实验收及 B2；见 [恢复入口与完整证据](./B1-recovery-scope.md)。


第三十六笔 c24fad5 修复 IM 私有写临时文件碰撞（定向 8/8）；第三十七笔 c52565b 完成 IM 明确 root、默认只读的显式迁移。复用严格解析/源锁与私有写入，先验证匹配快照、暂存读回、切换源并严格同步目录，再校验运行时语义及回执；明确停用的空 secret 用 null 引用，保留元数据和 JSON 自有键。失败不覆盖有效源、不删除可能已提交的 secret，支持补回执、真实子进程退出后的过期锁恢复、并发及共享库保留。实际 HTTP 用例改为调用真实迁移入口。定向 47/47，最终全量 1129/1129（5+142+779+203）、0 skip、无失败钩子，构建及 npm 675 文件预览通过；实际 tarball 解包后的 auth/proxy/IM 默认检查、显式 apply、重复执行、共享库和新 Node 进程解码通过。日志 /tmp/cxv-b1-proxy-migrate-FYgGvqHS/im-* 与 tarball-smoke。初次 IM 碰撞测试注入递归、且根 cwd 运行包内测试失败，改用原始 fd 并在 packages/app 重跑后通过，非产品失败。真实凭据/当前实例未变。下一笔 live 恢复范围见 [方案](./B1-recovery-scope.md)，B1.2 未整体完结。


本轮第三十四笔 9083833 修复共用 atomicWriteFile 在 wx 创建碰撞时误删已有临时文件的问题（定向 3/3）；第三十五笔 63664dd 完成 proxy 显式迁移。必须指定 --profile，默认仅检查，--apply 和 --confirm-stopped 同时提供才修改。复用实际 HTTP 保存源锁及凭据解码器，验证当前文件/.bak/store/key 私有快照后，先迁移 .bak、再当前文件、最后写回执；保持两份不同密钥与 v1 默认语义、无关字段和 __proto__。覆盖部分提交、目录 fsync/rename/回执失败、真实子进程退出/重启、并发、持锁、共享库其他配置保留和源变化拒绝。当前 API/合成上游转发用例改用真实迁移入口生成配置。定向 34/34，全量 1117/1117（Electron 5、web 142、app 767、根 203）、0 skip、无失败钩子，构建及 npm 674 文件预览通过。新增共享库测试初次误用不支持的 kind（im-app-secret），修为实际 im-secret 后通过，未作为产品失败隐去。日志 /tmp/cxv-b1-proxy-migrate-FYgGvqHS；未执行真实迁移。下一步 IM 入口与共享库安全恢复。详见 [proxy 操作与边界](./B1-proxy-migration.md)。


第三十一笔 `fa25aaa` 完成 auth 显式离线迁移入口及命令 `scripts/migrate-auth-credentials.mjs`：必须指定 root，默认只读检查；apply 必须同时声明共享配置进程已停用。复用原有 preferences 锁（提取 withPreferencesLock，普通 update 行为保留），先验证私有快照，再逐作用域暂存/读回，原子、fsync 切换源文档，复核全局/项目有效值和 revision 后写入并读回回执。普通启动/保存不调用迁移；无 auth 不造库；已迁移的重复执行不改 source/store/备份。保留明确空密码、Unicode/BOM、无关字段及 `__proto__` 自有键，继续用 JSON.stringify 而非会重建普通对象的通用 canonical writer。写临时文件用独占 descriptor，碰撞时不删除别人的文件。

新增 9 项迁移测试及 1 项临时文件碰撞回归，既有 HTTP/WS 用例改为使用真实迁移入口生成配置。覆盖两进程串行、CLI 默认无副作用、子进程重启、源 rename/回执/提交后目录 fsync 故障、真实子进程在源 rename 后退出及随后恢复回执、坏/丢 key、降级 source 拒绝。源未提交时清理暂存；源可能已提交时保留活跃引用，返回不完整状态和 backupPath，保持进程停用并重试。沿用现有 preferences 10 秒锁过期策略；硬退出测试显式模拟锁过期后恢复，未声称已重设计长时间锁竞争或断电恢复。当前环境定向 35/35（最后增加目录 fsync/碰撞前）通过。隔离 `/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b1-auth-migrate-t0ki6c_t` 首次全量与构建并行时既有 readiness 100ms 测试超时（1097/1098）；定向 readiness 6/6、构建结束后全量 1098/1098，再加入独占 descriptor 碰撞保护后的最终全量 **1099/1099、无失败钩子、0 skip** 通过（full-test.log/readiness-retry.log/full-test-retry.log/full-test-final.log）。构建及打包预览 **1014 文件**通过，借用已安装 node_modules，非全新安装。说明见 [auth 迁移使用与恢复边界](./B1-auth-migration.md)。没有执行真实用户迁移或停止实际进程；下一步 proxy/IM 的显式迁移工具，以及保留共享库其他配置的 live 恢复工具和验收。B1.2 与相关上游提交仍为部分对齐。

第三十笔 `0d2bf0f` 提交路径注入的私有恢复快照原语。调用方停用共享配置进程并持有源锁后，快照过程另持有 store 锁，保存指定 source 的精确 bytes/明确缺失状态及匹配的 key/store（含回执）；逐文件摘要、严格路径/权限/链接和 descriptor 身份核验，读回使用备份自身 key 验证全部密文。写失败仅清理本次未完成快照，不改变 live 源或 key，不影响此前备份；未创建过 store 时不生成 live key。7 项回归含实际恢复到隔离目录、丢 key/重算摘要后的错 key、跨进程并发 store 写入/快照。隔离 `/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b1-backup-3jnfhcaf` 全量 **1089/1089、无失败钩子、0 skip**，构建和打包预览 **1013 文件**通过（full-test.log/build.log/pack.log）；构建存在既有大 chunk 提示。此为备份/读取原语，无 live 恢复或迁移命令；共享库回退需保留其他配置及其匹配状态，不能把单个配置快照直接覆盖到之后已变化的共享库。下一笔 auth 显式迁移入口。

第二十九笔 `8a1ad0d` 将明确迁移回执接入 auth/proxy/IM 的读取及保存。已迁移 source 被整体替换为旧格式或删除时返回不可读，不初始化新文件、不覆盖旧内容；proxy 的可选缺失 .bak 保持缺失。仅全局 auth 引用损坏时仍可建立独立项目覆盖。新增 5 项回归并扩展真实 HTTP/WS、代理和 IM 测试；隔离 `/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b1-state-runtime-hiqcnqmm`，定向 **52/52**、全量 **1082/1082、无失败钩子、0 skip** 通过（full-test.log）。未迁移配置不自动启用，尚无真实迁移；下一笔为私有可恢复备份原语，再做迁移工具和失败恢复验收。

第二十八笔 `687a210` 实现持久迁移回执原语：复用既有认证加密 store 的 configuration-state kind，以 type/config 身份区分 auth、proxy、IM 和不同文件；明确 mark 才启用，暂存凭据或 store 存在不会启用。状态值严格版本化，未知状态、丢 key 均拒绝，mark 不覆盖未来状态；幂等且可跨实例重读，无额外明文状态文件。2 项回归覆盖缺失无副作用、无关密文、身份隔离、源降级断言、幂等和未知/丢 key 保留。隔离 `/tmp/cxv-b1-migration-state-dg62cnhr` 全量 **1077/1077、无失败钩子、0 skip** 通过。尚未接入读取器或工具，不声称已防止实际 source 整体降级。

第二十七笔 `6d36759` 接入 IM appSecret 显式迁移格式：仅 `_cxvImCredentialVersion: 1` 使用 appSecretRef，owner 固定为 LOG_DIR 中的 DingTalk 配置身份；拒绝丢 key/ref、未知版本、旧字段重现和运行中漂移 owner。明确的 null ref 只允许停用状态表示无密钥；普通空白输入仍保留有效旧密钥，显式 clear 停用并移除当前引用。源锁内暂存/验证/切换，提交失败清理暂存，已提交后仅清理旧密文。未标记 source 仍为 legacy，不自动迁移。

6 项新增回归涵盖旧格式无 vault 副作用、遮罩 state/空白保留/引用复用、子进程重启、改密/清除、无密钥停用不创建 store、不可读拒绝保存/清除、源提交失败与两进程改密；真实 HTTP status/config 保持无秘密内容，删 key 后 status/save 均 409 且 source 不变。隔离 `/tmp/cxv-b1-im-runtime-k0zill2o` 的 full-test-http.log 全量 **1075/1075、无失败钩子、0 skip** 通过。没有真实 DingTalk 网络、真实 detached worker 或真实用户凭据迁移；后续持久迁移回执与备份/工具仍不可省略。

第二十六笔 `a089128` 完成 IM source 严格读取与锁：读路径不建文件，拒绝非普通/链接路径、损坏/非对象 JSON、非法 UTF-8、未知版本与错误 appSecret 类型，使用非阻塞 fd 校验且限制 1 MiB；只有真正缺失才作为未配置。save/clear 在复用的 pid-aware V2 文件锁内读/合并/原子写，失败释放锁；避免跨实例丢字段。只读损坏状态现在明确报 409，不再伪装为正常未配置，main reconciliation、bridge start 和路由已有错误捕获。

新增多类损坏配置的 read/save/clear 不变性、两进程各 20 次独立字段更新及真实 HTTP status/config 409、错误不泄漏片段、源恢复后状态 200。隔离 `/tmp/cxv-b1-im-strict-config-s7wvzlcs` 的 full-test-http.log 全量 **1068/1068、无失败钩子、0 skip** 通过。未调用真实 DingTalk、未启动真实后台 worker、未改用户配置；appSecret 加密接入下一笔。

第二十五笔 `90eb63b` 修正 IM 原子写的提交边界：旧实现 rename 成功后 chmod 失败会返回失败但 source 已改变，不能直接在其上套凭据暂存清理。现在在临时 fd 上设 0600 后 fsync/rename，替换后不再执行会向调用者抛出的权限操作；沿用目录 fsync 的现有兼容策略。权限故障注入先红后绿，原文件保持、临时文件清理。隔离 `/tmp/cxv-b1-im-atomic-6c1v34zg` 全量 **1065/1065、无失败钩子、0 skip** 通过。尚未接入 appSecret，加密前还需在 config source 锁内严格读取，避免损坏配置被默认值覆盖和多实例并发丢字段。

第二十四笔 `85636c9` 接入代理 runtime/API：interceptor 与 HTTP 使用同一归属适配器读取；严格 UTF-8/JSON/格式读取，真正缺失与悬空链接区分，源错误用固定文本，不让 JSON parse 消息回显附近的凭据片段。POST 在现有 source 锁和 revision 检查内读取解密值供遮罩回填，保存由凭据 seam 暂存/切换/保留 .bak 引用；损坏源或已迁移备份拒绝覆盖。GET 维持既有 masked/loadError 契约，不暴露 apiKeyRef；只有明确标记的配置使用 vault，legacy API 流程仍通过。

新增真实 HTTP 回归覆盖 encrypted mask 保存、当前/备份解密、源 rename 失败与当前运行 key 保留、损坏源拒绝覆盖且错误不泄漏片段；合成 loopback 上游收到解密后的 Bearer key，删 key 后 interceptor 拒绝后续 OAuth 请求、上游调用数不再增加，不使用真实模型或官方凭据。隔离 `/tmp/cxv-b1-proxy-runtime-ew1sguoz` 全量 **1064/1064、无失败钩子、0 skip** 通过。真实用户凭据未迁移；IM/工具/GUI/跨平台仍待后续。工具还需持久迁移回执，以区分已迁移配置被整体旧格式替换/删除与从未迁移，不能只依赖 source 的版本字段来宣称抗格式回退完成。

第二十三笔 `d878eb2` 实现代理写入 seam，仍未接入 runtime：新 key 暂存验证后由调用方持源锁同步写备份与 source，失败清理暂存而保留有效旧 key；原 key 未变时复用 ref。成功后保留当前与最新 .bak 使用的版本，只清理被覆盖备份的旧版本；损坏/不可解密的已迁移备份不允许静默覆盖。未迁移 source 仍保存 legacy，无 vault 创建。4 项新增回归覆盖三代配置的备份恢复、源提交失败、未变 key、坏备份和未迁移保存；隔离 `/tmp/cxv-b1-proxy-credential-save-bpppvfzb` 全量 **1061/1061、无失败钩子、0 skip** 通过。异常终止或手工恢复旧 source 仍可能留下受保护的无引用密文，后续工具需审查清理。

第二十二笔 `8c17d9c` 实现代理凭据解码 seam，尚未接入 interceptor/HTTP：profile 所在目录拥有 store，同目录不同配置文件以 basename/profile id 绑定引用；复用现有 profile 校验器的 key resolver，不复制 schema 校验。仅 `_cxvProfileCredentialVersion: 1` 读取 apiKeyRef；未知版本、跨文件/跨 profile 引用、缺 key/ref、旧 apiKey 再出现均拒绝，legacy 读取无 vault 副作用。3 项回归含同目录多个配置共享 store 而互不读取密钥。隔离 `/tmp/cxv-b1-proxy-credential-read-7xiwt9d0` 全量 **1057/1057、无失败钩子、0 skip** 通过。后续先实现 source 与最近 `.bak` 共同保留引用的写入，再接 runtime/API，避免引入备份不能恢复的中间状态。

第二十一笔 `a310346` 完成 auth 运行时格式适配（不是自动迁移）：preferences 只有明确 `_cxvAuthCredentialVersion: 1` 时，global/project 条目才读写 passwordRef；缺记录/丢 key/跨作用域引用/未知版本/旧 password 字段重新出现均不可读并拒绝覆盖；未标记的旧配置仍沿用原格式，不因 store 存在自动切换。项目身份保留本地 exact-key 语义，迁移工具将复用 authCredentialOwner，避免把原有独立覆盖合并。已迁移配置要求启动时冻结的 owner，运行中改根不漂移。

保存复用 preferences 锁：先暂存独立版本并验证，再原子切换 source；source rename 失败清理暂存，旧密码/版本保持有效。成功后删除旧引用，清理失败仅保留私有旧密文并给无秘密内容的警告，不伪报已提交的改密失败；异常终止可能遗留无引用密文，后续维护工具需识别，不能以此宣称无孤儿数据。继承/清除覆盖维持既有显式恢复语义，不触碰其他作用域。

新增 5 项 auth 格式/故障/两进程 20 次改密回归及实际 HTTP 读取、配置保存、登录、丢 key 后的登录 409、远程 HTTP/WS 拒绝；旧格式无 vault 副作用、显式空密码和原 Unicode/BOM 亦覆盖。修复前并发失败记录见第二十笔；最终隔离 `/tmp/cxv-b1-auth-runtime-final-ra2njei3` 全量 **1054/1054、无失败钩子、0 skip** 通过。真实用户配置未写；同一隔离快照构建及打包预览通过（1010 文件），构建只有既有 chunk 大小提示。proxy/IM 和备份/迁移工具仍未完成，GUI/TLS/跨平台未验证。

第二十笔 `e539f4c` 先修认证并发测试暴露的存储前置问题：lstat/open 之间正常原子替换会改变 inode，原读取器误报不可读；已经打开的旧快照被替换后 nlink 可为 0。现在对实际 fd 的普通文件、私有权限、链接数及大小做完整验证，允许安全不可变快照，不要求它仍是当前路径的 inode；硬链接或公开模式仍拒绝。定向注入先红后绿，覆盖替换发生在 open 前/后及权限/硬链接攻击；隔离 `/tmp/cxv-b1-store-snapshot-1dhoke1y` 全量 **1048/1048、无失败钩子、0 skip** 通过。认证运行时首次全量的并发失败未记为通过；修复后认证/HTTP 定向 **24/24** 通过，尚待完整回归及独立提交。

第十九笔 `325ecbe` 提供版本化凭据引用：复用 store kind/ref 与 Node randomUUID，引用严格验证配置/作用域 owner 和编码；暂存不覆盖当前版本并读回确认；空字符串是有效记录，缺失/错 kind/错 owner/丢 key 均拒绝。两个文件，仅模块和 3 项回归；隔离 `/tmp/cxv-b1-credential-ref-cz829co3` 全量 **1047/1047、无失败钩子、0 skip** 通过。仍无启动或真实配置迁移。下一笔只适配 auth，在既有 preferences 锁内暂存新版本、以 source 原子替换为生效点，配置失败保留旧密码。

第十八笔 `60def58` 保护派生数据读取：Codex memory 沿用已有路径/大小限制，在 fd 上加私有策略并返回专用 403；技能 metadata/plugin manifest 复用 readPublicFileSync，私有别名不暴露其 frontmatter；项目统计读取检查私有 inode，聚合统计跳过私有别名，保留普通缓存。各自增加硬链接回归及实际 HTTP 聚合统计回归。隔离 `/tmp/cxv-b1-derived-read-hcecl6ed` 全量 **1044/1044、无失败钩子、0 skip** 通过。运行时适配下一步优先处理凭据与源配置的两阶段保存：不先覆盖当前有效密码，再因配置写失败留下半成功状态。

第十七笔 `c5c0ea0` 保护日志 ZIP 导出：copyStableTree 复制前校验私有路径/inode，防止 hard link 被复制成新 inode 后失去身份。回归将合成私有文件硬链接到有效 V2 会话目录，导出拒绝并清除全部 staging，源文件不变；既有正常 ZIP 往返继续通过。隔离 `/tmp/cxv-b1-private-archive-d7klcb_q` 全量 **1041/1041、无失败钩子、0 skip** 通过。该改动未改变日志格式或真实日志数据；沿用现有复制及 append 锁，未承诺对抗同用户恶意并发路径替换。

第十六笔 `3960ffe` 保护静态/文档旁路：共享 readPublicFileSync 在真实路径及打开后的 descriptor 上检查策略，非阻塞、拒绝非普通文件，支持字节/文本。静态资源和 SPA fallback、插件模块源码、concept Markdown、AGENTS.md 内容读取接入；AGENTS 列表也过滤私有别名。实际 HTTP 符号/硬链接到合成私有文件均拒绝、普通静态文件仍成功；单测覆盖普通字节/文本以及打开后 inode 被替换。隔离 `/tmp/cxv-b1-public-read-4x5096ff` 全量 **1040/1040、无失败钩子、0 skip** 通过。未对插件运行时读取其明确配置的能力加限制；日志归档复制及派生数据读取仍待保护，真实凭据迁移未启用。

第十五笔 `027d5a1` 保护旧格式配置：共用纯路径模块定义 preferences 与钉钉配置，既有模块保留原导出，无 import cycle；私有策略同时保护启动时和当前 logDir 配置、固定 profile 及已知 .bak，rg 排除兼容文件与目录。策略解析显式配置的符号链接根，保护真实目标及硬链接，又不阻断普通 descriptor；私有目录内部异常链接仍失败拒绝。真实 HTTP 内容/raw/写入、Node/实际 rg 与批量替换、配置路径变更均覆盖；配置 API 仍可调用。隔离 `/tmp/cxv-b1-legacy-boundary-ik1uladj` 全量 **1039/1039、无失败钩子、0 skip** 通过。仅保护明确配置/备份和私有树；未声称追踪用户任意复制的凭据或全面防御同用户并发文件替换，短暂遗留 plaintext 临时文件另须随写入迁移处理。真实用户数据未改写。

附件追踪：当前 `lib/dingtalk-im-bridge.js` adapter 契约为 connect/sendText，出站只传文本；`imSkills/scripts/cxv-projects.mjs` 读取固定项目状态/日志，不存在本地任意附件路径发送器。技能包 upload 属入站导入，不能把尚未实施的 B9 媒体发送宣称已通过；未来新增本地附件能力时必须接私有文件策略。

第十四笔 `89d20f0` 完成文件/目录创建与导入目的地保护：导入在 mkdir 前校验已存在祖先的真实项目边界和私有策略，逐个最终文件名也执行私有校验；创建文件用 wx，不覆盖检查后并发出现的文件，冲突返回 409。真实 HTTP 覆盖私有库/备份目的地、项目外链接下未创建目录保留不存在、普通新建/重复导入后缀、注入并发文件后内容保留。隔离 `/tmp/cxv-b1-private-import-2yrmztoh` 全量 **1037/1037、无失败钩子、0 skip** 通过。仍未启用真实凭据或迁移，接下来保护旧格式配置及明确的备份文件，追踪附件/其他文件入口。

B5 第十三笔 `ecc1048` 已实现上游 `96c477d582` 的 stdin EPIPE 防护：原有 git helper 抽出窄模块，监听 stdin 错误、同步写失败及一次性完成，完成时清理 timeout；保留 git exit 1 的正常 stdout 行为，不引入依赖。真实子进程覆盖正常/非零退出、4 MiB 输入提前退出、缺命令和超时；实际 HTTP `/api/files` 注入 stdin EPIPE/缺 git 后仍返回普通文件列表，后续鉴权请求继续成功。隔离 `/tmp/cxv-b5-stdin-tk5znnwg` 的 full-test-http.log 全量 **1036/1036、无失败钩子、0 skip** 通过。该功能子项已对齐，history/发布元数据仍归 B11；其他 SSE/队列错误不由此冒充完成，Windows 仍未验证。

第十二笔 `0419026` 完成重命名/移动/删除边界：私有路径、硬链接别名及包含私有根的祖先禁止修改；校验真实目标但操作原始目录项，保留符号链接语义；移动检查真实源/目标，跨文件系统 cp 逐项过滤、防覆盖，复制被拒绝不删除源。单测覆盖未创建的私有根和祖先，真实 HTTP 覆盖路径/别名/祖先、普通链接重命名移动删除，以及注入 EXDEV 的私钥硬链接复制。隔离 `/tmp/cxv-b1-private-mutations-zgri_3ro` 全量 **1032/1032、无失败钩子、0 skip** 通过。复制失败可能留下已创建的目标目录，未承诺事务式跨卷移动或全面阻止同用户并发替换攻击；导入/附件及加密运行时仍待接入。

第十一笔 `b6fe3e9` 完成目录读取保护：`/api/files` 校验真实目录的项目归属并过滤私有路径/硬链接别名，`/api/browse-dir` 保护私有根并过滤目录项；普通项目目录与全局目录选择仍可用。真实 HTTP 回归涵盖私有库/备份、链接别名、项目外目录访问和普通文件目录，隔离 `/tmp/cxv-b1-private-list-fg3_bgm2` 全量 **1030/1030、无失败钩子、0 skip** 通过。修改/导入/附件边界仍待完成，未激活凭据迁移。

第十笔 `ab7147b` 落实用户确认的“按配置归属分库”：抽出 interceptor 共用的 PROFILE_PATH，冻结绝对路径；LOG_DIR 与 profile 所在目录分别定义 private store/key/备份路径，同目录物理复用，文件策略保护两处根。没有导入 interceptor 到文件策略，避免循环或启动副作用；仍未创建或启用真实凭据库。新增多进程路径测试验证不同日志根共享 profile、相同目录复用、环境/运行中改根不漂移、相对 profile 路径启动时固定及路径定义不落盘。隔离 `/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b1-credential-owners-s4gb7cuf` 全量 **1029/1029、无失败钩子、0 skip** 通过；Python 3.9 不支持 tar filter，快照创建命令调整后成功，未把前次启动失败算作测试通过。首次 git add 遇瞬时 index.lock，确认已自行释放后重试，未删除锁或修改外部 Git 配置。

第九笔 `ce5d639` 已提交搜索与替换保护：rg 在客户端 glob 后追加转义后的私有目录排除项，并过滤返回路径；Node walk/git 候选及打开后的 descriptor 均执行策略；批量替换在读取和写入前保护私有路径及硬链接别名。4 项新回归覆盖 Node/实际 rg、带 glob 元字符的目录、普通同名项目文件、硬链接、显式/全量替换与打开时 inode 替换，合成密钥和备份原内容保留。隔离 `/tmp/cxv-b1-private-search-o7z9vzi1` 全量 **1028/1028、无失败钩子、0 skip** 通过。目录操作、附件及运行时尚未完成，不把此子项标为完整加密迁移。

已追踪本地 `interceptor.js` 的 PROFILE_PATH：默认固定在 `~/.codex/cx-viewer/profile.json`，也可由 CXV_PROXY_PROFILE_PATH 独立指定；auth/IM 则由 LOG_DIR 归属。若把共享 profile 的 apiKey 移入某个实例的 LOG_DIR vault，其他使用不同 LOG_DIR 的新版实例将失去凭据。因此用户已确认按配置归属分库，见 [方案](./B1-credential-migration-proposal.md)；当前没有改写用户配置。

第八笔 3cace4e 已执行私有文件策略：内容 GET/POST、raw GET/HEAD（含上传预览）拒绝 vault/key/备份和别名；打开后再核验 descriptor，写入在 ftruncate 前拒绝私有 inode，非阻塞打开避免特殊文件悬挂。实际 HTTP 覆盖 editorSession、HEAD、硬链接及原内容不变，单测另注入打开时替换 inode；隔离 /tmp/cxv-b1-private-endpoints-gi957y8z 全量 1024/1024、无失败钩子、0 skip。仅该批端点完成，搜索、目录操作和附件入口仍待接入，凭据运行时仍未启用。

第七笔 ad19a34 已提交冻结路径及私有文件策略定义，共享 canonical 路径解析，涵盖 vault、key、备份树以及符号/硬链接别名；尚未接端点。隔离 /tmp/cxv-b1-file-policy-s4_s3rz5 全量 1022/1022、无失败钩子、0 skip 通过。下一笔在真实内容/raw 端点执行策略，并对打开后的 descriptor 再检验，避免路径校验后被替换为私有文件。

B5 安全前置第六笔 `b4051ed`：修复 B0 本地复现的相对符号链接越界，统一内容 GET/POST 与 raw 路径解析；新文件用最近已有祖先的真实路径校验，悬空链接不视为不存在，只有布尔 true 开启原有 editorSession 行为。普通读写、项目内链接和显式编辑器路径保留。1 个产品文件、2 个测试文件，先红后绿；隔离 `/tmp/cxv-b5-file-boundary-o15_yhmy`（临时 CODEX_HOME、隔离全局 Git 配置）全量 **1019/1019、无失败钩子、0 skip** 通过，含真实 HTTP GET/POST/raw 越界拒绝。此为本地安全适配，不假称上游某同名文件补丁直接解决；尚未覆盖所有文件端点、私有 vault 读取策略或完整并发 TOCTOU 攻击，故凭据接入仍未启用。

第五笔 `4a8c0e9` 已提交独立、路径注入的私有 credential store，复用 V2 文件锁与原子 JSON 写入；读取无副作用、不缓存 key，缺失和显式空值区分，已有密文时丢钥/换钥/损坏文件拒绝读写，不产生替代 key。校验目录/文件权限、文件类型、链接数和打开身份；支持幂等写入。仅 1 个产品文件与 1 个测试文件，仍未接入运行时。

验证：7 项新 store 测试及 3 项密码学测试通过，包含跨进程重启、两进程共 40 条加密记录、损坏/篡改、链接保护和原子写失败保留原文件。首次全量与首次 Git 定向重跑的断言通过，但 Git 清理钩子出现 ENOTEMPTY，残留目录为 `.git/ai`，与既有 B0 环境问题一致，未当作完整通过。仅在测试子进程设置 `GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1` 后，Git 定向 29/29 和全量 **1015/1015、无失败 suite hook、0 skip** 通过；未修改用户 Git 配置或声称已修复外部工具竞态。隔离路径 `/tmp/cxv-b1-store-trv3h1nd`，结果见 full-test-isolated-git.log。后续先修文件读取边界，之后才接 auth/proxy/IM 和迁移工具。

用户已选择“升级后仅新版”，无需继续等待该决策。第四笔 `fc7d677` 已实现纯 AES-256-GCM 原语（无文件/运行时接入），随机 IV、版本化严格编码、kind/ref 附加认证、空值和精确 Unicode 往返，以及篡改/错钥/错身份失败验证。仅 1 个产品文件与 1 个测试文件；隔离 `/tmp/cxv-b1-vault-jvezx8kv` 全量 **1008/1008、0 skip** 通过。上游 `3e7f047290/811b049485` 的加密能力部分迁移；本地采用带版本和身份绑定的封装，不承诺与上游密文文件互读。下一笔为私有密钥/密文存储，之后才做访问边界及运行时接入，未进行真实凭据迁移。

B1.1 第三笔已提交 `aaf3dab`：`workspace-registry.js` 在锁内严格读取；损坏 JSON、错误容器或非法编码禁止覆盖；保存错误传播到 API/CLI，临时文件清理；释放锁核对 dev/ino，保留替代锁。复用已有 renameSyncWithRetry，不引入通用存储 kernel。本地 1 个产品文件、2 个测试文件；新增实际 HTTP 损坏后恢复、写错误注入、两进程 40 项注册及锁归属回归，隔离 `/tmp/cxv-b1-registry-qwr67dw9` 全量 **1005/1005、0 skip** 通过。平台/GUI 未验证，已有基于锁年龄回收策略尚未整体重设计，不宣称所有长时间锁竞争均已解决。

三笔配置数据保护已实现，用户已选择单版本加密迁移，具体兼容冲突、逐笔方案和验收见 [B1.2 凭据迁移方案](./B1-credential-migration-proposal.md)。当前已完成条件启用的 auth/proxy/IM 适配，继续持久回执及迁移工具；不剥离真实用户字段，不运行真实配置迁移。

先逐条追踪 auth、proxy profile、钉钉 appSecret 的读写、路径与现有备份，确认旧进程并发、恢复方式和缺失密钥时的行为，再确定密钥存储及迁移。迁移须先验证备份可恢复，原子写入并读回确认，失败拒绝、允许重复执行、记录版本和回滚步骤；不要读取或修改 Codex 自身 auth.json。上游凭据根的中间 live-LOG_DIR 修复已被回退，必须以最终修复为准。

相关上游提交：[4c5e633e68](./cc-viewer-alignment-commit-ledger.md#commit-4c5e633e68)、[3e7f047290](./cc-viewer-alignment-commit-ledger.md#commit-3e7f047290)、[739f49a6de](./cc-viewer-alignment-commit-ledger.md#commit-739f49a6de)、[565613bbea](./cc-viewer-alignment-commit-ledger.md#commit-565613bbea)。数据格式与回滚按已确认的单版本/配置归属方案实施；B1.2 仍未完成迁移工具和真实用户迁移，不应将运行时适配视为整个 B1 完成。
