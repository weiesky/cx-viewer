import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { arch, platform, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

for (const name of ['pty-manager.js', 'scratch-pty-manager.js']) {
  test(`${name} repairs the helper for npm-hoisted node-pty before spawning`, { skip: process.platform === 'win32' }, async () => {
    const prefix = mkdtempSync(join(tmpdir(), 'cxv-pty-hoisted-'));
    const app = join(prefix, 'node_modules', 'cx-viewer');
    const pty = join(prefix, 'node_modules', 'node-pty');
    const write = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, value); };
    try {
      write(join(app, 'package.json'), '{"name":"cx-viewer","type":"module"}');
      write(join(pty, 'package.json'), '{"name":"node-pty","type":"module","exports":{".":"./index.js","./package.json":"./package.json"}}');
      const helper = join(pty, 'prebuilds', `${platform()}-${arch()}`, 'spawn-helper');
      write(helper, 'test fixture; never executed');
      write(join(pty, 'index.js'), `
        import { statSync } from 'node:fs';
        export default { spawn() {
          if (!(statSync(${JSON.stringify(helper)}).mode & 0o111)) throw new Error('native helper is not executable');
          return { pid: 4242, onData() {}, onExit() {}, kill() {}, write() {}, resize() {} };
        } };
      `);
      write(join(app, 'findcx.js'), "export const BINARY_NAME = 'codex'; export function resolveNativePath() {}\n");
      write(join(app, 'lib', 'cli-args.js'), 'export function parseCodexInvocation() {} export function stripResumeInvocation() {}\n');
      write(join(app, 'lib', 'terminal-screen-model.js'), 'export class TerminalScreenModel { dispose() {} }\n');
      copyFileSync(new URL(`../${name}`, import.meta.url), join(app, name));
      assert.equal(statSync(helper).mode & 0o111, 0);
      const manager = await import(pathToFileURL(join(app, name)).href);
      if (name === 'pty-manager.js') {
        try { assert.equal(await manager.spawnShell(), true); }
        finally { manager.killPty(); }
      } else {
        try { assert.equal((await manager.openScratchPty('hoisted', { cwd: prefix })).proc.pid, 4242); }
        finally { manager.shutdownScratchPtys(); }
      }
      assert.ok(statSync(helper).mode & 0o111);
    } finally { rmSync(prefix, { recursive: true, force: true }); }
  });
}
