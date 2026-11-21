// After pnpm build. Uses an already-installed temporary Playwright, never repo dependencies.
// CXV_PLAYWRIGHT_MODULE=/tmp/.../node_modules/playwright/index.mjs
// PLAYWRIGHT_BROWSERS_PATH=/tmp/.../browsers node .../b5-search-gui.mjs [webkit|chromium]
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert.ok(process.env.CXV_PLAYWRIGHT_MODULE, 'Set CXV_PLAYWRIGHT_MODULE to the approved temporary Playwright module');
const repo = fileURLToPath(new URL('../../', import.meta.url));
const engine = process.argv[2] || 'webkit';
const mode = process.argv[3] || 'desktop';
const pw = await import(pathToFileURL(process.env.CXV_PLAYWRIGHT_MODULE));
const child = spawn(process.execPath, [fileURLToPath(new URL('./b4-tasks-gui.mjs', import.meta.url))],
  { cwd: repo, stdio: ['pipe', 'pipe', 'pipe'] });
let browser, page, stage = "starting";
const positions = [];
const position = async label => { if (mode !== "pad") return; positions.push({ label, ...(await page.evaluate(() => { const el = document.querySelector("[data-file-explorer]"); const body = document.querySelector("[class*=mobileCLIBody_]"); return { x: el?.getBoundingClientRect().x, scrollLeft: body?.scrollLeft, active: { tag: document.activeElement?.tagName, class: document.activeElement?.className, title: document.activeElement?.getAttribute("title") } }; })) }); };
try {
  const fixture = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('isolated server readiness timeout')), 15_000);
    child.once('error', reject);
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`isolated server exited ${code}`)); });
    const lines = createInterface({ input: child.stdout });
    lines.on('line', line => {
      try { const data = JSON.parse(line); if (data.root && data.a?.url) { clearTimeout(timer); resolve(data); } } catch {}
    });
  });
  // Drain without printing incidental server logs or generated LAN tokens.
  child.stderr.resume();
  for (const [scope, label] of [[fixture.a, 'A'], [fixture.b, 'B']]) {
    const dir = join(scope.cwd, 'search-fixture'); mkdirSync(dir, { recursive: true });
    for (let i = 0; i < 20; i++) writeFileSync(join(dir, `file-${String(i).padStart(2, '0')}.txt`),
      Array.from({ length: 100 }, (_, n) => `NEEDLE_${label} line ${n + 1}`).join('\n'));
  }
  if (mode === 'menus') {
    for (let i = 0; i < 80; i++) writeFileSync(join(fixture.a.cwd, `row-${String(i).padStart(3, '0')}.txt`), 'fixture');
  }
  if (mode === 'encoding') {
    const text = '原文 中文 😀';
    writeFileSync(join(fixture.a.cwd, 'encoding-le.txt'), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]));
    writeFileSync(join(fixture.a.cwd, 'encoding-be.md'), Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from('# ' + text, 'utf16le').swap16()]));
    for (const name of ['binary.txt', 'slow.txt']) writeFileSync(join(fixture.a.cwd, name), Buffer.from([65, 0, 255, 66]));
    writeFileSync(join(fixture.a.cwd, 'plain.txt'), 'plain UTF-8'); writeFileSync(join(fixture.b.cwd, 'plain.txt'), 'B canary');
  }
  if (mode.startsWith('icons')) {
    for (const name of ['icon-code.js', 'icon-data.json', 'icon-markup.html', 'icon-document.txt', 'icon-image.png', 'icon-video.mp4',
      'icon-audio.opus', 'icon-archive.zip', 'icon-pdf.pdf', 'icon-word.docx', 'icon-sheet.xlsx', 'icon-slides.pptx', 'icon-font.woff',
      'icon-binary.wasm', 'icon-subtitle.srt', 'icon-plain.unknown']) writeFileSync(join(fixture.a.cwd, name), 'isolated icon fixture');
    execFileSync('git', ['init', '-q', fixture.a.cwd], { env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' } });
  }
  if (mode === 'moves') {
    mkdirSync(join(fixture.a.cwd, 'move-target'));
    writeFileSync(join(fixture.a.cwd, 'search-fixture/movable.txt'), 'A move bytes 中文');
    writeFileSync(join(fixture.b.cwd, 'search-fixture/movable.txt'), 'B canary');
  }
  if (mode === 'html') {
    for (const [scope, label] of [[fixture.a, 'A'], [fixture.b, 'B']]) {
      mkdirSync(join(scope.cwd, 'report'));
      writeFileSync(join(scope.cwd, 'report/index.html'), '<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><h1>Sandbox report</h1><script src="app.js"></script></body></html>');
      writeFileSync(join(scope.cwd, 'report/style.css'), 'body{background:' + (label === 'B' ? 'rgb(12,34,56)' : 'red') + ';color:white}');
      writeFileSync(join(scope.cwd, 'report/app.js'), `document.body.dataset.resource='${label}';try{parent.document.body}catch{document.body.dataset.parentBlocked='1'}try{localStorage.getItem('x')}catch{document.body.dataset.storageBlocked='1'}fetch('/api/preferences').catch(()=>document.body.dataset.fetchBlocked='1');`);
    }
  }
  if (mode.startsWith('browser')) {
    for (const [scope, label] of [[fixture.a, 'A'], [fixture.b, 'B']]) {
      const dir = join(scope.cwd, 'browser-fixture');
      for (const name of ['sub', 'dest', 'empty']) mkdirSync(join(dir, name), { recursive: true });
      writeFileSync(join(dir, 'root.txt'), 'ROOT_' + label); writeFileSync(join(dir, 'sub/child.txt'), 'NESTED_' + label);
      writeFileSync(join(dir, 'pic.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="teal"/><script>throw new Error("passive SVG executed")</script></svg>');
    }
  }
  if (mode === 'git-commits' || mode === 'git-stats' || mode === 'git-author' || mode === 'git-drag' || mode === 'refresh' || mode === 'git-scope' || mode === 'git-persist') {
    for (const [scope, label] of [[fixture.a, 'A'], [fixture.b, 'B']]) {
      const git = args => execFileSync('git', args, { cwd: scope.cwd, stdio: 'ignore', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' } });
      git(['init', '-q', '-b', 'main']); git(['config', 'user.name', 'Synthetic ' + label]); git(['config', 'user.email', 'synthetic@example.test']); git(['config', 'commit.gpgsign', 'false']);
      writeFileSync(join(scope.cwd, 'tracked.txt'), 'base ' + label + '\n'); git(['add', 'tracked.txt']); git(['commit', '-qm', 'B5 ' + label + ' base']);
      writeFileSync(join(scope.cwd, 'tracked.txt'), 'local ' + label + '\n'); git(['add', 'tracked.txt']); git(['commit', '-qm', 'B5 ' + label + ' local']);
      if (mode === 'git-stats' || mode === 'git-author') {
        git(['mv', 'tracked.txt', 'renamed.txt']); git(['commit', '-qm', 'B5 ' + label + ' rename']);
        writeFileSync(join(scope.cwd, 'binary.bin'), Buffer.from([0, 255, 1])); git(['add', 'binary.bin']); git(['commit', '-qm', 'B5 ' + label + ' binary']);
        git(['commit', '-qm', 'B5 ' + label + ' empty', '--allow-empty']);
      }
    }
  }
  if (mode === 'git-drag' || mode === 'git-scope') {
    for (const scope of [fixture.a, fixture.b]) {
      const dir = join(scope.cwd, 'sub'); mkdirSync(join(dir, 'dir'), { recursive: true });
      const git = (cwd, args) => execFileSync('git', args, { cwd, stdio: 'ignore', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' } });
      git(dir, ['init', '-q', '-b', 'main']); git(dir, ['config', 'user.name', 'Synthetic']); git(dir, ['config', 'user.email', 'synthetic@example.test']); git(dir, ['config', 'commit.gpgsign', 'false']);
      writeFileSync(join(dir, 'dir/child.txt'), 'nested base\n'); git(dir, ['add', '.']); git(dir, ['commit', '-qm', 'nested base']);
      writeFileSync(join(dir, 'dir/child.txt'), 'nested changed\n');
      mkdirSync(join(scope.cwd, 'stage')); git(scope.cwd, ['mv', 'tracked.txt', 'stage/renamed.txt']);
    }
  }
  if (mode === 'git-conflicts') {
    const git = (args, input) => execFileSync('git', args, { cwd: fixture.a.cwd, input, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' } }).trim();
    git(['init', '-q', '-b', 'main']); git(['config', 'user.name', 'Synthetic']); git(['config', 'user.email', 'synthetic@example.test']); git(['config', 'commit.gpgsign', 'false']);
    git(['commit', '-qm', 'base', '--allow-empty']);
    const blobs = ['base', 'ours', 'theirs'].map(text => git(['hash-object', '-w', '--stdin'], text + '\n'));
    const cases = { UU: [1, 2, 3], AA: [2, 3], DD: [1], AU: [2], UA: [3], DU: [1, 3], UD: [1, 2] };
    const rows = [];
    for (const [status, stages] of Object.entries(cases)) {
      const path = 'conflict-' + status + '.txt'; writeFileSync(join(fixture.a.cwd, path), 'synthetic unmerged working tree\n');
      for (const stage of stages) rows.push('100644 ' + blobs[stage - 1] + ' ' + stage + '\t' + path);
    }
    git(['update-index', '--index-info'], rows.join('\n') + '\n');
    const actual = git(['status', '--porcelain']).split('\n').filter(line => line.includes('conflict-')).map(line => line.slice(0, 2)).sort();
    assert.deepEqual(actual, Object.keys(cases).sort());
  }
  if (mode.startsWith('target')) {
    const config = join(fixture.root, '.codex'); mkdirSync(join(config, 'report'), { recursive: true });
    writeFileSync(join(config, 'AGENTS.md'), '# Synthetic guidance');
    writeFileSync(join(config, 'target-note.txt'), 'Original target bytes');
    writeFileSync(join(config, 'auth.json'), 'SYNTHETIC_DO_NOT_EXPOSE');
    mkdirSync(join(config, 'sessions'), { recursive: true });
    writeFileSync(join(config, 'target.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="teal"/></svg>');
    writeFileSync(join(config, 'report/index.html'), '<!doctype html><link rel="stylesheet" href="style.css"><h1>Target HTML</h1><script src="app.js"></script>');
    writeFileSync(join(config, 'report/style.css'), 'body{background:rgb(12,34,56)}');
    writeFileSync(join(config, 'report/app.js'), "document.body.dataset.targetScript='ran'");
    for (const [scope, label] of [[fixture.a, 'A'], [fixture.b, 'B']]) {
      writeFileSync(join(scope.cwd, 'AGENTS.md'), '# Project guidance ' + label);
      const skill = join(scope.cwd, '.codex/skills/target-project-skill'); mkdirSync(skill, { recursive: true });
      writeFileSync(join(skill, 'SKILL.md'), '---\nname: target-project-skill\ndescription: Synthetic fixture\n---\n# Skill');
      writeFileSync(join(skill, 'skill-note.txt'), 'PROJECT_SKILL_' + label);
    }
  }
  if (mode === 'target-sources') {
    const user = join(fixture.root, '.agents/skills/target-user-skill');
    const plugin = join(fixture.root, '.codex/plugins/cache/market/target-plugin/1.0.0');
    mkdirSync(user, { recursive: true }); mkdirSync(join(plugin, '.codex-plugin'), { recursive: true });
    mkdirSync(join(plugin, 'skills/target-plugin-skill'), { recursive: true });
    writeFileSync(join(user, 'SKILL.md'), '---\nname: target-user-skill\ndescription: Synthetic user fixture\n---\n# User');
    writeFileSync(join(user, 'user-note.txt'), 'USER_SKILL_BYTES');
    writeFileSync(join(plugin, '.codex-plugin/plugin.json'), JSON.stringify({ name: 'target-plugin', skills: './skills' }));
    writeFileSync(join(plugin, 'skills/target-plugin-skill/SKILL.md'), '---\nname: target-plugin-skill\ndescription: Synthetic plugin fixture\n---\n# Plugin');
    writeFileSync(join(plugin, 'skills/target-plugin-skill/plugin-note.txt'), 'PLUGIN_SKILL_BYTES');
    writeFileSync(join(fixture.root, '.agents/private-sibling.txt'), 'NOT_ALLOWED');
  }
  let seed = 'B5 GUI seed';
  if (mode === 'markdown') {
    for (const [scope, label] of [[fixture.a, 'A'], [fixture.b, 'B']]) {
      mkdirSync(join(scope.cwd, 'markdown'));
      writeFileSync(join(scope.cwd, 'markdown/target.txt'), Array.from({ length: 400 }, (_, i) => 'MARKDOWN_' + label + '_LINE_' + (i + 1)).join('\n'));
    }
    writeFileSync(join(fixture.a.cwd, 'only-a.txt'), 'A_ONLY');
    seed = 'B5 Markdown fixture\n\n[Open local](markdown/target.txt#L2) [External](https://example.test/path) [Unsafe](javascript:alert%281%29) [File URI](file://' + join(fixture.a.cwd, 'markdown/target.txt') + ')\n\n`markdown/target.txt:123-125` and `only-a.txt` and `npm run build`\n\n'
      + Array.from({ length: 205 }, (_, i) => '`missing-' + i + '.txt`').join(' ');
  }
  if (mode === 'git-persist') seed += '\n\n[Open note](note.txt)';
  for (const workspace of ['a', 'b']) child.stdin.write(JSON.stringify({ action: 'send', workspace, text: seed }) + '\n');
  browser = await pw[engine].launch({ headless: true, ...(engine === 'chromium' ? { channel: 'chromium' } : {}) });
  const browserContext = await browser.newContext((mode === 'icons-phone' || mode === 'target-phone')
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' }
    : (mode === 'pad' || (mode === 'browser-pad' || mode === 'target-pad'))
    ? { viewport: { width: 834, height: 1194 }, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 Version/27.2 Mobile/15E148 Safari/604.1' }
    : { viewport: { width: 1440, height: 1000 } });
  page = await browserContext.newPage();
  const errors = [], mutations = [], pendingFetches = new Set();
  page.on('request', req => { if (req.resourceType() === 'fetch' && new URL(req.url()).pathname.startsWith('/api/')) pendingFetches.add(req); });
  page.on('requestfinished', req => pendingFetches.delete(req));
  page.on('requestfailed', req => pendingFetches.delete(req));
  const drainFetches = async () => {
    const deadline = Date.now() + 5000;
    while (pendingFetches.size && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(pendingFetches.size, 0, 'finish local API fetches before document navigation');
  };
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', req => { if (req.method() === 'POST') mutations.push(new URL(req.url()).pathname); });
  await page.context().addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, options) => {
      if (typeof input === 'string' && /^https?:\/\/(?:ipinfo\.io|ipwho\.is|ipapi\.co)\//.test(input)) {
        return Promise.resolve(new Response('{"country":"CN","country_code":"CN","ip":"127.0.0.1"}', { headers: { 'content-type': 'application/json' } }));
      }
      return originalFetch(input, options);
    };
  });
  // Unrelated public geolocation is stubbed to keep this fixture fully local.
  await page.route(/^https?:\/\/(?:ipinfo\.io|ipwho\.is|ipapi\.co)\//, route => route.fulfill({
    status: 200, contentType: 'application/json', body: '{"country":"CN","country_code":"CN","ip":"127.0.0.1"}', headers: { 'access-control-allow-origin': '*' },
  }));
  if (mode === 'target-remote') await page.route('**/api/preferences*', async route => {
    const response = await route.fetch(); const json = await response.json();
    await route.fulfill({ response, json: { ...json, _isLocal: false } });
  });
  await page.goto(fixture.a.url + ((mode === 'pad' || (mode === 'browser-pad' || mode === 'target-pad')) ? '&ipad=1' : (mode === 'icons-phone' || mode === 'target-phone') ? '&mobile=1' : ''));
  if (mode === 'target-sources') {
    await (await import('./b5-target-sources-gui.mjs')).verifyTargetSources(page, fixture, repo, engine, drainFetches);
    assert.deepEqual(errors, []);
  } else if (mode.startsWith('target')) {
    await (await import('./b5-target-files-gui.mjs')).verifyTargetFiles(page, fixture, repo, engine, mode, drainFetches);
    assert.deepEqual(errors, []);
  } else if (mode.startsWith('browser')) {
    await (await import('./b5-file-browser-gui.mjs')).verifyFileBrowser(page, fixture, repo, engine, mode);
    assert.deepEqual(errors, []);
  } else if (mode === 'markdown') {
    await (await import('./b5-markdown-files-gui.mjs')).verifyMarkdownFiles(page, fixture, repo, engine, drainFetches);
    assert.deepEqual(errors, []);
  } else if (mode === 'git-persist') {
    await (await import('./b5-git-persist-gui.mjs')).verifyGitPersistence(page, fixture, drainFetches);
    assert.deepEqual(errors, []);
  } else if (mode === 'git-scope') {
    await (await import('./b5-git-scope-gui.mjs')).verifyGitScope(page, fixture, drainFetches);
    assert.deepEqual(errors, []);
  } else if (mode === 'refresh') {
    await (await import('./b5-refresh-gui.mjs')).verifyRefresh(page, fixture, repo, engine);
    assert.deepEqual(errors, []);
  } else if (mode === 'git-drag') {
    await (await import('./b5-git-reference-gui.mjs')).verifyGitReferences(page, fixture, repo, engine);
    assert.deepEqual(errors, []);
  } else if (mode === 'git-conflicts') {
    await (await import('./b5-git-conflicts-gui.mjs')).verifyGitConflicts(page, fixture, repo, engine);
    assert.deepEqual(errors, []);
  } else if (mode === 'git-commits' || mode === 'git-stats' || mode === 'git-author' || mode === 'git-drag') {
    await (await import('./b5-git-commits-gui.mjs')).verifyGitCommits(page, fixture, repo, engine, mode);
    assert.deepEqual(errors, []);
  } else if (mode === 'references') {
    await (await import('./b5-file-reference-gui.mjs')).verifyFileReferences(page, fixture, repo, engine);
    assert.deepEqual(errors, []);
  } else if (mode === 'zones') {
    await (await import('./b5-drop-zones-gui.mjs')).verifyDropZones(page, fixture, repo, engine, false);
    assert.deepEqual(errors, []);
  } else if (mode === 'html') {
    await (await import('./b5-html-preview-gui.mjs')).verifyHtmlPreview(page, fixture);
    assert.deepEqual(errors, []);
  } else if (mode === 'moves') {
    await (await import('./b5-file-move-gui.mjs')).verifyFileMove(page, fixture);
    assert.deepEqual(errors, []);
  } else if (mode === 'imports') {
    await (await import('./b5-file-import-gui.mjs')).verifyFileImport(page, fixture);
    assert.deepEqual(errors, []);
  } else if (mode.startsWith('icons')) {
    await (await import('./b5-file-icons-gui.mjs')).verifyFileIcons(page, fixture, repo, engine, (mode === 'icons-phone' || mode === 'target-phone'));
    assert.deepEqual(errors, []);
  } else if (mode === 'encoding') {
    await (await import('./b5-file-encoding-gui.mjs')).verifyFileEncoding(page, fixture, repo, engine);
    assert.deepEqual(errors, []);
  } else if (mode === 'menus') {
    await (await import('./b5-file-menus-gui.mjs')).verifyFileMenus(page, fixture, repo, engine, drainFetches);
    assert.deepEqual(errors, []);
  } else {
  await page.waitForFunction(() => document.querySelector('[data-search-toggle]') || document.querySelector('button[title="文件浏览器"]'));
  if (await page.locator('[data-search-toggle]').count() === 0) await page.getByTitle('文件浏览器', { exact: true }).click();
  const toggle = page.locator('[data-search-toggle]');
  await toggle.waitFor(); await toggle.click();
  const panel = page.locator('[class*="searchPanel_"]');
  const input = page.getByPlaceholder('搜索', { exact: true });
  await position("opened");
  await input.fill('NEEDLE_A'); await page.waitForSelector('[data-match-row]');
  await page.waitForFunction(() => document.body.textContent.includes('2000'));
  const rows = await page.locator('[data-match-row]').count(); assert.ok(rows < 100);
  assert.equal(await page.locator('[class*="navSidebar_"] button[title="搜索"]').count(), 0);
  await input.press('Enter');
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-match-index') === '0');
  for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowDown');
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-match-index') === '40');
  await position("before-open-file");
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-file-explorer] [class*=treeContainer_]')?.textContent.includes('file-'));
  await position("before-reload");
  stage = "reload";
  await page.reload(); await page.waitForSelector('[data-match-row]');
  assert.equal(await input.inputValue(), 'NEEDLE_A');
  assert.equal(await input.evaluate(el => document.activeElement === el), false, 'refresh restoration must not steal focus');
  await position("after-reload");
  stage = "resize";
  const explorer = await page.locator('[data-file-explorer]').boundingBox();
  const sash = page.getByRole('separator', { name: '调整搜索面板高度' });
  // The exact translated accessible name comes from the actual original component.
  const divider = (await sash.count()) ? sash : page.locator('[class*="searchSash_"]');
  const point = await divider.boundingBox();
  await page.mouse.move(point.x + 40, point.y + 2); await page.mouse.down();
  await page.mouse.move(point.x + 40, explorer.y + explorer.height * 0.15, { steps: 6 }); await page.mouse.up();
  const ratio = (await panel.boundingBox()).height / explorer.height;
  assert.ok(ratio > 0.77 && ratio < 0.82, `clamped search ratio ${ratio}`);
  assert.equal(await page.evaluate(() => document.body.style.cursor), '');
  await position("after-drag");
  stage = "drop";
  const start = mutations.length;
  const guarded = await panel.evaluate(el => {
    const out = [];
    for (const type of ['dragover', 'drop']) {
      const e = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(e, 'dataTransfer', { value: { types: ['Files'], dropEffect: 'copy', files: [] } });
      el.dispatchEvent(e); out.push(e.defaultPrevented);
    }
    return out;
  });
  assert.deepEqual(guarded, [true, true]);
  assert.deepEqual(mutations.slice(start), [], 'search drop must never import or move files');
  stage = "replace-preview";
  await page.getByTitle('切换替换', { exact: true }).click();
  await page.getByPlaceholder('替换', { exact: true }).fill('REPLACED_A');
  await page.getByTitle('全部替换', { exact: true }).click();
  const dialog = page.locator('.ant-modal-confirm'); await dialog.waitFor();
  await dialog.locator('.ant-btn-default').click();
  await position("after-cancel");
  stage = "replace-cancel";
  const first = join(fixture.a.cwd, 'search-fixture/file-00.txt');
  assert.ok(readFileSync(first, 'utf8').includes('NEEDLE_A'));
  await page.getByTitle('全部替换', { exact: true }).click(); await dialog.waitFor();
  await dialog.locator('.ant-btn-primary').click();
  stage = "replace-confirm";
  await page.waitForFunction(() => !document.querySelector('[data-match-row]'));
  assert.ok(readFileSync(first, 'utf8').includes('REPLACED_A'));
  assert.ok(readFileSync(join(fixture.b.cwd, 'search-fixture/file-00.txt'), 'utf8').includes('NEEDLE_B'));
  await position("after-confirm");
  await input.fill('REPLACED_A'); await page.waitForSelector('[data-match-row]');
  const evidence = join(repo, 'cc-viewer-alignment/evidence/B5-search-2026-11-21'); mkdirSync(evidence, { recursive: true });
  const geometry = await page.evaluate(() => ({ scrollX, innerWidth, documentWidth: document.documentElement.scrollWidth,
    ancestors: (() => { const rows = []; for (let el = document.querySelector('[data-file-explorer]'); el; el = el.parentElement) {
      const r = el.getBoundingClientRect(); rows.push({ class: el.className, x: r.x, width: r.width, scrollLeft: el.scrollLeft, scrollWidth: el.scrollWidth, overflow: getComputedStyle(el).overflow });
    } return rows; })(),
    explorer: (() => { const r = document.querySelector('[data-file-explorer]').getBoundingClientRect(); return { x: r.x, width: r.width }; })() }));
  const screenshot = join(evidence, `${engine}-e4-${mode}-embedded-search.png`); await page.screenshot({ path: screenshot });
  // Closing while pointer-captured must restore global cursor and userSelect.
  stage = "close-during-drag";
  const end = await divider.boundingBox(); await page.mouse.move(end.x + 40, end.y + 2); await page.mouse.down();
  await input.focus(); await input.press('Escape'); await input.press('Escape'); await page.mouse.up();
  assert.equal(await input.count(), 0);
  assert.equal(await page.evaluate(() => document.body.style.cursor + document.body.style.userSelect), '');
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ engine, mode, browserVersion: browser.version(), isolatedRoot: fixture.root,
    geometry, positions, activeElement: await page.evaluate(() => ({ tag: document.activeElement?.tagName, class: document.activeElement?.className, placeholder: document.activeElement?.getAttribute("placeholder"), title: document.activeElement?.getAttribute("title") })), totalMatches: 2000, mountedRows: rows, longJumpIndex: 40, revealsAncestors: true, refreshRestoresQuery: true,
    refreshDoesNotStealFocus: true, clampedSearchRatio: ratio, rejectsDrop: true, replaceCancelPreservesBytes: true,
    replaceConfirmApplies: true, siblingBytesPreserved: true, closeDuringDragCleansCursor: true, pageErrors: errors, screenshot }));
  }
} catch (error) {
  console.error('GUI failure stage:', stage);
  await page?.screenshot({ path: `/tmp/cxv-b5-search-${engine}-failure.png` }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  child.kill('SIGTERM');
  const exited = once(child, 'exit');
  const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
  await exited; clearTimeout(timer);
}
