-- Skills DNA history: monthly snapshots for "Évolution dans le temps"
CREATE TABLE IF NOT EXISTS skills_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  skills JSONB DEFAULT '[]',
  category_averages JSONB
);

CREATE INDEX IF NOT EXISTS skills_history_user_snapshot_idx ON skills_history(user_id, snapshot_at);
