# 本地提交两阶段合并（2026-11-18）

2026-11-18 GitHub 同步：已按用户请求将 main 6045b53 与 codex/pnpm-workspace 2c0edc8 原子推送到 origin 同名分支，远端完整 hash 已读回核对，上游跟踪已设置。未执行强推、分支合并或活动安装切换；未提交的 AGENTS.md 与 cc-viewer-alignment 文档仍保留本地。

用户已选择“按两阶段压缩”：主线 34 笔压成一笔，工作树 11 笔压成一笔。没有合入新目录结构到活动全局目录，也没有推送远端。功能范围与未验收事项保持原状。

## 当前历史

| 阶段 | 原范围 | 新提交 | 文件树 |
| --- | --- | --- | --- |
| main / A1 扁平布局 | origin/main 之后 34 笔，原末端 6287d2a | 6045b53 | 9cc520f92d9054ae3ef61cb2d285620713ae282c |
| codex/pnpm-workspace / A2 新布局及后续能力 | 原 main 之后 11 笔，原末端 20ce331 | 2c0edc8 | cabf3191a793781610538a96d9f37abfccd7de77 |

共同远端基线为 f65d058fd8db9e90f92e3a018e5bbd487822f137。操作前实际查询 origin/main，与本地跟踪引用一致。当前 main 相对 origin/main 为 1 笔，工作树分支再领先 main 1 笔。两个新提交分别复用原阶段末端的同一 Git tree；未重放代码补丁、未改动源码、构建产物或依赖文件。没有执行 checkout/reset/clean 或安装切换。

这是历史压缩，43 笔专项实施记录与 45 笔本地原提交属于不同口径；不会把 337 条上游完成度改变为“两条”。原有上游 hash→本地 hash、验证日志和失败记录继续保留，下面给出聚合映射。

## 旧历史与未提交文件备份

- 主线旧历史：refs/archive/local-consolidation/20261117T160538Z/main → 6287d2a9d459eb904aa2cfe3680cf546c99797ee
- 工作树旧历史：refs/archive/local-consolidation/20261117T160538Z/pnpm-workspace → 20ce3315a965a96ef40faecc4c38a4dd71c15054
- 本地备份目录：/Users/sky/.npm-global/lib/node_modules/cx-viewer/.git/local-consolidations/20261117T160538Z
- consolidation.json 含完整旧/新 hash、tree、45 条映射、归档 SHA-256 与状态。main-uncommitted.tar.gz、workspace-uncommitted.tar.gz 分别包含操作前 AGENTS.md 和整个 cc-viewer-alignment；另有原 status 和 tracked.patch。

archive 引用保留旧对象的可达性，普通 git show <旧hash> 仍可用。未提交文档没有塞进这两笔代码提交；本次只在保留它们的基础上同步当前状态与此映射。暂存区前后均为空。

## 验证

- 远端 main 基线、两阶段线性祖先、34/11 范围及原暂存区已核对。
- 原始未提交文件归档可读并完成 SHA-256 校验后，原子创建两条 archive 引用并更新两个本地分支；更新使用预期旧 hash 比较，避免覆盖意外移动的引用。
- 两阶段旧/新 tree hash 分别完全相等，父关系为 origin/main → 6045b53 → 2c0edc8；当前工作区没有意外源码/暂存差异。
- 此轮只整理历史，没有重复运行代码测试。此前最新代码验证仍为 2026-11-17 的 1161/1161、0 skip、构建/npm 680 文件与实际 tarball key 修复/取证；不能将其写成此次重跑。
- 全局实例未停止或重启、真实凭据未读取/迁移/恢复、远端未推送。

## 原提交到聚合提交的映射

| 阶段 | 原提交 | 聚合提交 | 原主题 |
| --- | --- | --- | --- |
| main | 5a25e58fac92a5e4625a79841bb735fd19646801 | 6045b5324edf7d15f2daaa86ce66371e69098eda | feat: enhance DingTalk integration and skills |
| main | 753fd6c632b5bac8577dfe98f28d666ff3437d28 | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix: align Codex tool catalog and change tracking |
| main | 450affb570c0a7f4ac5ee673bfee070ca0ac04c6 | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(preferences): preserve unreadable configuration on updates |
| main | dc883f36ed7b1d8b6ca6679c5853ccfa90dd8d1e | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(auth): fail closed for unreadable stored passwords |
| main | aaf3dab8a9b0f1ff11ef0d957b2538e874a346f8 | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(workspaces): preserve corrupt registry and propagate write errors |
| main | fc7d67783d934a3b3902d6c4548deeab951f03d8 | 6045b5324edf7d15f2daaa86ce66371e69098eda | feat(credentials): add authenticated encryption primitive |
| main | 4a8c0e9722033383289900ab2552bee2cb4b1539 | 6045b5324edf7d15f2daaa86ce66371e69098eda | feat(credentials): add private encrypted credential store |
| main | b4051ed582730a864b31531567bf16915316262b | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(files): contain relative symlink reads and writes |
| main | ad19a34c7d027eb12d79e00fc480b658a9f4604c | 6045b5324edf7d15f2daaa86ce66371e69098eda | feat(credentials): define protected private file roots |
| main | 3cace4e956534f4fa642ea9f4f91629740f90ff4 | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(credentials): enforce private file policy on content endpoints |
| main | ce5d6396f68b1bc88d8ad32c02b91cd0f1717285 | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(credentials): protect private data from search and replace |
| main | ab7147b60e53b9c0f8fb9a0ef79b98f7aedcbdfc | 6045b5324edf7d15f2daaa86ce66371e69098eda | refactor(credentials): follow configuration owners for private stores |
| main | b6fe3e9bd066b4d215c4ecb2c7dc635abc940d51 | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(credentials): hide private files from directory browsers |
| main | 0419026b65b5c93806e5a338125e336e714e92aa | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(credentials): protect private trees from file mutations |
| main | ecc104833e3f3fabcba0a8d7b477b8cbba0d8ab2 | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(files): handle early child stdin failures without crashing |
| main | 89d20f0e0f2d81eb034df9bf8eeb79fe3110280f | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(credentials): guard file creation and import destinations |
| main | 027d5a110347d6abf880814f05df24eb07c061d8 | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(credentials): protect legacy configuration files and backups |
| main | 3960ffe3726b5aec3ce84d9898c5450a50909ae8 | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(credentials): guard static and document file responses |
| main | c5c0ea0cef86c800d01d65fdcc6962317f1dd0d5 | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(credentials): reject private aliases before log archive copying |
| main | 60def5855a93eb95c2e971f0cd93d376a06c3da2 | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(credentials): guard memory metadata and stats reads |
| main | 325ecbee3713dc127e58fae25bd656cca882ce6c | 6045b5324edf7d15f2daaa86ce66371e69098eda | feat(credentials): stage owner-bound secret references |
| main | e539f4cc45dbe2e1112d85a2e5d3d375ae0ceb1a | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(credentials): read private snapshots across atomic replacement |
| main | a3103466f9d667f907773f5c46e9b771e43ffdc9 | 6045b5324edf7d15f2daaa86ce66371e69098eda | feat(auth): support explicitly migrated encrypted passwords |
| main | 8c17d9c5154be0e403a18db22e1c259037c277de | 6045b5324edf7d15f2daaa86ce66371e69098eda | feat(credentials): decode owner-bound proxy profile secrets |
| main | d878eb20375b77a57a959726e84b587bf225f868 | 6045b5324edf7d15f2daaa86ce66371e69098eda | feat(credentials): preserve profile backup secret versions |
| main | 85636c96952124b1d9125f5241670fa9ee5b284a | 6045b5324edf7d15f2daaa86ce66371e69098eda | feat(proxy): use explicitly migrated encrypted profile keys |
| main | 90eb63bcea736f119e3b226577988df0351ddb06 | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(im): set private file permissions before atomic commit |
| main | a089128da0a6aeb8455b129401947aa86040d4d0 | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(im): preserve unreadable configuration under a source lock |
| main | 6d367596353164f6814294fc06fd10978d75e998 | 6045b5324edf7d15f2daaa86ce66371e69098eda | feat(im): support explicitly migrated encrypted app secrets |
| main | 687a21081d09fe1ad9f30e8fc47cc18c69086fca | 6045b5324edf7d15f2daaa86ce66371e69098eda | feat(credentials): persist explicit configuration migration state |
| main | 8a1ad0daa2d157f68553a1af4a77be308fd16c88 | 6045b5324edf7d15f2daaa86ce66371e69098eda | fix(credentials): reject source downgrade after explicit migration |
| main | 0d2bf0fd187752d27cad4f261f71ceffe40b591e | 6045b5324edf7d15f2daaa86ce66371e69098eda | feat(credentials): capture verified private recovery snapshots |
| main | fa25aaa3f06774fc1b69156d73b20e9c4e1d9e55 | 6045b5324edf7d15f2daaa86ce66371e69098eda | feat(auth): add explicit backed-up credential migration |
| main | 6287d2a9d459eb904aa2cfe3680cf546c99797ee | 6045b5324edf7d15f2daaa86ce66371e69098eda | build(pnpm): adopt pinned package manager without moving sources |
| workspace | 3b15a6dee2da17e577759bd09effd1ba06fbe872 | 2c0edc8378adf605527fae7f8681cd61f1055895 | refactor(workspace): isolate app web and desktop build units |
| workspace | 9083833bda0e3dae69594837f23ec8c0218b1166 | 2c0edc8378adf605527fae7f8681cd61f1055895 | fix(storage): preserve colliding atomic write temporary files |
| workspace | 63664dd0c53650a119d07c730baebb2b92b82bc0 | 2c0edc8378adf605527fae7f8681cd61f1055895 | feat(credentials): explicitly migrate proxy profiles and backup keys |
| workspace | c24fad5311a1f092d5601386e3be1a26acbc609e | 2c0edc8378adf605527fae7f8681cd61f1055895 | fix(im): preserve existing private temporary files on collisions |
| workspace | c52565b48b3ef0b5d6ef23962237fdcf951916ce | 2c0edc8378adf605527fae7f8681cd61f1055895 | feat(credentials): explicitly migrate DingTalk IM secrets offline |
| workspace | 43150d4b0dbc1c650cd32c3af33bfdcc122f7487 | 2c0edc8378adf605527fae7f8681cd61f1055895 | test(im): allow scheduler slack in worker readiness checks |
| workspace | 36d0697f12c47226e6c78e1c4c67cde524a49b77 | 2c0edc8378adf605527fae7f8681cd61f1055895 | feat(credentials): restore configuration snapshots without replacing shared vaults |
| workspace | 3f81fbcf775b777c13c5d7a3ce2a6459e7480254 | 2c0edc8378adf605527fae7f8681cd61f1055895 | feat(credentials): verify complete ciphertext snapshots without disk writes |
| workspace | 8732a333c1eef547b1cb9e116e4ceba0a7bb2056 | 2c0edc8378adf605527fae7f8681cd61f1055895 | feat(credentials): preserve damaged-store evidence with explicit snapshot purpose |
| workspace | 0122f7ed3c9422016636ebc9c4e12f9ef8285a15 | 2c0edc8378adf605527fae7f8681cd61f1055895 | feat(credentials): repair master keys only after proving all live records |
| workspace | 20ce3315a965a96ef40faecc4c38a4dd71c15054 | 2c0edc8378adf605527fae7f8681cd61f1055895 | feat(credentials): add explicit private damage-evidence capture command |

B1.2 仍进行中；有损整库回退的产品选择与真实环境验收尚待，后续继续在新结构工作树实施。不要因压缩历史删除这些 archive 引用、原映射或未提交文档。
