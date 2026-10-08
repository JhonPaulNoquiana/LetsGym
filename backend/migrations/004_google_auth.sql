-- Keep existing user IDs and all workout history when adopting Google sign-in.
ALTER TABLE letsgym.users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE letsgym.users ADD COLUMN IF NOT EXISTS supabase_auth_id uuid UNIQUE;
ALTER TABLE letsgym.users ADD COLUMN IF NOT EXISTS google_subject text UNIQUE;
