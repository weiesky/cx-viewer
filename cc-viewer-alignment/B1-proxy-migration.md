# Proxy 凭据显式迁移（63664dd）

最新恢复入口：36d0697 已实现 live 库可读时的三类配置安全恢复；auth 按用户选择回退整个 preferences。操作、失败边界及最新1144/1144/实际 tarball 证据见 [恢复说明](./B1-recovery-scope.md)。下文保留原迁移批次的验证时点，真实凭据仍未操作。

对应上游加密及审查修正链 3e7f047290 / 811b049485 / 739f49a6de / 3c78188314 的 proxy 子项。B1.2 未整体完结。代码在 codex/pnpm-workspace 工作树的新结构中；未切换全局实例或真实用户配置。

从工作树根目录运行，路径必须明确指定：

```sh
node packages/app/scripts/migrate-proxy-credentials.mjs --profile /absolute/path/profile.json
# 停用所有共用该配置的进程之后，才执行：
node packages/app/scripts/migrate-proxy-credentials.mjs --profile /absolute/path/profile.json --apply --confirm-stopped
```

npm 安装产物内脚本位于 scripts/migrate-proxy-credentials.mjs。默认检查不建库、不建备份、不改 source。输出仅含状态、当前/备份第三方 profile 数量，apply 成功或不完整失败时附 backupPath，不输出密钥。

迁移复用 HTTP 保存的 profile 源锁，验证当前文件、可选 .bak 和其所在目录共用 store/key 的私有快照后，先替换 .bak、再当前文件、最后写入配置身份回执。每次切换前比较两份源的精确字节（包括 .bak 缺失），源与目录 fsync 后读回比较运行时语义。保留当前和备份的不同密钥版本、v1 忽略的 effort 与推断 wire API、未知元数据及 JSON 自有键。不存在的 .bak 不生成；当前缺失却有备份时拒绝自动推断恢复。

状态为 absent / legacy / partial / pending-receipt / migrated。partial 代表两份 source 切换中断，pending-receipt 代表已加密但尚未完成回执。失败后保持共享进程停用，用同一显式 apply 命令续跑；已加密 source 保留原引用。硬退出遗留锁沿用运行时 60 秒、死进程归属的过期回收规则。此测试模拟过期，没有承诺断电恢复或消除等待期。已完成迁移的重复执行不改 source/store、不新增快照。

只在两份当前 source 都可安全解码后清理明确未使用的暂存引用；若无法确认，保留密文供恢复。receipt 写入之前同时验证两份 source，之后运行时拒绝缺失当前文件、旧格式整体替换、丢 key 或坏引用。旧版程序不能在迁移后继续写入。

私有快照保留旧 source（可能含明文）、匹配 store/key 和完整性清单，受已有私有文件策略保护。它是共享库的快照；live 可读库恢复已补齐，完整库损坏恢复尚待，不能直接用整份旧 store 覆盖后来其他配置的凭据。不同时间点的 source/key/store 不可混配。

验证：临时目录与合成密钥，定向 34/34（含原子写碰撞、迁移、适配器及实际 HTTP/合成上游）、隔离全量 1117/1117、0 skip、无失败钩子；pnpm build 与 npm dry-run 674 文件通过。日志 /tmp/cxv-b1-proxy-migrate-FYgGvqHS。共享库测试首次使用了不支持的测试 kind，改为实际 im-secret 后通过。未验证真实模型 CLI、真实凭据、GUI、DingTalk 网络、Windows/Linux、全局升级或断电。
