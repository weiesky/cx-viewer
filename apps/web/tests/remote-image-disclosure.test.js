import test from 'node:test';
import assert from 'node:assert/strict';

import { describeRemoteImage, isPrivateRemoteHostname } from '../src/utils/remoteImageDisclosure.js';

test('remote image disclosure omits credentials, query and fragment', () => {
  assert.deepEqual(
    describeRemoteImage('https://user:pass@example.com:8443/path/my%20image.png?token=secret#private'),
    {
      origin: 'https://example.com:8443',
      name: 'my image.png',
      privateNetwork: false,
    },
  );
});

test('remote image disclosure warns for loopback, private and link-local targets', () => {
  for (const host of ['localhost', '127.0.0.2', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.1.1', '::1', 'fd00::1', 'fe80::1']) {
    assert.equal(isPrivateRemoteHostname(host), true, host);
  }
  assert.equal(isPrivateRemoteHostname('example.com'), false);
  assert.equal(describeRemoteImage('http://[::1]/a.png').privateNetwork, true);
  assert.equal(describeRemoteImage('http://[::ffff:127.0.0.1]/a.png').privateNetwork, true);
  assert.equal(describeRemoteImage('http://[::ffff:c0a8:105]/a.png').privateNetwork, true);
});
