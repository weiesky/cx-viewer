# 无损 key 修复与损坏现场留存

本轮提交：3f81fbc（全库离线验 key）、8732a33（明确用途的损坏证据）、0122f7e（无损 key 修复）、20ce331（取证命令）。适配上游 3e7f047290 / 811b049485 / 739f49a6de / 3c78188314 的凭据安全与恢复子项；不代表相关上游提交或 B1 已全部完结。

当前支持：在备份 key 能认证每一条当前记录时，只修复 key，保留当前配置和密文的精确字节，包括备份之后更新的凭据、后来新增配置的凭据和迁移回执。普通配置恢复 36d0697 仍要求 live 库可读；key 修复成功之后才能执行原有按配置恢复。auth 仍按用户已确认的范围恢复整份 preferences。

用户已于 2026-11-18 选择：无法无损修复时保留现场并拒绝覆盖，不增加有损整库回退。该产品选择已收口，不再列为待决事项；不能据此声称损坏数据已恢复。

## 备份前提

key 修复必须使用同一 owner 中通过正常快照验证、含有匹配 key 的备份。首次迁移之前的快照可能没有 key；它保存旧配置的原始数据，不能据此推导迁移时新生成的随机 key。因此真实迁移验收必须包含：所有共用进程仍停用时，在迁移成功后追加并验证一份含新 key 的正常快照。现有迁移命令不会自动创建这份迁移后快照，不能把其返回的迁移前 backupPath 自动视作 key 灾备。

复用现有快照原语即可；下面是从工作树根执行的 auth owner 示例（必须替换真实绝对路径，且仍保持共享进程停用）：

```sh
node --input-type=module -e 'import { createCredentialBackup } from "./packages/app/lib/credential-backup.js"; console.log(createCredentialBackup("/absolute/owner", ["preferences.json"]));'
```

快照包含所选 source，以及同一时点的完整 store/key。它不等于所有配置 source 的全备。auth/IM 跟随 LOG_DIR，proxy 跟随 profile 所在目录；不同 owner 分别操作，同目录复用库。profile 快照通常列 current 与 .bak 两个源；自定义文件名必须使用真实名称。

## 默认只读检查与显式修复

从新工作树根执行；npm 扁平安装去掉 packages/app/：

```sh
node packages/app/scripts/repair-credential-key.mjs --root /absolute/owner --backup /absolute/owner/credential-backups-v1/snapshot-xxxx --source preferences.json
# 停用所有共用该库的进程后，才执行：
node packages/app/scripts/repair-credential-key.mjs --root /absolute/owner --backup /absolute/owner/credential-backups-v1/snapshot-xxxx --source preferences.json --apply --confirm-stopped
```

--source 必须与所选正常快照 manifest 中的源列表完整一致；多源快照重复传入参数。例如 profile 快照同时提供 --source profile.json --source profile.json.bak，即使 .bak 在快照中是明确缺失。默认检查不创建文件、key、锁或备份，只输出 healthy / repairable、key-only 和记录数量，不输出明文、密文或 key。

修复会先用候选 key 认证当前库的全部记录，至少一条记录才构成可应用的候选证明；只验证目标 auth/profile/IM 的部分记录不够。显式应用先保存损坏证据，再持有实际 store 写锁重新认证并核对字节及所选 source，原子、0600 替换 key、fsync 目录，再复核所有记录。source、store、其他配置和回执均不重写。

healthy 表示现有 key 已可读取整个当前库，无需替换；apply 会持锁复核并同步目录，正常情况下不新增证据。这也能完成前次 key rename 成功、但目录 fsync 失败后的持久化。并发显式修复若已由另一进程完成，则确认最新库 healthy 并保持其字节不变。

失败返回 CREDENTIAL_KEY_REPAIR_INCOMPLETE 时附 evidencePath，保持所有共享进程停用，先 inspect 再用同一正常备份重试。rename 后失败不会把已经恢复的好 key 改回缺失或坏值。硬退出后的 store 锁沿用 60 秒、死进程归属的回收规则；测试模拟过期，不声称断电恢复或消除等待。

## 密文损坏与保存现场

以下情况拒绝 key 修复：库文件缺失、无记录可证明候选、候选来自不同 key、任意一条当前密文损坏、路径存在符号/硬链接或不符合私有权限、证据保存失败，以及写入前发现未预期的当前字节变化。当前库健康且为空时可以报告 healthy，但空库不能证明一个替代 key 正确。

不能安全修复时，可以显式保存原始现场。它不会改 live source/store/key，也不是普通恢复快照：

```sh
node packages/app/scripts/capture-credential-damage.mjs --root /absolute/owner --source preferences.json
# 停用共享进程后，明确保存现场：
node packages/app/scripts/capture-credential-damage.mjs --root /absolute/owner --source preferences.json --apply --confirm-stopped
```

默认只输出文件存在状态和字节数。apply 在受保护 credential-backups-v1/snapshot-* 下保存精确字节、缺失状态和完整性清单，manifest 明确带 purpose:damaged-store-evidence-v1。目录 0700、文件 0600，复用私有路径、锁、文件/目录 fsync 与读回核验。它验证现场字节完整性，不承诺坏密文可解密；readCredentialBackup 和普通恢复命令明确拒绝这种用途，只有 readCredentialDamageEvidence 读取。正常快照也不能冒充这种证据。

没有匹配 key 或原始密文已丢失时，不能承诺找回备份之后未知的 secret。此时保留证据与已有匹配备份，等待完整回退范围的选择；不静默换成旧库，也不生成新 key 覆盖现场。取证本身可能包含旧明文及坏 key，必须继续留在私有位置。

## 验证证据

- 3f81fbc 定向 12/12、全量 1145/1145；8732a33 定向 25/25、全量 1148/1148。
- key 修复新增 11 项：缺失/短/错误 key、真实换 key 后的不匹配备份、备份之外记录损坏、空/缺失库、别名、证据失败、rename 与提交后目录同步失败、外部 source/store 变化、CLI 默认只读/参数/并发、新进程与硬退出续跑。0122f7e 批次全量 1159/1159。
- 取证 CLI 新增 2 项，含无效 UTF-8/坏库/短 key 的原字节保存、明确缺失、正常恢复拒绝、输出不含凭据、错误参数/重复源/别名拒绝。定向 12/12；最终全量 1161/1161（Electron 5、web 142、app 811、根 203），无失败钩子、0 skip。本轮没有失败后隐去或重复放宽断言。
- pnpm build、npm 680 文件预览通过。实际 tarball 解包后，迁移三类配置并在备份之后修改 secret、增加新的 profile owner；key 丢失后默认检查不落盘，显式修复及重复应用通过，source/store 精确字节保留，新 Node 进程读回所有最新 secret。任意记录损坏后拒绝写 key，再显式捕获损坏证据且 live 字节不变。
- 日志 /tmp/cxv-b1-key-repair-Dyhfyq6i：proof-full.log、evidence-full.log、key-targeted.log、key-full.log、damage-cli-targeted.log、final-full.log、final-build.log、final-pack.log；实际产物报告 tarball-key-smoke-final/result.json。

真实用户凭据、活动全局实例未修改。真实模型 CLI、GUI、DingTalk 网络、Windows/Linux、签名、全局升级、最低 Node/远端 CI、高负载与断电仍未验收。下一步见 [B1 验收矩阵](./B1-acceptance-matrix.md)。
