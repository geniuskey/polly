-- 004_achievements.sql
-- Achievement system for gamification

-- Achievement definitions
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL,
  category TEXT NOT NULL,
  threshold INTEGER NOT NULL
);

-- User-earned achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- Seed achievement data
INSERT OR IGNORE INTO achievements (id, name, description, emoji, category, threshold) VALUES
  -- Voting achievements
  ('first_vote', '첫 투표', '첫 번째 투표 완료', '🎉', 'voting', 1),
  ('voter_10', '열정 투표러', '10개 설문 참여', '🔥', 'voting', 10),
  ('voter_50', '투표 마니아', '50개 설문 참여', '⭐', 'voting', 50),
  ('voter_100', '투표 마스터', '100개 설문 참여', '👑', 'voting', 100),
  ('voter_500', '투표 레전드', '500개 설문 참여', '🏆', 'voting', 500),

  -- Poll creation achievements
  ('creator_1', '설문 제작자', '첫 설문 생성', '📝', 'creation', 1),
  ('creator_10', '설문 기획자', '10개 설문 생성', '✏️', 'creation', 10),
  ('creator_50', '설문 전문가', '50개 설문 생성', '📊', 'creation', 50),

  -- Comment achievements
  ('commenter_1', '첫 댓글', '첫 번째 댓글 작성', '💬', 'social', 1),
  ('commenter_10', '활발한 토론자', '10개 댓글 작성', '🗣️', 'social', 10),
  ('commenter_50', '의견 리더', '50개 댓글 작성', '📢', 'social', 50),

  -- Exploration achievements
  ('diverse_5', '탐험가', '5개 이상 태그 참여', '🌈', 'exploration', 5),
  ('diverse_10', '다양성 추구자', '10개 이상 태그 참여', '🗺️', 'exploration', 10),
  ('diverse_20', '만물박사', '20개 이상 태그 참여', '🎯', 'exploration', 20),

  -- Level achievements
  ('level_5', '성장하는 투표러', '레벨 5 달성', '📈', 'level', 5),
  ('level_10', '숙련된 투표러', '레벨 10 달성', '🌟', 'level', 10),
  ('level_20', '투표 원로', '레벨 20 달성', '💎', 'level', 20);
