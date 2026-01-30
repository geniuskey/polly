-- Add XP and Level system to users table
ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN last_daily_bonus DATE;

-- XP history table for tracking
CREATE TABLE IF NOT EXISTS xp_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_xp_history_user ON xp_history(user_id);
