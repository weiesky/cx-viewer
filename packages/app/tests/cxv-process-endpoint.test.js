import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { request } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const logDir = mkdtempSync(join(tmpdir(), 'cxv-process-endpoint-'));
process.env.CXV_TEST = '1';
process.env.CXV_LOG_DIR = logDir;
process.env.CXV_WORKSPACE_MODE = '1';
process.env.CXV_CLI_MODE = '1';
process.env.CXV_START_PORT = '19980';
process.env.CXV_MAX_PORT = '19989';

function call(port, path, { method = 'GET', body } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function waitForMessage(child, type) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), 5000);
    child.on('message', message => {
      if (message?.type !== type) return;
      clearTimeout(timer);
      resolve(message);
    });
  });
}

test('process endpoint returns 202 and reports the confirmed forced exit', { timeout: 15_000 }, async t => {
  const target = fork(new URL('./fixtures/cxv', import.meta.url), [], {
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  t.after(() => {
    try { process.kill(target.pid, 'SIGKILL'); } catch {}
  });
  await waitForMessage(target, 'ready');

  const server = await import('../server.js');
  await server.startViewer();
  t.after(async () => {
    await server.stopViewer();
    rmSync(logDir, { recursive: true, force: true });
  });
  const port = server.getPort();
  const listed = await call(port, '/api/cxv-processes');
  assert.equal(listed.status, 200);
  const record = listed.json.processes.find(item => item.pid === target.pid);
  assert.ok(record?.processRef);

  const accepted = await call(port, '/api/cxv-processes/kill', {
    method: 'POST',
    body: { processRef: record.processRef },
  });
  assert.equal(accepted.status, 202);
  assert.equal(accepted.json.status, 'terminating');

  let final = null;
  for (let attempt = 0; attempt < 50; attempt++) {
    const status = await call(port, `/api/cxv-processes/kill-status?id=${accepted.json.operationId}`);
    if (status.json.status !== 'terminating') { final = status.json; break; }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(final?.status, 'forced');
});
