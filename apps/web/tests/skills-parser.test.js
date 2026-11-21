import test from 'node:test';
import assert from 'node:assert/strict';

import { countActiveUserSkills, countSkillWarningCandidates, mergeActiveSkills, groupActiveSkillsByScope } from '../src/utils/skillsParser.js';

test('skill warning count includes active user/project skills but excludes plugins and builtins', () => {
  const skills = [
    ...Array.from({ length: 25 }, (_, i) => ({
      name: `plugin-${i}`, source: 'plugin', pluginName: 'browser@bundled', enabled: true,
    })),
    { name: 'system', source: 'builtin', enabled: true },
    { name: 'global-one', source: 'user', enabled: true },
    { name: 'project-one', source: 'project', enabled: true },
    { name: 'disabled', source: 'user', enabled: false },
  ];

  assert.equal(countActiveUserSkills(skills), 2);
});

test('skill warning count de-duplicates the same active user/project display name', () => {
  assert.equal(countActiveUserSkills([
    { name: 'shared', source: 'user', enabled: true },
    { name: 'shared', source: 'project', enabled: true },
  ]), 1);
  assert.equal(countActiveUserSkills(null), 0);
});

test('skill warning count falls back to historical loaded skills when filesystem data fails', () => {
  const historical = [
    { name: 'one' },
    { name: 'one' },
    { name: 'two' },
    { name: 'browser:control-in-app-browser' },
    { name: 'openai-templates:artifact-template-system-design' },
    { name: 'review' }, // builtin names never count
  ];
  assert.equal(countSkillWarningCandidates(false, historical), 2);
  assert.equal(countSkillWarningCandidates(null, historical), 2);
  assert.equal(countSkillWarningCandidates([], historical), 0);
});


test('merged active skills retain authoritative source after same-name replacement and historical descriptions', () => {
  const input = [
    { name: 'shared', source: 'user', enabled: true },
    { name: 'shared', source: 'project', enabled: true },
    { name: 'other', source: 'user', enabled: true },
    { name: 'tool', source: 'plugin', pluginName: 'bundle@market', enabled: true, description: 'authoritative' },
    { name: 'unknown', enabled: true }, { name: 'disabled', source: 'project', enabled: false },
    { name: 'system', source: 'builtin', enabled: true },
  ];
  const before = JSON.stringify(input), merged = mergeActiveSkills(input, [{ name: 'shared', description: 'historical' }]);
  const grouped = groupActiveSkillsByScope(merged);
  assert.deepEqual(grouped.project, [{ name: 'shared', source: 'project', description: 'historical' }]);
  assert.deepEqual(grouped.global.map(s => s.name), ['other', 'unknown']);
  assert.deepEqual(grouped.plugin, [{ name: 'bundle:tool', source: 'plugin', description: 'authoritative' }]);
  assert.equal(JSON.stringify(input), before); assert.equal(mergeActiveSkills(null, []), null);
  assert.deepEqual(groupActiveSkillsByScope(null), { global: [], project: [], plugin: [] });
});
