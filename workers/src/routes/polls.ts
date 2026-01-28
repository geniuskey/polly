import { Hono } from 'hono';
import type { Env, Variables, PollRow, CreatePollBody, VoteBody, UserProfileRow } from '../types';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { incrementVoteCount, getVoteCounts, initCounts, formatResults } from '../utils/kv';
import { error, success } from '../utils/response';

const polls = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/polls - 설문 목록 조회
polls.get('/', async (c) => {
  const category = c.req.query('category');
  const sort = c.req.query('sort') || 'latest';
  const cursor = c.req.query('cursor');
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);

  let query = `
    SELECT p.*, COUNT(r.id) as response_count
    FROM polls p
    LEFT JOIN responses r ON p.id = r.poll_id
    WHERE p.is_active = 1
      AND (p.expires_at IS NULL OR p.expires_at > datetime('now'))
  `;
  const bindings: (string | number)[] = [];

  if (category) {
    query += ' AND p.category = ?';
    bindings.push(category);
  }

  if (sort === 'popular') {
    if (cursor) {
      query += ' AND p.created_at < ?';
      bindings.push(cursor);
    }
    query += ' GROUP BY p.id ORDER BY response_count DESC, p.created_at DESC LIMIT ?';
  } else {
    if (cursor) {
      query += ' AND p.created_at < ?';
      bindings.push(cursor);
    }
    query += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT ?';
  }
  bindings.push(limit + 1);

  const stmt = c.env.DB.prepare(query);
  const result = await stmt.bind(...bindings).all<PollRow & { response_count: number }>();

  const rows = result.results || [];
  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  const nextCursor = hasNext ? items[items.length - 1].created_at : null;

  const pollList = items.map((row) => ({
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

  return c.json({ polls: pollList, nextCursor });
});

// GET /api/polls/:id - 설문 상세 + 결과
polls.get('/:id', async (c) => {
  const { id } = c.req.param();

  const poll = await c.env.DB.prepare('SELECT * FROM polls WHERE id = ?')
    .bind(id)
    .first<PollRow>();

  if (!poll) {
    return error(c, 'POLL_NOT_FOUND', '설문을 찾을 수 없습니다', 404);
  }

  const options = JSON.parse(poll.options) as string[];

  // Get vote counts from KV (or compute from D1)
  let counts = await getVoteCounts(c.env.KV, id);
  if (!counts) {
    counts = initCounts(options.length);
  }

  return success(c, {
    id: poll.id,
    creatorId: poll.creator_id,
    question: poll.question,
    options,
    category: poll.category,
    expiresAt: poll.expires_at,
    isActive: !!poll.is_active,
    createdAt: poll.created_at,
    results: formatResults(counts),
  });
});

// POST /api/polls - 설문 등록 (인증 필요)
polls.post('/', requireAuth, async (c) => {
  const body = await c.req.json<CreatePollBody>();

  // Validation
  const question = body.question?.trim();
  if (!question || question.length < 5 || question.length > 200) {
    return error(c, 'INVALID_INPUT', '질문은 5~200자여야 합니다', 400);
  }

  if (
    !Array.isArray(body.options) ||
    body.options.length < 2 ||
    body.options.length > 4
  ) {
    return error(c, 'INVALID_INPUT', '옵션은 2~4개여야 합니다', 400);
  }

  const options = body.options.map((o) => o?.trim()).filter(Boolean);
  if (options.length < 2) {
    return error(c, 'INVALID_INPUT', '유효한 옵션이 2개 이상 필요합니다', 400);
  }

  const userId = c.get('userId');

  const result = await c.env.DB.prepare(
    `INSERT INTO polls (creator_id, question, options, category, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      userId || null,
      question,
      JSON.stringify(options),
      body.category || null,
      body.expiresAt || null,
    )
    .run();

  // Get the inserted poll ID
  const inserted = await c.env.DB.prepare(
    'SELECT id FROM polls WHERE creator_id = ? ORDER BY created_at DESC LIMIT 1',
  )
    .bind(userId || null)
    .first<{ id: string }>();

  if (!inserted) {
    return error(c, 'INTERNAL_ERROR', '설문 등록에 실패했습니다', 500);
  }

  // Initialize KV counts
  await c.env.KV.put(
    `poll:${inserted.id}:counts`,
    JSON.stringify(initCounts(options.length)),
  );

  return success(c, { id: inserted.id }, 201);
});

// POST /api/polls/:id/vote - 투표
polls.post('/:id/vote', optionalAuth, async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<VoteBody>();

  // Validate
  if (typeof body.optionIndex !== 'number' || !body.fingerprint) {
    return error(c, 'INVALID_INPUT', '입력값이 올바르지 않습니다', 400);
  }

  // Check poll exists and is active
  const poll = await c.env.DB.prepare(
    'SELECT * FROM polls WHERE id = ? AND is_active = 1',
  )
    .bind(id)
    .first<PollRow>();

  if (!poll) {
    return error(c, 'POLL_NOT_FOUND', '설문을 찾을 수 없습니다', 404);
  }

  const options = JSON.parse(poll.options) as string[];
  if (body.optionIndex < 0 || body.optionIndex >= options.length) {
    return error(c, 'INVALID_INPUT', '유효하지 않은 옵션입니다', 400);
  }

  // Check expiration
  if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
    return error(c, 'POLL_EXPIRED', '마감된 설문입니다', 400);
  }

  // Check duplicate vote
  const existing = await c.env.DB.prepare(
    'SELECT 1 FROM responses WHERE poll_id = ? AND fingerprint = ?',
  )
    .bind(id, body.fingerprint)
    .first();

  if (existing) {
    return error(c, 'DUPLICATE_VOTE', '이미 투표한 설문입니다', 409);
  }

  // Get demographics from user profile (if logged in and consented)
  let gender: string | null = null;
  let ageGroup: string | null = null;
  let region: string | null = null;

  const userId = c.get('userId');
  if (userId) {
    const profile = await c.env.DB.prepare(
      'SELECT * FROM user_profiles WHERE user_id = ?',
    )
      .bind(userId)
      .first<UserProfileRow>();

    if (profile) {
      gender = profile.share_gender ? profile.gender : null;
      ageGroup = profile.share_age_group ? profile.age_group : null;
      region = profile.share_region ? profile.region : null;
    }
  }

  // Insert response
  await c.env.DB.prepare(
    `INSERT INTO responses (poll_id, option_index, user_id, fingerprint, gender, age_group, region)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, body.optionIndex, userId || null, body.fingerprint, gender, ageGroup, region)
    .run();

  // Update KV counts
  const counts = await incrementVoteCount(
    c.env.KV,
    id,
    body.optionIndex,
    options.length,
    { gender, ageGroup },
  );

  return success(c, formatResults(counts));
});

export default polls;
