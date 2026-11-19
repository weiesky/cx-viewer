import test from 'node:test';
import assert from 'node:assert/strict';
import { createProxy, startProxy, stopProxy, resolveUpstream } from '../proxy.js';

process.env.CXV_TEST = '1';
const health = name => ({ health: { body: { name } } });
const check = async port => {
  const response = await fetch(`http://127.0.0.1:${port}/__cxv/health`, { signal: AbortSignal.timeout(2000) });
  return response.json();
};

test('capture proxies stop independently and keep every surviving port registered', async () => {
  const a = createProxy();
  const b = createProxy();
  try {
    const [portA, portB] = await Promise.all([a.start(health('a')), b.start(health('b'))]);
    assert.deepEqual(await check(portA), { name: 'a' });
    assert.deepEqual(await check(portB), { name: 'b' });
    for (const port of [portA, portB]) {
      assert.ok(globalThis.__cxViewerCaptureProxyPorts.has(port));
      const previous = process.env.CXV_ORIGINAL_BASE_URL;
      try {
        process.env.CXV_ORIGINAL_BASE_URL = `http://127.0.0.1:${port}/v1`;
        assert.equal(resolveUpstream('/v1/responses').fullUrl, 'https://api.openai.com/v1/responses');
      } finally {
        if (previous === undefined) delete process.env.CXV_ORIGINAL_BASE_URL;
        else process.env.CXV_ORIGINAL_BASE_URL = previous;
      }
    }
    a.stop();
    a.stop();
    await assert.rejects(check(portA));
    assert.deepEqual(await check(portB), { name: 'b' });
    assert.ok(!globalThis.__cxViewerCaptureProxyPorts.has(portA));
    assert.ok(globalThis.__cxViewerCaptureProxyPorts.has(portB));
    assert.equal(globalThis.__cxViewerCaptureProxyPort, portB);
  } finally {
    a.stop();
    b.stop();
  }
});

test('cancelling pending proxy startup cannot resurrect it or stop its replacement', async () => {
  const proxy = createProxy();
  try {
    const pending = proxy.start(health('obsolete'));
    proxy.stop();
    const rejected = assert.rejects(pending, /cancelled/);
    const port = await proxy.start(health('current'));
    await rejected;
    assert.deepEqual(await check(port), { name: 'current' });
    assert.ok(globalThis.__cxViewerCaptureProxyPorts.has(port));
  } finally {
    proxy.stop();
  }
});

test('late close from a replaced proxy cannot clear the new proxy identity', async () => {
  const proxy = createProxy();
  try {
    await proxy.start(health('old'));
    const port = await proxy.start(health('new'));
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(await check(port), { name: 'new' });
    assert.equal(globalThis.__cxViewerCaptureProxyPort, port);
    assert.ok(globalThis.__cxViewerCaptureProxyPorts.has(port));
  } finally {
    proxy.stop();
  }
});

test('legacy default proxy shutdown leaves an independently owned SDK proxy alive', async () => {
  const sdk = createProxy();
  try {
    await startProxy(health('legacy'));
    const sdkPort = await sdk.start(health('sdk'));
    stopProxy();
    assert.deepEqual(await check(sdkPort), { name: 'sdk' });
    assert.equal(globalThis.__cxViewerCaptureProxyPort, sdkPort);
  } finally {
    stopProxy();
    sdk.stop();
  }
});

// The interceptor await has settled, but the listen callback has not run yet.
test('stopping between server creation and listen settles the startup promise', { timeout: 2000 }, async () => {
  const proxy = createProxy();
  try {
    const pending = proxy.start(health('cancel binding'));
    const rejected = assert.rejects(pending, /cancelled/);
    await Promise.resolve();
    proxy.stop();
    await rejected;
  } finally {
    proxy.stop();
  }
});
