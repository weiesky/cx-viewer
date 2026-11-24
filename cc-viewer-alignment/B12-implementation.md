# B12 更新下载与重启交接

2026-11-24启动，分支`alignment/b12-update-restart`，功能起点`4cb1a4c`；第二轮规划先独立提交`5496ad5`。固定上游`d3c1f7fbf47c0424226acbe064ab4135e7ebe3cd`，研究副本`/tmp/cxv-cc-viewer-delta-20261124`。本包只处理`06be1ce6`与`03aad20b`行为子项，不运行version、不更改上游发布号、不停止用户实例。

## E1：下载跟随重定向

本地独立实现提交`9943faf`。

- 上游：`06be1ce62ee4ada15bc7805fe92b22dcf2f7451b`。已读实际diff、完整downloadRelease/UpdateJob与调用测试；冻结快照无后续修改该模块。
- 本地：`packages/app/lib/update-job.js`，复用原生fetch的`redirect:follow`，保留初始npmjs HTTPS元数据验证、摘要校验、超时、流背压、磁盘失败和临时文件清理。没有新增重定向器或依赖；无UI/CSS变动。
- 先在当前环境新增真实loopback 302→307→最终字节的回归用例；改前实际失败`TypeError: fetch failed / unexpected redirect`，0pass/1fail/0skip，证明缺口。
- 验证同一真实HTTP链的正确摘要、错误摘要拒绝、循环重定向拒绝、500ms挂起请求取消，以及失败无残留；完整update-job套件19/19、0skip通过，包含真实离线npm自有prefix安装验证。边界门535文件/0违规、604源码打包漂移门与diff检查通过。该检查点无构建/GUI结论；包末统一验证实际产物。

## E2：仅自更新交接访问token

上游`03aad20b929d67d566fa884fdc78391148627fae`（PR #178）。已读完整diff、access-token/restart/helper/server/cli调用与上游测试，冻结快照无后续修复这些交接模块。本地SDK/PTY/工作区选择器三种启动共用`registerUpdateRestart`，只在该公共函数接线，不复制上游两个handler。

必要差异：本地密码cookie是有revision/代次的独立内存会话，不是上游ACCESS_TOKEN cookie。交接访问token不授权持久化密码会话；密码登录跨进程仍需重新认证，TLS密码门和OTEL独立密钥保持。只替换内部env前缀为CXV，不动Codex全局配置。

迁入纯`lib/access-token.js`，严格32位小写hex、无效值也删env；只在server模块求值消费；cli交接当前访问token，helper在安装前删除配置并对JSON错误固定文案，失败恢复沿用内存交接；ready UUID独立。

原生必要安全适配：复用`logger-install.atomicWriteFile(...,{mode:0600})`替代直接覆盖，已有宽权限文件/符号链接不会接收新token。发现实际restart-config在`CODEX_HOME/cx-viewer`，而既有保护只按LOG_DIR偏好目录枚举；自定义日志目录时，隔离node search真实读出handoff及原子临时文件（先红）。现沿`credential-file-policy`已有规则纳入启动时/当前Codex配置目录的cx-viewer子目录，node/rg搜索和替换一并保护，不增第二套策略。

验证记录：server有效交接用例改前0/1失败（产生新随机token），改后3/3通过；定向首跑22/23，唯一失败是新CLI结构断言误计SDK/PTY两种、漏工作区选择器第三注册点，已按真实调用链修正为声明+3注册。产品逻辑未为此改动；后续定向复跑记录在最终回执。

当前环境扩大定向首次78/82：从仓库根直接跑app测试，继承宿主SDK模式且cwd不匹配app fixture，造成既有auth-server 4项失败（WS/两项文件状态/static fixture）；没有据此改产品。按实际workspace cwd并清除继承CXV/CODEX/OTEL、独立HOME/CODEX_HOME后82/82、0skip通过，日志`/tmp/cxv-b12-target.log`。覆盖真实helper成功与安装失败恢复、文件读入后安装前即删除、有效/非法env、后续子进程无env、手动轮换、OTEL不同值、搜索/替换保护、TLS/认证HTTP与CLI三入口接线。

初次真实pack因app源码更新时间超过旧dist而被既有组装门拒绝；按要求执行正常`pnpm run build`后通过，再以真实tarball再生成baseline；逐行核对仅新增`lib/access-token.js`，稳定路径630、源码605。AST边界536/0违规；未更改依赖、版本或前端/CSS。最终全量、真实生产新安装与实例化验收继续。

本地独立实现提交`f014bf9`。

## 最终全量、生产包与真实更新验收

受控`pnpm test`六组9/7/28/814/1758/246，合计2862/2862、0skip/0fail，日志`/tmp/cxv-b12-full.log`。正常build、pack预览829文件、真实verify:tarball630稳定路径通过；上述检查合起来覆盖release:check各步骤，没有为汇总重复运行无变化套件。

全新临时npm global prefix实际安装829个发布文件，与原始tarball逐字节一致；复制定向用例到仅用于验证的安装目录后，生产依赖下82/82、0skip通过。首次安装下载约94MiB Codex平台依赖较慢但正常完成，非环境失败。包与日志位置见机器回执。

追加独立探针`probes/b12-update-runtime.mjs`：只接受带cxv-b12-production标记的临时prefix；真实下载整个合成新版本tarball、真实SDK CLI入口、实际HTTP重启路由、真实helper与npm安装。更新1.1.20→合成1.1.21后，同端口新processId、旧URL token返回200、匿名远程403，现有`restartPollDecision`判reload。随后手动启动已轮换token，再用损坏暂存tarball触发真实helper摘要拒绝；原版本1.1.21恢复、旧token200/匿名403、前端函数判restored，错误回执无token。两次handoff文件删除，暂存包清理；自有服务端口60996关闭，0模型请求。没有浏览器GUI/活动实例结论。

探针初次相对import多退一级，启动前即失败；修正工具路径后整个运行通过，未改产品。真实大tarball触发未改动WriteStream背压分支的MaxListeners告警，下载/验证/清理均成功；保留后续线索，不标本包已修复。

完成边界见[B12矩阵](./B12-completion-matrix.md)与[最终回执](./B12-validation-2026-11-24.json)。本轮未PR/推送/发布、未运行version、未重启用户实例；下一包B13。
