import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { setLogDir } from '../findcx.js';
import {
  DINGTALK_BUILTIN_SKILL_NAME, DINGTALK_IM_SKILLS_ROOT,
  ensureDingTalkImBuiltinSkill, resolveDingTalkImSkillLang,
} from '../lib/dingtalk-im-skills.js';
import { writePreferences } from '../lib/preferences.js';

function makeSource(root, { zh = 'ZH', en = null, script = 'SCRIPT' } = {}) {
  mkdirSync(join(root, 'zh', DINGTALK_BUILTIN_SKILL_NAME), { recursive: true });
  writeFileSync(join(root, 'zh', DINGTALK_BUILTIN_SKILL_NAME, 'SKILL.md'), zh);
  mkdirSync(join(root, 'scripts'), { recursive: true });
  writeFileSync(join(root, 'scripts', 'cxv-projects.mjs'), script);
  if (en !== null) {
    mkdirSync(join(root, 'en', DINGTALK_BUILTIN_SKILL_NAME), { recursive: true });
    writeFileSync(join(root, 'en', DINGTALK_BUILTIN_SKILL_NAME, 'SKILL.md'), en);
  }
}

test('DingTalk built-in skill is managed in .codex and preserves disabled state', () => {
  const root = mkdtempSync('/tmp/cxv-im-skill-');
  try {
    setLogDir(root);
    const sourceRoot = join(root, 'source');
    const workerDir = join(root, 'IM_dingtalk');
    makeSource(sourceRoot, { zh: 'V1', script: 'SCRIPT-V1' });
    const enabled = join(workerDir, '.codex', 'skills', DINGTALK_BUILTIN_SKILL_NAME);
    const first = ensureDingTalkImBuiltinSkill({ workerDir, sourceRoot, lang: 'zh' });
    assert.equal(first.changed, true);
    assert.equal(readFileSync(join(enabled, 'SKILL.md'), 'utf8'), 'V1');
    assert.equal(readFileSync(join(enabled, 'scripts', 'cxv-projects.mjs'), 'utf8'), 'SCRIPT-V1');
    assert.equal(ensureDingTalkImBuiltinSkill({ workerDir, sourceRoot, lang: 'zh' }).changed, false);

    rmSync(enabled, { recursive: true, force: true });
    const disabled = join(workerDir, '.codex', 'skills-skip', DINGTALK_BUILTIN_SKILL_NAME);
    mkdirSync(disabled, { recursive: true });
    writeFileSync(join(disabled, 'SKILL.md'), 'OLD');
    makeSource(sourceRoot, { zh: 'V2', script: 'SCRIPT-V2' });
    ensureDingTalkImBuiltinSkill({ workerDir, sourceRoot, lang: 'zh' });
    assert.equal(readFileSync(join(disabled, 'SKILL.md'), 'utf8'), 'V2');
    assert.equal(existsSync(enabled), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('DingTalk built-in skill selects the UI language and falls back to zh', () => {
  const root = mkdtempSync('/tmp/cxv-im-skill-lang-');
  try {
    setLogDir(root);
    const sourceRoot = join(root, 'source');
    const workerDir = join(root, 'IM_dingtalk');
    makeSource(sourceRoot, { zh: 'ZH', en: 'EN' });
    writePreferences({ lang: 'en' });
    assert.equal(resolveDingTalkImSkillLang(), 'en');
    ensureDingTalkImBuiltinSkill({ workerDir, sourceRoot });
    assert.equal(readFileSync(join(workerDir, '.codex', 'skills', DINGTALK_BUILTIN_SKILL_NAME, 'SKILL.md'), 'utf8'), 'EN');

    rmSync(join(workerDir, '.codex'), { recursive: true, force: true });
    ensureDingTalkImBuiltinSkill({ workerDir, sourceRoot, lang: 'missing' });
    assert.equal(readFileSync(join(workerDir, '.codex', 'skills', DINGTALK_BUILTIN_SKILL_NAME, 'SKILL.md'), 'utf8'), 'ZH');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('all bundled IM skill languages have a valid template and shared script', () => {
  const languages = readdirSync(DINGTALK_IM_SKILLS_ROOT).filter(name => name !== 'scripts');
  assert.ok(languages.length >= 18);
  assert.equal(existsSync(join(DINGTALK_IM_SKILLS_ROOT, 'scripts', 'cxv-projects.mjs')), true);
  for (const lang of languages) {
    const content = readFileSync(join(
      DINGTALK_IM_SKILLS_ROOT, lang, DINGTALK_BUILTIN_SKILL_NAME, 'SKILL.md',
    ), 'utf8');
    assert.match(content, /^---\nname: manage-cxv-projects\n/);
    assert.match(content, /scripts\/cxv-projects\.mjs/);
    assert.doesNotMatch(content, /\bccv\b|cc-viewer|CCV_|claude/i);
  }
});
