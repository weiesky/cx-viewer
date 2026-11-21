import test from 'node:test';
import assert from 'node:assert/strict';
import { getSlashMenuContext, normalizeSdkCommands, fsSkillsToMenuItems, buildSlashMenuModel, composeOutgoingText } from '../src/utils/slashCommandMenu.js';

test('original slash token trigger stops at whitespace, argument caret, noninitial slash and composition boundary', () => {
  assert.deepEqual(getSlashMenuContext('/', 1), { query: '' });
  assert.deepEqual(getSlashMenuContext('/skill args', 4), { query: 'ski' });
  for (const text of ['plain /skill', '$skill', '/skill args', '/skill\nargs', '/skill\u2028args']) assert.equal(getSlashMenuContext(text, text.length), null);
  assert.equal(getSlashMenuContext('/skill', 0), null);
});

test('native metadata groups actual system skills and plugins without inventing Claude commands', () => {
  const commands = normalizeSdkCommands([
    { name: 'imagegen', scope: 'system' }, { name: 'pack-skill', scope: 'system', pluginId: 'pack' },
    { name: 'project', scope: 'repo', description: 'native' }, { name: 'project' },
    { name: 'bad\ninput' }, { name: '__safe__', scope: 'user' },
  ]);
  const model = buildSlashMenuModel({ sdkReady: true, sdkCommands: commands, fsSkills: [], query: '' });
  assert.deepEqual(model.groups.map(group => [group.key, group.items.map(item => item.name)]), [
    ['personal', ['pack-skill', 'project', '__safe__']], ['builtin', ['imagegen']],
  ]);
  assert.equal(model.flatItems.some(item => item.name === 'claude-api' || item.name === 'update-config'), false);
  assert.deepEqual(model.flatItems.map(item => item.flatIndex), [0, 1, 2, 3]);
  assert.equal(buildSlashMenuModel({ sdkReady: true, sdkCommands: commands, query: 'IM' }).flatItems[0].name, 'imagegen');
});

test('filesystem fallback admits only enabled real files, deduplicates names and preserves actual invocation names', () => {
  const rows = [
    { name: 'review', source: 'builtin', enabled: true, path: null },
    { name: 'real', source: 'plugin', pluginName: 'pack@market', enabled: true, path: '/a/SKILL.md', description: 'actual' },
    { name: 'real', source: 'user', enabled: true, path: '/b/SKILL.md' },
    { name: 'disabled', source: 'user', enabled: false, path: '/d/SKILL.md' },
    { name: 'bad\nname', enabled: true, path: '/bad/SKILL.md' },
  ];
  const before = JSON.stringify(rows), model = buildSlashMenuModel({ sdkReady: false, fsSkills: rows, query: '' });
  assert.equal(model.source, 'fs'); assert.deepEqual(fsSkillsToMenuItems(rows).map(item => item.name), ['real']);
  assert.equal(model.flatItems[0].name, 'real'); assert.equal(JSON.stringify(rows), before);
  assert.deepEqual(buildSlashMenuModel({ sdkReady: true, sdkCommands: [], fsSkills: rows, query: '' }).flatItems, [], 'native empty catalog remains authoritative');
});

test('native dollar skill and slash commands stay first when adding uploads', () => {
  assert.equal(composeOutgoingText('$real task', '"image.png"'), '$real task "image.png"');
  assert.equal(composeOutgoingText('/compact', '"image.png"'), '/compact "image.png"');
  assert.equal(composeOutgoingText('task', '"image.png"'), '"image.png" task');
});
