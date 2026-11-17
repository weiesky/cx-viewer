#!/usr/bin/env node
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(app, '..', '..');
const web = join(repo, 'apps', 'web');
const dist = join(web, 'dist');
function newest(path) {
  const stat = statSync(path);
  return stat.isDirectory() ? Math.max(stat.mtimeMs, ...readdirSync(path).map(name => newest(join(path, name)))) : stat.mtimeMs;
}
if (!existsSync(join(dist, 'index.html'))) throw new Error('Build @cxv/web before assembling the published package');
const inputs = [join(web, 'src'), join(web, 'public'), join(web, 'index.html'), join(web, 'vite.config.js'), ...['src', 'lib', 'server'].map(name => join(app, name))];
if (statSync(join(dist, 'index.html')).mtimeMs < Math.max(...inputs.map(newest))) throw new Error('Web build is older than its source inputs; rebuild before packing');
const pkg = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
for (const section of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
  for (const value of Object.values(pkg[section] || {})) {
    if (/^(workspace|catalog):/.test(value)) throw new Error('Published dependencies must use npm-compatible versions');
  }
}
for (const [source, destination] of [[dist, 'dist'], [join(web, 'public'), 'public'], [join(repo, 'apps', 'electron', 'electron'), 'electron'], [join(repo, 'docs'), 'docs']]) {
  rmSync(join(app, destination), { recursive: true, force: true });
  cpSync(source, join(app, destination), { recursive: true });
}
for (const name of ['README.md', 'LICENSE.md']) cpSync(join(repo, name), join(app, name));
console.log('Assembled web assets, Electron runtime and package documents');
