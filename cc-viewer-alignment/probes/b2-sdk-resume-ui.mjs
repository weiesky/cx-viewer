// Actual component methods with React and browser fixtures; not GUI acceptance.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const web = join(repo, 'apps/web');
const require = createRequire(join(web, 'package.json'));
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
mkdirSync(join(web, 'node_modules/.cache'), { recursive: true });
const output = join(web, `node_modules/.cache/cxv-resume-probe-${process.pid}.cjs`);
await build({ stdin: { contents: `export { default as AppBase } from './src/AppBase.jsx';
export { default as ChatView } from './src/components/chat/ChatView.jsx';
export { default as SdkWorkspaceTabs } from './src/components/dashboard/SdkWorkspaceTabs.jsx';`, resolveDir: web },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: output,
  loader: { '.css': 'empty', '.svg': 'text', '.png': 'dataurl', '.gif': 'dataurl' }, logLevel: 'error' });
require.extensions['.css'] = () => {};
globalThis.self = globalThis;
globalThis.MutationObserver = class { observe() {} disconnect() {} };
globalThis.document = { documentElement: { style: {}, getAttribute() { return 'dark'; }, classList: { add() {} } },
  body: { style: {} }, createElement() { return { style: {} }; } };
const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
Object.defineProperty(globalThis, 'navigator', { configurable: true,
  value: { userAgent: 'Desktop', platform: 'Linux', maxTouchPoints: 1 } });
const urls = [];
globalThis.window = { location: new URL('http://fixture/base/?instance=a&token=secret'), innerWidth: 1200,
  history: { replaceState(state, title, url) { urls.push(new URL(url)); } }, addEventListener() {}, removeEventListener() {} };
const syncState = host => { host.setState = (change, callback) => {
  Object.assign(host.state, typeof change === 'function' ? change(host.state) : change); callback?.();
}; };
try {
  const { AppBase, ChatView, SdkWorkspaceTabs } = require(output);
  const app = new AppBase({}); syncState(app);
  let resets = 0;
  app._resetV2Communication = () => { resets++; };
  const oldRows = [{ timestamp: 'old' }]; app.state.requests = oldRows;
  app.handleSdkSessionResumed({ instanceKey: 'b', resumeId: 'other' });
  assert.equal(resets, 0);
  const restored = { instanceKey: 'a', resumeId: 'r1' };
  app.handleSdkSessionResumed(restored); app.handleSdkSessionResumed(restored, true);
  assert.equal(resets, 1, 'SSE and HTTP receipt apply the same switch only once');
  assert.equal(app.state.sdkResumeId, 'r1');
  assert.equal(app.state.requests, oldRows, 'the existing chat remains mounted while the new archive loads');
  app._isLocalLog = true;
  app.handleSdkSessionResumed({ instanceKey: 'a', resumeId: 'r2' });
  assert.equal(resets, 1, 'another browser must not redirect a read-only history view');
  app.handleSdkSessionResumed({ instanceKey: 'a', resumeId: 'r2' }, true);
  assert.equal(resets, 2); assert.equal(app._isLocalLog, false);
  assert.equal(urls.at(-1).searchParams.get('instance'), 'a');
  assert.equal(urls.at(-1).searchParams.get('token'), 'secret');
  app._unmounted = true;
  app.handleSdkSessionResumed({ instanceKey: 'a', resumeId: 'late' });
  assert.equal(resets, 2);

  const props = { projectName: 'same', sdkMode: true, sdkResumeId: 'r1', mainAgentSessions: [] };
  const chat = new ChatView(props); syncState(chat);
  chat._inputRef.current = { value: 'unsent draft' };
  chat.state.pendingInputs = [{ id: 'old-submission' }];
  const images = [{ path: 'attachment.png' }]; chat.state.pendingImages = images;
  chat._deferSend();
  const next = { ...props, sdkResumeId: 'r2' };
  assert.equal(chat.shouldComponentUpdate(next, chat.state), true);
  chat.props = next; chat.componentDidUpdate(props, { ...chat.state });
  assert.equal(chat._inputRef.current.value, 'unsent draft');
  assert.equal(chat.state.pendingImages, images);
  assert.equal(chat._sendDeferred, false);
  assert.equal(chat.state.sendDeferred, false);
  assert.deepEqual(chat.state.pendingInputs, []);
  // Invoke the actual function component with a hook-state fixture. This checks
  // the CLI URL handoff and cancel callback, not mounted DOM or portal behavior.
  const dispatcher = require('react').__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;
  const previousDispatcher = dispatcher.current;
  const hookStates = [];
  window.location = new URL('http://fixture/base/?instance=a&token=secret&resume=1');
  dispatcher.current = {
    useState(initial) {
      const index = hookStates.length;
      hookStates.push(typeof initial === 'function' ? initial() : initial);
      return [hookStates[index], value => { hookStates[index] = value; }];
    }, useMemo(fn) { return fn(); }, useEffect() {}, useRef(value) { return { current: value }; },
  };
  try {
    const tree = SdkWorkspaceTabs({ onResumed() {} });
    const modal = tree.props.children.at(-1);
    assert.equal(modal.props.open, true);
    modal.props.onClose();
    assert.equal(hookStates[3], false);
    assert.equal(urls.at(-1).searchParams.has('resume'), false);
    assert.equal(urls.at(-1).searchParams.get('instance'), 'a');
    assert.equal(urls.at(-1).searchParams.get('token'), 'secret');
    assert.equal(urls.at(-1).pathname, '/base/');
  } finally { dispatcher.current = previousDispatcher; }
  console.log(JSON.stringify({ scoped_transition: 'passed', receipt_dedup: 'passed', readonly_view: 'passed',
    draft_and_attachments_retained: 'passed', deferred_send_cancelled: 'passed', cli_picker_handoff: 'passed', browser_gui: 'not verified' }));
} finally { rmSync(output, { force: true }); }
