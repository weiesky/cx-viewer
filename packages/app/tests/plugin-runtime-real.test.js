import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { setLogDir } from '../findcx.js';
import { loadPlugins } from '../lib/plugin-loader.js';
import { onServerStarted, onServerStopping, restartPlugin, reloadRuntime, getRuntimePluginStatus, tryProxyHttp, tryProxyUpgrade } from '../lib/plugin-runtime.js';
import { WebSocket } from 'ws';

// Real detached service + production runtime/proxy modules. The small HTTP host
// below is a fixture; this does not claim main-server auth or GUI coverage.
test('real service crash/restart/reload, HTTP/WS proxy and owned cleanup', { timeout: 20000 }, async () => {
  const root = mkdtempSync('/tmp/cxv-plugin-runtime-');
  const pluginDir = join(root, 'plugins', 'real-service');
  mkdirSync(pluginDir, { recursive: true });
  writeFileSync(join(pluginDir, 'plugin.json'), JSON.stringify({ name: 'real-service', service: { entry: 'service.mjs' } }));
  const writeService = marker => writeFileSync(join(pluginDir, 'service.mjs'), `
    const { startPluginService, WebSocketServer } = await import(process.env.CCV_PLUGIN_HOST);
    const wss = new WebSocketServer({ noServer: true });
    wss.on('connection', ws => ws.on('message', data => ws.send('echo:' + data)));
    await startPluginService({
      onRequest(req, res) {
        if (req.url.startsWith('/crash')) {
          res.end('bye'); setTimeout(() => process.exit(1), 20); return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ marker: ${JSON.stringify(marker)}, url: req.url, pid: process.pid,
          token: process.env.CXV_ACCESS_TOKEN, key: process.env.OPENAI_API_KEY }));
      },
      onUpgrade(req, socket, head) { wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws)); },
    });
  `);
  writeService('first');
  const previous = { spawn: process.env.CXV_TEST_ALLOW_PLUGIN_SPAWN, token: process.env.CXV_ACCESS_TOKEN, key: process.env.OPENAI_API_KEY };
  process.env.CXV_TEST_ALLOW_PLUGIN_SPAWN = '1';
  process.env.CXV_ACCESS_TOKEN = 'fixture-private-token';
  process.env.OPENAI_API_KEY = 'fixture-private-key';
  const host = http.createServer((req, res) => {
    if (!tryProxyHttp(req, res, new URL(req.url, 'http://localhost'))) { res.writeHead(404); res.end(); }
  });
  host.on('upgrade', (req, socket, head) => {
    if (!tryProxyUpgrade(req, socket, head, new URL(req.url, 'http://localhost'))) socket.destroy();
  });
  let ws;
  const pids = new Set();
  const ready = async oldPid => {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const status = getRuntimePluginStatus('real-service');
      if (status?.state === 'ready' && status.pid !== oldPid) { pids.add(status.pid); return status; }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error('service did not become ready');
  };
  try {
    setLogDir(root);
    host.listen(0, '127.0.0.1');
    await once(host, 'listening');
    const port = host.address().port;
    await loadPlugins();
    await onServerStarted({ logDir: root, port, host: '127.0.0.1', httpServer: host });
    const first = await ready();
    const origin = `http://127.0.0.1:${port}`;
    const body = await (await fetch(`${origin}/plugins/real-service/hello?token=host-secret&x=1`)).json();
    assert.deepEqual(body, { marker: 'first', url: '/hello?x=1', pid: first.pid });
    ws = new WebSocket(`ws://127.0.0.1:${port}/plugins/real-service/ws?token=host-secret`);
    await once(ws, 'open');
    const message = once(ws, 'message');
    ws.send('native');
    assert.equal((await message)[0].toString(), 'echo:native');
    const closed = once(ws, 'close');
    await (await fetch(`${origin}/plugins/real-service/crash`)).text();
    await closed;
    const restarted = await ready(first.pid);
    assert.equal(restarted.restarts, 1);
    writeService('changed');
    assert.equal((await reloadRuntime()).ok, true);
    const reloaded = await ready(restarted.pid);
    assert.equal((await (await fetch(`${origin}/plugins/real-service/hello`)).json()).marker, 'changed');
    assert.equal((await restartPlugin('real-service')).ok, true);
    await ready(reloaded.pid);
    await onServerStopping();
    for (const pid of pids) assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
    const files = readdirSync(join(root, 'plugins-runtime', 'real-service'));
    assert.deepEqual(files.filter(name => name.endsWith('.lock') || name.endsWith('.json')), []);
  } finally {
    ws?.terminate();
    await onServerStopping();
    host.closeAllConnections();
    await new Promise(resolve => host.close(resolve));
    for (const [key, value] of Object.entries({ CXV_TEST_ALLOW_PLUGIN_SPAWN: previous.spawn, CXV_ACCESS_TOKEN: previous.token, OPENAI_API_KEY: previous.key })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    setLogDir('tmp');
    rmSync(root, { recursive: true, force: true });
  }
});
