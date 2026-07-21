import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, readlink, readdir } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const MIN_PORT = 7008;
const MAX_PORT = 7099;

function hashCommand(command) {
  return createHash('sha256').update(String(command || '')).digest('hex');
}

export function isCxvCommand(command) {
  const normalized = String(command || '').replace(/\\/g, '/');
  return /(?:^|\s)(?:\S*\/)?cxv(?:\s|$)/.test(normalized)
    || /\/node_modules\/cx-viewer\/(?:cli|server)\.js(?:\s|$)/.test(normalized);
}

export function isCxvProcess(identity) {
  if (isCxvCommand(identity?.command)) return true;
  const command = String(identity?.command || '').replace(/\\/g, '/');
  const cwd = String(identity?.cwd || '').replace(/\\/g, '/');
  return /(?:^|\s)node(?:\.exe)?\s+server\.js(?:\s|$)/i.test(command)
    && (identity?.platform === 'win32' || /\/cx-viewer\/?$/.test(cwd));
}

export function sameProcessIdentity(expected, actual) {
  return !!expected && !!actual
    && expected.pid === actual.pid
    && expected.startId === actual.startId
    && expected.commandHash === actual.commandHash;
}

export function encodeProcessRef(identity, secret) {
  const payload = Buffer.from(JSON.stringify({
    pid: identity.pid,
    startId: identity.startId,
    commandHash: identity.commandHash,
    port: identity.port,
  }), 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function decodeProcessRef(value, secret) {
  try {
    const [payload, signature, extra] = String(value || '').split('.');
    if (!payload || !signature || extra) return null;
    const expectedSignature = createHmac('sha256', secret).update(payload).digest();
    const actualSignature = Buffer.from(signature, 'base64url');
    if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isInteger(parsed.pid) || parsed.pid <= 0
      || typeof parsed.startId !== 'string' || parsed.startId.length < 3
      || !/^[a-f0-9]{64}$/.test(parsed.commandHash)
      || !Number.isInteger(Number(parsed.port))
      || Number(parsed.port) < MIN_PORT || Number(parsed.port) > MAX_PORT) return null;
    return { ...parsed, port: Number(parsed.port) };
  } catch {
    return null;
  }
}

function parsePosixProcessLine(line) {
  const match = String(line || '').match(/^\s*(\d+)\s+(\d+)\s+(\w+\s+\w+\s+\d+\s+[\d:]+\s+\d{4})\s+(.+)$/);
  if (!match) return null;
  const pid = Number(match[1]);
  const ppid = Number(match[2]);
  const startId = match[3].replace(/\s+/g, ' ').trim();
  const command = match[4].trim();
  return { pid, ppid, startId, startTime: startId, command, commandHash: hashCommand(command) };
}

async function run(command, args, options = {}) {
  return execFileAsync(command, args, { timeout: 5000, maxBuffer: 4 * 1024 * 1024, ...options });
}

async function inspectPosixProcess(pid, runner) {
  try {
    const { stdout } = await runner('ps', ['-p', String(pid), '-o', 'pid=,ppid=,lstart=,command=']);
    const identity = parsePosixProcessLine(stdout.trim());
    if (!identity) return null;
    try {
      const { stdout: cwdOut } = await runner('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn']);
      identity.cwd = cwdOut.split('\n').find(line => line.startsWith('n'))?.slice(1) || '';
    } catch {}
    return identity;
  } catch (error) {
    if (error?.code === 1 || error?.code === 'ESRCH') return null;
    const wrapped = new Error(`Unable to inspect PID ${pid}: ${error?.message || error}`);
    wrapped.code = 'CXV_PROCESS_INSPECTION_FAILED';
    throw wrapped;
  }
}

let linuxBootIdPromise = null;
function linuxBootId() {
  if (!linuxBootIdPromise) linuxBootIdPromise = readFile('/proc/sys/kernel/random/boot_id', 'utf8').then(value => value.trim());
  return linuxBootIdPromise;
}

function parseLinuxStat(text) {
  const close = text.lastIndexOf(')');
  if (close < 0) return null;
  const pid = Number(text.slice(0, text.indexOf(' ')));
  const fields = text.slice(close + 2).trim().split(/\s+/);
  if (!pid || fields.length < 20) return null;
  return { pid, ppid: Number(fields[1]) || 0, startTicks: fields[19] };
}

async function inspectLinuxProcess(pid) {
  try {
    const [statText, cmdline, executable, cwd, bootId] = await Promise.all([
      readFile(`/proc/${pid}/stat`, 'utf8'),
      readFile(`/proc/${pid}/cmdline`),
      readlink(`/proc/${pid}/exe`),
      readlink(`/proc/${pid}/cwd`),
      linuxBootId(),
    ]);
    const stat = parseLinuxStat(statText);
    if (!stat) throw new Error('malformed /proc stat');
    const args = cmdline.toString('utf8').split('\0').filter(Boolean).join(' ');
    const command = args || executable;
    return {
      pid: stat.pid,
      ppid: stat.ppid,
      startId: `${bootId}:${stat.startTicks}`,
      startTime: stat.startTicks,
      command,
      cwd,
      commandHash: hashCommand(command),
    };
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ESRCH') return null;
    const wrapped = new Error(`Unable to inspect PID ${pid}: ${error?.message || error}`);
    wrapped.code = 'CXV_PROCESS_INSPECTION_FAILED';
    throw wrapped;
  }
}

function parseLsofListeners(stdout) {
  const found = new Map();
  for (const line of String(stdout || '').trim().split('\n').slice(1)) {
    const parts = line.trim().split(/\s+/);
    const pid = Number(parts[1]);
    const portMatch = (parts[parts.length - 2] || '').match(/:(\d+)$/);
    const port = Number(portMatch?.[1]);
    if (pid > 0 && port >= MIN_PORT && port <= MAX_PORT && !found.has(pid)) found.set(pid, port);
  }
  return found;
}

async function listPosixListeners(runner) {
  try {
    const { stdout } = await runner('lsof', ['-nP', `-iTCP:${MIN_PORT}-${MAX_PORT}`, '-sTCP:LISTEN']);
    return parseLsofListeners(stdout);
  } catch (error) {
    if (error?.code === 1) return new Map();
    const wrapped = new Error(`CXV process discovery requires lsof: ${error?.message || error}`);
    wrapped.code = 'CXV_PROCESS_DISCOVERY_UNAVAILABLE';
    throw wrapped;
  }
}

async function powershellJson(script, runner) {
  const { stdout } = await runner('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

function windowsIdentity(record) {
  if (!record) return null;
  const pid = Number(record.ProcessId);
  const command = record.CommandLine || record.ExecutablePath || '';
  if (!pid || !record.CreationDate) return null;
  return {
    platform: 'win32',
    pid,
    ppid: Number(record.ParentProcessId) || 0,
    startId: String(record.CreationDate),
    startTime: String(record.CreationDate),
    command,
    commandHash: hashCommand(command),
  };
}

async function inspectWindowsProcess(pid, runner) {
  try {
    const record = await powershellJson(
      `Get-CimInstance Win32_Process -Filter \"ProcessId = ${pid}\" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine | ConvertTo-Json -Compress`,
      runner,
    );
    return windowsIdentity(record);
  } catch (error) {
    const wrapped = new Error(`Unable to inspect PID ${pid}: ${error?.message || error}`);
    wrapped.code = 'CXV_PROCESS_INSPECTION_FAILED';
    throw wrapped;
  }
}

async function listWindowsListeners(runner) {
  try {
    const records = await powershellJson(
      `@(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -ge ${MIN_PORT} -and $_.LocalPort -le ${MAX_PORT} } | Select-Object OwningProcess,LocalPort) | ConvertTo-Json -Compress`,
      runner,
    );
    const map = new Map();
    for (const record of Array.isArray(records) ? records : (records ? [records] : [])) {
      const pid = Number(record.OwningProcess);
      const port = Number(record.LocalPort);
      if (pid > 0 && !map.has(pid)) map.set(pid, port);
    }
    return map;
  } catch (error) {
    const wrapped = new Error(`CXV process discovery requires PowerShell Get-NetTCPConnection: ${error?.message || error}`);
    wrapped.code = 'CXV_PROCESS_DISCOVERY_UNAVAILABLE';
    throw wrapped;
  }
}

export function createProcessAdapter({ platform = process.platform, runner = run, kill = process.kill } = {}) {
  const windows = platform === 'win32';
  const linux = platform === 'linux';
  const inspect = pid => windows
    ? inspectWindowsProcess(pid, runner)
    : (linux ? inspectLinuxProcess(pid) : inspectPosixProcess(pid, runner));
  const listListeners = () => windows ? listWindowsListeners(runner) : listPosixListeners(runner);

  async function listAll() {
    if (windows) {
      const records = await powershellJson(
        '@(Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine) | ConvertTo-Json -Compress',
        runner,
      );
      return (Array.isArray(records) ? records : (records ? [records] : [])).map(windowsIdentity).filter(Boolean);
    }
    const { stdout } = await runner('ps', ['-axo', 'pid=,ppid=,lstart=,command=']);
    return stdout.split('\n').map(parsePosixProcessLine).filter(Boolean);
  }

  async function linuxDescendants(rootIdentity) {
    const names = await readdir('/proc');
    const relations = [];
    await Promise.all(names.filter(name => /^\d+$/.test(name)).map(async name => {
      try {
        const stat = parseLinuxStat(await readFile(`/proc/${name}/stat`, 'utf8'));
        if (stat) relations.push(stat);
      } catch (error) {
        if (error?.code !== 'ENOENT' && error?.code !== 'ESRCH' && error?.code !== 'EACCES') throw error;
      }
    }));
    const byParent = new Map();
    for (const item of relations) {
      const bucket = byParent.get(item.ppid) || [];
      bucket.push(item.pid);
      byParent.set(item.ppid, bucket);
    }
    const pids = [];
    const visit = pid => {
      for (const childPid of byParent.get(pid) || []) {
        pids.push(childPid);
        visit(childPid);
      }
    };
    visit(rootIdentity.pid);
    return (await Promise.all(pids.map(inspect))).filter(Boolean);
  }

  return {
    inspect,
    async listCxvProcesses() {
      const listeners = await listListeners();
      const candidates = [];
      for (const [pid, port] of listeners) {
        const identity = await inspect(pid);
        if (identity && isCxvProcess(identity)) candidates.push({ ...identity, port });
      }
      const candidatePids = new Set(candidates.map(item => item.pid));
      return candidates.filter(item => !candidatePids.has(item.ppid));
    },
    async descendants(rootIdentity) {
      if (linux) return linuxDescendants(rootIdentity);
      const all = await listAll();
      const byParent = new Map();
      for (const item of all) {
        const bucket = byParent.get(item.ppid) || [];
        bucket.push(item);
        byParent.set(item.ppid, bucket);
      }
      const result = [];
      const visit = pid => {
        for (const child of byParent.get(pid) || []) {
          result.push(child);
          visit(child.pid);
        }
      };
      visit(rootIdentity.pid);
      return result;
    },
    signal(identity, signal) {
      return kill(identity.pid, signal);
    },
  };
}

export async function killVerifiedTree(adapter, rootIdentity, descendants, signal = 'SIGKILL') {
  const ordered = [...descendants].reverse().concat(rootIdentity);
  for (const expected of ordered) {
    const actual = await adapter.inspect(expected.pid);
    if (!sameProcessIdentity(expected, actual)) continue;
    try { adapter.signal(expected, signal); } catch (error) {
      if (error?.code !== 'ESRCH') throw error;
    }
  }
}
