const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

function createFirebaseIdTokenVerifier({
  projectId = process.env.FIREBASE_PROJECT_ID,
  serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS,
} = {}) {
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID must be configured before Firebase auth is used.');
  }
  if (!serviceAccountPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS must point to the Firebase service-account file.');
  }

  const app = getApps().find((candidate) => candidate.name === 'sapphirix-api')
    ?? initializeApp({ credential: cert(require(serviceAccountPath)), projectId }, 'sapphirix-api');
  const auth = getAuth(app);
  return (token) => auth.verifyIdToken(token, true);
}

function createFirebaseAuthMiddleware({ verifyIdToken }) {
  if (typeof verifyIdToken !== 'function') {
    throw new TypeError('verifyIdToken must be a function.');
  }

  return async function firebaseAuthMiddleware(req, res, next) {
    const authorization = req.get('authorization') || '';
    const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
    if (!match) {
      return res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Sign-in is required.' } });
    }

    try {
      const decoded = await verifyIdToken(match[1]);
      if (!decoded || typeof decoded.uid !== 'string' || decoded.uid.length === 0) {
        return res.status(401).json({ error: { code: 'INVALID_AUTH', message: 'The sign-in token is invalid.' } });
      }
      req.auth = { uid: decoded.uid, emailVerified: decoded.email_verified === true };
      return next();
    } catch {
      return res.status(401).json({ error: { code: 'INVALID_AUTH', message: 'The sign-in token is invalid or expired.' } });
    }
  };
}

module.exports = { createFirebaseAuthMiddleware, createFirebaseIdTokenVerifier };
