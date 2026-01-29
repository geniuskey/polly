-- Migration: Category to Hashtag system
-- Run: wrangler d1 execute survey-db --file=migrations/002_hashtags.sql

-- ============================================
-- Tags table
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  poll_count INTEGER DEFAULT 0 NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_poll_count ON tags(poll_count DESC);

-- ============================================
-- Poll-Tag junction table
-- ============================================
CREATE TABLE IF NOT EXISTS poll_tags (
  poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (poll_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_tags_poll_id ON poll_tags(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_tags_tag_id ON poll_tags(tag_id);

-- Note: The 'category' column in polls table will be kept for backwards compatibility
-- but new polls will use the tags system instead
