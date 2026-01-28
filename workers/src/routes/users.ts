import { Hono } from 'hono';
import type { Env, Variables, UserProfileRow, UpdateProfileBody, PollRow } from '../types';
import { requireAuth } from '../middleware/auth';
import { error, success } from '../utils/response';

const users = new Hono<{ Bindings: Env; Variables: Variables }>();

// All user routes require authentication
users.use('/*', requireAuth);

// GET /api/users/me - 내 정보
users.get('/me', async (c) => {
  const userId = c.get('userId')!;

  const profile = await c.env.DB.prepare(
    'SELECT * FROM user_profiles WHERE user_id = ?',
  )
    .bind(userId)
    .first<UserProfileRow>();

  if (!profile) {
    // Return default profile
    return success(c, {
      userId,
      gender: null,
      ageGroup: null,
      region: null,
      shareGender: false,
      shareAgeGroup: false,
      shareRegion: false,
    });
  }

  return success(c, {
    userId: profile.user_id,
    gender: profile.gender,
    ageGroup: profile.age_group,
    region: profile.region,
    shareGender: !!profile.share_gender,
    shareAgeGroup: !!profile.share_age_group,
    shareRegion: !!profile.share_region,
  });
});

// PUT /api/users/me/profile - 프로필 수정
users.put('/me/profile', async (c) => {
  const userId = c.get('userId')!;
  const body = await c.req.json<UpdateProfileBody>();

  // Validate
  const validGenders = ['male', 'female', 'other', null];
  const validAgeGroups = ['10s', '20s', '30s', '40s', '50s', '60+', null];

  if (body.gender !== undefined && !validGenders.includes(body.gender as string | null)) {
    return error(c, 'INVALID_INPUT', '유효하지 않은 성별입니다', 400);
  }

  if (body.ageGroup !== undefined && !validAgeGroups.includes(body.ageGroup as string | null)) {
    return error(c, 'INVALID_INPUT', '유효하지 않은 연령대입니다', 400);
  }

  // Upsert profile
  await c.env.DB.prepare(
    `INSERT INTO user_profiles (user_id, gender, age_group, region, share_gender, share_age_group, share_region)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       gender = excluded.gender,
       age_group = excluded.age_group,
       region = excluded.region,
       share_gender = excluded.share_gender,
       share_age_group = excluded.share_age_group,
       share_region = excluded.share_region`,
  )
    .bind(
      userId,
      body.gender ?? null,
      body.ageGroup ?? null,
      body.region ?? null,
      body.shareGender ? 1 : 0,
      body.shareAgeGroup ? 1 : 0,
      body.shareRegion ? 1 : 0,
    )
    .run();

  return success(c, {
    userId,
    gender: body.gender ?? null,
    ageGroup: body.ageGroup ?? null,
    region: body.region ?? null,
    shareGender: !!body.shareGender,
    shareAgeGroup: !!body.shareAgeGroup,
    shareRegion: !!body.shareRegion,
  });
});

// GET /api/users/me/polls - 내가 만든 설문
users.get('/me/polls', async (c) => {
  const userId = c.get('userId')!;
  const cursor = c.req.query('cursor');
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);

  let query = `
    SELECT p.*, COUNT(r.id) as response_count
    FROM polls p
    LEFT JOIN responses r ON p.id = r.poll_id
    WHERE p.creator_id = ?
  `;
  const bindings: (string | number)[] = [userId];

  if (cursor) {
    query += ' AND p.created_at < ?';
    bindings.push(cursor);
  }

  query += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT ?';
  bindings.push(limit + 1);

  const result = await c.env.DB.prepare(query)
    .bind(...bindings)
    .all<PollRow & { response_count: number }>();

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

// GET /api/users/me/votes - 내가 참여한 설문
users.get('/me/votes', async (c) => {
  const userId = c.get('userId')!;
  const cursor = c.req.query('cursor');
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);

  let query = `
    SELECT DISTINCT p.*, COUNT(r2.id) as response_count
    FROM responses r
    JOIN polls p ON r.poll_id = p.id
    LEFT JOIN responses r2 ON p.id = r2.poll_id
    WHERE r.user_id = ?
  `;
  const bindings: (string | number)[] = [userId];

  if (cursor) {
    query += ' AND r.created_at < ?';
    bindings.push(cursor);
  }

  query += ' GROUP BY p.id ORDER BY r.created_at DESC LIMIT ?';
  bindings.push(limit + 1);

  const result = await c.env.DB.prepare(query)
    .bind(...bindings)
    .all<PollRow & { response_count: number }>();

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

export default users;
