import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import {
  hashStorageId,
  projectArchiveDirectoryName,
  sessionArchiveDirectoryName,
} from '../lib/log-v2/identity.js';
import { inspectSessionArchive } from '../lib/log-v2/inspect.js';
import { createProjectManifest, createSessionManifest } from '../lib/log-v2/schema.js';
import { isUnsupportedDirectoryFsyncError } from '../scripts/migrate-log-v2-layout.mjs';

const SCRIPT = resolve('scripts/migrate-log-v2-layout.mjs');

test('layout migration only downgrades unsupported directory fsync errors on Windows', () => {
  assert.equal(isUnsupportedDirectoryFsyncError({ code: 'EPERM' }, 'win32'), true);
  assert.equal(isUnsupportedDirectoryFsyncError({ code: 'EINVAL' }, 'win32'), true);
  assert.equal(isUnsupportedDirectoryFsyncError({ code: 'EIO' }, 'win32'), false);
  assert.equal(isUnsupportedDirectoryFsyncError({ code: 'EPERM' }, 'linux'), false);
});

function fixture({ corruptTimeline = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-layout-migration-'));
  const projectId = '/workspace/迁移-test';
  const canonicalCwd = projectId;
  const sessionId = 'session/migrate:one';
  const createdAt = '2026-07-15T08:09:10.000Z';
  const oldProjectName = hashStorageId(`${projectId}\u0000${canonicalCwd}`, 'p_');
  const oldSessionName = `${hashStorageId(sessionId, 's_')}.cxvsession`;
  const oldProjectDir = join(root, 'v2', 'projects', oldProjectName);
  const oldSessionDir = join(oldProjectDir, 'sessions', '2026', '07', '15', oldSessionName);
  mkdirSync(oldSessionDir, { recursive: true });
  const project = createProjectManifest({ projectId, canonicalCwd, createdAt });
  const session = createSessionManifest({
    projectId,
    sessionId,
    sessionSeq: 1,
    createdAt,
    startReason: 'startup',
    source: 'app-server',
    state: 'inactive',
  });
  writeFileSync(join(oldProjectDir, 'project.json'), `${JSON.stringify(project)}\n`);
  writeFileSync(join(oldSessionDir, 'manifest.json'), `${JSON.stringify(session)}\n`);
  writeFileSync(join(oldSessionDir, 'timeline.jsonl'), corruptTimeline ? '{broken\n' : '');
  mkdirSync(join(oldSessionDir, 'threads'));
  mkdirSync(join(oldSessionDir, 'objects'));
  return {
    root,
    projectId,
    sessionId,
    createdAt,
    oldProjectDir,
    oldSessionDir,
    targetProjectDir: join(root, projectArchiveDirectoryName(projectId)),
    targetSessionName: sessionArchiveDirectoryName({ sessionId, createdAt }),
  };
}

function cleanup(value) {
  rmSync(value.root, { recursive: true, force: true });
}

function treeSnapshot(root, current = root) {
  const result = [];
  for (const name of readdirSync(current).sort()) {
    const path = join(current, name);
    const rel = path.slice(root.length + 1);
    const stat = lstatSync(path);
    if (stat.isDirectory()) {
      result.push(`d:${rel}`);
      result.push(...treeSnapshot(root, path));
    } else result.push(`f:${rel}:${stat.mode & 0o777}:${readFileSync(path).toString('hex')}`);
  }
  return result;
}

function run(root, ...args) {
  return execFileSync(process.execPath, [SCRIPT, '--root', root, ...args], { encoding: 'utf8' });
}

function writeTargetSession(value, {
  sessionId = 'target-session',
  sessionSeq = 100,
  createdAt = '2026-07-16T08:09:10.000Z',
} = {}) {
  const name = sessionArchiveDirectoryName({ sessionId, createdAt });
  const dir = join(value.targetProjectDir, name);
  mkdirSync(join(dir, 'threads'), { recursive: true });
  mkdirSync(join(dir, 'objects'));
  const manifest = createSessionManifest({
    projectId: value.projectId,
    sessionId,
    sessionSeq,
    createdAt,
    startReason: 'startup',
    source: 'app-server',
    state: 'inactive',
  });
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest)}\n`);
  writeFileSync(join(dir, 'timeline.jsonl'), '');
  return { dir, manifest };
}

test('layout migration defaults to a zero-write dry run', () => {
  const value = fixture();
  try {
    const before = treeSnapshot(value.root);
    const output = JSON.parse(run(value.root));
    assert.equal(output.mode, 'dry-run');
    assert.equal(output.projects, 1);
    assert.equal(output.sessions, 1);
    assert.deepEqual(treeSnapshot(value.root), before);
  } finally { cleanup(value); }
});

test('layout migration applies beside V1 files, verifies the archive, and retains the old backup', () => {
  const value = fixture();
  try {
    mkdirSync(value.targetProjectDir);
    writeFileSync(join(value.targetProjectDir, 'legacy-session.jsonl'), '{"legacy":true}\n');

    const output = JSON.parse(run(value.root, '--apply', '--confirm-stopped'));
    assert.equal(output.phase, 'complete');
    const targetSession = join(value.targetProjectDir, value.targetSessionName);
    assert.equal(readFileSync(join(value.targetProjectDir, 'legacy-session.jsonl'), 'utf8'), '{"legacy":true}\n');
    assert.equal(inspectSessionArchive(targetSession).ok, true);
    assert.equal(JSON.parse(readFileSync(join(value.targetProjectDir, 'project.json'), 'utf8')).projectId, value.projectId);
    assert.equal(readdirSync(join(value.root, 'v2')).some(name => name.startsWith('projects.layout-v1-backup-')), true);
    assert.equal(statSync(join(value.root, '.log-v2-layout-migration.receipt.json')).mode & 0o777, 0o600);
    assert.equal(readdirSync(value.root).includes('.log-v2-layout-migration.active'), false);

    const rerun = JSON.parse(run(value.root, '--apply', '--confirm-stopped'));
    assert.equal(rerun.phase, 'complete');
  } finally { cleanup(value); }
});

test('layout migration refuses apply without explicit stopped-process confirmation', () => {
  const value = fixture();
  try {
    const before = treeSnapshot(value.root);
    const result = spawnSync(process.execPath, [SCRIPT, '--root', value.root, '--apply'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /requires --confirm-stopped/);
    assert.deepEqual(treeSnapshot(value.root), before);
  } finally { cleanup(value); }
});

test('layout migration refuses a lock owned by a live writer process', () => {
  const value = fixture();
  try {
    writeFileSync(join(value.oldProjectDir, '.project.lock'), JSON.stringify({
      pid: process.pid,
      createdAt: new Date().toISOString(),
    }));
    const result = spawnSync(process.execPath, [SCRIPT, '--root', value.root, '--apply', '--confirm-stopped'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owned by live pid/);
    assert.equal(readdirSync(value.root).includes('.log-v2-layout-migration.receipt.json'), false);
  } finally { cleanup(value); }
});

test('layout migration refuses a live append lock in an existing shallow target session', () => {
  const value = fixture();
  try {
    mkdirSync(value.targetProjectDir);
    const target = writeTargetSession(value);
    const targetProject = createProjectManifest({
      projectId: value.projectId,
      canonicalCwd: value.projectId,
      createdAt: target.manifest.createdAt,
      nextSessionSeq: target.manifest.sessionSeq + 1,
      latestSessionId: target.manifest.sessionId,
    });
    writeFileSync(join(value.targetProjectDir, 'project.json'), `${JSON.stringify(targetProject)}\n`);
    writeFileSync(join(target.dir, '.append.lock'), JSON.stringify({
      pid: process.pid,
      createdAt: new Date().toISOString(),
    }));
    const result = spawnSync(process.execPath, [SCRIPT, '--root', value.root, '--apply', '--confirm-stopped'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owned by live pid/);
    assert.equal(existsSync(join(value.root, '.log-v2-layout-migration.receipt.json')), false);
  } finally { cleanup(value); }
});

test('layout migration rejects a structurally invalid target session before writing migration state', () => {
  const value = fixture();
  try {
    const conflict = join(value.targetProjectDir, value.targetSessionName);
    mkdirSync(conflict, { recursive: true });
    writeFileSync(join(conflict, 'foreign.txt'), 'do not replace');
    const result = spawnSync(process.execPath, [SCRIPT, '--root', value.root, '--apply', '--confirm-stopped'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /target session manifest is missing/);
    assert.equal(readFileSync(join(conflict, 'foreign.txt'), 'utf8'), 'do not replace');
    assert.equal(readdirSync(value.root).includes('.log-v2-layout-migration.receipt.json'), false);
  } finally { cleanup(value); }
});

test('layout migration rejects a corrupt source archive without writing migration state', () => {
  const value = fixture({ corruptTimeline: true });
  try {
    const result = spawnSync(process.execPath, [SCRIPT, '--root', value.root, '--apply', '--confirm-stopped'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /session archive is corrupt/);
    assert.equal(readdirSync(value.root).includes('.log-v2-layout-migration.receipt.json'), false);
  } finally { cleanup(value); }
});

test('layout migration reports and retains missing-manifest sessions in the backup quarantine', () => {
  const value = fixture();
  try {
    unlinkSync(join(value.oldSessionDir, 'manifest.json'));
    const before = treeSnapshot(value.root);
    const dryRun = JSON.parse(run(value.root));
    assert.equal(dryRun.quarantined, 1);
    assert.match(dryRun.quarantine[0].sourceRel, /\.cxvsession$/);
    assert.deepEqual(treeSnapshot(value.root), before);

    const output = JSON.parse(run(value.root, '--apply', '--confirm-stopped'));
    assert.equal(output.phase, 'complete');
    assert.equal(output.quarantined, 1);
    assert.equal(output.quarantine.length, 1);
    assert.match(output.quarantine[0].backupRel, /^v2\/projects\.layout-v1-backup-/);
    assert.equal(existsSync(join(value.root, output.quarantine[0].backupRel)), true);
    assert.equal(existsSync(join(value.targetProjectDir, value.targetSessionName)), false);
  } finally { cleanup(value); }
});

test('layout migration deduplicates an identical session already written in the shallow layout', () => {
  const value = fixture();
  try {
    mkdirSync(value.targetProjectDir);
    cpSync(join(value.oldProjectDir, 'project.json'), join(value.targetProjectDir, 'project.json'));
    cpSync(value.oldSessionDir, join(value.targetProjectDir, value.targetSessionName), { recursive: true });

    const dryRun = JSON.parse(run(value.root));
    assert.equal(dryRun.deduplicated, 1);
    assert.equal(dryRun.sourceBytes, 0);
    const output = JSON.parse(run(value.root, '--apply', '--confirm-stopped'));
    assert.equal(output.deduplicated, 1);
    assert.equal(inspectSessionArchive(join(value.targetProjectDir, value.targetSessionName)).ok, true);
  } finally { cleanup(value); }
});

test('layout migration rejects a divergent same-identity target before writing migration state', () => {
  const value = fixture();
  try {
    mkdirSync(value.targetProjectDir);
    cpSync(join(value.oldProjectDir, 'project.json'), join(value.targetProjectDir, 'project.json'));
    const target = join(value.targetProjectDir, value.targetSessionName);
    cpSync(value.oldSessionDir, target, { recursive: true });
    writeFileSync(join(target, 'different.txt'), 'different');

    const result = spawnSync(process.execPath, [SCRIPT, '--root', value.root, '--apply', '--confirm-stopped'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /target session diverges/);
    assert.equal(existsSync(join(value.root, '.log-v2-layout-migration.receipt.json')), false);
    assert.equal(existsSync(join(value.root, '.log-v2-layout-migration.staging')), false);
  } finally { cleanup(value); }
});

test('layout migration rebuilds project sequence metadata across mixed old and shallow sessions', () => {
  const value = fixture();
  try {
    mkdirSync(value.targetProjectDir);
    const target = writeTargetSession(value);
    const targetProject = createProjectManifest({
      projectId: value.projectId,
      canonicalCwd: value.projectId,
      createdAt: '2026-07-16T08:00:00.000Z',
      nextSessionSeq: 2,
      latestSessionId: target.manifest.sessionId,
    });
    writeFileSync(join(value.targetProjectDir, 'project.json'), `${JSON.stringify(targetProject)}\n`);

    const output = JSON.parse(run(value.root, '--apply', '--confirm-stopped'));
    assert.equal(output.phase, 'complete');
    const merged = JSON.parse(readFileSync(join(value.targetProjectDir, 'project.json'), 'utf8'));
    assert.equal(merged.nextSessionSeq, 101);
    assert.equal(merged.latestSessionId, target.manifest.sessionId);
    assert.equal(existsSync(join(value.targetProjectDir, value.targetSessionName)), true);
    assert.equal(existsSync(target.dir), true);
    const receipt = JSON.parse(readFileSync(join(value.root, '.log-v2-layout-migration.receipt.json'), 'utf8'));
    assert.equal(receipt.version, 2);
    assert.equal(JSON.stringify(receipt).includes('\\\\'), false);
  } finally { cleanup(value); }
});

test('layout migration rejects a target project identity collision during preflight', () => {
  const value = fixture();
  try {
    mkdirSync(value.targetProjectDir);
    const conflict = createProjectManifest({
      projectId: value.projectId,
      canonicalCwd: '/different/workspace',
      createdAt: value.createdAt,
    });
    writeFileSync(join(value.targetProjectDir, 'project.json'), `${JSON.stringify(conflict)}\n`);
    const result = spawnSync(process.execPath, [SCRIPT, '--root', value.root, '--apply', '--confirm-stopped'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /target project manifest identity conflict/);
    assert.equal(existsSync(join(value.root, '.log-v2-layout-migration.receipt.json')), false);
  } finally { cleanup(value); }
});
