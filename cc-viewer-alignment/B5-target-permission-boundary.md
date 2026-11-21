# B5 外部目标权限边界

用户于2026-11-21通过 request_user_input 明确选择「按上游启用远程管理员」。E35–E45已接目标目录、共用内容读写/下载、原菜单与 AGENTS/技能入口，并补齐普通文件工具的原生状态保护及原文件操作差异。最终1781/1781、0skip，构建/pack712及新安装487/487通过；E38双引擎8场26图、E45用户/插件双引擎6图单列留证。B5范围已完成，混合子项/未验环境见[完成矩阵](./B5-completion-matrix.md)。以下E34表保留为接线前的历史依据。

## 实际差异

- 固定上游 `74cd752d` 的 `server/lib/auth.js` 在凭据分支计算 `isAdmin`，`server/server.js` 将其写入 `req.ccvIsAdmin`。本机、有效 URL token 或有效登录 cookie 可以成为管理员；静态资源、空密码放行等不构成管理员。
- `7a75e1be81b3e90f55f8888c423e66e05c1cde64` 的 target 读写在读 body 前检查管理员和同源。所有目标从服务端发现的身份重建，导航可以到 HOME/config 父级，但每个条目仍受 allowlist 和敏感路径策略限制。
- native `lib/auth.js` 使用独立的访问 token 与有时效的登录 session，返回放行决策；`lib/auth-routes.js` 的 `isAdmin` 目前仍仅为 `isLocal`，认证设置和密码显示/修改只授权本机。不能把两套管理员语义当作已经一致。

## 已选方案与对照

| 方案 | 目标功能的具体行为 | 保持的边界 |
| --- | --- | --- |
| 按上游启用远程管理员（交互问题中的推荐项） | 在现有鉴权已放行后，仅为目标模式认可实际有效的 URL token 或登录 session。允许浏览/编辑 allowlist 内目标；同源、身份重建、原生凭据/历史/归档保护照常执行。 | 不改变现有认证设置的本机管理权限，不显示远程密码，不扩内核 bridge 权限；空密码/静态资源放行不获得目标管理员权限。 |
| 外部目标仅限本机 | 使用现有严格的 `isLocal`（可信 TCP peer + Host + Origin）作为目标管理员门槛。远程目标目录请求返回 403，并登记为基线差异。 | 同样保留完整 allowlist/路径/敏感文件保护；不能通过共用 content/raw/download 的目标模式绕过门槛。 |

两种方案都沿用原 target 的整导航根语义，写入还必须通过逐路径策略，不能把 HOME 导航理解成 HOME 总授权。目标使用共用文件 API 的读写也须纳入同一边界审计；既有外部 `$EDITOR` 兼容路径随接线核对，不能让客户端自报字段绕过选定权限。

## 已有证据与剩余工作

- [E26 策略](./B5-target-policy-2026-11-21.json)、[E32 身份/导航根](./B5-target-scope-2026-11-21.json)及 E33 原生祖先保护分别测试；既有凭据保护只使用路径/inode 元数据，不读取真实认证内容。
- E35–E45的接线、HTTP/实际FS、浏览器与安装证据见[B5实施](./B5-implementation.md)、[目标GUI回执](./B5-target-browser-2026-11-21.json)、[用户/插件GUI](./B5-target-sources-2026-11-21.json)及[最终回执](./B5-final-2026-11-21.json)。
- 权限决策已取得，不再重复确认；仅对目标文件功能使用有效远程认证，保留本机专属认证管理与内部桥接。

## E34 接线前调用链核对（2026-11-21）

在 E33 `ef3cb51` 后重新核对固定源码的 `files-content.js`、完整 `target-files-fs.js`、`is-admin.js`、`same-origin.js` 与 native `server.js`、`auth.js`、`file-api.js`、`credential-file-policy.js` 及 Web 文件调用方。本节是接线审计，尚未实施下表中的工作，不计为端点或 GUI 通过。

| 链路 | 实际代码差异与待落实边界 |
| --- | --- |
| 管理员身份 | native `decideAuth` 只返回 action，`isAuthSessionValid` 另校验有效期、generation、认证 context。若选上游方案，必须复用这些有效凭据判据，不能把 action=allow（包括静态资源、登录/退出和空密码）作为管理员凭证；认证设置与内部 bridge 仍使用原边界。 |
| 同源 | 原 `isSameOriginBrowserRequest` 还拒绝无 Origin 但带 `Sec-Fetch-Site: cross-site` 的浏览器请求。native 全局目前检查 Origin；目标端点接线时不能遗漏此分支。native 已有严格 scheme 比较不应因复制上游反向代理逻辑而放宽。 |
| 内容 GET/raw | native `resolveFilePath(..., true)` 接受客户端 `editorSession=true` 后只组合原有凭据保护，不是 E26 allowlist/native history 策略。原 content/raw 以绝对路径和全局 read policy 工作，并不重建 target 身份。不能只给新增 `/api/target-files` 加门槛就宣布共用读接口完成；必须覆盖带/不带 kind、editorSession、绝对路径及 raw 路径形式的请求。 |
| 下载 | native E5 目前限定项目根并使用已验证 descriptor 流；原基线允许 allowlist 内绝对路径。外部目标下载要明确纳入所选权限，并保留本地 descriptor 身份校验、断开清理和无预览大小上限契约。 |
| 保存 | 原 target POST 由服务端身份重建整 navigation root，使用 write policy；208f1348 还为新文件重建不存在的叶路径。native 既有 descriptor 验证、二进制/UTF-16 拒写须保留。`editorSession` 不能覆盖 target 的身份、写策略或选定权限。 |
| 原入口/菜单 | FileBrowserModal 的 target UI 目前休眠，校验还是 Claude 12hex；FileContentView 未消费 target，菜单执行器未消费其传入的 target/project/instance，apiUrl 尚无原 withTargetParams。只改入口会使读写落回项目根。接线须整链迁原逻辑，并在静态确认框打开前冻结完整目标 URL，避免 A→B 后操作漂移。 |

后续隔离 HTTP 验证必须包含：有效 URL token/有效登录 session 与过期、撤销、伪 cookie、空密码放行的区别；无 Origin 的 cross-site；相同名称 A/B 在 body 延迟和确认框存活期间的归属；外部 content/raw/download 与 editorSession 旁路；保护路径/硬链接/符号链接/owner 祖先；缺失叶保存和字节保持。以上均为待验项目，最新已跑通过数仍为 E33 的1746全量及451新安装，本轮没有重复运行。
