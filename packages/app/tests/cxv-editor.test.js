import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const run = promisify(execFile), editor = fileURLToPath(new URL('../lib/cxv-editor.js', import.meta.url));
async function fixture(work, { status = 200 } = {}) {
  const requests = []; const server = createServer((req, res) => {
    let raw = ''; req.on('data', chunk => { raw += chunk; }); req.on('end', () => {
      const url = new URL(req.url, 'http://fixture'); requests.push({ url, body: raw ? JSON.parse(raw) : null });
      res.writeHead(url.pathname === '/api/editor-status' ? status : 200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, done: true }));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const env = { ...process.env, CXV_EDITOR_PORT: String(server.address().port) }; delete env.CXV_INSTANCE_KEY;
  try { await work({ env, requests }); } finally { await new Promise(resolve => server.close(resolve)); }
}
for (const instance of ['', 'cxv-' + 'a'.repeat(36), 'cxv-' + 'b'.repeat(32)]) test('actual editor helper pins open and poll to ' + (instance || 'fixed boot'), async () => fixture(async ({ env, requests }) => {
  env.CXV_INSTANCE_KEY = instance;
  const path = join(tmpdir(), 'cxv-editor-quoted " unicode 中文.md');
  await run(process.execPath, [editor, path], { env, timeout: 5000 });
  assert.equal(requests.length, 2); assert.equal(requests[0].url.pathname, '/api/editor-open'); assert.equal(requests[1].url.pathname, '/api/editor-status');
  assert.equal(requests[0].body.filePath, path); assert.equal(requests[1].url.searchParams.get('id'), requests[0].body.sessionId);
  assert.match(requests[0].body.sessionId, /^[a-f0-9-]{36}$/);
  for (const request of requests) assert.equal(request.url.searchParams.get('instance'), instance || null);
}));
test('invalid helper arguments, port injection and malformed scope fail before any HTTP request', async () => fixture(async ({ env, requests }) => {
  for (const [args, patch, expected] of [[[], {}, /Usage/], [['file'], { CXV_EDITOR_PORT: '80@fixture.invalid' }, /Invalid CXV_EDITOR_PORT/], [['file'], { CXV_EDITOR_PORT: '0' }, /Invalid CXV_EDITOR_PORT/], [['file'], { CXV_INSTANCE_KEY: '../other' }, /Invalid CXV_INSTANCE_KEY/]]) {
    await assert.rejects(run(process.execPath, [editor, ...args], { env: { ...env, ...patch }, timeout: 3000 }), error => error.code === 1 && expected.test(error.stderr));
  }
  assert.equal(requests.length, 0);
}));
test('an editor whose owning session disappeared fails instead of silently succeeding or polling for 30 minutes', async () => fixture(async ({ env, requests }) => {
  await assert.rejects(run(process.execPath, [editor, 'file'], { env, timeout: 5000 }), error => error.code === 1 && /unavailable \(404\)/.test(error.stderr));
  assert.equal(requests.length, 2);
}, { status: 404 }));
