import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const temp = mkdtempSync(join(tmpdir(), 'cxv-system-prompt-server-'));
const workspace = join(temp, 'workspace');
mkdirSync(workspace);
process.env.CXV_LOG_DIR = join(temp, 'logs');
process.env.CXV_PROJECT_DIR = workspace;
process.env.CXV_START_PORT = '19970';
process.env.CXV_MAX_PORT = '19979';
process.env.CXV_WORKSPACE_MODE = '1';
process.env.CXV_CLI_MODE = '1';

let server;
let base;

before(async () => {
  server = await import('../server.js');
  await server.startViewer();
  server.setWorkspaceLaunched(true);
  server.setSystemPromptRuntimeCapability({
    verified: true,
    append: true,
    override: true,
    transport: 'app-server-bridge',
    version: 'test',
  });
  base = `http://127.0.0.1:${server.getPort()}`;
});

after(async () => {
  server?.setSystemPromptRuntimeCapability(null);
  await server?.stopViewer();
  rmSync(temp, { recursive: true, force: true });
});

test('system prompt routes save with revisions and never cache content', async () => {
  const initial = await fetch(`${base}/api/expert/system-text`);
  assert.equal(initial.status, 200);
  assert.match(initial.headers.get('cache-control') || '', /no-store/);
  const first = await initial.json();
  assert.equal(first.revision, '0');
  assert.equal(first.capability.status, 'supported');

  const saved = await fetch(`${base}/api/expert/system-text`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'managed instruction', mode: 'append', revision: first.revision }),
  });
  assert.equal(saved.status, 200);
  const savedBody = await saved.json();
  assert.notEqual(savedBody.revision, '0');

  for (const text of ['overwrite without revision', '']) {
    const missingRevision = await fetch(`${base}/api/expert/system-text`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, mode: 'append' }),
    });
    assert.equal(missingRevision.status, 400);
    assert.equal((await missingRevision.json()).code, 'invalid_revision');
  }

  const unchanged = await fetch(`${base}/api/expert/system-text`);
  assert.equal((await unchanged.json()).text, 'managed instruction');

  const stale = await fetch(`${base}/api/expert/system-text`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'stale', mode: 'append', revision: '0' }),
  });
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).code, 'prompt_conflict');
});

test('transport accepts escapable text up to the declared prompt byte limit', async () => {
  const current = await (await fetch(`${base}/api/expert/system-text`)).json();
  const text = '"'.repeat(100_000);
  const response = await fetch(`${base}/api/expert/system-text`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, mode: 'append', revision: current.revision }),
  });
  assert.equal(response.status, 200);
});

test('model prompt routes validate names and capability fail closed', async () => {
  const invalid = await fetch(`${base}/api/expert/model-prompts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      scope: 'workspace',
      name: '../escape',
      text: 'x',
      mode: 'append',
      revision: '0',
    }),
  });
  assert.equal(invalid.status, 400);

  const created = await fetch(`${base}/api/expert/model-prompts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      scope: 'workspace',
      name: 'gpt-5',
      text: 'model instruction',
      mode: 'append',
      revision: '0',
    }),
  });
  assert.equal(created.status, 200);

  const missingRevision = await fetch(`${base}/api/expert/model-prompts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      scope: 'workspace',
      name: 'gpt-5',
      text: '',
      mode: 'append',
    }),
  });
  assert.equal(missingRevision.status, 400);
  assert.equal((await missingRevision.json()).code, 'invalid_revision');

  server.setSystemPromptRuntimeCapability(null);
  const unsupported = await fetch(`${base}/api/expert/system-text`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'x', mode: 'append', revision: '0' }),
  });
  assert.equal(unsupported.status, 409);
  assert.equal((await unsupported.json()).code, 'system_prompt_unsupported');
});
