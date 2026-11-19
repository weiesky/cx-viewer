import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readPreferences } from './preferences.js';
import {
  assertDingTalkWorkerPathSafe, atomicWritePrivateFile, getDingTalkImWorkerDir,
} from './dingtalk-im-config.js';

export const DINGTALK_BUILTIN_SKILL_NAME = 'manage-cxv-projects';
export const DINGTALK_IM_SKILLS_ROOT = fileURLToPath(new URL('../imSkills/', import.meta.url));
const DEFAULT_LANG = 'zh';

export function resolveDingTalkImSkillLang() {
  const lang = readPreferences().lang;
  return typeof lang === 'string' && lang.trim() ? lang.trim() : DEFAULT_LANG;
}

function syncFile(source, target) {
  const safeTarget = assertDingTalkWorkerPathSafe(target);
  const content = readFileSync(source, 'utf8');
  try {
    if (readFileSync(safeTarget, 'utf8') === content) return false;
  } catch {}
  atomicWritePrivateFile(safeTarget, content);
  return true;
}

export function ensureDingTalkImBuiltinSkill({
  workerDir = getDingTalkImWorkerDir(),
  sourceRoot = DINGTALK_IM_SKILLS_ROOT,
  lang = resolveDingTalkImSkillLang(),
} = {}) {
  const selectedLang = existsSync(join(sourceRoot, lang, DINGTALK_BUILTIN_SKILL_NAME))
    ? lang
    : DEFAULT_LANG;
  const sourceSkill = join(sourceRoot, selectedLang, DINGTALK_BUILTIN_SKILL_NAME, 'SKILL.md');
  const sourceScript = join(sourceRoot, 'scripts', 'cxv-projects.mjs');
  if (!existsSync(sourceSkill)) {
    return { skill: DINGTALK_BUILTIN_SKILL_NAME, targetDir: null, changed: false, reason: 'source-missing' };
  }

  const enabledDir = join(workerDir, '.codex', 'skills', DINGTALK_BUILTIN_SKILL_NAME);
  const disabledDir = join(workerDir, '.codex', 'skills-skip', DINGTALK_BUILTIN_SKILL_NAME);
  const targetDir = existsSync(disabledDir) ? disabledDir : enabledDir;
  let changed = syncFile(sourceSkill, join(targetDir, 'SKILL.md'));
  if (existsSync(sourceScript)) {
    changed = syncFile(sourceScript, join(targetDir, 'scripts', 'cxv-projects.mjs')) || changed;
  }
  return { skill: DINGTALK_BUILTIN_SKILL_NAME, targetDir, changed };
}
