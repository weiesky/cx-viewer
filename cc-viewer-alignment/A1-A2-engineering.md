# pnpm / workspace 工程前置实施

2026-11-18 提交整理：用户选择按两阶段压缩，原 main 34 笔合为 `6045b53`，原新结构工作树 11 笔合为 `2c0edc8`。两阶段文件树均与原末端完全相同；未切换活动目录、未推送。原提交与43笔专项实施证据保留在 archive 引用中，见 [45条完整映射](./local-commit-consolidation-2026-11-18.md)。此次不重复运行测试，后文1161/1161等为原实现批次验证。

2026-11-17：用户已选择“现在前置结构改造”。顺序为 **fa25aaa 检查点 → A1 pnpm → A2 最小 workspace → B1 剩余项 → B2–B10**。这是 B11 工程子项前置；B0 仍已完结，Changesets、进一步 core/content 抽取和最终跨平台验收分别推进。

此前把 B11 整包的 B1–B4 验收依赖直接作为 pnpm/workspace 的前置，时序依据不足。真正影响后续搬迁成本的是 A2 及共享边界；只换包管理器不会解决目录问题。复核证据见 [时机复核](./B0-pnpm-monorepo.md#timing-review)。

## 当前入口补记（2026-11-21）

下文A1/A2工作树和“未切换”描述保留当时检查点，不作为当前npm入口判断。现在主仓库位于全局cx-viewer目录，bin/cxv已软链到packages/app/cli.js；最新B6 Web产物位于packages/app/dist。活动7008进程未重启，前端已更新但后端模块仍旧，见[实际HTTP核对与重启交接](./B6-runtime-entry-2026-11-21.md)。此补记未改安装链接、未重启活动实例。

## 提交与工作位置

| 阶段 | 本地提交 | 状态 |
| --- | --- | --- |
| A1 | `6287d2a` | 已提交并快进到当前主线；保留源目录，切换依赖安装与构建入口。 |
| A2 | `3b15a6d` | 已在 codex/pnpm-workspace 工作树提交；源码、npm 产物及 macOS Resources/server 实际运行目录通过，未切换全局实例。 |

工作树：`/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-structure-lqvimh9l/repo`。日志、npm tarball 和隔离安装放在其父目录；源码提交属于同一 Git 仓库，临时验证目录不代表额外发布。

当前任务所处目录也是运行中的 cxv 全局安装目录。A1 主线保留现有发布布局及 node_modules；A2 未覆盖这个活动目录、未重启当前实例。后续开发应使用上述新结构工作树。真实安装切换需要先保全源码/Git/未提交进度文档，再处理运行实例及扁平 npm 产物；本轮没有执行全局安装或真实凭据迁移。

## A1：依赖安装基线

对应上游 `dabc5232ce` 的包管理器能力，采用本地兼容方案，不直接搬入其所有版本/依赖策略：

- 钉住 `pnpm@10.34.9`，已从 npm 元数据核验其 Node 要求为 >=18.12，保留现有 Node 20 CI lane。上游 pnpm 11.22 要求 Node >=22.13，不在本轮提高用户运行版本下限。本地验证 Node 24.14.0、npm 11.9.0；Node 20/22 CI 仍待实际执行。
- Vite 构建使用 Node 直接执行已安装的 vite bin，避免 npx 临时下载及扁平 node_modules 假设。CI frozen install 改用 pnpm，发布继续使用 npm/OIDC。
- 按本地锁文件审查 7 个安装脚本包：Electron 35、electron-winstaller、es5-ext、esbuild、fsevents、node-pty、protobufjs。Electron 35 确有 postinstall，与上游 Electron 42 情况不同；未升级 Electron 大版本。
- npm lock 有 1013 个包节点、945 个唯一 name/version。导入后保留 944 个唯一版本，未新增版本选择；`brace-expansion@2.1.2` 被去重到原锁已有 `2.1.4`，影响原 @electron/universal 和 filelist 下两个节点。**不声称零漂移。** 原锁可从 fa25aaa 取回，不删除当前安装的用户依赖。
- 独立目录全新 frozen install 成功，启用已审查安装脚本；全量 **1099/1099、0 skip**；构建、pack preview（1014 文件）通过。实际 tarball 在隔离目录按生产依赖安装（禁用安装脚本），CLI/version、公共 exports、HTTP API 和页面通过；实际应用 scratch PTY 启动/数据/退出通过。
- 直接调用未经应用修权的 node-pty 首次因 spawn-helper 无执行位失败，应用入口修复后通过；日志保留，不将首次探针计为成功。借用依赖内容缓存属于 pnpm 正常安装，不是借用旧 node_modules。

日志：父目录的 `pnpm-import.log`、`pnpm-install.log`、`a1-test.log`、`a1-build.log`、`a1-pack.log`、`a1-tarball.json` 和 `a1-package-install.log`。

## A2：稳定源码与产物边界

对应上游 `e3ca28c52d` 的结构能力；测试按归属分布借鉴 `047db59b80`，并不代表已抽取其 core 或完成整条混合提交。

| 原路径 | 新归属 |
| --- | --- |
| 后端根 JS、lib、server、内容/插件及运行脚本 | `packages/app`，唯一发布包仍名 cx-viewer。 |
| 前端 src、public、index.html、Vite 与 build.js | `apps/web`，私有构建单元。 |
| Electron 源码、签名与 staging 脚本 | `apps/electron`，私有构建单元。 |
| 后端实际引用的 9 个 src/utils 文件 | `packages/app/src/utils`，单份规范源码，前端显式引用。 |
| 单包测试 / 跨包集成测试 | 各包 `tests` / 根 `tests`。 |

共享 9 文件：clearCheckpoint、contentFilter、modelIdentity、ptyChunkBuilder、requestType、teammateDetector、ultraplanTemplates、userImageRefs、userPromptContent。没有复制整个 src/utils，没有新增私有 core 包；B0 候选路径按 [逐文件映射](./A2-path-map.json) 定位，不改写原审计时点的事实。

- A2 pnpm lock 的 packages/snapshots 部分与 A1 **逐字节一致**，只调整 importer 归属；frozen install 已通过（安装脚本由 A1 完成，此轮布局重装使用 ignore-scripts）。
- Web build 后 app 的 prepack 组装 dist/public、Electron 源码及 docs/README/LICENSE；缺失/陈旧构建或不兼容的 workspace/catalog 发布依赖被拒绝。npm pack JSON 预览显式关闭 foreground-scripts，避免 prepack 标准输出破坏机器报告。
- npm 产物 1014 → **672 文件**。减少前端源码、开发构建文件和迁至桌面工作区的签名脚本；逐前缀核验原 lib/server/public/concepts/ultraAgents/imSkills/plugins/docs/electron 全保留，9 个 Node 必需的共享文件、bin、exports、LICENSE/README 保留。dist hash 随构建输入路径变化，不当作运行资源丢失。
- npm 生产依赖提升到应用旁的 node_modules 时，Electron 校验以及主/草稿 PTY 的 helper 修权均使用 Node createRequire 解析。新增 1 个 hoisted Electron 布局回归及 2 个 PTY 回归；PTY 两项先红后绿。
- 桌面 backend 外部 Node 使用 `Resources/server`，包含 production deploy 的独立模块树，UI archive 只放 Electron UI 与元数据。显式拷贝 stage/node_modules，避免复制器省略依赖；不依靠开发仓库的父级 node_modules。
- staging 预先设置 spawn-helper 执行位，避免安装后修改只读/签名 bundle；移除 legacy deploy 生成的应用自身 workspace 回链，并验证其余链接均在 staging 内。

## 验证证据与失败记录

源码完整测试入口 **1102/1102、0 skip、无失败钩子**：Electron 5、web 142、app 752、根跨包 203。`a2-test-release.log` 保留最终源码结果。此前测试资源根假设、Vite 同目录无扩展名导入缺 ./、pack JSON 被 prepack 输出混入等失败均已修复，原日志保留。

构建已通过，npm 672 文件预览及实际 tarball 已产生。`a2-package-smoke-final.log` 记录新 tarball 的生产安装中 public exports、依赖归属、LOG_DIR 所属、Electron 解析、HTTP/页面入口 JS 与真实 scratch PTY 通过；安装使用 omit=dev/ignore-scripts，未当作所有 npm 生命周期或目标平台通过。

macOS arm64 unsigned --dir 已构建。首次 app.asar.unpacked 的实际 Node payload 探针发现 node-pty 重复替换 asar 路径，不能因 builder 退出 0 就标可用；随后改为 Resources/server。资源目录首次未拷入 node_modules，被归属检查发现开发目录依赖回退；显式增加依赖拷贝。其后 Node/HTTP/UI/native 探针通过，但完整链接审计发现 legacy deploy 的 cx-viewer 自身回链外逃，已在 staging 移除并加封闭检查。最终 a2-electron-closed-build.log / a2-electron-closed-smoke.log 记录 unsigned 目录包及 Resources/server 的 public exports、依赖归属、LOG_DIR、Electron 路径、HTTP/页面 JS 和真实 PTY 全通过；393 条链接有效且位于产物内，UI archive 为 133185 bytes。不是 GUI 或签名分发验收。

可复现的 payload 探针（仅隔离产物目录；会启动 loopback HTTP 和本地测试 shell，所有配置均使用临时目录）：

```sh
node cc-viewer-alignment/probes/a2-runtime-smoke.mjs <isolated-install>/node_modules/cx-viewer
node cc-viewer-alignment/probes/a2-runtime-smoke.mjs '<unsigned-app>/Contents/Resources/server'
```

Mac 目录包使用已安装的同版本 Electron distribution，避免重复下载；签名和公证环境已从构建子进程移除，未使用真实证书。真实 GUI、Codex 模型 CLI 全流程、DingTalk 网络、Windows/Linux/Electron 目标环境、签名、公证、全局安装/升级、最低 Node runtime 和高负载仍未验收，需在目标环境补齐；不能据此宣称 B11 或 337 条已全部完成。
