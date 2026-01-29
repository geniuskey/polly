// ============================================
// Data Models
// ============================================

export interface Poll {
  id: string;
  creatorId: string | null;
  question: string;
  options: string[];
  category: string | null;
  tags: string[];
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  responseCount: number;
}

export interface PollResponse {
  id: string;
  pollId: string;
  optionIndex: number;
  userId: string | null;
  fingerprint: string;
  gender: string | null;
  ageGroup: string | null;
  region: string | null;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  gender: 'male' | 'female' | 'other' | null;
  ageGroup: '10s' | '20s' | '30s' | '40s' | '50s' | '60+' | null;
  region: string | null;
  shareGender: boolean;
  shareAgeGroup: boolean;
  shareRegion: boolean;
}

export interface Category {
  id: string;
  name: string;
  nameKo: string;
  icon: string;
  sortOrder: number;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreatePollRequest {
  question: string;
  options: string[];
  category?: string;  // deprecated
  tags?: string[];
  expiresAt?: string;
}

export interface Tag {
  id: number;
  name: string;
  count: number;
}

export interface VoteRequest {
  optionIndex: number;
  fingerprint: string;
}

export interface UpdateProfileRequest {
  gender?: string | null;
  ageGroup?: string | null;
  region?: string | null;
  shareGender?: boolean;
  shareAgeGroup?: boolean;
  shareRegion?: boolean;
}

export interface OptionResult {
  index: number;
  count: number;
  percentage: number;
}

export interface SegmentResult {
  options: number[];
  count: number;
}

export interface VoteResult {
  total: number;
  options: OptionResult[];
  byGender?: Record<string, SegmentResult>;
  byAgeGroup?: Record<string, SegmentResult>;
}

export interface PollDetail extends Poll {
  results: VoteResult;
  myVote?: number | null;
}

// ============================================
// API Response Wrappers
// ============================================

export interface ApiResponse<T> {
  data: T;
  meta?: {
    cursor?: string;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface PollListResponse {
  polls: Poll[];
  nextCursor: string | null;
}

// ============================================
// Comments
// ============================================

export interface Comment {
  id: string;
  pollId: string;
  userId: string;
  clerkId: string;
  content: string;
  createdAt: string;
}

export interface CommentListResponse {
  comments: Comment[];
  nextCursor: string | null;
}

export interface CreateCommentRequest {
  content: string;
}
