# B9/B10 提交整合、合并与合并后进度（2026-11-23）

按用户明确要求：当前分支所有未进main的本地提交整合为一笔，创建PR到main，由代理合并，**合并完成后**才更新进度文档。顺序已执行；本文件属于最后的进度更新，不改产品代码。

- 范围：`cb40a553061970abd878a87f1e1c38c07a4fe0a3..d52763c108970e8371873c18f1afaa908d053317` 共26笔（B9两笔+B10二十四笔）。其他分支/工作树及既有备份未改写。
- 原始备份：`backup/b9-b10-before-consolidation-20261123`；完整bundle已通过git bundle verify：`/Users/sky/.codex/backups/cx-viewer/B9-B10-20261123/raw-before-consolidation.bundle`。完整hash/作者/时间/父提交/tree/文件映射见[26笔原映射](./B9-B10-original-commits-2026-11-23.json)。B9更早29笔原始映射/备份继续保留。
- 整合提交：`da60ff2b136f360abd20e45378a084e8899a2f0f`，父为`cb40a55`；相对main恰好一笔。
- [PR #12](https://github.com/weiesky/cx-viewer/pull/12) 已在2026-11-23 03:28:35 UTC合并，main代码提交为`d82977282112b8c063b5d6da9d62412b065da5b8`。旧[PR #11](https://github.com/weiesky/cx-viewer/pull/11)内容全部被本PR覆盖，已关闭，未重复合并。
- 原始末端/整合/远端head/合并提交的tree均为`ddf805a5f45624dd4af1812bb775d5eea92d2b68`；252文件的路径、状态、blob SHA逐一一致，完整远端tree与合并后单一父提交也核对。代码及测试内容未改，不重复运行相同内容测试。
- GitHub实际PR checks为空，分支Actions runs为空；仓库仅有npm发布workflow。不声称远端CI通过。完整历史diff的whitespace检查有一个原本存在的测试文件末尾空行提示（plugin-manifest.test.js:180），本次历史整合原样保留；进度更新自身diff检查通过。
- 本机smart-HTTP fetch两次及精确fetch均传输停滞，仅终止本任务自己的git fetch。改读GitHub已验证签名的merge commit，只有重建对象的git hash-object精确等于远端SHA才写入本地；tree已存在且核对，远端main另查一致，然后本地main正常fast-forward。未伪造提交、改用户凭据或重启任何运行实例。

最终验收仍对应相同产品文件：2713/2713、0skip/build/pack773，新生产安装1096/1096、全部773包文件/211Web精确字节、B1.2/安装CLI；B10双浏览器14配置34图已核看。B9实际native SDK/PTY及16图的原始证据保持；详见各完成矩阵，受控GUI状态不冒充真实全局升级。

本次合并后更新AGENTS、README/规划、B9/B10完成矩阵、台账、交接与整合回执，再提交推送main。原始源码/验证文档保留历史时间点；当前完成状态以本文件和AGENTS为准。下一步B11剩余范围，Claude目录/Activation/content抽包和未验环境不抵扣完成。7008及其他用户实例未由代理停止/重启，正常重启才加载新后端。未发布npm或改变全局链接。
