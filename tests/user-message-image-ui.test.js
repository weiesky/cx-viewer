import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const chatView = readFileSync(new URL('../src/components/chat/ChatView.jsx', import.meta.url), 'utf8');
const chatMessage = readFileSync(new URL('../src/components/chat/ChatMessage.jsx', import.meta.url), 'utf8');

test('conversation user messages pass structured input images into the user bubble', () => {
  assert.match(chatView, /projectUserPromptItem\(\{ type: 'message', role: 'user', content \}\)/);
  assert.match(chatView, /filter\(segment => segment\.type === 'image'\)/);
  assert.match(chatView, /<ChatMessage[^>]+role=\{isPlan \? 'plan-prompt' : 'user'\}[^>]+images=/);
  assert.match(chatView, /role="user" text="" images=\{userImages\}/);
});

test('conversation hides upload envelope markers when a structured image is present', () => {
  assert.match(chatView, /<image\\b\[\^>\]\*>\|<\\\/image>/);
});

test('user bubbles render safe structured images with lightbox-capable ChatImage', () => {
  assert.match(chatMessage, /renderStructuredUserImages\(\)/);
  assert.match(chatMessage, /image\.sourceType === 'file'/);
  assert.match(chatMessage, /referrerPolicy="no-referrer"/);
  assert.match(chatMessage, /p\.images !== n\.images/);
});
