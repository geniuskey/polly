import type {
  ApiResponse,
  Comment,
  CommentListResponse,
  CreateCommentRequest,
  CreatePollRequest,
  PollDetail,
  PollListResponse,
  Tag,
  UpdateProfileRequest,
  UserProfile,
  VoteRequest,
  VoteResult,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private baseUrl: string;
  private getToken: (() => Promise<string | null>) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setTokenGetter(getter: () => Promise<string | null>) {
    this.getToken = getter;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.getToken) {
      const token = await this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const message =
        errorData?.error?.message || `HTTP ${response.status} 오류`;
      const code = errorData?.error?.code || 'UNKNOWN_ERROR';
      const error = new Error(message) as Error & { code: string };
      error.code = code;
      throw error;
    }

    return response.json();
  }

  // Polls
  async getPolls(params?: {
    tag?: string;
    category?: string;  // backwards compat
    sort?: string;
    cursor?: string;
    limit?: number;
  }): Promise<PollListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.tag) searchParams.set('tag', params.tag);
    else if (params?.category) searchParams.set('category', params.category);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request(`/polls${query ? `?${query}` : ''}`);
  }

  // Tags
  async getPopularTags(limit?: number): Promise<{ data: { tags: Tag[] } }> {
    const query = limit ? `?limit=${limit}` : '';
    return this.request(`/tags/popular${query}`);
  }

  async searchTags(query: string): Promise<{ data: { tags: Tag[] } }> {
    return this.request(`/tags/search?q=${encodeURIComponent(query)}`);
  }

  async getPoll(id: string): Promise<ApiResponse<PollDetail>> {
    return this.request(`/polls/${id}`);
  }

  async createPoll(
    data: CreatePollRequest,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.request('/polls', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async vote(
    pollId: string,
    data: VoteRequest,
  ): Promise<ApiResponse<VoteResult>> {
    return this.request(`/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Users
  async getMe(): Promise<ApiResponse<UserProfile>> {
    return this.request('/users/me');
  }

  async updateProfile(
    data: UpdateProfileRequest,
  ): Promise<ApiResponse<UserProfile>> {
    return this.request('/users/me/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getMyPolls(cursor?: string): Promise<PollListResponse> {
    const query = cursor ? `?cursor=${cursor}` : '';
    return this.request(`/users/me/polls${query}`);
  }

  async getMyVotes(cursor?: string): Promise<PollListResponse> {
    const query = cursor ? `?cursor=${cursor}` : '';
    return this.request(`/users/me/votes${query}`);
  }

  // Comments
  async getComments(
    pollId: string,
    cursor?: string,
  ): Promise<CommentListResponse> {
    const query = cursor ? `?cursor=${cursor}` : '';
    return this.request(`/polls/${pollId}/comments${query}`);
  }

  async createComment(
    pollId: string,
    data: CreateCommentRequest,
  ): Promise<ApiResponse<Comment>> {
    return this.request(`/polls/${pollId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateComment(
    pollId: string,
    commentId: string,
    data: CreateCommentRequest,
  ): Promise<ApiResponse<{ id: string; content: string }>> {
    return this.request(`/polls/${pollId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteComment(
    pollId: string,
    commentId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request(`/polls/${pollId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  // Explore
  async getRanking(params?: {
    type?: 'popular' | 'controversial' | 'rising';
    period?: 'day' | 'week' | 'month' | 'all';
    limit?: number;
  }): Promise<ApiResponse<RankingResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.period) searchParams.set('period', params.period);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request(`/explore/ranking${query ? `?${query}` : ''}`);
  }

  async search(q: string, limit?: number): Promise<ApiResponse<SearchResponse>> {
    const searchParams = new URLSearchParams({ q });
    if (limit) searchParams.set('limit', String(limit));
    return this.request(`/explore/search?${searchParams.toString()}`);
  }

  async getAllTags(limit?: number): Promise<ApiResponse<{ tags: TagInfo[] }>> {
    const query = limit ? `?limit=${limit}` : '';
    return this.request(`/explore/tags${query}`);
  }

  async getInsights(): Promise<ApiResponse<InsightsData>> {
    return this.request('/explore/insights');
  }

  // Similarity
  async getMySimilarity(): Promise<ApiResponse<SimilarityStats>> {
    return this.request('/users/me/similarity');
  }

  async checkSimilarity(data: {
    fingerprint: string;
    pollId: string;
    optionIndex: number;
  }): Promise<ApiResponse<PollSimilarity>> {
    return this.request('/users/similarity/check', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Admin
  async getAdminStats(): Promise<ApiResponse<AdminStats>> {
    return this.request('/admin/stats');
  }

  async getAdminPolls(params?: {
    status?: 'active' | 'inactive';
    cursor?: string;
    limit?: number;
  }): Promise<AdminPollListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request(`/admin/polls${query ? `?${query}` : ''}`);
  }

  async updateAdminPoll(
    id: string,
    data: { isActive?: boolean },
  ): Promise<ApiResponse<{ id: string; isActive: boolean }>> {
    return this.request(`/admin/polls/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminPoll(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request(`/admin/polls/${id}`, {
      method: 'DELETE',
    });
  }

  async getAdminComments(params?: {
    pollId?: string;
    cursor?: string;
    limit?: number;
  }): Promise<AdminCommentListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.pollId) searchParams.set('pollId', params.pollId);
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request(`/admin/comments${query ? `?${query}` : ''}`);
  }

  async deleteAdminComment(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request(`/admin/comments/${id}`, {
      method: 'DELETE',
    });
  }
}

// Explore types
export interface RankedPoll {
  rank: number;
  id: string;
  question: string;
  options: string[];
  responseCount: number;
  controversyScore: number;
  createdAt: string;
}

export interface RankingResponse {
  polls: RankedPoll[];
  type: string;
  period: string;
}

export interface SearchPoll {
  id: string;
  question: string;
  options: string[];
  responseCount: number;
  createdAt: string;
}

export interface SearchResponse {
  polls: SearchPoll[];
  query: string;
}

export interface TagInfo {
  id: number;
  name: string;
  pollCount: number;
}

export interface InsightsData {
  totals: {
    polls: number;
    responses: number;
    participants: number;
  };
  hourlyActivity: Array<{ hour: number; count: number }>;
  genderDivisive: Array<{
    id: string;
    question: string;
    responseCount: number;
    genderGap: number;
  }>;
  categoryTrends: Array<{
    category: string;
    responses: number;
  }>;
}

// Similarity types
export interface SimilarityStats {
  totalVotes: number;
  similarUsers: number;
  topSimilarity: number;
  avgSimilarity?: number;
  comparedWith?: number;
  message: string;
}

export interface PollSimilarity {
  sameChoiceCount: number;
  similarInGroup: number;
  similarityRate: number;
  message: string | null;
}

// Admin types
export interface AdminStats {
  totals: {
    polls: number;
    responses: number;
    users: number;
    comments: number;
  };
  last24h: {
    polls: number;
    responses: number;
  };
  topPolls: Array<{
    id: string;
    question: string;
    response_count: number;
  }>;
}

export interface AdminPoll {
  id: string;
  creatorId: string | null;
  question: string;
  options: string[];
  category: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  responseCount: number;
}

export interface AdminPollListResponse {
  polls: AdminPoll[];
  nextCursor: string | null;
}

export interface AdminComment {
  id: string;
  pollId: string;
  pollQuestion: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface AdminCommentListResponse {
  comments: AdminComment[];
  nextCursor: string | null;
}

export const apiClient = new ApiClient(API_BASE_URL);
