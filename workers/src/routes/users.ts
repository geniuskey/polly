import { Hono } from 'hono';
import type { Env, Variables, UserProfileRow, UpdateProfileBody, PollRow, XpHistoryRow } from '../types';
import { requireAuth } from '../middleware/auth';
import { error, success } from '../utils/response';
import { getUserXpStats } from '../utils/xp';
import { getLevelTitle } from '../types';

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

// GET /api/users/me/xp - 내 경험치/레벨 정보
users.get('/me/xp', async (c) => {
  const userId = c.get('userId')!;

  const stats = await getUserXpStats(c.env.survey_db, userId);
  const title = getLevelTitle(stats.level);

  // Get recent XP history
  const historyResult = await c.env.survey_db.prepare(
    'SELECT * FROM xp_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
  ).bind(userId).all<XpHistoryRow>();

  const history = (historyResult.results || []).map(row => ({
    id: row.id,
    amount: row.amount,
    reason: row.reason,
    createdAt: row.created_at,
  }));

  return success(c, {
    ...stats,
    title,
    history,
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

// GET /api/users/me/personality - 투표 성향 분석
users.get('/me/personality', async (c) => {
  const userId = c.get('userId')!;

  // Get user's fingerprint
  const myResponse = await c.env.survey_db.prepare(
    'SELECT fingerprint FROM responses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(userId).first<{ fingerprint: string }>();

  if (!myResponse) {
    return success(c, {
      hasData: false,
      message: '아직 투표 기록이 없어요. 투표를 시작해보세요!',
    });
  }

  const fingerprint = myResponse.fingerprint;

  // Get total votes
  const totalVotesResult = await c.env.survey_db.prepare(
    'SELECT COUNT(*) as count FROM responses WHERE fingerprint = ?'
  ).bind(fingerprint).first<{ count: number }>();
  const totalVotes = totalVotesResult?.count || 0;

  if (totalVotes < 5) {
    return success(c, {
      hasData: false,
      totalVotes,
      message: `5개 이상 투표하면 성향을 분석해드려요! (현재 ${totalVotes}개)`,
    });
  }

  // 1. Conformity Score (다수파 지수) - How often user votes with majority
  const majorityMatchResult = await c.env.survey_db.prepare(`
    WITH poll_winners AS (
      SELECT poll_id, option_index,
        RANK() OVER (PARTITION BY poll_id ORDER BY COUNT(*) DESC) as rank
      FROM responses
      GROUP BY poll_id, option_index
    )
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN pw.rank = 1 THEN 1 ELSE 0 END) as with_majority
    FROM responses r
    LEFT JOIN poll_winners pw ON r.poll_id = pw.poll_id AND r.option_index = pw.option_index
    WHERE r.fingerprint = ?
  `).bind(fingerprint).first<{ total: number; with_majority: number }>();

  const conformityScore = majorityMatchResult && majorityMatchResult.total > 0
    ? Math.round((majorityMatchResult.with_majority / majorityMatchResult.total) * 100)
    : 50;

  // 2. Decisiveness Score (확신 지수) - Do they pick dominant options or underdogs
  const decisiveResult = await c.env.survey_db.prepare(`
    WITH option_percentages AS (
      SELECT r.poll_id, r.option_index,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM responses r2 WHERE r2.poll_id = r.poll_id) as pct
      FROM responses r
      GROUP BY r.poll_id, r.option_index
    )
    SELECT AVG(op.pct) as avg_option_popularity
    FROM responses r
    JOIN option_percentages op ON r.poll_id = op.poll_id AND r.option_index = op.option_index
    WHERE r.fingerprint = ?
  `).bind(fingerprint).first<{ avg_option_popularity: number }>();

  const decisiveScore = decisiveResult?.avg_option_popularity
    ? Math.round(decisiveResult.avg_option_popularity)
    : 50;

  // 3. Early Bird Score (선구자 지수) - Do they vote early in poll lifecycle
  const earlyBirdResult = await c.env.survey_db.prepare(`
    SELECT AVG(
      CASE
        WHEN total_responses <= 1 THEN 100
        ELSE (1.0 - (my_rank - 1.0) / total_responses) * 100
      END
    ) as avg_early_score
    FROM (
      SELECT r.poll_id,
        (SELECT COUNT(*) FROM responses r2 WHERE r2.poll_id = r.poll_id AND r2.created_at <= r.created_at) as my_rank,
        (SELECT COUNT(*) FROM responses r2 WHERE r2.poll_id = r.poll_id) as total_responses
      FROM responses r
      WHERE r.fingerprint = ?
    )
  `).bind(fingerprint).first<{ avg_early_score: number }>();

  const earlyBirdScore = earlyBirdResult?.avg_early_score
    ? Math.round(earlyBirdResult.avg_early_score)
    : 50;

  // 4. Engagement Score (적극성 지수) - Based on voting frequency
  const daysSinceFirst = await c.env.survey_db.prepare(`
    SELECT julianday('now') - julianday(MIN(created_at)) as days
    FROM responses WHERE fingerprint = ?
  `).bind(fingerprint).first<{ days: number }>();

  const days = Math.max(daysSinceFirst?.days || 1, 1);
  const votesPerDay = totalVotes / days;
  // Normalize: 0.5 votes/day = 50%, 2+ votes/day = 100%
  const engagementScore = Math.min(100, Math.round(votesPerDay * 50));

  // 5. Diversity Score (다양성 지수) - Votes across different tags/categories
  const diversityResult = await c.env.survey_db.prepare(`
    SELECT COUNT(DISTINCT t.id) as tag_count
    FROM responses r
    JOIN poll_tags pt ON r.poll_id = pt.poll_id
    JOIN tags t ON pt.tag_id = t.id
    WHERE r.fingerprint = ?
  `).bind(fingerprint).first<{ tag_count: number }>();

  // Normalize: 5 tags = 50%, 15+ tags = 100%
  const diversityScore = Math.min(100, Math.round((diversityResult?.tag_count || 0) * 6.67));

  // Generate personality type
  const dimensions = {
    conformity: conformityScore,     // 다수파 ↔ 독립파
    decisive: decisiveScore,         // 확신적 ↔ 신중한
    earlyBird: earlyBirdScore,       // 선구자 ↔ 관망자
    engagement: engagementScore,     // 적극적 ↔ 여유로운
    diversity: diversityScore,       // 다양한 ↔ 집중적
  };

  // Determine type based on dominant traits
  const type = generatePersonalityType(dimensions);

  // Recent majority vs me
  const recentPollsResult = await c.env.survey_db.prepare(`
    SELECT
      p.id, p.question,
      r.option_index as my_choice,
      (SELECT option_index FROM responses r2
       WHERE r2.poll_id = p.id
       GROUP BY option_index
       ORDER BY COUNT(*) DESC LIMIT 1) as majority_choice,
      (SELECT COUNT(*) FROM responses r2 WHERE r2.poll_id = p.id) as total_votes
    FROM responses r
    JOIN polls p ON r.poll_id = p.id
    WHERE r.fingerprint = ?
    ORDER BY r.created_at DESC
    LIMIT 10
  `).bind(fingerprint).all<{
    id: string;
    question: string;
    my_choice: number;
    majority_choice: number;
    total_votes: number;
  }>();

  const recentPolls = (recentPollsResult.results || []).map(row => ({
    id: row.id,
    question: row.question.length > 40 ? row.question.substring(0, 40) + '...' : row.question,
    withMajority: row.my_choice === row.majority_choice,
    totalVotes: row.total_votes,
  }));

  // Count recent matches
  const recentWithMajority = recentPolls.filter(p => p.withMajority).length;

  return success(c, {
    hasData: true,
    totalVotes,
    type,
    dimensions,
    recentPolls,
    summary: {
      withMajority: conformityScore,
      uniqueness: 100 - conformityScore,
      recentMatch: `최근 10개 중 ${recentWithMajority}개 다수의견과 일치`,
    },
  });
});

function generatePersonalityType(dimensions: {
  conformity: number;
  decisive: number;
  earlyBird: number;
  engagement: number;
  diversity: number;
}): { code: string; name: string; emoji: string; description: string } {
  const { conformity, decisive, earlyBird, engagement, diversity } = dimensions;

  // Primary trait based on highest deviation from 50
  const traits = [
    { key: 'conformity', value: conformity, high: '다수파', low: '독립파' },
    { key: 'decisive', value: decisive, high: '확신형', low: '신중형' },
    { key: 'earlyBird', value: earlyBird, high: '선구자', low: '관망자' },
    { key: 'engagement', value: engagement, high: '열정러', low: '여유러' },
    { key: 'diversity', value: diversity, high: '탐험가', low: '전문가' },
  ];

  // Sort by deviation from 50 (most extreme first)
  traits.sort((a, b) => Math.abs(b.value - 50) - Math.abs(a.value - 50));

  const primary = traits[0];
  const secondary = traits[1];

  const primaryLabel = primary.value >= 50 ? primary.high : primary.low;
  const secondaryLabel = secondary.value >= 50 ? secondary.high : secondary.low;

  // Generate type descriptions
  const types: Record<string, { emoji: string; description: string }> = {
    '다수파': { emoji: '🤝', description: '대세를 따르는 현명한 선택!' },
    '독립파': { emoji: '🦅', description: '나만의 소신을 지키는 당신' },
    '확신형': { emoji: '💪', description: '명확한 선택을 하는 결단력의 소유자' },
    '신중형': { emoji: '🤔', description: '신중하게 고민하는 사려깊은 투표러' },
    '선구자': { emoji: '🚀', description: '남들보다 먼저 의견을 내는 개척자' },
    '관망자': { emoji: '👀', description: '충분히 지켜본 후 결정하는 전략가' },
    '열정러': { emoji: '🔥', description: '활발하게 참여하는 여론 주도자' },
    '여유러': { emoji: '☕', description: '자신만의 페이스로 참여하는 여유파' },
    '탐험가': { emoji: '🧭', description: '다양한 주제에 관심을 가진 호기심 대왕' },
    '전문가': { emoji: '🎯', description: '관심 분야에 집중하는 스페셜리스트' },
  };

  const primaryInfo = types[primaryLabel] || { emoji: '✨', description: '' };

  return {
    code: `${primaryLabel}-${secondaryLabel}`,
    name: `${primaryLabel} ${secondaryLabel}`,
    emoji: primaryInfo.emoji,
    description: primaryInfo.description,
  };
}

export default users;
