# 代理热切换

## 功能说明

代理热切换让 Codex 始终连接 CX Viewer 的本地捕获代理，并从下一次模型请求开始切换上游。API Key 与 ChatGPT OAuth 会话都可使用：官方登录态保持不变，激活的第三方 profile 接管模型路由和凭据。

> 仅在你有权使用的 endpoint 和 API Key 上开启该功能。启用 profile 后，请求认证会被替换，prompt、文件片段和工具上下文可能会经过配置的服务。

## 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| **名称** | ✅ | 代理的显示名称，方便区分不同代理 |
| **地址 (Base URL)** | ✅ | 兼容 Responses 的 API 根地址，例如 `https://api.example.com/v1` |
| **API Key** | ✅ | 以 `Authorization: Bearer ...` 发送给第三方服务 |
| **上游协议** | ✅ | 原生 OpenAI Responses，或通过内置 Codex 适配层连接 Chat Completions |
| **当前模型** | ❌ | 替换请求体中的 `model` 字段 |
| **思考强度** | ❌ | 替换 `reasoning.effort`；第三方不支持时请留空 |

## 工作原理

切换代理后，`interceptor.js` 会在每次 API 请求发出前执行以下操作：

1. **URL 重写** — 合并 Base URL 与 Responses 路径，并去除重复的路径片段
2. **认证替换** — 将 profile API Key 作为 Bearer Token
3. **请求改写** — 可选替换 `model` 和 `reasoning.effort`，也支持压缩的 JSON 请求体

Default 保持原生 OAuth/API Key 路由。激活非 Default profile 后，支持的模型请求会由该 profile 接管：官方凭据和账户标识会被移除，只向第三方发送 profile 的 Bearer Key。Chat Completions 模式支持纯文本、reasoning 以及 function/custom 工具循环；`/responses/compact`、多模态、hosted tools 和服务端会话状态会明确失败，绝不回落到官方路由。

远程 Base URL 必须使用 HTTPS。仅本机回环开发网关允许明文 HTTP，例如 `http://127.0.0.1:8080/v1`。

## 配置文件

配置存储在 `~/.codex/cx-viewer/profile.json`：

```json
{
  "version": 3,
  "active": "my-proxy",
  "profiles": [
    { "id": "max", "name": "Max" },
    {
      "id": "my-proxy",
      "name": "My Proxy",
      "baseURL": "https://api.example.com/v1",
      "apiKey": "sk-xxx",
      "wireApi": "responses",
      "activeModel": "model-a",
      "effort": "high"
    }
  ]
}
```

- `active` — 当前使用的 profile ID，设为 `"max"` 表示直连（不走代理）
- `profiles` — profile 列表，`id: "max"` 为内置直连模式，不可删除
- UI 保存会立即影响当前进程；其他 CX Viewer 进程通过 `fs.watchFile` 在约 1.5 秒内更新
