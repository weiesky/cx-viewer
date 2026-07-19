import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeCodexUserText,
  MAX_INLINE_PROMPT_IMAGE_CHARS,
  MAX_PROJECTED_PROMPTS,
  MAX_PROJECTED_RECORD_BYTES,
  MAX_PROJECTED_TEXT_SEGMENT_CHARS,
  projectedPromptFingerprint,
  projectUserPromptItem,
  projectUserPrompts,
  sanitizeProjectedUserPrompts,
} from '../src/utils/userPromptContent.js';

test('prompt fingerprints cover the full string without allocating a sampled copy', () => {
  const head = 'a'.repeat(1024);
  const tail = 'b'.repeat(1024);
  const first = { segments: [{ type: 'text', text: `${head}X${tail}` }] };
  const second = { segments: [{ type: 'text', text: `${head}Y${tail}` }] };
  assert.notEqual(projectedPromptFingerprint(first), projectedPromptFingerprint(second));
});

test('projects only user-authored text and image blocks in order', () => {
  const prompts = projectUserPrompts([
    { type: 'additional_tools', tools: [{ type: 'function', name: 'exec' }] },
    { type: 'message', role: 'system', content: 'system' },
    { type: 'message', role: 'assistant', content: 'assistant' },
    {
      type: 'message', role: 'user', id: 'u1', content: [
        { type: 'input_text', text: 'first' },
        { type: 'tool_result', content: 'hidden tool output' },
        { type: 'input_image', image_url: '/tmp/cx-viewer-uploads/a.png' },
        { type: 'text', text: 'second' },
      ],
    },
  ]);

  assert.deepEqual(prompts, [{
    id: 'u1',
    segments: [
      { type: 'text', text: 'first' },
      { type: 'image', sourceType: 'file', source: '/tmp/cx-viewer-uploads/a.png', alt: 'a.png' },
      { type: 'text', text: 'second' },
    ],
  }]);
});

test('projects Codex uploaded-image envelopes with their structured data image', () => {
  const prompt = projectUserPromptItem({
    type: 'message',
    role: 'user',
    content: [
      { type: 'input_text', text: '<image name=[Image #1] path="/tmp/cx-viewer-uploads/example.png">' },
      { type: 'input_image', image_url: 'data:image/png;base64,aGVsbG8=' },
      { type: 'input_text', text: '</image>' },
      { type: 'input_text', text: '请去掉这个动画。[Image #1]' },
    ],
  });

  assert.deepEqual(prompt.segments.map(segment => segment.type), ['image', 'text', 'text']);
  assert.equal(prompt.segments[0].sourceType, 'data');
  assert.equal(prompt.segments[0].source, 'data:image/png;base64,aGVsbG8=');
  assert.equal(prompt.segments[2].text, '请去掉这个动画。[Image #1]');
});

test('keeps duplicate prompts and honors the exclusive compaction boundary', () => {
  const input = [
    { role: 'user', content: 'same' },
    { role: 'user', content: 'same' },
    { type: 'compaction', encrypted_content: 'opaque' },
    { role: 'user', content: 'after' },
  ];
  assert.deepEqual(projectUserPrompts(input, 2).map(p => p.segments[0].text), ['same', 'same']);
});

test('normalizes Codex internal user chrome consistently with conversation rendering', () => {
  assert.equal(normalizeCodexUserText('<environment_context>secret</environment_context>'), '');
  assert.equal(normalizeCodexUserText('<codex_internal_context><objective>real task</objective></codex_internal_context>'), 'real task');
  assert.equal(projectUserPromptItem({ role: 'user', content: '<environment_context>x</environment_context>' }), null);
  assert.equal(projectUserPromptItem({ role: 'user', content: 'Summarize this coding session in a few sentences.' }), null);
  assert.equal(projectUserPromptItem({ role: 'user', content: 'Base directory for this skill: /tmp/skill' }), null);
});

test('accepts safe structured image sources and rejects active or unsupported schemes', () => {
  const prompt = projectUserPromptItem({ role: 'user', content: [
    { type: 'input_image', image_url: 'data:image/png;base64,aGVsbG8=' },
    { type: 'image_url', image_url: 'https://example.com/p.png?token=secret' },
    { type: 'input_image', image_url: 'javascript:alert(1)' },
    { type: 'input_image', image_url: 'data:image/svg+xml;base64,PHN2Zz4=' },
  ] });
  assert.equal(prompt.segments.length, 2);
  assert.equal(prompt.segments[0].sourceType, 'data');
  assert.equal(prompt.segments[1].sourceType, 'remote');
  assert.equal(prompt.segments[1].alt, 'p.png');
});

test('keeps an explicit placeholder instead of retaining an oversized inline image', () => {
  const prompt = projectUserPromptItem({
    role: 'user',
    content: [{
      type: 'input_image',
      image_url: `data:image/png;base64,${'a'.repeat(MAX_INLINE_PROMPT_IMAGE_CHARS)}`,
    }],
  });
  assert.deepEqual(prompt.segments, [{
    type: 'image',
    sourceType: 'unavailable',
    source: '',
    alt: null,
    truncated: true,
    unavailableReason: 'inline_image_too_large',
  }]);
  assert.equal(prompt.truncated, true);
  assert.equal(prompt.unavailableReason, 'record_budget');
});

test('rejects oversized nested base64 before creating a data URL', () => {
  const prompt = projectUserPromptItem({
    role: 'user',
    content: [{
      type: 'input_image',
      image_url: {
        type: 'base64',
        media_type: 'image/png',
        data: 'a'.repeat(MAX_INLINE_PROMPT_IMAGE_CHARS),
      },
    }],
  });

  assert.equal(prompt.segments[0].source, '');
  assert.equal(prompt.segments[0].sourceType, 'unavailable');
  assert.equal(prompt.segments[0].unavailableReason, 'inline_image_too_large');
});

test('caps projected prompt count and records an explicit truncation marker', () => {
  const prompts = projectUserPrompts(Array.from(
    { length: MAX_PROJECTED_PROMPTS + 10 },
    (_, i) => ({ role: 'user', content: `prompt-${i}` }),
  ));

  assert.equal(prompts.length, MAX_PROJECTED_PROMPTS);
  assert.equal(prompts.at(-1).truncated, true);
  assert.equal(prompts.at(-1).unavailableReason, 'record_budget');
  assert.equal(prompts.at(-1).segments[0].text, '…');
});

test('caps a projected text segment and exposes truncation metadata', () => {
  const prompt = projectUserPromptItem({
    role: 'user',
    content: 'x'.repeat(MAX_PROJECTED_TEXT_SEGMENT_CHARS + 10),
  });

  assert.equal(prompt.segments[0].text.length, MAX_PROJECTED_TEXT_SEGMENT_CHARS);
  assert.equal(prompt.segments[0].truncated, true);
  assert.equal(prompt.segments[0].unavailableReason, 'record_text_budget');
  assert.equal(prompt.truncated, true);
});

test('enforces the record byte budget for multi-byte text', () => {
  const prefix = 'data:image/png;base64,';
  const image = prefix + 'a'.repeat(MAX_INLINE_PROMPT_IMAGE_CHARS - prefix.length);
  const emojiSegment = '😀'.repeat(MAX_PROJECTED_TEXT_SEGMENT_CHARS / 2);
  const prompt = projectUserPromptItem({
    role: 'user',
    content: [
      { type: 'input_image', image_url: image },
      { type: 'input_text', text: emojiSegment },
      { type: 'input_text', text: emojiSegment },
      { type: 'input_text', text: '😀' },
    ],
  });

  const retainedBytes = prompt.segments.reduce(
    (total, segment) => total + Buffer.byteLength(segment.source || segment.text || ''),
    0,
  );
  assert.ok(retainedBytes <= MAX_PROJECTED_RECORD_BYTES);
  assert.ok(retainedBytes >= MAX_INLINE_PROMPT_IMAGE_CHARS - 64);
  assert.equal(prompt.segments.length, 1);
  assert.equal(prompt.truncated, true);
});

test('sanitizes getter-backed persisted prompt records without throwing', () => {
  const bad = {};
  Object.defineProperty(bad, 'segments', { get() { throw new Error('blocked'); } });
  assert.doesNotThrow(() => sanitizeProjectedUserPrompts([bad]));
  assert.deepEqual(sanitizeProjectedUserPrompts([bad]), []);
});
