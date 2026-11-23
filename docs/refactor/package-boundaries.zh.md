# 原生包与导入边界

执行 `pnpm run verify:boundaries`。检查器移植自固定上游 `74cd752d` 的729/047提交，路径以本仓库真实运行链为准。普通 `pnpm test`、integration前置与CI都会运行。

| 层 | 原生路径 | 出边约束 |
|---|---|---|
| CORE | packages/core/src | 只引CORE；禁止Node内置与外部依赖 |
| L0 | findcx.js、i18n.js、server/_paths.js | L0、精选叶子、CORE、内置依赖 |
| L0-leaf | interceptor-core、cxv-processes、server/lib/error-report | 整个闭包保持在L0/叶子/CORE |
| L1-lib | lib、server/lib散文件及兼容src/utils | 禁止引组合根/路由；引L2须精确例外 |
| L1-sub | lib/im、adapters、ask、proxy、log-v2 | 同L1；跨子系统须精确例外；im与adapters同组 |
| L2 | 根interceptor、proxy、pty-manager、scratch-pty-manager、workspace-registry | 当前仅执行解析、依赖与无环约束 |
| L3 | server/routes | 当前仅执行解析、依赖与无环约束 |
| L4 | server.js、cli.js | 组合根；执行解析、依赖与无环约束 |
| WEB | apps/web/src | 禁止引app；共享模块走@cxv/core子路径 |

R0验证叶子闭包及清单存在；R1禁止静态循环（含自循环），动态闭合循环需要R1-dyn；R2禁止库引组合根/路由；R3限制跨子系统；R4限制L0出边；R5限制L1到L2；R6禁止Web跨入app或以相对路径绕过包缝；R7验证相对路径、已声明依赖、core真实子路径；R8保持core纯度；CLS对未分类源文件失败关闭。

动态import按上游AST方式扫描字面量及无插值模板，带相对前缀的插值模板拒绝；运行时URL/变量表达式无法静态推导，保持原有运行边界，不宣称检查器能覆盖它们。检查器忽略测试、脚本、资产及app内组装的Electron/docs副本；Electron源属于独立构建单元。测试仍验证运行时权限、路径、凭据及实例隔离。

`scripts/boundary-allowlist.json`只接受带from/to/rule/reason/since的精确R3、R5、R1-dyn例外，不能豁免硬规则。例外对应违规消失后，STALE使门失败；`--write`仅删除过期项，绝不自动新增。

本轮原生14例外：8条R5记录CLI日志启动、SDK/PTY代理生命周期与文件策略读取真实workspace registry；6条R3记录IM复用V2的原子存储、项目身份、历史查询和昵称缓存。逐边理由写在JSON；无静态循环或动态循环例外。复用原有状态权威，避免为了分层造第二套注册表、锁或归档布局。

发布仍只有cx-viewer。@cxv/content为私有内容源，组装进原资产路径；@cxv/core为私有纯模块，通过plain0.0.0加bundledDependencies物理打入同一tarball。原28共享模块与14归组入口保留薄转导出（权限入口保持脚本执行），兼容既存安装与未重启后端。原生V2的summary/materializer循环通过共用archive-scanner下沉解除，协议/存储函数体不变。详见B11文件映射与逐笔验证记录。
