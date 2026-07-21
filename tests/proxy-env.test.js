import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveProxyConfig } from '../lib/proxy-env.js';
import { formatProxyRequestError } from '../lib/proxy-errors.js';

test('proxy configuration supports uppercase variables and ALL_PROXY fallback', () => {
  assert.deepEqual(resolveProxyConfig({
    HTTP_PROXY: 'http://http-proxy.example:8080',
    ALL_PROXY: 'http://fallback-proxy.example:8080',
    NO_PROXY: 'localhost,127.0.0.1',
  }), {
    httpProxy: 'http://http-proxy.example:8080',
    httpsProxy: 'http://fallback-proxy.example:8080',
    noProxy: 'localhost,127.0.0.1',
  });
});

test('proxy request diagnostics include the underlying fetch cause', () => {
  const cause = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:7890'), {
    code: 'ECONNREFUSED',
  });
  const error = new TypeError('fetch failed', { cause });

  assert.equal(
    formatProxyRequestError(error),
    '[CX-Viewer Proxy] Request failed: fetch failed (connect ECONNREFUSED 127.0.0.1:7890)',
  );
});
