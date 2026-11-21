// Real Codex Ctrl+G -> actual editor helper -> scoped Web UI save -> native draft return.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
import { createProcessAdapter, sameProcessIdentity } from '../../packages/app/lib/cxv-processes.js';
const require = createRequire(new URL('../../packages/app/package.json', import.meta.url)), WebSocket = require('ws'), { Terminal } = require('@xterm/headless');
const f = JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json')), adapter = createProcessAdapter();
const get = async path => (await fetch(f.url + path)).json();
const post = async (path, scope, body) => fetch(f.url + path + '?instance=' + scope.instanceKey, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const wait = async fn => { const end = Date.now() + 15000; while (!await fn()) { assert.ok(Date.now() < end, 'editor phase deadline'); await new Promise(r => setTimeout(r, 30)); } };
let sessions = (await get('api/workspaces')).sessions;
if (!sessions.some(s => s.cwd === f.b)) { const res = await fetch(f.url + 'api/workspaces/launch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: f.b }) }); assert.equal(res.status, 200); }
await wait(async () => { sessions = (await get('api/workspaces')).sessions; return sessions.length === 2 && sessions.every(s => s.sessionId); });
const owners = [sessions.find(s => s.active), sessions.find(s => s.cwd === f.b)]; assert.notEqual(owners[0].sessionId, owners[1].sessionId);
const modelCount = () => existsSync(join(f.root, 'model-calls.json')) ? JSON.parse(readFileSync(join(f.root, 'model-calls.json'))).length : 0;
const initialModels = modelCount();
async function screen(owner) {
  const ws = new WebSocket(f.url.replace('http:', 'ws:') + 'ws/terminal?instance=' + owner.instanceKey, { headers: { Origin: f.url.replace(/\/$/, '') } });
  try {
    const snapshot = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('screen deadline')), 5000);
      ws.on('error', reject); ws.on('message', raw => { const frame = JSON.parse(raw); if (frame.type === 'state') ws.send(JSON.stringify({ type: 'resync-request', reason: 'requested' })); if (frame.type === 'screen-snapshot') { clearTimeout(timer); resolve(frame); } });
    });
    const terminal = new Terminal({ cols: snapshot.cols, rows: snapshot.rows, allowProposedApi: true });
    try { await new Promise(resolve => terminal.write(snapshot.data, resolve)); return Array.from({ length: terminal.rows }, (_, i) => terminal.buffer.active.getLine(i)?.translateToString(true) || '').join('\n'); }
    finally { terminal.dispose(); }
  } finally { ws.close(); }
}
const out = new URL('../B7-editor-owner/', import.meta.url); mkdirSync(out, { recursive: true }); const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true }); const pages = [], frames = [[], []], errors = [], pending = [];
  try {
    for (let index = 0; index < owners.length; index++) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' }); pages.push(page);
      page.on('pageerror', error => errors.push(error.message)); page.on('websocket', ws => ws.on('framereceived', data => { try { const frame = JSON.parse(data.payload); if (frame.type === 'editor-open') frames[index].push(frame); } catch {} }));
      await page.route(/https:\/\/(ipinfo\.io|ipwho\.is|ipapi\.co)/, r => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { country: 'SG', country_code: 'SG' } }));
      await page.goto(f.url + '?instance=' + owners[index].instanceKey); await page.locator('.xterm-helper-textarea').waitFor({ state: 'attached' });
    }
    for (const [index, owner] of owners.entries()) {
      const page = pages[index], other = pages[1 - index], marker = `${engine}-${index}-${Date.now()}`;
      const original = 'B7 ORIGINAL ' + marker, edited = 'B7 EDITED ' + marker;
      const baseline = frames[index].length, foreignCount = frames[1 - index].length;
      await page.locator('.xterm-helper-textarea').focus(); await page.keyboard.press('Control+u'); await page.keyboard.type(original); await page.waitForTimeout(100); await page.keyboard.press('Control+g');
      await wait(() => frames[index].length > baseline); const frame = frames[index][baseline]; pending.push({ owner, id: frame.sessionId });
      assert.equal(frame.instanceKey, owner.instanceKey); assert.ok([f.root, owner.cwd].some(home => frame.filePath.startsWith(join(home, '.codex/editor') + '/')), JSON.stringify({ frame, root: f.root })); assert.ok(readFileSync(frame.filePath, 'utf8').includes(original));
      const banner = page.getByRole('button', { name: 'After saving, click here to return to Terminal', exact: true }); await banner.waitFor();
      const editable = page.locator('[class*="fileContentView_"] [contenteditable="true"]').filter({ visible: true }).first(); await editable.waitFor();
      await wait(async () => (await editable.innerText()).includes(original));
      assert.equal(frames[1 - index].length, foreignCount); assert.equal(await other.locator('[class*="editorBanner_"]').count(), 0);
      const denied = await post('api/editor-done', owners[1 - index], { sessionId: frame.sessionId }); assert.equal(denied.status, 404);
      assert.equal((await get('api/editor-status?id=' + frame.sessionId + '&instance=' + owner.instanceKey)).done, false);
      const cli = await adapter.inspect(f.pid); const helper = (await adapter.descendants(cli)).find(p => p.command.includes('/lib/cxv-editor.js') && p.command.includes(frame.filePath)); assert.ok(helper, 'actual helper child exists');
      await editable.fill(edited); const save = page.locator('[class*="fileContentView_"]').getByRole('button', { name: 'Save', exact: true });
      await wait(async () => await save.isEnabled());
      await page.getByText('Terminal', { exact: true }).click(); await page.getByText('Terminal', { exact: true }).click(); await page.waitForTimeout(300);
      assert.equal(await editable.innerText(), edited, 'resync replay retains the unsaved native draft'); assert.ok(await save.isEnabled());
      const editingShot = `${engine}-owner-${index}-editing.png`; await page.screenshot({ path: join(out.pathname, editingShot) });
      await save.click(); await wait(() => readFileSync(frame.filePath, 'utf8').includes(edited));
      await banner.click(); await banner.waitFor({ state: 'hidden' });
      await wait(async () => !sameProcessIdentity(helper, await adapter.inspect(helper.pid)));
      const text = await screen(owner); assert.ok(text.includes(edited), 'the real native TUI adopted the saved draft');
      assert.ok(!text.includes('Save and close external editor to continue.'));
      const returnedShot = `${engine}-owner-${index}-returned.png`; await page.screenshot({ path: join(out.pathname, returnedShot) });
      await page.locator('.xterm-helper-textarea').focus(); await page.keyboard.press('Control+u');
      results.push({ engine, version: browser.version(), owner: index, nativeCodex: '0.169.0', realEditorChild: true,
        scopedOpenAndPoll: true, foreignDoneRejected: true, siblingNoNotification: true, replayPreservesUnsavedDraft: true,
        actualUiSave: true, helperExited: true, nativeTuiAdoptedSavedDraft: true, screenshots: [editingShot, returnedShot] });
    }
    assert.deepEqual(errors, []);
  } catch (error) { for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: join(out.pathname, `${engine}-${i}-failure.png`) }); throw error; }
  finally { for (const item of pending) await post('api/editor-done', item.owner, { sessionId: item.id }); await browser.close(); }
}
assert.equal(modelCount(), initialModels);
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify({ noModelSubmission: true, cases: results }, null, 2) + '\n'); console.log(JSON.stringify(results));
