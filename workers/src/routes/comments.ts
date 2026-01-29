import { Hono } from 'hono';
import type { Env, Variables, CommentRow, CreateCommentBody } from '../types';
import { requireAuth } from '../middleware/auth';
import { error, success } from '../utils/response';

const comments = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/polls/:pollId/comments - 댓글 목록
comments.get('/', async (c) => {
  const pollId = c.req.param('pollId') as string;
  const cursor = c.req.query('cursor');
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);

  let query = `
    SELECT c.*, u.clerk_id
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.poll_id = ?
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

  const commentList = items.map((row) => ({
    id: row.id,
    pollId: row.poll_id,
    userId: row.user_id,
    clerkId: row.clerk_id,
    content: row.content,
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

  await c.env.survey_db.prepare(
    'INSERT INTO comments (poll_id, user_id, content) VALUES (?, ?, ?)',
  )
    .bind(pollId, userId, content)
    .run();

  const inserted = await c.env.survey_db.prepare(
    'SELECT c.*, u.clerk_id FROM comments c JOIN users u ON c.user_id = u.id WHERE c.poll_id = ? AND c.user_id = ? ORDER BY c.created_at DESC LIMIT 1',
  )
    .bind(pollId, userId)
    .first<CommentRow & { clerk_id: string }>();

  if (!inserted) {
    return error(c, 'INTERNAL_ERROR', '댓글 등록에 실패했습니다', 500);
  }

  return success(c, {
    id: inserted.id,
    pollId: inserted.poll_id,
    userId: inserted.user_id,
    clerkId: inserted.clerk_id,
    content: inserted.content,
    createdAt: inserted.created_at,
  }, 201);
});

// DELETE /api/polls/:pollId/comments/:commentId - 댓글 삭제 (본인만)
comments.delete('/:commentId', requireAuth, async (c) => {
  const commentId = c.req.param('commentId');
  const userId = c.get('userId')!;

  const comment = await c.env.survey_db.prepare(
    'SELECT id, user_id FROM comments WHERE id = ?',
  )
    .bind(commentId)
    .first<{ id: string; user_id: string }>();

  if (!comment) {
    return error(c, 'COMMENT_NOT_FOUND', '댓글을 찾을 수 없습니다', 404);
  }

  if (comment.user_id !== userId) {
    return error(c, 'FORBIDDEN', '본인의 댓글만 삭제할 수 있습니다', 403);
  }

  await c.env.survey_db.prepare('DELETE FROM comments WHERE id = ?')
    .bind(commentId)
    .run();

  return success(c, { deleted: true });
});

export default comments;
