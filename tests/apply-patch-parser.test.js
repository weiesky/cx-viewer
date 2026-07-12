import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractApplyPatchDocuments,
  getToolPatchOperations,
  parseApplyPatch,
} from '../src/utils/applyPatchParser.js';

const PATCH = `*** Begin Patch
*** Add File: src/new.js
+export const created = true;
*** Update File: src/changed.js
@@ -10,2 +10,2 @@
-const value = 'old';
+const value = 'new';
 keep();
*** Delete File: src/deleted.js
*** Update File: src/old-name.js
*** Move to: src/new-name.js
@@
-oldName();
+newName();
*** End Patch`;

test('parses add, update, delete, and move operations in order', () => {
  const operations = parseApplyPatch(PATCH);
  assert.deepEqual(operations.map(op => [op.type, op.path, op.moveTo || null]), [
    ['add', 'src/new.js', null],
    ['update', 'src/changed.js', null],
    ['delete', 'src/deleted.js', null],
    ['update', 'src/old-name.js', 'src/new-name.js'],
  ]);
  assert.equal(operations[0].newString, 'export const created = true;');
  assert.equal(operations[0].added, 1);
  assert.equal(operations[1].oldString, "const value = 'old';\nkeep();");
  assert.equal(operations[1].newString, "const value = 'new';\nkeep();");
  assert.equal(operations[1].startLine, 10);
  assert.equal(operations[1].added, 1);
  assert.equal(operations[1].removed, 1);
  assert.equal(operations[2].removed, 0);
});

test('extracts an apply_patch document from exec JavaScript string input', () => {
  const source = `const patch = ${JSON.stringify(PATCH)};\ntext(await tools.apply_patch(patch));`;
  assert.deepEqual(extractApplyPatchDocuments('exec', source), [PATCH]);
  assert.equal(getToolPatchOperations('exec', source).length, 4);
});

test('supports direct single-quoted and template-literal patch calls', () => {
  const tiny = '*** Begin Patch\n*** Delete File: gone.txt\n*** End Patch';
  const escaped = tiny.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
  const source = `await tools.apply_patch('${escaped}');\nawait tools.apply_patch(\`${tiny}\`);`;
  assert.deepEqual(extractApplyPatchDocuments('exec', source), [tiny]);
});

test('does not treat patch-looking strings in read-only exec code as file changes', () => {
  const source = `text(${JSON.stringify(PATCH)});`;
  assert.deepEqual(extractApplyPatchDocuments('exec', source), []);
});

test('native apply_patch input uses the same parser', () => {
  assert.equal(getToolPatchOperations('apply_patch', { patch: PATCH }).length, 4);
});

test('does not truncate when patched source contains protocol marker text', () => {
  const nestedMarkerPatch = `*** Begin Patch
*** Add File: parser.js
+const endMarker = '*** End Patch';
*** Add File: after.js
+export default true;
*** End Patch`;
  const source = `const patch = ${JSON.stringify(nestedMarkerPatch)}; text(await tools.apply_patch(patch));`;
  assert.deepEqual(
    getToolPatchOperations('exec', source).map(operation => operation.path),
    ['parser.js', 'after.js'],
  );
});
