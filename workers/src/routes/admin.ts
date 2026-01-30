import { Hono } from 'hono';
import type { Env, Variables, PollRow, CommentRow } from '../types';
import { requireAdmin } from '../middleware/auth';
import { success, error } from '../utils/response';

const admin = new Hono<{ Bindings: Env; Variables: Variables }>();

// All admin routes require admin auth
admin.use('*', requireAdmin);

// GET /api/admin/stats - Dashboard statistics
admin.get('/stats', async (c) => {
  const [pollsResult, responsesResult, usersResult, commentsResult] = await Promise.all([
    c.env.survey_db.prepare('SELECT COUNT(*) as count FROM polls').first<{ count: number }>(),
    c.env.survey_db.prepare('SELECT COUNT(*) as count FROM responses').first<{ count: number }>(),
    c.env.survey_db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    c.env.survey_db.prepare('SELECT COUNT(*) as count FROM comments').first<{ count: number }>(),
  ]);

  // Recent activity (last 24 hours)
  const [recentPolls, recentResponses] = await Promise.all([
    c.env.survey_db.prepare(
      "SELECT COUNT(*) as count FROM polls WHERE created_at > datetime('now', '-24 hours')"
    ).first<{ count: number }>(),
    c.env.survey_db.prepare(
      "SELECT COUNT(*) as count FROM responses WHERE created_at > datetime('now', '-24 hours')"
    ).first<{ count: number }>(),
  ]);

  // Top polls by response count
  const topPolls = await c.env.survey_db.prepare(`
    SELECT p.id, p.question, COUNT(r.id) as response_count
    FROM polls p
    LEFT JOIN responses r ON p.id = r.poll_id
    GROUP BY p.id
    ORDER BY response_count DESC
    LIMIT 10
  `).all<{ id: string; question: string; response_count: number }>();

  return success(c, {
    totals: {
      polls: pollsResult?.count || 0,
      responses: responsesResult?.count || 0,
      users: usersResult?.count || 0,
      comments: commentsResult?.count || 0,
    },
    last24h: {
      polls: recentPolls?.count || 0,
      responses: recentResponses?.count || 0,
    },
    topPolls: topPolls.results || [],
  });
});

// GET /api/admin/polls - List all polls (including inactive)
admin.get('/polls', async (c) => {
  const cursor = c.req.query('cursor');
  const limit = Math.min(Number(c.req.query('limit')) || 50, 100);
  const status = c.req.query('status'); // 'active', 'inactive', or undefined for all

  let query = `
    SELECT p.*, COUNT(r.id) as response_count
    FROM polls p
    LEFT JOIN responses r ON p.id = r.poll_id
  `;
  const bindings: (string | number)[] = [];

  if (status === 'active') {
    query += ' WHERE p.is_active = 1';
  } else if (status === 'inactive') {
    query += ' WHERE p.is_active = 0';
  }

  if (cursor) {
    query += status ? ' AND p.created_at < ?' : ' WHERE p.created_at < ?';
    bindings.push(cursor);
  }

  query += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT ?';
  bindings.push(limit + 1);

  const result = await c.env.survey_db.prepare(query).bind(...bindings).all<PollRow & { response_count: number }>();
  const rows = result.results || [];
  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  const nextCursor = hasNext ? items[items.length - 1].created_at : null;

  const polls = items.map((row) => ({
    id: row.id,
    creatorId: row.creator_id,
    question: row.question,
    options: JSON.parse(row.options),
    category: row.category,
    expiresAt: row.expires_at,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    responseCount: row.response_count,
  }));

  return c.json({ polls, nextCursor });
});

// PATCH /api/admin/polls/:id - Update poll (activate/deactivate)
admin.patch('/polls/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{ isActive?: boolean }>();

  const poll = await c.env.survey_db.prepare('SELECT id FROM polls WHERE id = ?').bind(id).first();
  if (!poll) {
    return error(c, 'POLL_NOT_FOUND', '설문을 찾을 수 없습니다', 404);
  }

  if (typeof body.isActive === 'boolean') {
    await c.env.survey_db.prepare('UPDATE polls SET is_active = ? WHERE id = ?')
      .bind(body.isActive ? 1 : 0, id)
      .run();
  }

  return success(c, { id, isActive: body.isActive });
});

// DELETE /api/admin/polls/:id - Delete poll
admin.delete('/polls/:id', async (c) => {
  const { id } = c.req.param();

  const poll = await c.env.survey_db.prepare('SELECT id FROM polls WHERE id = ?').bind(id).first();
  if (!poll) {
    return error(c, 'POLL_NOT_FOUND', '설문을 찾을 수 없습니다', 404);
  }

  // Delete related data first
  await c.env.survey_db.prepare('DELETE FROM responses WHERE poll_id = ?').bind(id).run();
  await c.env.survey_db.prepare('DELETE FROM comments WHERE poll_id = ?').bind(id).run();
  await c.env.survey_db.prepare('DELETE FROM poll_tags WHERE poll_id = ?').bind(id).run();
  await c.env.survey_db.prepare('DELETE FROM polls WHERE id = ?').bind(id).run();

  // Delete KV cache
  await c.env.vibepulse_cache.delete(`poll:${id}:counts`);

  return success(c, { deleted: true });
});

// GET /api/admin/comments - List all comments
admin.get('/comments', async (c) => {
  const cursor = c.req.query('cursor');
  const limit = Math.min(Number(c.req.query('limit')) || 50, 100);
  const pollId = c.req.query('pollId');

  let query = `
    SELECT c.*, p.question as poll_question
    FROM comments c
    LEFT JOIN polls p ON c.poll_id = p.id
  `;
  const bindings: (string | number)[] = [];

  if (pollId) {
    query += ' WHERE c.poll_id = ?';
    bindings.push(pollId);
  }

  if (cursor) {
    query += pollId ? ' AND c.created_at < ?' : ' WHERE c.created_at < ?';
    bindings.push(cursor);
  }

  query += ' ORDER BY c.created_at DESC LIMIT ?';
  bindings.push(limit + 1);

  const result = await c.env.survey_db.prepare(query).bind(...bindings)
    .all<CommentRow & { poll_question: string }>();
  const rows = result.results || [];
  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  const nextCursor = hasNext ? items[items.length - 1].created_at : null;

  const comments = items.map((row) => ({
    id: row.id,
    pollId: row.poll_id,
    pollQuestion: row.poll_question,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
  }));

  return c.json({ comments, nextCursor });
});

// DELETE /api/admin/comments/:id - Delete comment
admin.delete('/comments/:id', async (c) => {
  const { id } = c.req.param();

  const comment = await c.env.survey_db.prepare('SELECT id FROM comments WHERE id = ?').bind(id).first();
  if (!comment) {
    return error(c, 'COMMENT_NOT_FOUND', '댓글을 찾을 수 없습니다', 404);
  }

  await c.env.survey_db.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();

  return success(c, { deleted: true });
});

export default admin;
