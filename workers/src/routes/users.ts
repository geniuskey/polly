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

// GET /api/users/me/personality - 투표 성향 분석 (MBTI 스타일 4차원 16유형)
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

  if (totalVotes < 10) {
    return success(c, {
      hasData: false,
      totalVotes,
      requiredVotes: 10,
      message: `10개 이상 투표하면 성향을 분석해드려요! (현재 ${totalVotes}개)`,
    });
  }

  // ========== 4차원 MBTI 스타일 분석 ==========

  // 1. M/I: Mainstream vs Independent (다수파 vs 소수파)
  const majorityResult = await c.env.survey_db.prepare(`
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

  const mainstreamScore = majorityResult && majorityResult.total > 0
    ? Math.round((majorityResult.with_majority / majorityResult.total) * 100)
    : 50;

  // 2. F/C: Fast vs Careful (즉흥 vs 신중) - 투표 참여 속도 기반
  const speedResult = await c.env.survey_db.prepare(`
    SELECT AVG(
      CASE
        WHEN total_responses <= 3 THEN 100
        WHEN my_rank <= total_responses * 0.3 THEN 80
        WHEN my_rank <= total_responses * 0.5 THEN 60
        WHEN my_rank <= total_responses * 0.7 THEN 40
        ELSE 20
      END
    ) as avg_speed_score
    FROM (
      SELECT r.poll_id,
        (SELECT COUNT(*) FROM responses r2 WHERE r2.poll_id = r.poll_id AND r2.created_at <= r.created_at) as my_rank,
        (SELECT COUNT(*) FROM responses r2 WHERE r2.poll_id = r.poll_id) as total_responses
      FROM responses r
      WHERE r.fingerprint = ?
    )
  `).bind(fingerprint).first<{ avg_speed_score: number }>();

  const fastScore = speedResult?.avg_speed_score
    ? Math.round(speedResult.avg_speed_score)
    : 50;

  // 3. E/L: Early vs Late (얼리버드 vs 후발주자) - 설문 생성 후 얼마나 빨리 참여하는지
  const earlyResult = await c.env.survey_db.prepare(`
    SELECT AVG(
      CASE
        WHEN hours_after <= 1 THEN 100
        WHEN hours_after <= 6 THEN 85
        WHEN hours_after <= 24 THEN 70
        WHEN hours_after <= 72 THEN 50
        WHEN hours_after <= 168 THEN 30
        ELSE 15
      END
    ) as avg_early_score
    FROM (
      SELECT
        (julianday(r.created_at) - julianday(p.created_at)) * 24 as hours_after
      FROM responses r
      JOIN polls p ON r.poll_id = p.id
      WHERE r.fingerprint = ?
    )
  `).bind(fingerprint).first<{ avg_early_score: number }>();

  const earlyScore = earlyResult?.avg_early_score
    ? Math.round(earlyResult.avg_early_score)
    : 50;

  // 4. W/D: Wide vs Deep (다양 vs 집중) - 참여 태그 다양성
  const diversityResult = await c.env.survey_db.prepare(`
    SELECT COUNT(DISTINCT t.id) as tag_count
    FROM responses r
    JOIN poll_tags pt ON r.poll_id = pt.poll_id
    JOIN tags t ON pt.tag_id = t.id
    WHERE r.fingerprint = ?
  `).bind(fingerprint).first<{ tag_count: number }>();

  // Normalize: 3 tags = 30%, 10+ tags = 100%
  const wideScore = Math.min(100, Math.round((diversityResult?.tag_count || 0) * 10));

  // ========== 4글자 유형 코드 생성 ==========
  const dimensions = {
    mi: { score: mainstreamScore, letter: mainstreamScore >= 50 ? 'M' : 'I', label: mainstreamScore >= 50 ? '다수파' : '소수파' },
    fc: { score: fastScore, letter: fastScore >= 50 ? 'F' : 'C', label: fastScore >= 50 ? '즉흥' : '신중' },
    el: { score: earlyScore, letter: earlyScore >= 50 ? 'E' : 'L', label: earlyScore >= 50 ? '얼리버드' : '후발주자' },
    wd: { score: wideScore, letter: wideScore >= 50 ? 'W' : 'D', label: wideScore >= 50 ? '다양' : '집중' },
  };

  const typeCode = `${dimensions.mi.letter}${dimensions.fc.letter}${dimensions.el.letter}${dimensions.wd.letter}`;
  const type = getPersonalityType(typeCode);

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

  const recentWithMajority = recentPolls.filter(p => p.withMajority).length;

  return success(c, {
    hasData: true,
    totalVotes,
    type,
    dimensions: {
      mi: { ...dimensions.mi, name: '다수파 ↔ 소수파', lowLabel: '소수파', highLabel: '다수파' },
      fc: { ...dimensions.fc, name: '신중 ↔ 즉흥', lowLabel: '신중', highLabel: '즉흥' },
      el: { ...dimensions.el, name: '후발주자 ↔ 얼리버드', lowLabel: '후발주자', highLabel: '얼리버드' },
      wd: { ...dimensions.wd, name: '집중 ↔ 다양', lowLabel: '집중', highLabel: '다양' },
    },
    recentPolls,
    summary: {
      withMajority: mainstreamScore,
      uniqueness: 100 - mainstreamScore,
      recentMatch: `최근 10개 중 ${recentWithMajority}개 다수의견과 일치`,
    },
  });
});

// 16가지 성향 유형 정의
function getPersonalityType(code: string): {
  code: string;
  name: string;
  emoji: string;
  title: string;
  description: string;
  traits: string[];
} {
  const types: Record<string, { name: string; emoji: string; title: string; description: string; traits: string[] }> = {
    // M (다수파) 계열 - 8가지
    'MFEW': {
      name: '트렌드 서퍼',
      emoji: '🏄',
      title: '대세를 타는 만능 참여러',
      description: '빠르게 트렌드를 캐치하고 다양한 주제에 적극 참여해요. 어디서든 분위기를 읽고 대화에 자연스럽게 어울리는 타입!',
      traits: ['트렌드에 민감', '적극적 참여', '폭넓은 관심사'],
    },
    'MFED': {
      name: '핫이슈 헌터',
      emoji: '🎯',
      title: '인기 주제의 빠른 전문가',
      description: '핫한 이슈를 누구보다 빠르게 파악하고 깊이 파고들어요. 관심 분야에서는 누구보다 정통한 정보통!',
      traits: ['빠른 판단력', '깊은 몰입', '여론 선도'],
    },
    'MFLW': {
      name: '느긋한 탐험가',
      emoji: '🐢',
      title: '여유롭게 세상을 둘러보는 탐험가',
      description: '서두르지 않고 다양한 주제를 천천히 살펴봐요. 대세를 따르면서도 자신만의 페이스를 유지하는 여유파!',
      traits: ['여유로운 참여', '다양한 관심', '균형잡힌 시각'],
    },
    'MFLD': {
      name: '본진 지킴이',
      emoji: '🏠',
      title: '관심사에 충실한 팬심 보유자',
      description: '좋아하는 분야에 꾸준히 관심을 가지고 참여해요. 한번 빠지면 끝까지 함께하는 진정한 팬!',
      traits: ['꾸준한 관심', '충성도 높음', '깊은 애정'],
    },
    'MCEW': {
      name: '분석형 얼리어답터',
      emoji: '🔬',
      title: '신중하지만 빠른 다재다능러',
      description: '새로운 것을 빠르게 접하면서도 신중하게 판단해요. 다양한 분야의 지식을 쌓는 것을 즐기는 타입!',
      traits: ['신중한 분석', '빠른 적응', '지적 호기심'],
    },
    'MCED': {
      name: '전문 큐레이터',
      emoji: '📚',
      title: '깊이있는 콘텐츠 감별사',
      description: '관심 분야의 콘텐츠를 꼼꼼히 살펴보고 참여해요. 해당 주제의 살아있는 백과사전!',
      traits: ['꼼꼼한 분석', '전문성', '신뢰할 수 있는 의견'],
    },
    'MCLW': {
      name: '신중한 관찰자',
      emoji: '🦉',
      title: '충분히 보고 현명하게 선택하는 현자',
      description: '여러 의견을 충분히 살펴본 후 신중하게 선택해요. 다양한 관점을 이해하는 균형잡힌 판단자!',
      traits: ['신중한 결정', '균형잡힌 시각', '현명한 판단'],
    },
    'MCLD': {
      name: '깊이파 전문가',
      emoji: '🎓',
      title: '한 우물을 깊이 파는 스페셜리스트',
      description: '관심 분야에 대해 깊이 고민하고 신중하게 의견을 내요. 해당 분야의 진정한 전문가!',
      traits: ['깊은 전문성', '신중한 분석', '일관된 관심'],
    },
    // I (소수파) 계열 - 8가지
    'IFEW': {
      name: '힙스터',
      emoji: '🎸',
      title: '남다른 선택을 하는 개성파',
      description: '대세와 다른 선택을 빠르게, 다양한 분야에서 해요. 독특한 취향과 넓은 관심사를 가진 개성 만점 타입!',
      traits: ['독특한 취향', '빠른 행동력', '다양한 관심'],
    },
    'IFED': {
      name: '숨은 보석 발굴단',
      emoji: '💎',
      title: '마이너의 가치를 아는 선구자',
      description: '남들이 모르는 숨은 보석을 찾아내요. 관심 분야의 히든 젬을 발굴하는 안목의 소유자!',
      traits: ['안목 있음', '선구안', '깊은 탐구'],
    },
    'IFLW': {
      name: '자유로운 영혼',
      emoji: '🦋',
      title: '나만의 기준으로 사는 자유인',
      description: '대세에 휩쓸리지 않고 다양한 분야를 자유롭게 탐험해요. 누구의 눈치도 보지 않는 진정한 자유인!',
      traits: ['자유로운 선택', '넓은 시야', '독립적 성향'],
    },
    'IFLD': {
      name: '나만의 길',
      emoji: '🛤️',
      title: '소신있게 한 길을 가는 독행자',
      description: '관심 분야에서 남들과 다른 독자적인 관점을 가져요. 자기만의 철학이 확고한 타입!',
      traits: ['확고한 소신', '독자적 관점', '깊은 몰입'],
    },
    'ICEW': {
      name: '트렌드세터',
      emoji: '⭐',
      title: '새로운 흐름을 만드는 선구자',
      description: '신중하게 판단하되 남들과 다른 선택으로 새 트렌드를 만들어요. 다양한 분야의 오피니언 리더!',
      traits: ['선구자적 안목', '영향력', '넓은 식견'],
    },
    'ICED': {
      name: '개척자',
      emoji: '🚀',
      title: '미개척 영역을 여는 탐험가',
      description: '남들이 가지 않은 길을 신중하게 개척해요. 새로운 분야의 가능성을 발견하는 파이오니어!',
      traits: ['개척 정신', '신중한 도전', '혁신적 사고'],
    },
    'ICLW': {
      name: '현자',
      emoji: '🧙',
      title: '독립적 사고의 지혜로운 관찰자',
      description: '다양한 관점에서 신중하게 독자적인 판단을 내려요. 깊은 통찰력을 가진 현명한 조언자!',
      traits: ['깊은 통찰', '독립적 사고', '지혜로운 판단'],
    },
    'ICLD': {
      name: '외길 장인',
      emoji: '⚔️',
      title: '자기 분야의 독보적 마스터',
      description: '남들과 다른 시각으로 한 분야를 깊이 파고들어요. 해당 분야의 숨은 고수!',
      traits: ['독보적 전문성', '장인 정신', '확고한 철학'],
    },
  };

  const typeInfo = types[code] || {
    name: '미지의 탐험가',
    emoji: '🌟',
    title: '아직 발견되지 않은 새로운 유형',
    description: '당신만의 독특한 투표 패턴을 가지고 있어요!',
    traits: ['독특함', '예측불가', '신비로움'],
  };

  return {
    code,
    ...typeInfo,
  };
}

export default users;
