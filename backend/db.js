const { Pool } = require('pg');

function createPool({ connectionString = process.env.DATABASE_URL, ssl = process.env.DATABASE_SSL === 'true' } = {}) {
  if (!connectionString) {
    throw new Error('DATABASE_URL must be configured before using PostgreSQL.');
  }

  return new Pool({
    connectionString,
    ssl: ssl ? { rejectUnauthorized: true } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });
}

async function checkDatabase(pool) {
  await pool.query('SELECT 1');
  return true;
}

module.exports = { createPool, checkDatabase };
