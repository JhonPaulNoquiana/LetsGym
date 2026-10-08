ALTER TABLE letsgym.users ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE letsgym.users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON letsgym.users (lower(username));
CREATE TABLE IF NOT EXISTS letsgym.password_reset_codes (
  email text PRIMARY KEY,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE letsgym.password_reset_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON letsgym.password_reset_codes FROM PUBLIC;
