import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildLocalUltraplan, parseUltraplanPrompt } from '../src/utils/ultraplanTemplates.js';

const tmpDir = mkdtempSync(join(tmpdir(), 'cxv-ultra-route-'));
const projectDir = join(tmpDir, 'project');
mkdirSync(projectDir);
process.env.CXV_LOG_DIR = tmpDir;
process.env.CXV_PROJECT_DIR = projectDir;
process.env.CXV_START_PORT = '19960';
process.env.CXV_MAX_PORT = '19969';
process.env.CXV_WORKSPACE_MODE = '1';
process.env.CXV_CLI_MODE = '0';

let requestImpl = httpRequest;

function get(port, path) {
  return new Promise((resolve, reject) => {
    const req = requestImpl({ hostname: '127.0.0.1', port, path, method: 'GET', rejectUnauthorized: false }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('GET /api/ultra-agents integration', { concurrency: false }, () => {
  let mod;
  let port;

  before(async () => {
    mod = await import('../server.js');
    const server = await mod.startViewer();
    assert.ok(server);
    port = mod.getPort();
    requestImpl = mod.getProtocol() === 'https' ? httpsRequest : httpRequest;
  });

  after(async () => {
    await mod.stopViewer();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('serves generated and standalone presets through the real server route', async () => {
    const response = await get(port, '/api/ultra-agents');
    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /^application\/json/);
    const data = JSON.parse(response.body);
    assert.equal(data.ok, true);
    assert.deepEqual(data.agents.map((agent) => agent.id), ['code-expert', 'research-expert', 'test-analysis-expert']);
    const expert = data.agents.find(agent => agent.id === 'test-analysis-expert');
    assert.equal(Object.keys(expert.title).length, 18);
    assert.equal(Object.keys(expert.description).length, 18);
    assert.equal(expert.title.zh, '测分专家');
    const wire = buildLocalUltraplan('Analyze the login UI', 'custom', undefined, expert.content);
    assert.equal(wire, `${expert.content}\n\nAnalyze the login UI`);
    assert.equal(parseUltraplanPrompt(wire)?.displayText, 'Analyze the login UI');
  });

  it('ignores query parameters and always reads the fixed bundled directory', async () => {
    const response = await get(port, '/api/ultra-agents?dir=/tmp&limit=1');
    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(response.body).agents.map((agent) => agent.id), ['code-expert', 'research-expert', 'test-analysis-expert']);
  });
});
