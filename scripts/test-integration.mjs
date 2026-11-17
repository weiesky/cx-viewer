import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tests = join(root, 'tests');
const files = readdirSync(tests).filter(name => name.endsWith('.test.js')).sort().map(name => join(tests, name));
const result = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
process.exit(result.status ?? 1);
