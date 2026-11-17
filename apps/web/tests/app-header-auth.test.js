import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/dashboard/AppHeader.jsx', import.meta.url), 'utf8');

function loadExportedFunction(name) {
  const marker = `export function ${name}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} export is missing`);
  const parametersEnd = source.indexOf(')', start);
  const brace = source.indexOf('{', parametersEnd);
  let depth = 0;
  let end = -1;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) {
      end = i + 1;
      break;
    }
  }
  assert.notEqual(end, -1, `${name} function is incomplete`);
  const declaration = source.slice(start, end).replace(/^export\s+/, '');
  return Function(`${declaration}; return ${name};`)();
}

const makeAuthState = loadExportedFunction('makeAuthState');
const buildAuthShareUrl = loadExportedFunction('buildAuthShareUrl');

test('auth share URL removes only token when secure remote password login is available', () => {
  const result = buildAuthShareUrl(
    'https://192.168.1.8:7008/view?theme=dark&token=secret&tab=chat#latest',
    makeAuthState({
      enabled: true,
      remotePasswordLoginAvailable: true,
      secureTransport: true,
    }),
  );

  const parsed = new URL(result);
  assert.equal(parsed.searchParams.has('token'), false);
  assert.equal(parsed.searchParams.get('theme'), 'dark');
  assert.equal(parsed.searchParams.get('tab'), 'chat');
  assert.equal(parsed.hash, '#latest');
});

test('auth share URL retains token for unknown, unavailable, or insecure password login', () => {
  const localUrl = 'http://192.168.1.8:7008/?token=secret&theme=dark#latest';
  const cases = [
    makeAuthState(),
    makeAuthState({ enabled: true }),
    makeAuthState({ enabled: true, remotePasswordLoginAvailable: true, secureTransport: false }),
    makeAuthState({ enabled: true, remotePasswordLoginAvailable: false, secureTransport: true }),
    makeAuthState({ enabled: false, remotePasswordLoginAvailable: true, secureTransport: true }),
  ];

  for (const state of cases) assert.equal(buildAuthShareUrl(localUrl, state), localUrl);
});

test('auth component refreshes on project identity and uses the atomic inherit action', () => {
  assert.match(source, /prevProps\.projectName\s*!==\s*this\.props\.projectName/);
  assert.doesNotMatch(source, /\binstanceId\b/);
  assert.match(source, /if \(authContextChanged\) this\.reloadAuthState\(\)/);
  assert.match(source, /requestProjectName\s*!==\s*this\.props\.projectName/);
  assert.match(source, /this\.reloadAuthState\(\);[\s\S]*?_codexSettingsReady/);
  assert.match(source, /action:\s*'enable-global-and-inherit'/);
  assert.doesNotMatch(source, /thenClearOverride/);
});

test('auth refresh rejects stale responses and distinguishes access denial from transport failure', () => {
  assert.match(source, /const seq = \+\+this\._authStateSeq/);
  assert.match(source, /seq !== this\._authStateSeq/);
  assert.match(source, /response\.status === 401 \|\| response\.status === 403/);
  assert.match(source, /loadStatus: 'access-denied'/);
  assert.match(source, /loadStatus: 'error'/);
  assert.doesNotMatch(source, /makeAuthState\(\{ enabled: true/);
});
