// Real read-only V2 HTTP/object projection -> browser; generated fixture, no native/model input.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { LogV2Writer } from '../../packages/app/lib/log-v2/writer.js';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json')), sid = randomUUID(), cwd = join(f.root, 'readonly'), root = join(f.root, 'logs'); mkdirSync(cwd, { recursive: true });
const writer = LogV2Writer.open({ rootDir: root, projectId: 'b7-readonly', canonicalCwd: cwd, sessionId: sid, rootThreadId: sid, source: 'app-server', startReason: 'startup', durability: 'buffered' });
const input = Array.from({ length: 1050 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: [{ type: 'text', text: `B7 READONLY ROW ${String(i).padStart(4, '0')}` }], _timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString() }));
writer.append({ timestamp: '2026-01-02T00:00:00Z', url: 'codex://app-server/turn', mainAgent: true, body: { model: 'fixture', input }, response: { status: 200, body: { content: [] } } }, { sessionId: sid, rootThreadId: sid, threadId: sid, agentRole: 'main', isRoot: true });
const file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
const out = new URL('../B7-readonly-render-window/', import.meta.url); mkdirSync(out, { recursive: true }); const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true });
  try {
    for (const mode of ['desktop', 'phone', 'pad']) {
      const page = await browser.newPage({ viewport: mode === 'phone' ? { width: 390, height: 844 } : mode === 'pad' ? { width: 1024, height: 768 } : { width: 1440, height: 1000 }, locale: 'en-US', ...(mode === 'phone' && engine === 'webkit' ? { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' } : {}) }); const errors = [], writes = [];
      page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (r.method() === 'POST' && !r.url().includes('/api/log-v2/objects')) writes.push(r.url()); });
      await page.route(/https:\/\/(ipinfo\.io|ipwho\.is|ipapi\.co)/, r => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { country: 'SG', country_code: 'SG' } }));
      await page.goto(f.url + '?logfile=' + encodeURIComponent(file) + (mode === 'phone' ? '&mobile=1' : mode === 'pad' ? '&ipad=1' : ''));
      // Chromium exercises Virtuoso; emulated iPhone/WebKit exercises the nonvirtual iOS branch.
      await page.locator('[data-ccv-role="user"]').first().waitFor();
      const virtual = await page.locator('[data-virtuoso-scroller]').count() > 0;
      if (virtual) { await page.locator('[data-virtuoso-scroller]').hover(); await page.mouse.wheel(0, -200000); }
      await page.waitForFunction(() => document.querySelector('[data-ccv-role="user"]')?.textContent?.includes('B7 READONLY ROW 0000'), null, { timeout: 25000 });
      const count = await page.locator('[data-ccv-role="user"], [data-ccv-role="assistant"]').count();
      if (!virtual) assert.equal(count, 1050);
      assert.equal(await page.getByRole('button', { name: /Load .* earlier|Load more/i }).count(), 0);
      const screenshot = `${engine}-${mode}-auto-filled.png`; await page.screenshot({ path: join(out.pathname, screenshot) });
      assert.deepEqual(errors, []); assert.deepEqual(writes, []);
      results.push({ engine, version: browser.version(), mode, emulated: mode !== 'desktop', virtualized: virtual, generatedRows: 1050, mountedRows: count, firstRowAccessibleWithoutClick: true, noManualLoadButton: true, noWritesOrModelSend: true, screenshot }); await page.close();
    }
  } finally { await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify({ file, source: 'generated native-format V2 archive', cases: results }, null, 2) + '\n'); console.log(JSON.stringify(results));
