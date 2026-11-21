# B6 浏览器验收

实际生产构建、临时HOME/fake Codex AppServer、同名两项目、loopback HTTP。Chromium159.0.8154.6、WebKit27.2；26张图逐张核看。图像hash及边界见[GUI回执](../../B6-gui-2026-11-21.json)。result.json为桌面，responsive-result.json为phone/pad仿真，warm-result.json为每引擎不刷新5轮交互。初次失败不计为通过，详见[实施E13](../../B6-implementation.md#e13)。

重现时先用本地Playwright安装及浏览器路径设置`CXV_PLAYWRIGHT_MODULE`、`PLAYWRIGHT_BROWSERS_PATH`，构建后单独运行`node cc-viewer-alignment/probes/b6-preview-fixture.mjs`，再依次运行`b6-preview-gui.mjs`、`b6-responsive-gui.mjs`、`b6-warm-conversation-gui.mjs`。默认fixture描述在`/tmp/cxv-b6-gui-fixture.json`，脚本从中读取自有端口/实例。仅停止描述中自有PID，不操作活动实例。探针地区查询固定响应；不用真实模型、不修改真实用户配置。

手机保留原0.6缩放，平板用ipad=1明确进入pad-mode。音频实际muted播放/seek及Range，并未验证物理发声；复制为实际键盘copy事件/DataTransfer，并非跨应用系统剪贴板。
