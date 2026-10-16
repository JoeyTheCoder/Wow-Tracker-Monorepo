const fs = require('node:fs/promises');
const path = require('node:path');
require('dotenv').config({ quiet: true });
const { createPool } = require('./db');

async function migrate(pool, migrationsDirectory = path.join(__dirname, 'migrations')) {
  const client = await pool.connect();
  let lockAcquired = false;
  try {
    await client.query('SELECT pg_advisory_lock($1)', [73519422001]);
    lockAcquired = true;
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const files = (await fs.readdir(migrationsDirectory))
      .filter((file) => /^\d+_[a-z0-9_-]+\.sql$/i.test(file))
      .sort();

    for (const name of files) {
      const alreadyApplied = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
      if (alreadyApplied.rowCount > 0) continue;

      const sql = await fs.readFile(path.join(migrationsDirectory, name), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
        console.log(`Applied migration ${name}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${name} failed: ${error.message}`, { cause: error });
      }
    }
  } finally {
    try {
      if (lockAcquired) await client.query('SELECT pg_advisory_unlock($1)', [73519422001]);
    } finally {
      client.release();
    }
  }
}

if (require.main === module) {
  let pool;
  try {
    pool = createPool();
    migrate(pool).catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    }).finally(() => pool.end());
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { migrate };
