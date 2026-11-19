import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync, gunzipSync, gzipSync, inflateSync } from 'node:zlib';

import {
  buildProxyProfileUrl,
  classifyProxyOperation,
  isOAuthProxyRequest,
  rewriteProxyProfileRequest,
  validateProxyProfilesDocument,
} from '../lib/proxy-profile.js';

const PROFILE = {
  id: 'third-party',
  name: 'Third Party',
  baseURL: 'https://gateway.example/openai/v1',
  apiKey: 'third-party-key',
  activeModel: 'third-model',
  effort: 'high',
  wireApi: 'responses',
};

test('proxy profile URL joins overlapping API path segments once', () => {
  assert.equal(
    buildProxyProfileUrl('https://api.openai.com/v1/responses?stream=true', 'https://gateway.example/openai/v1'),
    'https://gateway.example/openai/v1/responses?stream=true',
  );
  assert.equal(
    buildProxyProfileUrl('https://api.openai.com/v1/responses', 'https://gateway.example'),
    'https://gateway.example/v1/responses',
  );
});

test('proxy profile rewrites bearer auth, model, and Responses reasoning effort', () => {
  const rewritten = rewriteProxyProfileRequest('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: 'Bearer original', 'x-api-key': 'original-key', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'original-model', reasoning: { summary: 'auto' }, input: 'hello' }),
  }, PROFILE);

  assert.equal(rewritten.url, 'https://gateway.example/openai/v1/responses');
  assert.equal(rewritten.options.headers.authorization, 'Bearer third-party-key');
  assert.equal(rewritten.options.headers['x-api-key'], undefined);
  assert.deepEqual(JSON.parse(rewritten.options.body), {
    model: 'third-model',
    reasoning: { summary: 'auto', effort: 'high' },
    input: 'hello',
  });
});

test('proxy profile supports Headers and preserves gzip request encoding', () => {
  const body = gzipSync(JSON.stringify({ model: 'original-model', input: [] }));
  const rewritten = rewriteProxyProfileRequest('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: new Headers({
      authorization: 'Bearer original',
      'content-encoding': 'gzip',
      'content-length': String(body.length),
      'content-type': 'application/json',
    }),
    body,
  }, PROFILE);

  assert.ok(rewritten.options.headers instanceof Headers);
  assert.equal(rewritten.options.headers.get('authorization'), 'Bearer third-party-key');
  assert.equal(rewritten.options.headers.get('content-length'), null);
  assert.equal(rewritten.options.headers.get('content-encoding'), 'gzip');
  assert.deepEqual(JSON.parse(gunzipSync(rewritten.options.body).toString('utf8')), {
    model: 'third-model',
    input: [],
    reasoning: { effort: 'high' },
  });
});

test('proxy profile rewrites raw deflate body into standards-compliant deflate', () => {
  const body = deflateRawSync(JSON.stringify({ model: 'old', input: [] }));
  const rewritten = rewriteProxyProfileRequest('https://api.openai.com/v1/responses', {
    headers: { authorization: 'Bearer old', 'content-encoding': 'deflate' },
    body,
  }, PROFILE);
  assert.equal(rewritten.options.headers['content-encoding'], 'deflate');
  // 头为 deflate 时，重写后的 body 必须能用标准 deflate 解码器解开
  assert.equal(JSON.parse(inflateSync(rewritten.options.body).toString()).model, 'third-model');
});

test('Responses rewrite strips internal metadata keys but keeps user fields', () => {
  const rewritten = rewriteProxyProfileRequest('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'original-model',
      input: 'hello',
      client_metadata: { cwd: '/Users/x', session_id: 's1', thread_id: 't1', custom: 'keep-me' },
      metadata: { turn_id: 'turn-1', gateway: 'gw' },
    }),
  }, PROFILE);
  const body = JSON.parse(rewritten.options.body);
  assert.deepEqual(body.client_metadata, { custom: 'keep-me' });
  assert.deepEqual(body.metadata, { gateway: 'gw' });
});

test('proxy profile preserves encoding even without model or effort overrides', () => {
  const body = gzipSync(JSON.stringify({ model: 'original-model', input: [] }));
  const rewritten = rewriteProxyProfileRequest('https://api.openai.com/v1/responses', {
    headers: { 'content-encoding': 'gzip', 'content-type': 'application/json' },
    body,
  }, { ...PROFILE, activeModel: '', effort: '' });

  assert.equal(rewritten.options.headers['content-encoding'], 'gzip');
  assert.equal(rewritten.options.body, body);
});

test('proxy profile document validation rejects ambiguous or unsafe data', () => {
  const valid = validateProxyProfilesDocument({
    active: 'third-party',
    profiles: [{ id: 'max', name: 'Default' }, PROFILE],
  });
  assert.equal(valid.active, 'third-party');
  assert.equal(valid.profiles[1].baseURL, 'https://gateway.example/openai/v1');
  assert.equal(valid.version, 3);

  const migrated = validateProxyProfilesDocument({
    active: 'legacy',
    profiles: [{ id: 'max', name: 'Default' }, {
      ...PROFILE,
      id: 'legacy',
      activeModel: '',
      OPENAI_MODEL: 'legacy-model',
    }],
  }, { migrateLegacy: true });
  assert.equal(migrated.profiles[1].activeModel, 'legacy-model');
  assert.equal(migrated.profiles[1].effort, '');
  assert.equal(migrated.version, 3);
  assert.equal(migrated.profiles[1].wireApi, 'responses');

  const migratedDeepSeek = validateProxyProfilesDocument({
    version: 2,
    active: 'deepseek',
    profiles: [{ id: 'max', name: 'Default' }, {
      ...PROFILE,
      id: 'deepseek',
      baseURL: 'https://api.deepseek.com',
      wireApi: undefined,
    }],
  }, { migrateLegacy: true });
  assert.equal(migratedDeepSeek.profiles[1].wireApi, 'chat-completions');
  assert.equal(migratedDeepSeek.profiles[1].effort, 'high');

  assert.throws(() => validateProxyProfilesDocument({
    active: 'missing',
    profiles: [{ id: 'max', name: 'Default' }],
  }), /active must reference/);
  assert.throws(() => validateProxyProfilesDocument({
    active: 'duplicate',
    profiles: [{ id: 'max', name: 'Default' }, { ...PROFILE, id: 'duplicate' }, { ...PROFILE, id: 'duplicate' }],
  }), /Duplicate profile id/);
  assert.throws(() => validateProxyProfilesDocument({
    active: 'third-party',
    profiles: [{ id: 'max', name: 'Default' }, { ...PROFILE, baseURL: 'file:///tmp/leak' }],
  }), /HTTP\(S\)/);
  assert.throws(() => validateProxyProfilesDocument({
    active: 'third-party',
    profiles: [{ id: 'max', name: 'Default' }, { ...PROFILE, effort: 'unlimited' }],
  }), /effort is unsupported/);
  assert.throws(() => validateProxyProfilesDocument({
    version: 2,
    active: 'third-party',
    profiles: [{ id: 'max', name: 'Default' }, { ...PROFILE, baseURL: 'http://provider.example/v1' }],
  }), /must use HTTPS/);
  assert.doesNotThrow(() => validateProxyProfilesDocument({
    version: 2,
    active: 'third-party',
    profiles: [{ id: 'max', name: 'Default' }, { ...PROFILE, baseURL: 'http://127.0.0.1:8080/v1' }],
  }));
  assert.throws(() => validateProxyProfilesDocument({
    version: 4,
    active: 'max',
    profiles: [{ id: 'max', name: 'Default' }],
  }, { migrateLegacy: true }), /not supported/);
});

test('max profile leaves the request untouched', () => {
  const options = { headers: { authorization: 'Bearer original' }, body: '{}' };
  const rewritten = rewriteProxyProfileRequest('https://api.openai.com/v1/responses', options, null);
  assert.equal(rewritten.url, 'https://api.openai.com/v1/responses');
  assert.equal(rewritten.options, options);
});

test('OAuth classification is independent from active profile routing', () => {
  assert.equal(isOAuthProxyRequest({ authorization: 'Bearer sk-api-key' }), false);
  assert.equal(isOAuthProxyRequest(new Headers({ 'chatgpt-account-id': 'acct-123' })), true);
  assert.equal(isOAuthProxyRequest({ authorization: 'Bearer fallback-token' }, 'oauth'), true);
});

test('third-party rewrite strips OAuth and account-scoped headers', () => {
  const rewritten = rewriteProxyProfileRequest('https://chatgpt.com/backend-api/codex/responses', {
    method: 'POST',
    headers: new Headers({
      accept: 'text/event-stream',
      authorization: 'Bearer oauth-secret',
      'chatgpt-account-id': 'acct-123',
      cookie: 'session=secret',
      'content-type': 'application/json',
      'x-cx-viewer-trace': 'true',
    }),
    body: JSON.stringify({ model: 'official', input: 'hello' }),
  }, PROFILE);
  assert.equal(rewritten.url, 'https://gateway.example/openai/v1/responses');
  assert.equal(rewritten.options.headers.get('authorization'), 'Bearer third-party-key');
  assert.equal(rewritten.options.headers.get('chatgpt-account-id'), null);
  assert.equal(rewritten.options.headers.get('cookie'), null);
  assert.equal(rewritten.options.headers.get('x-cx-viewer-trace'), null);
});

test('profile routing only classifies exact POST Responses operations', () => {
  assert.equal(classifyProxyOperation('https://chatgpt.com/backend-api/codex/responses', 'POST'), 'responses');
  assert.equal(classifyProxyOperation('https://api.openai.com/v1/responses/compact', 'POST'), 'compact');
  assert.equal(classifyProxyOperation('https://api.openai.com/v1/models', 'GET'), null);
  assert.equal(classifyProxyOperation('https://api.openai.com/v1/responses', 'GET'), null);
  assert.equal(classifyProxyOperation('https://api.openai.com/v1/responses%2fcompact', 'POST'), null);
});
