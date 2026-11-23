# CX-Viewer Plugin System

[中文](./plugins.zh.md) · [Service and panel plugins](./plugin-services.md)

Plugins live in `$CXV_LOG_DIR/plugins/` (default `~/.codex/cx-viewer/plugins/`) or the bundled `plugins/` directory. User names take priority. A single `.js`/`.mjs` file exports `{name, hooks}`; a directory declares `plugin.json`. Plugins are trusted local code, not a security sandbox.

```js
export default {
  name: 'example',
  hooks: {
    async localUrl({url}) { return {url}; },
    async serverStarted({url, registerRoute}) {
      registerRoute('GET', '/api/example', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({hello: 'world'}));
      });
    },
  },
};
```

Waterfall hooks run serially in plugin order: `httpsOptions` returns `{cert,key}` or `{pfx,passphrase}` before binding; `localUrl` transforms the share link; `beforeRequest` receives `{req,res,url,method,parsedUrl,handled}` and returns only `{handled:true}` after writing a response. Native authentication, protected management routes and exact workspace checks run first. Do not override request identity fields.

Parallel hooks notify `serverStarted`, `serverStopping`, `onNewEntry`, `onAgentLoopStart` and `onAgentLoopEnd`. `serverStarted` receives port/host/url/basePath/ip/token/protocol/httpServer/registerRoute. It does not expose an unscoped PTY or native approval resolvers. Agent-loop payloads preserve the native exact instance and turn identity; SDK and PTY originate from their own accepted/settled signals.

The loader retains the upstream permission/plan/ask hook names and 15-second timeout for compatibility. Native Codex approval/reviewer and Ask handling do not invoke Claude approval resolvers. A timeout cannot cancel a plugin's own asynchronous work.

Hook errors are logged and isolated. Disable plugins through Plugin Management or `disabledPlugins` preferences. Reload re-scans both shapes; directory lifecycle, hot reload limits, child secret protection and panel registration are described in [service plugins](./plugin-services.md). Native `voiceInput` and capability/module-version hooks remain available to voice packs.
