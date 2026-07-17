import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ULTRAPLAN_VARIANTS } from '../src/utils/ultraplanTemplates.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = ['ar', 'da', 'de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'no', 'pl', 'pt-BR', 'ru', 'th', 'tr', 'uk', 'zh-TW', 'zh'];

function extractRaw(md, heading) {
  const marker = `### ${heading}`;
  const start = md.indexOf(marker);
  assert.notEqual(start, -1, `${heading} heading missing`);
  assert.equal(md.indexOf(marker, start + marker.length), -1, `${heading} heading duplicated`);
  const open = md.indexOf('<textarea readonly>\n', start);
  const close = md.indexOf('\n</textarea>', open);
  assert.ok(open > start && close > open, `${heading} raw block missing`);
  return md.slice(open + '<textarea readonly>\n'.length, close);
}

describe('generated UltraPlan assets', () => {
  it('sync script --check succeeds without changing files', () => {
    const result = spawnSync(process.execPath, ['scripts/sync-ultraplan-presets.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });

  for (const locale of LOCALES) {
    it(`${locale} docs exist and raw templates match executable prompts`, () => {
      const ultraPath = join(ROOT, 'concepts', locale, 'UltraPlan.md');
      const customPath = join(ROOT, 'concepts', locale, 'CustomUltraplanExpert.md');
      assert.equal(existsSync(customPath), true);
      assert.ok(readFileSync(customPath, 'utf8').trim().length > 500);
      const md = readFileSync(ultraPath, 'utf8');
      const codeHeading = locale === 'zh' || locale === 'zh-TW' ? '代码专家' : 'Code Expert';
      const researchHeading = locale === 'zh' || locale === 'zh-TW' ? '调研专家' : 'Research Expert';
      assert.equal(extractRaw(md, codeHeading), ULTRAPLAN_VARIANTS.codeExpert);
      assert.equal(extractRaw(md, researchHeading), ULTRAPLAN_VARIANTS.researchExpert);
    });
  }

  it('executable prompts use the CX Codex wrapper and no foreign-platform tools', () => {
    const combined = Object.values(ULTRAPLAN_VARIANTS).join('\n');
    for (const required of ['<user_instructions>', 'request_user_input', 'update_plan', 'multi_agent_v${verson}']) {
      assert.ok(combined.includes(required), `missing ${required}`);
    }
    for (const forbidden of ['<system-reminder>', 'AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode', 'TeamCreate', 'TeamDelete', 'Claude Code']) {
      assert.equal(combined.includes(forbidden), false, `foreign platform term found: ${forbidden}`);
    }
  });

  it('package and Electron manifests include bundled preset assets', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.files.includes('ultraAgents/'));
    assert.ok(pkg.build.files.includes('ultraAgents/**/*'));
    assert.ok(pkg.build.asarUnpack.includes('ultraAgents/**/*'));
  });
});
