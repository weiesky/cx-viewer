import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import JSZip from 'jszip';

import {
  deleteSkill,
  importSkillUpload,
  listSkills,
  toggleSkill,
} from '../lib/skills-api.js';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-skills-'));
  const homeDir = join(root, 'home');
  const cwd = join(root, 'project');
  mkdirSync(homeDir, { recursive: true });
  mkdirSync(cwd, { recursive: true });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, homeDir, cwd };
}

function writeSkill(dir, { name = null, description = 'desc' } = {}) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), [
    '---',
    ...(name ? [`name: ${name}`] : []),
    `description: ${description}`,
    '---',
    '',
    '# Skill',
    '',
  ].join('\n'));
}

test('skills api lists project, codex, agents, builtin, and plugin skills', (t) => {
  const { homeDir, cwd } = fixture(t);
  writeSkill(join(cwd, '.codex', 'skills', 'project-skill'), { description: 'project desc' });
  writeSkill(join(homeDir, '.codex', 'skills', 'codex-user'), { description: 'codex desc' });
  writeSkill(join(homeDir, '.agents', 'skills', 'agents-user'), { description: 'agents desc' });
  writeSkill(join(homeDir, '.codex', 'skills', '.system', 'imagegen'), { description: 'system desc' });

  const pluginRoot = join(homeDir, '.codex', 'plugins', 'cache', 'openai-bundled', 'browser', '1.0.0');
  mkdirSync(join(pluginRoot, '.codex-plugin'), { recursive: true });
  writeFileSync(join(pluginRoot, '.codex-plugin', 'plugin.json'), JSON.stringify({ name: 'browser', skills: './skills' }));
  writeSkill(join(pluginRoot, 'skills', 'control-in-app-browser'), { description: 'plugin desc' });

  const skills = listSkills({ cwd, homeDir });
  const byKey = new Map(skills.map(s => [`${s.source}:${s.store || ''}:${s.name}`, s]));

  assert.equal(byKey.get('project:project:project-skill')?.description, 'project desc');
  assert.equal(byKey.get('user:codex:codex-user')?.enabled, true);
  assert.equal(byKey.get('user:agents:agents-user')?.enabled, true);
  assert.equal(byKey.get('builtin:system:imagegen')?.description, 'system desc');

  const plugin = skills.find(s => s.source === 'plugin' && s.name === 'control-in-app-browser');
  assert.equal(plugin?.pluginName, 'browser@openai-bundled');
  assert.equal(plugin?.description, 'plugin desc');
});

test('skills api toggles, detects duplicate target, and deletes mutable skills', (t) => {
  const { homeDir, cwd } = fixture(t);
  const enabledPath = join(homeDir, '.codex', 'skills', 'toggle-me');
  const disabledPath = join(homeDir, '.codex', 'skills-skip', 'disabled-one');
  writeSkill(enabledPath);
  writeSkill(disabledPath);

  const off = toggleSkill({ source: 'user', name: 'toggle-me', path: enabledPath, enabled: true, enable: false }, { cwd, homeDir });
  assert.equal(existsSync(enabledPath), false);
  assert.equal(existsSync(off.path), true);

  const on = toggleSkill({ source: 'user', name: 'toggle-me', path: off.path, enabled: false, enable: true }, { cwd, homeDir });
  assert.equal(existsSync(on.path), true);

  const dupEnabled = join(homeDir, '.codex', 'skills', 'dup');
  const dupDisabled = join(homeDir, '.codex', 'skills-skip', 'dup');
  writeSkill(dupEnabled);
  writeSkill(dupDisabled);
  const listedDup = listSkills({ cwd, homeDir }).filter(s => s.name === 'dup' && s.source === 'user' && s.store === 'codex');
  assert.equal(listedDup.length, 2);
  assert.equal(listedDup.every(s => s.duplicate), true);
  assert.throws(
    () => toggleSkill({ source: 'user', name: 'dup', path: dupEnabled, enabled: true, enable: false }, { cwd, homeDir }),
    err => err.code === 'DUPLICATE'
  );

  deleteSkill({ source: 'user', name: 'disabled-one', path: disabledPath, enabled: false }, { cwd, homeDir });
  assert.equal(existsSync(disabledPath), false);
});

test('skills api imports markdown and zip uploads', async (t) => {
  const { homeDir } = fixture(t);
  const targetRoot = join(homeDir, '.codex', 'skills');

  const md = Buffer.from('---\nname: md-import\ndescription: markdown\n---\n');
  const mdResult = await importSkillUpload({ filename: 'SKILL.md', data: md, targetRoot });
  assert.equal(readFileSync(join(mdResult.path, 'SKILL.md'), 'utf8'), md.toString('utf8'));

  const zip = new JSZip();
  zip.file('zip-import/SKILL.md', '---\nname: zip-import\ndescription: zipped\n---\n');
  zip.file('zip-import/extra.txt', 'extra');
  const zipData = Buffer.from(await zip.generateAsync({ type: 'uint8array' }));
  const zipResult = await importSkillUpload({ filename: 'zip-import.zip', data: zipData, targetRoot });
  assert.equal(existsSync(join(zipResult.path, 'SKILL.md')), true);
  assert.equal(readFileSync(join(zipResult.path, 'extra.txt'), 'utf8'), 'extra');
});
