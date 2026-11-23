#!/usr/bin/env node
/**
 * Frozen 74cd752d AST boundary gate, adapted to native package paths.
 * CORE: packages/core/src, pure shared modules; imports only CORE (R8).
 * L0: findcx.js, i18n.js, server/_paths.js. Curated leaves below obey R0 closure.
 * L1: native lib/** and server/lib/**; im + adapters share a subsystem,
 *     ask/proxy/log-v2 are separate extraction units (R3).
 * L2: actual root interceptor/proxy/PTY/scratch/registry modules.
 * L3: server/routes/**. L4: server.js and cli.js. WEB: apps/web/src/**.
 * R1 static cycles, R2 library -> routes/entry, R4 L0 escapes, R6 web -> app
 * (or relative package bypass), R7 unresolved/undeclared imports, R8 core escapes,
 * and unclassified source (CLS) are hard failures. R0 checks leaf closures.
 * Only exact R3/R5/R1-dyn edges may have reasoned exceptions. Unused exceptions
 * fail as STALE; --write drops stale entries and never adds exceptions.
 * Generated app electron/docs/assets and package tests are excluded, as are
 * scripts. Source Electron remains a separate build unit, outside this gate.
 * See docs/refactor/package-boundaries.zh.md.
 */
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, relative, resolve as pathResolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { builtinModules } from 'node:module';
import * as acorn from 'acorn';
import jsx from 'acorn-jsx';

const REPO_ROOT = pathResolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP_PKG = 'packages/app';
const WEB_SRC = 'apps/web/src';
const CORE_PKG = 'packages/core';
const CORE_SRC = `${CORE_PKG}/src`;
const CORE_SPEC = '@cxv/core';
const ALLOWLIST_PATH = join(REPO_ROOT, 'scripts', 'boundary-allowlist.json');

// Native test dirs and assembled payloads are not layered application source.
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'scripts', 'test', 'tests', 'public', 'docs', 'electron', 'concepts', 'ultraAgents', 'plugins', 'imPreset', 'imSkills', 'system-prompt-templates']);

// Curated native leaves: their entire graph closure stays below L1.
const L0_LEAVES = new Set(['packages/app/lib/interceptor-core.js', 'packages/app/lib/cxv-processes.js', 'packages/app/server/lib/error-report.js']);

const SUBSYSTEM_DIRS = ['log-v2', 'ask', 'im', 'adapters', 'proxy'];
// adapters/ is the im subsystem's plugin directory (registerAdapter seam) — the
// future extraction unit is "im + adapters" as ONE package, so they share a group.
const SUBSYSTEM_GROUP = { adapters: 'im', 'log-v2': 'v2' };
const L2_FILES = ['interceptor', 'proxy', 'pty-manager', 'scratch-pty-manager', 'workspace-registry']
  .map(n => `${APP_PKG}/${n}.js`);
const L0_FILES = [
  `${APP_PKG}/findcx.js`,
  `${APP_PKG}/server/_paths.js`,
  `${APP_PKG}/i18n.js`,
];
const L4_FILES = [
  `${APP_PKG}/cli.js`,
  `${APP_PKG}/server.js`,        // actual native entry
];

const BUILTINS = new Set([...builtinModules, ...builtinModules.map(m => `node:${m}`)]);

/** Classify a repo-relative path. Returns {cls, sub?} or null when out of scope. */
export function classify(rel) {
  if (rel.startsWith(`${WEB_SRC}/`)) return { cls: 'WEB' };
  if (rel.startsWith(`${CORE_SRC}/`)) return { cls: 'CORE' };
  if (!rel.startsWith(`${APP_PKG}/`)) return null;
  if (L0_FILES.includes(rel)) return { cls: 'L0' };
  if (L0_LEAVES.has(rel)) return { cls: 'L0-leaf' };
  if (L4_FILES.includes(rel)) return { cls: 'L4' };
  if (L2_FILES.includes(rel)) return { cls: 'L2' };
  if (rel.startsWith(`${APP_PKG}/server/routes/`)) return { cls: 'L3' };
  const libPrefix = [`${APP_PKG}/lib/`, `${APP_PKG}/server/lib/`].find(p => rel.startsWith(p));
  if (libPrefix) {
    const rest = rel.slice(libPrefix.length);
    const first = rest.split('/')[0];
    if (rest.includes('/') && SUBSYSTEM_DIRS.includes(first)) return { cls: 'L1-sub', sub: SUBSYSTEM_GROUP[first] ?? first };
    return { cls: 'L1-lib' };
  }
  if (rel.startsWith(`${APP_PKG}/src/utils/`)) return { cls: 'L1-lib' };
  if (rel === `${APP_PKG}/server/raw-sidecar-worker.js`) return { cls: 'L1-lib' };
  return { cls: null }; // fail-closed: scanned but unclassified
}

/** Recursively walk JS source files under rootDir (relative to baseDir). */
function walkFiles(rootRel, baseDir, out = []) {
  const abs = join(baseDir, rootRel);
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walkFiles(`${rootRel}/${entry.name}`, baseDir, out);
    } else if (/\.(m?js|jsx)$/.test(entry.name)) {
      out.push(`${rootRel}/${entry.name}`);
    }
  }
  return out;
}

const Parser = acorn.Parser.extend(jsx());

/** Extract import edges from one file. Edge: {to spec, dynamic, line}. */
export function extractEdges(source, filename) {
  const ast = Parser.parse(source, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
  const edges = [];
  // AST is a tree — plain recursion visits each node exactly once (no seen-set;
  // a position-keyed set would falsely dedupe chained CallExpressions that
  // share the same start offset).
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'ImportDeclaration' && node.source?.value) {
      edges.push({ spec: node.source.value, dynamic: false, line: node.loc?.start?.line ?? 0 });
    } else if ((node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') && node.source?.value) {
      edges.push({ spec: node.source.value, dynamic: false, line: node.loc?.start?.line ?? 0 });
    } else if (node.type === 'ImportExpression') {
      const s = node.source;
      if (s?.type === 'Literal' && typeof s.value === 'string') {
        edges.push({ spec: s.value, dynamic: true, line: node.loc?.start?.line ?? 0 });
      } else if (s?.type === 'TemplateLiteral' && s.expressions.length === 0) {
        edges.push({ spec: s.quasis[0].value.cooked, dynamic: true, line: node.loc?.start?.line ?? 0 });
      } else if (s?.type === 'TemplateLiteral' && s.quasis[0]?.value?.cooked?.startsWith('.')) {
        edges.push({ spec: null, dynamic: true, computed: true, line: node.loc?.start?.line ?? 0 });
      }
      // call-expression specifiers (e.g. import(pathToFileURL(...))) are not
      // statically relative — out of scope by design.
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) for (const v of value) visit(v);
      else if (value && typeof value === 'object' && value.type) visit(value);
    }
  };
  visit(ast);
  return edges;
}

const EXTS = ['', '.js', '.mjs', '.jsx', '/index.js', '/index.mjs'];

/** Resolve a relative specifier to a rootDir-relative path, or null. */
export function resolveSpecifier(fromRel, spec, baseDir = REPO_ROOT) {
  // strip bundler query suffixes (Vite `?raw`, `?url`, …) before fs resolution
  const clean = spec.split('?')[0];
  const base = pathResolve(join(baseDir, dirname(fromRel)), clean);
  for (const ext of EXTS) {
    const candidate = base + ext;
    try {
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        return relative(baseDir, candidate).split('\\').join('/');
      }
    } catch { /* keep probing */ }
  }
  return null;
}

/** Load the dependency names a file's owning package may import (read live). */
function packageDeps(rel, baseDir) {
  const pkgPath = rel.startsWith(`${APP_PKG}/`) ? join(baseDir, APP_PKG, 'package.json')
    : rel.startsWith('apps/web/') ? join(baseDir, 'apps/web/package.json')
    : rel.startsWith(`${CORE_PKG}/`) ? join(baseDir, CORE_PKG, 'package.json')
    : join(baseDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  return new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);
}

/** Strongly-connected components (Tarjan) over the given edge list. */
export function scc(nodes, edges) {
  const index = new Map(), low = new Map(), onStack = new Set(), stack = [], out = [];
  let counter = 0;
  const adj = new Map(nodes.map(n => [n, []]));
  for (const [a, b] of edges) if (adj.has(a) && adj.has(b)) adj.get(a).push(b);
  const strongconnect = (v) => {
    index.set(v, counter); low.set(v, counter); counter++;
    stack.push(v); onStack.add(v);
    for (const w of adj.get(v)) {
      if (!index.has(w)) { strongconnect(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (onStack.has(w)) low.set(v, Math.min(low.get(v), index.get(w)));
    }
    if (low.get(v) === index.get(v)) {
      const group = [];
      let w;
      do { w = stack.pop(); onStack.delete(w); group.push(w); } while (w !== v);
      out.push(group);
    }
  };
  for (const v of nodes) if (!index.has(v)) strongconnect(v);
  return out;
}

/**
 * Run the full gate. Returns { violations, stale, edges, files } where each
 * violation is {rule, from, to, line, dynamic, detail, allowlisted}.
 */
export function analyze({ roots = [APP_PKG, WEB_SRC, CORE_SRC], allowlist = [], rootDir = REPO_ROOT, leaves = L0_LEAVES } = {}) {
  const files = roots.flatMap(r => walkFiles(r, rootDir));
  const fileSet = new Set(files);
  const allowed = new Map(); // `${rule}|${from}|${to}` → entry
  for (const entry of allowlist) allowed.set(`${entry.rule}|${entry.from}|${entry.to}`, entry);

  const edges = []; // {from, to, dynamic, line} — to is rootDir-relative or null (external)
  const violations = [];
  const usedAllowlist = new Set();

  const depsCache = new Map();
  const depsOf = (rel) => {
    const key = rel.startsWith(`${APP_PKG}/`) ? APP_PKG : rel.startsWith('apps/web/') ? 'web' : rel.startsWith(`${CORE_PKG}/`) ? 'core' : 'root';
    if (!depsCache.has(key)) depsCache.set(key, packageDeps(rel, rootDir));
    return depsCache.get(key);
  };

  for (const from of files) {
    const source = readFileSync(join(rootDir, from), 'utf8');
    let extracted;
    try {
      extracted = extractEdges(source, from);
    } catch (err) {
      violations.push({ rule: 'R7', from, to: null, line: 0, dynamic: false, detail: `parse failure: ${err.message}` });
      continue;
    }
    for (const edge of extracted) {
      if (edge.computed) {
        violations.push({ rule: 'R7', from, to: null, line: edge.line, dynamic: true, detail: 'relative dynamic import must use a literal specifier' });
        continue;
      }
      const { spec } = edge;
      if (spec.startsWith('.')) {
        const to = resolveSpecifier(from, spec, rootDir);
        if (!to) {
          violations.push({ rule: 'R7', from, to: spec, line: edge.line, dynamic: edge.dynamic, detail: 'unresolved relative import' });
          continue;
        }
        const fromClass = classify(from)?.cls;
        if (fromClass === 'WEB' && to.startsWith('packages/') && !to.startsWith(`${APP_PKG}/`)) {
          violations.push({ rule: 'R6', from, to, line: edge.line, dynamic: edge.dynamic, detail: 'web must use the core package export rather than a relative package import' });
          continue;
        }
        if (fromClass === 'CORE' && !fileSet.has(to) && !to.startsWith(`${CORE_SRC}/`)) {
          violations.push({ rule: 'R8', from, to, line: edge.line, dynamic: edge.dynamic, detail: 'CORE import escapes the core source tree' });
          continue;
        }
        if (fileSet.has(to)) {
          edges.push({ from, to, dynamic: edge.dynamic, line: edge.line });
        } else if (to.startsWith(`${APP_PKG}/`) && /\.(m?js|jsx)$/.test(to)) {
          // Resolved on disk but outside the walk (EXCLUDE_DIRS: dist/,
          // node_modules/, concepts/, …) — silently dropping it would let
          // e.g. web → packages/app/dist/x.js bypass R6 entirely. Fail loudly.
          // Scoped to packages/app so web asset imports (apps/web/dist etc.)
          // stay untouched. R6 attribution when the importer is WEB.
          const fromCls = classify(from)?.cls;
          violations.push({
            rule: fromCls === 'WEB' ? 'R6' : 'R7', from, to, line: edge.line, dynamic: edge.dynamic,
            detail: 'resolves into an excluded (unscanned) packages/app directory — boundary rules cannot see this edge, so it is forbidden outright',
          });
        }
        // resolved but out of scanned scope outside packages/app (asset dirs
        // of other packages etc.) — not an edge
      } else {
        if (classify(from)?.cls === 'CORE' && !spec.startsWith(`${CORE_SPEC}/`)) {
          violations.push({ rule: 'R8', from, to: spec, line: edge.line, dynamic: edge.dynamic, detail: 'CORE must not import Node builtins or external packages' });
          continue;
        }
        const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
        if (!BUILTINS.has(spec) && !BUILTINS.has(name) && !depsOf(from).has(name) && !depsOf(from).has(spec)) {
          violations.push({ rule: 'R7', from, to: spec, line: edge.line, dynamic: edge.dynamic, detail: 'bare specifier is neither a node builtin nor a declared dependency' });
          continue;
        }
        // @cxv/core/<name> maps to packages/core/src/<name>.js (the package's
        // exports pattern "./*" → "./src/*.js"). Resolve it into a graph edge so
        // layering rules (R4/R6/R8/R0 closure) see the real target; a subpath
        // with no backing file is a hard R7 failure (fail-closed).
        if (name === CORE_SPEC && !BUILTINS.has(spec)) {
          // strip bundler query suffixes (Vite `?raw`/`?url`) like the relative branch does
          const sub = spec.split('?')[0].slice(CORE_SPEC.length).replace(/^\//, '');
          if (!sub) {
            violations.push({ rule: 'R7', from, to: spec, line: edge.line, dynamic: edge.dynamic, detail: '@cxv/core has no root export — import a subpath (@cxv/core/<module>)' });
            continue;
          }
          const target = `${CORE_SRC}/${sub}.js`;
          if (!fileSet.has(target)) {
            violations.push({ rule: 'R7', from, to: spec, line: edge.line, dynamic: edge.dynamic, detail: `@cxv/core subpath does not map to a scanned file (${target})` });
            continue;
          }
          edges.push({ from, to: target, dynamic: edge.dynamic, line: edge.line });
        }
      }
    }
  }

  const clsOf = (rel) => classify(rel) ?? { cls: null };
  // Only these rules are exemptable via the allowlist; hard rules (R0/R2/R4/R6/R7)
  // ignore any entry, keeping the documented "non-exemptable" promise real.
  const EXEMPTABLE = new Set(['R1-dyn', 'R3', 'R5']);
  const pushViolation = (rule, edge, detail) => {
    const key = `${rule}|${edge.from}|${edge.to}`;
    if (EXEMPTABLE.has(rule) && allowed.has(key)) { usedAllowlist.add(key); return; }
    violations.push({ rule, from: edge.from, to: edge.to, line: edge.line, dynamic: edge.dynamic, detail });
  };

  // Fail-closed classification
  for (const f of files) {
    if (clsOf(f).cls === null) {
      violations.push({ rule: 'CLS', from: f, to: null, line: 0, dynamic: false, detail: 'scanned file has no boundary class — classify it in scripts/verify-boundaries.mjs' });
    }
  }

  // R2 (hard): lib/L0 → server.js / routes / cli
  // R3: cross-subsystem (allowlistable)
  // R4 (hard): L0 → only L0 / L0-leaf / CORE
  // R5: L1 → L2+ (allowlistable for L2; L3/L4 also caught by R2)
  // R6 (hard): WEB → packages/app forbidden entirely; WEB → CORE allowed
  // R8 (hard): CORE → only CORE
  for (const edge of edges) {
    const from = clsOf(edge.from), to = clsOf(edge.to);
    if (!from.cls || !to.cls) continue;
    if (from.cls === 'WEB') {
      if (to.cls !== 'WEB' && to.cls !== 'CORE') {
        pushViolation('R6', edge, 'apps/web must not import packages/app — shared isomorphic modules live in @cxv/core (packages/core/src)');
      }
      continue;
    }
    if (from.cls === 'CORE') {
      if (to.cls !== 'CORE') {
        pushViolation('R8', edge, `CORE is the shared isomorphic base layer — it may only import CORE (got ${to.cls})`);
      }
      continue;
    }
    if (from.cls === 'L0') {
      if (to.cls !== 'L0' && to.cls !== 'L0-leaf' && to.cls !== 'CORE') {
        pushViolation('R4', edge, `L0 may only import L0 / L0-leaf / CORE (got ${to.cls})`);
      }
      continue;
    }
    // L0-leaf outbound violations are reported by the R0 closure check below (not R4)
    if (from.cls === 'L0-leaf') continue;
    if (from.cls === 'L1-lib' || from.cls === 'L1-sub') {
      if (to.cls === 'L3' || to.cls === 'L4') {
        pushViolation('R2', edge, `lib must not import ${to.cls === 'L3' ? 'routes' : 'server.js/cli.js'}`);
      } else if (to.cls === 'L2') {
        pushViolation('R5', edge, 'lib must not import stateful server modules (L2)');
      } else if (from.cls === 'L1-sub' && to.cls === 'L1-sub' && from.sub !== to.sub) {
        pushViolation('R3', edge, `cross-subsystem edge ${from.sub} → ${to.sub}`);
      }
    }
  }

  // L0-leaf closure invariant: BFS from each leaf; every reached file must stay
  // within L0 / L0-leaf / CORE (CORE is below L0 in the layering — always safe)
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e);
  }
  for (const leaf of leaves) {
    if (!fileSet.has(leaf)) {
      violations.push({ rule: 'R0', from: leaf, to: null, line: 0, dynamic: false, detail: 'L0_LEAVES entry does not exist on disk' });
      continue;
    }
    const queue = [leaf], seen = new Set([leaf]);
    while (queue.length) {
      const cur = queue.shift();
      for (const e of adj.get(cur) ?? []) {
        const cls = clsOf(e.to).cls;
        if (cls !== 'L0' && cls !== 'L0-leaf' && cls !== 'CORE') {
          violations.push({ rule: 'R0', from: cur, to: e.to, line: e.line, dynamic: e.dynamic, detail: `L0-leaf closure escape: ${leaf} reaches ${e.to} (${cls})` });
        }
        if (!seen.has(e.to)) { seen.add(e.to); queue.push(e.to); }
      }
    }
  }

  // R1: static cycles are hard failures; dynamic-closed cycles need R1-dyn entries
  const staticEdges = edges.filter(e => !e.dynamic).map(e => [e.from, e.to]);
  const staticSccs = scc(files, staticEdges).filter(g => g.length > 1 || staticEdges.some(([a, b]) => a === g[0] && a === b));
  for (const group of staticSccs) {
    violations.push({ rule: 'R1', from: group[0], to: null, line: 0, dynamic: false, detail: `static cycle: ${group.join(' ↔ ')}` });
  }
  // An R1-dyn entry is "used" only if its edge still closes a cycle — i.e. its
  // endpoints share a non-trivial SCC in the FULL union graph. Fixing the cycle
  // later (e.g. removing the reverse static edge) makes the entry STALE, which
  // is exactly what the ratchet exists for.
  const fullUnionSccs = scc(files, edges.map(e => [e.from, e.to])).filter(g => g.length > 1 || edges.some(e => e.from === g[0] && e.from === e.to));
  const inCycle = (from, to) => fullUnionSccs.some(g => g.includes(from) && g.includes(to));
  // reporting union graph = static + dynamic minus R1-dyn-allowlisted dynamic edges
  const unionEdges = [];
  for (const e of edges) {
    if (e.dynamic && allowed.has(`R1-dyn|${e.from}|${e.to}`) && inCycle(e.from, e.to)) {
      usedAllowlist.add(`R1-dyn|${e.from}|${e.to}`);
      continue;
    }
    unionEdges.push([e.from, e.to]);
  }
  const unionSccs = scc(files, unionEdges).filter(g => g.length > 1 || unionEdges.some(([a, b]) => a === g[0] && a === b));
  for (const group of unionSccs) {
    const dynInside = edges.filter(e => e.dynamic && group.includes(e.from) && group.includes(e.to));
    if (staticSccs.some(sg => sg.length === group.length && sg.every(n => group.includes(n)))) continue; // already reported
    violations.push({
      rule: 'R1', from: group[0], to: null, line: 0, dynamic: true,
      detail: `dynamic-closed cycle: ${group.join(' ↔ ')} (dynamic edges: ${dynInside.map(e => `${e.from} → ${e.to}`).join(', ')}) — add an R1-dyn allowlist entry with a reason, or refactor`,
    });
  }

  // Stale detection: entry unused, or its edge no longer exists
  const edgeKeys = new Set(edges.map(e => `${e.from}|${e.to}`));
  const stale = [];
  for (const entry of allowlist) {
    const key = `${entry.rule}|${entry.from}|${entry.to}`;
    if (usedAllowlist.has(key)) continue;
    stale.push({ ...entry, detail: edgeKeys.has(`${entry.from}|${entry.to}`) ? 'edge exists but no longer violates' : 'edge no longer exists' });
  }

  return { violations, stale, edges, files };
}

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return [];
  const raw = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  if (!Array.isArray(raw)) throw new Error('boundary-allowlist.json must be an array');
  for (const [i, entry] of raw.entries()) {
    if (!entry.from || !entry.to || !entry.rule || !entry.reason || !entry.since) {
      throw new Error(`boundary-allowlist.json entry #${i} missing required fields {from,to,rule,reason,since} (reason must be non-empty)`);
    }
  }
  return raw;
}

function writeAllowlist(entries) {
  const sorted = [...entries].sort((a, b) =>
    `${a.rule}|${a.from}|${a.to}`.localeCompare(`${b.rule}|${b.from}|${b.to}`));
  writeFileSync(ALLOWLIST_PATH, JSON.stringify(sorted, null, 2) + '\n');
  return sorted;
}

export function main(argv = process.argv.slice(2)) {
  const write = argv.includes('--write');
  const verbose = argv.includes('--verbose');
  const allowlist = loadAllowlist();
  const { violations, stale, files } = analyze({ allowlist });

  if (verbose) {
    const counts = {};
    for (const f of files) { const c = classify(f)?.cls ?? 'UNCLASSIFIED'; counts[c] = (counts[c] ?? 0) + 1; }
    console.log(`[verify-boundaries] scanned ${files.length} files:`, counts);
  }

  if (write) {
    const fresh = allowlist.filter(entry => !stale.some(s => s.rule === entry.rule && s.from === entry.from && s.to === entry.to));
    writeAllowlist(fresh);
    console.log(`[verify-boundaries] allowlist rewritten: ${allowlist.length} → ${fresh.length} entries (${stale.length} stale dropped)`);
  }

  let failed = false;
  if (violations.length) {
    failed = true;
    console.error(`[verify-boundaries] ${violations.length} violation(s):`);
    for (const v of violations) {
      console.error(`  ${v.rule} ${v.from}${v.line ? `:${v.line}` : ''}${v.to ? ` → ${v.to}` : ''} — ${v.detail}`);
    }
  }
  if (stale.length && !write) {
    failed = true;
    console.error(`[verify-boundaries] ${stale.length} STALE allowlist entry(s) — the violation is gone; regenerate with \`node scripts/verify-boundaries.mjs --write\`:`);
    for (const s of stale) console.error(`  STALE ${s.rule} ${s.from} → ${s.to} (${s.detail})`);
  }
  if (!failed) console.log(`[verify-boundaries] OK — ${files.length} files, ${allowlist.length} allowlist entries, 0 violations`);
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(pathResolve(process.argv[1])).href) {
  try {
    process.exit(main());
  } catch (err) {
    console.error(`[verify-boundaries] fatal: ${err.message}`);
    process.exit(1);
  }
}
