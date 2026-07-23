import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

function listen(server) {
  return new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolvePromise(server.address().port));
  });
}

function collectTextFiles(root) {
  const chunks = [];
  const visit = path => {
    for (const name of readdirSync(path)) {
      const child = join(path, name);
      if (statSync(child).isDirectory()) visit(child);
      else chunks.push(readFileSync(child).toString('utf8'));
    }
  };
  visit(root);
  return chunks.join('\n');
}

test('injected logger runtime captures model requests and streamed responses', { timeout: 20_000 }, async t => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-logger-runtime-'));
  const home = join(root, 'home');
  const logs = join(root, 'logs');
  mkdirSync(join(home, '.codex'), { recursive: true });
  writeFileSync(join(home, '.codex', 'auth.json'), '{"auth_mode":"apikey"}\n');

  let upstreamRequests = 0;
  const upstream = createServer(async (req, res) => {
    upstreamRequests++;
    for await (const _chunk of req) {}
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.end('data: {"type":"response.completed","response":{"model":"gpt-test","output":[{"type":"message","role":"assistant","content":[{"type":"output_text","text":"assistant-capture-marker"}]}]}}\n\n');
  });
  const upstreamPort = await listen(upstream);
  t.after(() => upstream.close());

  const bootstrapUrl = pathToFileURL(resolve('lib/logger-bootstrap.js')).href;
  const harness = join(root, 'harness.mjs');
  writeFileSync(harness, `
    const { loggerBootstrapResult: runtime } = await import(${JSON.stringify(bootstrapUrl)});
    if (!runtime.active) throw runtime.error || new Error('logger inactive');
    const proxyArg = process.argv.find(a => a.startsWith('openai_base_url='));
    const proxyBase = JSON.parse(proxyArg.slice(proxyArg.indexOf('=') + 1));
    const response = await fetch(proxyBase + '/responses', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify({
        model: 'gpt-test',
        stream: true,
        instructions: 'You are Codex. You may delegate work to subagents.',
        client_metadata: {
          session_id: 'logger-runtime',
          thread_id: 'logger-runtime',
          'x-codex-turn-metadata': JSON.stringify({ thread_source: 'user' }),
        },
        input: [{ role: 'user', content: 'proxy-capture-marker' }],
      }),
    });
    await response.text();
    runtime.close();
    process.exit(0);
  `);

  const child = spawn(process.execPath, [harness, 'exec', 'test'], {
    env: {
      ...process.env,
      HOME: home,
      CXV_LOG_DIR: logs,
      CXV_ORIGINAL_BASE_URL: '',
      OPENAI_BASE_URL: `http://127.0.0.1:${upstreamPort}/v1`,
      CXV_LOGGER_BOOTSTRAP_DISABLED: '',
      CXV_WORKSPACE_MODE: '',
      CXV_CLI_MODE: '',
      CXV_TEST: '',
      NO_PROXY: '127.0.0.1,localhost',
      no_proxy: '127.0.0.1,localhost',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  const exitCode = await new Promise((resolvePromise, reject) => {
    child.once('error', reject);
    child.once('exit', resolvePromise);
  });
  assert.equal(exitCode, 0, stderr);
  assert.equal(upstreamRequests, 1);

  const persisted = collectTextFiles(logs);
  assert.match(persisted, /proxy-capture-marker/);
  assert.match(persisted, /assistant-capture-marker/);
  assert.match(persisted, /"mainAgent":true/);
  assert.match(persisted, /"latestSessionId":"logger-runtime"/);
});

test('native logger fallback starts capture proxy before launching Codex', { timeout: 20_000 }, async t => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-logger-fallback-'));
  const home = join(root, 'home');
  const logs = join(root, 'logs');
  const bin = join(root, 'bin');
  mkdirSync(join(home, '.codex'), { recursive: true });
  mkdirSync(bin);
  writeFileSync(join(home, '.codex', 'auth.json'), '{"auth_mode":"apikey"}\n');

  let upstreamRequests = 0;
  const upstream = createServer(async (req, res) => {
    upstreamRequests++;
    for await (const _chunk of req) {}
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.end('data: {"type":"response.completed","response":{"output":[]}}\n\n');
  });
  const upstreamPort = await listen(upstream);
  t.after(() => upstream.close());

  const fakeCodex = join(bin, 'codex');
  writeFileSync(fakeCodex, `#!/usr/bin/env node
const config = process.argv.find(arg => arg.startsWith('openai_base_url='));
if (!config) process.exit(2);
const base = JSON.parse(config.slice(config.indexOf('=') + 1));
const response = await fetch(base + '/responses', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
  body: JSON.stringify({
    model: 'gpt-test',
    stream: true,
    client_metadata: {
      session_id: 'native-fallback',
      thread_id: 'native-fallback',
      'x-codex-turn-metadata': JSON.stringify({ thread_source: 'user' }),
    },
    input: [{ role: 'user', content: 'native-fallback-marker' }],
  }),
});
await response.text();
`);
  chmodSync(fakeCodex, 0o755);

  const child = spawn(process.execPath, [resolve('cli.js'), 'run', '--', 'codex', '--cxv-internal', 'exec'], {
    env: {
      ...process.env,
      HOME: home,
      PATH: `${bin}:${process.env.PATH}`,
      SHELL: '/bin/bash',
      CXV_LOG_DIR: logs,
      CXV_ORIGINAL_BASE_URL: '',
      OPENAI_BASE_URL: `http://127.0.0.1:${upstreamPort}/v1`,
      CXV_LOGGER_BOOTSTRAP_DISABLED: '',
      CXV_CLI_MODE: '',
      CXV_TEST: '',
      NO_PROXY: '127.0.0.1,localhost',
      no_proxy: '127.0.0.1,localhost',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  const exitCode = await new Promise((resolvePromise, reject) => {
    child.once('error', reject);
    child.once('exit', resolvePromise);
  });

  assert.equal(exitCode, 0, stderr);
  assert.equal(upstreamRequests, 1);
  assert.match(collectTextFiles(logs), /native-fallback-marker/);
});
