import { Hono } from 'hono';
import type { Env, Variables, CommentRow, CreateCommentBody, CommentLikeRow } from '../types';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { error, success } from '../utils/response';
import { addCommentXp } from '../utils/xp';

const comments = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/polls/:pollId/comments - 댓글 목록 (루트 댓글만)
comments.get('/', optionalAuth, async (c) => {
  const pollId = c.req.param('pollId') as string;
  const cursor = c.req.query('cursor');
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);
  const userId = c.get('userId');

  let query = `
    SELECT c.*, u.clerk_id
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.poll_id = ? AND c.parent_comment_id IS NULL
  `;
  const bindings: (string | number)[] = [pollId];

  if (cursor) {
    query += ' AND c.created_at < ?';
    bindings.push(cursor);
  }

  query += ' ORDER BY c.created_at DESC LIMIT ?';
  bindings.push(limit + 1);

  const result = await c.env.survey_db.prepare(query)
    .bind(...bindings)
    .all<CommentRow & { clerk_id: string }>();

  const rows = result.results || [];
  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  const nextCursor = hasNext ? items[items.length - 1].created_at : null;

  // Check if current user has liked each comment
  let userLikes: Set<string> = new Set();
  if (userId && items.length > 0) {
    const commentIds = items.map(item => item.id);
    const placeholders = commentIds.map(() => '?').join(',');
    const likeResult = await c.env.survey_db.prepare(
      `SELECT comment_id FROM comment_likes WHERE user_id = ? AND comment_id IN (${placeholders})`
    )
      .bind(userId, ...commentIds)
      .all<{ comment_id: string }>();
    userLikes = new Set((likeResult.results || []).map(r => r.comment_id));
  }

  const commentList = items.map((row) => ({
    id: row.id,
    pollId: row.poll_id,
    userId: row.user_id,
    clerkId: row.clerk_id,
    content: row.content,
    parentCommentId: row.parent_comment_id,
    likeCount: row.like_count || 0,
    replyCount: row.reply_count || 0,
    hasLiked: userLikes.has(row.id),
    createdAt: row.created_at,
  }));

  return c.json({ comments: commentList, nextCursor });
});

// POST /api/polls/:pollId/comments - 댓글 작성 (인증 필요)
comments.post('/', requireAuth, async (c) => {
  const pollId = c.req.param('pollId') as string;
  const userId = c.get('userId')!;
  const body = await c.req.json<CreateCommentBody>();

  const content = body.content?.trim();
  if (!content || content.length < 1 || content.length > 500) {
    return error(c, 'INVALID_INPUT', '댓글은 1~500자여야 합니다', 400);
  }

  // 설문 존재 확인
  const poll = await c.env.survey_db.prepare('SELECT id FROM polls WHERE id = ?')
    .bind(pollId)
    .first();

  if (!poll) {
    return error(c, 'POLL_NOT_FOUND', '설문을 찾을 수 없습니다', 404);
  }

  // If parentCommentId is provided, verify it exists and belongs to same poll
  const parentCommentId = body.parentCommentId || null;
  if (parentCommentId) {
    const parentComment = await c.env.survey_db.prepare(
      'SELECT id, poll_id FROM comments WHERE id = ?'
    ).bind(parentCommentId).first<{ id: string; poll_id: string }>();

    if (!parentComment) {
      return error(c, 'PARENT_NOT_FOUND', '부모 댓글을 찾을 수 없습니다', 404);
    }
    if (parentComment.poll_id !== pollId) {
      return error(c, 'INVALID_PARENT', '잘못된 부모 댓글입니다', 400);
    }
  }

  await c.env.survey_db.prepare(
    'INSERT INTO comments (poll_id, user_id, content, parent_comment_id) VALUES (?, ?, ?, ?)',
  )
    .bind(pollId, userId, content, parentCommentId)
    .run();

  // If this is a reply, increment parent's reply_count
  if (parentCommentId) {
    await c.env.survey_db.prepare(
      'UPDATE comments SET reply_count = reply_count + 1 WHERE id = ?'
    ).bind(parentCommentId).run();
  }

  const inserted = await c.env.survey_db.prepare(
    'SELECT c.*, u.clerk_id FROM comments c JOIN users u ON c.user_id = u.id WHERE c.poll_id = ? AND c.user_id = ? ORDER BY c.created_at DESC LIMIT 1',
  )
    .bind(pollId, userId)
    .first<CommentRow & { clerk_id: string }>();

  if (!inserted) {
    return error(c, 'INTERNAL_ERROR', '댓글 등록에 실패했습니다', 500);
  }

  // Award XP for comment
  const xpResult = await addCommentXp(c.env.survey_db, userId);

  return success(c, {
    id: inserted.id,
    pollId: inserted.poll_id,
    userId: inserted.user_id,
    clerkId: inserted.clerk_id,
    content: inserted.content,
    parentCommentId: inserted.parent_comment_id,
    likeCount: inserted.like_count || 0,
    replyCount: inserted.reply_count || 0,
    hasLiked: false,
    createdAt: inserted.created_at,
    xp: xpResult,
  }, 201);
});

// PUT /api/polls/:pollId/comments/:commentId - 댓글 수정 (본인만)
comments.put('/:commentId', requireAuth, async (c) => {
  const commentId = c.req.param('commentId');
  const userId = c.get('userId')!;
  const body = await c.req.json<CreateCommentBody>();

  const content = body.content?.trim();
  if (!content || content.length < 1 || content.length > 500) {
    return error(c, 'INVALID_INPUT', '댓글은 1~500자여야 합니다', 400);
  }

  const comment = await c.env.survey_db.prepare(
    'SELECT id, user_id FROM comments WHERE id = ?',
  )
    .bind(commentId)
    .first<{ id: string; user_id: string }>();

  if (!comment) {
    return error(c, 'COMMENT_NOT_FOUND', '댓글을 찾을 수 없습니다', 404);
  }

  if (comment.user_id !== userId) {
    return error(c, 'FORBIDDEN', '본인의 댓글만 수정할 수 있습니다', 403);
  }

  await c.env.survey_db.prepare('UPDATE comments SET content = ? WHERE id = ?')
    .bind(content, commentId)
    .run();

  return success(c, { id: commentId, content });
});

// DELETE /api/polls/:pollId/comments/:commentId - 댓글 삭제 (본인만)
comments.delete('/:commentId', requireAuth, async (c) => {
  const commentId = c.req.param('commentId');
  const userId = c.get('userId')!;

  const comment = await c.env.survey_db.prepare(
    'SELECT id, user_id, parent_comment_id FROM comments WHERE id = ?',
  )
    .bind(commentId)
    .first<{ id: string; user_id: string; parent_comment_id: string | null }>();

  if (!comment) {
    return error(c, 'COMMENT_NOT_FOUND', '댓글을 찾을 수 없습니다', 404);
  }

  if (comment.user_id !== userId) {
    return error(c, 'FORBIDDEN', '본인의 댓글만 삭제할 수 있습니다', 403);
  }

  await c.env.survey_db.prepare('DELETE FROM comments WHERE id = ?')
    .bind(commentId)
    .run();

  // If this was a reply, decrement parent's reply_count
  if (comment.parent_comment_id) {
    await c.env.survey_db.prepare(
      'UPDATE comments SET reply_count = CASE WHEN reply_count > 0 THEN reply_count - 1 ELSE 0 END WHERE id = ?'
    ).bind(comment.parent_comment_id).run();
  }

  return success(c, { deleted: true });
});

// POST /api/polls/:pollId/comments/:commentId/like - 좋아요
comments.post('/:commentId/like', requireAuth, async (c) => {
  const commentId = c.req.param('commentId');
  const userId = c.get('userId')!;

  // Check if comment exists
  const comment = await c.env.survey_db.prepare(
    'SELECT id FROM comments WHERE id = ?'
  ).bind(commentId).first();

  if (!comment) {
    return error(c, 'COMMENT_NOT_FOUND', '댓글을 찾을 수 없습니다', 404);
  }

  // Check if already liked
  const existingLike = await c.env.survey_db.prepare(
    'SELECT 1 FROM comment_likes WHERE comment_id = ? AND user_id = ?'
  ).bind(commentId, userId).first();

  if (existingLike) {
    return error(c, 'ALREADY_LIKED', '이미 좋아요한 댓글입니다', 409);
  }

  // Insert like and update count
  await c.env.survey_db.batch([
    c.env.survey_db.prepare(
      'INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)'
    ).bind(commentId, userId),
    c.env.survey_db.prepare(
      'UPDATE comments SET like_count = like_count + 1 WHERE id = ?'
    ).bind(commentId),
  ]);

  const updated = await c.env.survey_db.prepare(
    'SELECT like_count FROM comments WHERE id = ?'
  ).bind(commentId).first<{ like_count: number }>();

  return success(c, {
    liked: true,
    likeCount: updated?.like_count || 1
  });
});

// DELETE /api/polls/:pollId/comments/:commentId/like - 좋아요 취소
comments.delete('/:commentId/like', requireAuth, async (c) => {
  const commentId = c.req.param('commentId');
  const userId = c.get('userId')!;

  // Check if like exists
  const existingLike = await c.env.survey_db.prepare(
    'SELECT 1 FROM comment_likes WHERE comment_id = ? AND user_id = ?'
  ).bind(commentId, userId).first();

  if (!existingLike) {
    return error(c, 'NOT_LIKED', '좋아요하지 않은 댓글입니다', 404);
  }

  // Delete like and update count
  await c.env.survey_db.batch([
    c.env.survey_db.prepare(
      'DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?'
    ).bind(commentId, userId),
    c.env.survey_db.prepare(
      'UPDATE comments SET like_count = CASE WHEN like_count > 0 THEN like_count - 1 ELSE 0 END WHERE id = ?'
    ).bind(commentId),
  ]);

  const updated = await c.env.survey_db.prepare(
    'SELECT like_count FROM comments WHERE id = ?'
  ).bind(commentId).first<{ like_count: number }>();

  return success(c, {
    liked: false,
    likeCount: updated?.like_count || 0
  });
});

// GET /api/polls/:pollId/comments/:commentId/replies - 대댓글 목록
comments.get('/:commentId/replies', optionalAuth, async (c) => {
  const commentId = c.req.param('commentId');
  const cursor = c.req.query('cursor');
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);
  const userId = c.get('userId');

  let query = `
    SELECT c.*, u.clerk_id
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.parent_comment_id = ?
  `;
  const bindings: (string | number)[] = [commentId];

  if (cursor) {
    query += ' AND c.created_at > ?';
    bindings.push(cursor);
  }

  query += ' ORDER BY c.created_at ASC LIMIT ?';
  bindings.push(limit + 1);

  const result = await c.env.survey_db.prepare(query)
    .bind(...bindings)
    .all<CommentRow & { clerk_id: string }>();

  const rows = result.results || [];
  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  const nextCursor = hasNext ? items[items.length - 1].created_at : null;

  // Check if current user has liked each comment
  let userLikes: Set<string> = new Set();
  if (userId && items.length > 0) {
    const commentIds = items.map(item => item.id);
    const placeholders = commentIds.map(() => '?').join(',');
    const likeResult = await c.env.survey_db.prepare(
      `SELECT comment_id FROM comment_likes WHERE user_id = ? AND comment_id IN (${placeholders})`
    )
      .bind(userId, ...commentIds)
      .all<{ comment_id: string }>();
    userLikes = new Set((likeResult.results || []).map(r => r.comment_id));
  }

  const replies = items.map((row) => ({
    id: row.id,
    pollId: row.poll_id,
    userId: row.user_id,
    clerkId: row.clerk_id,
    content: row.content,
    parentCommentId: row.parent_comment_id,
    likeCount: row.like_count || 0,
    replyCount: row.reply_count || 0,
    hasLiked: userLikes.has(row.id),
    createdAt: row.created_at,
  }));

  return c.json({ replies, nextCursor });
});

export default comments;
