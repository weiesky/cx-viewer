import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const chat = readFileSync(new URL('../src/components/chat/ChatMessage.jsx', import.meta.url), 'utf8');
const view = readFileSync(new URL('../src/components/viewers/ToolResultView.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/components/viewers/ToolResultView.module.css', import.meta.url), 'utf8');

test('both ChatMessage renderers make inline image results visible in simplified mode', () => {
  assert.match(chat, /const alwaysFullResult = tu\.name === 'Workflow' \|\| hasInlineToolResultImage\(tr\)/);
  const fullDisplayChecks = chat.match(/\|\| hasInlineToolResultImage\(tr\)/g) || [];
  assert.equal(fullDisplayChecks.length, 1);
  assert.doesNotMatch(chat, /const isFullDisplayTool = .*hasInlineToolResultImage/);
  assert.match(chat, /const previewImages = hasInlineToolResultImage\(tr\) \? \[\] :/);
});

test('tool result images stay outside text collapse and provide accessible lightbox interaction', () => {
  assert.match(view, /<>\{imageBlock\}\{collapsed \? null : textBody\}<\/>/);
  assert.match(view, /<ImageLightbox src=\{image\.src\}/);
  assert.match(view, /aria-label=\{label\}/);
  assert.match(view, /loading="lazy"/);
  assert.match(view, /decoding="async"/);
  assert.match(view, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(view, /setFailed\(false\);\s*setLightboxOpen\(false\);/);
  assert.match(view, /\[image\.src, image\.oversized\]/);
});

test('tool result gallery is responsive and keyboard focus is visible', () => {
  assert.match(css, /grid-template-columns: repeat\(auto-fit/);
  assert.match(css, /\.imageButton:focus-visible/);
  assert.match(css, /@media \(max-width: 640px\)/);
});
