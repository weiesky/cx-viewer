import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const temp = mkdtempSync(join(tmpdir(), 'cxv-proxy-profiles-api-'));
const workspace = join(temp, 'workspace');
mkdirSync(workspace);
process.env.CXV_TEST = '1';
process.env.CXV_LOG_DIR = join(temp, 'logs');
process.env.CXV_PROJECT_DIR = workspace;
process.env.CXV_PROXY_PROFILE_PATH = join(temp, 'profiles.json');
process.env.CXV_START_PORT = '19980';
process.env.CXV_MAX_PORT = '19989';
process.env.CXV_WORKSPACE_MODE = '1';
process.env.CXV_CLI_MODE = '1';

let server;
let interceptor;
let base;
let profilePath;

before(async () => {
  server = await import('../server.js');
  interceptor = await import('../interceptor.js');
  await server.startViewer();
  server.setWorkspaceLaunched(true);
  base = `http://127.0.0.1:${server.getPort()}`;
  profilePath = process.env.CXV_PROXY_PROFILE_PATH;
});

after(async () => {
  try { interceptor?._stopProxyProfileWatchForTests(); } catch {}
  await server?.stopViewer();
  rmSync(temp, { recursive: true, force: true });
});

const VALID_DOC = {
  version: 3,
  active: 'third',
  profiles: [
    { id: 'max', name: 'Default' },
    {
      id: 'third',
      name: 'Third',
      baseURL: 'https://gateway.example/openai/v1',
      apiKey: 'secret-key',
      activeModel: 'third-model',
      effort: 'high',
      wireApi: 'responses',
    },
  ],
};

test('GET returns the default document when no profile file exists', async () => {
  const response = await fetch(`${base}/api/proxy-profiles`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.active, 'max');
  assert.equal(typeof body.revision, 'string');
});

test('POST rejects missing or stale revisions with 409', async () => {
  const noRevision = await fetch(`${base}/api/proxy-profiles`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(VALID_DOC),
  });
  assert.equal(noRevision.status, 409);

  const stale = await fetch(`${base}/api/proxy-profiles`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...VALID_DOC, revision: 'stale-revision' }),
  });
  assert.equal(stale.status, 409);
});

test('POST saves masked apiKey backfill and creates .bak backup', async () => {
  const initial = await (await fetch(`${base}/api/proxy-profiles`)).json();
  const saved = await fetch(`${base}/api/proxy-profiles`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...VALID_DOC, revision: initial.revision }),
  });
  assert.equal(saved.status, 200);
  const savedBody = await saved.json();
  assert.equal(savedBody.profiles.find(p => p.id === 'third').apiKey, '****-key');
  assert.equal(readFileSync(profilePath, 'utf8').includes('secret-key'), true);

  const afterSave = await (await fetch(`${base}/api/proxy-profiles`)).json();
  const maskedKey = afterSave.profiles.find(p => p.id === 'third').apiKey;
  assert.equal(maskedKey, '****-key');

  const backfilled = await fetch(`${base}/api/proxy-profiles`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...VALID_DOC, apiKey: maskedKey, revision: afterSave.revision }),
  });
  assert.equal(backfilled.status, 200);
  assert.equal(readFileSync(profilePath, 'utf8').includes('secret-key'), true);
  assert.equal(readFileSync(`${profilePath}.bak`, 'utf8').includes('secret-key'), true);
});

test('POST rejects invalid documents with 400', async () => {
  const current = await (await fetch(`${base}/api/proxy-profiles`)).json();
  const invalid = await fetch(`${base}/api/proxy-profiles`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...VALID_DOC,
      revision: current.revision,
      profiles: [{ id: 'max', name: 'Default' }, { ...VALID_DOC.profiles[1], baseURL: 'ftp://bad' }],
    }),
  });
  assert.equal(invalid.status, 400);
});

test('GET reports runtime load error when the profile is unusable', async () => {
  interceptor._setProxyProfileRuntimeForTests(null, 'Proxy profile configuration was deleted');
  const response = await (await fetch(`${base}/api/proxy-profiles`)).json();
  assert.equal(response.loadError, 'Proxy profile configuration was deleted');
  interceptor._setProxyProfileRuntimeForTests(null);
});

