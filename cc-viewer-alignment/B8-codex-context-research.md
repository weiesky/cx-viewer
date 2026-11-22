# Codex 模型窗口与压缩水位调研

2026-11-22。用户要求先研究最新原生行为，不能将旧353K或上游未知模型1M当通用事实。仅调研，尚未改变生产用量条或用户原生配置。无GUI提示词另已选择“继续适配完整注入链”，仅新会话生效仍有效。

本机实际 `codex-cli 0.169.0`。官方最新稳定版为[0.171.0，2026-11-20发布](https://github.com/openai/codex/releases/tag/rust-v0.171.0)，tag peeled commit `ccf9be8cc458bd6b8336fe84d68d8893f2691a5e`；0.169.0为`d32063f96c2dff1dc96af839b3952abb6acfeda4`。另核当时main `357fe240c91563c1e6c9690bb27a2e609282d615` 的同名核心函数。未升级或重启用户实例。

## 确认的计算关系

令W为当前模型目录中解析后的原始窗口，p为模型可用比例（缺省95）。配置model_context_window受该模型max_context_window限制。可用窗口U=floor(W*p/100)。这依赖模型及有效配置，不是所有模型共享固定353K。[官方ModelInfo](https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/protocol/src/openai_models.rs#L572)、[配置覆写与裁剪](https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/models-manager/src/model_info.rs#L17)。

普通scope=total时，基本自动压缩阈值A=min(显式配置/目录阈值（若有）, floor(0.90W))，缺省取0.90W。判断的是active_context_tokens。到U也会触发压缩。不能把A说成“可用窗口的90%”。body_after_prefix改按本窗口prefix之后增长计数；其显式配置路径、token-budget fallback buffer与回合结束阈值是另外的条件，不能用单个90%覆盖所有模式。[完整原生判断](https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/core/src/session/context_window.rs)。0.169/0.171的这个完整文件逐字相同，ModelInfo相关公式也一致。

后台预压缩是单独的实验路径。0.171.0注册表default_enabled=false；启用后还要求远端V2 compaction能力、非TokenBudget等门，默认提前水位为原始W的65%，可配置。它启动投机压缩计算，和到A/U必须处理窗口的判断不同。[特性注册表](https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/features/src/lib.rs#L2470)、[65%缺省与配置](https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/core/src/config/mod.rs#L248)、[启用/启动条件](https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/core/src/session/async_compaction.rs#L37)。未读取或断言用户当前服务端是否另行开启该特性。

原生TUI以last_token_usage.total_tokens为当前占用；累计total_token_usage用于累计消耗。百分比对分子/分母扣除12000基线后取剩余百分比、四舍五入，不能把累计消耗或cached input再加一次。自动压缩内部计数还可能含未报告尾部及旧加密reasoning估算，故不能把屏幕数字当精确触发producer。[TUI入口](https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/tui/src/chatwidget.rs)、[TokenUsage百分比](https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/protocol/src/protocol.rs#L2753)、[内部计数](https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/core/src/context_manager/history.rs#L1159)。

## 当前目录示例（无窗口覆写、普通scope、无额外buffer）

| 模型 | 原始W | 可用U（95%） | 基本自动压缩A（90%W） |
| --- | ---: | ---: | ---: |
| GPT-6.1-Sol / GPT-6.2-Sol | 500000 | 475000 | 450000 |
| GPT-6-Astra / GPT-6.2-Astra | 272000 | 258400 | 244800 |
| 372000窗口的目录项 | 372000 | 353400 | 334800 |

来源为[0.171.0官方内置目录](https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/models-manager/models.json)及上述公式。目录可由服务端刷新，表不是静态全模型规格保证。本地models_cache.json只提取model/window/max/比例等非凭证字段：0.169缓存2026-11-22亦为Sol500000、Astra272000、max872000；基础配置model=gpt-6.1-sol，无窗口/压缩覆写，非自定义目录。未导出原配置、凭据或聊天正文。

## 实际原生事件验证

[探针](./probes/b8-native-context-research.mjs)用实际本机0.169、隔离HOME/CODEX_HOME、显式0.171官方内置模型目录、本机合成Responses；5请求、无外部模型或工具执行。只验证窗口与事件，不冒称实际触发自动压缩。

1. 同一thread连续三turn，Sol→Astra→Sol的thread/tokenUsage/updated.modelContextWindow逐次为475000→258400→475000。
2. 另新thread配置model_context_window=100000，实际95000。
3. 配置1000000受目录max872000裁剪，实际828400。
4. last.totalTokens每次20100，total.totalTokens随三turn20100→40200→60300，证明二者不能混用。自有子进程均退出。[完整回执](./B8-native-context-research.json)。

复跑需先将该固定tag的models-manager/models.json下载至探针的第三参数路径（缺省/tmp/cxv-openai-codex-research-20261122/rust-v0.171.0/codex-rs/models-manager/models.json）；探针自身不下载、不读取用户models_cache。网络Node直连raw域失败后已回收自有等待进程，使用curl获取公开源；早期core/models.json旧路径404未当作证据。

## CXV当前缺口与实施边界

- 普通bridge已收到modelContextWindow并写入response.body.context_window；context-watcher与helpers仍固定353000，忽略该native窗口，用户的指正成立。
- 显式SDK AppServer transport目前只保留tokenUsage.last，窗口被丢掉；默认官方SDK exec JSON事件不直接暴露同等窗口，需验证精确owned native元数据来源，不能按名字或上游响应model猜1M。
- 应以所属原生thread/turn回报的窗口与last用量为事实源，处理切模型、恢复、缺失和并发；容量展示与实际压缩状态分开，不在UI伪造“恰到90%会压缩”。代理profile改写上游model不自动改变原生harness自身的窗口配置，也需如实处理。
- 用户此次要求调研，尚未授权替换此前353K显示约定；待展示此证据后确定变更范围。仅新会话提示词、排除代理重试/统计、原生权限与进程所有权约束继续有效。
