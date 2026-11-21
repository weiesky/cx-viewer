import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { toWorkspacePath } from '../src/utils/gitWorkspacePath.js';
import { FILE_DRAG_TYPE, FOLDER_DRAG_TYPE, isFileDrag, getDraggedFilePath, getDraggedEntry, formatFolderPath, planFileDropInput, quotePathForTerminal } from '../src/utils/fileDragDrop.js';

function drag(types, path = '') {
  return { dataTransfer: { types, getData: (type) => type === 'text/plain' ? path : '' } };
}

describe('file browser drag payload', () => {
  it('accepts only marked internal files', () => {
    assert.equal(isFileDrag(drag(['text/x-internal-move', FILE_DRAG_TYPE])), true);
    assert.equal(isFileDrag(drag(['text/x-internal-move'])), false);
    assert.equal(isFileDrag(drag(['text/plain'])), false);
    assert.equal(isFileDrag(drag(['Files'])), false);
    assert.equal(isFileDrag(null), false);
  });

  it('returns paths only for valid file drags', () => {
    assert.equal(getDraggedFilePath(drag(['text/x-internal-move', FILE_DRAG_TYPE], 'src/a b.txt')), 'src/a b.txt');
    assert.equal(getDraggedFilePath(drag(['text/x-internal-move'], 'src')), null);
    assert.equal(getDraggedFilePath(drag(['text/x-internal-move', FILE_DRAG_TYPE], 'src/a\nb')), null);
    assert.equal(getDraggedFilePath(drag(['text/x-internal-move', FILE_DRAG_TYPE], '')), null);
  });
  it('accepts marked directories and preserves their type', () => {
    assert.equal(isFileDrag(drag(['text/x-internal-move', FOLDER_DRAG_TYPE])), true);
    assert.deepEqual(getDraggedEntry(drag(['text/x-internal-move', FOLDER_DRAG_TYPE], 'src/assets')), { path: 'src/assets', isDir: true });
    assert.equal(getDraggedEntry(drag(['text/x-internal-move', FOLDER_DRAG_TYPE], 'a\0b')), null);
    assert.deepEqual(getDraggedEntry(drag(['text/x-internal-move', FILE_DRAG_TYPE], 'src/a.txt')), { path: 'src/a.txt', isDir: false });
  });

  it('shortens only intermediate folder path segments', () => {
    assert.equal(formatFolderPath('src'), 'src');
    assert.equal(formatFolderPath('src/assets'), 'src/assets');
    assert.equal(formatFolderPath('src/components/chat'), 'src/…/chat');
    assert.equal(formatFolderPath('/Users/sky/project/assets/'), '/Users/…/assets');
    assert.equal(formatFolderPath('C:\\Users\\sky\\assets'), 'C:/…/assets');
    assert.equal(formatFolderPath('/'), '/');
    assert.equal(formatFolderPath('C:\\'), 'C:');
    assert.equal(formatFolderPath('//server/share/dir'), '/server/…/dir');
  });

  it('rejects unsafe folder labels', () => {
    assert.equal(formatFolderPath('a\nb'), '');
    assert.equal(formatFolderPath(''), '');
  });
});

describe('file drop terminal input', () => {
  it('quotes spaces, Unicode and single quotes without submitting', () => {
    assert.equal(planFileDropInput('src/a b.txt'), "'src/a b.txt' ");
    assert.equal(planFileDropInput("src/你's.txt"), "'src/你'\\''s.txt' ");
    assert.equal(quotePathForTerminal('a$b`c`'), "'a$b`c`'");
    const data = planFileDropInput('src/a b.txt', { bracketedPasteMode: true });
    assert.equal(data, "\x1b[200~'src/a b.txt' \x1b[201~");
    assert.ok(!data.includes('\r') && !data.includes('\n'));
  });

  it('uses the shell-specific quoting for scratch terminals', () => {
    assert.equal(quotePathForTerminal('a b.txt', 'cmd.exe'), '"a b.txt"');
    assert.equal(quotePathForTerminal('a&b.txt', 'cmd'), '"a&b.txt"');
    assert.equal(quotePathForTerminal('%PATH%', 'cmd'), '');
    assert.equal(planFileDropInput('a"b', { shell: 'cmd.exe' }), null);
    assert.equal(quotePathForTerminal("it's.txt", 'pwsh'), "'it''s.txt'");
    assert.equal(quotePathForTerminal("a\\'b", 'fish'), "'a\\\\\\'b'");
    assert.equal(quotePathForTerminal('a\rb'), '');
  });

  it('rejects control bytes, including bracket-paste injection', () => {
    assert.equal(planFileDropInput('a\rb'), null);
    assert.equal(planFileDropInput('a\x1bb'), null);
    assert.equal(planFileDropInput("a\u0085b"), null);
    assert.equal(planFileDropInput(null), null);
    assert.equal(planFileDropInput('a\x1b[201~\rb', { bracketedPasteMode: true }), null);
  });
});



describe('git workspace path mapping', () => {
  it('retains root paths and prefixes nested repos exactly once', () => {
    for (const repo of ['.', '', null, undefined]) assert.equal(toWorkspacePath(repo, 'src/a.js'), 'src/a.js');
    assert.equal(toWorkspacePath('sub', 'src/a.js'), 'sub/src/a.js');
    assert.equal(toWorkspacePath('sub', 'src'), 'sub/src');
  });
});
