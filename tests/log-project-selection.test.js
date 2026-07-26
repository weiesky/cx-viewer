import test from 'node:test';
import assert from 'node:assert/strict';

import { chooseLogProject } from '../src/utils/logProjectSelection.js';

test('log project refresh preserves a valid explicit selection', () => {
  const logs = { current: [], codex: [] };
  assert.equal(chooseLogProject(logs, 'codex', 'current', true), 'codex');
  assert.equal(chooseLogProject({ current: [] }, 'codex', 'current', true), 'current');
  assert.equal(chooseLogProject(logs, 'codex', 'current', false), 'current');
});
