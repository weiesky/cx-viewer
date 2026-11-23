import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.name.endsWith('.js')) yield path;
  }
}
const legacy = {
  'approval-modal-prefs': 'server/lib', 'context-rules': 'server/lib',
  'delta-reconstructor': 'server/lib', 'tools-xml-formatter': 'server/lib', 'voice-pack-events': 'server/lib',
};
const utils = new Set(['clearCheckpoint', 'contentFilter', 'errorReport', 'modelIdentity', 'ptyChunkBuilder', 'requestType', 'teammateDetector', 'ultraplanTemplates', 'userImageRefs', 'userPromptContent']);
for (const path of walk(join(root, 'src'))) {
  const subpath = path.slice(join(root, 'src').length + 1).replaceAll('\\', '/');
  const name = subpath.slice(0, -3);
  test(`legacy path shares the same core module instance: ${name}`, async () => {
    const core = await import(pathToFileURL(path));
    const dir = legacy[name] || (utils.has(name) ? 'src/utils' : 'lib');
    const alias = await import(pathToFileURL(join(root, '../app', dir, subpath)));
    assert.deepEqual(Object.keys(alias), Object.keys(core));
    for (const key of Object.keys(core)) assert.equal(alias[key], core[key], key);
  });
}
