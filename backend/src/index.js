import { createApp } from './app.js';
import { createDatabase } from './config/database.js';
import { config } from './config/env.js';

try {
  const db = createDatabase();
  await db.query('SELECT 1 FROM letsgym.users LIMIT 1');
  const server = createApp(db).listen(config.port, '0.0.0.0', () => {
    console.log(`LetsGym API listening on port ${config.port}`);
  });
  const shutdown = () =>
    server.close(() => db.end().then(() => process.exit(0)));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error(
    'Could not start LetsGym. Check backend/.env and run npm run db:migrate.',
  );
  console.error(`Error code: ${error.code || 'CONFIGURATION_ERROR'}`);
  process.exit(1);
}
