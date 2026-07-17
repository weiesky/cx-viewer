import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  handleUltraAgentsRequest,
  isLocalizedText,
  isNonEmptyAgentContent,
  listUltraAgents,
  ULTRA_AGENTS_DIR,
  validateUltraAgentId,
} from '../server/lib/ultra-agents-api.js';
import { ULTRAPLAN_VARIANTS } from '../src/utils/ultraplanTemplates.js';

describe('ultra-agent preset loader', () => {
  let dir;
  const writeAgent = (name, value) => writeFileSync(join(dir, name), JSON.stringify(value));

  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'cxv-ultra-agents-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('validates safe ids, localized fields, and string-only content', () => {
    assert.equal(validateUltraAgentId('research.v2_agent-1'), true);
    for (const bad of ['', '.hidden', '..', 'a..b', 'a/b', 'a\\b', 'a b', 'x'.repeat(201), null]) {
      assert.equal(validateUltraAgentId(bad), false);
    }
    assert.equal(isLocalizedText('Title'), true);
    assert.equal(isLocalizedText({ zh: '', en: 'Title' }), true);
    assert.equal(isLocalizedText({ en: ' ' }), false);
    assert.equal(isLocalizedText(['Title']), false);
    assert.equal(isNonEmptyAgentContent(' body '), true);
    assert.equal(isNonEmptyAgentContent({ en: 'body' }), false);
  });

  it('sorts files, filters fields, defaults invalid descriptions, and deduplicates ids', () => {
    writeAgent('b.json', { id: 'b', title: { zh: '乙', en: 'B' }, description: {}, content: 'B', leaked: true });
    writeAgent('a.json', { id: 'a', title: 'A', content: 'A' });
    writeAgent('c.json', { id: 'a', title: 'duplicate', content: 'duplicate' });
    const out = listUltraAgents({ dir, warn() {} });
    assert.deepEqual(out, [
      { id: 'a', title: 'A', description: '', content: 'A' },
      { id: 'b', title: { zh: '乙', en: 'B' }, description: '', content: 'B' },
    ]);
    assert.equal(Object.hasOwn(out[0], 'leaked'), false);
  });

  it('isolates malformed, invalid, oversized, directory, and symlink entries', () => {
    writeFileSync(join(dir, 'bad.json'), '{');
    writeAgent('invalid.json', { id: '../bad', title: 'Bad', content: 'Bad' });
    writeAgent('large.json', { id: 'large', title: 'Large', content: 'x'.repeat(300 * 1024) });
    mkdirSync(join(dir, 'nested.json'));
    writeAgent('valid.json', { id: 'valid', title: 'Valid', content: 'Valid' });
    try { symlinkSync(join(dir, 'valid.json'), join(dir, 'linked.json')); }
    catch (error) {
      if (error?.code !== 'EPERM' && error?.code !== 'EACCES') throw error;
    }
    assert.deepEqual(listUltraAgents({ dir, warn() {} }).map((agent) => agent.id), ['valid']);
  });

  it('returns an empty list for a missing directory and ignores manifest.json', () => {
    assert.deepEqual(listUltraAgents({ dir: join(dir, 'missing'), warn() {} }), []);
    writeAgent('manifest.json', { id: 'manifest', title: 'Manifest', content: 'not a preset' });
    assert.deepEqual(listUltraAgents({ dir, warn() {} }), []);
  });

  it('treats a missing required bundle as an error', () => {
    assert.throws(
      () => listUltraAgents({ dir: join(dir, 'missing'), requireBuiltins: true, warn() {} }),
      /bundled preset directory is missing/,
    );
  });

  it('caps the response at 100 valid presets', () => {
    for (let index = 0; index < 105; index++) {
      writeAgent(`agent-${String(index).padStart(3, '0')}.json`, {
        id: `agent-${index}`,
        title: `Agent ${index}`,
        content: `Content ${index}`,
      });
    }
    assert.equal(listUltraAgents({ dir, warn() {} }).length, 100);
  });

  it('ships generated presets byte-for-byte from the executable variants', () => {
    const agents = listUltraAgents({ dir: ULTRA_AGENTS_DIR, warn() {} });
    assert.equal(agents.find((agent) => agent.id === 'code-expert')?.content, ULTRAPLAN_VARIANTS.codeExpert);
    assert.equal(agents.find((agent) => agent.id === 'research-expert')?.content, ULTRAPLAN_VARIANTS.researchExpert);
  });
});

describe('ultra-agent response handler', () => {
  function response() {
    return {
      status: null, headers: null, body: '', headersSent: false,
      writeHead(status, headers) { this.status = status; this.headers = headers; this.headersSent = true; },
      end(body = '') { this.body = body; },
    };
  }

  it('returns a no-store JSON response', () => {
    const res = response();
    handleUltraAgentsRequest({}, res, { list: () => [{ id: 'a' }] });
    assert.equal(res.status, 200);
    assert.match(res.headers['Content-Type'], /^application\/json/);
    assert.equal(res.headers['Cache-Control'], 'no-store');
    assert.deepEqual(JSON.parse(res.body), { ok: true, agents: [{ id: 'a' }] });
  });

  it('returns a fixed error without leaking exception details', () => {
    const res = response();
    const original = console.error;
    console.error = () => {};
    try { handleUltraAgentsRequest({}, res, { list: () => { throw new Error('/secret/path'); } }); }
    finally { console.error = original; }
    assert.equal(res.status, 500);
    assert.deepEqual(JSON.parse(res.body), { error: 'internal_error' });
    assert.equal(res.body.includes('/secret/path'), false);
  });
});
