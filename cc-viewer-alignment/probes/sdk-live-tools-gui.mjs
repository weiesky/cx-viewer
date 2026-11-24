// Controlled exec protocol; actual SDK manager, server SSE/log V2 and built UI.
// No model, user service, real HOME or Codex configuration is used.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const crFollowup = process.argv.includes('--cr-followup');
const root = mkdtempSync(join(tmpdir(), 'cxv-sdk-live-gui-'));
const socket = createServer(); await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
for (const key of Object.keys(process.env)) if (/^(CXV_|CODEX_|OTEL_)/.test(key)) delete process.env[key];
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'logs'),
  CXV_PROXY_PROFILE_PATH: join(root, 'profiles.json'), CXV_PROJECT_DIR: join(root, 'initial'),
  CXV_TEST: '1', CXV_CAPTURE_ONLY: '1', CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1', CXV_SDK_MODE: '1',
  CXV_NO_OPEN: '1', CXV_START_PORT: String(port), CXV_MAX_PORT: String(port) });
mkdirSync(process.env.CXV_PROJECT_DIR);
const executable = join(root, 'fake-codex.mjs');
writeFileSync(executable, `import { existsSync } from 'node:fs';
import { join } from 'node:path';
const send = f => process.stdout.write(JSON.stringify(f) + '\\n');
const cwd = process.argv[process.argv.indexOf('--cd') + 1];
const wait = async name => { while (!existsSync(join(cwd, name))) await new Promise(r => setTimeout(r, 15)); };
for await (const chunk of process.stdin) {}
send({ type: 'thread.started', thread_id: 'live-' + process.pid }); send({ type: 'turn.started' });
for (let i = 1; i <= 3; i++) {
 const item = { id: 'shell-' + i, type: 'command_execution', command: 'printf live-step-' + i, status: 'in_progress', aggregated_output: '' };
 send({ type: 'item.started', item }); await wait('output-' + i);
 const before = ${crFollowup} ? 'stable output line\\n'.repeat(350) + 'OLD_STATUS_' + i + 'x'.repeat(200) : 'partial-output-' + i;
 send({ type: 'item.updated', item: { ...item, aggregated_output: before } });
 if (${crFollowup}) {
  await wait('update-' + i);
  send({ type: 'item.updated', item: { ...item, aggregated_output: before.replace('OLD_STATUS_', 'NEW_STATUS_') } });
 }
 await wait('complete-' + i);
 send({ type: 'item.completed', item: { ...item, status: i === 2 ? 'failed' : 'completed', exit_code: i === 2 ? 1 : 0, aggregated_output: 'settled-output-' + i } });
}
await wait('final'); send({ type: 'item.completed', item: { id: 'answer', type: 'agent_message', text: 'Canonical final live reply' } });
send({ type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } });
`);
const server = await import('../../packages/app/server.js');
const sdk = await import('../../packages/app/lib/sdk-manager.js');
const interceptor = await import('../../packages/app/interceptor.js');
interceptor.initForWorkspace(process.env.CXV_PROJECT_DIR);
const { updatePreferences } = await import('../../packages/app/lib/preferences.js');
updatePreferences(p => ({ ...p, lang: 'en', showFullToolContent: true, collapseToolResults: false }));
const options = { codexPath: executable, onEntry: server.pushSdkEntry, onStreamingStatus: server.setSdkStreamingState,
  onStreamProgress: server.sendSdkStreamProgress, broadcastWs: server.broadcastWsMessage,
  onAgentLoopStart: server.broadcastAgentLoopStart, onAgentLoopEnd: server.broadcastAgentLoopEnd };
sdk.setSdkLaunchConfig(options); sdk.initSdkSession(process.env.CXV_PROJECT_DIR, 'initial', options);
server.setWorkspaceLaunched(true); await server.startViewer();
const out = new URL(`../evidence/SDK-live-tools${crFollowup ? '-CR' : ''}-2026-11-24/`, import.meta.url); mkdirSync(out, { recursive: true });
const results = []; let browser, running;
try {
 for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) for (const mode of ['desktop', 'phone']) {
  const cwd = join(root, engine + '-' + mode); mkdirSync(cwd);
  const view = sdk.launchSdkSession(cwd, engine + '-' + mode);
  const compact = crFollowup && mode === 'phone';
  updatePreferences(p => ({ ...p, showFullToolContent: !compact }));
  browser = await type.launch({ headless: true });
  const page = await browser.newPage({ viewport: mode === 'phone' ? { width: 430, height: 932 } : { width: 1440, height: 1000 }, locale: 'en-US' });
  const errors = [], connections = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('websocket', ws => connections.push(new URL(ws.url()).pathname));
  await page.route(/https:\/\/(ipinfo\.io|ipwho\.is|ipapi\.co)/, r => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { country: 'SG', country_code: 'SG' } }));
  const url = `http://127.0.0.1:${port}/?instance=${view.instanceKey}${mode === 'phone' ? '&mobile=1' : ''}`;
  await page.goto(url);
  const input = page.locator('textarea:not(.xterm-helper-textarea)').filter({ visible: true }).first(); await input.waitFor();
  running = sdk.sendUserMessage('Live tool GUI fixture', view);
  const tags = page.locator('[class*="simplifiedToolTag_"]');
  const statuses = compact ? tags.locator('[role="status"][data-status]') : page.locator('[role="status"][data-status]');
  const waitText = marker => page.waitForFunction(marker => document.body.innerText.includes(marker), marker);
  const statusCount = async count => { for (let n = 0; n < 200 && await statuses.count() !== count; n++) await page.waitForTimeout(20); assert.equal(await statuses.count(), count); };
  const gate = name => writeFileSync(join(cwd, name), '1');
  for (let i = 1; i <= 3; i++) {
   await statusCount(i);
   assert.equal(await statuses.nth(i - 1).getAttribute('data-status'), 'in_progress');
   assert.equal(await page.getByText('Canonical final live reply', { exact: true }).count(), 0);
   gate('output-' + i);
   if (compact) await tags.nth(i - 1).click();
   await waitText(crFollowup ? 'OLD_STATUS_' + i : 'partial-output-' + i);
   if (crFollowup) {
    gate('update-' + i); await waitText('NEW_STATUS_' + i);
    assert.ok(!(await page.locator('body').innerText()).includes('OLD_STATUS_' + i));
   }
   if (i === 1) {
    // Verify the HTTP SSE fallback as well as the browser's mux control stream.
    const response = await fetch(`http://127.0.0.1:${port}/events?controlOnly=1&instance=${view.instanceKey}`, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200);
    const reader = response.body.getReader(); let replay = '';
    while (!replay.includes('event: stream-progress\n')) replay += new TextDecoder().decode((await reader.read()).value);
    await reader.cancel();
    const snapshot = JSON.parse(replay.split('event: stream-progress\ndata: ')[1].split('\n')[0]);
    assert.equal(snapshot.instanceKey, view.instanceKey);
    assert.ok(snapshot.toolProgress[0].output.includes(crFollowup ? 'NEW_STATUS_1' : 'partial-output-1'));
    // No fresh event follows this reload: only the server's current snapshot can restore the card.
    await page.reload(); await input.waitFor();
    if (compact) await tags.first().click();
    await waitText(crFollowup ? 'NEW_STATUS_1' : 'partial-output-1');
    assert.equal(await statuses.count(), 1);
    if (compact) {
     await page.locator('.simplifiedToolPopover').filter({ visible: true }).waitFor();
     await page.waitForTimeout(300); // Let the actual Antd enter transition settle before visual QA.
    }
    // Scroll the existing overflow containers, as a user inspecting the preview can.
    await page.locator('pre, [class*="simplifiedToolResultPreview_"], [class*="simplifiedToolPopoverContent_"]').evaluateAll(elements => elements.forEach(el => { el.scrollTop = el.scrollHeight; }));
    await page.screenshot({ path: join(out.pathname, `${engine}-${mode}-running.png`), animations: 'disabled' });
   }
   if (compact) await input.click();
   gate('complete-' + i);
   await page.waitForFunction(({ n, status, compact }) => document.querySelectorAll(compact
     ? '[class*="simplifiedToolTag_"] [role="status"][data-status]' : '[role="status"][data-status]')[n - 1]?.dataset.status === status,
     { n: i, status: i === 2 ? 'failed' : 'completed', compact });
  }
  assert.equal(await statuses.count(), 3);
  await page.screenshot({ path: join(out.pathname, `${engine}-${mode}-settled-before-final.png`) });
  gate('final'); await running; running = null;
  await page.getByText('Canonical final live reply', { exact: true }).waitFor();
  await statuses.first().waitFor({ state: 'hidden' });
  if (compact) assert.equal(await tags.count(), 3, 'one canonical pill per call');
  else for (let i = 1; i <= 3; i++) assert.equal(await page.getByText('live-step-' + i, { exact: false }).count(), 1, 'one canonical card per call');
  await page.screenshot({ path: join(out.pathname, `${engine}-${mode}-canonical.png`) });
  await page.reload(); await input.waitFor(); await page.getByText('Canonical final live reply', { exact: true }).waitFor();
  assert.equal(await statuses.count(), 0);
  // A second turn is held at shell start and interrupted through the real Stop button/WS.
  for (const name of ['output-1', 'update-1', 'complete-1', 'output-2', 'update-2', 'complete-2', 'output-3', 'update-3', 'complete-3', 'final']) {
   const { unlinkSync } = await import('node:fs'); if (existsSync(join(cwd, name))) unlinkSync(join(cwd, name));
  }
  running = sdk.sendUserMessage('Live tool stop fixture', view);
  await statuses.first().waitFor(); await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await running; running = null; await statuses.first().waitFor({ state: 'hidden' });
  await page.goto(`http://127.0.0.1:${port}/?instance=${sdk.listSdkSessions().find(s => s.cwd === process.env.CXV_PROJECT_DIR).instanceKey}`);
  await input.waitFor(); assert.equal(await statuses.count(), 0); assert.ok(!(await page.locator('body').innerText()).includes('live-step-'));
  assert.deepEqual(errors, []);
  results.push({ engine, version: browser.version(), mode, emulated: mode === 'phone', steps: 3, controlledExecProtocol: true,
    crFollowup, compact, ...(crFollowup ? { longOutputTail: true, equalLengthUpdatesWithMatchingSampledSignature: true } : {}),
    actualSdkControlStreamV2AndBuiltUi: true, httpSseReplay: true, runningOutput: true, completedAndFailed: true, reloadMidCommand: true,
    canonicalReplacementWithoutDuplicates: true, stopViaWs: true, siblingIsolation: true, pageErrors: errors, websocketPaths: connections });
  await browser.close(); browser = null;
 }
 writeFileSync(join(out.pathname, 'result.json'), JSON.stringify({ root, port, results }, null, 2) + '\n');
 console.log(JSON.stringify({ root, port, results }));
} catch (error) {
 if (browser) { const page = browser.contexts()[0]?.pages()[0]; if (page) { console.error((await page.locator('body').innerText()).slice(-2500)); await page.screenshot({ path: join(out.pathname, 'failure.png') }); } }
 throw error;
} finally {
 await browser?.close(); await sdk.stopSession(); await running?.catch(() => {}); await server.stopViewer();
 interceptor._stopProxyProfileWatchForTests(); await interceptor.closeLogV2Writes();
}
