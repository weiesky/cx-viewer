import test from 'node:test';
import assert from 'node:assert/strict';

import { countActiveUserSkills, countSkillWarningCandidates } from '../src/utils/skillsParser.js';

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
