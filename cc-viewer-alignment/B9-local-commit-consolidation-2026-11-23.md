# B9 本地提交整合与 PR（2026-11-23）

按用户本轮要求，先整合本地提交并创建面向 main 的 PR，PR 创建完成后才更新进度文档。本轮未合并 PR，B10 未启动。

- 原始29笔提交：`cb40a553061970abd878a87f1e1c38c07a4fe0a3..8dd6ebe2f399e74b735b185f3f6c146fbbf41281`，包含28笔实施/验证及最后的核销元数据提交。
- 完整备份分支：`backup/b9-raw-20261123`；已创建并通过 `git bundle verify` 的完整备份：`/Users/sky/.codex/backups/cx-viewer/B9-20261123/raw-before-consolidation.bundle`。
- 整合提交：`0a162b4e323b52f52bf665d5ebfcc179599168ac`，父提交为当前 main `cb40a55`。
- 原始与整合提交的 tree 都为 `77d5d480b9368998f7d00597fed5e34a3a3e8c4d`；`git diff 原始head 整合head` 为空，已验证内容完全一致，未修改生产代码或重跑同内容测试。
- [PR #11](https://github.com/weiesky/cx-viewer/pull/11)：base=`main`，head=`alignment/b9-scheduling-authorization`，创建时状态 OPEN / CLEAN / MERGEABLE，非 draft。
- 创建后逐页核对120个远端变更文件，路径、状态与每个 blob SHA 均与本地精确head一致；远端 commit tree 也与上述 tree 一致。
- 实际 `statusCheckRollup=[]`，该分支无 Actions runs。仓库仅有 tag/release 触发的 npm 发布 workflow，没有 PR checks；不将“无 checks”标成远端 CI 通过。

已验证内容仍为完整2443/2443、0skip、build/pack747、新生产安装859/859及747包/211Web精确字节、实际native SDK/PTY和双浏览器6配置16图。未验环境及30分钟运行上限见[B9完成矩阵](./B9-completion-matrix.md)。原上游→本地hash映射保留于[B9原始映射](./B9-original-commits-2026-11-23.json)，原始最终核销提交单列，不覆盖历史hash。

本文件及AGENTS/README/规划/完成矩阵/台账/回执在PR创建后作为独立进度提交推送至同一PR；最终head以PR为准，进度提交不自引用自身hash。未执行npm发布、用户进程停止/重启或全局链接变更。
