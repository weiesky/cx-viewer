import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2] || 'server-hang';

if (mode === 'leaf') {
  process.on('SIGTERM', () => {});
  setInterval(() => {}, 1000);
} else if (mode === 'tree-parent') {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'leaf'], {
    stdio: 'ignore',
  });
  process.on('SIGTERM', () => process.exit(0));
  process.send?.({ type: 'ready', childPid: child.pid });
  setInterval(() => {}, 1000);
} else {
  const server = createServer();
  let port = 7099;
  const listen = () => {
    server.once('error', error => {
      if (error.code === 'EADDRINUSE' && port > 7008) {
        port--;
        listen();
      } else {
        throw error;
      }
    });
    server.listen(port, '127.0.0.1', () => process.send?.({ type: 'ready', port }));
  };
  process.on('SIGTERM', () => {
    server.close(() => process.send?.({ type: 'port-closed' }));
  });
  setInterval(() => {}, 1000);
  listen();
}
