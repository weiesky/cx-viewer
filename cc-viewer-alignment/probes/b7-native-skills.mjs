import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCodexAppServerClient } from '../../packages/app/lib/codex-appserver-client.js';
import { normalizeAppServerSkills } from '../../packages/app/lib/sdk-appserver-transport.js';
const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-b7-native-skills-'))), cwd = join(root, 'project'), home = join(root, '.codex');
const skill = join(cwd, '.agents/skills/b7-native-fixture'); mkdirSync(skill, { recursive: true }); mkdirSync(home, { recursive: true });
writeFileSync(join(skill, 'SKILL.md'), '---\nname: b7-native-fixture\ndescription: Read-only B7 skill catalog fixture.\n---\n\nFixture only.\n');
const legacySkill = join(cwd, '.codex/skills/b7-legacy-fixture'); mkdirSync(legacySkill, { recursive: true });
writeFileSync(join(legacySkill, 'SKILL.md'), '---\nname: b7-legacy-fixture\ndescription: Legacy-path compatibility fixture.\n---\n\nFixture only.\n');
const client = createCodexAppServerClient({ codexPath: '/Users/sky/.npm-global/bin/codex', cwd,
  env: { ...process.env, HOME: root, CODEX_HOME: home } });
let skills, disabledReported;
try {
  await client.request('initialize', { clientInfo: { name: 'cxv-b7-probe', version: '1.0.0' }, capabilities: { experimentalApi: true } });
  client.notify('initialized');
  const result = await client.request('skills/list', { cwds: [cwd], forceReload: true });
  writeFileSync('/tmp/cxv-b7-e23-native-catalog.json', JSON.stringify(result));
  skills = normalizeAppServerSkills(result, cwd);
  assert.ok(skills.some(item => item.name === 'b7-native-fixture' && item.path === join(skill, 'SKILL.md')));
  await client.request('skills/config/write', { path: join(skill, 'SKILL.md'), enabled: false });
  const disabled = await client.request('skills/list', { cwds: [cwd], forceReload: true });
  disabledReported = disabled.data[0].skills.some(item => item.name === 'b7-native-fixture' && item.enabled === false);
  assert.equal(disabledReported, true);
  assert.equal(normalizeAppServerSkills(disabled, cwd).some(item => item.name === 'b7-native-fixture'), false);
} finally { await client.stop(); }
assert.throws(() => process.kill(client.pid, 0), { code: 'ESRCH' });
const result = { codexVersion: '0.169.0', actualNativeRPC: 'skills/list', noThreadOrTurnStarted: true,
  isolatedHome: root, project: cwd, fixture: skills.find(item => item.name === 'b7-native-fixture'), ownedChildExited: true, nativeDisabledExcluded: disabledReported, legacyProjectCodexPathDiscovered: skills.some(item => item.name === 'b7-legacy-fixture') };
writeFileSync(new URL('../B7-E24-native-skill-roots.json', import.meta.url), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result));
