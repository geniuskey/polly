import type { Context } from 'hono';

export interface Env {
  survey_db: D1Database;
  vibepulse_cache: KVNamespace;
  vibepulse_images?: R2Bucket; // Optional - enable R2 in Cloudflare Dashboard to use
  CLERK_SECRET_KEY: string;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
  ADMIN_EMAILS?: string; // Comma-separated admin emails
}

export type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

export interface Variables {
  clerkId?: string;
  userId?: string;
  userEmail?: string;
  isAdmin?: boolean;
}

// Database row types
export interface UserRow {
  id: string;
  clerk_id: string;
  xp: number;
  level: number;
  last_daily_bonus: string | null;
  created_at: string;
}

// XP System
export interface XpHistoryRow {
  id: number;
  user_id: string;
  amount: number;
  reason: string;
  created_at: string;
}

export const XP_REWARDS = {
  VOTE: 10,
  CREATE_POLL: 30,
  COMMENT: 5,
  DAILY_BONUS: 10,
} as const;

// Level formula: XP needed for level N = N^2 * 50
export function getXpForLevel(level: number): number {
  return level * level * 50;
}

export function getLevelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) || 1;
}

export function getLevelTitle(level: number): string {
  if (level >= 30) return '전설의 투표러';
  if (level >= 20) return '여론 리더';
  if (level >= 15) return '설문 마스터';
  if (level >= 10) return '설문 마니아';
  if (level >= 7) return '열정 투표러';
  if (level >= 5) return '활발한 참여자';
  if (level >= 3) return '관심있는 시민';
  if (level >= 2) return '입문자';
  return '새싹';
}

export interface UserProfileRow {
  user_id: string;
  gender: string | null;
  age_group: string | null;
  region: string | null;
  share_gender: number; // SQLite boolean
  share_age_group: number;
  share_region: number;
  updated_at: string;
}

export interface PollRow {
  id: string;
  creator_id: string | null;
  question: string;
  options: string; // JSON string
  category: string | null;
  expires_at: string | null;
  is_active: number;
  created_at: string;
}

export interface PollWithCountRow extends PollRow {
  response_count: number;
}

export interface ResponseRow {
  id: string;
  poll_id: string;
  option_index: number;
  user_id: string | null;
  fingerprint: string;
  gender: string | null;
  age_group: string | null;
  region: string | null;
  created_at: string;
}

// KV cache types
export interface VoteCounts {
  total: number;
  options: number[];
  byGender: Record<string, number[]>;
  byAgeGroup: Record<string, number[]>;
}

// Poll Option types (supports both text-only and image options)
export interface PollOption {
  text: string;
  imageUrl?: string | null;
}

// Helper to normalize options from both old (string[]) and new (PollOption[]) formats
export function normalizeOptions(options: (string | PollOption)[]): PollOption[] {
  return options.map(opt =>
    typeof opt === 'string' ? { text: opt, imageUrl: null } : opt
  );
}

// Helper to get text array from options (for backwards compatibility)
export function getOptionTexts(options: (string | PollOption)[]): string[] {
  return options.map(opt => typeof opt === 'string' ? opt : opt.text);
}

// API request types
export interface CreatePollBody {
  question: string;
  options: (string | PollOption)[];  // supports both old and new formats
  category?: string;  // deprecated, use tags
  tags?: string[];    // hashtags (without #)
  expiresAt?: string;
}

export interface VoteBody {
  optionIndex: number;
  fingerprint: string;
}

export interface UpdateProfileBody {
  gender?: string | null;
  ageGroup?: string | null;
  region?: string | null;
  shareGender?: boolean;
  shareAgeGroup?: boolean;
  shareRegion?: boolean;
}

// Comments
export interface CommentRow {
  id: string;
  poll_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  like_count: number;
  reply_count: number;
  created_at: string;
}

export interface CreateCommentBody {
  content: string;
  parentCommentId?: string;
}

export interface CommentLikeRow {
  comment_id: string;
  user_id: string;
  created_at: string;
}
