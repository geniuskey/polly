import { useState } from 'react';
import { useComments, useCreateComment, useDeleteComment } from '../hooks/useComments';
import type { Comment } from '../types';

interface CommentsProps {
  pollId: string;
  currentUserId?: string;
}

const formatTimeAgo = (dateStr: string): string => {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;

  return new Date(dateStr).toLocaleDateString('ko-KR');
};

const CommentItem = ({
  comment,
  currentUserId,
  onDelete,
  isDeleting,
}: {
  comment: Comment;
  currentUserId?: string;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) => {
  const isOwner = currentUserId && comment.userId === currentUserId;

  return (
    <div className="comment-item">
      <div className="comment-header">
        <span className="comment-author">
          {comment.clerkId.slice(0, 8)}
        </span>
        <span className="comment-time">{formatTimeAgo(comment.createdAt)}</span>
        {isOwner && (
          <button
            className="comment-delete"
            onClick={() => onDelete(comment.id)}
            disabled={isDeleting}
          >
            삭제
          </button>
        )}
      </div>
      <p className="comment-content">{comment.content}</p>
    </div>
  );
};

const Comments = ({ pollId, currentUserId }: CommentsProps) => {
  const [newComment, setNewComment] = useState('');
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useComments(pollId);
  const { mutateAsync: createComment, isPending: isCreating } =
    useCreateComment(pollId);
  const { mutateAsync: deleteComment, isPending: isDeleting } =
    useDeleteComment(pollId);

  const comments = data?.pages.flatMap((page) => page.comments) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newComment.trim();
    if (!content || isCreating) return;

    try {
      await createComment({ content });
      setNewComment('');
    } catch {
      alert('댓글 등록에 실패했습니다.');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await deleteComment(commentId);
    } catch {
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="comments-section">
      <h3 className="comments-title">
        댓글 {comments.length > 0 && <span className="comments-count">{comments.length}</span>}
      </h3>

      {currentUserId ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <textarea
            className="comment-input"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요 (최대 500자)"
            maxLength={500}
            rows={2}
          />
          <div className="comment-form-footer">
            <span className="comment-char-count">{newComment.length}/500</span>
            <button
              type="submit"
              className="comment-submit"
              disabled={!newComment.trim() || isCreating}
            >
              {isCreating ? '등록 중...' : '댓글 등록'}
            </button>
          </div>
        </form>
      ) : (
        <p className="comment-login-notice">댓글을 작성하려면 로그인이 필요합니다.</p>
      )}

      <div className="comment-list">
        {isLoading && <div className="loading">댓글을 불러오는 중...</div>}
        {!isLoading && comments.length === 0 && (
          <div className="comment-empty">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</div>
        )}
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        ))}
      </div>

      {hasNextPage && (
        <button
          className="comment-load-more"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? '불러오는 중...' : '이전 댓글 보기'}
        </button>
      )}
    </div>
  );
};

export default Comments;
