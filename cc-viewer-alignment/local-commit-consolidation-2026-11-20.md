# B3本地30笔提交合并与GitHub收口（2026-11-20）

用户确认B3收口；原30笔已合并为[7c3d849](https://github.com/weiesky/cx-viewer/commit/7c3d849b9e7acda1c974077843406c23627dbdcb)并普通快进推送GitHub main，完整远端hash已核对。聚合范围仅为远端main之后的30笔B3提交，不改写既有远端历史，不夹带B4实现。

## 范围、备份与映射

- 唯一父提交/推送前远端main：`41d95af54189cfaa9d0816244ec1ae7366d43939`。
- 原B3末端：`1b3d46cbb1ee11f32784e915c39dabb5e9fe761d`；原文件树：`1cbd6e00e0cf11cdb6d206e402034d8fceb8ceea`。
- 已完成的聚合提交：`7c3d849b9e7acda1c974077843406c23627dbdcb`（[7c3d849](https://github.com/weiesky/cx-viewer/commit/7c3d849b9e7acda1c974077843406c23627dbdcb)）；唯一父提交仍为上述41d95af，已有远端历史未改写。
- 原历史本地归档：`refs/archive/b3-closeout/20261120T023942Z/main`。
- 本地备份：`/Users/sky/.npm-global/lib/node_modules/cx-viewer/.git/local-consolidations/20261120T023942Z`，含`before.bundle`、`bundle-verify.txt`及`consolidation.json`；bundle已校验。
- 原上游hash→本地小笔hash继续保留于[B3实施](./B3-implementation.md)、[第二轮](./B3-transport-and-pagination.md)、[分片实施](./B3-sharding.md)和[台账](./cc-viewer-alignment-commit-ledger.md)。下表30笔均映射至7c3d849聚合提交，原对象仍可通过归档引用访问。

## 文件树和验证口径

聚合保留原B3应用、测试、依赖、工程文件与探针的精确Git文件树；仅更新AGENTS及专项进度文档，并新增本记录。提交前后已逐路径核对，除6个收口文档外完全一致；完整结果和新hash已写入本地`consolidation.json`。本轮是历史整理，不重复运行应用测试，也不把历史整理写成一次新功能验证。

最后应用代码已经验证：1410/1410、0 skip，构建通过；实际689文件tarball、202Web资产/关键源码精确字节、144/144安装后运行时、B1.2合成回归和隔离CLI通过。原始结果及未覆盖环境见[B3完成矩阵](./B3-completion-matrix.md)。真实用户日志、活动Viewer实例和其他工作树/分支不切换。

已仅推送`refs/heads/main`，使用普通快进（41d95af→7c3d849），没有强推。2026-11-20 10:41:52（Asia/Shanghai；02:41:52 UTC）通过`git ls-remote origin refs/heads/main`读回`7c3d849b9e7acda1c974077843406c23627dbdcb`，与本地HEAD一致；当时工作区干净。推送回执保存在上述本地`consolidation.json`；本地archive引用与bundle没有额外推送。当前这次仅补进度文档，将另作普通文档提交，不改写已发布的B3聚合提交。

## 原提交映射

| 原提交 | 原主题 |
| --- | --- |
| `a55eb66d7946f5da3b73ab2cca6fe0c48c23fbfe` | fix(web): recover the committed baseline after cold ingest failures |
| `9ea4bddb0e05cca83a4c1a80ef50a2bb85f7a314` | docs(alignment): record B3 cold ingest recovery evidence |
| `5047b368cb2ee1fcad4dcf6f00c5f48d9d29fc2d` | fix(web): acknowledge V2 live cursors only after successful enqueue |
| `2b765b11afb886a606f3ce7410e30d30e31b5399` | fix(server): close failed V2 SSE writes and release subscriptions |
| `4a21cec0d1d3e4d809b00a288868bf03f06df6f4` | fix(chat): retain completed responses across in-flight session updates |
| `264d370485eaf95dc51a22e9852d12b5684d3335` | docs(alignment): record B3 fixes and reproducible storage and live baselines |
| `fb20fd52ff8bec79e855df19425145fb91e79c58` | fix(web): report SSE parse and initialization failures consistently |
| `1994819340e244370db7514ee9695ea93a6233bd` | test(alignment): verify B3 browser recovery and bounded HTTP windows |
| `16e240695095a3f484b2cf8e5d2313276df67fc3` | feat(web): migrate baseline dialogue mux transport with V2 route support |
| `2e4ecbdbb1682cdb9e0b26aeb605f7f75a5cec51` | refactor(log): share bounded diagnostics with the baseline server wrapper |
| `4a7a8e7e14060b7d9f54280d563b0db9ef850337` | feat(server): migrate baseline dialogue mux and credit-based backpressure pump |
| `c31b20b2b1f367507bc8e55e11f9ee109a541bf3` | feat(transport): connect scoped dialogue mux through existing HTTP authorization |
| `363d061cdcbb70c78f6f8eb26916d6e102dcd658` | feat(logs): paginate canonical sessions through existing summary cache |
| `4883004d39152a39e2a89422bca28849c3858415` | feat(logs): align paged log picker and baseline pager layout |
| `f20f7b277ff702e15170df082256949cf37b4f49` | perf(chat): migrate baseline incremental file-tool scanning and metadata eviction |
| `9f61d3e213b32ab40c3a1ac56610634ab1d2499e` | docs(alignment): record B3 transport pagination recovery evidence and pending shard policy |
| `812277c5ff7272197a1ac373a5399fbb5c0a55b1` | feat(logs): add crash-safe progressive timeline shard publication |
| `ce8c88416a62fb15cc32f3a6e4cc2886317860d1` | feat(logs): read and resume progressive shards without replaying frozen timelines |
| `aee399e04a29fce74dd884dbb83495749a300d65` | feat(logs): enable prompt-boundary sharding for live canonical writers |
| `48afcd7583e74cad7bc85a525894c6e4b4caa232` | test(logs): verify shard cut recovery export paging and deletion over real routes |
| `2639cd847f46cfe66f4c3dffb45beb28acb90fa1` | feat(chat): project only loaded shard input while retaining exact request detail |
| `57bddc8e0c3917c3195767425d09118f0e271370` | feat(chat): align earlier-shard controls and guard asynchronous prepend ownership |
| `9cd30244cd2df199f1e2e9413981cbf18488dc65` | perf(logs): reuse acknowledged older-shard indexes across history pages |
| `c9a3991d3e66c39d25776d54cf8dac96d6e02cfb` | fix(logs): fence sharded sessions against incompatible older writers |
| `94f81bf455902793391fa2497105f4155def284b` | test(logs): exercise concurrent processes across progressive shard boundaries |
| `32f6d94d732d8a1a8c9d0092a9eacefbfdf9a23a` | test(chat): verify canonical crash-orphan input remains renderable |
| `d382bc7f5fdb7ce4fb5342330c0fca931355e561` | fix(chat): retain older-history access for an empty published shard |
| `563a51d2e77eb5cc96f0d5143b8f23719cae9f08` | fix(chat): refresh file and Git panels after successful commit tools |
| `e8ed8a7b78b95102e213cbc90e557571057f35ab` | fix(chat): verify canonical tail before preserving shard prepend attachments |
| `1b3d46cbb1ee11f32784e915c39dabb5e9fe761d` | docs(alignment): close B3 migration with shard recovery and installed evidence |
