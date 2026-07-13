# CX-Viewer Configuration Reference

## 1. Global Settings Panel (UI)

Open via top-left menu → "Global Settings".

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Filter Irrelevant Requests | Switch | On | Hide heartbeat, count_tokens, sub-agent and other non-main-agent requests |
| Expand Body Diff JSON | Switch | Off | Expand Body Diff section by default in request detail panel |
| Log Directory | Text Input | `~/.codex/cx-viewer` | Root directory for project log read/write. Supports `~/` expansion. Takes effect immediately on Enter or blur |

## 2. Display Settings Panel (UI)

Open via top-left menu → "Display Settings".

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Collapse Tool Results | Switch | On | Collapse tool call result blocks in chat view |
| Expand Thinking | Switch | On | Expand Codex reasoning/thinking blocks by default |
| Show Full Tool Content | Switch | Off | Show full untruncated tool call content |
| Auto Resume Session | Switch + Options | Off | Automatically choose when session resume prompt appears: `Continue` or `New` |

## 3. Preferences File

All UI settings are persisted to `<log_dir>/preferences.json` via the `/api/preferences` API.

```json
{
  "lang": "en",
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

| Field | Type | Description |
|-------|------|-------------|
| `lang` | string | UI language (zh/en/zh-TW/ko/ja/de/es/fr/it/da/pl/ru/ar/no/pt-BR/th/tr/uk) |
| `filterIrrelevant` | boolean | Filter irrelevant requests |
| `expandDiff` | boolean | Expand Body Diff JSON by default |
| `collapseToolResults` | boolean | Collapse tool results |
| `expandThinking` | boolean | Expand thinking blocks |
| `showFullToolContent` | boolean | Show full content |
| `logDir` | string | Log directory path |
| `resumeAutoChoice` | null / "continue" / "new" | Auto resume session choice |
| `disabledPlugins` | string[] | Disabled plugin filenames |
| `presetShortcuts` | array | Agent Team preset shortcuts |

## 4. Environment Variables

### CX-Viewer Specific

| Variable | Default | Description |
|----------|---------|-------------|
| `CXV_LOG_DIR` | `~/.codex/cx-viewer` | Log storage root directory. Special values: `tmp`/`temp` use system temp dir |
| `CXV_CLI_MODE` | unset | `=1` enables CLI mode (PTY terminal) |
| `CXV_SDK_MODE` | unset | `=1` enables Codex SDK mode (no terminal) |
| `CXV_WORKSPACE_MODE` | unset | `=1` enables workspace selection mode |
| `CXV_PROJECT_DIR` | `process.cwd()` | Project working directory for file operations and Git commands |
| `CXV_PROXY_PORT` | unset | Local Codex proxy port |
| `CXV_BYPASS_PERMISSIONS` | unset | `=1` skip tool permission approval with Codex bypass mode |
| `CXV_DISABLE_DELTA` | unset | `=1` disable incremental log storage, write full messages every time |
| `CXV_DEBUG` | unset | `=1` enable debug logging |
| `CXV_DEBUG_PLUGINS` | unset | `=1` enable plugin loading debug logging |

### Internal IPC

| Variable | Description |
|----------|-------------|
| `CXVIEWER_PORT` | Server port for ask-bridge/perm-bridge communication |
| `CXV_EDITOR_PORT` | Server port for cxv-editor file editing bridge |

### External (Read-only)

| Variable | Description |
|----------|-------------|
| `OPENAI_BASE_URL` | Custom OpenAI-compatible API base URL |
| `SHELL` | User's shell (PTY spawn and shell config detection) |
| `http_proxy` / `HTTPS_PROXY` etc. | HTTP proxy config (via undici EnvHttpProxyAgent) |

## 5. CLI Arguments

```
cxv [options] [codex args...]
```

### CX-Viewer Options

| Argument | Description |
|----------|-------------|
| `-logger` | Install/repair Codex logger integration |
| `--uninstall` / `-uninstall` | Remove all CX-Viewer integration |
| `--help` / `-h` / `help` | Show help text |
| `--version` / `-v` | Show version |
| `-SDK` / `--sdk` | Use Agent SDK mode |
| `--d` | Shortcut for `--dangerously-bypass-approvals-and-sandbox` |
| `--ad` | Legacy compatibility flag for CXV-side bypass toggles |
| `run` | Run command through the CXV wrapper (`cxv run -- codex ...`) |

### Codex Pass-through (common)

| Argument | Description |
|----------|-------------|
| `continue` | Resume the last session (`codex resume --last`) |
| `resume [session-id]` | Resume a specific session |
| `exec [prompt]` | Non-interactive Codex execution |
| `--model` | Specify model |
| `--search` | Enable live web search mode |
| `-C` / `--cd` | Set working directory |
| `--sandbox` | Set sandbox mode |
| `--ask-for-approval` | Set approval policy |

## 6. Interactive Bridge Configuration

CX-Viewer connects the Codex CLI TUI to a local App Server through a WebSocket proxy. Native `request_user_input` server requests are claimed by the Web UI when it is connected, answered with the original JSON-RPC request ID, and handed back to the TUI when the Web UI is unavailable. The exact installed CLI schema is checked at startup.

### Permission Approval Bridge
- **Matcher**: `".*"` (regular expression matching all permission requests)
- **Command**: `node <install_dir>/lib/perm-bridge.js`
- **Purpose**: Mutating or external tools such as `shell_command`, `apply_patch`, `web_search`, and `image_generation` require Web UI approval; others pass through

## 7. Shell Integration

CX-Viewer can inject a `codex()` wrapper into `~/.zshrc` (or `.bashrc`) in logger mode:

```bash
# >>> CX-Viewer Auto-Inject >>>
codex() { ... }
# <<< CX-Viewer Auto-Inject <<<
```

Interactive `codex` commands are routed through CX-Viewer for log capture and Web UI features, while pass-through commands such as `codex --help` and `codex auth` continue to run directly.

Uninstall: `cxv --uninstall` or manually delete content between the markers.

## 8. Proxy Configuration (Proxy Profile)

Stored in `<log_dir>/profile.json`, managed via the "Proxy Switch" panel in the UI.

```json
{
  "active": "max",
  "profiles": [
    { "id": "max", "name": "Default" },
    { "id": "my-proxy", "name": "Custom", "baseURL": "https://...", "apiKey": "sk-..." }
  ]
}
```

| Field | Description |
|-------|-------------|
| `active` | Active profile ID (`"max"` = direct connection, no proxy) |
| `id` | Unique identifier |
| `name` | Display name |
| `baseURL` | Proxy API address (replaces request origin) |
| `apiKey` | Proxy API key (replaces auth headers) |
| `models` | Available model list |
| `activeModel` | Currently selected model |

## 9. Plugin System

Plugin directory: `<log_dir>/plugins/`

### Supported Hook Types

| Hook | Type | Description |
|------|------|-------------|
| `httpsOptions` | Waterfall | Provide HTTPS certificate (return `{ cert, key }` or `{ pfx }`) |
| `localUrl` | Waterfall | Modify local access URL |
| `serverStarted` | Parallel | Server startup notification |
| `serverStopping` | Parallel | Server shutdown notification |
| `onNewEntry` | Parallel | New log entry written notification |

Plugin enable/disable managed via `disabledPlugins` array in `preferences.json`.

## 10. Directory Structure

```
~/.codex/cx-viewer/                # Log root directory
├── preferences.json               # User preferences
├── workspaces.json                # Workspace registry
├── profile.json                   # Proxy configuration
├── plugins/                       # Plugin directory
│   └── my-plugin.js
├── <project>/                     # Per-project log directory
│   ├── <project>_20260404_123456.jsonl  # JSONL log files
│   ├── <project>.json             # Stats data (background generated)
│   └── images/                    # Persistent uploaded image copies
└── ...

/tmp/cx-viewer-uploads/            # Temporary upload file directory
```

## 11. Server Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| Port range | 7008-7099 | Auto-scans for available port |
| Bind address | 0.0.0.0 | All network interfaces |
| Access token | Random 16-byte hex | LAN access requires `?token=xxx`; localhost is exempt |
| HTTPS | Plugin only | Requires plugin providing `httpsOptions` hook |
| CORS | `*` | All origins allowed |
| Upload limit | 50MB | Maximum single file upload size |

## 12. URL Parameters

| Parameter | Description |
|-----------|-------------|
| `?token=xxx` | LAN access authentication token |
| `?logfile=path` | Open specific historical log file (read-only mode) |

## 13. localStorage Settings

| Key | Description |
|-----|-------------|
| `cxv_viewMode` | Current responsive view mode override |
| `cxv_fileExplorerOpen` | File explorer panel toggle |
| `cx-viewer-terminal-width` | Terminal panel width (pixels) |
