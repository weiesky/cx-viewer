import test from 'node:test';
import assert from 'node:assert/strict';
import { Marked } from 'marked';
import { renderMdLink } from '../src/utils/markdownLinkRenderer.js';
import { renderMdCodespan } from '../src/utils/markdownCodeSpanRenderer.js';
const marked = new Marked({renderer:{link:renderMdLink,codespan:renderMdCodespan}});
test('actual renderers preserve link text, safe attributes, external navigation and inert path candidates',()=>{
  const html=marked.parse('[**External**](https://example.test) [Local](docs/a.md#L2) [File](file:///tmp/my%20file.md) `src/a.js:12-14` `npm run build`');
  assert.match(html, /target="_blank" rel="noopener noreferrer"><strong>External/);
  assert.match(html,/data-md-file="docs\/a.md"/); assert.match(html,/<a role="link" tabindex="0" data-md-file="\/tmp\/my file.md">File<\/a>/);
  assert.match(html,/<code data-md-path-candidate="src\/a.js" data-md-file-line="12">src\/a.js:12-14<\/code>/);
  assert.match(html,/<code>npm run build<\/code>/); assert.ok(!html.includes('data-md-file-verified'));
});
