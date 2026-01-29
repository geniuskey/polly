import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type { UpdateProfileRequest } from '../types';

export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.getMe(),
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => apiClient.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

export const useMyPolls = () => {
  return useInfiniteQuery({
    queryKey: ['myPolls'],
    queryFn: ({ pageParam }) => apiClient.getMyPolls(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
};

export const useMyVotes = () => {
  return useInfiniteQuery({
    queryKey: ['myVotes'],
    queryFn: ({ pageParam }) => apiClient.getMyVotes(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
};
