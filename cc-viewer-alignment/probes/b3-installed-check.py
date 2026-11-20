import json, os, re, shutil, shlex, socket, subprocess, tempfile, time, urllib.request
from pathlib import Path
repo = Path(__file__).resolve().parents[2]
source = repo / 'packages/app'
base = Path(tempfile.mkdtemp(prefix='cxv-b3-runtime-')).resolve()
home = base / 'home'
home.mkdir()
env = {**os.environ, 'HOME': str(home), 'CODEX_HOME': str(home / 'codex'), 'CXV_TEST': '1', 'CXV_CAPTURE_ONLY': '1', 'CXV_WORKSPACE_MODE': '1', 'CXV_LOG_DIR': str(base / 'logs')}
env.pop('CXV_BYPASS_PERMISSIONS', None)

def run(args, cwd, logfile, timeout=180):
    result = subprocess.run(args, cwd=cwd, env=env, capture_output=True, text=True, timeout=timeout)
    (base / logfile).write_text(result.stdout + result.stderr)
    if result.returncode:
        print(json.dumps({'base': str(base), 'failed': logfile, 'exit': result.returncode}))
        raise SystemExit(result.returncode)
    return result.stdout

pack_output = run(['npm', 'pack', '--json', '--pack-destination', str(base), '--cache', '/tmp/cx-viewer-npm-cache'], source, 'pack.log')
pack = json.loads(pack_output[pack_output.index('[\n'):])[0]
run(['npm', 'install', '--prefix', str(base), '--omit=dev', '--no-audit', '--no-fund', '--cache', '/tmp/cx-viewer-npm-cache', str(base / pack['filename'])], base, 'install.log')
installed = base / 'node_modules/cx-viewer'
files = ['server/lib/ws-mux.js', 'server/lib/error-report.js', 'src/utils/errorReport.js', 'lib/log-v2/materializer.js', 'lib/log-v2/shards.js', 'lib/log-v2/schema.js', 'server.js', 'cli.js', 'src/utils/contentFilter.js', 'src/utils/requestType.js', 'scratch-pty-manager.js', 'proxy.js', 'interceptor.js', 'workspace-registry.js', 'lib/capture-context.js', 'lib/sdk-manager.js', 'lib/sdk-exec-transport.js', 'lib/codex-appserver-client.js', 'lib/appserver-bridge.js', 'lib/codex-thread-source.js', 'lib/log-v2/identity.js', 'lib/log-v2/session-summary.js', 'lib/log-v2/request-summary.js', 'lib/sdk-appserver-transport.js', 'lib/sdk-appserver-approvals.js', 'lib/sdk-appserver-agents.js', 'lib/codex-server-request.js', 'lib/terminal-ws-ping.js', 'lib/sdk-exec-launcher.sh', 'lib/sdk-exec-runner.mjs', 'lib/cli-args.js', 'lib/sdk-adapter.js', 'lib/sdk-resume-history.js', 'lib/log-v2/project-id.js', 'lib/log-v2/writer.js', 'lib/voice-pack-routes.js', 'server/lib/voice-pack-manager.js', 'server/lib/voice-pack-events.js', 'server/lib/approval-modal-prefs.js']
assert all((source / name).read_bytes() == (installed / name).read_bytes() for name in files)
assert os.access(installed / 'lib/sdk-exec-launcher.sh', os.X_OK)
assets = [path.relative_to(source) for path in (source / 'dist').rglob('*') if path.is_file()]
assert assets and all((source / path).read_bytes() == (installed / path).read_bytes() for path in assets)
(installed / 'tests').mkdir(exist_ok=True)
tests = ['frontend-classification.test.js', 'log-v2-identity.test.js', 'log-v2-session-summary.test.js', 'log-v2-request-summary.test.js', 'cli-args.test.js', 'ws-mux.test.js', 'ws-mux-backpressure.test.js', 'ws-mux-routes.test.js', 'log-v2-materializer.test.js', 'log-v2-shards.test.js', 'log-v2-concurrency.test.js', 'sdk-cli-resume.test.js', 'log-v2-resume-watermark.test.js', 'sdk-resume-history.test.js', 'scratch-pty-manager.test.js', 'sdk-manager.test.js', 'codex-appserver-client.test.js', 'sdk-appserver-transport.test.js', 'sdk-appserver-manager.test.js', 'sdk-appserver-approvals.test.js', 'sdk-appserver-agents.test.js', 'sdk-task-state.test.js', 'sdk-process-ownership.test.js', 'sdk-queue.test.js', 'terminal-ws-ping.test.js', 'sdk-session-registry.test.js', 'proxy-lifecycle.test.js', 'proxy-slow-upstream.test.js', 'proxy-workspace-capture.test.js', 'log-v2-project-allocation.test.js', 'sdk-workspace-auth.test.js', 'sdk-workspace-connections.test.js', 'voice-pack-api.test.js']
for name in tests:
    shutil.copyfile(source / 'tests' / name, installed / 'tests' / name)
runtime = run(['node', '--test', '--test-concurrency=1', *['tests/' + name for name in tests]], installed, 'runtime.log', 90)
passed = re.search(r'pass (\d+)', runtime).group(1)
total = re.search(r'tests (\d+)', runtime).group(1)
assert passed == total

run(['python3', str(repo / 'cc-viewer-alignment/probes/b12-installed-acceptance.py'), str(installed)], repo, 'b12-regression.log', 180)
# Boot the installed CLI in an isolated HOME. Fake npm discovery, codex and
# browser-open commands ensure no real model process or user browser is used.
bin_dir = base / 'bin'
bin_dir.mkdir()
global_root = base / 'fake-global'
global_root.mkdir()
for name, body in {
    'npm': 'printf "%s\\n" ' + shlex.quote(str(global_root)) + '\n',
    'codex': 'touch ' + shlex.quote(str(base / 'unexpected-codex-call')) + '\nexit 99\n',
    'open': 'exit 0\n',
}.items():
    path = bin_dir / name
    path.write_text('#!/bin/sh\n' + body)
    path.chmod(0o755)
(bin_dir / 'node').symlink_to(shutil.which('node'))
workspace = base / 'cli-workspace'
(workspace / 'child').mkdir(parents=True)
with socket.socket() as probe:
    probe.bind(('127.0.0.1', 0))
    cli_port = probe.getsockname()[1]
cli_env = {**env, 'PATH': str(bin_dir) + ':/usr/bin:/bin', 'SHELL': '/bin/bash',
           'CXV_START_PORT': str(cli_port), 'CXV_MAX_PORT': str(cli_port)}
log = (base / 'cli-boot.log').open('w')
proc = subprocess.Popen([str(bin_dir / 'node'), str(installed / 'cli.js'), '--sdk', '-C', 'child'],
                        cwd=workspace, env=cli_env, stdout=log, stderr=subprocess.STDOUT)
try:
    deadline = time.monotonic() + 20
    while True:
        assert proc.poll() is None, 'installed CLI exited before readiness'
        try:
            with urllib.request.urlopen('http://127.0.0.1:' + str(cli_port) + '/api/workspaces', timeout=1) as response:
                state = json.load(response)
            if state.get('sessions'):
                break
        except (OSError, ValueError):
            pass
        assert time.monotonic() < deadline, 'installed CLI readiness timeout'
        time.sleep(0.05)
    expected = str(workspace / 'child')
    assert state['sessions'][0]['cwd'] == expected, state
    for endpoint, field in [('project-dir', 'dir'), ('auth/state', 'projectDir')]:
        with urllib.request.urlopen('http://127.0.0.1:' + str(cli_port) + '/api/' + endpoint) as response:
            assert json.load(response)[field] == expected
    assert not (base / 'unexpected-codex-call').exists(), 'boot must not execute a model turn'
finally:
    proc.terminate()
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=5)
    log.close()
result = {'base': str(base), 'files': len(pack['files']), 'source_bytes_match': True, 'web_asset_files': len(assets), 'runtime_tests': passed + '/' + total, 'b12_regression': 'passed', 'installed_cli_relative_cd_boot': 'passed', 'uses_fake_codex': True, 'uses_real_model_network': False}
(base / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
