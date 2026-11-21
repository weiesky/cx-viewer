// Native readonly files must not redirect through the boot workspace while loading.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { LogV2Writer } from '../../packages/app/lib/log-v2/writer.js';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json')), sid = randomUUID(), cwd = join(f.root, 'readonly-url'), root = join(f.root, 'logs'); mkdirSync(cwd, { recursive: true });
const writer = LogV2Writer.open({ rootDir: root, projectId: 'b7-readonly-url', canonicalCwd: cwd, sessionId: sid, rootThreadId: sid, source: 'app-server', startReason: 'startup', durability: 'buffered' });
writer.append({ timestamp: '2026-01-02T00:00:00Z', url: 'codex://app-server/turn', mainAgent: true, body: { input: [{ role: 'user', content: [{ type: 'text', text: 'B7 READONLY EXACT URL' }] }] }, response: { status: 200, body: { content: [] } } }, { sessionId: sid, rootThreadId: sid, threadId: sid, agentRole: 'main', isRoot: true });
const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/'), out = new URL('../B7-readonly-url/', import.meta.url); mkdirSync(out, { recursive: true }); const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' }), errors = [], snapshots = [], navigations = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (r.url().includes('/api/log-v2/snapshot')) snapshots.push(r.url()); });
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
    await page.route(/https:\/\/(ipinfo\.io|ipwho\.is|ipapi\.co)/, r => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { country: 'SG', country_code: 'SG' } }));
    const url = f.url + '?logfile=' + encodeURIComponent(file); await page.goto(url); await page.locator('[data-ccv-role="user"]').filter({ hasText: 'B7 READONLY EXACT URL' }).waitFor(); await page.waitForTimeout(1000);
    assert.equal(page.url(), url); assert.equal(snapshots.length, 1); assert.equal(navigations.length, 1); assert.deepEqual(errors, []);
    const screenshot = engine + '-exact-readonly-file.png'; await page.screenshot({ path: join(out.pathname, screenshot) }); results.push({ engine, version: browser.version(), requestedFilePreserved: true, noBootInstanceRedirect: true, snapshotRequests: 1, mainNavigations: 1, errors, screenshot });
  } finally { await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify(results));
