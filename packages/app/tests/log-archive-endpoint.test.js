import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import JSZip from 'jszip';

import { resolveAppServerThreadIdentity } from '../lib/log-v2/identity.js';
import { LogV2Writer } from '../lib/log-v2/writer.js';

const root = mkdtempSync(join(tmpdir(), 'cxv-log-archive-endpoint-'));
const projectDir = join(root, 'project');
mkdirSync(projectDir, { recursive: true });

const writer = LogV2Writer.open({
  rootDir: root,
  projectId: 'endpoint-project',
  canonicalCwd: projectDir,
  sessionId: 'endpoint..session',
  rootThreadId: 'endpoint..session',
  createdAt: '2026-07-15T03:00:00.000Z',
});
writer.append({
  timestamp: '2026-07-15T03:01:00.000Z',
  url: 'codex://event/turn',
  method: 'POST',
  body: { input: [{ type: 'message', role: 'user', text: 'endpoint' }] },
  response: { status: 200, body: { content: [{ type: 'text', text: 'round trip' }] } },
}, resolveAppServerThreadIdentity({ id: 'endpoint..session', sessionId: 'endpoint..session' }));

process.env.CXV_TEST = '1';
process.env.CXV_LOG_DIR = root;
process.env.CXV_PROJECT_DIR = projectDir;
process.env.CXV_START_PORT = '19820';
process.env.CXV_MAX_PORT = '19829';
process.env.CXV_WORKSPACE_MODE = '1';
process.env.CXV_CLI_MODE = '0';

let requestImpl = httpRequest;

function request(port, path, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const req = requestImpl({ hostname: '127.0.0.1', port, path, method, headers, rejectUnauthorized: false }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

describe('V2 log archive HTTP round trip', { concurrency: false }, () => {
  let stopViewer;
  let port;
  let locator;
  let zipData;

  before(async () => {
    const mod = await import('../server.js');
    stopViewer = mod.stopViewer;
    const server = await mod.startViewer();
    assert.ok(server);
    port = mod.getPort();
    requestImpl = mod.getProtocol() === 'https' ? httpsRequest : httpRequest;
    const listed = await request(port, '/api/local-logs');
    assert.equal(listed.status, 200);
    const logs = JSON.parse(listed.body.toString('utf8'))['endpoint-project'];
    assert.equal(logs.length, 1);
    locator = logs[0].file;
  });

  after(async () => {
    await stopViewer?.();
    rmSync(root, { recursive: true, force: true });
  });

  it('downloads the complete session directory as a ZIP', async () => {
    assert.match(locator, /endpoint\.\.session/);
    const response = await request(port, `/api/download-log?file=${encodeURIComponent(locator)}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers['content-type'], 'application/zip');
    assert.match(response.headers['content-disposition'], /\.cxvsession\.zip/);
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(Number(response.headers['content-length']), response.body.length);
    assert.equal(response.headers['cache-control'], 'no-store');
    zipData = response.body;
    const zip = await JSZip.loadAsync(zipData);
    const names = Object.keys(zip.files);
    assert.ok(names.some(name => name.endsWith('.cxvsession/manifest.json')));
    assert.ok(names.some(name => name.endsWith('.cxvsession/timeline.jsonl')));
    assert.ok(names.some(name => name.includes('.cxvsession/objects/')));
  });

  it('uploads and parses the downloaded ZIP back into entries', async () => {
    assert.ok(zipData);
    const boundary = `----cxv-${Date.now()}`;
    const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="session.zip"\r\nContent-Type: application/zip\r\n\r\n`);
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([head, zipData, tail]);
    const response = await request(port, '/api/parse-log-archive', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
      body,
    });
    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /application\/x-cxv-log-entries/);
    const entries = response.body.toString('utf8').split('\n---\n').filter(Boolean).map(JSON.parse);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].response.body.content[0].text, 'round trip');

    // The first response's end event is the public completion boundary. An
    // immediately sequential local parse must not observe the previous job's
    // lock as CXV_LOG_ARCHIVE_BUSY; this performs no external network request.
    const secondResponse = await request(port, '/api/parse-log-archive', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
      body,
    });
    assert.equal(secondResponse.status, 200);
    assert.notEqual(
      JSON.parse(secondResponse.body.toString('utf8').split('\n---\n').filter(Boolean)[0]).code,
      'CXV_LOG_ARCHIVE_BUSY',
    );
  });

  it('maps missing V2 archives to 404 and rejects non-V2 downloads', async () => {
    const missing = 'missing-project/20260715_missing-session.cxvsession/timeline.jsonl';
    const missingResponse = await request(port, `/api/download-log?file=${encodeURIComponent(missing)}`);
    assert.equal(missingResponse.status, 404);
    assert.equal(JSON.parse(missingResponse.body.toString('utf8')).code, 'NOT_FOUND');

    const nonV2 = await request(port, '/api/download-log?file=project%2Fold.jsonl');
    assert.equal(nonV2.status, 400);
  });
});
