import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type { CreatePollRequest, VoteRequest } from '../types';

export const usePolls = (category?: string) => {
  return useInfiniteQuery({
    queryKey: ['polls', category],
    queryFn: ({ pageParam }) =>
      apiClient.getPolls({ category, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
};

export const usePoll = (id: string) => {
  return useQuery({
    queryKey: ['poll', id],
    queryFn: () => apiClient.getPoll(id),
    enabled: !!id,
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
