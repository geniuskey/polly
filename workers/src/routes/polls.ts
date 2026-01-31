import { Hono } from 'hono';
import type { Env, Variables, PollRow, CreatePollBody, VoteBody, UserProfileRow } from '../types';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { incrementVoteCount, getVoteCounts, initCounts, formatResults } from '../utils/kv';
import { error, success } from '../utils/response';
import { addVoteXp, addPollCreationXp } from '../utils/xp';

const polls = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/polls - 설문 목록 조회
polls.get('/', async (c) => {
  const tag = c.req.query('tag');
  const category = c.req.query('category'); // backwards compatibility
  const sort = c.req.query('sort') || 'latest';
  const cursor = c.req.query('cursor');
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);

  let query: string;
  const bindings: (string | number)[] = [];

  if (tag) {
    // Filter by tag using junction table
    query = `
      SELECT p.*, COUNT(DISTINCT r.id) as response_count
      FROM polls p
      INNER JOIN poll_tags pt ON p.id = pt.poll_id
      INNER JOIN tags t ON pt.tag_id = t.id
      LEFT JOIN responses r ON p.id = r.poll_id
      WHERE p.is_active = 1
        AND (p.expires_at IS NULL OR p.expires_at > datetime('now'))
        AND t.name = ?
    `;
    bindings.push(tag);
  } else if (category) {
    // Backwards compatibility: filter by category
    query = `
      SELECT p.*, COUNT(r.id) as response_count
      FROM polls p
      LEFT JOIN responses r ON p.id = r.poll_id
      WHERE p.is_active = 1
        AND (p.expires_at IS NULL OR p.expires_at > datetime('now'))
        AND p.category = ?
    `;
    bindings.push(category);
  } else {
    query = `
      SELECT p.*, COUNT(r.id) as response_count
      FROM polls p
      LEFT JOIN responses r ON p.id = r.poll_id
      WHERE p.is_active = 1
        AND (p.expires_at IS NULL OR p.expires_at > datetime('now'))
    `;
  }

  if (sort === 'trending') {
    // Trending: votes in last 24h weighted by recency
    // Score = recent_votes / sqrt(age_hours + 2)
    if (cursor) {
      query += ' AND p.created_at < ?';
      bindings.push(cursor);
    }
    query += ` GROUP BY p.id
      ORDER BY (
        SELECT COUNT(*) FROM responses r2
        WHERE r2.poll_id = p.id
        AND r2.created_at > datetime('now', '-24 hours')
      ) * 1.0 / (
        (julianday('now') - julianday(p.created_at)) * 24 + 2
      ) DESC,
      p.created_at DESC
      LIMIT ?`;
  } else if (sort === 'popular') {
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

  const stmt = c.env.survey_db.prepare(query);
  const result = await stmt.bind(...bindings).all<PollRow & { response_count: number }>();

  const rows = result.results || [];
  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  const nextCursor = hasNext ? items[items.length - 1].created_at : null;

  // Fetch tags for each poll
  const pollIds = items.map(row => row.id);
  const tagsMap: Record<string, string[]> = {};
  const resultsMap: Record<string, { total: number; percentages: number[] }> = {};

  if (pollIds.length > 0) {
    const placeholders = pollIds.map(() => '?').join(',');

    // Fetch tags
    const tagsResult = await c.env.survey_db.prepare(
      `SELECT pt.poll_id, t.name
       FROM poll_tags pt
       INNER JOIN tags t ON pt.tag_id = t.id
       WHERE pt.poll_id IN (${placeholders})`
    ).bind(...pollIds).all<{ poll_id: string; name: string }>();

    for (const row of tagsResult.results || []) {
      if (!tagsMap[row.poll_id]) {
        tagsMap[row.poll_id] = [];
      }
      tagsMap[row.poll_id].push(row.name);
    }

    // Fetch vote counts per option for results preview
    const votesResult = await c.env.survey_db.prepare(
      `SELECT poll_id, option_index, COUNT(*) as count
       FROM responses
       WHERE poll_id IN (${placeholders})
       GROUP BY poll_id, option_index`
    ).bind(...pollIds).all<{ poll_id: string; option_index: number; count: number }>();

    // Build results map
    const voteCounts: Record<string, Record<number, number>> = {};
    for (const row of votesResult.results || []) {
      if (!voteCounts[row.poll_id]) {
        voteCounts[row.poll_id] = {};
      }
      voteCounts[row.poll_id][row.option_index] = row.count;
    }

    // Calculate percentages for each poll
    for (const pollRow of items) {
      const options = JSON.parse(pollRow.options) as string[];
      const counts = voteCounts[pollRow.id] || {};
      const total = pollRow.response_count || 0;

      const percentages = options.map((_, i) => {
        const count = counts[i] || 0;
        return total > 0 ? Math.round((count / total) * 100) : 0;
      });

      resultsMap[pollRow.id] = { total, percentages };
    }
  }

  const pollList = items.map((row) => ({
    id: row.id,
    creatorId: row.creator_id,
    question: row.question,
    options: JSON.parse(row.options),
    category: row.category,
    tags: tagsMap[row.id] || [],
    expiresAt: row.expires_at,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    responseCount: row.response_count,
    results: resultsMap[row.id] || { total: 0, percentages: [] },
  }));

  return c.json({ polls: pollList, nextCursor });
});

// GET /api/polls/:id - 설문 상세 + 결과
polls.get('/:id', async (c) => {
  const { id } = c.req.param();

  const poll = await c.env.survey_db.prepare('SELECT * FROM polls WHERE id = ?')
    .bind(id)
    .first<PollRow>();

  if (!poll) {
    return error(c, 'POLL_NOT_FOUND', '설문을 찾을 수 없습니다', 404);
  }

  const options = JSON.parse(poll.options) as string[];

  // Get vote counts from KV (or compute from D1)
  let counts = await getVoteCounts(c.env.vibepulse_cache, id);
  if (!counts) {
    counts = initCounts(options.length);
  }

  // Fetch tags for this poll
  const tagsResult = await c.env.survey_db.prepare(
    `SELECT t.name FROM poll_tags pt
     INNER JOIN tags t ON pt.tag_id = t.id
     WHERE pt.poll_id = ?`
  ).bind(id).all<{ name: string }>();

  const tags = (tagsResult.results || []).map(row => row.name);

  return success(c, {
    id: poll.id,
    creatorId: poll.creator_id,
    question: poll.question,
    options,
    category: poll.category,
    tags,
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

  // Validate and clean tags
  const tags = (body.tags || [])
    .map(t => t?.trim().toLowerCase().replace(/^#/, ''))
    .filter(t => t && t.length >= 1 && t.length <= 20)
    .slice(0, 5); // Max 5 tags

  const userId = c.get('userId');

  const result = await c.env.survey_db.prepare(
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
  const inserted = await c.env.survey_db.prepare(
    'SELECT id FROM polls WHERE creator_id = ? ORDER BY created_at DESC LIMIT 1',
  )
    .bind(userId || null)
    .first<{ id: string }>();

  if (!inserted) {
    return error(c, 'INTERNAL_ERROR', '설문 등록에 실패했습니다', 500);
  }

  // Process tags
  if (tags.length > 0) {
    for (const tagName of tags) {
      // Insert tag if not exists, otherwise update count
      await c.env.survey_db.prepare(
        `INSERT INTO tags (name, poll_count) VALUES (?, 1)
         ON CONFLICT(name) DO UPDATE SET poll_count = poll_count + 1`
      ).bind(tagName).run();

      // Get tag id
      const tagRow = await c.env.survey_db.prepare(
        'SELECT id FROM tags WHERE name = ?'
      ).bind(tagName).first<{ id: number }>();

      if (tagRow) {
        // Link poll to tag
        await c.env.survey_db.prepare(
          'INSERT OR IGNORE INTO poll_tags (poll_id, tag_id) VALUES (?, ?)'
        ).bind(inserted.id, tagRow.id).run();
      }
    }
  }

  // Initialize KV counts
  await c.env.vibepulse_cache.put(
    `poll:${inserted.id}:counts`,
    JSON.stringify(initCounts(options.length)),
  );

  // Award XP for creating poll
  let xpResult = null;
  if (userId) {
    xpResult = await addPollCreationXp(c.env.survey_db, userId);
  }

  return success(c, { id: inserted.id, xp: xpResult }, 201);
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
  const poll = await c.env.survey_db.prepare(
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
  const existing = await c.env.survey_db.prepare(
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
    const profile = await c.env.survey_db.prepare(
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
  await c.env.survey_db.prepare(
    `INSERT INTO responses (poll_id, option_index, user_id, fingerprint, gender, age_group, region)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, body.optionIndex, userId || null, body.fingerprint, gender, ageGroup, region)
    .run();

  // Update KV counts
  const counts = await incrementVoteCount(
    c.env.vibepulse_cache,
    id,
    body.optionIndex,
    options.length,
    { gender, ageGroup },
  );

  // Award XP for voting (logged-in users only)
  let xpResult = null;
  if (userId) {
    xpResult = await addVoteXp(c.env.survey_db, userId);
  }

  return success(c, { ...formatResults(counts), xp: xpResult });
});

export default polls;
