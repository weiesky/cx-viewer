import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const helpers = readFileSync(new URL('../src/utils/helpers.js', import.meta.url), 'utf8');
const globalCss = readFileSync(new URL('../src/global.css', import.meta.url), 'utf8');
const chatCss = readFileSync(new URL('../src/components/chat/ChatMessage.module.css', import.meta.url), 'utf8');
const roleFilter = readFileSync(new URL('../src/components/chat/RoleFilterBar.jsx', import.meta.url), 'utf8');
const roleFilterCss = readFileSync(new URL('../src/components/chat/RoleFilterBar.module.css', import.meta.url), 'utf8');

test('OpenAI model SVG inherits the theme monochrome color', () => {
  const provider = helpers.match(/match: \/gpt\|o1\|o3\|o4\/i,[\s\S]*?\n  \},/)?.[0];
  assert.ok(provider, 'expected the OpenAI model provider');
  assert.match(provider, /monochrome: true/);
  assert.match(helpers, /provider\.svg\.replace\(\/\\sfill="\[\^"\]\*"\/g, ' fill="currentColor"'\)/);

  assert.match(globalCss, /--model-logo-mono:\s*#fff/);
  assert.match(globalCss, /--model-logo-mono:\s*#000/);
  assert.match(chatCss, /\.avatar\s*\{[\s\S]*?color:\s*var\(--model-logo-mono\)/);
});

test('conversation role filter preserves theme-aware OpenAI logo color', () => {
  assert.match(roleFilter, /data-model-monochrome=\{r\.avatarMonochrome \? 'true' : undefined\}/);
  assert.match(roleFilterCss, /\[data-model-monochrome="true"\][\s\S]*?color:\s*var\(--model-logo-mono\)/);
});
