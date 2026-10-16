const crypto = require('node:crypto');
const express = require('express');
require('dotenv').config({ quiet: true });

function createApp({ syncToken = process.env.COMPANION_SYNC_TOKEN || '', log = console.log, snapshots = new Map() } = {}) {
  const app = express();
  app.use(express.json({ limit: '16kb', strict: true }));

  app.get('/', (_req, res) => {
    res.json({ name: 'Sapphirix Party Planner API', status: 'ok' });
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const authenticateCompanion = (req, res, next) => {
    if (!syncToken) {
      return res.status(503).json({ error: 'Companion sync is not configured on this server.' });
    }

    const authorization = req.get('authorization') || '';
    const match = /^Bearer\s+(.+)$/i.exec(authorization);
    if (!match) {
      return res.status(401).json({ error: 'A valid bearer token is required.' });
    }

    const expected = Buffer.from(syncToken, 'utf8');
    const provided = Buffer.from(match[1], 'utf8');
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
      return res.status(401).json({ error: 'A valid bearer token is required.' });
    }

    next();
  };

  app.post('/api/companion/snapshot', authenticateCompanion, (req, res) => {
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'Content-Type must be application/json.' });
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object.' });
    }

    const name = readText(body.name, 64);
    const realm = readText(body.realm, 64, true);
    const characterClass = readText(body.class, 32, true);
    const level = body.level;
    const updatedAt = body.updatedAt;

    if (!name || realm === null || characterClass === null) {
      return res.status(400).json({ error: 'name is required; realm and class must be strings when supplied.' });
    }
    if (!Number.isInteger(level) || level < 1 || level > 1000) {
      return res.status(400).json({ error: 'level must be an integer between 1 and 1000.' });
    }
    if (!Number.isSafeInteger(updatedAt) || updatedAt <= 0) {
      return res.status(400).json({ error: 'updatedAt must be a positive Unix timestamp in seconds.' });
    }

    const receivedAt = new Date().toISOString();
    const key = `${realm.toLocaleLowerCase('en-US')}\u0000${name.toLocaleLowerCase('en-US')}`;
    const previous = snapshots.get(key);
    if (previous && updatedAt < previous.updatedAt) {
      return res.status(409).json({ error: 'This snapshot is older than the latest saved character data.' });
    }

    const snapshot = { name, realm, class: characterClass, level, updatedAt, receivedAt };
    snapshots.set(key, snapshot);

    log(`[companion] ${receivedAt} | ${realm || 'Unknown realm'} - ${name} | level ${level}`);
    return res.status(200).json({ ok: true, character: snapshot });
  });

  app.get('/api/companion/snapshot', authenticateCompanion, (_req, res) => {
    const characters = [...snapshots.values()].sort((left, right) =>
      left.realm.localeCompare(right.realm) || left.name.localeCompare(right.name));
    res.json({ count: characters.length, characters });
  });

  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body is too large.' });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body contains invalid JSON.' });
    }
    return res.status(500).json({ error: 'Unexpected server error.' });
  });

  return app;
}

function readText(value, maxLength, optional = false) {
  if (value === undefined && optional) return '';
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (text.length > maxLength || (!optional && text.length === 0)) return null;
  return text;
}

const app = createApp();

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  app.listen(port, host, () => {
    console.log(`Server listening on http://${host}:${port}`);
    if (!process.env.COMPANION_SYNC_TOKEN) {
      console.warn('Legacy companion sync is disabled until COMPANION_SYNC_TOKEN is configured.');
    }
  });
}

module.exports = { app, createApp };
