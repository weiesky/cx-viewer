# B12 更新下载与重启交接

2026-11-24启动，分支`alignment/b12-update-restart`，功能起点`4cb1a4c`；第二轮规划先独立提交`5496ad5`。固定上游`d3c1f7fbf47c0424226acbe064ab4135e7ebe3cd`，研究副本`/tmp/cxv-cc-viewer-delta-20261124`。本包只处理`06be1ce6`与`03aad20b`行为子项，不运行version、不更改上游发布号、不停止用户实例。

## E1：下载跟随重定向

- 上游：`06be1ce62ee4ada15bc7805fe92b22dcf2f7451b`。已读实际diff、完整downloadRelease/UpdateJob与调用测试；冻结快照无后续修改该模块。
- 本地：`packages/app/lib/update-job.js`，复用原生fetch的`redirect:follow`，保留初始npmjs HTTPS元数据验证、摘要校验、超时、流背压、磁盘失败和临时文件清理。没有新增重定向器或依赖；无UI/CSS变动。
- 先在当前环境新增真实loopback 302→307→最终字节的回归用例；改前实际失败`TypeError: fetch failed / unexpected redirect`，0pass/1fail/0skip，证明缺口。
- 验证同一真实HTTP链的正确摘要、错误摘要拒绝、循环重定向拒绝、500ms挂起请求取消，以及失败无残留；完整update-job套件19/19、0skip通过，包含真实离线npm自有prefix安装验证。边界门535文件/0违规、604源码打包漂移门与diff检查通过。该检查点无构建/GUI结论；包末统一验证实际产物。

## E2待实施：仅自更新交接访问token

上游`03aad20b929d67d566fa884fdc78391148627fae`（PR #178）。已读完整diff、access-token/restart/helper/server/cli调用与上游测试，冻结快照无后续修复这些交接模块。本地两种启动模式共用`registerUpdateRestart`，只在该公共函数接线，不复制两个handler。

必要差异：本地密码cookie是有revision/代次的独立内存会话，不是上游ACCESS_TOKEN cookie。交接访问token不授权持久化密码会话；密码登录跨进程仍需重新认证，TLS密码门和OTEL独立密钥保持。只替换内部env前缀为CXV，不动Codex全局配置。
