import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { setLogDir } from '../findcx.js';
import { getDingTalkImPersonaPath, readDingTalkImPersona, writeDingTalkImPersona } from '../lib/dingtalk-im-persona.js';

const root = mkdtempSync('/tmp/cxv-dingtalk-persona-');
setLogDir(root);
test.after(() => rmSync(root, { recursive: true, force: true }));

test('persona writes only worker AGENTS.md atomically with private permissions', () => {
  assert.equal(writeDingTalkImPersona('  You are the support bot.\r\n'), 'You are the support bot.\n');
  assert.equal(readDingTalkImPersona(), 'You are the support bot.\n');
  assert.equal(getDingTalkImPersonaPath(), join(root, 'IM_dingtalk', 'AGENTS.md'));
  assert.equal(statSync(getDingTalkImPersonaPath()).mode & 0o777, 0o600);
});

test('persona rejects oversized, NUL and symlink-backed files', () => {
  assert.throws(() => writeDingTalkImPersona('x'.repeat(64 * 1024 + 1)), { code: 'DINGTALK_PERSONA_TOO_LARGE' });
  assert.throws(() => writeDingTalkImPersona('bad\0value'), { code: 'INVALID_DINGTALK_PERSONA' });

  const isolated = mkdtempSync('/tmp/cxv-dingtalk-persona-link-');
  setLogDir(isolated);
  const path = getDingTalkImPersonaPath();
  mkdirSync(dirname(path), { recursive: true });
  const victim = join(isolated, 'victim.md');
  writeFileSync(victim, 'unchanged');
  symlinkSync(victim, path);
  assert.throws(() => writeDingTalkImPersona('replacement'), { code: 'UNSAFE_IM_PATH' });
  assert.equal(readDingTalkImPersona(), '');
  rmSync(isolated, { recursive: true, force: true });
  setLogDir(root);
});
