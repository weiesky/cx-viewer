// Position-sensitive package anchor; native runtime stays at packages/app (or
// node_modules/cx-viewer). Workspace assets win over stale assembled copies.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_PACKAGE = resolve(PACKAGE_ROOT, '..', 'content');
let workspaceContent = false;
try {
  const pkg = JSON.parse(readFileSync(join(CONTENT_PACKAGE, 'package.json'), 'utf8'));
  workspaceContent = pkg.name === '@cxv/content' && pkg.private === true;
} catch { /* Installed package: no private content sibling. */ }
const contentDir = (name, sentinel) => workspaceContent && existsSync(join(CONTENT_PACKAGE, name, sentinel))
  ? join(CONTENT_PACKAGE, name) : join(PACKAGE_ROOT, name);
export const CONCEPTS_DIR = contentDir('concepts', 'en');
export const ULTRA_AGENTS_DIR = contentDir('ultraAgents', 'code-expert.json');
export const IM_SKILLS_DIR = contentDir('imSkills', 'scripts');
