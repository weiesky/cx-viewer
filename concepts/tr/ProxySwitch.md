# Hot-Switch Proxy

## Overview

Hot-Switch Proxy lets you dynamically redirect Codex/OpenAI API requests to a different endpoint without restarting the current CX Viewer session. This is useful when using a compatible third-party API proxy service.

> Use only with endpoints and keys you are authorized to use. The active profile replaces request authentication and may route prompts, files, and tool context through the configured service.

## Fields

| Field | Required | Description |
|-------|----------|-------------|
| **Name** | ✅ | Display name for this proxy, used to identify it |
| **Base URL** | ✅ | Base URL of the API service (e.g. `https://api.example.com`). The original request origin will be replaced |
| **API Key** | ✅ | API key for the proxy service, replaces the original authentication |
| **Models** | ❌ | Comma-separated list of models supported by this proxy (e.g. `model-a, model-b`) |
| **Active Model** | ❌ | Select the active model from the list. The `model` field in requests will be replaced |

## How It Works

When a proxy is active, `interceptor.js` performs the following before each API request:

1. **URL Rewrite** — Replaces the request origin with the proxy's Base URL
2. **Auth Replace** — Replaces `x-api-key` or `Authorization` header with the proxy's API Key
3. **Model Replace** — If an active model is set, replaces the `model` field in the request body

## Config File

Configuration is stored at `~/.codex/cx-viewer/profile.json`. Click the folder icon in the title to open the directory:

```json
{
  "active": "my-proxy",
  "profiles": [
    { "id": "max", "name": "Max" },
    {
      "id": "my-proxy",
      "name": "My Proxy",
      "baseURL": "https://api.example.com",
      "apiKey": "sk-xxx",
      "models": ["model-a", "model-b"],
      "activeModel": "model-a"
    }
  ]
}
```

- `active` — ID of the current profile. Set to `"max"` for direct connection (no proxy)
- `profiles` — Profile list. `id: "max"` is built-in and cannot be deleted
- Changes take effect within ~1.5 seconds (monitored via `fs.watchFile`), no restart needed
