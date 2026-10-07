import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  quiet: true,
});

export const config = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  origins: (
    process.env.CORS_ORIGINS || 'http://localhost:8081,http://localhost:19006'
  )
    .split(',')
    .map((s) => s.trim()),
};
