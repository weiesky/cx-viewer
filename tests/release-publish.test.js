import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const electronRequire = createRequire(new URL('../apps/electron/package.json', import.meta.url));
const builderRequire = createRequire(electronRequire.resolve('electron-builder'));
const appBuilderRequire = createRequire(builderRequire.resolve('app-builder-lib'));
const { load } = appBuilderRequire('js-yaml');
const workflow = load(readFileSync(join(root, '.github/workflows/npm-publish.yml'), 'utf8'));
const script = workflow.jobs.publish.steps.find(step => step.name === 'Publish package').run;
const version = JSON.parse(readFileSync(join(root, 'packages/app/package.json'))).version;

for (const [name, versions, fail, channel] of [
  ['new stable release', ['0.0.1'], false, 'latest'],
  ['equal stable version', [version], false, 'latest'],
  ['backport below a newer stable', ['999.0.0'], false, 'patch'],
  ['registry query failure', [], true, 'latest'],
  ['prerelease does not displace stable', ['999.0.0-rc.1', '0.0.1'], false, 'latest'],
]) {
  test(`actual publish workflow: ${name}`, { skip: process.platform === 'win32' }, () => {
    const fixture = mkdtempSync(join(tmpdir(), 'cxv-release-tag-'));
    const record = join(fixture, 'publish.json');
    const fake = join(fixture, 'npm');
    writeFileSync(fake, `#!${process.execPath}\nif(process.argv[2]==='view'){if(process.env.CXV_NPM_FAIL==='1')process.exit(42);console.log(process.env.CXV_NPM_VERSIONS);}else{require('node:fs').writeFileSync(process.env.CXV_NPM_RECORD,JSON.stringify(process.argv.slice(2)));}\n`, { mode: 0o700 });
    try {
      const result = spawnSync('/bin/bash', ['-euo', 'pipefail', '-c', script], {
        cwd: join(root, 'packages/app'), encoding: 'utf8',
        env: { ...process.env, PATH: `${fixture}:${process.env.PATH}`, CXV_NPM_FAIL: fail ? '1' : '0', CXV_NPM_VERSIONS: JSON.stringify(versions), CXV_NPM_RECORD: record },
      });
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(readFileSync(record)), ['publish', '--access', 'public', '--tag', channel]);
    } finally { rmSync(fixture, { recursive: true, force: true }); }
  });
}
