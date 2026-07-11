import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { isStaleLocalCodexBaseUrl, parseCodexConfigToml, readCodexGlobalConfig, readOriginalOpenAiBaseUrl, updateCodexGlobalConfig } from '../lib/codex-config.js';

test('codex config detects only local proxy base URLs as stale', () => {
  assert.equal(isStaleLocalCodexBaseUrl('http://127.0.0.1:7008'), true);
  assert.equal(isStaleLocalCodexBaseUrl('http://localhost:7008/'), true);
  assert.equal(isStaleLocalCodexBaseUrl('http://[::1]:7008'), true);

  assert.equal(isStaleLocalCodexBaseUrl('https://api.openai.com/v1'), false);
  assert.equal(isStaleLocalCodexBaseUrl('https://proxy.example.com/openai'), false);
  assert.equal(isStaleLocalCodexBaseUrl('not a url'), false);
});

test('codex config parses top-level config.toml values only', () => {
  const parsed = parseCodexConfigToml(`
model = "gpt-5.5"
show_raw_agent_reasoning = true
openai_base_url = "https://proxy.example.com/openai#v1"

[features]
hooks = true
`);
  assert.equal(parsed.model, 'gpt-5.5');
  assert.equal(parsed.show_raw_agent_reasoning, true);
  assert.equal(parsed.openai_base_url, 'https://proxy.example.com/openai#v1');
  assert.equal(parsed.hooks, undefined);
});

test('codex config writes viewer thinking setting to Codex config.toml', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cxv-codex-config-'));
  try {
    writeFileSync(join(dir, 'config.toml'), 'model = "gpt-test"\n\n[features]\nhooks = true\n', 'utf8');
    const cfg = updateCodexGlobalConfig({ showThinkingSummaries: true }, { CODEX_HOME: dir });
    assert.equal(cfg.model, 'gpt-test');
    assert.equal(cfg.show_raw_agent_reasoning, true);
    const content = readFileSync(join(dir, 'config.toml'), 'utf8');
    assert.match(content, /^show_raw_agent_reasoning = true$/m);
    assert.match(content, /\[features\]\nhooks = true/);
    assert.equal(readCodexGlobalConfig({ CODEX_HOME: dir }).show_raw_agent_reasoning, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('codex config reads original base URL from Codex config dir', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cxv-codex-config-'));
  try {
    writeFileSync(join(dir, 'config.toml'), 'openai_base_url = "https://proxy.example.com/openai"\n', 'utf8');
    assert.equal(readOriginalOpenAiBaseUrl({ CODEX_HOME: dir }), 'https://proxy.example.com/openai');

    writeFileSync(join(dir, 'config.toml'), 'openai_base_url = "http://127.0.0.1:7008/v1"\n', 'utf8');
    assert.equal(readOriginalOpenAiBaseUrl({ CODEX_HOME: dir }), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
