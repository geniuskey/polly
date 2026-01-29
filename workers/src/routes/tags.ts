import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { success } from '../utils/response';

const tags = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/tags/popular - 인기 태그 조회
tags.get('/popular', async (c) => {
  const limit = Math.min(Number(c.req.query('limit')) || 10, 30);

  const result = await c.env.survey_db.prepare(
    `SELECT id, name, poll_count
     FROM tags
     WHERE poll_count > 0
     ORDER BY poll_count DESC
     LIMIT ?`
  ).bind(limit).all<{ id: number; name: string; poll_count: number }>();

  const tags = (result.results || []).map(row => ({
    id: row.id,
    name: row.name,
    count: row.poll_count,
  }));

  return success(c, { tags });
});

// GET /api/tags/search - 태그 검색 (자동완성용)
tags.get('/search', async (c) => {
  const query = c.req.query('q')?.trim();
  if (!query || query.length < 1) {
    return success(c, { tags: [] });
  }

  const result = await c.env.survey_db.prepare(
    `SELECT id, name, poll_count
     FROM tags
     WHERE name LIKE ?
     ORDER BY poll_count DESC
     LIMIT 10`
  ).bind(`${query}%`).all<{ id: number; name: string; poll_count: number }>();

  const tags = (result.results || []).map(row => ({
    id: row.id,
    name: row.name,
    count: row.poll_count,
  }));

  return success(c, { tags });
});

export default tags;
