# Supabase TLS certificate

Download your database CA certificate from **Supabase → Database Settings →
SSL Configuration** and save it here as `supabase-ca.crt`.

The backend automatically loads this file and verifies both the certificate
chain and hostname. The certificate is public; it is not a database password.

See [Supabase SSL documentation](https://supabase.com/docs/guides/platform/ssl-enforcement).
