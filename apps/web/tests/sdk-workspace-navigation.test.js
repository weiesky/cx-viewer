import test from 'node:test';
import assert from 'node:assert/strict';
import { sdkWorkspaceAfterClose, sdkWorkspacePageUrl, sdkWorkspaceScope } from '../src/utils/sdkWorkspaceNavigation.js';

test('workspace navigation preserves login/base path but leaves old history and selector mode', () => {
  const page = new URL(sdkWorkspacePageUrl('https://viewer.example/base/?token=secret&instance=a&workspaces=1&logfile=old&resume=1', 'b'));
  assert.equal(page.pathname, '/base/');
  assert.equal(page.searchParams.get('token'), 'secret');
  assert.equal(page.searchParams.get('instance'), 'b');
  assert.equal(page.searchParams.has('workspaces'), false);
  assert.equal(page.searchParams.has('logfile'), false);
  assert.equal(page.searchParams.has('resume'), false);
  const canonical = new URL(sdkWorkspacePageUrl('https://viewer.example/base/?logfile=history', 'a', { preserveLogfile: true }));
  assert.equal(canonical.searchParams.get('logfile'), 'history');
});

test('opening the workspace picker does not select or stop a resident session', () => {
  const page = new URL(sdkWorkspacePageUrl('http://viewer.example/?token=secret&instance=a', null));
  assert.equal(page.searchParams.get('workspaces'), '1');
  assert.equal(page.searchParams.has('instance'), false);
  assert.equal(page.searchParams.get('token'), 'secret');
});

test('closing a background tab never navigates the current browser to another workspace', () => {
  assert.equal(sdkWorkspaceAfterClose('a', 'b', 'c'), undefined);
  assert.equal(sdkWorkspaceAfterClose(null, 'a', 'b'), undefined);
  assert.equal(sdkWorkspaceAfterClose('a', 'a', 'b'), 'b');
  assert.equal(sdkWorkspaceAfterClose('a', 'a', null), null);
});

test('view identity includes exact instances, selector and archive but excludes a login token rotation', () => {
  const scope = sdkWorkspaceScope('https://viewer.example/base/?instance=a&token=old');
  assert.equal(scope, sdkWorkspaceScope('https://viewer.example/base/?instance=a&token=new'));
  for (const search of ['instance=b', 'workspaces=1', 'instance=a&logfile=archive']) {
    assert.notEqual(scope, sdkWorkspaceScope(`https://viewer.example/base/?${search}`));
  }
});
