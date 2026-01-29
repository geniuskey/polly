import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type { CreatePollRequest, VoteRequest } from '../types';

export const usePolls = (tag?: string, sort?: string) => {
  return useInfiniteQuery({
    queryKey: ['polls', tag, sort],
    queryFn: ({ pageParam }) =>
      apiClient.getPolls({ tag, sort, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
};

export const usePopularTags = (limit?: number) => {
  return useQuery({
    queryKey: ['tags', 'popular', limit],
    queryFn: () => apiClient.getPopularTags(limit),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

export const usePoll = (id: string) => {
  return useQuery({
    queryKey: ['poll', id],
    queryFn: () => apiClient.getPoll(id),
    enabled: !!id,
  });
};

export const usePollDetail = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['poll', id],
    queryFn: () => apiClient.getPoll(id),
    enabled: !!id && enabled,
    staleTime: 1000 * 60, // Cache for 1 minute
  });
};

export const useCreatePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePollRequest) => apiClient.createPoll(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
};

export const useVote = (pollId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: VoteRequest) => apiClient.vote(pollId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poll', pollId] });
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
};
