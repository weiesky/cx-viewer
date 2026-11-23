// Reuse the existing real PTY/runtime + controlled native bridge fixture.
// Only task-owned output paths/ports and the launched-workspace gate differ.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const app = fileURLToPath(new URL('../../packages/app/', import.meta.url));
const source = readFileSync(new URL('./b7-pty-task-fixture.mjs', import.meta.url), 'utf8')
  .replaceAll('../../packages/app/', app)
  .replace("'20600'", "'21080'").replace("'20609'", "'21089'")
  .replace('/tmp/cxv-b7-pty-task-fixture.json', '/tmp/cxv-b9-pty-ui-fixture.json');
const script = join(mkdtempSync(join(tmpdir(), 'cxv-b9-pty-runner-')), 'fixture.mjs');
writeFileSync(script, source);
await import(pathToFileURL(script));
(await import(new URL('../../packages/app/server.js', import.meta.url))).setWorkspaceLaunched(true);
