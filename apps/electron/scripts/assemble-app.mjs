#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const electron = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(electron, '..', '..');
const stage = resolve(electron, 'stage');
rmSync(stage, { recursive: true, force: true });
const result = spawnSync('pnpm', ['--filter', 'cx-viewer', 'deploy', '--legacy', '--prod', stage], {
  cwd: repo, stdio: 'inherit', shell: process.platform === 'win32',
});
if (result.status !== 0) process.exit(result.status || 1);
// Legacy deploy leaves a workspace development back-link to the app itself.
// Node resolves app self-references through its manifest; omit the escaping link.
const selfLink = join(stage, 'node_modules', '.pnpm', 'node_modules', 'cx-viewer');
if (lstatSync(selfLink, { throwIfNoEntry: false })?.isSymbolicLink()) unlinkSync(selfLink);

// Legacy deploy leaves this private workspace dependency linked to the checkout.
// Vendor the same package.json + src payload npm bundledDependencies carries.
// Only the disposable stage is replaced; development dependency links stay put.
const coreSource = join(repo, 'packages', 'core');
const coreManifest = JSON.parse(readFileSync(join(coreSource, 'package.json'), 'utf8'));
if (coreManifest.name !== '@cxv/core' || coreManifest.private !== true) throw new Error('Private core workspace is missing');
const coreStage = join(stage, 'node_modules', '@cxv', 'core');
if (lstatSync(coreStage, { throwIfNoEntry: false })?.isSymbolicLink()) unlinkSync(coreStage);
else rmSync(coreStage, { recursive: true, force: true });
mkdirSync(coreStage, { recursive: true });
cpSync(join(coreSource, 'package.json'), join(coreStage, 'package.json'));
cpSync(join(coreSource, 'src'), join(coreStage, 'src'), { recursive: true });
const canonicalStage = realpathSync(stage);
function verifyLinks(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) {
      const target = relative(canonicalStage, realpathSync(path));
      if (target === '..' || target.startsWith(`..${sep}`) || isAbsolute(target)) throw new Error('Production runtime contains a non-portable dependency link');
    } else if (stat.isDirectory()) verifyLinks(path);
  }
}
verifyLinks(stage);

// Bundles can be read-only after signing/installation. Set the vendor helpers'
// execution mode while the staging tree is still writable, before packaging.
const require = createRequire(join(stage, 'package.json'));
const prebuilds = join(dirname(require.resolve('node-pty/package.json')), 'prebuilds');
for (const name of readdirSync(prebuilds)) {
  const helper = join(prebuilds, name, 'spawn-helper');
  if (existsSync(helper)) {
    const mode = statSync(helper).mode;
    if (!(mode & 0o111)) chmodSync(helper, mode | 0o755);
  }
}
console.log('Assembled isolated Electron production runtime');
