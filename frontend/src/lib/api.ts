import type {
  ApiResponse,
  CreatePollRequest,
  PollDetail,
  PollListResponse,
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
    category?: string;
    cursor?: string;
    limit?: number;
  }): Promise<PollListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request(`/polls${query ? `?${query}` : ''}`);
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
}

export const apiClient = new ApiClient(API_BASE_URL);
