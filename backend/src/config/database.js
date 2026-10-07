import pg from 'pg';
import { config } from './env.js';
import { readFileSync, existsSync } from 'node:fs';

// DATE is a calendar day, not an instant. Keep it as YYYY-MM-DD so the host's
// timezone cannot shift schedules or streaks to the previous day.
pg.types.setTypeParser(1082, (value) => value);

export function createDatabase() {
  if (!config.databaseUrl)
    throw new Error(
      'Set DATABASE_URL in backend/.env before starting the server.',
    );
  const url = new URL(config.databaseUrl);
  for (const key of ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
    url.searchParams.delete(key);
  }
  if (/YOUR.PASSWORD|\[.*\]|<.*>/i.test(decodeURIComponent(url.password))) {
    throw new Error(
      'Replace the database password placeholder in backend/.env.',
    );
  }
  const certPath = new URL('../../certs/supabase-ca.crt', import.meta.url);
  const ca = existsSync(certPath) ? readFileSync(certPath, 'utf8') : undefined;
  // TLS verifies the Supabase certificate. Do not disable verification.
  const pool = new pg.Pool({
    connectionString: url.toString(),
    ssl: /supabase\.(co|com)$/.test(url.hostname)
      ? { rejectUnauthorized: true, ...(ca ? { ca } : {}) }
      : undefined,
    max: 10,
    connectionTimeoutMillis: 10000,
    statement_timeout: 15000,
  });
  pool.on('error', (error) =>
    console.error('Idle database connection closed:', error.code || error.name),
  );
  return pool;
}
