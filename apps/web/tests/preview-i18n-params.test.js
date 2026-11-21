import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLang, getLang, LANG_OPTIONS } from '../src/i18n.js';

test('preview parameters render without leftover upstream double braces in every locale', () => {
  const saved=getLang();
  try {
    for(const {value} of LANG_OPTIONS) {
      setLang(value);
      for(const key of ['ui.archive.entries','ui.archive.showMore','ui.archive.lineLimit','ui.archive.rowLimit','ui.archive.tooLarge','ui.archive.encoding','ui.filePreview.subtitle.cueLimit','ui.filePreview.subtitle.encoding']) {
        const text=t(key,{count:17,max:'32 MB',encoding:'utf-8'});
        assert.notEqual(text,key);assert.ok(!/[{}]/.test(text),`${value}: ${key}: ${text}`);
      }
    }
  } finally { setLang(saved); }
});
