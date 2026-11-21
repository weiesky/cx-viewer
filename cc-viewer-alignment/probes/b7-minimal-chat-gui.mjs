// Generated native-format archive -> actual HTTP/object projection -> original minimal-chat preference/rendering.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { LogV2Writer } from '../../packages/app/lib/log-v2/writer.js';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json')), sid = randomUUID(), cwd = join(f.root, 'minimal'), root = join(f.root, 'logs'); mkdirSync(cwd, { recursive: true });
const writer = LogV2Writer.open({ rootDir: root, projectId: 'b7-minimal', canonicalCwd: cwd, sessionId: sid, rootThreadId: sid, source: 'app-server', startReason: 'startup', durability: 'buffered' });
const input = [{ role: 'user', content: [{ type: 'input_text', text: 'B7 MINIMAL NATIVE FIXTURE' }] }];
function call(id, name, args) { input.push({ type: 'function_call', call_id: id, name, arguments: JSON.stringify(args) }, { type: 'function_call_output', call_id: id, output: 'B7 fixture result ' + id }); }
call('one', 'exec_command', { cmd: 'pwd' }); call('two', 'exec_command', { cmd: 'ls' });
input.push({ role: 'assistant', content: [{ type: 'output_text', text: 'B7 visible content breaks the tool run.' }] });
call('three', 'exec_command', { cmd: 'git status' }); call('four', 'exec_command', { cmd: 'git diff' });
call('patch', 'apply_patch', { patch: '*** Begin Patch\n*** Update File: owner.txt\n@@\n-fixture before\n+fixture after\n*** End Patch' });
call('five', 'exec_command', { cmd: 'echo five' }); call('six', 'exec_command', { cmd: 'echo six' });
input.push({ role: 'assistant', content: [{ type: 'output_text', text: 'B7 synthetic log only; no commands or patches executed.' }] });
writer.append({ timestamp: '2026-01-02T00:00:00Z', url: 'codex://app-server/turn', mainAgent: true, body: { model: 'fixture', input }, response: { status: 200, body: { content: [] } } }, { sessionId: sid, rootThreadId: sid, threadId: sid, agentRole: 'main', isRoot: true });
const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
const out = new URL('../B7-minimal-chat/', import.meta.url); mkdirSync(out, { recursive: true }); const results = [];
const patchPrefs = patch => fetch(f.url + 'api/preferences', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) });
const originalPrefs = await (await fetch(f.url + 'api/preferences')).json();
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true });
  try {
    for (const mode of ['desktop', 'phone']) {
      console.log(engine, mode); await patchPrefs({ minimalChat: true, showFullToolContent: false });
      const page = await browser.newPage({ viewport: mode === 'phone' ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, locale: 'en-US' }); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.route(/https:\/\/(ipinfo\.io|ipwho\.is|ipapi\.co)/, r => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { country: 'SG', country_code: 'SG' } }));
      await page.goto(f.url + '?logfile=' + encodeURIComponent(file) + (mode === 'phone' ? '&mobile=1' : ''));
      await page.getByText('B7 synthetic log only; no commands or patches executed.', { exact: true }).waitFor();
      const rows = page.locator('[data-ccv-role="assistant"]'); assert.equal(await rows.count(), 6); assert.equal(await page.getByText('owner.txt', { exact: true }).count(), 1);
      const merged = `${engine}-${mode}-merged.png`; await page.screenshot({ path: join(out.pathname, merged) });
      async function openSettings() {
        if (mode === 'desktop') { await page.locator('[class*="logoWrap_"]').first().hover(); await page.getByRole('menuitem').filter({ hasText: 'Preferences' }).click(); return page.locator('.ant-drawer-open'); }
        await page.locator('[class*="mobileMenuBtn_"]').click(); await page.getByRole('button', { name: 'Preferences', exact: true }).click(); return page.locator('[class*="mobileSettingsOverlayVisible_"]');
      }
      const settings = await openSettings(); const minimal = settings.getByText('Minimal conversation', { exact: true }).locator('..').getByRole('switch'); await minimal.waitFor(); assert.equal(await minimal.getAttribute('aria-checked'), 'true'); await minimal.click();
      await page.waitForFunction(() => document.querySelectorAll('[data-ccv-role="assistant"]').length === 8);
      assert.equal((await (await fetch(f.url + 'api/preferences')).json()).minimalChat, false);
      assert.equal(await minimal.getAttribute('aria-checked'), 'false'); await page.waitForTimeout(400);
      const settingsShot = `${engine}-${mode}-setting-off.png`; await page.screenshot({ path: join(out.pathname, settingsShot) });
      if (mode === 'desktop') await settings.getByRole('button', { name: 'Close', exact: true }).click(); else await settings.locator('[class*="mobileLogMgmtClose_"]').click();
      await page.waitForTimeout(400); assert.equal(await rows.count(), 8);
      const expanded = `${engine}-${mode}-unmerged.png`; await page.screenshot({ path: join(out.pathname, expanded) });
      await page.reload(); await page.getByText('B7 synthetic log only; no commands or patches executed.', { exact: true }).waitFor(); assert.equal(await rows.count(), 8);
      const reopened = await openSettings(); const toggle = reopened.getByText('Minimal conversation', { exact: true }).locator('..').getByRole('switch'); assert.equal(await toggle.getAttribute('aria-checked'), 'false');
      await toggle.click(); await page.waitForFunction(() => document.querySelectorAll('[data-ccv-role="assistant"]').length === 6);
      const full = reopened.getByText('Show full tool content', { exact: true }).locator('..').getByRole('switch'); await full.click(); await page.waitForFunction(() => document.querySelectorAll('[data-ccv-role="assistant"]').length === 8);
      assert.equal(await reopened.getByText('Minimal conversation', { exact: true }).count(), 0);
      assert.deepEqual(errors, []); results.push({ engine, version: browser.version(), mode, emulated: mode !== 'desktop', generatedNativeFormatArchive: true,
        enabledMergesTwoPureToolRuns: true, assistantBubblesMerged: 6, unmerged: 8, patchRemainsSeparate: true, originalSettingsToggle: true, preferencePersistsOnReload: true, fullContentDisablesMerge: true, noToolOrModelExecution: true, screenshots: [merged, settingsShot, expanded] }); await page.close();
    }
  } finally { await browser.close(); }
}
await patchPrefs({ minimalChat: originalPrefs.minimalChat ?? true, showFullToolContent: originalPrefs.showFullToolContent ?? false });
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify({ cases: results }, null, 2) + '\n'); console.log(JSON.stringify(results));
