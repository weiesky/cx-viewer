# Hot-Switch Proxy

## Overview

Hot-Switch Proxy keeps Codex on CX Viewer's local route. Default preserves native OAuth/API-key traffic; an active third-party profile takes over supported model requests, including ChatGPT OAuth sessions, without replacing the official login.

> Use only with endpoints and keys you are authorized to use. The active profile replaces request authentication and may route prompts, files, and tool context through the configured service.

## Fields

| Field | Required | Description |
|-------|----------|-------------|
| **Name** | ✅ | Display name for this proxy, used to identify it |
| **Base URL** | ✅ | Responses-compatible API root, such as `https://api.example.com/v1` |
| **API Key** | ✅ | Sent to the third-party service as `Authorization: Bearer ...` |
| **Active Model** | ❌ | Replaces the request body's `model` field |
| **Reasoning Effort** | ❌ | Replaces `reasoning.effort`; leave empty when the provider does not support it |

## How It Works

When a proxy is active, `interceptor.js` performs the following before each API request:

1. **URL Rewrite** — Joins the Base URL and Responses path without duplicating overlapping path segments
2. **Auth Replace** — Uses the profile key as a Bearer token
3. **Request Rewrite** — Optionally replaces `model` and `reasoning.effort`, including compressed JSON requests

Choose `responses` for native OpenAI Responses providers or `chat-completions` for the built-in text/reasoning/function/custom-tool adapter. Unsupported compact, multimodal, hosted-tool, or server-side conversation requests fail explicitly and never fall back to the official route.

## Config File

Configuration is stored at `~/.codex/cx-viewer/profile.json`:

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

- `active` — ID of the current profile. Set to `"max"` for direct connection (no proxy)
- `profiles` — Profile list. `id: "max"` is built-in and cannot be deleted
- A UI save affects the current process immediately; other CX Viewer processes update within ~1.5 seconds through `fs.watchFile`
