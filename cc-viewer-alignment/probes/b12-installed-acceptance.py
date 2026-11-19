"""Run against an isolated, production-installed package, never a live owner.

Usage: python3 b12-installed-acceptance.py /isolated/node_modules/cx-viewer
Requires Node and installed package dependencies. Uses only synthetic secrets,
temporary HOME/CODEX_HOME, disabled IM and loopback HTTP; no model/network calls.
Keeps private evidence and result.json in the printed temporary directory.
"""
import base64
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

package = Path(sys.argv[1]).resolve(strict=True)
base = Path(tempfile.mkdtemp(prefix="cxv-b12-acceptance-")).resolve()
owner = base / "logs"
proxy_owner = base / "shared-proxy"
home = base / "home"
for directory in (owner, proxy_owner, home):
    directory.mkdir(mode=0o700)
profile = proxy_owner / "custom-profile.json"
env = {**os.environ, "HOME": str(home), "CODEX_HOME": str(home / "codex"),
       "CXV_LOG_DIR": str(owner), "CXV_PROXY_PROFILE_PATH": str(profile),
       "CXV_TEST": "1", "CXV_CLI_MODE": "1", "CXV_WORKSPACE_MODE": "1",
       "CXV_PROJECT_DIR": str(home)}
for name in ("CXV_BYPASS_PERMISSIONS", "CXV_TLS_CERT", "CXV_TLS_KEY", "CXV_IM_WORKER"):
    env.pop(name, None)


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    path.write_text(json.dumps(data))
    path.chmod(0o600)


def node(source, **extra):
    result = subprocess.run(["node", "--input-type=module", "-e", source],
                            cwd=package, env={**env, **extra},
                            capture_output=True, text=True, timeout=45)
    assert result.returncode == 0, result.stderr
    return result.stdout


def cli(script, args, rejected=False):
    result = subprocess.run(["node", str(package / "scripts" / script), *args],
                            cwd=package, env=env, capture_output=True, text=True, timeout=45)
    assert result.returncode == (1 if rejected else 0), result.stderr
    return json.loads(result.stderr if rejected else result.stdout)


def tree(directory):
    return {str(path.relative_to(directory)): path.read_bytes()
            for path in directory.rglob("*") if path.is_file()}


def snapshot(directory, sources):
    return node("""
import { createCredentialBackup, readCredentialBackup } from './lib/credential-backup.js';
const sources = JSON.parse(process.env.PROBE_SOURCES);
const path = createCredentialBackup(process.env.PROBE_OWNER, sources);
const saved = readCredentialBackup(path, { ownerDirectory: process.env.PROBE_OWNER, sources });
if (saved.get('private-credentials-v1/master.key')?.length !== 32) throw Error('Missing post-migration key');
console.log(path);
""", PROBE_OWNER=str(directory), PROBE_SOURCES=json.dumps(sources)).strip()


write(owner / "preferences.json", {"theme": "old", "auth": {
    "enabled": True, "password": base64.b64encode(b"old-auth").decode(), "revision": 4}})
document = {"version": 3, "active": "third", "profiles": [{"id": "max", "name": "Default"}, {
    "id": "third", "name": "Provider", "baseURL": "https://provider.invalid/v1",
    "apiKey": "old-profile", "wireApi": "responses"}]}
write(profile, document)
write(Path(str(profile) + ".bak"), document)
write(owner / "im/dingtalk/config.json", {"version": 1, "enabled": False,
      "appKey": "old-app", "appSecret": "old-im"})

migrations = {}
for kind, args, directory in [
    ("auth", ["--root", str(owner)], owner),
    ("proxy", ["--profile", str(profile)], proxy_owner),
    ("im", ["--root", str(owner)], owner),
]:
    before = tree(directory)
    cli("migrate-" + kind + "-credentials.mjs", args)
    assert tree(directory) == before, "Migration inspection wrote files"
    migrations[kind] = cli("migrate-" + kind + "-credentials.mjs", args + ["--apply", "--confirm-stopped"])
    assert migrations[kind]["status"] == "migrated"

# Both independently owned stores get a matching post-migration key backup.
sources = ["preferences.json", "im/dingtalk/config.json"]
normal = snapshot(owner, sources)
proxy_sources = [profile.name, profile.name + ".bak"]
proxy_normal = snapshot(proxy_owner, proxy_sources)
assert (owner / "private-credentials-v1/master.key").read_bytes() != (proxy_owner / "private-credentials-v1/master.key").read_bytes()

node("""
import { saveAuthConfig } from './lib/auth.js';
import { saveDingTalkImConfig } from './lib/dingtalk-im-config.js';
import { createProxyProfileCredentials } from './lib/proxy-profile-credentials.js';
import { migrateProxyCredentials } from './lib/proxy-credential-migration.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
saveAuthConfig({enabled:true,password:'new-auth'});
saveDingTalkImConfig({enabled:false,appKey:'new-app',appSecret:'new-im'});
const path = process.env.CXV_PROXY_PROFILE_PATH;
const c = createProxyProfileCredentials(path), state = c.read(), backup = c.readBackup();
const next = {...state.data, profiles:state.data.profiles.map(p=>p.id==='max'?p:{...p,apiKey:'new-profile'})};
c.save(next,state.document,backup.document,stored=>{
  writeFileSync(path+'.bak',state.raw,{mode:0o600});
  writeFileSync(path,JSON.stringify(stored),{mode:0o600});
});
next.profiles[1].apiKey='post-backup-owner';
const other=join(dirname(path),'other-profile.json');
writeFileSync(other,JSON.stringify(next),{mode:0o600});
migrateProxyCredentials(other,{confirmStopped:true});
const prefs=join(process.env.CXV_LOG_DIR,'preferences.json');
const doc=JSON.parse(readFileSync(prefs));doc.theme='new';
writeFileSync(prefs,JSON.stringify(doc),{mode:0o600});
""")

runtime = """
import assert from 'node:assert/strict';
import { loadAuthConfig } from './lib/auth.js';
import { loadDingTalkImConfig } from './lib/dingtalk-im-config.js';
import { createProxyProfileCredentials } from './lib/proxy-profile-credentials.js';
import { join, dirname } from 'node:path';
assert.equal(loadAuthConfig().password,process.env.EXPECT_AUTH || 'new-auth');
assert.equal(loadDingTalkImConfig().appSecret,'new-im');
for(const [file,secret] of [['custom-profile.json','new-profile'],['other-profile.json','post-backup-owner']])
  assert.equal(createProxyProfileCredentials(join(dirname(process.env.CXV_PROXY_PROFILE_PATH),file)).read().data.profiles[1].apiKey,secret);
"""
node(runtime)

http_probe = """
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { request } from 'node:http';
const portProbe=createServer();
await new Promise(r=>portProbe.listen(0,'127.0.0.1',r));
const port=portProbe.address().port;await new Promise(r=>portProbe.close(r));
process.env.CXV_START_PORT=String(port);process.env.CXV_MAX_PORT=String(port);
const server=await import('./server.js');
const interceptor=await import('./interceptor.js');
const call=(path,body,headers={})=>new Promise((resolve,reject)=>{
 const req=request({hostname:'127.0.0.1',port,path,method:body?'POST':'GET',headers:{'Content-Type':'application/json',...headers}},res=>{
  let text='';res.on('data',b=>text+=b);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}));
 });req.on('error',reject);if(body)req.write(JSON.stringify(body));req.end();
});
try {
 await server.startViewer();
 assert.equal(server.getPort(),port);
 const damaged=process.env.PROBE_DAMAGED==='1';
 const local=await call('/api/auth/state');assert.equal(local.status,200);
 assert.equal(JSON.parse(local.text).passwordUnreadable,damaged);
 const login=await call('/api/auth/login',{password:'new-auth'});
 assert.equal(login.status,damaged?409:200);
 const remoteHeaders={Host:'viewer.invalid:'+port};
 assert.equal((await call('/api/auth/state',null,remoteHeaders)).status,403);
 if(!damaged){
  const cookie=login.headers['set-cookie'][0].split(';')[0];
  const remote=await call('/api/auth/state',null,{...remoteHeaders,Cookie:cookie});
  assert.equal(remote.status,200);assert.equal(JSON.parse(remote.text).password,null);
  assert.ok(!remote.text.includes('new-auth'));
 }else{
  assert.equal((await call('/api/auth/config',{scope:'global',password:'replace',enabled:true})).status,409);
 }
}finally{
 await server.stopViewer();await interceptor.closeLogV2Writes();interceptor._stopProxyProfileWatchForTests();
}
process.exit(0);
"""
node(http_probe)

for directory, backup, names in [(owner, normal, sources), (proxy_owner, proxy_normal, proxy_sources)]:
    key_path = directory / "private-credentials-v1/master.key"
    key = key_path.read_bytes()
    key_path.unlink()
    if directory == owner:
        node(http_probe, PROBE_DAMAGED="1")
    before = tree(directory)
    args = ["--root", str(directory), "--backup", backup]
    for name in names:
        args += ["--source", name]
    assert cli("repair-credential-key.mjs", args)["status"] == "repairable"
    assert tree(directory) == before
    result = cli("repair-credential-key.mjs", args + ["--apply", "--confirm-stopped"])
    assert result["status"] == "repaired"
    assert key_path.read_bytes() == key
    for name, data in before.items():
        assert (directory / name).read_bytes() == data, "Repair rewrote current bytes"
    current = tree(directory)
    assert cli("repair-credential-key.mjs", args + ["--apply", "--confirm-stopped"])["status"] == "healthy"
    assert tree(directory) == current
node(runtime)
node(http_probe)

# Restore auth only: whole preferences roll back while later IM/proxy stay live.
other_before = tree(proxy_owner)
restore_args = ["--root", str(owner), "--type", "auth", "--backup", migrations["auth"]["backupPath"]]
before = tree(owner)
assert cli("restore-credentials.mjs", restore_args)["status"] == "preview"
assert tree(owner) == before
assert cli("restore-credentials.mjs", restore_args + ["--apply", "--confirm-stopped"])["status"] == "restored"
assert tree(proxy_owner) == other_before
assert json.loads((owner / "preferences.json").read_text())["theme"] == "old"
node(runtime, EXPECT_AUTH="old-auth")

# Unrecoverable ciphertext follows the chosen refusal/evidence policy.
store_path = owner / "private-credentials-v1/credentials.json"
damaged = json.loads(store_path.read_bytes())
refs = list(damaged["creds"])
assert len(refs) > 1
damaged["creds"][refs[0]], damaged["creds"][refs[-1]] = damaged["creds"][refs[-1]], damaged["creds"][refs[0]]
write(store_path, damaged)
before = tree(owner)
args = ["--root", str(owner), "--backup", normal]
for name in sources:
    args += ["--source", name]
assert cli("repair-credential-key.mjs", args + ["--apply", "--confirm-stopped"], rejected=True)["code"] == "CREDENTIAL_KEY_REPAIR_UNREADABLE"
assert tree(owner) == before
cli("restore-credentials.mjs", restore_args + ["--apply", "--confirm-stopped"], rejected=True)
assert tree(owner) == before
capture_args = ["--root", str(owner)]
for name in sources:
    capture_args += ["--source", name]
assert cli("capture-credential-damage.mjs", capture_args)["status"] == "evidence-preview"
assert tree(owner) == before
evidence = Path(cli("capture-credential-damage.mjs", capture_args + ["--apply", "--confirm-stopped"])["evidencePath"])
assert json.loads((evidence / "manifest.json").read_text())["purpose"] == "damaged-store-evidence-v1"
for name in sources + ["private-credentials-v1/credentials.json", "private-credentials-v1/master.key"]:
    assert (evidence / name).read_bytes() == before[name]
    assert (owner / name).read_bytes() == before[name]
for path in evidence.rglob("*"):
    if os.name != "nt":
        assert path.stat().st_mode & 0o077 == 0, "Evidence is not private"
cli("restore-credentials.mjs", ["--root", str(owner), "--type", "auth", "--backup", str(evidence)], rejected=True)
assert tree(proxy_owner) == other_before
result = {"package": str(package), "separate_owners_and_post_migration_backups": "passed",
          "migration_and_recovery_previews_read_only": "passed", "fresh_process_runtime": "passed",
          "installed_http_login_and_damaged_key_refusal": "passed", "key_repair_preserves_later_bytes": "passed",
          "auth_whole_preferences_restore_preserves_other_owners": "passed",
          "damaged_ciphertext_refused_and_private_evidence_saved": "passed",
          "real_user_migration": "not_run", "real_model_and_dingtalk_network": "not_run"}
write(base / "result.json", result)
print(json.dumps({"evidence": str(base), **result}, indent=2))
