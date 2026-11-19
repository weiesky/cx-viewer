# Auth 显式迁移入口（fa25aaa）

最新恢复入口：36d0697 已实现 live 库可读时的三类配置安全恢复；auth 按用户选择回退整个 preferences。操作、失败边界及最新1144/1144/实际 tarball 证据见 [恢复说明](./B1-recovery-scope.md)。下文保留原迁移批次的验证时点，真实凭据仍未操作。

此入口只处理 cx-viewer 的 `<LOG_DIR>/preferences.json` 中全局和项目认证密码，不读取 Codex 原生 `auth.json`，不迁移 profile 或 IM。当前只用临时目录及合成凭据验证，未执行任何真实用户迁移。

以下命令从 A2 源码工作树根执行；扁平 npm 安装仍可在安装包目录用 node scripts/migrate-auth-credentials.mjs 执行相同入口。默认检查，不创建源文件、key、store、备份或锁：

```sh
pnpm --filter cx-viewer exec node scripts/migrate-auth-credentials.mjs --root <LOG_DIR>
```

输出只含状态与作用域数量，不含密码、引用或配置内容。`legacy` 表示待迁移，`absent` 表示无认证作用域，`migrated` 表示已迁移并验证回执，`pending-receipt` 表示源已使用可解密引用、待补齐持久回执。损坏数据或降级文档直接失败，不按未配置处理。

以下是已实现的显式应用入口；真实应用前须停用所有共享这份配置的旧版及新版进程，包括共用库的其他实例：

```sh
pnpm --filter cx-viewer exec node scripts/migrate-auth-credentials.mjs --root <LOG_DIR> --apply --confirm-stopped
```

仅添加 `--apply` 不会执行。程序不会自动停止或证明进程已停用，`--confirm-stopped` 是操作者的明确声明。live 库可读时的恢复入口已补齐，完整库损坏恢复尚待，真实迁移及回退演练仍待验收。

应用时持有现有 preferences 源锁，先保存并读回验证私有恢复快照，然后暂存、逐条解密比对，在源文件和父目录 fsync 后核验语义，最后写入并核验加密回执。全局、项目覆盖、明确空密码、revision 和无关配置保持；已经迁移的再次应用不改动文件或生成新备份。源版本已切换但回执尚未完成时，重新应用会先生成匹配快照，再持久写源并补回执，不替换密码引用。

恢复快照位于 `<LOG_DIR>/credential-backups-v1/snapshot-*`，目录 0700、文件 0600（Windows 权限行为待目标环境验证），含原始 preferences 字节、明确的缺失状态及同一时点的 store/key（包括迁移回执）。其中可能包含旧密码及主密钥，必须保留在私有位置。它只列入本次 auth 源文件；store 可能同时含 IM 或同目录 profile 的记录。**不要把旧快照的整个 store/key 覆盖到后来已有其他配置更新的共享库**。live 恢复工具将保留其他配置；当前没有提供这种直接覆盖命令。

失败返回 `CREDENTIAL_MIGRATION_INCOMPLETE` 时同时返回 `backupPath`。保持共享配置进程停用，保留源、库、key 和备份，先重新执行只读检查。源仍是旧格式时可重试；源已迁移且可解密时可重试补回执。丢 key、损坏密文、source 删除或整体降级不会通过重试自动清空或重建。现有源锁按 10 秒年龄回收，硬退出后可能需等锁过期再重试；本轮没有改造长时间锁竞争策略。

验证包括 CLI 检查/应用、两进程串行、子进程重启、源提交前失败、提交后目录 fsync/回执失败，以及子进程在源 rename 后退出、模拟现有锁过期后的继续执行；HTTP/WS 使用迁移产生的真实配置通过。最终隔离全量 1099/1099、构建和打包预览（1014 文件）通过，首次 readiness 计时失败及重跑见 [B1 实施](./B1-config-implementation.md)。真实用户配置、真实模型 CLI 全流程、GUI、Windows/Electron、跨平台、断电及高负载验收仍未完成。
