import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type { CreateCommentRequest } from '../types';

export const useComments = (pollId: string, refetchInterval?: number) => {
  return useInfiniteQuery({
    queryKey: ['comments', pollId],
    queryFn: ({ pageParam }) =>
      apiClient.getComments(pollId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!pollId,
    refetchInterval,
    refetchIntervalInBackground: false,
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

export const useUpdateComment = (pollId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      apiClient.updateComment(pollId, commentId, { content }),
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

export const useLikeComment = (pollId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      apiClient.likeComment(pollId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', pollId] });
    },
  });
};

export const useUnlikeComment = (pollId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      apiClient.unlikeComment(pollId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', pollId] });
    },
  });
};

export const useCommentReplies = (pollId: string, commentId: string, enabled = true) => {
  return useInfiniteQuery({
    queryKey: ['commentReplies', pollId, commentId],
    queryFn: ({ pageParam }) =>
      apiClient.getCommentReplies(pollId, commentId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: enabled && !!pollId && !!commentId,
  });
};

export const useCreateReply = (pollId: string, parentCommentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { content: string }) =>
      apiClient.createReply(pollId, parentCommentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', pollId] });
      queryClient.invalidateQueries({ queryKey: ['commentReplies', pollId, parentCommentId] });
    },
  });
};
