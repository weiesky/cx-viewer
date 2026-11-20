// Isolated 51-session + one-session projects for real pagination/selector QA.
import './b2-workspace-gui.mjs';
const source = new URL('../../packages/app/', import.meta.url);
const sdk = await import(new URL('lib/sdk-manager.js', source));
const server = await import(new URL('server.js', source));
const interceptor = await import(new URL('interceptor.js', source));
const sessions = sdk.listSdkSessions();
for (let project = 0; project < 2; project++) {
  for (let index = 0; index < (project ? 1 : 51); index++) {
    const id = `b3-picker-${project}-${String(index).padStart(2, '0')}`;
    const result = interceptor.appendLogEntry({ timestamp: new Date(Date.UTC(2026, 10, 20, 0, index)).toISOString(),
      url: 'codex://b3/picker', mainAgent: true, _sdkSource: true,
      body: { model: 'fixture', input: [{ type: 'message', role: 'user', content: id }],
        metadata: { cwd: sessions[project].cwd, thread_id: id } },
      response: { status: 200, body: { content: [{ type: 'text', text: `${id} done` }] } } },
    { source: 'sdk', cwd: sessions[project].cwd, sessionId: id, threadId: id });
    if (!result.accepted) throw new Error(result.error?.message || 'fixture write rejected');
  }
}
for (const session of sessions) {
  const page = await (await fetch(`http://127.0.0.1:${server.getPort()}/api/local-logs?page=1&instance=${session.instanceKey}`)).json();
  console.log(JSON.stringify({ pickerReady: true, instance: session.instanceKey, project: page._currentProject,
    total: page.total, rows: page.items.length, projects: page._allProjects }));
}
