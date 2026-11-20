// Isolated browser recovery fixture; run after build, drive via JSON lines on stdin.
// Reuses B2 temporary HOME, fake Codex, server lifecycle and same-name workspaces.
import './b2-workspace-gui.mjs';
import { createInterface } from 'node:readline';
import { Server } from 'node:http';
import WebSocket from 'ws';
const counts = { snapshots: 0, objects: 0, live: 0, resets: 0, muxUpgrades: 0, muxFrames: {}, muxErrors: [] };
const originalSend = WebSocket.prototype.send;
WebSocket.prototype.send = function (data, ...args) {
 try {
  const frame = JSON.parse(String(data));
  const key = frame.name || frame.type;
  if (['frame', 'open-ack', 'error', 'close', 'ping'].includes(frame.type) && key) counts.muxFrames[key] = (counts.muxFrames[key] || 0) + 1;
  if (frame.type === 'error') { counts.muxErrors.push(frame); if (counts.muxErrors.length > 20) counts.muxErrors.shift(); }
 } catch {}
 return originalSend.call(this, data, ...args);
};
const originalEmit = Server.prototype.emit;
Server.prototype.emit = function (event, ...args) {
 if (event === 'upgrade' && args[0].url.split('?')[0] === '/ws/mux') counts.muxUpgrades++;
 if (event === 'request') {
  const [req,res] = args;
  if(req.url.startsWith('/api/log-v2/snapshot')) counts.snapshots++;
  if(req.url.startsWith('/api/log-v2/objects')) counts.objects++;
  if(req.url.startsWith('/api/log-v2/live')) {
   counts.live++; const write=res.write;
   res.write=function(chunk,...rest) { if(String(chunk).includes('event: v2_reset')) counts.resets++; return write.call(this,chunk,...rest); };
  }
 }
 return originalEmit.call(this,event,...args);
};
const source = new URL('../../packages/app/', import.meta.url);
const moduleAt = path => new URL(path, source).href;
const sdk = await import(moduleAt('lib/sdk-manager.js'));
const server = await import(moduleAt('server.js'));
const interceptor = await import(moduleAt('interceptor.js'));
const sessions = sdk.listSdkSessions();
const inputs = new Map();
let seq = 0;
const write = (index, count) => {
 if (!sessions[index] || !Number.isSafeInteger(count) || count < 1 || count > 300) throw new Error('invalid fixture write');
 const session = sessions[index], label = index ? 'B' : 'A';
 const input = inputs.get(index) || [];
 let last;
 for (let i=0;i<count;i++) {
  seq++;
  input.push({type:'message',role:'user',content:`B3 ${label} prompt ${seq}`});
  const text=`B3 ${label} reply ${seq}`;
  last=interceptor.appendLogEntry({timestamp:new Date(Date.UTC(2026,10,20,0,0,seq)).toISOString(),url:'codex://b3/turn',mainAgent:true,_sdkSource:true,
   body:{model:'gpt-test',input:structuredClone(input),metadata:{cwd:session.cwd,thread_id:`b3-${label}`,sdk:'openai-codex-sdk'}},
   response:{status:200,body:{content:[{type:'text',text}]}}},
   {source:'sdk',cwd:session.cwd,sessionId:`b3-${label}`,threadId:`b3-${label}`});
  if (!last.accepted) throw new Error(last.error?.message || 'write rejected');
  input.push({type:'message',role:'assistant',content:text});
 }
 inputs.set(index,input);
 return {label,count,seq,accepted:last.accepted,sessionDir:last.sessionDir,timelineSeq:last.seq};
};
console.log(JSON.stringify({controlReady:true,root:process.env.HOME,sessions,port:server.getPort()}));
for await (const line of createInterface({input:process.stdin})) {
 try {
  const command=JSON.parse(line);
  if(command.kind==='write') console.log(JSON.stringify(write(command.index||0,command.count||1)));
  else if(command.kind==='restart'){await server.stopViewer(); await server.startViewer(); console.log(JSON.stringify({restarted:true,port:server.getPort()}));}
  else if(command.kind==='stats') console.log(JSON.stringify(counts));
  else if(command.kind==='info') console.log(JSON.stringify(interceptor.getLogV2RuntimeStatus()));
 } catch(error){console.log(JSON.stringify({error:error.message}));}
}
