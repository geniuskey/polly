import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type { CreateCommentRequest } from '../types';

export const useComments = (pollId: string) => {
  return useInfiniteQuery({
    queryKey: ['comments', pollId],
    queryFn: ({ pageParam }) =>
      apiClient.getComments(pollId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!pollId,
  });
};

export const useCreateComment = (pollId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentRequest) =>
      apiClient.createComment(pollId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', pollId] });
    },
  });
};

export const useDeleteComment = (pollId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      apiClient.deleteComment(pollId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', pollId] });
    },
  });
};
