import crypto from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

import { atomicWriteJsonSync, stableJsonStringify } from './storage.js';

export const C1_GATE_KIND = 'cx-viewer.log-v2-c1-gate';
export const C1_GATE_VERSION = 1;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function iso(value, name) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${name} must be an ISO-compatible timestamp`);
  return date;
}

export function createC1Gate(report, { logDir, now = new Date(), maxAgeHours = 720 } = {}) {
  if (!report?.ok || report.gate !== 'c1-readiness') {
    throw new TypeError('a passing c1-readiness report is required');
  }
  if (typeof logDir !== 'string' || !logDir || !existsSync(logDir)) throw new TypeError('logDir must exist');
  const created = iso(now, 'now');
  const hours = Number(maxAgeHours);
  if (!Number.isFinite(hours) || hours <= 0) throw new TypeError('maxAgeHours must be positive');
  const projects = [...new Set((report.sessions || []).map((session) => session.projectId).filter(Boolean))].sort();
  if (projects.length === 0) throw new TypeError('the readiness report contains no approved projects');
  const evidence = {
    projectId: report.projectId || null,
    thresholds: report.thresholds,
    summary: report.summary,
    sessions: report.sessions.map((session) => ({
      projectId: session.projectId,
      sessionId: session.sessionId,
      committedEvents: session.committedEvents,
      v1Events: session.v1Events,
      v2Events: session.v2Events,
      status: session.status,
    })),
    generatedAt: report.generatedAt,
  };
  const payload = {
    kind: C1_GATE_KIND,
    version: C1_GATE_VERSION,
    logRoot: realpathSync(logDir),
    createdAt: created.toISOString(),
    expiresAt: new Date(created.getTime() + hours * 3_600_000).toISOString(),
    approvedProjects: Object.freeze(projects),
    evidenceDigest: `sha256:${sha256(stableJsonStringify(evidence))}`,
    thresholds: report.thresholds,
    summary: report.summary,
  };
  return Object.freeze({
    ...payload,
    gateDigest: `sha256:${sha256(stableJsonStringify(payload))}`,
  });
}

export function writeC1GateFile(filePath, report, options = {}) {
  if (typeof filePath !== 'string' || !filePath) throw new TypeError('gate file path is required');
  const gate = createC1Gate(report, options);
  atomicWriteJsonSync(resolve(filePath), gate, { durable: true });
  return gate;
}

export function loadC1GateFile(filePath, { logDir, now = new Date() } = {}) {
  if (typeof filePath !== 'string' || !filePath) throw new TypeError('CXV_LOG_V2_GATE_FILE is required for V2 primary mode');
  let gate;
  try {
    gate = JSON.parse(readFileSync(resolve(filePath), 'utf8'));
  } catch (error) {
    throw new Error(`cannot read V2 C1 gate: ${error.message}`);
  }
  const errors = [];
  if (gate?.kind !== C1_GATE_KIND) errors.push(`kind must be ${C1_GATE_KIND}`);
  if (gate?.version !== C1_GATE_VERSION) errors.push(`version must be ${C1_GATE_VERSION}`);
  if (typeof gate?.logRoot !== 'string' || !gate.logRoot) errors.push('logRoot is required');
  if (!Array.isArray(gate?.approvedProjects) || gate.approvedProjects.length === 0
      || gate.approvedProjects.some((project) => typeof project !== 'string' || !project)) {
    errors.push('approvedProjects must contain at least one project id');
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(gate?.evidenceDigest || '')) errors.push('evidenceDigest is invalid');
  if (!/^sha256:[a-f0-9]{64}$/.test(gate?.gateDigest || '')) errors.push('gateDigest is invalid');
  else {
    const { gateDigest, ...payload } = gate;
    if (`sha256:${sha256(stableJsonStringify(payload))}` !== gateDigest) errors.push('gateDigest does not match gate contents');
  }
  let created;
  let expires;
  let current;
  try { created = iso(gate?.createdAt, 'createdAt'); } catch (error) { errors.push(error.message); }
  try { expires = iso(gate?.expiresAt, 'expiresAt'); } catch (error) { errors.push(error.message); }
  try { current = iso(now, 'now'); } catch (error) { errors.push(error.message); }
  if (created && expires && expires <= created) errors.push('expiresAt must be after createdAt');
  if (current && expires && current > expires) errors.push('gate has expired');
  if (typeof logDir !== 'string' || !logDir || !existsSync(logDir)) errors.push('runtime logDir does not exist');
  else if (gate?.logRoot && realpathSync(logDir) !== gate.logRoot) errors.push('gate logRoot does not match runtime LOG_DIR');
  if (errors.length) throw new Error(`invalid V2 C1 gate: ${errors.join('; ')}`);
  return Object.freeze({
    ...gate,
    approvedProjects: Object.freeze([...gate.approvedProjects]),
  });
}
