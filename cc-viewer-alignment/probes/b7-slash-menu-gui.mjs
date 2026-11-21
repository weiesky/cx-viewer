import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const sdk = JSON.parse(readFileSync('/tmp/cxv-b7-sdk-ui-fixture.json'));
const pty = JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json'));
const boot = (await (await fetch(pty.url + 'api/workspaces')).json()).sessions.find(session => session.active);
const skill = join(pty.a, '.codex/skills/pty-ui-skill'); mkdirSync(skill, { recursive: true });
writeFileSync(join(skill, 'SKILL.md'), '---\nname: pty-ui-skill\ndescription: Actual ordinary CLI fixture file\n---\n\nFixture only.\n');
const out = new URL('../B7-slash-menu/', import.meta.url); mkdirSync(out, { recursive: true }); const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) for (const mode of ['sdk', 'pty', 'phone']) {
  const browser = await type.launch({ headless: true }); const page = await browser.newPage({ viewport: mode === 'phone' ? { width: 430, height: 932 } : { width: 1440, height: 1000 }, locale: 'en-US' });
  await page.route(/https:\/\/(ipwho\.is|ipapi\.co)/, route => route.fulfill({ json: { country_code: 'SG', country: 'Singapore' } }));
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const commands = []; page.on('response', response => { if (response.url().includes('/api/skill-commands')) commands.push(response.url()); });
  try {
    await page.goto(mode === 'pty' ? pty.url + '?instance=' + boot.instanceKey : sdk.a.url + (mode === 'phone' ? '&mobile=1' : ''));
    if (mode === 'pty') await page.getByText('Terminal', { exact: true }).click();
    const ta = page.locator('textarea:not(.xterm-helper-textarea)').filter({ visible: true }).first(); await ta.waitFor();
    if (mode === 'sdk') {
      const previous = await page.locator('[data-ccv-role="assistant"] .chat-md h1').count();
      await ta.fill('B7 menu catalog warm'); await ta.press('Enter');
      await page.waitForFunction(n => document.querySelectorAll('[data-ccv-role="assistant"] .chat-md h1').length > n, previous);
      await page.getByTitle('Send', { exact: true }).waitFor();
    }
    await ta.fill('/'); const menu = page.getByRole('listbox', { name: 'Skill menu', exact: true }); await menu.waitFor();
    const expected = mode === 'pty' ? 'pty-ui-skill' : 'native-ui-skill';
    const option = menu.getByRole('option').filter({ hasText: '/' + expected }); await option.waitFor();
    const text = await menu.innerText(); assert.ok(!text.includes('/claude-api')); assert.ok(!text.includes('/update-config'));
    if (mode !== 'pty') { assert.ok(text.includes('/imagegen')); assert.ok(!text.includes('/fs-only')); }
    const shot = `${engine}-${mode}-menu.png`; await page.screenshot({ path: join(out.pathname, shot) });
    const callsBefore = mode === 'sdk' ? readFileSync(join(sdk.root, 'calls.jsonl'), 'utf8').split('\n').filter(Boolean).length : null;
    if (mode === 'phone') await option.click();
    else { await ta.fill('/' + expected); await option.waitFor(); await ta.press('Tab'); }
    assert.equal(await ta.inputValue(), '$' + expected + ' '); await menu.waitFor({ state: 'hidden' });
    if (mode === 'sdk') {
      assert.equal(readFileSync(join(sdk.root, 'calls.jsonl'), 'utf8').split('\n').filter(Boolean).length, callsBefore, 'selection never sends');
      const wire = '$' + expected + ' explicit B7 invocation'; await ta.fill(wire);
      const before = await page.locator('[data-ccv-role="assistant"] .chat-md h1').count(); await ta.press('Enter');
      await page.waitForFunction(n => document.querySelectorAll('[data-ccv-role="assistant"] .chat-md h1').length > n, before);
      assert.equal(JSON.parse(readFileSync(join(sdk.root, 'calls.jsonl'), 'utf8').trim().split('\n').at(-1)).text, wire);
    }
    await ta.fill('/no-such-b7-command'); await menu.waitFor(); await menu.getByText('No matching skills', { exact: true }).waitFor();
    await ta.press('Escape'); await menu.waitFor({ state: 'hidden' }); assert.equal(await ta.inputValue(), '/no-such-b7-command');
    assert.deepEqual(errors, []); results.push({ engine, version: browser.version(), mode, emulated: mode === 'phone', actualFilesystemFallback: mode === 'pty', nativeProtocolFixture: mode !== 'pty', selectionFillsDollar: true, noAutoSend: mode === 'sdk' ? true : null, explicitWireVerified: mode === 'sdk' ? true : null, unknownAndEscape: true, commandRequests: commands.length, screenshot: shot, errors });
  } catch (error) { await page.screenshot({ path: join(out.pathname, `${engine}-${mode}-failure.png`) }); console.error(engine, mode, (await page.locator('body').innerText()).slice(-2500)); throw error; }
  finally { await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify(results));
