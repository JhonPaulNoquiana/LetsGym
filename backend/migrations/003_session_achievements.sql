ALTER TABLE letsgym.workout_sessions
  ADD COLUMN achievements jsonb NOT NULL DEFAULT '[]'::jsonb;
