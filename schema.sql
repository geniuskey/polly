-- VotePulse Database Schema
-- Cloudflare D1 (SQLite)

-- ============================================
-- Users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  clerk_id TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- ============================================
-- User Profiles
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other') OR gender IS NULL),
  age_group TEXT CHECK (age_group IN ('10s', '20s', '30s', '40s', '50s', '60+') OR age_group IS NULL),
  region TEXT,
  share_gender BOOLEAN DEFAULT FALSE NOT NULL,
  share_age_group BOOLEAN DEFAULT FALSE NOT NULL,
  share_region BOOLEAN DEFAULT FALSE NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Polls
-- ============================================
CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  creator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  question TEXT NOT NULL CHECK (length(question) >= 5 AND length(question) <= 200),
  options TEXT NOT NULL, -- JSON array: ["옵션1", "옵션2", ...]
  category TEXT,
  expires_at DATETIME,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_category ON polls(category);
CREATE INDEX IF NOT EXISTS idx_polls_is_active ON polls(is_active);
CREATE INDEX IF NOT EXISTS idx_polls_creator_id ON polls(creator_id);

-- ============================================
-- Responses (Votes)
-- ============================================
CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL CHECK (option_index >= 0),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  fingerprint TEXT NOT NULL,
  -- Demographics snapshot (only stored if user consented to share)
  gender TEXT CHECK (gender IN ('male', 'female', 'other') OR gender IS NULL),
  age_group TEXT CHECK (age_group IN ('10s', '20s', '30s', '40s', '50s', '60+') OR age_group IS NULL),
  region TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent duplicate votes per poll
  UNIQUE(poll_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_responses_poll_id ON responses(poll_id);
CREATE INDEX IF NOT EXISTS idx_responses_user_id ON responses(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at DESC);

-- ============================================
-- Categories (Optional - for predefined categories)
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ko TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Seed default categories
INSERT OR IGNORE INTO categories (id, name, name_ko, icon, sort_order) VALUES
  ('politics', 'Politics', '정치', '🏛️', 1),
  ('society', 'Society', '사회', '👥', 2),
  ('life', 'Lifestyle', '라이프', '🌱', 3),
  ('food', 'Food', '음식', '🍽️', 4),
  ('entertainment', 'Entertainment', '연예', '🎬', 5),
  ('sports', 'Sports', '스포츠', '⚽', 6),
  ('tech', 'Technology', '기술', '💻', 7),
  ('economy', 'Economy', '경제', '💰', 8),
  ('fun', 'Fun', '재미', '🎮', 9),
  ('other', 'Other', '기타', '📌', 99);

-- ============================================
-- Comments
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_poll_id ON comments(poll_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- ============================================
-- Views (for convenience)
-- ============================================

-- Active polls with response count
CREATE VIEW IF NOT EXISTS v_polls_with_counts AS
SELECT 
  p.*,
  COUNT(r.id) as response_count
FROM polls p
LEFT JOIN responses r ON p.id = r.poll_id
WHERE p.is_active = TRUE
  AND (p.expires_at IS NULL OR p.expires_at > CURRENT_TIMESTAMP)
GROUP BY p.id;

-- ============================================
-- Triggers
-- ============================================

-- Update user_profiles.updated_at on change
CREATE TRIGGER IF NOT EXISTS trg_user_profiles_updated_at
AFTER UPDATE ON user_profiles
BEGIN
  UPDATE user_profiles SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
END;

-- Auto-deactivate expired polls (run periodically via cron)
-- Note: D1 doesn't support scheduled triggers, handle in application code
