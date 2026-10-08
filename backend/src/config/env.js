import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  quiet: true,
});

export const config = {
  port: Number(process.env.PORT || 3000),
  // Render terminates HTTPS at its reverse proxy. Local requests trust no proxy.
  trustProxyHops: Number(
    process.env.TRUST_PROXY_HOPS || (process.env.RENDER === 'true' ? 1 : 0),
  ),
  databaseUrl: process.env.DATABASE_URL,
  supabaseUrl: process.env.SUPABASE_URL,
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  resetSecret: process.env.PASSWORD_RESET_SECRET,
  smtp: {
    provider: process.env.EMAIL_PROVIDER || 'smtp',
    apiKey: process.env.RESEND_API_KEY,
    appsScriptUrl: process.env.APPS_SCRIPT_URL,
    appsScriptSecret: process.env.APPS_SCRIPT_SECRET,
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || process.env.SMTP_FROM,
  },
  origins: (
    process.env.CORS_ORIGINS || 'http://localhost:8081,http://localhost:19006'
  )
    .split(',')
    .map((s) => s.trim()),
};
