CREATE SCHEMA IF NOT EXISTS letsgym;
REVOKE ALL ON SCHEMA letsgym FROM PUBLIC;

CREATE TABLE IF NOT EXISTS letsgym.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL,
  goal text NOT NULL DEFAULT 'Build muscle',
  experience text NOT NULL DEFAULT 'Beginner',
  timezone text NOT NULL DEFAULT 'Asia/Manila',
  rest_seconds integer NOT NULL DEFAULT 90 CHECK (rest_seconds BETWEEN 15 AND 600),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS letsgym.auth_sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES letsgym.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON letsgym.auth_sessions(user_id);
CREATE TABLE IF NOT EXISTS letsgym.exercises (
  id text PRIMARY KEY,
  name text NOT NULL,
  muscle text NOT NULL,
  equipment text NOT NULL,
  instructions jsonb NOT NULL,
  illustration text NOT NULL
);
CREATE TABLE IF NOT EXISTS letsgym.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES letsgym.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  exercises jsonb NOT NULL,
  is_template boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((is_template AND user_id IS NULL) OR (NOT is_template AND user_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS workouts_user_idx ON letsgym.workouts(user_id);
CREATE TABLE IF NOT EXISTS letsgym.schedules (
  user_id uuid NOT NULL REFERENCES letsgym.users(id) ON DELETE CASCADE,
  effective_on date NOT NULL,
  days jsonb NOT NULL,
  PRIMARY KEY (user_id, effective_on)
);
CREATE TABLE IF NOT EXISTS letsgym.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES letsgym.users(id) ON DELETE CASCADE,
  workout_id uuid REFERENCES letsgym.workouts(id) ON DELETE SET NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'discarded')),
  exercises jsonb NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  local_date date NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_workout_per_user ON letsgym.workout_sessions(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS workout_sessions_user_date_idx ON letsgym.workout_sessions(user_id, local_date);

-- This private schema is accessed through Express only, never the public Data API.
-- Default-deny RLS also protects against accidental future schema exposure.
ALTER TABLE letsgym.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE letsgym.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE letsgym.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE letsgym.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE letsgym.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE letsgym.workout_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA letsgym FROM PUBLIC;
