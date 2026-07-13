# CX-Viewer 全局配置参考

## 一、全局设置面板（UI）

通过左上角菜单 → "全局设置" 打开。

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| 过滤无关请求 | 开关 | 开 | 隐藏心跳、count_tokens、子代理等非主代理请求 |
| 默认展开 Body Diff JSON | 开关 | 关 | 请求详情面板中的 Body Diff 区域默认展开 |
| 日志目录设置 | 文本输入 | `~/.codex/cx-viewer` | 项目日志的读写根目录，支持 `~/` 展开。修改后回车或失焦保存，立即生效 |

## 二、显示设置面板（UI）

通过左上角菜单 → "显示设置" 打开。

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| 折叠工具结果 | 开关 | 开 | 聊天视图中折叠工具调用结果块 |
| 展开思考过程 | 开关 | 开 | 默认展开 Codex 的 reasoning/thinking 块 |
| 完整展示所有内容 | 开关 | 关 | 显示完整的工具调用内容，不截断 |
| 自动恢复会话 | 开关 + 选项 | 关 | 遇到会话恢复提示时自动选择：`继续` 或 `新建` |

## 三、偏好设置文件

所有 UI 设置持久化到 `<日志目录>/preferences.json`，通过 `/api/preferences` 接口读写。

```json
{
  "lang": "zh",
  "filterIrrelevant": true,
  "expandDiff": false,
  "collapseToolResults": true,
  "expandThinking": true,
  "showFullToolContent": false,
  "logDir": "~/.codex/cx-viewer",
  "resumeAutoChoice": null,
  "disabledPlugins": [],
  "presetShortcuts": []
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `lang` | string | 界面语言（zh/en/zh-TW/ko/ja/de/es/fr/it/da/pl/ru/ar/no/pt-BR/th/tr/uk） |
| `filterIrrelevant` | boolean | 过滤无关请求 |
| `expandDiff` | boolean | 默认展开 Body Diff JSON |
| `collapseToolResults` | boolean | 折叠工具结果 |
| `expandThinking` | boolean | 展开思考过程 |
| `showFullToolContent` | boolean | 完整展示内容 |
| `logDir` | string | 日志目录路径 |
| `resumeAutoChoice` | null / "continue" / "new" | 自动恢复会话选择 |
| `disabledPlugins` | string[] | 已禁用的插件文件名列表 |
| `presetShortcuts` | array | Agent Team 快捷指令预设 |

## 四、环境变量

### CX-Viewer 专有

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `CXV_LOG_DIR` | `~/.codex/cx-viewer` | 日志存储根目录。特殊值：`tmp`/`temp` 使用系统临时目录 |
| `CXV_CLI_MODE` | 未设置 | `=1` 启用 CLI 模式（PTY 终端） |
| `CXV_SDK_MODE` | 未设置 | `=1` 启用 Agent SDK 模式（无终端） |
| `CXV_WORKSPACE_MODE` | 未设置 | `=1` 启用工作空间选择模式 |
| `CXV_PROJECT_DIR` | `process.cwd()` | 项目工作目录，用于文件操作和 Git 命令 |
| `CXV_PROXY_PORT` | 未设置 | 本地 MITM 代理端口 |
| `CXV_BYPASS_PERMISSIONS` | 未设置 | `=1` 跳过工具权限审批（配合 `--dangerously-skip-permissions`） |
| `CXV_DISABLE_DELTA` | 未设置 | `=1` 禁用增量日志存储，每次写入完整消息 |
| `CXV_DEBUG` | 未设置 | `=1` 启用 HTTP 代理调试日志 |
| `CXV_DEBUG_PLUGINS` | 未设置 | `=1` 启用插件加载调试日志 |

### 内部 IPC

| 变量名 | 说明 |
|--------|------|
| `CXVIEWER_PORT` | 服务端口，供 ask-bridge/perm-bridge 通信 |
| `CXV_EDITOR_PORT` | 服务端口，供 cxv-editor 文件编辑桥接 |

### 外部变量（读取）

| 变量名 | 说明 |
|--------|------|
| `OPENAI_BASE_URL` | 自定义 OpenAI 兼容 API 地址 |
| `SHELL` | 用户 Shell（PTY 启动和 Shell 配置检测） |
| `http_proxy` / `HTTPS_PROXY` 等 | HTTP 代理配置（通过 undici EnvHttpProxyAgent） |

## 五、CLI 命令参数

```
cxv [选项] [codex 参数...]
```

### CX-Viewer 专有选项

| 参数 | 说明 |
|------|------|
| `-logger` | 安装/修复 Codex hooks |
| `--uninstall` / `-uninstall` | 卸载所有 CX-Viewer 集成 |
| `--help` / `-h` / `help` | 显示帮助信息 |
| `--version` / `-v` | 显示版本号 |
| `-SDK` / `--sdk` | 使用 Agent SDK 模式 |
| `--d` | `--dangerously-bypass-approvals-and-sandbox` 简写 |
| `--ad` | 兼容旧配置的 CXV 侧 bypass 开关 |
| `run` | 通过 CXV 包装运行命令（`cxv run -- codex ...`） |

### Codex 透传参数（常用）

| 参数 | 说明 |
|------|------|
| `continue` | 恢复上一次会话（`codex resume --last`） |
| `resume [session-id]` | 恢复指定会话 |
| `exec [prompt]` | 非交互式 Codex 执行 |
| `--model` | 指定模型 |
| `--search` | 启用实时搜索模式 |
| `-C` / `--cd` | 指定工作目录 |
| `--sandbox` | 指定沙箱模式 |
| `--ask-for-approval` | 指定审批策略 |

## 六、交互桥接配置

CX-Viewer 通过本地 WebSocket 代理把 Codex CLI TUI 连接到 App Server。Web UI 在线时会接管原生 `request_user_input` server request，并使用原 JSON-RPC request ID 回答；Web UI 不可用时，原请求会自动交回 TUI。启动时还会用实际安装的 CLI 生成 schema，确认该版本支持此协议。

### 权限审批 Hook
- **匹配器**: `".*"`（正则匹配所有权限请求）
- **命令**: `node <安装目录>/lib/perm-bridge.js`
- **作用**: `shell_command`、`apply_patch`、`web_search`、`image_generation` 等会变更文件或访问外部资源的工具需要 Web UI 审批，其余自动放行

## 七、Shell 集成

CX-Viewer 在 logger 模式下可向 `~/.zshrc`（或 `.bashrc`）注入 `codex()` 包装函数：

```bash
# >>> CX-Viewer Auto-Inject >>>
codex() { ... }
# <<< CX-Viewer Auto-Inject <<<
```

交互式 `codex` 命令会通过 CX-Viewer 实现日志捕获和 Web UI 功能；`codex --help`、`codex auth` 等 passthrough 命令仍直接执行。

卸载：`cxv --uninstall` 或手动删除标记之间的内容。

## 八、代理配置（Proxy Profile）

存储在 `<日志目录>/profile.json`，通过 UI 的"代理切换"面板管理。

```json
{
  "active": "max",
  "profiles": [
    { "id": "max", "name": "Default" },
    { "id": "my-proxy", "name": "自定义", "baseURL": "https://...", "apiKey": "sk-..." }
  ]
}
```

| 字段 | 说明 |
|------|------|
| `active` | 当前激活的配置 ID（`"max"` = 直连，无代理） |
| `id` | 唯一标识 |
| `name` | 显示名称 |
| `baseURL` | 代理 API 地址（替换请求 origin） |
| `apiKey` | 代理 API 密钥（替换认证头） |
| `models` | 可用模型列表 |
| `activeModel` | 当前选中的模型 |

## 九、插件系统

插件目录：`<日志目录>/plugins/`

### 支持的 Hook 类型

| Hook | 类型 | 说明 |
|------|------|------|
| `httpsOptions` | 瀑布 | 提供 HTTPS 证书（返回 `{ cert, key }` 或 `{ pfx }`） |
| `localUrl` | 瀑布 | 修改本地访问 URL |
| `serverStarted` | 并行 | 服务器启动通知 |
| `serverStopping` | 并行 | 服务器停止通知 |
| `onNewEntry` | 并行 | 新日志条目写入通知 |

插件启用/禁用通过 `preferences.json` 的 `disabledPlugins` 数组管理。

## 十、目录结构

```
~/.codex/cx-viewer/               # 日志根目录
├── preferences.json               # 用户偏好设置
├── workspaces.json                # 工作空间注册表
├── profile.json                   # 代理配置
├── plugins/                       # 插件目录
│   └── my-plugin.js
├── <项目名>/                       # 每个项目的日志目录
│   ├── <项目名>_20260404_123456.jsonl  # JSONL 日志文件
│   ├── <项目名>.json              # 统计数据（后台生成）
│   ├── raw/                        # 有界并轮转的 app-server RPC sidecar
│   └── images/                    # 上传图片的持久副本
└── ...

/tmp/cx-viewer-uploads/            # 临时上传文件目录
```

## 十一、服务器配置

| 配置 | 值 | 说明 |
|------|-----|------|
| 端口范围 | 7008-7099 | 自动扫描可用端口 |
| 绑定地址 | 0.0.0.0 | 所有网络接口 |
| 访问令牌 | 随机 16 字节 hex | 局域网访问需要 `?token=xxx` 或有效密码会话 |
| 密码会话 | 项目/全局作用域，30 天 | 仅在远程安全传输下开放；退出撤销当前会话，配置变化撤销全部会话 |
| HTTPS | 由服务端/插件能力决定 | 远程密码登录需要 HTTPS；明文 HTTP 分享保留 URL Token |
| 浏览器来源 | 同源/允许的 Host | 不能仅凭 localhost 连接判定管理员身份 |
| 上传限制 | 50MB | 单文件最大上传大小 |

## 十二、URL 参数

| 参数 | 说明 |
|------|------|
| `?token=xxx` | 局域网访问认证令牌 |
| `?logfile=path` | 打开指定历史日志文件（只读模式） |

## 十三、localStorage 配置

| 键 | 说明 |
|-----|------|
| `cxv_viewMode` | 当前响应式视图模式覆盖 |
| `cxv_fileExplorerOpen` | 文件浏览器面板开关 |
| `cx-viewer-terminal-width` | 终端面板宽度（像素） |
