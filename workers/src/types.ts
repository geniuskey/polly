import type { Context } from 'hono';

export interface Env {
  survey_db: D1Database;
  vibepulse_cache: KVNamespace;
  CLERK_SECRET_KEY: string;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
}

export type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

export interface Variables {
  clerkId?: string;
  userId?: string;
}

// Database row types
export interface UserRow {
  id: string;
  clerk_id: string;
  created_at: string;
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

// API request types
export interface CreatePollBody {
  question: string;
  options: string[];
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
  created_at: string;
}

export interface CreateCommentBody {
  content: string;
}
