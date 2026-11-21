import test from 'node:test';
import assert from 'node:assert/strict';

async function fixture(href, run) {
  const previous = globalThis.window;
  try {
    globalThis.window = { location: new URL(href), __CXV_BASE_PATH__: '/viewer/' };
    const mod = await import(`../src/utils/apiUrl.js?test=${encodeURIComponent(href)}`);
    await run(mod);
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
}

test('workspace URLs preserve base path, file query and login token across HTTP and WebSocket', async () => fixture(
  'https://viewer.example/viewer/?instance=cxv-b&token=a%26b', mod => {
    const http = new URL(mod.apiUrl('/api/file-content?path=space%20note.txt'), window.location.href);
    assert.equal(http.pathname, '/viewer/api/file-content');
    assert.equal(http.searchParams.get('path'), 'space note.txt');
    assert.equal(http.searchParams.get('instance'), 'cxv-b');
    assert.equal(http.searchParams.get('token'), 'a&b');
    const ws = new URL(mod.appendToken(mod.appendWorkspaceInstance('wss://viewer.example/viewer/ws/terminal')));
    assert.equal(ws.protocol, 'wss:');
    assert.equal(ws.searchParams.get('instance'), 'cxv-b');
    assert.equal(ws.searchParams.get('token'), 'a&b');
    const scratch = new URL(mod.appendToken(mod.appendWorkspaceInstance('wss://viewer.example/viewer/ws/terminal-scratch?id=shared')));
    assert.equal(scratch.searchParams.get('id'), 'shared');
    assert.equal(scratch.searchParams.get('instance'), 'cxv-b');
    assert.equal(scratch.searchParams.get('token'), 'a&b');
  },
));

test('explicit workspace anchors remain exact, including empty anchors that the server must reject', async () => fixture(
  'http://viewer.example/?instance=cxv-a', mod => {
    assert.equal(new URL(mod.apiUrl('/events?instance=cxv-b'), window.location.href).searchParams.get('instance'), 'cxv-b');
    assert.equal(new URL(mod.apiUrl('/events?instance='), window.location.href).searchParams.get('instance'), '');
  },
));

test('unanchored and server-rendered pages keep their existing URL behavior', async () => fixture(
  'http://viewer.example/', mod => {
    assert.equal(mod.apiUrl('/api/project-dir'), '/viewer/api/project-dir');
    delete globalThis.window;
    assert.equal(mod.appendWorkspaceInstance('/events'), '/events');
  },
));

test('native guidance and skill target parameters preserve identity, viewed instance, base path and token', async () => fixture(
  'http://viewer.example/?instance=b&token=synthetic', mod => {
    for (const target of [{ kind: 'codex-md', id: 'native_opaque-id' }, { kind: 'skill', source: 'user', path: '/home/中文 skill' }]) {
      const url = new URL(mod.apiUrl(mod.withViewParams(mod.withTargetParams('/api/file-content?path=space%20note.txt', target), { instance: 'a' })), window.location.href);
      assert.equal(url.pathname, '/viewer/api/file-content');
      assert.equal(url.searchParams.get('instance'), 'a'); assert.equal(url.searchParams.get('token'), 'synthetic');
      assert.equal(url.searchParams.get('path'), 'space note.txt'); assert.equal(url.searchParams.get('kind'), target.kind);
      if (target.id) assert.equal(url.searchParams.get('id'), target.id);
      else { assert.equal(url.searchParams.get('source'), target.source); assert.equal(url.searchParams.get('targetPath'), target.path); }
    }
    assert.equal(mod.withTargetParams('/api/files', null), '/api/files');
  },
));
