import test from 'node:test';
import assert from 'node:assert/strict';

test('history requests bind the exact workspace and preserve base path and login token', async () => {
  const previous = { window: globalThis.window, fetch: globalThis.fetch };
  const calls = [];
  globalThis.window = { location: new URL('https://viewer.example/base/?instance=a&token=secret'), __CXV_BASE_PATH__: '/base/' };
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({ instanceKey: 'b', items: [] }) };
  };
  try {
    const api = await import('../src/utils/sdkResumeApi.js');
    await api.loadSdkResumeSessions('b');
    await api.restoreSdkResumeSession('b', 'same/history/timeline.jsonl');
    for (const call of calls) {
      const url = new URL(call.url, window.location.href);
      assert.equal(url.searchParams.get('instance'), 'b');
      assert.equal(url.searchParams.get('token'), 'secret');
      assert.ok(url.pathname.startsWith('/base/api/resume-session'));
    }
    assert.equal(calls[1].options.method, 'POST');
    assert.deepEqual(JSON.parse(calls[1].options.body), { instanceKey: 'b', file: 'same/history/timeline.jsonl' });
  } finally { Object.assign(globalThis, previous); }
});

test('busy failures and mismatched successful responses cannot be mistaken for a completed resume', async () => {
  const previous = globalThis.fetch;
  const api = await import('../src/utils/sdkResumeApi.js');
  try {
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ error: 'busy', code: 'SDK_SESSION_BUSY' }) });
    await assert.rejects(api.restoreSdkResumeSession('a', 'history'), { code: 'SDK_SESSION_BUSY' });
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ instanceKey: 'b', items: [] }) });
    await assert.rejects(api.loadSdkResumeSessions('a'), { code: 'SDK_SCOPE_MISMATCH' });
    await assert.rejects(api.restoreSdkResumeSession('a', 'history'), { code: 'SDK_SCOPE_MISMATCH' });
  } finally { globalThis.fetch = previous; }
});

test('an absent workspace never becomes an implicit request to whichever session is active', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = () => assert.fail('missing workspace must fail before fetching');
  try {
    const api = await import('../src/utils/sdkResumeApi.js');
    await assert.rejects(api.loadSdkResumeSessions(null));
    await assert.rejects(api.restoreSdkResumeSession('', 'history'));
  } finally { globalThis.fetch = previous; }
});
