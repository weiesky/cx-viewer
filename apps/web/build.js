#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 执行 vite build，输出到 dist/
console.log('🔨 正在执行 Vite 构建...');
const require = createRequire(import.meta.url);
const vite = join(dirname(require.resolve('vite/package.json')), 'bin', 'vite.js');
execFileSync(process.execPath, [vite, 'build'], { cwd: __dirname, stdio: 'inherit' });

console.log('✅ Build 完成，输出目录: dist/');
console.log('   - dist/index.html');
console.log('   - dist/assets/');
