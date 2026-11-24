# SDK 原生模型切换（2026-11-24）

用户要求将输入框右侧的只读模型胶囊改为可用的模型切换入口，并补充了模型列表与思考强度滑杆截图。本轮属于 B11 后用户要求的 Codex 原生能力扩展，不新增 B0 上游提交核销。

## 源码与实现

先读本地 ProxyChip → ChatView/ChatInputBar → AppBase streaming_status → sdk-manager → exec/AppServer 全链路、胶囊与输入条 CSS；读取上游 `133bc219df78920cdc3a5cb56f48cbe067e467e5` 和 `c66b5fe2ed6e855f0610127eba3de96ac821adea` 的实际 diff，后者原始 ProxyChip 及 CSS 明确为只读 fallback。固定基线仍为 `74cd752d99caf122e750216d2af3bb9f467c4de1`。本轮保留原 slot、胶囊尺寸及桌面/iPad/phone/Electron 可见性，不把用户新要求的选择器冒充上游已有功能。显式代理 profile 继续使用原编辑器，因为其模型/effort 会在代理层重写。

- 点击原 SDK 胶囊展开模型列表和离散思考强度滑杆，包含加载、错误重试与忙碌反馈；键盘 Enter/Space 可打开，弹层 Escape 可关闭。未知启动模型也保留入口。
- `sdk-model-catalog.js` 复用现有受监管 stdio client，按当前 SDK 实际 executable/cwd/config 调 `initialize`、分页 `model/list` 和 `config/read`，读取后关闭自有子进程；不创建/恢复线程，不发模型输入，不更改默认 exec transport。[官方 model/list 约定](https://learn.chatgpt.com/docs/app-server)。过滤隐藏项、保留模型/effort 顺序和默认 effort；支持动态 effort 名称，限制页数、字节、条数与总超时。
- 会话独立合并并缓存目录 60 秒，GET `/api/sdk-models` 返回精确 instance/revision；POST `/api/sdk-model` 重验目录成员、effort、实例与代次。生成中、待发队列未完成、恢复/关闭后旧选择或并发页面旧 revision 均拒绝。
- exec 使用 SDK 的公开 `resumeThread` 对原 thread ID 更新 options；AppServer 在原线程下一次 `turn/start` 传 model/effort。保留原历史、cwd、权限、代理及进程所有权，不用重发累计历史实现切换。
- 成功后沿用按实例隔离的 `streaming_status` 同步 model/effort，SSE 重连回放同值；桌面和移动数据共用。切换仅属于驻留工作区，不修改全局 Codex 配置或旧归档。

## 验证

[机器回执](./SDK-model-switch-2026-11-24.json)保留日志位置、真实目录与请求记录。

- 定向 172/172；其后新增并发写入测试，最终全量 **2842/2842，0 skip，退出 0**（9+7+28+811+1741+246）。覆盖两 transport 同线程续接、参数生效、旧历史不改、分页/隐藏项、effort 默认回退、忙碌/过期/跨实例拒绝、并发 revision、错误关闭进程，以及前端失败/迟到响应和其他客户端更新。
- 最终 build、533 文件边界/0违规、603 源码路径、628 稳定 tarball 路径通过。Changeset 使用 `cx-viewer: patch`；未运行 version 或发布 npm。
- 真实 Codex CLI 0.169.0 + SDK 0.142.5 + Chrome：目录含 9 个原生模型；选择 Astra/high，再切 Sol/high 并续发，loopback Responses 实际收到对应 model 和 high，原会话历史保留，刷新后模型/强度一致，无 pageerror。使用真实原生程序和本地模拟回复，未调用外部模型服务。截图见 [列表](./evidence/SDK-model-switch-2026-11-24/chromium-model-list.png)、[滑杆](./evidence/SDK-model-switch-2026-11-24/chromium-effort.png)、[刷新](./evidence/SDK-model-switch-2026-11-24/chromium-refreshed.png)。
- 首次探索也选择了 ultra；原生会将其按模型元数据转换成推理请求 effort，本机观测为 xhigh。该转换由 [Codex 0.169.0 的 resolve_reasoning_effort](https://github.com/openai/codex/blob/rust-v0.169.0/codex-rs/protocol/src/openai_models/reasoning_effort.rs) 执行；Viewer 保留所选 ultra，不自行将它改名或伪造 wire 值。
- 全量首跑中已有 logger-bootstrap 进程退出测试读到空 probe.pid→PID 0 而失败；在正确 packages/app cwd/清理运行标记环境下独立 3/3 及最终全量均通过，未修改该测试掩盖失败。另一次从仓库根运行该组因测试的相对 cli.js 路径失败，未计作有效复测。首次浏览器探针因 Playwright 缓存版本缺失失败，随后使用已安装 Chrome；首个 Select 点击 locator 命中被标签遮挡的搜索 input，改点原控件后真实选择通过。

Windows、Electron GUI、WebKit（运行时缺失）、真机触控及用户活动实例尚未验收。用户活动服务未停止/重启；现有进程需要正常重启后加载新后端。当前工作包为 B11 后 SDK 模型选择维护；下一步为正常重启后的活动验收与既有目标环境验收。
