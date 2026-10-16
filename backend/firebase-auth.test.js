const assert = require('node:assert/strict');
const express = require('express');
const { test } = require('node:test');
const { createServer } = require('node:http');
const { createFirebaseAuthMiddleware } = require('./firebase-auth');

async function startServer(t, verifyIdToken) {
  const app = express();
  app.get('/private', createFirebaseAuthMiddleware({ verifyIdToken }), (req, res) => {
    res.json({ uid: req.auth.uid, emailVerified: req.auth.emailVerified });
  });
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  return `http://127.0.0.1:${server.address().port}/private`;
}

test('Firebase middleware rejects missing and invalid bearer tokens without leaking verifier errors', async (t) => {
  const url = await startServer(t, async (token) => {
    if (token !== 'valid-token') throw new Error('sensitive verifier detail');
    return { uid: 'firebase-user-1', email_verified: true };
  });

  const missing = await fetch(url);
  assert.equal(missing.status, 401);
  assert.equal((await missing.json()).error.code, 'AUTH_REQUIRED');

  const invalid = await fetch(url, { headers: { authorization: 'Bearer invalid-token' } });
  assert.equal(invalid.status, 401);
  const invalidBody = await invalid.json();
  assert.equal(invalidBody.error.code, 'INVALID_AUTH');
  assert.equal(JSON.stringify(invalidBody).includes('sensitive verifier detail'), false);
});

test('Firebase middleware exposes only verified uid and email verification status', async (t) => {
  const url = await startServer(t, async (token) => {
    assert.equal(token, 'valid-token');
    return { uid: 'firebase-user-2', email: 'private@example.test', email_verified: false };
  });

  const response = await fetch(url, { headers: { authorization: 'Bearer valid-token' } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { uid: 'firebase-user-2', emailVerified: false });
});
