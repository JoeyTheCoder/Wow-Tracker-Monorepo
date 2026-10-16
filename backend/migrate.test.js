const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { migrate } = require('./migrate');

function createFakePool() {
  const applied = new Set();
  const executed = [];
  return {
    applied,
    executed,
    async connect() {
      return {
        async query(sql, values = []) {
          if (/SELECT 1 FROM schema_migrations/.test(sql)) {
            return { rowCount: applied.has(values[0]) ? 1 : 0 };
          }
          if (/^INSERT INTO schema_migrations/.test(sql)) applied.add(values[0]);
          else if (!/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql.trim())
            && !/pg_advisory_(lock|unlock)|CREATE TABLE IF NOT EXISTS schema_migrations|SELECT 1 FROM schema_migrations/i.test(sql)) {
            executed.push(sql.trim());
          }
          return { rowCount: 1 };
        },
        release() {}
      };
    }
  };
}

test('migration runner applies ordered SQL files once and records them', async (t) => {
  const migrationsDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sapphirix-migrations-'));
  t.after(() => fs.rm(migrationsDirectory, { recursive: true, force: true }));
  await fs.writeFile(path.join(migrationsDirectory, '002_second.sql'), 'SELECT 2;');
  await fs.writeFile(path.join(migrationsDirectory, '001_first.sql'), 'SELECT 1;');
  await fs.writeFile(path.join(migrationsDirectory, 'not-a-migration.txt'), 'ignored');
  const pool = createFakePool();

  await migrate(pool, migrationsDirectory);
  await migrate(pool, migrationsDirectory);

  assert.deepEqual([...pool.applied], ['001_first.sql', '002_second.sql']);
  assert.deepEqual(pool.executed, ['SELECT 1;', 'SELECT 2;']);
});
