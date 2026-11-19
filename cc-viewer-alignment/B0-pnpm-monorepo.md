# B0 专项：cc-viewer 的 pnpm 与 monorepo 迁移

## 上游是否有专项

有。上游维护了完整的 [npm → pnpm 迁移与 monorepo 拆包方案](https://github.com/weiesky/cc-viewer/blob/74cd752d99caf122e750216d2af3bb9f467c4de1/docs/refactor/pnpm-monorepo-migration-plan.zh.md)，包含现状、阶段、发布/Electron 契约、门禁、风险及落地记录。方案正文中的早期设想与附录实测有差异，实施应优先核对附录和固定快照源码。

上游明确分成以下阶段（提交按提交时间排序；台账中记录了路径和后续关系）：

1. **A1：只换包管理器、不改目录** — [dabc5232ce](./cc-viewer-alignment-commit-ledger.md#commit-dabc5232ce)，引入 pnpm 11.22、pnpm-lock 和构建脚本白名单，替换 npm 锁文件并调整 CI/构建。
2. **A2：拆分 workspace** — [e3ca28c52d](./cc-viewer-alignment-commit-ledger.md#commit-e3ca28c52d)，拆分 `apps/web`、`apps/electron` 和 `packages/app`，调整入口、测试路径、资源组装与 Electron；[3b5103bb9e](./cc-viewer-alignment-commit-ledger.md#commit-3b5103bb9e) 增加 tarball 布局契约门禁；[20ccfb7304](./cc-viewer-alignment-commit-ledger.md#commit-20ccfb7304) 抽离内容包。上述短哈希的完整链接与日期以台账为准。
3. **A3：版本管理** — [7d83b5deff](./cc-viewer-alignment-commit-ledger.md#commit-7d83b5deff) 引入 Changesets，最终只对外发布主 app 包。
4. **后续核心抽取** — [047db59b80](./cc-viewer-alignment-commit-ledger.md#commit-047db59b80) 引入内部 `@ccv/core`，并增加包边界守卫、拆分测试。还需对照该提交及发布产物核查 `bundledDependencies`、组装和运行时解析。

上游当前根 package 规定 `pnpm@11.22.0` 和 Node `>=22.13.0`；对外发布的 app 包声明 Node `>=20.18.1`，两者是**开发构建环境与最终用户运行环境**的不同要求。上游仍发布单一 npm 包；其 app 的 `prepack` 负责组装，私有 `@ccv/core` 通过 `bundledDependencies` 纳入产物，不能假定只是修改 lockfile。

## 改造前证据（B0 / 原源码基线）

- 当前根 `package.json` 为单包 npm 结构，无 `packageManager` 或 workspace 配置；`package-lock.json` 在 Git 中被追踪；没有 `pnpm-lock.yaml` 或 `pnpm-workspace.yaml`。
- `build.js` 通过 `npx vite build` 构建；`scripts/npm-pack-dry-run.mjs` 校验发布资源；`package.json` 包含 Electron 打包配置，`node-pty` 是原生依赖。
- `.github/workflows/npm-publish.yml` 的注释声称没有追踪 lockfile，并运行 `npm install --no-package-lock`；当前 Git 实际追踪 `package-lock.json`，这是现有发布流程文档/可复现性偏差，应单独复核。
- 本地声明 Node `>=20.12.0`，当前安装的 `undici` 包声明 `>=20.18.1`；这是版本下限差异，不等于已完成跨平台兼容测试。
- B0 的 991 项基线测试和构建使用 Node 24.14 与现有 node_modules；没有证明 pnpm 全新安装、Node 20 下限或 Electron 打包可行。

## 对齐前应分别决定的范围

1. **A1 包管理器切换**：在独立 checkout 中生成并比较锁文件、声明 pnpm 版本/构建白名单、验证原生 `node-pty`、构建、测试与 CI。不要先改目录，便于定位回归。
2. **A2 workspace 拆包**：以现有 `server.js`、`cli.js`、`interceptor.js`、`electron/`、`src/`、`lib/` 的真实跨边界引用为准设计；验证全局安装、既有 exports、启动方式、插件/skills/concepts、资源发现和用户升级。上游为 Claude 设计的目录或 hook 路径不能机械沿用。
3. **A3 Changesets**：只在需要上游式版本流程时单独引入；迁移 pnpm 不天然要求此项。
4. **内部 core 包与测试迁移**：评估实际复用收益和依赖边界；如采用私有包，验证 npm tarball 实际包含、依赖解析、干净目录全局安装与 Electron staging。

## 必需的专项验收

- 锁文件直接与传递依赖版本差异、构建脚本白名单、frozen install 以及现有依赖漏洞策略。
- npm tarball 的文件清单、`bin/cxv`、exports、运行时生产依赖、插件/skills/文档及安装后启动，避免向 npm 产物泄漏不可解析的 workspace 协议。
- Node 运行和开发构建版本分别列明，并测试声明下限、macOS/Linux/Windows；`node-pty` 原生 ABI 与 Electron 包按目标平台验证。
- CI、OIDC 发布、Homebrew、Electron 构建、npm 与 pnpm 全局安装/升级、旧安装与 updater 检测；确认测试夹具及根路径未被目录迁移破坏。
- 在独立工作树中设计回滚，不删除用户现有 `node_modules`、lockfile 或配置；上游最后采用的 Electron isolated linker 和具体版本只是其验证结果，不可直接当成本项目结论。

## 状态

2026-11-17：B0 调研已完结，用户随后选择现在前置。A1 6287d2a 已主线，A2 3b15a6d 已在独立工作树提交并通过本地验证。工程子项先于 B1 余项及 B2–B10，B11 其他能力与最终验收按各自依赖完成。当前全局实例及真实凭据未切换。详见 [A1/A2 交接](./A1-A2-engineering.md)。

<a id="timing-review"></a>
## 时机复核：用户已确认现在前置结构基线

2026-11-17，用户指出目录结构变化可能推高后续对齐成本。重新读取固定快照中的完整迁移方案、A1/A2/core 提交说明和最终组装/包边界脚本，并复核本地构建、Electron 运行路径、测试和发布契约后，**已按用户选择将 A1 + 最小 A2 结构基线放在后续大规模功能对齐之前**。此前把 B11 整包的 B1–B4 验收依赖直接套到 pnpm/workspace 专项，时序依据不充分；该依赖没有证明包管理器切换必须等待这些业务包完成。

### 成本来自哪些变化

| 范围 | 当前证据 | 时机判断 |
| --- | --- | --- |
| A1：npm → pnpm | 本地 `build.js` 调用 npx；发布 CI 使用 npm install；需验证严格依赖布局、锁文件版本保真和 node-pty。A1 本身不移动源目录。 | 可独立前置；仅完成 A1 不能消除后续目录搬迁成本。 |
| A2：workspace 目录 | 本地 tests 有 150 个测试文件；tests/scripts/electron 中 86 个文件出现 `../lib/`，57 个出现 `../src/`，12 个出现 `../server.js`（文本定位线索，非完整 import 图，数量重叠）。Electron runtime 显式要求 server/lib/node_modules 与运行根的相对布局。 | 若确定采用 monorepo，应在 B2–B10 大量新增模块和测试前稳定目录与运行资源边界。 |
| 上游实际搬迁 | `e3ca28c52d` 记录 A2 对 473 个测试文件做路径迁移、12 处手工修正，并适配 updater、tarball 与 Electron staging；`047db59b80` 后来又分发各包测试并抽取共享 core。 | 延后会让新增测试、共享工具和路径适配重复调整；这是结构风险证据，不是 cx-viewer 工时或失败数预测。 |
| 发布与用户数据 | 本地 bin 为 `cxv → cli.js`，exports 为 server/interceptor；全局安装、注入路径、资源发现和 Electron 均有现有契约；B1 持久凭据根按 LOG_DIR/profile 归属。 | 仓库目录可以变化；发布入口、运行资产和用户数据归属必须先列契约并验证，避免把搬代码变成真实数据迁移。 |

### 已确认路线（已分别提交并验证）

1. **以 `fa25aaa` 及现有 1099 项通过结果为检查点**，先保存最新源/测试/产物清单，在隔离 checkout 做结构预演。该检查点之后已执行 A1/A2；没有执行真实用户凭据迁移。
2. **A1 独立提交并验收**：锁定 pnpm/开发环境版本，审查与现有锁的依赖版本差异，校准构建脚本、显式依赖、构建许可及 CI；用全新 frozen install、node-pty 实际加载/PTY smoke、测试、构建与打包验证。具体版本须实施时核对，沿用上游版本不是本轮决议。
3. **A2 最小 workspace 基线**：确定 app/web/electron 的归属、共享纯逻辑的稳定边界、各包测试目录和集成测试入口，再小步搬迁。发布 app 继续承担 cxv、server、interceptor 及运行资源；前端与 Electron 作为内部构建单元。相对导入、动态路径、资源组装、npm 产物和 Electron staging 同批分别验收。最终路径表与共享闭包须以本地依赖图确定，不能复制 Claude 路径。
4. **在稳定结构上继续 B1 剩余项和 B2–B10**。B1 已提交的数据保护随目录搬迁保留；真实凭据 root、owner 身份和格式不因仓库重排而迁移。无需为了启动结构工作先实现全部后续凭据迁移工具。
5. **Changesets、进一步 content/core 服务抽取和跨平台发布收尾分别安排**。本轮只提出确定稳定共享边界，不自动批准整套上游拆包；后续实际新增共享包仍需包边界和 npm 运行解析验证。

A2 通过门槛包含实际 npm tarball 清单与隔离安装启动、既有 exports/注入、CLI/后端 smoke、前端构建、Electron 源码/组装路径与可用平台实例化；无法运行的平台须记录失败原因和复现步骤，不能标通过。现有 1099 项与 npm build/pack 结果仅是改造前基线，改造前的 1099 不代表新布局通过；后续 1102 及实际产物验证见实施交接。

其他可选路线：先把 B1 收尾后、B2 开始前再做 A1+A2；或仅切 pnpm、继续维持单包，承担后续上游目录映射成本。**用户已通过路线选择确认“现在前置结构改造”：从 fa25aaa 检查点执行 A1 + 最小 A2，再继续 B1 剩余项及 B2–B10。** 已在独立工作树 codex/pnpm-workspace 实施并提交，最终全量 1102/1102、npm 672 文件和 macOS Resources/server 实际 Node payload 通过，393 条产物链接封闭；见实施交接。
