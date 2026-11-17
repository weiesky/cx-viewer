#!/usr/bin/env node

import crypto from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  readSync,
  realpathSync,
  renameSync,
  rmSync,
  statfsSync,
  statSync,
  unlinkSync,
  writeFileSync,
  closeSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  hashStorageId,
  projectArchiveDirectoryName,
  sessionArchiveDirectoryName,
} from '../lib/log-v2/identity.js';
import { inspectSessionArchive } from '../lib/log-v2/inspect.js';
import { scanMaterializedSessionArchive } from '../lib/log-v2/materializer.js';
import { validateProjectManifest, validateSessionManifest } from '../lib/log-v2/schema.js';

const RECEIPT_NAME = '.log-v2-layout-migration.receipt.json';
const ACTIVE_NAME = '.log-v2-layout-migration.active';
const STAGING_NAME = '.log-v2-layout-migration.staging';
const RECEIPT_KIND = 'cx-viewer.log-v2-layout-migration';
const RECEIPT_VERSION = 2;
const PROJECT_HASH = /^p_[a-f0-9]{64}$/;
const SESSION_HASH = /^s_[a-f0-9]{64}\.cxvsession$/;
const DATE_PARTS = [/^\d{4}$/, /^(?:0[1-9]|1[0-2])$/, /^(?:0[1-9]|[12]\d|3[01])$/];

function fail(message) {
  const error = new Error(message);
  error.code = 'CXV_LOG_V2_LAYOUT_MIGRATION';
  throw error;
}

function parseArgs(argv) {
  let root = null;
  let apply = false;
  let confirmStopped = false;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--root') {
      root = argv[++index];
      if (!root) fail('--root requires a directory');
    } else if (arg === '--apply') apply = true;
    else if (arg === '--confirm-stopped') confirmStopped = true;
    else if (arg === '--help' || arg === '-h') return { help: true };
    else fail(`unknown argument: ${arg}`);
  }
  if (!root) fail('--root is required');
  if (apply && !confirmStopped) fail('--apply requires --confirm-stopped');
  if (confirmStopped && !apply) fail('--confirm-stopped is only valid with --apply');
  return { root, apply, confirmStopped, help: false };
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function assertDirectory(path, label) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) fail(`${label} must not be a symbolic link: ${path}`);
  if (!stat.isDirectory()) fail(`${label} must be a directory: ${path}`);
}

function assertRegularFile(path, label) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) fail(`${label} must not be a symbolic link: ${path}`);
  if (!stat.isFile()) fail(`${label} must be a regular file: ${path}`);
}

function receiptPath(...parts) {
  return parts.filter(Boolean).join('/');
}

function relativeReceiptPath(root, path) {
  return relative(root, path).split(sep).join('/');
}

export function isUnsupportedDirectoryFsyncError(error, platform = process.platform) {
  return platform === 'win32'
    && ['EACCES', 'EPERM', 'EISDIR', 'EINVAL', 'ENOTSUP'].includes(error?.code);
}

function fsyncPath(path) {
  const directory = lstatSync(path).isDirectory();
  let fd = null;
  try {
    fd = openSync(path, 'r');
    fsyncSync(fd);
  } catch (error) {
    if (!directory || !isUnsupportedDirectoryFsyncError(error)) throw error;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

function durableRename(source, target) {
  const sourceParent = dirname(source);
  const targetParent = dirname(target);
  renameSync(source, target);
  fsyncPath(targetParent);
  if (sourceParent !== targetParent) fsyncPath(sourceParent);
}

function durableUnlink(path) {
  const parent = dirname(path);
  unlinkSync(path);
  fsyncPath(parent);
}

function isTransient(name) {
  return name === '.append.lock'
    || name === '.project.lock'
    || name === '.DS_Store'
    || name === '__MACOSX'
    || name.startsWith('._')
    || name.includes('.tmp-');
}

function pidState(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return 'unknown';
  try {
    process.kill(pid, 0);
    return 'alive';
  } catch (error) {
    return error?.code === 'ESRCH' ? 'gone' : 'alive';
  }
}

function assertNoLiveLock(lockPath) {
  if (!existsSync(lockPath)) return;
  assertRegularFile(lockPath, 'V2 writer lock');
  const owner = readJson(lockPath, 'V2 writer lock');
  const state = pidState(owner.pid);
  if (state === 'alive') fail(`V2 writer lock is owned by live pid ${owner.pid}: ${lockPath}`);
  if (state === 'unknown') fail(`V2 writer lock has an unknown owner: ${lockPath}`);
}

function scanSafeTree(path, { countBytes = false } = {}) {
  let bytes = 0;
  const visit = (candidate) => {
    const stat = lstatSync(candidate);
    if (stat.isSymbolicLink()) fail(`symbolic links are not allowed: ${candidate}`);
    if (stat.isDirectory()) {
      for (const name of readdirSync(candidate).sort()) visit(join(candidate, name));
      return;
    }
    if (!stat.isFile()) fail(`special files are not allowed: ${candidate}`);
    if (countBytes && !isTransient(basename(candidate))) bytes += stat.size;
  };
  visit(path);
  return bytes;
}

function treeDigest(root) {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  const addFile = (path) => {
    const fd = openSync(path, 'r');
    try {
      for (;;) {
        const bytes = readSync(fd, buffer, 0, buffer.length, null);
        if (bytes === 0) break;
        hash.update(buffer.subarray(0, bytes));
      }
    } finally { closeSync(fd); }
  };
  const visit = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      if (isTransient(name)) continue;
      const path = join(dir, name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) fail(`symbolic links are not allowed: ${path}`);
      const rel = relative(root, path).split(sep).join('/');
      if (stat.isDirectory()) {
        hash.update(`d\0${rel}\0`);
        visit(path);
      } else if (stat.isFile()) {
        hash.update(`f\0${rel}\0${stat.size}\0`);
        addFile(path);
      } else fail(`special files are not allowed: ${path}`);
    }
  };
  visit(root);
  return `sha256:${hash.digest('hex')}`;
}

function materializedDigest(sessionDir) {
  const hash = crypto.createHash('sha256');
  let count = 0;
  scanMaterializedSessionArchive(sessionDir, (entry) => {
    hash.update(JSON.stringify(entry));
    hash.update('\n');
    count++;
  });
  return { count, digest: `sha256:${hash.digest('hex')}` };
}

function verifySession(sessionDir) {
  assertDirectory(sessionDir, 'session archive');
  const report = inspectSessionArchive(sessionDir);
  if (!report.ok) fail(`session archive is corrupt (${sessionDir}): ${report.errors.join('; ')}`);
  const materialized = materializedDigest(sessionDir);
  if (materialized.count !== report.committedEvents) {
    fail(`materialized event count mismatch in ${sessionDir}`);
  }
  return { treeDigest: treeDigest(sessionDir), materializedDigest: materialized.digest, eventCount: materialized.count };
}

function copyStableTree(source, target) {
  const stat = lstatSync(source);
  if (stat.isSymbolicLink()) fail(`symbolic links are not allowed: ${source}`);
  if (stat.isDirectory()) {
    mkdirSync(target, { mode: 0o700 });
    for (const name of readdirSync(source).sort()) {
      if (!isTransient(name)) copyStableTree(join(source, name), join(target, name));
    }
    fsyncPath(target);
    return;
  }
  if (!stat.isFile()) fail(`special files are not allowed: ${source}`);
  copyFileSync(source, target);
  fsyncPath(target);
}

function atomicJson(path, value) {
  const tmp = `${path}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  const data = `${JSON.stringify(value, null, 2)}\n`;
  let fd = null;
  try {
    fd = openSync(tmp, 'wx', 0o600);
    writeFileSync(fd, data);
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
    durableRename(tmp, path);
    chmodSync(path, 0o600);
    fsyncPath(path);
  } catch (error) {
    if (fd !== null) closeSync(fd);
    if (existsSync(tmp)) unlinkSync(tmp);
    throw error;
  }
}

function utcDateParts(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail(`invalid session createdAt: ${value}`);
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ];
}

function directDirectories(path, label) {
  if (!existsSync(path)) return [];
  assertDirectory(path, label);
  return readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const candidate = join(path, entry.name);
    const stat = lstatSync(candidate);
    if (stat.isSymbolicLink()) fail(`${label} contains a symbolic link: ${candidate}`);
    if (isTransient(entry.name)) {
      if (!stat.isFile() && !stat.isDirectory()) fail(`${label} contains a special file: ${candidate}`);
      return [];
    }
    if (!stat.isDirectory()) fail(`${label} contains an unexpected non-directory: ${candidate}`);
    return [candidate];
  });
}

function discoverPlan(root) {
  const oldProjects = join(root, 'v2', 'projects');
  if (!existsSync(oldProjects)) {
    return { oldProjects, projects: [], sessions: [], quarantined: [], sourceBytes: 0 };
  }
  assertDirectory(join(root, 'v2'), 'old v2 directory');
  assertDirectory(oldProjects, 'old projects directory');
  const projects = [];
  const sessions = [];
  const quarantined = [];
  const targetProjects = new Map();
  const targetSessionPaths = new Set();

  for (const projectDir of directDirectories(oldProjects, 'old projects directory')) {
    const oldName = basename(projectDir);
    if (!PROJECT_HASH.test(oldName)) fail(`invalid old project directory name: ${oldName}`);
    const projectManifestPath = join(projectDir, 'project.json');
    const sessionsRoot = join(projectDir, 'sessions');
    assertRegularFile(projectManifestPath, 'project.json');
    const manifest = readJson(projectManifestPath, 'project.json');
    const validation = validateProjectManifest(manifest);
    if (!validation.ok) fail(`invalid project manifest (${projectManifestPath}): ${validation.errors.join('; ')}`);
    const oldProjectIdentity = `${manifest.projectId}\u0000${manifest.canonicalCwd}`;
    if (oldName !== hashStorageId(oldProjectIdentity, 'p_')) {
      fail(`old project hash does not match projectId and canonicalCwd: ${projectDir}`);
    }
    assertNoLiveLock(join(projectDir, '.project.lock'));
    for (const name of readdirSync(projectDir)) {
      const candidate = join(projectDir, name);
      if (isTransient(name)) {
        const stat = lstatSync(candidate);
        if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory())) {
          fail(`unsafe transient entry in old project directory: ${candidate}`);
        }
      } else if (name !== 'project.json' && name !== 'sessions') {
        fail(`unexpected entry in old project directory: ${join(projectDir, name)}`);
      }
    }
    const targetProjectName = projectArchiveDirectoryName(manifest.projectId);
    const targetProjectRel = targetProjectName;
    const previousProject = targetProjects.get(targetProjectRel);
    if (previousProject) {
      fail(`multiple old projects map to ${targetProjectRel}: ${previousProject.canonicalCwd} and ${manifest.canonicalCwd}`);
    }
    targetProjects.set(targetProjectRel, manifest);
    const project = {
      sourceRel: relativeReceiptPath(root, projectDir),
      targetRel: targetProjectRel,
      manifest,
      mergedManifest: null,
      sessionIndexes: [],
    };
    projects.push(project);

    if (!existsSync(sessionsRoot)) continue;
    assertDirectory(sessionsRoot, 'old sessions directory');
    for (const yearDir of directDirectories(sessionsRoot, 'old sessions year directory')) {
      if (!DATE_PARTS[0].test(basename(yearDir))) fail(`invalid old session year directory: ${yearDir}`);
      for (const monthDir of directDirectories(yearDir, 'old sessions month directory')) {
        if (!DATE_PARTS[1].test(basename(monthDir))) fail(`invalid old session month directory: ${monthDir}`);
        for (const dayDir of directDirectories(monthDir, 'old sessions day directory')) {
          if (!DATE_PARTS[2].test(basename(dayDir))) fail(`invalid old session day directory: ${dayDir}`);
          for (const sessionDir of directDirectories(dayDir, 'old sessions day directory')) {
            const oldSessionName = basename(sessionDir);
            if (!SESSION_HASH.test(oldSessionName)) fail(`invalid old session directory name: ${sessionDir}`);
            assertNoLiveLock(join(sessionDir, '.append.lock'));
            const sessionManifestPath = join(sessionDir, 'manifest.json');
            if (!existsSync(sessionManifestPath)) {
              scanSafeTree(sessionDir);
              quarantined.push({
                sourceRel: relativeReceiptPath(root, sessionDir),
                projectIndex: projects.length - 1,
                reason: 'manifest.json is missing',
              });
              continue;
            }
            assertRegularFile(sessionManifestPath, 'session manifest');
            const sessionManifest = readJson(sessionManifestPath, 'session manifest');
            const sessionValidation = validateSessionManifest(sessionManifest);
            if (!sessionValidation.ok) fail(`invalid session manifest (${sessionDir}): ${sessionValidation.errors.join('; ')}`);
            if (sessionManifest.projectId !== manifest.projectId) fail(`session projectId mismatch: ${sessionDir}`);
            if (oldSessionName !== `${hashStorageId(sessionManifest.sessionId, 's_')}.cxvsession`) {
              fail(`old session hash does not match sessionId: ${sessionDir}`);
            }
            const actualDate = [basename(yearDir), basename(monthDir), basename(dayDir)];
            if (actualDate.join('/') !== utcDateParts(sessionManifest.createdAt).join('/')) {
              fail(`old session date path does not match createdAt: ${sessionDir}`);
            }
            scanSafeTree(sessionDir);
            const targetSessionName = sessionArchiveDirectoryName({
              sessionId: sessionManifest.sessionId,
              createdAt: sessionManifest.createdAt,
            });
            const targetRel = receiptPath(targetProjectRel, targetSessionName);
            if (targetSessionPaths.has(targetRel)) fail(`duplicate target session in old layout: ${targetRel}`);
            targetSessionPaths.add(targetRel);
            const session = {
              sourceRel: relativeReceiptPath(root, sessionDir),
              targetRel,
              stageRel: receiptPath(STAGING_NAME, `session-${String(sessions.length + 1).padStart(6, '0')}`),
              projectIndex: projects.length - 1,
              sessionId: sessionManifest.sessionId,
              manifest: sessionManifest,
              treeDigest: null,
              materializedDigest: null,
              eventCount: null,
              deduped: false,
              staged: false,
              published: false,
            };
            project.sessionIndexes.push(sessions.length);
            sessions.push(session);
          }
        }
      }
    }
  }
  return { oldProjects, projects, sessions, quarantined, sourceBytes: 0 };
}

function latestIso(...values) {
  return values.filter(value => typeof value === 'string' && Number.isFinite(Date.parse(value)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

function earliestIso(...values) {
  return values.filter(value => typeof value === 'string' && Number.isFinite(Date.parse(value)))
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
}

function validateTargetProject(root, project, sessions) {
  const target = join(root, project.targetRel);
  let targetManifest = null;
  const targetSessions = [];
  if (existsSync(target)) {
    assertDirectory(target, 'target project directory');
    scanSafeTree(target);
    assertNoLiveLock(join(target, '.project.lock'));
    const targetManifestPath = join(target, 'project.json');
    if (existsSync(targetManifestPath)) {
      assertRegularFile(targetManifestPath, 'target project manifest');
      targetManifest = readJson(targetManifestPath, 'target project manifest');
      const validation = validateProjectManifest(targetManifest);
      if (!validation.ok) fail(`invalid target project manifest: ${targetManifestPath}`);
      if (targetManifest.projectId !== project.manifest.projectId
          || targetManifest.canonicalCwd !== project.manifest.canonicalCwd) {
        fail(`target project manifest identity conflict: ${target}`);
      }
    }
    for (const entry of readdirSync(target, { withFileTypes: true })) {
      if (!entry.name.endsWith('.cxvsession')) continue;
      const sessionDir = join(target, entry.name);
      assertDirectory(sessionDir, 'target session directory');
      assertNoLiveLock(join(sessionDir, '.append.lock'));
      const manifestPath = join(sessionDir, 'manifest.json');
      if (!existsSync(manifestPath)) fail(`target session manifest is missing: ${manifestPath}`);
      assertRegularFile(manifestPath, 'target session manifest');
      const manifest = readJson(manifestPath, 'target session manifest');
      const validation = validateSessionManifest(manifest);
      if (!validation.ok || manifest.projectId !== project.manifest.projectId) {
        fail(`invalid target session manifest: ${manifestPath}`);
      }
      const expectedName = sessionArchiveDirectoryName({
        sessionId: manifest.sessionId,
        createdAt: manifest.createdAt,
      });
      if (entry.name !== expectedName) fail(`target session directory name does not match manifest: ${sessionDir}`);
      targetSessions.push({ path: sessionDir, manifest });
    }
  }

  const union = new Map();
  for (const item of targetSessions) {
    if (union.has(item.manifest.sessionId)) fail(`duplicate target sessionId: ${item.manifest.sessionId}`);
    union.set(item.manifest.sessionId, item.manifest);
  }
  for (const index of project.sessionIndexes) {
    const session = sessions[index];
    const previous = union.get(session.sessionId);
    if (previous && (previous.createdAt !== session.manifest.createdAt
        || sessionArchiveDirectoryName({ sessionId: previous.sessionId, createdAt: previous.createdAt })
          !== basename(session.targetRel))) {
      fail(`target session identity conflict: ${session.targetRel} (old createdAt ${session.manifest.createdAt}, target createdAt ${previous.createdAt})`);
    }
    union.set(session.sessionId, session.manifest);
    session.targetExists = existsSync(join(root, session.targetRel));
  }

  const allSessions = [...union.values()];
  const maximumSessionSeq = allSessions.reduce((maximum, manifest) => Math.max(maximum, manifest.sessionSeq), 0);
  const targetLatest = targetManifest?.latestSessionId;
  const sourceLatest = project.manifest.latestSessionId;
  const fallbackLatest = [...allSessions].sort((a, b) => b.sessionSeq - a.sessionSeq)[0]?.sessionId ?? null;
  const latestSessionId = targetLatest && union.has(targetLatest)
    ? targetLatest
    : sourceLatest && union.has(sourceLatest) ? sourceLatest : fallbackLatest;
  project.mergedManifest = {
    ...project.manifest,
    createdAt: earliestIso(project.manifest.createdAt, targetManifest?.createdAt),
    updatedAt: latestIso(project.manifest.updatedAt, targetManifest?.updatedAt),
    nextSessionSeq: Math.max(
      project.manifest.nextSessionSeq,
      targetManifest?.nextSessionSeq || 1,
      maximumSessionSeq + 1,
    ),
    latestSessionId,
  };
}

function verifyPlan(root, plan) {
  let sourceBytes = 0;
  // Existing target names are the most actionable conflict class and are
  // checked first, so a large dry-run does not hash every unrelated archive
  // before reporting a mixed-layout divergence.
  const ordered = [...plan.sessions].sort((a, b) => Number(b.targetExists) - Number(a.targetExists));
  for (const session of ordered) {
    const source = join(root, session.sourceRel);
    const verified = verifySession(source);
    Object.assign(session, verified);
    if (session.targetExists) {
      const target = join(root, session.targetRel);
      const targetVerified = verifySession(target);
      if (targetVerified.treeDigest !== verified.treeDigest
          || targetVerified.materializedDigest !== verified.materializedDigest) {
        fail(`target session diverges from old layout: ${session.targetRel}`);
      }
      session.deduped = true;
      session.published = true;
    } else {
      sourceBytes += scanSafeTree(source, { countBytes: true });
    }
  }
  plan.sourceBytes = sourceBytes;
  return plan;
}

function preparePlan(root) {
  const plan = discoverPlan(root);
  try {
    for (const project of plan.projects) validateTargetProject(root, project, plan.sessions);
    verifyPlan(root, plan);
  } catch (error) {
    error.preflightReport = {
      projects: plan.projects.length,
      sessions: plan.sessions.length,
      quarantined: plan.quarantined.length,
      quarantine: plan.quarantined,
      conflicts: [error.message],
    };
    throw error;
  }
  return plan;
}

function checkFreeSpace(root, requiredBytes) {
  const fs = statfsSync(root, { bigint: true });
  const free = fs.bavail * fs.bsize;
  const required = BigInt(requiredBytes) + 1024n * 1024n;
  if (free < required) fail(`not enough free space for staging (${required} bytes required, ${free} available)`);
}

function backupRelativeName() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return receiptPath('v2', `projects.layout-v1-backup-${stamp}-${crypto.randomBytes(4).toString('hex')}`);
}

function newReceipt(root, plan) {
  return {
    kind: RECEIPT_KIND,
    version: RECEIPT_VERSION,
    root,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phase: 'planned',
    sourceProjectsRel: receiptPath('v2', 'projects'),
    backupRel: backupRelativeName(),
    sourceBytes: plan.sourceBytes,
    projects: plan.projects,
    sessions: plan.sessions,
    quarantined: plan.quarantined,
  };
}

function validateReceipt(receipt, root) {
  if (!receipt || receipt.kind !== RECEIPT_KIND || receipt.version !== RECEIPT_VERSION || receipt.root !== root
      || !Array.isArray(receipt.projects) || !Array.isArray(receipt.sessions)
      || !Array.isArray(receipt.quarantined)) {
    fail('migration receipt is invalid or belongs to another log root');
  }
  const safeRelative = (value, label) => {
    if (typeof value !== 'string' || !value || value.startsWith('/') || value.includes('\\')
        || value.split('/').some(part => part === '..')) {
      fail(`migration receipt contains an unsafe ${label}`);
    }
    const candidate = resolve(root, value);
    const rel = relative(root, candidate);
    if (rel === '..' || rel.startsWith(`..${sep}`) || rel.startsWith(sep)) {
      fail(`migration receipt ${label} escapes the log root`);
    }
    return value;
  };
  if (!['planned', 'staged', 'publishing', 'published', 'backup-renamed', 'complete'].includes(receipt.phase)) {
    fail('migration receipt has an invalid phase');
  }
  if (receipt.sourceProjectsRel !== receiptPath('v2', 'projects')) fail('migration receipt has an invalid source projects path');
  safeRelative(receipt.backupRel, 'backup path');
  if (!/^v2\/projects\.layout-v1-backup-\d{8}T\d{6}Z-[a-f0-9]{8}$/.test(receipt.backupRel)) {
    fail('migration receipt has an invalid backup path');
  }
  for (const [index, project] of receipt.projects.entries()) {
    safeRelative(project.sourceRel, `projects[${index}].sourceRel`);
    safeRelative(project.targetRel, `projects[${index}].targetRel`);
    const validation = validateProjectManifest(project.manifest);
    const mergedValidation = validateProjectManifest(project.mergedManifest);
    if (!validation.ok || !mergedValidation.ok
        || project.mergedManifest.projectId !== project.manifest.projectId
        || project.mergedManifest.canonicalCwd !== project.manifest.canonicalCwd
        || project.targetRel !== projectArchiveDirectoryName(project.manifest.projectId)) {
      fail(`migration receipt contains an invalid project at index ${index}`);
    }
    if (!Array.isArray(project.sessionIndexes)
        || project.sessionIndexes.some(item => !Number.isSafeInteger(item) || item < 0 || item >= receipt.sessions.length)) {
      fail(`migration receipt contains invalid session indexes for project ${index}`);
    }
  }
  for (const [index, session] of receipt.sessions.entries()) {
    safeRelative(session.sourceRel, `sessions[${index}].sourceRel`);
    safeRelative(session.targetRel, `sessions[${index}].targetRel`);
    safeRelative(session.stageRel, `sessions[${index}].stageRel`);
    const manifestValidation = validateSessionManifest(session.manifest);
    const project = receipt.projects[session.projectIndex];
    const expectedTarget = project && manifestValidation.ok
      ? receiptPath(project.targetRel, sessionArchiveDirectoryName({
        sessionId: session.manifest.sessionId,
        createdAt: session.manifest.createdAt,
      }))
      : null;
    if (session.stageRel !== receiptPath(STAGING_NAME, `session-${String(index + 1).padStart(6, '0')}`)
        || !Number.isSafeInteger(session.projectIndex) || !project
        || session.targetRel !== expectedTarget
        || !manifestValidation.ok || session.manifest.sessionId !== session.sessionId
        || session.manifest.projectId !== project?.manifest.projectId
        || typeof session.deduped !== 'boolean' || typeof session.published !== 'boolean'
        || (session.deduped && !session.published)
        || !/^sha256:[a-f0-9]{64}$/.test(session.treeDigest || '')
        || !/^sha256:[a-f0-9]{64}$/.test(session.materializedDigest || '')) {
      fail(`migration receipt contains an invalid session at index ${index}`);
    }
  }
  for (const [index, item] of receipt.quarantined.entries()) {
    safeRelative(item.sourceRel, `quarantined[${index}].sourceRel`);
    const project = receipt.projects[item.projectIndex];
    if (!Number.isSafeInteger(item.projectIndex) || !project
        || !item.sourceRel.startsWith(`${project.sourceRel}/sessions/`)
        || item.reason !== 'manifest.json is missing') {
      fail(`migration receipt contains an invalid quarantine item at index ${index}`);
    }
  }
  return receipt;
}

function saveReceipt(path, receipt) {
  receipt.updatedAt = new Date().toISOString();
  atomicJson(path, receipt);
}

function quarantineReport(receipt) {
  const prefix = `${receipt.sourceProjectsRel}/`;
  return receipt.quarantined.map(item => ({
    reason: item.reason,
    backupRel: item.sourceRel.startsWith(prefix)
      ? receiptPath(receipt.backupRel, item.sourceRel.slice(prefix.length))
      : receiptPath(receipt.backupRel, basename(item.sourceRel)),
  }));
}

function ensureActiveMarker(root, receiptPath, receipt) {
  const marker = join(root, ACTIVE_NAME);
  if (existsSync(marker)) {
    assertRegularFile(marker, 'migration active marker');
    const value = readJson(marker, 'migration active marker');
    if (value.kind !== RECEIPT_KIND || value.version !== RECEIPT_VERSION || value.receipt !== basename(receiptPath)) {
      fail('another log layout migration is active');
    }
    const state = pidState(value.pid);
    if (state === 'alive' && value.pid !== process.pid) {
      fail(`another log layout migration is active (pid ${value.pid})`);
    }
    if (state === 'unknown') fail('migration active marker has an unknown owner');
    if (value.pid === process.pid) return marker;
    durableUnlink(marker);
  }
  const value = {
    kind: RECEIPT_KIND,
    version: RECEIPT_VERSION,
    receipt: basename(receiptPath),
    pid: process.pid,
    createdAt: new Date().toISOString(),
  };
  let fd = null;
  try {
    fd = openSync(marker, 'wx', 0o600);
    writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`);
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
    fsyncPath(root);
  } catch (error) {
    if (fd !== null) closeSync(fd);
    if (error?.code === 'EEXIST') fail('another log layout migration acquired the active marker');
    throw error;
  }
  return marker;
}

function assertReceiptLocksStopped(root, receipt) {
  for (const project of receipt.projects) {
    const sourceProject = join(root, project.sourceRel);
    if (existsSync(sourceProject)) assertNoLiveLock(join(sourceProject, '.project.lock'));
    const targetProject = join(root, project.targetRel);
    if (existsSync(targetProject)) assertNoLiveLock(join(targetProject, '.project.lock'));
  }
  for (const session of receipt.sessions) {
    const sourceSession = join(root, session.sourceRel);
    if (existsSync(sourceSession)) assertNoLiveLock(join(sourceSession, '.append.lock'));
    const targetSession = join(root, session.targetRel);
    if (existsSync(targetSession)) assertNoLiveLock(join(targetSession, '.append.lock'));
  }
}

function assertReceiptPlanStable(root, receipt) {
  for (const session of receipt.sessions) {
    const source = join(root, session.sourceRel);
    if (!existsSync(source)) fail(`source session is missing: ${session.sourceRel}`);
    const sourceVerified = verifySession(source);
    if (sourceVerified.treeDigest !== session.treeDigest
        || sourceVerified.materializedDigest !== session.materializedDigest) {
      fail(`source session changed after preflight: ${session.sourceRel}`);
    }
    const target = join(root, session.targetRel);
    if (session.deduped) {
      if (!existsSync(target)) fail(`deduplicated target is missing: ${session.targetRel}`);
      const targetVerified = verifySession(target);
      if (targetVerified.treeDigest !== session.treeDigest
          || targetVerified.materializedDigest !== session.materializedDigest) {
        fail(`deduplicated target changed after preflight: ${session.targetRel}`);
      }
    } else if (existsSync(target)) {
      fail(`target session appeared after preflight: ${session.targetRel}`);
    }
  }
}

function stageSessions(root, receipt, receiptPath) {
  const staging = join(root, STAGING_NAME);
  if (!existsSync(staging)) {
    mkdirSync(staging, { mode: 0o700 });
    fsyncPath(root);
  }
  assertDirectory(staging, 'migration staging directory');
  if (statSync(staging).dev !== statSync(root).dev) fail('migration staging directory must be on the log root filesystem');
  for (const session of receipt.sessions) {
    if (session.deduped) {
      if (!existsSync(join(root, session.targetRel))) fail(`deduplicated target is missing: ${session.targetRel}`);
      continue;
    }
    const source = join(root, session.sourceRel);
    const staged = join(root, session.stageRel);
    if (session.staged) {
      if (!existsSync(staged) && !session.published) fail(`staged session is missing: ${session.stageRel}`);
      continue;
    }
    if (existsSync(staged)) {
      const verified = verifySession(staged);
      if (verified.treeDigest !== session.treeDigest || verified.materializedDigest !== session.materializedDigest) {
        fail(`existing staged session does not match receipt: ${session.stageRel}`);
      }
    } else {
      if (!existsSync(source)) fail(`source session is missing: ${session.sourceRel}`);
      const copying = `${staged}.copying`;
      if (existsSync(copying)) {
        assertDirectory(copying, 'partial staged session');
        rmSync(copying, { recursive: true, force: false });
      }
      copyStableTree(source, copying);
      const verified = verifySession(copying);
      if (verified.treeDigest !== session.treeDigest || verified.materializedDigest !== session.materializedDigest) {
        fail(`staged session verification failed: ${session.stageRel}`);
      }
      durableRename(copying, staged);
    }
    session.staged = true;
    saveReceipt(receiptPath, receipt);
  }
  receipt.phase = 'staged';
  saveReceipt(receiptPath, receipt);
}

function publish(root, receipt, receiptPath) {
  const marker = ensureActiveMarker(root, receiptPath, receipt);
  receipt.phase = 'publishing';
  saveReceipt(receiptPath, receipt);
  for (const project of receipt.projects) {
    const targetProject = join(root, project.targetRel);
    if (!existsSync(targetProject)) {
      mkdirSync(targetProject, { mode: 0o700 });
      fsyncPath(root);
    }
    assertDirectory(targetProject, 'target project directory');
    for (const index of project.sessionIndexes) {
      const session = receipt.sessions[index];
      const staged = join(root, session.stageRel);
      const target = join(root, session.targetRel);
      if (session.published) {
        if (!existsSync(target)) fail(`published target is missing: ${session.targetRel}`);
        const verified = verifySession(target);
        if (verified.treeDigest !== session.treeDigest || verified.materializedDigest !== session.materializedDigest) {
          fail(`published target does not match receipt: ${session.targetRel}`);
        }
        continue;
      }
      if (existsSync(target)) {
        const verified = verifySession(target);
        if (existsSync(staged) || verified.treeDigest !== session.treeDigest
            || verified.materializedDigest !== session.materializedDigest) {
          fail(`target session conflict: ${session.targetRel}`);
        }
      } else {
        if (!existsSync(staged)) fail(`staged session is missing: ${session.stageRel}`);
        durableRename(staged, target);
      }
      session.published = true;
      saveReceipt(receiptPath, receipt);
    }
    const manifestPath = join(targetProject, 'project.json');
    atomicJson(manifestPath, project.mergedManifest);
    project.installed = true;
    saveReceipt(receiptPath, receipt);
  }
  receipt.phase = 'published';
  saveReceipt(receiptPath, receipt);

  const oldProjects = join(root, receipt.sourceProjectsRel);
  const backup = join(root, receipt.backupRel);
  if (existsSync(oldProjects)) {
    if (existsSync(backup)) fail(`backup destination already exists: ${receipt.backupRel}`);
    durableRename(oldProjects, backup);
  } else if (!existsSync(backup)) fail('old projects directory and migration backup are both missing');
  receipt.phase = 'backup-renamed';
  saveReceipt(receiptPath, receipt);

  const staging = join(root, STAGING_NAME);
  if (existsSync(staging)) {
    rmSync(staging, { recursive: true, force: false });
    fsyncPath(root);
  }
  receipt.phase = 'complete';
  receipt.completedAt = new Date().toISOString();
  saveReceipt(receiptPath, receipt);
  if (existsSync(marker)) durableUnlink(marker);
}

export function runMigration({ root: rootArgument, apply = false, confirmStopped = false }) {
  if (apply && !confirmStopped) fail('--apply requires --confirm-stopped');
  const requestedRoot = resolve(rootArgument);
  assertDirectory(requestedRoot, 'log root');
  const root = realpathSync(requestedRoot);
  const receiptPath = join(root, RECEIPT_NAME);
  let receipt = null;
  if (existsSync(receiptPath)) {
    assertRegularFile(receiptPath, 'migration receipt');
    receipt = validateReceipt(readJson(receiptPath, 'migration receipt'), root);
  }

  if (!apply) {
    if (receipt) {
      return {
        mode: 'dry-run',
        phase: receipt.phase,
        projects: receipt.projects.length,
        sessions: receipt.sessions.length,
        deduplicated: receipt.sessions.filter(session => session.deduped).length,
        quarantined: receipt.quarantined.length,
        quarantine: receipt.phase === 'complete' ? quarantineReport(receipt) : receipt.quarantined,
        sourceBytes: receipt.sourceBytes,
      };
    }
    const plan = preparePlan(root);
    checkFreeSpace(root, plan.sourceBytes);
    return {
      mode: 'dry-run',
      phase: 'planned',
      projects: plan.projects.length,
      sessions: plan.sessions.length,
      deduplicated: plan.sessions.filter(session => session.deduped).length,
      quarantined: plan.quarantined.length,
      quarantine: plan.quarantined,
      sourceBytes: plan.sourceBytes,
    };
  }

  if (receipt?.phase === 'complete') {
    const marker = join(root, ACTIVE_NAME);
    if (existsSync(marker)) {
      ensureActiveMarker(root, receiptPath, receipt);
      durableUnlink(marker);
    }
    return {
      mode: 'apply',
      phase: 'complete',
      projects: receipt.projects.length,
      sessions: receipt.sessions.length,
      deduplicated: receipt.sessions.filter(session => session.deduped).length,
      quarantined: receipt.quarantined.length,
      quarantine: quarantineReport(receipt),
      backup: receipt.backupRel,
    };
  }

  if (!receipt) {
    if (existsSync(join(root, ACTIVE_NAME))) fail('active marker exists without a migration receipt');
    if (existsSync(join(root, STAGING_NAME))) fail('staging directory exists without a migration receipt');
    const plan = preparePlan(root);
    checkFreeSpace(root, plan.sourceBytes);
    if (plan.sessions.length === 0 && plan.projects.length === 0) {
      return { mode: 'apply', phase: 'nothing-to-do', projects: 0, sessions: 0, deduplicated: 0, quarantined: 0 };
    }
    receipt = newReceipt(root, plan);
    saveReceipt(receiptPath, receipt);
  }

  ensureActiveMarker(root, receiptPath, receipt);
  if (['planned', 'staged', 'publishing', 'published'].includes(receipt.phase)) {
    assertReceiptLocksStopped(root, receipt);
  }
  if (['planned', 'staged'].includes(receipt.phase)) {
    assertReceiptPlanStable(root, receipt);
    stageSessions(root, receipt, receiptPath);
  }
  publish(root, receipt, receiptPath);
  return {
    mode: 'apply',
    phase: receipt.phase,
    projects: receipt.projects.length,
    sessions: receipt.sessions.length,
    deduplicated: receipt.sessions.filter(session => session.deduped).length,
    quarantined: receipt.quarantined.length,
    quarantine: quarantineReport(receipt),
    backup: receipt.backupRel,
  };
}

function usage() {
  return 'Usage: node scripts/migrate-log-v2-layout.mjs --root <log-directory> [--apply --confirm-stopped]';
}

export function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      console.log(usage());
      return 0;
    }
    const result = runMigration(options);
    console.log(JSON.stringify(result, null, 2));
    return 0;
  } catch (error) {
    const message = error?.code === 'ENOENT'
      ? 'the log tree changed during validation; stop every CX Viewer/Codex process and retry'
      : error.message;
    console.error(`Log V2 layout migration failed: ${message}`);
    if (error.preflightReport) console.error(`Preflight report: ${JSON.stringify(error.preflightReport)}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main();
}
