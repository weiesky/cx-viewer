# B11 提交整合、CI收口与合并

2026-11-23按用户明确要求完成“本次变更合成一个commit、PR到main、由代理自行合并、合并完成以后更新文档”。[PR #13](https://github.com/weiesky/cx-viewer/pull/13)已于 **2026-11-23T07:19:32Z** 合并；本记录和本轮进度更新均在确认合并之后编写。

| 身份 | 完整值 |
| --- | --- |
| 原main基线 | `a3fbc0f06ff42119a33f24a252e36b621269316e` |
| 原始34笔末端 | `64288c88f93497a7641341624b77635ea6769967` |
| 原始tree | `13c9f51fc60ef957a3c1be4ea915c3f63d588623` |
| 首轮精确整合commit | `d09bcddf596bc217e9e97e3a178d11af7648ec26` |
| 最终单笔feature commit | `539822e93ae2e3b6d16b56cff545791d40248f36` |
| 最终feature/merge tree | `34f3be16ae088392205d69be9b3dd403d2114b33` |
| main合并commit | `3a4bf400017a41732c3aab12d3041d952fc8a0eb` |

先备份34笔原始历史并验证bundle，再将基线之后的本次变更整为一笔、推送并创建PR。首轮整合与原始末端的tree和相对基线diff精确一致，当时622个变更文件。实际远端CI发现可复现问题后，逐项修正、验证，再以明确的旧head约束更新该单笔feature commit；未强推main。最终相对基线636个变更文件，远端2260条tree记录与本地逐项一致，PR中仍只有一笔feature commit。10项检查成功后执行squash合并，读回确认MERGED、合并时间、父提交和tree；本地main随后快进到合并提交。

**原始tree与首轮精确整合tree相同；最终tree包含18条路径的CI后续修正，因此与原始tree不同。最终feature、本地/远端以及合并tree相同。** 不能将这三个检查点混写成全程无代码变化。完整34笔hash/tree/父提交、备份、18条路径与最终交付身份见[映射JSON](./B11-original-commits-2026-11-23.json)。[E1–E33本地映射](./B11-local-commits-2026-11-23.json)保留原检查点语义，E34完整身份以新映射为准。

## 备份与可恢复性

`backup/b11-raw-20261123`保留全部34笔原始提交。已验证原始bundle：`/Users/sky/.codex/backups/cx-viewer/B11-20261123/raw-before-consolidation.bundle`；最终bundle：`/Users/sky/.codex/backups/cx-viewer/B11-20261123/final-539822e.bundle`，保留最终feature、原始历史及中间CI检查点。`backup/b11-first-squash-20261123`和`backup/b11-ci-pass1-20261123`至`pass5`亦保留。外部原始记录在同目录`original-commits.json`，不依赖重写后的分支寻找旧提交。

## 远端CI发现与修正

这些修正沿原调用链解决实际失败，均折入最终单笔feature commit；未取消失败检查或修改用户已选方案。

- Changesets原命令依赖本地main，远端detached/shallow checkout失败。CI取完整历史并用`origin/main`作基线；真实detached夹具先复现失败，再验证修正。
- Windows任务中模拟POSIX目标平台时误用宿主路径拼接。发现器按目标platform选择Node内置`win32.join`或`posix.join`，实际本机语义保持。
- Node20没有浏览器WebSocket全局对象。Web测试夹具显式提供连接状态常量并按既有方式还原；禁用Node WebSocket全局后808项Web测试通过。
- Linux已退出但尚未回收的僵尸进程仍可响应`kill(pid,0)`，SIGKILL完成也存在调度间隔。测试复用有界退出等待，接受ESRCH或Linux `/proc`明确的Z态；真实存活进程负例证明不会误判，原有“兄弟进程仍活着”断言保留。
- 并发凭据任务暴露协调锁正常释放/替换时的元数据竞争：open前后移除、已观察到nlink=0及加密库原子替换。仅对应锁预检与不可变库读取允许一次严格重新读取；key、source、写入预检、描述符/私有权限/硬链接和密文认证门保持。确定性红测先复现，随后新增锁释放、零链接与库替换回归；Node24与实际20.12上的key修复、auth和IM并发分别压力复验通过。
- CLI夹具的浏览器打开标记可能早于stdout管道到达；断言前等待既有有界输出条件，产品CLI不变。全新安装探针复制退出helper并纳入新增及凭据回归。

最终head `539822e`的[CI回执](./B11-remote-ci-2026-11-23.json)记录合并前 **10/10 SUCCESS**：push和PR各一次，每次Ubuntu Node20.x/22.x/24.x全套/build/pack，加macOS和Windows定向合同。运行：[45129697080](https://github.com/weiesky/cx-viewer/actions/runs/45129697080)、[45129691111](https://github.com/weiesky/cx-viewer/actions/runs/45129691111)。Windows合同有1个POSIX专用shell夹具跳过，不能称为Windows完整运行验收。合并后的文档推送检查是另一轮，以上结论只指合并前最终代码。

首次失败和修正日志保留，包括`/tmp/cxv-b11-ci-lock-race-red.log`、`/tmp/cxv-b11-ci-zero-link-red.log`、`/tmp/cxv-b11-ci-store-snapshot-red.log`及对应通过/压力日志；日志路径是当前环境线索，正式身份、范围和检查链接已落入仓库JSON。

## 最终代码与产物验证

| 验证 | 实际结果 |
| --- | --- |
| 本地完整正常pnpm test | Electron9/content7/core28/Web808/app1725/integration246，共2823/2823，0fail/0skip |
| 最终build与真实pack | 通过；626稳定路径、601源码门 |
| 全新生产npm安装 | 1237/1237，825包文件/211Web逐字节一致；B1.2及安装CLI相对-C启动通过 |
| core/content安装合同 | 28旧别名同实例、内容路径回退通过 |
| 严格六workspace/桌面stage | 冻结安装/build；最终stage重新部署825全字节、395链接边界、独立server启动/HTTP/stop通过 |
| 实际Node20.12.0 | 当前macOS全新安装独立启动/HTTP/stop及93/93定向，0skip；非最低Node完整套件 |
| 浏览器 | E34的Chromium/WebKit共14配置30图；最终211个Web文件与该次产物逐字节相同，本轮未重复浏览器验收 |
| AST边界 | 530源文件、14精确例外、0违规，原26门夹具通过 |

当前回执：[总验证](./B11-validation-2026-11-23.json)、[安装](./B11-installed.json)、[最低Node](./B11-node-floor.json)、[桌面stage](./B11-electron-stage.json)、[stage启动](./B11-stage-runtime-boot.json)。原合并前本地检查点保存在[旧回执](./B11-validation-pre-consolidation-2026-11-23.json)，不以旧2820/1197替代最终2823/1237。

## 合并后进度与剩余边界

合并后更新AGENTS、专项README、规划、提交台账、完成/候选矩阵、工程入口及各验证JSON，再以单独文档提交推送main。本记录不自写文档提交hash，避免为自引用再生成提交；代码身份固定为上述合并提交。

201候选均按原生子项给出处置，不能据12/12工作包交付推断337条混合上游或所有环境都已验收。仍待Windows完整运行、Electron GUI/签名/公证、最低Node完整套件、真实DingTalk/外部模型、LAN-TLS/真实DNS、长等待/睡眠、物理触控/IME/音频/密码插件、历史IM偶发、真实全局升级及用户凭据迁移。实际Electron下载的ENETDOWN/超时记录保留。

合并后只读核对7008仍PID97674、普通PTY/队列可用、旧式version=1.1.20，见[回执](./B11-active-entry-readonly.json)。未停止或重启用户实例，正常重启才加载新后端；新dist和链接不代表新后端已加载。原生审批/reviewer、独立AppServer、常驻transport、Ask托管默认关、后端TLS密码门、retry排除及30分钟run上限保持；实际版本1.1.20，未建tag或发布npm。
