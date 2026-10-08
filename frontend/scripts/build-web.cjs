const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { load } = require('@expo/env');

process.env.NODE_ENV = 'production';
load(process.cwd());

// Public configuration is embedded in the browser bundle at build time.
// Refuse a deployment that would send users to localhost or an insecure API.
let apiUrl;
try {
  apiUrl = new URL(process.env.EXPO_PUBLIC_API_URL);
} catch {
  throw new Error('Set EXPO_PUBLIC_API_URL to the deployed HTTPS backend URL.');
}
if (
  apiUrl.protocol !== 'https:' ||
  apiUrl.username || apiUrl.password ||
  apiUrl.pathname !== '/' || apiUrl.search || apiUrl.hash ||
  apiUrl.hostname === 'localhost' || apiUrl.hostname.endsWith('.localhost')
) {
  throw new Error('EXPO_PUBLIC_API_URL must be an HTTPS origin without credentials, /api, or a query.');
}

const expoCli = path.join(path.dirname(require.resolve('expo/package.json')), 'bin/cli');
const result = spawnSync(process.execPath, [expoCli, 'export', '--platform', 'web', '--max-workers', '2'], {
  stdio: 'inherit',
  env: process.env,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
