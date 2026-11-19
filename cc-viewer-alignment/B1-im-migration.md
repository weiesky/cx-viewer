# IM 凭据显式迁移（c52565b）

最新恢复入口：36d0697 已实现 live 库可读时的三类配置安全恢复；auth 按用户选择回退整个 preferences。操作、失败边界及最新1144/1144/实际 tarball 证据见 [恢复说明](./B1-recovery-scope.md)。下文保留原迁移批次的验证时点，真实凭据仍未操作。

本笔适配上游凭据加密及审查修正链 3e7f047290 / 811b049485 / 739f49a6de / 3c78188314 的 IM 子项。普通启动、保存及清空 secret 不会自动迁移。未操作真实凭据或真实 DingTalk 网络。

从 A2 工作树根执行，必须明确指定 LOG_DIR：

```sh
node packages/app/scripts/migrate-im-credentials.mjs --root /absolute/LOG_DIR
# 停用所有共享该配置及凭据库的进程之后，才执行：
node packages/app/scripts/migrate-im-credentials.mjs --root /absolute/LOG_DIR --apply --confirm-stopped
```

npm 扁平安装产物内脚本为 scripts/migrate-im-credentials.mjs。默认仅检查，不建 IM 目录、锁、备份或库。输出只含 status、enabled、hasSecret，应用时可附 backupPath；不输出 appKey、secret、引用或其他配置内容。确认停用参数是操作者声明，工具不会自行停止进程。

复用 IM 严格解析器、现有源锁（2 秒竞争等待、60 秒死进程过期回收）、私有文件写入及凭据解码器。只允许冻结凭据库对应 LOG_DIR，禁止运行中改根后将凭据写到另一库。验证 config.json 与同目录 store/key 的匹配快照后暂存、读回 secret，原子切换并严格 fsync 源目录，读回核对运行时语义，最后写回执并复核。保留原有 appKey、allowlist、开关、其他元数据和 JSON 自有键；只有 appSecret 换成 owner 绑定引用。

缺失 IM 配置保持 absent；明确停用且无 secret 的配置迁移为 marker + appSecretRef:null，仍不能直接启用。有效旧 secret 依照原有运行时 trim/长度规范迁移。损坏 JSON、错误类型/版本、启用但缺少必需凭据、符号或硬链接、坏 key/ref、迁移后 source 丢失或整体降级均拒绝覆盖。

源提交前失败保留原配置、清理可确认未启用的暂存引用，并保留 recovery backupPath。源 rename 后即使目录 fsync 或回执失败，也保留源引用的密文；检查为 pending-receipt 时保持所有进程停用，原命令可补齐回执，不换 secret 引用。硬退出遗留源锁沿用现有过期规则。重复迁移 migrated 状态不改 source/store 或新增快照。

快照可能含旧明文与主密钥，位于受保护私有目录。同目录 auth/profile 的凭据保留；不能将旧快照的整个共享库覆盖到已有后续变更的 live 库。live 可读库恢复已补齐，完整库损坏恢复尚待，范围见 [恢复方案待决项](./B1-recovery-scope.md)。当前没有执行真实迁移或回退。

验证：定向 47/47（含 HTTP）；最终全量 1129/1129（Electron 5、web 142、app 779、根 203），无失败钩子、0 skip。pnpm build、npm 675 文件预览通过。实际打包并解包后的 auth/proxy/IM 命令在同一合成 owner 下完成默认检查、显式迁移、幂等重试及新 Node 进程运行时解码，共 3 份匹配快照。日志和 tarball 位于 /tmp/cxv-b1-proxy-migrate-FYgGvqHS（im-targeted.log、im-full-test.log、im-build.log、im-pack.log、tarball-smoke/）。

前置 c24fad5 修复 IM 私有写入器在临时文件创建碰撞时误删其他写入者文件的问题，定向 8/8。初次测试注入递归及从根目录运行包内 cwd 依赖测试导致失败，改用原始 fd 注入并从 packages/app 执行后通过；未声称当时失败通过。GUI、真实模型 CLI、DingTalk 网络、Windows/Linux、签名、全局升级、最低 Node/远端 CI、高负载与断电仍未验收。B1.2 仍未整体完成。
