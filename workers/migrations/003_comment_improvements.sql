-- 003_comment_improvements.sql
-- Add support for comment likes and nested replies (대댓글)

-- Add new columns to comments table
ALTER TABLE comments ADD COLUMN parent_comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN like_count INTEGER DEFAULT 0;
ALTER TABLE comments ADD COLUMN reply_count INTEGER DEFAULT 0;

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (comment_id, user_id)
);

-- Index for parent comments (to fetch replies efficiently)
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);

-- Index for fetching likes by user
CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON comment_likes(user_id);
