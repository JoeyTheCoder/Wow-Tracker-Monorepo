const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createServer } = require('node:http');
const { createApp } = require('./app');

async function startTestServer(t, options) {
  const server = createServer(createApp(options));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('companion snapshot endpoint authenticates, accepts, logs, and returns character data', async (t) => {
  const logLines = [];
  const baseUrl = await startTestServer(t, {
    syncToken: 'local-test-token-change-me',
    log: (line) => logLines.push(line)
  });
  const endpoint = `${baseUrl}/api/companion/snapshot`;
  const headers = {
    authorization: 'Bearer local-test-token-change-me',
    'content-type': 'application/json'
  };
  const payload = {
    name: 'Testmage',
    realm: 'Camelot',
    class: 'MAGE',
    level: 18,
    updatedAt: 1791800000
  };

  const unauthorized = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  assert.equal(unauthorized.status, 401);

  const invalid = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ ...payload, level: 0 }) });
  assert.equal(invalid.status, 400);

  const uploaded = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
  assert.equal(uploaded.status, 200);
  const uploadResult = await uploaded.json();
  assert.equal(uploadResult.ok, true);
  assert.equal(uploadResult.character.name, payload.name);
  assert.equal(uploadResult.character.level, payload.level);
  assert.equal(uploadResult.character.updatedAt, payload.updatedAt);
  assert.ok(Number.isFinite(Date.parse(uploadResult.character.receivedAt)));
  assert.match(logLines[0], /Testmage \| level 18/);

  const listed = await fetch(endpoint, { headers: { authorization: headers.authorization } });
  assert.equal(listed.status, 200);
  const listResult = await listed.json();
  assert.equal(listResult.count, 1);
  assert.equal(listResult.characters[0].realm, payload.realm);

  const stale = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ ...payload, level: 17, updatedAt: payload.updatedAt - 1 }) });
  assert.equal(stale.status, 409);
});

test('companion endpoint stays unavailable until a sync token is configured', async (t) => {
  const baseUrl = await startTestServer(t, { syncToken: '', log: () => {} });
  const response = await fetch(`${baseUrl}/api/companion/snapshot`, {
    headers: { authorization: 'Bearer local-test-token-change-me' }
  });
  assert.equal(response.status, 503);
});
