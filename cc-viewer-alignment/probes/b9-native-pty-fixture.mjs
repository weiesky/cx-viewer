// Reuse the actual CLI/node-pty/Codex fixture, with normal native approvals and own metadata.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const app = fileURLToPath(new URL('../../packages/app/', import.meta.url));
const source = readFileSync(new URL('./b7-pty-fixture.mjs', import.meta.url), 'utf8')
  .replaceAll('../../packages/app/', app)
  .replace("'--dangerously-bypass-approvals-and-sandbox'", "'--ask-for-approval', 'on-request', '--sandbox', 'workspace-write'")
  .replaceAll('20580', '21100').replaceAll('20589', '21109')
  .replace('/tmp/cxv-b7-pty-fixture.json', '/tmp/cxv-b9-native-pty-fixture.json');
const script = join(mkdtempSync(join(tmpdir(), 'cxv-b9-native-pty-runner-')), 'fixture.mjs');
writeFileSync(script, source); await import(pathToFileURL(script));
