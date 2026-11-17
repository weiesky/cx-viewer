import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs, { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { createServer } from 'node:http';
import { basename, join } from 'node:path';
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

async function encryptedFixture(run, baseURL = VALID_DOC.profiles[1].baseURL) {
  const { createProxyProfileCredentials, PROXY_CREDENTIAL_VERSION_FIELD } = await import('../lib/proxy-profile-credentials.js');
  const { stageSecretReference } = await import('../lib/credential-reference.js');
  const { markConfigurationMigrated } = await import('../lib/credential-migration-state.js');
  const credentials = createProxyProfileCredentials(profilePath);
  const files = [profilePath, `${profilePath}.bak`, credentials.store.file, credentials.store.keyPath];
  const originals = files.map(path => existsSync(path) ? readFileSync(path) : null);
  const plain = structuredClone(VALID_DOC);
  plain.profiles[1].baseURL = baseURL;
  try {
    const stored = { ...plain, [PROXY_CREDENTIAL_VERSION_FIELD]: 1,
      profiles: plain.profiles.map(({ apiKey, ...profile }) => profile.id === 'max' ? profile : {
        ...profile, apiKeyRef: stageSecretReference(credentials.store, 'profile-apiKey', credentials.ownerFor(profile.id), apiKey),
      }),
    };
    for (const path of files.slice(0, 2)) writeFileSync(path, JSON.stringify(stored), { mode: 0o600 });
    markConfigurationMigrated(credentials.store, 'proxy', basename(profilePath));
    interceptor._loadProxyProfile();
    await run({ credentials, plain });
  } finally {
    files.forEach((path, index) => originals[index] ? writeFileSync(path, originals[index], { mode: 0o600 }) : rmSync(path, { force: true }));
    interceptor._loadProxyProfile();
  }
}

test('encrypted API saves preserve masked keys, recoverable backups and the active key on source failure', async () => {
  await encryptedFixture(async ({ credentials }) => {
    const current = await (await fetch(`${base}/api/proxy-profiles`)).json();
    assert.equal(current.profiles[1].apiKey, '****-key');
    assert.equal(Object.hasOwn(current.profiles[1], 'apiKeyRef'), false);
    const post = document => fetch(`${base}/api/proxy-profiles`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(document),
    });
    const unchanged = await post(current);
    assert.equal(unchanged.status, 200, await unchanged.clone().text());
    assert.equal(interceptor._activeProfile.apiKey, 'secret-key');
    const next = await unchanged.json();
    next.profiles[1].apiKey = 'new-secret-key';
    const changed = await post(next);
    assert.equal(changed.status, 200, await changed.clone().text());
    assert.equal(credentials.read().data.profiles[1].apiKey, 'new-secret-key');
    assert.equal(credentials.readBackup().data.profiles[1].apiKey, 'secret-key');
    for (const path of [profilePath, `${profilePath}.bak`, credentials.store.file]) {
      assert.ok(!readFileSync(path, 'utf8').includes('secret-key'));
    }
    const before = readFileSync(profilePath);
    const active = await changed.json();
    active.profiles[1].apiKey = 'failed-new-key';
    const rename = fs.renameSync;
    fs.renameSync = (from, to) => {
      if (to === profilePath) throw Object.assign(new Error('test profile commit failure'), { code: 'EIO' });
      return rename(from, to);
    };
    syncBuiltinESMExports();
    try {
      assert.equal((await post(active)).status, 500);
      assert.deepEqual(readFileSync(profilePath), before);
      assert.equal(credentials.read().data.profiles[1].apiKey, 'new-secret-key');
      assert.equal(interceptor._activeProfile.apiKey, 'new-secret-key');
    } finally { fs.renameSync = rename; syncBuiltinESMExports(); }
  });
});

test('corrupt stored profiles return a generic error and cannot be overwritten using a fallback revision', async () => {
  const original = readFileSync(profilePath);
  const corrupt = '{"apiKey":"synthetic-private-parse-fragment';
  try {
    writeFileSync(profilePath, corrupt);
    interceptor._loadProxyProfile();
    const current = await (await fetch(`${base}/api/proxy-profiles`)).json();
    assert.ok(current.loadError);
    assert.ok(!JSON.stringify(current).includes('synthetic-private-parse-fragment'));
    const save = await fetch(`${base}/api/proxy-profiles`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...VALID_DOC, revision: current.revision }),
    });
    assert.equal(save.status, 409, await save.clone().text());
    assert.equal(readFileSync(profilePath, 'utf8'), corrupt);
  } finally { writeFileSync(profilePath, original); interceptor._loadProxyProfile(); }
});

test('the interceptor forwards a decrypted key and refuses OAuth fallback after its master key disappears', async () => {
  const requests = [];
  const upstream = createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      requests.push({ url: req.url, authorization: req.headers.authorization });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: 'synthetic-response', object: 'response', status: 'completed', output: [] }));
    });
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const provider = `http://127.0.0.1:${upstream.address().port}`;
  const originalFetch = globalThis.fetch;
  const originalMarker = globalThis._cxViewerInterceptorInstalled;
  const originalCapture = process.env.CXV_CAPTURE_ONLY;
  try {
    await encryptedFixture(async ({ credentials }) => {
      process.env.CXV_CAPTURE_ONLY = '1';
      interceptor.setupInterceptor();
      const request = () => fetch(`${provider}/backend-api/codex/responses`, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer synthetic-oauth',
          'x-cx-viewer-trace': 'true', 'x-cx-viewer-auth-mode': 'oauth' },
        body: JSON.stringify({ model: 'synthetic-model', input: 'synthetic request', stream: false }),
      });
      const response = await request();
      assert.equal(response.status, 200);
      await response.json();
      assert.deepEqual(requests, [{ url: '/v1/responses', authorization: 'Bearer secret-key' }]);
      rmSync(credentials.store.keyPath);
      interceptor._loadProxyProfile();
      await assert.rejects(request(), /Proxy profile is invalid/);
      assert.equal(requests.length, 1);
      const state = await (await originalFetch(`${base}/api/proxy-profiles`)).json();
      assert.ok(state.loadError);
    }, `${provider}/v1`);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalMarker === undefined) delete globalThis._cxViewerInterceptorInstalled;
    else globalThis._cxViewerInterceptorInstalled = originalMarker;
    if (originalCapture === undefined) delete process.env.CXV_CAPTURE_ONLY;
    else process.env.CXV_CAPTURE_ONLY = originalCapture;
    await new Promise(resolve => upstream.close(resolve));
  }
});

test('activated proxy HTTP settings reject legacy replacement and a deleted source', async () => {
  await encryptedFixture(async () => {
    const legacy = JSON.stringify(VALID_DOC);
    writeFileSync(profilePath, legacy);
    interceptor._loadProxyProfile();
    const post = async () => {
      const current = await (await fetch(`${base}/api/proxy-profiles`)).json();
      assert.ok(current.loadError);
      return fetch(`${base}/api/proxy-profiles`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...VALID_DOC, revision: current.revision }),
      });
    };
    assert.equal((await post()).status, 409);
    assert.equal(readFileSync(profilePath, 'utf8'), legacy);
    rmSync(profilePath);
    interceptor._loadProxyProfile();
    assert.equal((await post()).status, 409);
    assert.equal(existsSync(profilePath), false);
    assert.ok(interceptor._proxyProfileLoadError);
  });
});

