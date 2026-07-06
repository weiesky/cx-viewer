# CX-Viewer

A Codex request monitoring system that captures and visualizes all API requests and responses from Codex in real time (raw text, unredacted). Helps developers monitor their context for review and troubleshooting during Vibe Coding sessions.
The latest version of CX-Viewer also provides a server-deployed web programming solution and mobile programming tools. Feel free to use them in your own projects — more plugin features and cloud deployment support are coming in the future.

Check out the fun part — here's what you can see on mobile:

<img width="1700" height="790" alt="image" src="https://github.com/user-attachments/assets/da3e519f-ff66-4cd2-81d1-f4e131215f6c" />

English | [简体中文](./docs/README.zh.md) | [繁體中文](./docs/README.zh-TW.md) | [한국어](./docs/README.ko.md) | [日本語](./docs/README.ja.md) | [Deutsch](./docs/README.de.md) | [Español](./docs/README.es.md) | [Français](./docs/README.fr.md) | [Italiano](./docs/README.it.md) | [Dansk](./docs/README.da.md) | [Polski](./docs/README.pl.md) | [Русский](./docs/README.ru.md) | [العربية](./docs/README.ar.md) | [Norsk](./docs/README.no.md) | [Português (Brasil)](./docs/README.pt-BR.md) | [ไทย](./docs/README.th.md) | [Türkçe](./docs/README.tr.md) | [Українська](./docs/README.uk.md)

## Usage

### Installation

```bash
npm install -g cx-viewer --registry=https://registry.npmjs.org
```

### Programming Mode

`cxv` launches the Web Viewer and then forwards the real Codex CLI surface through unchanged. CXV only adds a few wrapper features of its own:

- `cxv continue` is a convenience alias for `codex resume --last`
- `cxv --d` is a convenience alias for `codex --dangerously-bypass-approvals-and-sandbox`
- `cxv --ad` is a legacy compatibility flag kept only for CXV-side bypass toggles

Everything else should be treated as standard Codex CLI syntax.

```bash
cxv                                         # == codex (interactive mode)
cxv continue                                # == codex resume --last
cxv resume --last                           # == codex resume --last
cxv -c 'model="gpt-5.5"'                    # == codex -c 'model="gpt-5.5"'
cxv exec "summarize this repo"              # == codex exec "summarize this repo"
cxv review                                  # == codex review
cxv --search --model gpt-5.5                # == codex --search --model gpt-5.5
cxv --d                                     # == codex --dangerously-bypass-approvals-and-sandbox
```

The author's most-used command is:

```bash
cxv continue --d
```

After launching in programming mode, a web page will open automatically.

You can use Codex directly from the web page while viewing the full request payloads and code changes.

Even better — you can even code from your mobile device!


### Logger Mode

⚠️ If you still prefer using the native codex tool or VS Code extension, use this mode.

In this mode, launching `codex` or `codex --dangerously-skip-permissions` will automatically start a logging process that records request logs to ~/.codex/cx-viewer/*yourproject*/date.jsonl

Enable logger mode:
```bash
cxv -logger
```

When the console cannot print the specific port, the default first port is 127.0.0.1:7008. Multiple instances use sequential ports like 7009, 7010.

This command automatically detects how Codex is installed locally (NPM or Native Install) and adapts accordingly.

- **NPM version Codex**: Automatically injects an interceptor script into Codex's `cli.js`.
- **Native version Codex**: Automatically detects the `codex` binary, configures a local transparent proxy, and sets up a Zsh Shell Hook to forward traffic automatically.
- NPM-installed Codex is the recommended approach for this project.

Uninstall logger mode:
```bash
cxv --uninstall
```

### Troubleshooting

If you encounter issues starting cx-viewer, here is the ultimate troubleshooting approach:

Step 1: Open Codex in any directory.

Step 2: Give Codex the following instruction:

```
I have installed the cx-viewer npm package, but after running cxv it still doesn't work properly. Please check cx-viewer's cli.js and findcx.js, and adapt them to the local Codex deployment based on the specific environment. Keep the scope of changes as constrained as possible within findcx.js.
```

Letting Codex diagnose the issue itself is more effective than asking anyone or reading any documentation!

After the above instruction is completed, `findcx.js` will be updated. If your project frequently requires local deployment, or if forked code often needs to resolve installation issues, keeping this file lets you simply copy it next time. At this stage, many projects and companies using Codex are not deploying on Mac but rather on server-side hosted environments, so the author has separated `findcx.js` to make it easier to track cx-viewer source code updates going forward.

### Other Commands

See:

```bash
cxv -h
```

The most useful inherited Codex commands in CXV are:

- `cxv resume [session-id]`
- `cxv exec [prompt]`
- `cxv review`
- `cxv -c key=value`
- `cxv --search`
- `cxv -C <dir>`

### Configuration Override

If you need to use a custom API endpoint (e.g., a corporate proxy), simply configure it in `~/.codex/settings.json` or set the `OPENAI_BASE_URL` environment variable. `cxv` will automatically detect and correctly forward requests.

### Silent Mode

By default, `cxv` runs in silent mode when wrapping `codex`, keeping your terminal output clean and consistent with the native experience. All logs are captured in the background and can be viewed at `http://localhost:7008`.

Once configured, use the `codex` command as normal. Visit `http://localhost:7008` to access the monitoring interface.


## Features


### Programming Mode

After launching with cxv, you can see:

<img width="1500" height="765" alt="image" src="https://github.com/user-attachments/assets/ab353a2b-f101-409d-a28c-6a4e41571ea2" />


You can view code diffs directly after editing:

<img width="1500" height="728" alt="image" src="https://github.com/user-attachments/assets/2a4acdaa-fc5f-4dc0-9e5f-f3273f0849b2" />

While you can open files and code manually, manual coding is not recommended — that's old-school coding!

### Mobile Programming

You can even scan a QR code to code from your mobile device:

<img width="3018" height="1460" alt="image" src="https://github.com/user-attachments/assets/8debf48e-daec-420c-b37a-609f8b81cd20" />

Fulfill your imagination of mobile programming. There's also a plugin mechanism — if you need to customize for your coding habits, stay tuned for plugin hooks updates.

### Logger Mode (View Complete Codex Sessions)

<img width="1500" height="768" alt="image" src="https://github.com/user-attachments/assets/a8a9f3f7-d876-4f6b-a64d-f323a05c4d21" />


- Captures all API requests from Codex in real time, ensuring raw text — not redacted logs (this is important!!!)
- Automatically identifies and labels Main Agent and Sub Agent requests (subtypes: Plan, Search, Bash)
- MainAgent requests support Body Diff JSON, showing collapsed differences from the previous MainAgent request (only changed/new fields)
- Each request displays inline Token usage statistics (input/output tokens, cache creation/read, hit rate)
- Compatible with Codex Router (CCR) and other proxy scenarios — falls back to API path pattern matching

### Conversation Mode

Click the "Conversation Mode" button in the top-right corner to parse the Main Agent's complete conversation history into a chat interface:

<img width="1500" height="764" alt="image" src="https://github.com/user-attachments/assets/725b57c8-6128-4225-b157-7dba2738b1c6" />


- Agent Team display is not yet supported
- User messages are right-aligned (blue bubbles), Main Agent replies are left-aligned (dark bubbles)
- `thinking` blocks are collapsed by default, rendered as Markdown — click to expand and view the thinking process; one-click translation is supported (feature is still unstable)
- User selection messages (AskUserQuestion) are displayed in Q&A format
- Bidirectional mode sync: switching to conversation mode auto-scrolls to the conversation corresponding to the selected request; switching back to raw mode auto-scrolls to the selected request
- Settings panel: toggle default collapse state for tool results and thinking blocks
- Mobile conversation browsing: in mobile CLI mode, tap the "Conversation Browse" button in the top bar to slide out a read-only conversation view for browsing the complete conversation history on mobile

### Statistics Tool

The "Data Statistics" floating panel in the header area:

<img width="1500" height="765" alt="image" src="https://github.com/user-attachments/assets/a3d2db47-eac3-463a-9b44-3fa64994bf3b" />

- Displays cache creation/read counts and cache hit rate
- Cache rebuild statistics: grouped by reason (TTL, system/tools/model changes, message truncation/modification, key changes) showing counts and cache_creation tokens
- Tool usage statistics: displays call frequency for each tool sorted by number of calls
- Skill usage statistics: displays call frequency for each skill sorted by number of calls
- Supports teammate statistics
- Concept help (?) icon: click to view built-in documentation for MainAgent, CacheRebuild, and each tool

### Log Management

Via the CX-Viewer dropdown menu in the top-left corner:
<img width="1500" height="760" alt="image" src="https://github.com/user-attachments/assets/33295e2b-f2e0-4968-a6f1-6f3d1404454e" />

**Log Compression**
Regarding logs, the author wants to clarify that the official Anthropic definitions have not been modified, ensuring log integrity. However, since individual log entries from the 1M Opus model can become extremely large in later stages, thanks to certain log optimizations for MainAgent, at least 66% size reduction is achieved without gzip. The parsing method for these compressed logs can be extracted from the current repository.

### More Useful Features

<img width="1500" height="767" alt="image" src="https://github.com/user-attachments/assets/add558c5-9c4d-468a-ac6f-d8d64759fdbd" />

You can quickly locate your prompts using the sidebar tools.

--- 

<img width="1500" height="765" alt="image" src="https://github.com/user-attachments/assets/82b8eb67-82f5-41b1-89d6-341c95a047ed" />

The interesting KV-Cache-Text feature lets you see exactly what Claude sees.

---

<img width="1500" height="765" alt="image" src="https://github.com/user-attachments/assets/54cdfa4e-677c-4aed-a5bb-5fd946600c46" />

You can upload images and describe your needs — Claude's image understanding is incredibly powerful. And as you know, you can paste images directly with Ctrl+V, and your complete content will be displayed in the conversation.

---

<img width="600" height="370" alt="image" src="https://github.com/user-attachments/assets/87d332ea-3e34-4957-b442-f9d070211fbf" />

You can customize plugins, manage all CX-Viewer processes, and CX-Viewer supports hot-switching to third-party APIs (yes, you can use GLM, Kimi, MiniMax, Qwen, DeepSeek — although the author considers them all quite weak at this point).

---


<img width="1500" height="746" alt="image" src="https://github.com/user-attachments/assets/b1f60c7c-1438-4ecc-8c64-193d21ee3445" />

More features waiting to be discovered... For example: the system supports Agent Team, and has a built-in Code Reviewer. Codex Code Reviewer integration is coming soon (the author highly recommends using Codex to review Codex's code).


### Auto-Update

CX-Viewer automatically checks for updates on startup (at most once every 4 hours). Within the same major version (e.g., 1.x.x -> 1.y.z), updates are applied automatically and take effect on the next restart. Cross-major-version updates only show a notification.

Auto-update follows Codex's global configuration in `~/.codex/settings.json`. If Codex has auto-updates disabled (`autoUpdates: false`), CX-Viewer will also skip auto-updates.

### Multi-language Support

CX-Viewer supports 18 languages, automatically switching based on system locale:

简体中文 | English | 繁體中文 | 한국어 | Deutsch | Español | Français | Italiano | Dansk | 日本語 | Polski | Русский | العربية | Norsk | Português (Brasil) | ไทย | Türkçe | Українська

## License

MIT
