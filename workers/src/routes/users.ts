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

  const profile = await c.env.survey_db.prepare(
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
  await c.env.survey_db.prepare(
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

  const result = await c.env.survey_db.prepare(query)
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

  const result = await c.env.survey_db.prepare(query)
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

// GET /api/users/me/similarity - 나와 비슷한 사람 통계
users.get('/me/similarity', async (c) => {
  const userId = c.get('userId')!;

  // Get my fingerprint from most recent response
  const myResponse = await c.env.survey_db.prepare(
    'SELECT fingerprint FROM responses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(userId).first<{ fingerprint: string }>();

  if (!myResponse) {
    return success(c, {
      totalVotes: 0,
      similarUsers: 0,
      topSimilarity: 0,
      message: '아직 투표 기록이 없어요',
    });
  }

  const fingerprint = myResponse.fingerprint;

  // Count my total votes
  const voteCount = await c.env.survey_db.prepare(
    'SELECT COUNT(*) as count FROM responses WHERE fingerprint = ?'
  ).bind(fingerprint).first<{ count: number }>();

  const totalVotes = voteCount?.count || 0;

  if (totalVotes < 3) {
    return success(c, {
      totalVotes,
      similarUsers: 0,
      topSimilarity: 0,
      message: '3개 이상 투표하면 비슷한 사람을 찾아드려요',
    });
  }

  // Find similar users (same polls, same choices)
  const similarityResult = await c.env.survey_db.prepare(`
    SELECT
      other.fingerprint,
      COUNT(*) as shared_polls,
      SUM(CASE WHEN my.option_index = other.option_index THEN 1 ELSE 0 END) as same_choices
    FROM responses my
    JOIN responses other ON my.poll_id = other.poll_id AND my.fingerprint != other.fingerprint
    WHERE my.fingerprint = ?
    GROUP BY other.fingerprint
    HAVING shared_polls >= 3
  `).bind(fingerprint).all<{ fingerprint: string; shared_polls: number; same_choices: number }>();

  const similarities = (similarityResult.results || []).map(row => ({
    fingerprint: row.fingerprint,
    sharedPolls: row.shared_polls,
    sameChoices: row.same_choices,
    similarity: Math.round((row.same_choices / row.shared_polls) * 100),
  }));

  // Count users with 70%+ similarity
  const similarUsers = similarities.filter(s => s.similarity >= 70).length;
  const topSimilarity = similarities.length > 0
    ? Math.max(...similarities.map(s => s.similarity))
    : 0;

  // Average similarity
  const avgSimilarity = similarities.length > 0
    ? Math.round(similarities.reduce((sum, s) => sum + s.similarity, 0) / similarities.length)
    : 0;

  return success(c, {
    totalVotes,
    similarUsers,
    topSimilarity,
    avgSimilarity,
    comparedWith: similarities.length,
    message: similarUsers > 0
      ? `당신과 취향이 70% 이상 일치하는 사람이 ${similarUsers}명 있어요!`
      : similarities.length > 0
        ? `아직 취향이 비슷한 사람을 찾는 중이에요`
        : `더 많이 투표하면 비슷한 사람을 찾아드려요`,
  });
});

// POST /api/users/similarity/check - 특정 설문에서 유사 사용자 확인 (fingerprint 기반, 비로그인 가능)
users.post('/similarity/check', async (c) => {
  const body = await c.req.json<{ fingerprint: string; pollId: string; optionIndex: number }>();

  if (!body.fingerprint || !body.pollId) {
    return error(c, 'INVALID_INPUT', '필수 정보가 누락되었습니다', 400);
  }

  // Count how many people chose the same option
  const sameChoiceResult = await c.env.survey_db.prepare(
    'SELECT COUNT(*) as count FROM responses WHERE poll_id = ? AND option_index = ?'
  ).bind(body.pollId, body.optionIndex).first<{ count: number }>();

  const sameChoiceCount = sameChoiceResult?.count || 0;

  // Count my total votes
  const myVotesResult = await c.env.survey_db.prepare(
    'SELECT COUNT(*) as count FROM responses WHERE fingerprint = ?'
  ).bind(body.fingerprint).first<{ count: number }>();

  const myVotes = myVotesResult?.count || 0;

  if (myVotes < 3) {
    return success(c, {
      sameChoiceCount,
      similarInGroup: 0,
      similarityRate: 0,
      message: null,
    });
  }

  // Among people who chose the same option, find those similar to me
  const similarInGroupResult = await c.env.survey_db.prepare(`
    SELECT COUNT(DISTINCT similar.fingerprint) as count
    FROM (
      SELECT
        other.fingerprint,
        COUNT(*) as shared,
        SUM(CASE WHEN my.option_index = other.option_index THEN 1 ELSE 0 END) as same
      FROM responses my
      JOIN responses other ON my.poll_id = other.poll_id AND my.fingerprint != other.fingerprint
      WHERE my.fingerprint = ?
        AND other.fingerprint IN (
          SELECT fingerprint FROM responses WHERE poll_id = ? AND option_index = ?
        )
      GROUP BY other.fingerprint
      HAVING shared >= 3 AND (same * 100 / shared) >= 70
    ) similar
  `).bind(body.fingerprint, body.pollId, body.optionIndex).first<{ count: number }>();

  const similarInGroup = similarInGroupResult?.count || 0;
  const similarityRate = sameChoiceCount > 1
    ? Math.round((similarInGroup / (sameChoiceCount - 1)) * 100)
    : 0;

  return success(c, {
    sameChoiceCount,
    similarInGroup,
    similarityRate,
    message: similarInGroup > 0
      ? `이 선택을 한 ${sameChoiceCount}명 중 ${similarInGroup}명이 당신과 취향이 비슷해요!`
      : null,
  });
});

export default users;
