import { readFile, readdir } from 'node:fs/promises';
import { createDatabase } from '../src/config/database.js';
import { seed } from '../src/services/seed.js';

const db = createDatabase();
try {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(718241)');
    await client.query('CREATE SCHEMA IF NOT EXISTS letsgym');
    await client.query(
      'CREATE TABLE IF NOT EXISTS letsgym.migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const directory = new URL('../migrations/', import.meta.url);
    for (const file of (await readdir(directory))
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      const applied = await client.query(
        'SELECT name FROM letsgym.migrations WHERE name = $1',
        [file],
      );
      if (!applied.rowCount) {
        await client.query(await readFile(new URL(file, directory), 'utf8'));
        await client.query(
          'INSERT INTO letsgym.migrations (name) VALUES ($1)',
          [file],
        );
        console.log(`Applied ${file}`);
      }
    }
    await seed(client);
    await client.query('COMMIT');
    console.log('Database ready.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} catch (error) {
  console.error(
    'Database setup failed. Check DATABASE_URL, database availability, and TLS settings.',
  );
  console.error(`Error code: ${error.code || 'CONNECTION_ERROR'}`);
  process.exitCode = 1;
} finally {
  await db.end();
}
