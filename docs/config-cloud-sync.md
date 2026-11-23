# Config cloud sync contract (CX Viewer)

This is a documentation-only adaptation of the frozen cc-viewer contract at `74cd752d99caf122e750216d2af3bb9f467c4de1`, including its later credential-root correction. **CX Viewer has no cloud sync client or `/config/*` endpoints.** Nothing is uploaded, and this document does not change local writes or enable a service. [中文](./config-cloud-sync.zh.md)

## Scope and native mapping

| Cloud object | Allowed projection | Native source and limits |
|---|---|---|
| `user_preferences` | `lang`, `ui`, `disabledPlugins`, `prefsByProject`, `activeProfile` | Explicit non-secret fields from `preferences.json`; per-project proxy assignment from validated `active-profile.json`. `prefsByProject` is reserved in this contract: this build has no general per-project preference forks. |
| `proxy_profiles` | `profiles[{profileId,name,baseUrl,modelMap}]`, `activeProfileId` | `profile.json`: `profileId` maps to `id`, `baseUrl` to `baseURL`, `activeProfileId` to `active`; `modelMap` maps only supported native `activeModel`, `effort`, `wireApi`. No Anthropic tier variables. |
| `credentials` | `{kind,ref,ciphertext}` | Opaque, versioned local vault envelopes, separately from plaintext preferences and profiles. |

Never upload whole configuration files. Exclude `auth`, `authByProject`, passwords, API keys and IM secrets from plaintext projections. Also exclude `scheduledTasks`, `scheduled-task-runs.json`, task prompts/attachments, workspace/session registries, pins, Ask stores, update state, wire/raw logs, statistics, prompt snapshots, downloaded plugins/voice packs, IM directories, trash, machine paths and local credential migration/recovery state. Strip tasks even when they were historically embedded in preferences. Installed assets are not configuration.

The native proxy role is `subagent`; do not manufacture a `teammate` route or unsupported preference fork. Machine-specific project identifiers require an explicit mapping before use on another machine.

## Proposed sync semantics

As in the upstream contract, an enabled and reachable cloud would be authoritative: cloud write first, then local projection; pull at startup and on poll. During an outage the projection would be read-only, with no offline write queue. A failed pull would retain the last projection and record per-key `lastPulledAt` / `lastPullError` in local `sync-state.json` until a successful pull clears the stale indication. These are future contract requirements, not current runtime behavior.

## Proposed authenticated REST contract

All payloads are JSON. The service must authenticate the caller and derive its tenant server-side; a supplied `userId` is not an authentication credential and cannot select another user's data.

| Endpoint | Request | Successful response |
|---|---|---|
| `GET /config/preferences?userId=<id>` | Authenticated user | `{lang,ui,disabledPlugins,prefsByProject,activeProfile,updatedAt}` |
| `PUT /config/preferences` | `{userId,lang?,ui?,disabledPlugins?,prefsByProject?,activeProfile?}`; absent keys unchanged | `{updatedAt}` |
| `GET /config/profiles?userId=<id>` | Authenticated user | `{profiles:[{profileId,name,baseUrl,modelMap}],activeProfileId,updatedAt}` |
| `PUT /config/profiles` | `{userId,profiles:[{profileId,name,baseUrl,modelMap}],activeProfileId}`; replace the complete set | `{updatedAt}` |
| `GET /config/credentials?userId=<id>` | Authenticated user | `{creds:[{credId,kind,ref,ciphertext,updatedAt}]}` |
| `PUT /config/credentials` | `{userId,creds:[{kind,ref,ciphertext}]}`; upsert by kind/ref | `{updatedAt}` |

`updatedAt` is a cloud ISO timestamp. Store preference objects in `user_preferences` keyed by tenant, profile rows in `proxy_profiles` keyed by tenant and profile ID, and secret rows in `credentials` keyed by tenant and kind/ref. JSON-valued columns retain the documented objects; this schema grants no runtime permission to unknown keys. `ui.theme` maps to local `themeColor`; voice event maps accept only this build's supported events. Native validation, revisions, credential locks and durable atomic writes still apply during materialization.

## Separate credential channel

The upstream S2 direction is ciphertext up, key local. Native AES-256-GCM envelopes are `v1:` plus base64 of IV, tag and ciphertext, authenticated with the credential kind/ref. Preserve the complete versioned envelope and identity; do not re-label it or replace it with a plaintext value.

Allowed secret kinds are `profile-apiKey`, `lan-password` and `im-secret`; only DingTalk currently has a live IM backend. Local `configuration-state` records are not cloud credentials. `master.key`, credential backups, damaged-source evidence and recovery candidates never leave the machine. A ciphertext copy alone cannot restore secrets on a new machine without the matching key; key transfer/recovery has not been implemented by this contract.

Native credential ownership is frozen at process startup: the log-root store and shared profile-owner store may differ. Changing the runtime log directory does not relocate or re-key either store. Corruption or an owner mismatch must remain an explicit error, never an empty-store fallback. Keep the existing HTTPS password gate and native approval/reviewer behavior; this advisory authorizes no permission changes.
