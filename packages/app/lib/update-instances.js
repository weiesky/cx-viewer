import { request } from 'node:http';

import { DEFAULT_START_PORT, DEFAULT_MAX_PORT } from './constants.js';

export function normalInstancePortRange(env = process.env) {
  if (env.CXV_IM_PLATFORM) return [];
  const start = Number(env.CXV_START_PORT) || DEFAULT_START_PORT;
  const end = Number(env.CXV_MAX_PORT) || DEFAULT_MAX_PORT;
  return start >= DEFAULT_START_PORT && end <= DEFAULT_MAX_PORT && start <= end ? [start, end] : [];
}

export function probeInstance(port, { requestImpl = request, timeoutMs = 300 } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => { if (!settled) { settled = true; resolve(value); } };
    let req;
    try {
      req = requestImpl({ hostname: '127.0.0.1', port, path: '/api/version-info', timeout: timeoutMs }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { body += chunk; if (body.length > 16384) { req.destroy(); done(false); } });
        res.on('error', () => done(false));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            done(res.statusCode === 200 && /^\d+\.\d+\.\d+$/.test(data.version || '') && ((data.instanceKind === 'normal' && data.instancePort === port) || data.instanceKind === undefined));
          } catch { done(false); }
        });
      });
      req.on('error', () => done(false));
      req.on('timeout', () => { req.destroy(); done(false); });
      req.end();
    } catch { done(false); }
  });
}

export async function hasOtherNormalInstance({ portRange = normalInstancePortRange(), currentPort, probe = probeInstance } = {}) {
  if (!Array.isArray(portRange) || portRange.length !== 2) return false;
  const ports = Array.from({ length: portRange[1] - portRange[0] + 1 }, (_, i) => portRange[0] + i).filter(port => port !== currentPort);
  const results = await Promise.all(ports.map(port => probe(port)));
  return results.some(Boolean);
}
