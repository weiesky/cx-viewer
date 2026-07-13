import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// File-level isolation: configure paths before importing the stateful server module.
const tmpDir = mkdtempSync(join(tmpdir(), 'cxv-otel-security-'));
const projectDir = join(tmpDir, 'project');
mkdirSync(projectDir, { recursive: true });

process.env.CXV_LOG_DIR = tmpDir;
process.env.CXV_PROJECT_DIR = projectDir;
process.env.CXV_START_PORT = '19820';
process.env.CXV_MAX_PORT = '19829';
process.env.CXV_WORKSPACE_MODE = '1';
process.env.CXV_CLI_MODE = '0';

let requestImpl = httpRequest;

function request(port, path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = requestImpl({
      hostname: '127.0.0.1',
      port,
      path,
      method,
      rejectUnauthorized: false,
      headers,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: data,
        json() { return JSON.parse(data); },
      }));
    });
    req.on('error', reject);
    if (body != null) req.write(body);
    req.end();
  });
}

describe('OTLP receiver and upload path hardening', { concurrency: false }, () => {
  let mod;
  let port;
  let uploadLink;

  before(async () => {
    mod = await import('../server.js');
    const server = await mod.startViewer();
    assert.ok(server, 'server should start');
    port = mod.getPort();
    requestImpl = mod.getProtocol() === 'https' ? httpsRequest : httpRequest;
  });

  after(async () => {
    if (uploadLink) rmSync(uploadLink, { force: true });
    await mod.stopViewer();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('requires the process-local token even from loopback', async () => {
    const body = JSON.stringify({ resourceSpans: [] });
    const denied = await request(port, '/v1/traces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.json().code, 'otel_access_forbidden');
    assert.equal(denied.headers.connection, 'close');

    const allowed = await request(port, '/v1/traces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cxv-otel-token': mod.getOtelAccessToken(),
      },
      body,
    });
    assert.equal(allowed.status, 200);
  });

  it('protects logs and metrics with the same token and drains accepted bodies', async () => {
    for (const path of ['/v1/logs', '/v1/metrics']) {
      const denied = await request(port, path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-protobuf' },
        body: 'unauthorized-body',
      });
      assert.equal(denied.status, 403);
      assert.equal(denied.json().code, 'otel_access_forbidden');
      assert.equal(denied.headers.connection, 'close');

      const allowed = await request(port, path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-protobuf',
          'x-cxv-otel-token': mod.getOtelAccessToken(),
        },
        body: 'bounded-body',
      });
      assert.equal(allowed.status, 200);
    }
  });

  it('rejects a declared OTLP body over the total byte budget', async () => {
    const response = await request(port, '/v1/traces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(mod.OTEL_PAYLOAD_LIMITS.bodyBytes + 1),
        'x-cxv-otel-token': mod.getOtelAccessToken(),
      },
    });
    assert.equal(response.status, 413);
    assert.equal(response.json().code, 'otel_payload_too_large');
  });

  it('enforces OTLP span, event, attribute, and string budgets', () => {
    const limits = {
      ...mod.OTEL_PAYLOAD_LIMITS,
      maxSpans: 1,
      maxEvents: 1,
      maxAttributes: 1,
      maxStringChars: 4,
      maxTotalStringChars: 100,
    };
    assert.throws(
      () => mod.validateOtlpTracePayload({ resourceSpans: [{ scopeSpans: [{ spans: [{}, {}] }] }] }, limits),
      error => error.status === 413 && error.code === 'otel_payload_too_large',
    );
    assert.throws(
      () => mod.validateOtlpTracePayload({ resourceSpans: [{ scopeSpans: [{ spans: [{ events: [{}, {}] }] }] }] }, limits),
      error => error.status === 413 && error.code === 'otel_payload_too_large',
    );
    assert.throws(
      () => mod.validateOtlpTracePayload({ resourceSpans: [{ resource: { attributes: [{}, {}] } }] }, limits),
      error => error.status === 413 && error.code === 'otel_payload_too_large',
    );
    assert.throws(
      () => mod.validateOtlpTracePayload({
        resourceSpans: [{
          scopeSpans: [{
            scope: { attributes: [{}] },
            spans: [{ links: [{ attributes: [{}] }] }],
          }],
        }],
      }, limits),
      error => error.status === 413 && error.code === 'otel_payload_too_large',
    );
    assert.throws(
      () => mod.validateOtlpTracePayload({ value: '12345' }, limits),
      error => error.status === 413 && error.code === 'otel_payload_too_large',
    );
  });

  it('rejects pathological JSON depth before parsing the object graph', () => {
    const tooDeep = `${'['.repeat(mod.OTEL_PAYLOAD_LIMITS.maxDepth + 1)}0${']'.repeat(mod.OTEL_PAYLOAD_LIMITS.maxDepth + 1)}`;
    assert.throws(
      () => mod.validateOtlpJsonTextBudget(tooDeep),
      error => error.status === 413 && error.code === 'otel_payload_too_large',
    );
  });

  it('rejects a symlink that escapes the upload root', async () => {
    const uploadDir = '/tmp/cx-viewer-uploads';
    mkdirSync(uploadDir, { recursive: true });
    const outside = join(tmpDir, 'outside.png');
    writeFileSync(outside, 'not really an image');
    uploadLink = join(uploadDir, `cxv-test-escape-${process.pid}.png`);
    rmSync(uploadLink, { force: true });
    symlinkSync(outside, uploadLink);

    const response = await request(
      port,
      `/api/file-raw?path=${encodeURIComponent(uploadLink)}`,
    );
    assert.equal(response.status, 403);
    assert.equal(response.json().error, 'Symlink escape denied');
  });
});
