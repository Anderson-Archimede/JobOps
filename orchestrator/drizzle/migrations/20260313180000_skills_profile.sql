-- Skills DNA: skills_profile table (one row per user)
CREATE TABLE IF NOT EXISTS skills_profile (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skills JSONB DEFAULT '[]',
  gap_analysis JSONB DEFAULT '[]',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  gap_analysis_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS skills_profile_user_id_unique ON skills_profile(user_id);
