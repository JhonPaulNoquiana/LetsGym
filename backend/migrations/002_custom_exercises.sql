ALTER TABLE letsgym.exercises
  ADD COLUMN user_id uuid REFERENCES letsgym.users(id) ON DELETE CASCADE,
  ADD COLUMN archived boolean NOT NULL DEFAULT false,
  ADD COLUMN tracking_type text NOT NULL DEFAULT 'reps' CHECK (tracking_type IN ('reps','seconds'));
CREATE INDEX exercises_user_idx ON letsgym.exercises(user_id);
