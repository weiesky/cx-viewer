# Hot-Switch Proxy

## Overview

Hot-Switch Proxy keeps Codex pointed at CX Viewer's local capture proxy and changes the upstream used by subsequent native turns. It works with API-key and ChatGPT OAuth sessions: the official login remains intact, while an active third-party profile replaces the model route and credentials.

> Use only with endpoints and keys you are authorized to use. The active profile replaces request authentication and may route prompts, files, and tool context through the configured service.

## Fields

| Field | Required | Description |
|-------|----------|-------------|
| **Name** | ✅ | Display name for this proxy, used to identify it |
| **Base URL** | ✅ | Responses-compatible API root, such as `https://api.example.com/v1` |
| **API Key** | ✅ | Sent to the third-party service as `Authorization: Bearer ...` |
| **Upstream Protocol** | ✅ | Native OpenAI Responses, or Chat Completions through the built-in Codex adapter |
| **Active Model** | ❌ | Replaces the request body's `model` field |
| **Reasoning Effort** | ❌ | Replaces `reasoning.effort`; leave empty when the provider does not support it |

## How It Works

When a proxy is active, `interceptor.js` performs the following before each API request:

1. **URL Rewrite** — Joins the Base URL and Responses path without duplicating overlapping path segments
2. **Auth Replace** — Uses the profile key as a Bearer token
3. **Request Rewrite** — Optionally replaces `model` and `reasoning.effort`, including compressed JSON requests

Default keeps native OAuth/API-key routing. A non-default profile explicitly takes over supported model requests, strips official credentials and account headers, and sends only the profile Bearer key upstream. Chat Completions mode supports text, reasoning, and function/custom tool loops. `/responses/compact`, multimodal input, hosted tools, and server-side conversation state fail explicitly and never fall back to the official route.

Remote Base URLs must use HTTPS. Plain HTTP is accepted only for loopback development gateways such as `http://127.0.0.1:8080/v1`.

## Config File

Configuration is stored at `~/.codex/cx-viewer/profile.json`:

```json
{
  "version": 3,
  "active": "my-proxy",
  "profiles": [
    { "id": "max", "name": "Default" },
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

- `active` — Legacy global fallback profile. The UI saves Main Agent selection per workspace; `"max"` preserves native routing.
- `profiles` — Profile list. `id: "max"` is built-in and cannot be deleted
- A UI save affects the current process immediately; other CX Viewer processes update within ~1.5 seconds through `fs.watchFile`

## Role Assignment

The Main Agent selection and Sub-Agent assignment belong to the current workspace. Sub-Agent can follow Main Agent, use Default, or use another saved profile. The selector is available when the native AppServer can verify the child thread belongs to this workspace. SDK exec keeps a single source and disables Sub-Agent assignment. Codex has no equivalent Teammate role.

When Main Agent uses Default on an official endpoint, role assignments are dormant and remain saved. Switching back to a profile restores them. A custom default endpoint can use explicit Sub-Agent assignments.

An accepted native turn keeps its selected source. Source changes apply to later turns. Managed system prompts apply only to new sessions; resume and fork keep the native persisted instructions.

`profile.json` remains the shared catalogue and legacy global fallback. The UI stores `{ activeId, roles: { subagent } }` in the allocated workspace log directory's `active-profile.json`, with no API keys in that file. Other CX Viewer processes refresh within about 1.5 seconds.
