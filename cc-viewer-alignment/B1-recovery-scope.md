# 共享库安全恢复：已确认范围

最新补齐：0122f7e 在匹配 key 可认证全部当前记录时支持只修 key，20ce331 可显式保存坏库现场；源文件和密文不回滚。普通配置恢复仍要求 live 库可读，必要时先修 key。新操作与最终1161/1161、实际680文件产物证据见 [key修复](./B1-key-repair.md)；用户已于 2026-11-18 确认保留现场并拒绝覆盖，不提供有损整库回退。

auth、proxy、IM 的显式迁移均已实现并验证；恢复入口 36d0697 已通过全量及实际 tarball 检查，尚未执行真实用户恢复。用户此前已确认升级后仅使用新版、按配置归属分库；其他配置的凭据必须保留。

恢复明确指定 owner、配置类型和已验证快照，默认只读预览，apply 必须声明共享进程已停用；实际应用前再次保存并验证当前状态快照。读取旧快照自己的匹配 key 解密目标凭据，在现有可读 live 库中暂存新的 owner 绑定引用，持久切换目标 source 后核验并完成回执。旧备份也恢复为新版加密格式。不得用旧 store/key 覆盖整份共享库，不向输出或公共目录导出其他配置的凭据，也不自动重建丢失的 live 主密钥。live 库已损坏、不能保证其他 owner 可读时，保留现场并报告需要完整匹配备份的专项恢复；不将局部恢复冒充全库修复。

用户本轮已明确选择“恢复整份偏好文件”。因此 auth 回退整个 preferences.json，包含主题等非认证设置。已确认的范围差异：preferences.json 同时包含 auth、authByProject 和主题等非凭据设置。

| 方案 | auth 恢复行为 | 影响 |
| --- | --- | --- |
| 按 auth 配置段恢复（未选择） | 从快照恢复 auth/authByProject 的密码、开关和作用域；合并当前非 auth 字段。 | 保留备份之后其他偏好修改；需要可安全读取当前 preferences。 |
| 整份源文件恢复（已选择） | 将 preferences.json 的全部设置恢复到快照时点，再编码为新版凭据引用。 | 主题及其他偏好也回退；需在预览中明确列出整个文件被替换。 |

两方案都保留共享库其他 owner，保持已确认的新版运行策略。proxy 按所选 profile 文件及已知 .bak 作为配套配置恢复，包含 endpoint、active 和模型选项；IM 按所选 IM 配置恢复，包含 appKey、secret、allowlist 与开关，避免跨账号配对。按此选择实施恢复入口和故障/中断测试；真实恢复仍需操作者明确执行并停用共享进程。

## 已实现的命令

从新工作树根运行；npm 安装产物去掉 packages/app/ 前缀：

```sh
node packages/app/scripts/restore-credentials.mjs --root /absolute/owner --type auth --backup /absolute/owner/credential-backups-v1/snapshot-xxxx
# 停用所有共享配置/库的进程后才显式应用：
node packages/app/scripts/restore-credentials.mjs --root /absolute/owner --type auth --backup /absolute/owner/credential-backups-v1/snapshot-xxxx --apply --confirm-stopped
```

IM 用 --type im（root 为 LOG_DIR）；proxy 用 --type proxy --profile-name profile.json（root 为 profile 所在目录）。没有默认 root、快照或配置名；不能跨 owner 拼接快照。预览返回 whole-source 和文件存在状态，验证快照完整性、归属、live 库及源路径，不创建锁或临时副本；应用时才在私有暂存目录复用三类现有迁移命令完成格式/语义验证，避免再实现一套密码解码器。

每次 apply 都先生成安全快照，即使目标值已经相同；有效相同引用会复用，保留当前主密钥及其他 owner 的最新记录。损坏的普通源 JSON 可以恢复；符号/硬链接等不安全路径拒绝覆盖。快照原来缺失的配置在新版中显式表示为空认证、停用 IM 或 max profile，保留防降级回执；缺失的可选 .bak 仍恢复为缺失。whole-source 恢复会移除备份之后新增的偏好字段，这是用户本轮确认的范围。

恢复中断返回 CREDENTIAL_RECOVERY_INCOMPLETE 和此次安全备份 backupPath。所有共享进程继续停用，用相同的原始 --backup 参数重试；如需撤销本次恢复，再明确选择返回的安全备份。proxy 仍按 .bak→当前文件→回执切换，不能把两次 rename 描述为整体原子提交。源与目录同步失败不删除可能已经引用的密文；失败可能保留私有的无用密文。正常结束删除暂存目录，硬退出可能遗留 credential-backups-v1/restore-stage-*，其中可能含旧明文及 key，仍受 0700/0600 与原有私有文件策略保护，未实现自动清理。沿用 auth 10 秒年龄锁、proxy/IM 60 秒死进程锁；未承诺长时间竞争或断电恢复。

普通配置恢复对于只剩 key、store 丢失，或 key 丢失/密文损坏的 live 库均拒绝局部恢复；两者原本都不存在的旧配置可正常恢复。完整共享库损坏恢复仍需匹配全备的专项方案，未提供会丢弃其他后续凭据的自动重建选项。

## 验证证据

- 恢复 15 项回归进入最终全量：整份偏好（含 __proto__ 自有键/明确空密码/项目）、旧 key 快照重新绑定新 live key、其他 owner 后续记录、proxy 两版本和缺失 .bak、IM 配对配置、损坏当前 JSON、坏快照、rename/目录 fsync/回执失败、外部源变化、丢 key/store、明确缺失、CLI 只读/并发/重启及硬退出续跑。
- 最终全量 1144/1144（Electron 5、web 142、app 794、根 203），无失败钩子、0 skip；构建和 npm 677 文件预览通过。最后的 key-only 边界补充后重新完成全量及构建。
- 实际 npm tarball 解包后逐一预览/apply auth、proxy、IM；每个阶段新 Node 进程检查运行时值，确认 auth 整份偏好回退、其他配置后续 secret 保留、live key 不变。证据 /tmp/cxv-b1-proxy-migrate-FYgGvqHS/recovery-tarball/result.json。
- 首轮全量 app 793/794，既有 readiness 100ms 测试在调度负载下超时；43150d4 仅将两项测试上限调为 2 秒、延迟建锁宽限调为 1 秒，保留原有探针/就绪断言，定向 6/6，随后两次全量均 1144/1144。最初恢复测试将 auth 不可读状态误判为抛错，修正测试断言后通过。保留 recovery-full-test.log、recovery-full-test-final.log、recovery-full-test-boundary.log 及 build/pack 日志。

本轮真实凭据与活动全局实例未变；B1.2 的真实环境验收和完整共享库损坏恢复未完成。GUI、真实模型 CLI、DingTalk 网络、Windows/Linux、签名、全局升级、最低 Node/远端 CI、高负载与断电未验证。
