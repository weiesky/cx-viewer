# 配置云端同步契约（CX Viewer）

本文按固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1` 的云端契约及后续凭据根回退作原生适配，**只迁文档**。当前 CX Viewer 没有云同步客户端或 `/config/*` 接口，不上传任何数据，也不因本文改变本地写入或开启服务。[English](./config-cloud-sync.md)

## 范围与原生映射

| 云端对象 | 允许的投影 | 本地来源与限制 |
|---|---|---|
| `user_preferences` | `lang`、`ui`、`disabledPlugins`、`prefsByProject`、`activeProfile` | 从 `preferences.json` 明确选取非密钥字段；项目代理指派来自已验证的 `active-profile.json`。`prefsByProject` 仅为契约保留字段，本构建没有通用项目偏好分叉。 |
| `proxy_profiles` | `profiles[{profileId,name,baseUrl,modelMap}]`、`activeProfileId` | `profile.json` 的 `id`、`baseURL`、`active` 对应云端字段；`modelMap` 只映射原生支持的 `activeModel`、`effort`、`wireApi`，不套用 Anthropic 档位变量。 |
| `credentials` | `{kind,ref,ciphertext}` | 独立存储完整版本化 vault 密文，不混入明文偏好与代理配置。 |

禁止整文件上传。明文投影剥离 `auth`、`authByProject`、密码、API key、IM secret；另排除 `scheduledTasks`、`scheduled-task-runs.json`、任务提示/附件、工作区/会话注册表、pin、Ask 存储、更新状态、wire/raw 日志、统计缓存、提示快照、下载的插件/语音包、IM 目录、回收站、机器路径，以及凭据迁移/恢复状态。旧偏好文件中夹带的任务也必须剥离；安装资产不属于配置。

原生代理角色仅有 `subagent`，不能据云端字段制造 `teammate` 路由或通用偏好分叉。项目身份与机器路径跨机使用前须有明确映射。

## 拟定同步语义

沿上游契约：云端启用且可达时以云端为准，先写云端、成功后投影本地，启动及轮询时拉取；不可达时投影只读，不接受离线编辑，也不积压待写队列。拉取失败保留旧投影，在本地 `sync-state.json` 按键记 `lastPulledAt` / `lastPullError`，成功拉取后清除过期提示。这些都是未来实现的约束，当前运行逻辑没有切换为只读云端模式。

## 拟定鉴权 REST 接口

请求与响应均为 JSON。服务端必须鉴权并从身份推导租户；请求中的 `userId` 不是鉴权凭证，不能用来访问其他用户数据。

| 接口 | 请求 | 成功返回 |
|---|---|---|
| `GET /config/preferences?userId=<id>` | 已鉴权用户 | `{lang,ui,disabledPlugins,prefsByProject,activeProfile,updatedAt}` |
| `PUT /config/preferences` | `{userId,lang?,ui?,disabledPlugins?,prefsByProject?,activeProfile?}`，缺省键不变 | `{updatedAt}` |
| `GET /config/profiles?userId=<id>` | 已鉴权用户 | `{profiles:[{profileId,name,baseUrl,modelMap}],activeProfileId,updatedAt}` |
| `PUT /config/profiles` | `{userId,profiles:[{profileId,name,baseUrl,modelMap}],activeProfileId}`，整组替换 | `{updatedAt}` |
| `GET /config/credentials?userId=<id>` | 已鉴权用户 | `{creds:[{credId,kind,ref,ciphertext,updatedAt}]}` |
| `PUT /config/credentials` | `{userId,creds:[{kind,ref,ciphertext}]}`，按 kind/ref 更新或新增 | `{updatedAt}` |

`updatedAt` 是云端 ISO 时间戳。`user_preferences` 按租户存偏好对象，`proxy_profiles` 按租户和 profile ID 存代理，`credentials` 按租户和 kind/ref 存密文。JSON 列保留契约对象，不代表允许运行时接受未知字段。`ui.theme` 映射本地 `themeColor`；语音事件只接受当前构建支持项。投影仍须经过原生校验、revision、凭据锁与持久化原子写。

## 独立凭据通道

沿上游 S2 方向：密文上云、主密钥留本机。原生 AES-256-GCM 信封为 `v1:` 加 IV、tag、密文的 base64，并以 kind/ref 作认证数据；必须保留完整版本信封和身份，不能改标签或用明文覆盖。

仅允许 `profile-apiKey`、`lan-password`、`im-secret` 三类；当前只有钉钉提供真实 IM 后端。本地 `configuration-state` 不属于云端凭据。`master.key`、凭据备份、损坏源证据和候选恢复密钥均不上云。只有密文而没有匹配密钥，不能在新机器恢复；本文未实现跨机密钥传递或恢复。

凭据所属目录在进程启动时冻结：日志根凭据与共享代理所属凭据可能分开；运行时切日志目录不迁根、不重建密钥。损坏或 owner 不符仍须明确报错，不能退成空存储。既有 HTTPS 密码门与原生审批/reviewer 保持，本文不授权权限变化。
